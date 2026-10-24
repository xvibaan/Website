export type FamappSubmissionStatus =
  | 'PENDING'
  | 'MATCHED'
  | 'CREDITED'
  | 'MANUAL_REVIEW'
  | 'EXPIRED'
  | 'REJECTED';

export type FamappEmailEventStatus =
  | 'UNCLAIMED'
  | 'CLAIMED'
  | 'FLAGGED'
  | 'EXPIRED'
  | 'UNPARSEABLE';

export type EmailAuthStatus = 'VERIFIED' | 'FAILED' | 'MISSING';

export interface ParsedFamappEmail {
  gmailMessageId: string;
  gmailThreadId?: string;
  senderAddress: string;
  recipientAddress: string;
  parsedUtr: string;
  parsedTxId?: string;
  parsedAmount: string; // Formatted 2-decimal string e.g. "500.00"
  currency: string;
  parsedSenderName?: string;
  parsedSenderVpa?: string;
  parsedRecipientVpa?: string;
  transactionTimestamp: Date;
  dkimStatus: 'PASS' | 'FAIL' | 'NONE';
  spfStatus: 'PASS' | 'FAIL' | 'NONE';
  authStatus: EmailAuthStatus;
  rawHeaders?: string;
  rawSnippet?: string;
}

export interface SubmitUtrParams {
  userId: string;
  utr: string;
  amount: string;
  currency?: string;
}

export interface SubmitUtrResult {
  success: boolean;
  submissionId: string;
  status: FamappSubmissionStatus;
  message: string;
  utr: string;
  amount: string;
  expiresAt: Date;
}

export interface ClaimResult {
  success: boolean;
  credited: boolean;
  status: FamappSubmissionStatus;
  message: string;
  submissionId: string;
  paymentTransactionId?: string;
}

export interface AdminReviewParams {
  submissionId: string;
  adminUserId: string;
  action: 'APPROVE' | 'OVERRIDE_APPROVE' | 'REJECT';
  reason?: string;
  settlementConfirmed?: boolean;
}

export interface RawGmailMessageHeader {
  name: string;
  value: string;
}

export interface RawGmailMessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: RawGmailMessageHeader[];
  body?: {
    size?: number;
    data?: string;
  };
  parts?: RawGmailMessagePart[];
}

export interface RawGmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  historyId?: string;
  internalDate?: string;
  payload?: {
    partId?: string;
    mimeType?: string;
    filename?: string;
    headers?: RawGmailMessageHeader[];
    body?: {
      size?: number;
      data?: string;
    };
    parts?: RawGmailMessagePart[];
  };
}

export interface IGmailClient {
  listMessages(query: string, pageToken?: string, maxResults?: number): Promise<{
    messages: Array<{ id: string; threadId: string }>;
    nextPageToken?: string;
  }>;
  getMessage(id: string): Promise<RawGmailMessage>;
  listHistory(startHistoryId: string): Promise<{
    history?: any[];
    historyId: string;
  }>;
}

export interface FamappAdminStats {
  totalSubmissions: number;
  pendingCount: number;
  creditedCount: number;
  manualReviewCount: number;
  expiredCount: number;
  rejectedCount: number;
  totalEmailEvents: number;
  unclaimedEventsCount: number;
  claimedEventsCount: number;
  flaggedEventsCount: number;
}
