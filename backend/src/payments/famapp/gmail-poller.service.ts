import { IGmailClient, RawGmailMessage, ParsedFamappEmail } from './famapp.types';
import { FamappEmailParser } from './famapp-email-parser';
import { getDb, DbClient } from '../../db/client';
import { famappEmailEvents, famappSyncState } from '../../db/schema/famapp';
import { eq } from 'drizzle-orm';
import { alertService } from '../../admin/services/alert.service';

export const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

export interface GmailPollerOptions {
  client?: IGmailClient;
  merchantVpa?: string;
  autoMatchCallback?: (event: ParsedFamappEmail) => Promise<void>;
  db?: DbClient;
}

export class GmailPollerService {
  private client?: IGmailClient;
  private merchantVpa?: string;
  private autoMatchCallback?: (event: ParsedFamappEmail) => Promise<void>;
  private db: DbClient;
  private isPolling = false;

  // Bounded pagination and recovery scan constants
  private static readonly MAX_PAGES_PER_POLL = 10;
  private static readonly PAGE_SIZE = 50;
  public static readonly DEFAULT_QUERY = 'from:(no-reply@famapp.in OR no-reply@fampay.in)';
  private static readonly LOOKBACK_BUFFER_SECONDS = 1800; // 30 minutes overlapping lookback

  constructor(options: GmailPollerOptions = {}) {
    this.client = options.client;
    this.merchantVpa = options.merchantVpa || process.env.MERCHANT_UPI_VPA;
    this.autoMatchCallback = options.autoMatchCallback;
    this.db = options.db || getDb();
  }

  setClient(client: IGmailClient): void {
    this.client = client;
  }

  setAutoMatchCallback(cb: (event: ParsedFamappEmail) => Promise<void>): void {
    this.autoMatchCallback = cb;
  }

