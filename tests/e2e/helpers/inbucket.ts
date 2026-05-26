import type { APIRequestContext } from '@playwright/test';

/**
 * Minimal Inbucket client. Supabase's local dev stack routes all outgoing
 * email to Inbucket on port 54324 -- the magic-link email lands there, and
 * we pull it back out via this HTTP API.
 *
 * Inbucket API reference: https://www.inbucket.org/packages/rest/v1.html
 *
 * Mailbox lookup strategy (after the PR #39 CI failure): Inbucket's mailbox
 * naming depends on local routing config -- sometimes the local-part, sometimes
 * the lowercased local-part, sometimes a hash. Rather than guess, we poll the
 * "expected" name first and then, on misses, scan every mailbox for one whose
 * messages mention the recipient address. That's slower but unambiguous.
 */

const INBUCKET_BASE = process.env.INBUCKET_BASE_URL ?? 'http://127.0.0.1:54324';
const MAGIC_LINK_PATTERN = /https?:\/\/[^\s"<>)]+/g;

interface InbucketMessageHeader {
  id: string;
  from: string;
  to?: string[];
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
  return local.toLowerCase();
}

async function fetchMailbox(
  request: APIRequestContext,
  mailbox: string,
): Promise<InbucketMessageHeader[]> {
  const res = await request.get(`${INBUCKET_BASE}/api/v1/mailbox/${mailbox}`);
  if (!res.ok()) return [];
  try {
    return (await res.json()) as InbucketMessageHeader[];
  } catch {
    return [];
  }
}

async function listMailboxes(request: APIRequestContext): Promise<string[]> {
  // Inbucket exposes `/api/v1/mailbox` for listing in some builds; in others
  // it returns 404. Either response is OK -- we fall back to nothing.
  const res = await request.get(`${INBUCKET_BASE}/api/v1/mailbox`);
  if (!res.ok()) return [];
  try {
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as { name?: string }[]).flatMap((m) => (m.name ? [m.name] : [])) : [];
  } catch {
    return [];
  }
}

/**
 * Poll until a message addressed to `email` arrives anywhere in Inbucket, or
 * the timeout expires. Returns the matching message header + the mailbox it
 * landed in (so the caller can pass that into `getMessage` / `purgeMailbox`).
 */
export async function waitForMessageTo(
  request: APIRequestContext,
  email: string,
  timeoutMs = 30_000,
  intervalMs = 500,
): Promise<{ mailbox: string; header: InbucketMessageHeader }> {
  const expected = mailboxFor(email);
  const emailLower = email.toLowerCase();
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    // Try the expected mailbox first (cheapest, most common path).
    const direct = await fetchMailbox(request, expected);
    if (direct.length > 0) {
      return { mailbox: expected, header: direct[0] };
    }

    // Fallback: scan every known mailbox for our recipient.
    for (const name of await listMailboxes(request)) {
      const messages = await fetchMailbox(request, name);
      const match = messages.find((m) =>
        (m.to ?? []).some((addr) => addr.toLowerCase().includes(emailLower)),
      );
      if (match) {
        return { mailbox: name, header: match };
      }
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(
    `No message addressed to "${email}" landed in Inbucket within ${timeoutMs}ms (base: ${INBUCKET_BASE}).`,
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
 * Extract the first URL from the magic-link email. Supabase's local template
 * embeds the auth-server verify URL (which 302s on to /auth/callback).
 * Prefer URLs that contain `/auth/callback` (matches both the verify URL --
 * which includes it in its `redirect_to=` query -- and any direct link).
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
 * Best-effort cleanup. Not load-bearing -- each test uses a unique address.
 */
export async function purgeMailbox(
  request: APIRequestContext,
  mailbox: string,
): Promise<void> {
  await request.delete(`${INBUCKET_BASE}/api/v1/mailbox/${mailbox}`).catch(() => undefined);
}

/**
 * Dump every known mailbox + its message headers as a single JSON string.
 * Used for failure diagnostics when the happy-path fails to find an email.
 */
export async function dumpInbucketState(request: APIRequestContext): Promise<string> {
  const mailboxes = await listMailboxes(request);
  const out: Record<string, unknown> = { base: INBUCKET_BASE, mailboxes: [] };
  for (const name of mailboxes) {
    const messages = await fetchMailbox(request, name);
    (out.mailboxes as { name: string; messages: InbucketMessageHeader[] }[]).push({
      name,
      messages,
    });
  }
  return JSON.stringify(out, null, 2);
}
