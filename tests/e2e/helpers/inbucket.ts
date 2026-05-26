import type { APIRequestContext } from '@playwright/test';

/**
 * Minimal Inbucket client. Supabase's local dev stack routes all outgoing
 * email to Inbucket on port 54324 -- the magic-link email lands there, and
 * we pull it back out via this HTTP API.
 *
 * Inbucket API reference: https://www.inbucket.org/packages/rest/v1.html
 *
 * Mailbox naming: Inbucket derives the mailbox from the local-part of the
 * recipient address (everything before `@`). The full address can also be
 * used; we use the local-part to match the dashboard URL.
 */

const INBUCKET_BASE = process.env.INBUCKET_BASE_URL ?? 'http://127.0.0.1:54324';
const MAGIC_LINK_PATTERN = /https?:\/\/[^\s"<>)]+/g;

interface InbucketMessageHeader {
  id: string;
  from: string;
  subject: string;
  date: string;
  size: number;
}

interface InbucketMessage {
  id: string;
  body: { text?: string; html?: string };
  header: Record<string, string[]>;
}

export function mailboxFor(email: string): string {
  const [local] = email.split('@');
  if (!local) throw new Error(`Email has no local part: ${email}`);
  return local;
}

/**
 * Poll Inbucket until a message arrives in `mailbox` or the timeout expires.
 * Returns the first (oldest) message header.
 */
export async function waitForMessage(
  request: APIRequestContext,
  mailbox: string,
  timeoutMs = 15_000,
  intervalMs = 500,
): Promise<InbucketMessageHeader> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await request.get(`${INBUCKET_BASE}/api/v1/mailbox/${mailbox}`);
    if (res.ok()) {
      const messages = (await res.json()) as InbucketMessageHeader[];
      if (messages.length > 0) return messages[0];
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(
    `No message landed in mailbox "${mailbox}" within ${timeoutMs}ms (Inbucket: ${INBUCKET_BASE}).`,
  );
}

export async function getMessage(
  request: APIRequestContext,
  mailbox: string,
  messageId: string,
): Promise<InbucketMessage> {
  const res = await request.get(`${INBUCKET_BASE}/api/v1/mailbox/${mailbox}/${messageId}`);
  if (!res.ok()) {
    throw new Error(`Inbucket returned ${res.status()} for message ${messageId}`);
  }
  return (await res.json()) as InbucketMessage;
}

/**
 * Extract the first URL from the magic-link email that points back at our
 * app's /auth/callback. The dev Supabase Auth template wraps the link in
 * tracking redirect HTML; we want the absolute https/http URL.
 */
export function extractMagicLink(message: InbucketMessage, callbackPathHint = '/auth/callback'): string {
  const body = (message.body.text ?? '') + '\n' + (message.body.html ?? '');
  const matches = body.match(MAGIC_LINK_PATTERN) ?? [];
  const link = matches.find((u) => u.includes(callbackPathHint)) ?? matches[0];
  if (!link) {
    throw new Error('No URL found in the email body. Check the Supabase email template.');
  }
  // Sanitize trailing HTML closing chars from the regex capture.
  return link.replace(/[)>\]]+$/, '');
}

/**
 * Best-effort cleanup -- delete the mailbox so the next test run sees a clean
 * slate. Not load-bearing (each test uses a unique address), but tidy.
 */
export async function purgeMailbox(
  request: APIRequestContext,
  mailbox: string,
): Promise<void> {
  await request.delete(`${INBUCKET_BASE}/api/v1/mailbox/${mailbox}`).catch(() => undefined);
}