  /**
   * Executes one polling cycle against the Gmail API with pagination, overlapping
   * lookback window, strict error classification, and deduplication.
   */
  async pollOnce(): Promise<{
    scanned: number;
    ingested: number;
    duplicates: number;
    unparseable: number;
    authFailed: number;
  }> {
    if (!this.client) {
      return { scanned: 0, ingested: 0, duplicates: 0, unparseable: 0, authFailed: 0 };
    }

    if (this.isPolling) {
      return { scanned: 0, ingested: 0, duplicates: 0, unparseable: 0, authFailed: 0 };
    }

    this.isPolling = true;
    let scanned = 0;
    let ingested = 0;
    let duplicates = 0;
    let unparseable = 0;
    let authFailed = 0;

    try {
      // 1. Fetch current sync cursor
      const [syncRecord] = await this.db
        .select()
        .from(famappSyncState)
        .where(eq(famappSyncState.id, 'primary'))
        .limit(1);

      // Build query with verified sender allowlist
      let query = GmailPollerService.DEFAULT_QUERY;

      // Apply bounded overlapping lookback window for reliable incremental recovery
      if (syncRecord?.lastSyncedMessageTimestamp) {
        const lastTimestampMs = new Date(syncRecord.lastSyncedMessageTimestamp).getTime();
        const bufferSeconds = Math.max(
          Math.floor(lastTimestampMs / 1000) - GmailPollerService.LOOKBACK_BUFFER_SECONDS,
          0
        );
        query += ` after:${bufferSeconds}`;
      }

      let latestMessageTimestamp: Date | undefined = syncRecord?.lastSyncedMessageTimestamp
        ? new Date(syncRecord.lastSyncedMessageTimestamp)
        : undefined;

      // 2. Paginated Message Ingestion Loop
      let pageToken: string | undefined = undefined;
      let pageCount = 0;

      do {
        const listRes = await this.client.listMessages(
          query,
          pageToken,
          GmailPollerService.PAGE_SIZE
        );
        const messages = listRes.messages || [];
        scanned += messages.length;

        for (const item of messages) {
          // Check message deduplication before making expensive getMessage call
          const [existing] = await this.db
            .select({ id: famappEmailEvents.id })
            .from(famappEmailEvents)
            .where(eq(famappEmailEvents.gmailMessageId, item.id))
            .limit(1);

          if (existing) {
            duplicates++;
            continue;
          }

          // Fetch full message
          const rawMsg: RawGmailMessage = await this.client.getMessage(item.id);
          const parsed: ParsedFamappEmail | null = FamappEmailParser.parse(rawMsg);

          if (!parsed) {
            // Unparseable / non-credit message from verified sender
            unparseable++;
            try {
              await this.db
                .insert(famappEmailEvents)
                .values({
                  gmailMessageId: item.id,
                  gmailThreadId: item.threadId,
                  senderAddress: 'unknown',
                  recipientAddress: 'unknown',
                  parsedUtr: '000000000000',
                  parsedAmount: '0.00',
                  currency: 'INR',
                  transactionTimestamp: new Date(),
                  dkimStatus: 'NONE',
                  spfStatus: 'NONE',
                  authStatus: 'MISSING',
                  status: 'UNPARSEABLE',
                  rawSnippet: rawMsg.snippet?.substring(0, 500) || 'Unparseable message body',
                });
            } catch (unparseableInsertErr: any) {
              if (this.isUniqueViolation(unparseableInsertErr)) {
                duplicates++;
              } else {
                throw unparseableInsertErr;
              }
            }
            continue;
          }

          // Strict Recipient VPA Enforcement
          // If merchant VPA is configured, missing or mismatched recipient VPA fails closed
          if (this.merchantVpa) {
            const expectedVpa = this.merchantVpa.toLowerCase().trim();
            const actualVpa = parsed.parsedRecipientVpa?.toLowerCase().trim();

            if (!actualVpa || actualVpa !== expectedVpa) {
              authFailed++;
              parsed.authStatus = 'FAILED';
            }
          }

          if (parsed.authStatus !== 'VERIFIED') {
            authFailed++;
          }

          // Fail-closed status: ONLY positively verified events can be UNCLAIMED
          const initialStatus = parsed.authStatus === 'VERIFIED' ? 'UNCLAIMED' : 'FLAGGED';

          // 3. Ingest into famapp_email_events with precise error discrimination
          try {
            const [inserted] = await this.db
              .insert(famappEmailEvents)
              .values({
                gmailMessageId: parsed.gmailMessageId,
                gmailThreadId: parsed.gmailThreadId || null,
                senderAddress: parsed.senderAddress,
                recipientAddress: parsed.recipientAddress,
                parsedUtr: parsed.parsedUtr,
                parsedTxId: parsed.parsedTxId || null,
                parsedAmount: parsed.parsedAmount,
                currency: parsed.currency,
                parsedSenderName: parsed.parsedSenderName || null,
                parsedSenderVpa: parsed.parsedSenderVpa || null,
                parsedRecipientVpa: parsed.parsedRecipientVpa || null,
                transactionTimestamp: parsed.transactionTimestamp,
                dkimStatus: parsed.dkimStatus,
                spfStatus: parsed.spfStatus,
                authStatus: parsed.authStatus,
                status: initialStatus,
                rawHeaders: parsed.rawHeaders || null,
                rawSnippet: parsed.rawSnippet || null,
              })
              .returning();

            if (inserted) {
              ingested++;

              // Update cursor tracking with newest observed message
              if (!latestMessageTimestamp || parsed.transactionTimestamp > latestMessageTimestamp) {
                latestMessageTimestamp = parsed.transactionTimestamp;
              }

              // Trigger match callback ONLY for positively verified unclaimed receipts
              if (initialStatus === 'UNCLAIMED' && this.autoMatchCallback) {
                await this.autoMatchCallback(parsed);
              }
            }
          } catch (insertErr: any) {
            // Strictly distinguish unique constraint violations from general DB failures
            if (this.isUniqueViolation(insertErr)) {
              duplicates++;
            } else {
              // Real database error: re-throw to alert and prevent corrupted sync state
              throw insertErr;
            }
          }
        }

        pageToken = listRes.nextPageToken;
        pageCount++;
      } while (pageToken && pageCount < GmailPollerService.MAX_PAGES_PER_POLL);

      // 4. Update synchronization cursor
      await this.db
        .insert(famappSyncState)
        .values({
          id: 'primary',
          lastSyncedMessageTimestamp: latestMessageTimestamp || new Date(),
          lastSyncedAt: new Date(),
          consecutiveErrors: '0',
          lastError: null,
        })
        .onConflictDoUpdate({
          target: famappSyncState.id,
          set: {
            lastSyncedMessageTimestamp: latestMessageTimestamp || new Date(),
            lastSyncedAt: new Date(),
            consecutiveErrors: '0',
            lastError: null,
          },
        });
    } catch (err: any) {
      // Record consecutive error for health monitoring & backoff
      try {
        await this.db
          .insert(famappSyncState)
          .values({
            id: 'primary',
            lastSyncedAt: new Date(),
            consecutiveErrors: '1',
            lastError: err.message || 'Unknown Gmail polling error',
          })
          .onConflictDoUpdate({
            target: famappSyncState.id,
            set: {
              lastSyncedAt: new Date(),
              lastError: err.message || 'Unknown Gmail polling error',
            },
          });
      } catch {}

      alertService.raiseAlert({
        type: 'WEBHOOK_FAILURE',
        severity: 'HIGH',
        message: `FamApp Gmail Poller error: ${err.message}`,
        details: { error: err.message },
      }).catch(console.error);

      throw err;
    } finally {
      this.isPolling = false;
    }

    return { scanned, ingested, duplicates, unparseable, authFailed };
  }

  /**
   * Helper to check if an error is a PostgreSQL unique constraint violation.
   */
  private isUniqueViolation(err: any): boolean {
    if (!err) return false;
    return (
      err.code === '23505' ||
      err.message?.includes('duplicate key') ||
      err.message?.includes('unique constraint') ||
      err.constraint?.includes('gmail_message_id')
    );
  }
}
