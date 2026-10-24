import { GmailPollerService } from './gmail-poller.service';
import { GoogleOAuthGmailClient } from './gmail-client';
import { famappVerificationService } from './famapp-verification.service';

export class FamappBackgroundScheduler {
  private poller: GmailPollerService;
  private client: GoogleOAuthGmailClient;
  private timer: NodeJS.Timeout | null = null;
  private intervalMs: number;
  private running = false;

  constructor(options?: { intervalMs?: number }) {
    this.intervalMs = options?.intervalMs || 60000; // 60 seconds default
    this.client = new GoogleOAuthGmailClient();
    this.poller = new GmailPollerService({
      client: this.client,
      autoMatchCallback: async (event) => {
        await famappVerificationService.processIngestedEmail(event);
      },
    });
  }

  getPoller(): GmailPollerService {
    return this.poller;
  }

  isRunning(): boolean {
    return this.running;
  }

  /**
   * Starts the managed background polling worker if OAuth credentials are configured.
   */
  start(): void {
    if (this.running) return;

    if (!this.client.isConfigured()) {
      console.log('[FamApp Scheduler] Gmail OAuth credentials not configured; background poller is idle.');
      return;
    }

    this.running = true;
    console.log(`[FamApp Scheduler] Background polling started (interval: ${this.intervalMs}ms).`);

    this.timer = setInterval(async () => {
      try {
        await this.poller.pollOnce();
      } catch (err: any) {
        console.error('[FamApp Scheduler] Background polling error:', err.message);
      }
    }, this.intervalMs);

    // Run first poll cycle immediately
    this.poller.pollOnce().catch((err) => {
      console.error('[FamApp Scheduler] Initial poll error:', err.message);
    });
  }

  /**
   * Stops the background polling loop.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
    console.log('[FamApp Scheduler] Background polling stopped.');
  }
}

export const famappScheduler = new FamappBackgroundScheduler();
