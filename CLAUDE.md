# customer-app — project context

Expo React Native customer ordering app.

## Client-demo decisions (locked)

**Read `../backend/DEMO_DECISIONS.md` before touching payments, invoicing,
SMS, push, maps or printing.** Short version:

- **We are showing this to the client. Approval unlocks real credentials.**
- **No invoice/receipt UI in scope** — the restaurant issues its own ZATCA
  invoice separately. We only show the order confirmation, payment status
  and totals. Do not build an "invoice / receipt" screen.
- **OTP login uses a fake demo OTP** — the backend mock returns / expects
  `123456` for every OTP. The customer app's OTP screen should render
  normally; the value it types is real, the backend just accepts one code.
  Ship no client-side "demo" hint on the screen — the demo audience is told
  the code out loud.
- **Push notifications** stay mock until client approval — the in-app
  notifications inbox reads from the backend, no Firebase yet.
- **Google Maps keys are needed *now*** — order tracking / map panel /
  address picker all need them. Set `GOOGLE_MAPS_API_KEY` in the **build
  env**; `app.config.js` injects it into the Android, iOS and `extra` slots.
  Never put the key in `app.json` — see "Configuration comes from the
  environment" below.
- **Real online payment** waits for Tap credentials. Until then the demo
  drives payment through the mock gateway's `simulate` webhook. Cash on
  delivery works today (per-branch opt-in).

## Configuration comes from the environment

`app.json` holds committable config; `app.config.js` injects `API_BASE_URL` and
`GOOGLE_MAPS_API_KEY` at build time, so no key is written to a committed file.
The Maps key **used to be hard-coded in `app.json`** and is therefore still in
this repo's git history — it must be rotated in the Google console, and the
replacement set in the build env (and in EAS secrets), never committed. Without
a key the map panels degrade to the "map unavailable" card; they do not crash.

## The endpoint contract is tested

`test/unit/endpoints.spec.ts` asserts the **path** and the **auth flag** of
every call against a recording double. Both facts are invisible to
typechecking, linting, screen tests and the backend's own contract suite, and
two of them had drifted badly enough to break the app outright: `listBranches`
called `/branches` (the **staff** resource, which 401s a customer, so the first
screen could never load), and `quote` passed `public: true`. `public: true`
does not mean "this route is public" — it means **send no token**. Pricing is
authenticated, so checkout could never show a total. Both are fixed; the test
is what stops them coming back.

## Order placement is idempotent

`placeOrder` sends an `Idempotency-Key` owned by the **cart**
(`CartProvider`), generated once and reset when the cart clears —
deliberately **not** per attempt. The backend places the order once per key and
replays the stored result, so a request that times out and is retried cannot
become a second order the kitchen cooks. A fresh key on every retry would
defeat the whole mechanism.

## Every request has a deadline

`fetch` has no timeout of its own: a host that accepts the connection and then
never answers leaves the request pending forever and the screen spinning until
the app is force-quit. `ApiClient` applies `DEFAULT_TIMEOUT_MS` to every
request unless a caller opts out with `timeoutMs: 0`, and the 401-refresh retry
gets its own fresh deadline rather than the remains of the first.

## Signing out is a server-side act

`signOut` calls `POST /auth/logout` to revoke the session family, then clears
the device. Clearing tokens locally alone is not signing out — the refresh
token stays valid until it expires. The revoke is best-effort: a customer on a
dead connection must still end up signed out on the device.

## White screens

`App.tsx` wraps everything in `<ErrorBoundary>` (`src/components/`), **outside
every provider** — the motion, auth and cart providers are among the things
that can throw, and a boundary inside them goes down with them. React unmounts
the whole tree on an uncaught render error, which in a release build is a blank
view the customer can only escape by force-quitting.

## Money rules

App displays totals; the backend prices. No total is ever computed here.
Product variants are sent as `productVariantId` on each `OrderItemInput`;
when set, the variant's price replaces the product's base price at
server-side pricing time.
