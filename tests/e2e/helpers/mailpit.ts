import type { APIRequestContext } from '@playwright/test';

/**
 * Minimal Mailpit client. Supabase's local dev stack switched from Inbucket
 * to Mailpit but kept the legacy `supabase_inbucket_*` container name and
 * port (54324). The REST API is therefore different from what older tutorials
 * (and PR #39/#40/#41 of this repo) assumed:
 *
 *   Inbucket:  GET /api/v1/mailbox/{local-part}     (one bucket per recipient)
 *   Mailpit:   GET /api/v1/messages                 (single global inbox)
 *              GET /api/v1/search?query=to:<addr>
 *              GET /api/v1/message/<id>
 *
 * Reference: https://mailpit.axllent.org/docs/api-v1/
 *
 * We use `search` rather than `messages` because parallel e2e runs may share
 * the Mailpit instance; filtering by recipient avoids cross-test pollution.
 */

const MAILPIT_BASE =
  process.env.MAILPIT_BASE_URL ??
  process.env.INBUCKET_BASE_URL ?? // legacy alias from the pre-rename env var
  'http://127.0.0.1:54324';

const MAGIC_LINK_PATTERN = /https?:\/\/[^\s"<>)]+/g;

interface MailpitMessageHeader {
  ID: string;
  MessageID: string;
  Subject: string;
  From: { Name: string; Address: string };
  To: { Name: string; Address: string }[];
  Created: string;
}

interface MailpitSearchResponse {
  total: number;
  unread: number;
  count: number;
  messages: MailpitMessageHeader[];
}

interface MailpitMessage {
  ID: string;
  From: { Name: string; Address: string };
  To: { Name: string; Address: string }[];
  Subject: string;
  Text: string;
  HTML: string;
}

async function search(
  request: APIRequestContext,
  query: string,
): Promise<MailpitMessageHeader[]> {
  const url = `${MAILPIT_BASE}/api/v1/search?query=${encodeURIComponent(query)}`;
  const res = await request.get(url);
  if (!res.ok()) return [];
  try {
    const body = (await res.json()) as MailpitSearchResponse;
    return body.messages ?? [];
  } catch {
    return [];
  }
}

/**
 * Poll Mailpit until a message addressed to `email` arrives, or the timeout
 * expires. Returns the first (newest) matching message header. Test specs
 * pass this on to `getMessage` to fetch the full body.
 */
export async function waitForMessageTo(
  request: APIRequestContext,
  email: string,
  timeoutMs = 20_000,
  intervalMs = 500,
): Promise<MailpitMessageHeader> {
  const query = `to:${email.toLowerCase()}`;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const matches = await search(request, query);
    if (matches.length > 0) return matches[0];
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(
    `No message addressed to "${email}" landed in Mailpit within ${timeoutMs}ms (base: ${MAILPIT_BASE}).`,
  );
}

export async function getMessage(
  request: APIRequestContext,
  messageId: string,
): Promise<MailpitMessage> {
  const res = await request.get(`${MAILPIT_BASE}/api/v1/message/${messageId}`);
  if (!res.ok()) {
    throw new Error(`Mailpit returned ${res.status()} for message ${messageId}`);
  }
  return (await res.json()) as MailpitMessage;
}

/**
 * Extract the first URL from the magic-link email. Supabase's local template
 * embeds the auth-server verify URL (which 302s on to /auth/callback).
 * Prefer URLs that mention `/auth/callback` (matches both the verify URL --
 * whose `redirect_to=` query contains the path -- and any direct link).
 */
export function extractMagicLink(
  message: MailpitMessage,
  callbackPathHint = '/auth/callback',
): string {
  const body = `${message.Text ?? ''}\n${message.HTML ?? ''}`;
  const matches = body.match(MAGIC_LINK_PATTERN) ?? [];
  const link = matches.find((u) => u.includes(callbackPathHint)) ?? matches[0];
  if (!link) {
    throw new Error('No URL found in the email body. Check the Supabase email template.');
  }
  return link.replace(/[)>\]]+$/, '');
}

/**
 * Delete a single message by id. Best-effort cleanup.
 */
export async function deleteMessage(
  request: APIRequestContext,
  messageId: string,
): Promise<void> {
  await request
    .delete(`${MAILPIT_BASE}/api/v1/messages`, { data: { ids: [messageId] } })
    .catch(() => undefined);
}
