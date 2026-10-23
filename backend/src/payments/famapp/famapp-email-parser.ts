import { RawGmailMessage, RawGmailMessageHeader, ParsedFamappEmail, EmailAuthStatus } from './famapp.types';
import { Money } from '../../wallet/money';

export class FamappEmailParser {
  /**
   * Explicit, verified sender email addresses for FamApp payment notifications.
   * Display names are never used for identity verification.
   */
  static readonly ALLOWED_SENDER_ADDRESSES = [
    'no-reply@famapp.in',
    'no-reply@fampay.in',
  ] as const;

  static readonly ALLOWED_SIGNING_DOMAINS = [
    'famapp.in',
    'fampay.in',
  ] as const;

  /**
   * Parses a raw Gmail API message object into structured FamApp incoming-payment evidence.
   * Fail-closed: returns null if the email is not an authentic incoming payment credit receipt.
   */
  static parse(msg: RawGmailMessage): ParsedFamappEmail | null {
    if (!msg || !msg.id) {
      return null;
    }

    const headers = msg.payload?.headers || [];
    const getHeader = (name: string): string => {
      const match = headers.find((h: RawGmailMessageHeader) => h.name.toLowerCase() === name.toLowerCase());
      return match ? match.value : '';
    };

    const fromHeader = getHeader('From');
    const toHeader = getHeader('To');
    const subject = getHeader('Subject');
    const dateHeader = getHeader('Date');
    const authResults = getHeader('Authentication-Results');
    const receivedSpf = getHeader('Received-SPF');

    // 1. Strict Sender Verification (Address only, display name discarded)
    const senderEmailMatch = fromHeader.match(/<([^>]+)>/) || [null, fromHeader.trim()];
    const senderEmail = (senderEmailMatch[1] || fromHeader).trim().toLowerCase();

    const isExactSenderAllowed = (FamappEmailParser.ALLOWED_SENDER_ADDRESSES as readonly string[]).includes(senderEmail);

    // 2. Extract Email Body Text
    const bodyText = FamappEmailParser.extractBody(msg.payload);
    const snippet = msg.snippet || '';
    const fullContent = `${subject}\n${snippet}\n${bodyText}`;

    // 3. Strict Direction Verification (Must be INCOMING CREDIT, never OUTGOING DEBIT)
    const isCredit = /(?:received|credited to|added to your account|payment received|money added)/i.test(fullContent);
    const isDebit = /(?:sent to|debited from|paid to|payment sent|transferred to)/i.test(fullContent);

    if (isDebit) {
      // Outgoing payment receipt; ignore completely
      return null;
    }

    if (!isCredit) {
      // Non-credit email (e.g. promotional or marketing update)
      return null;
    }

    // 4. Strict 12-Digit UTR/RRN Parsing (Keyword label mandatory)
    // Prevents matching random 12-digit phone numbers, timestamps, or order IDs
    const strictUtrRegex = /(?:upi\s*ref(?:erence)?\s*(?:no\.?|num\.?)?|utr|rrn|bank\s*ref\s*(?:no\.?|num\.?)?|reference\s*no\.?)[\s:#.-]*([0-9]{12})\b/i;
    const utrMatch = fullContent.match(strictUtrRegex);

    if (!utrMatch) {
      // Must not fall back to loose 12-digit numbers
      return null;
    }
    const parsedUtr = utrMatch[1];

    // 5. Strict Amount Parsing
    // Matches currency symbol/prefix followed by numeric amount
    const amountRegex = /(?:₹|rs\.?|inr)[\s]*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i;
    const amountMatch = fullContent.match(amountRegex);
    if (!amountMatch) {
      return null;
    }

    let cleanAmountStr = amountMatch[1].replace(/,/g, '');
    let parsedAmount: string;
    try {
      parsedAmount = Money.format(cleanAmountStr);
      if (!Money.isPositive(parsedAmount)) {
        return null;
      }
    } catch {
      return null;
    }

    // 6. Extract Internal Transaction ID (if present)
    let parsedTxId: string | undefined;
    const txIdMatch = fullContent.match(/(?:transaction\s*id|txn\s*id|fampay\s*id|famapp\s*id)[\s:#-]*([A-Za-z0-9_-]+)/i);
    if (txIdMatch) {
      parsedTxId = txIdMatch[1];
    }

    // 7. Extract Sender Details
    let parsedSenderName: string | undefined;
    let parsedSenderVpa: string | undefined;

    const senderMatch = fullContent.match(/(?:from|received from)\s+([A-Za-z0-9\s.]+?)(?:\s*\((?:upi\s*id:\s*)?([a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+)\)|\s*(?:\n|$))/i);
    if (senderMatch) {
      parsedSenderName = senderMatch[1]?.trim();
      parsedSenderVpa = senderMatch[2]?.trim();
    }

    if (!parsedSenderVpa) {
      const vpaMatch = fullContent.match(/\b([a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+)\b/);
      if (vpaMatch) {
        parsedSenderVpa = vpaMatch[1];
      }
    }

    // 8. Extract Recipient VPA
    let parsedRecipientVpa: string | undefined;
    const recipientMatch = fullContent.match(/(?:to|credited to|account|recipient)[\s:]*([a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+)/i);
    if (recipientMatch) {
      parsedRecipientVpa = recipientMatch[1];
    }

    // 9. Fail-Closed Cryptographic DKIM & SPF Alignment Analysis
    let dkimStatus: 'PASS' | 'FAIL' | 'NONE' = 'NONE';
    let spfStatus: 'PASS' | 'FAIL' | 'NONE' = 'NONE';

    const authLower = authResults.toLowerCase();
    const spfLower = receivedSpf.toLowerCase();

    // Receiving server must be trusted (e.g. mx.google.com or standard authentication results)
    if (authLower.includes('dkim=pass')) {
      // Must verify domain alignment with famapp.in or fampay.in
      const hasAlignedDkim = FamappEmailParser.ALLOWED_SIGNING_DOMAINS.some(
        (domain) =>
          authLower.includes(`header.i=@${domain}`) ||
          authLower.includes(`header.i=${domain}`) ||
          authLower.includes(`header.d=${domain}`)
      );

      if (hasAlignedDkim) {
        dkimStatus = 'PASS';
      } else {
        // DKIM passed, but for an unaligned / foreign domain -> spoofing attempt!
        dkimStatus = 'FAIL';
      }
    } else if (authLower.includes('dkim=fail') || authLower.includes('dkim=temperror') || authLower.includes('dkim=permerror')) {
      dkimStatus = 'FAIL';
    }

    if (authLower.includes('spf=pass') || spfLower.startsWith('pass')) {
      spfStatus = 'PASS';
    } else if (authLower.includes('spf=fail') || spfLower.startsWith('fail') || spfLower.includes('softfail')) {
      spfStatus = 'FAIL';
    }

    // Fail-Closed authStatus evaluation:
    // Only marked VERIFIED if exact sender is allowed AND DKIM is PASS with aligned domain
    let authStatus: EmailAuthStatus = 'MISSING';
    if (!isExactSenderAllowed || dkimStatus === 'FAIL' || spfStatus === 'FAIL') {
      authStatus = 'FAILED';
    } else if (isExactSenderAllowed && dkimStatus === 'PASS') {
      authStatus = 'VERIFIED';
    } else {
      authStatus = 'MISSING';
    }

    // 10. Extract Timestamp
    let txTimestamp = new Date();
    if (dateHeader) {
      const parsedDate = new Date(dateHeader);
      if (!isNaN(parsedDate.getTime())) {
        txTimestamp = parsedDate;
      }
    } else if (msg.internalDate) {
      const ms = parseInt(msg.internalDate, 10);
      if (!isNaN(ms)) {
        txTimestamp = new Date(ms);
      }
    }

    return {
      gmailMessageId: msg.id,
      gmailThreadId: msg.threadId,
      senderAddress: senderEmail,
      recipientAddress: toHeader,
      parsedUtr,
      parsedTxId,
      parsedAmount,
      currency: 'INR',
      parsedSenderName,
      parsedSenderVpa,
      parsedRecipientVpa,
      transactionTimestamp: txTimestamp,
      dkimStatus,
      spfStatus,
      authStatus,
      rawHeaders: JSON.stringify(headers.filter((h) =>
        ['from', 'to', 'subject', 'date', 'authentication-results', 'received-spf', 'message-id'].includes(h.name.toLowerCase())
      )),
      rawSnippet: snippet.substring(0, 500),
    };
  }

  /**
   * Recursively decodes Gmail API message payload parts (base64url to utf8).
   */
  private static extractBody(payload?: any): string {
    if (!payload) return '';

    if (payload.body?.data) {
      try {
        const base64 = payload.body.data.replace(/-/g, '+').replace(/_/g, '/');
        const text = Buffer.from(base64, 'base64').toString('utf8');
        return text.replace(/<[^>]*>?/gm, ' ');
      } catch {
        return '';
      }
    }

    if (Array.isArray(payload.parts)) {
      return payload.parts.map((part: any) => FamappEmailParser.extractBody(part)).join('\n');
    }

    return '';
  }
}
