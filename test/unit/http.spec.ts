import { ApiClient, ApiError, joinUrl, parseApiError } from '../../src/api/http';

describe('http helpers', () => {
  it('joins base and path with exactly one slash', () => {
    expect(joinUrl('http://x/api/v1', 'branches')).toBe('http://x/api/v1/branches');
    expect(joinUrl('http://x/api/v1/', '/branches')).toBe('http://x/api/v1/branches');
    expect(joinUrl('http://x/api/v1', '/orders/1/pay')).toBe('http://x/api/v1/orders/1/pay');
  });

  it('parses the backend error envelope', () => {
    const shape = parseApiError(409, { statusCode: 409, code: 'CONFLICT', message: 'Nope', details: ['a'] });
    expect(shape.code).toBe('CONFLICT');
    expect(shape.statusCode).toBe(409);
    expect(shape.details).toEqual(['a']);
  });

  it('synthesises a safe error for a non-envelope body', () => {
    expect(parseApiError(500, 'html error page').code).toBe('INTERNAL_ERROR');
    expect(parseApiError(400, null).code).toBe('REQUEST_FAILED');
    // Never leaks a raw server message.
    expect(parseApiError(500, '<html>').message).not.toContain('html');
  });

  it('flags network errors', () => {
    const net = new ApiError({ statusCode: 0, code: 'NETWORK', message: 'x' });
    expect(net.isNetwork).toBe(true);
    expect(new ApiError({ statusCode: 404, code: 'NOT_FOUND', message: 'x' }).isNetwork).toBe(false);
  });
});

/**
 * The request deadline.
 *
 * `fetch` has no timeout of its own. A request to a host that accepts the
 * connection and then never answers stays pending forever, and the screen that
 * awaited it keeps spinning until the app is force-quit — the normal outcome
 * on a flaky mobile connection, not an edge case. So every request carries a
 * deadline whether or not its caller asked for one.
 */
describe('ApiClient request deadline', () => {
  const noTokens = { getAccessToken: () => null, onUnauthorized: async () => false };
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
    jest.useRealTimers();
  });

  it('aborts a request that never answers, as a network error', async () => {
    // A fetch that only ever settles when its signal aborts.
    global.fetch = jest.fn(
      (_url: unknown, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
        }),
    ) as unknown as typeof fetch;

    const client = new ApiClient('http://api', noTokens);
    const pending = client.request('/slow', { timeoutMs: 10 });

    await expect(pending).rejects.toBeInstanceOf(ApiError);
    await expect(pending).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('passes an abort signal on every request by default', async () => {
    const seen: Array<AbortSignal | undefined> = [];
    global.fetch = jest.fn((_url: unknown, init?: { signal?: AbortSignal }) => {
      seen.push(init?.signal);
      return Promise.resolve(new Response('{}', { status: 200 }));
    }) as unknown as typeof fetch;

    await new ApiClient('http://api', noTokens).request('/ok');

    // The guard: a caller that passes no `timeoutMs` still gets a deadline.
    expect(seen[0]).toBeInstanceOf(AbortSignal);
  });

  it('sends caller-supplied headers', async () => {
    let sent: Record<string, string> = {};
    global.fetch = jest.fn((_url: unknown, init?: { headers?: Record<string, string> }) => {
      sent = init?.headers ?? {};
      return Promise.resolve(new Response('{}', { status: 200 }));
    }) as unknown as typeof fetch;

    await new ApiClient('http://api', noTokens).request('/orders', {
      method: 'POST',
      body: {},
      headers: { 'Idempotency-Key': 'k1' },
    });

    expect(sent['Idempotency-Key']).toBe('k1');
  });
});
