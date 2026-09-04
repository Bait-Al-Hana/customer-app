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

## The app is pinned to the light theme

`useTheme()` returns the light palette unconditionally (owner decision,
2026-09-04). It used to follow `useColorScheme()`, which is the whole of why
the app "looked dark" when nobody had chosen a dark design: a customer whose
phone was in dark mode got the dark palette by accident. The brand is a warm
cream ground with food photography on it, and the dark palette was never
art-directed to carry that.

`app.json` sets `userInterfaceStyle: "light"` and `App.tsx` sets
`<StatusBar style="dark" />` for the same reason — `"auto"` would put white
status-bar glyphs on a cream background.

The dark palette is **kept**, and `buildTheme('dark')` still builds it, so
making this a real user-facing choice later is a small change rather than a
rewrite. `test/unit/theme.spec.ts` holds both: that the light ground is warm
(the logo's magenta needs something to be loud against — the old `#FCF7FA`
leaned magenta too) and that the dark palette still builds.

## The quote must carry the delivery address

`quoteOrder` sends `customerAddressId` whenever one is chosen, and the address
is in the re-quote dependency list. The delivery fee is priced from the
distance between the branch and that address (5 SAR base covering 5 km, then
3 SAR per further km), so **a quote without it comes back at the base fee only
and the customer meets the real fee at placement** — the same "price changed at
the last second" failure that made checkout switch from `/pricing/quote` to
`/customer/orders/quote` in the first place.

Checkout also surfaces `delivery.blockers` while the basket is still open. A
basket under the 40 SAR delivery minimum gets "Add 15.00 more" and a button
back to the menu — not a rejection on the final press. An address outside the
branch radius disables the button, because that one is not fixable from the
checkout screen with that address.

## Order totals come from the backend's own breakdown

`OrderSummaryRows` (`components/OrderSummaryRows.tsx`) renders the itemised
list the backend built, rather than reassembling one from the quote's columns —
so this summary, the branch view and the owner view cannot disagree, and a row
the backend starts sending appears here with no change.

**Rows carry `included`.** Prices are VAT-inclusive: the VAT line says how much
of the total *is* tax, it does not add to it. A summary that summed every row
would overstate every order by 15%. There is a fallback to the quote's columns
for an older backend, so checkout never shows an empty summary.

## The checkout layout

Modelled on the delivery-app checkout pattern the owner asked for
(2026-09-04): the saving stated first, one card carrying **when / where / who /
how much**, and a sticky pay bar with the method on the left and the amount on
the button.

Three things about it are deliberate:

- **The bill row shows the total *and* how much of it is VAT, collapsed.**
  Prices are VAT-inclusive, so the tax is inside the total, and a customer who
  cannot see how much of it is tax has to take our word for the number. The
  full itemised breakdown is one tap away and never more than that.
- **A rejected coupon message renders outside the collapsible panel.** It
  changes what the customer is about to pay, so it must be visible whether or
  not they thought to open the bill. That is the whole reason the backend
  returns a priced quote plus `couponError` rather than failing the request —
  and a screen test holds it, because collapsing it away was exactly the
  regression this rewrite introduced first time.
- **The delivery note says *our own team*, not a partner.** We run our own
  fleet; there is no delivery partner in this platform, and the copy must never
  imply one.

Nothing from the reference screenshot that is not ours was carried over: no
partner offers, no wallet balance, no donation line.

## Money rules

App displays totals; the backend prices. No total is ever computed here.
Product variants are sent as `productVariantId` on each `OrderItemInput`;
when set, the variant's price replaces the product's base price at
server-side pricing time.
