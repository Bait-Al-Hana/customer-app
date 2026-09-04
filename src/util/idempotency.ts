/**
 * A key that makes one checkout attempt safe to retry.
 *
 * Sent as `Idempotency-Key`; the backend runs the placement once per key and
 * replays the stored order afterwards. The rule that makes it work is that the
 * key belongs to the *attempt*, not the request: generating a fresh one on
 * every send means every retry looks like a new order, which is exactly the
 * duplicate it was added to prevent.
 *
 * `crypto.randomUUID` is not available on every React Native runtime, so this
 * builds an equivalent from `Math.random`. Uniqueness is all that is needed —
 * the key is scoped per customer server-side, it is not a secret, and it does
 * not have to be unguessable.
 */
export function newIdempotencyKey(): string {
  const block = (length: number): string =>
    Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  return `${block(8)}-${block(4)}-${block(4)}-${block(4)}-${block(12)}`;
}
