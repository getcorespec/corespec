import crypto from 'node:crypto';

export interface WebhookEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  signature: string;
}

export function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected),
  );
}

export async function dispatchEvent(
  event: WebhookEvent,
  endpoints: string[],
): Promise<{ endpoint: string; status: number }[]> {
  const results = await Promise.allSettled(
    endpoints.map(async (endpoint) => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
      return { endpoint, status: res.status };
    }),
  );

  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { endpoint: endpoints[i], status: 0 },
  );
}
