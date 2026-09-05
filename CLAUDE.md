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

## The Bill Summary

`BillSummary` (`components/BillSummary.tsx`) renders the itemised list the
backend built, rather than reassembling one from the quote's columns — so this
summary, the branch view and the owner view cannot disagree, and any fee the
owner adds (a platform fee, a service charge) appears by its own name with no
change to this app.

It opens as a **sheet** from the bill row, not as an accordion inside a card.
It is the thing a customer opens when they want to check a number, so it gets
the screen's attention rather than competing with the rest of the checkout.

Three things it must keep getting right:

- **A saving is a strikethrough, not a subtraction.** `strikethroughMinor` is
  what the row would have cost; it sits immediately beside what it did. The
  total saved is stated once under the bill — deliberately outside the column,
  so nobody adds it in.
- **VAT does not add to the total.** Prices are VAT-inclusive, so the VAT row
  says how much of the amount *is* tax. Rows the backend marks `included` render
  muted and labelled: a customer adding the column must not arrive at a number
  15% above what they are paying.
- **The fallback exists for an older backend**, so checkout never shows an empty
  summary — and it labels VAT "included" rather than repeating the mistake of
  listing it as an addition.

## The cart shows the bill, not an estimate of it

The cart used to print an item subtotal and the words **"Calculated at
checkout"** against the delivery fee and the VAT. The first time a customer saw
what they were actually paying was the screen asking them to pay it — and a
delivery fee that appears at the last second is the failure the coupon-aware
quote was introduced to prevent everywhere else.

`CartScreen` now makes the same `quoteOrder` call checkout makes and renders the same
`BillSummary`, so the two screens cannot disagree and any charge the owner adds
appears here by its own name with no change to this app. Three things about it:

- **It sends the address checkout will itself default to** (the default saved
  address, else the first). Without it the fee comes back at the base rate —
  so when there is no saved address the card says so in as many words rather
  than letting the number move at checkout.
- **A failed quote must not take the cart down.** It falls back to the item
  estimate, labelled as one; checkout is where a pricing failure is reported
  properly and offered a retry.
- **The footer button carries the server's total** when there is one. It never
  carries a number this app computed.

## A discount has a name, and the VAT rate is a fraction

`couponLabel` (`src/util/coupon.ts`, pure and tested) renders an applied offer
as **"Twenty off · HANA20"**. The backend's quote carries the coupon's own
`name` beside its code; a bill that can only say "HANA20 applied" makes the
customer remember which deal that was, on the screen where they are checking
the money. The name is absent on an older backend, so the code stands in.

`formatVatRate` exists because the checkout bill row read **"Includes SAR 6.52
VAT at 0.15%"**. The backend sends the rate as the decimal fraction it stores
and snapshots onto every order line; the screen rendered it straight into
`${rate}%`. The screen test passed because its fixture said `'15'` — a value the
backend never sends. The fixture is corrected, and a rate above 1 now returns
null (the clause is dropped) rather than printing "1500%".

## Payment methods are marked, not emoji'd

`PaymentMark` (`src/components/PaymentMark.tsx`) owns the mark beside each
method. Each used to be a single emoji, and two failed outright: the Apple one
was a private-use character that renders as an **empty box** off Apple
platforms, and 🏧 (an ATM) is not mada by any reading.

**Apple Pay and mada are trademarks and their artwork is not redrawn here.**
The owner supplied both and they live in `assets/payment/`, **cropped to the
mark** — a supplied logo file is mostly its own background, and dropping one
into a chip unedited letterboxes a small wordmark inside a field of white or
black. `ART` in `PaymentMark` maps a method to its file; a card-scheme mark is
added the same way, the file and one line. Card and cash are drawn in the app's
own icon family because those are ours to draw, and any method without artwork
still renders a legible typographic chip rather than a hole.

Two details the marks depend on: the chip is **landscape** for an artwork-backed
method (a wordmark in a 40pt square renders about 14pt tall and unreadable), and
each sits on **the ground it was drawn for** — black for Apple Pay, white for
mada. On the app's cream surface either one looks like a mistake.

`PaymentMethodsScreen` uses the same component, so a method looks like itself on
both screens.

**Apple Pay is offered where it can be honoured — which is a question about the
browser, not the OS.** `supportsApplePay` (`util/applePay.ts`, pure and tested)
answers it: native iOS, or the web build in a browser exposing a working
`window.ApplePaySession`.

This was `Platform.OS === 'ios'`, and that is wrong in the one place it
mattered. **This app ships as a web build too, and `Platform.OS` there is
`'web'` — on an iPhone, in Safari, with Apple Pay set up.** So the check hid
Apple Pay from precisely the devices that support it and showed it on none. The
platform was wrong in the other direction as well: Chrome on iOS *is* iOS and
cannot pay. `canMakePayments()` is called inside a try/catch, because it throws
in an insecure context and in some embedded web views — a missing option beats
one that dead-ends at the last press.

## The app shows delivery prices only

Owner decision (2026-09-04). `menuPriceMinor` (`src/util/menuPrice.ts`) is the
single place it is applied — the card, the product screen and the quick-add all
go through it, because a price that changes between the list and the item is the
one customers notice.

The consequence is deliberate: **a customer who switches to pickup at checkout
sees the total go down.** That is the safe direction. The reverse — browsing at
pickup prices and being charged delivery prices — is what gets disputed at the
door.

`deliveryPriceMinor` is absent on a backend that predates the uplift, so the
pickup price stands in. With the uplift at 0% the two are equal, which is what
makes this safe to ship before the owner sets a percentage.

## Staying signed in is a platform problem, not a policy one

`src/util/deviceStore.ts` is the one key/value store: Keychain / Keystore on
native, `localStorage` on **web**. That distinction is the whole reason a
customer used to be signed out every time they closed the app on the Vercel
build — `expo-secure-store` is a native module, every call on web throws, and
`tokenStore` wrapped each one defensively, so the failure was silent. Nothing
was ever written and nothing was ever restored.

The refresh token is good for 30 days and the client exchanges it on the first
401, so a returning customer lands on the menu. Signing out is the only thing
that ends a session, and it revokes the family server-side.

`localStorage` is a weaker store than the Keychain and cannot be anything else
on the web: it holds this app's own session tokens, the refresh token is
revocable, and that is the trade. Don't "fix" it by dropping persistence.

## Delivery or pickup decides the branch

`FulfilmentProvider` holds the mode (and, for pickup, the chosen branch); the
rule itself is pure and tested in `src/util/branchChoice.ts`. Owner decision
(2026-09-04), and the halves are deliberately different:

- **Pickup — the customer chooses.** Every branch that does pickup is listed in
  a sheet on home, nearest first when we know where they are.
- **Delivery — the app chooses and it is not changeable.** The nearest branch to
  their address delivers, because that is the one that arrives hot and it is
  what the fee is measured from. `resolveBranch` recomputes it from the address
  every time rather than remembering one, so a new address moves the branch.

When distance cannot be measured — no saved address with a pin, or branches with
no coordinates — it still shows a branch and flags `needsAddress`, so the screen
asks for an address instead of claiming a nearest branch it did not work out.
Refusing to serve someone over our own missing data is the more expensive error;
so is lying about how the branch was picked.

The mode lives above the screens because it decides three things that must not
disagree: which branch, which prices (delivery prices carry the owner's uplift),
and what checkout places. The cart used to open checkout on `PICKUP`
unconditionally, so a delivery customer met a pickup total.

## Home shows food; Offers shows offers

No banners on home (owner, 2026-09-04) — on a phone the artwork pushed the menu
below the fold, which is the one thing that screen exists for. Banners and
offers both live on the Offers tab now, and the "Order from" strip of every
branch is gone: half the time that choice is not the customer's to make.

**Every offer is a real coupon the owner published** (`/customer/config` →
`offers`), with the owner's own artwork and the code the checkout accepts. The
hard-coded `PROMO_BANNERS`/`OFFERS` in `src/data/content.ts` are deleted — they
carried invented codes, so every one was refused at checkout. Never reintroduce
marketing copy with a coupon code in it: if a code is shown, a coupon behind it
must exist.

## Order tracking says how far away, not a made-up ETA

`OrderTrackingScreen` showed a hard-coded **"~15 min"** to every customer on
every order, on the one screen whose entire job is telling the truth about where
the food is. `src/util/driverProgress.ts` (pure, tested) replaces it with the
two facts the driver's pings actually support: road-adjusted distance (the same
1.3 factor the backend prices delivery with) and a conservative estimate from
it.

What it refuses matters more than what it says:

- **No ETA without a fix**, and **no ETA from a stale one** — a driver whose
  last ping was ten minutes ago may be at the door or stuck on the ring road,
  and a confident wrong number is what makes someone ring the branch. Past
  `STALE_AFTER_MS` the screen shows the last known distance and "last seen 9 min
  ago" instead.
- **Never "0 min"** — someone 100 m away is still parking.
- The age of the position is on screen next to it. A dot on a map with no age
  reads as live, so a driver who lost signal looks parked outside a stranger's
  house.

The driver app pings every 30 seconds between pickup and drop-off
(`driver-app/src/delivery/location-sharing.ts`). Until this, nothing in the
platform ever sent a position at all.

**No route line, deliberately.** Drawing the road-following polyline needs the
Directions API, billed per call — cheap once per delivery, expensive per ping.
If it is added, fetch it **once** when the order goes out for delivery and cache
it; never per position update.

## The notification feed reloads on focus

`NotificationsScreen` re-reads on every focus. The feed is written server-side
as an order moves, so whatever was fetched when the app launched is stale by the
time anyone opens the screen — and "there's never anything new in here" is
exactly the complaint this screen attracts.

The other half of that complaint was a backend gap, fixed there: a status with
no message wrote no notification at all, so a manual-accept branch's customers
heard nothing between paying and the branch accepting. See the backend's
`notification-messages.ts`.

## Every Account row goes somewhere

Six rows used to raise "coming soon". They are real screens now — payment
methods (what is accepted, read from the live branches; no saved cards, because
none exist anywhere in the platform), notification settings, help (branch phone
numbers straight from the API, plus the questions the counter actually gets),
and the privacy notice and terms.

Two rules those screens keep: **no control that does not control anything** —
notification settings has no toggles because the backend has no per-customer
preference yet, and a switch that moved nothing would be worse than the row it
replaced — and the legal pages say on the page that they are the working version
pending the restaurant's own legal review. Don't quietly delete that line.

## Pickup off means gone, not greyed out

`src/util/fulfilment.ts`, pure and tested. An owner who switches pickup off for
a branch has decided that branch does not do pickup; a disabled tab still says
the option exists and looks like something broken, and a customer who cannot
press it has no way to tell which. So the tab is **not rendered**, and the
screen states which service the branch runs.

Hiding it is not enough on its own: `correctedType` moves a customer who
arrives already on the pickup tab — from a deep link, or because the branch
changed after the menu loaded — so they are not left on a choice placement will
refuse. A branch with neither option gets a plain "not taking orders" and a
disabled button, and nobody is moved anywhere, because switching them to a type
that is also refused is a different dead end rather than a fix.

While the branch is still loading both are assumed, so the tabs do not flicker
in and out on a slow connection. The server refuses an unsupported type at
placement regardless.

## Location is asked for at onboarding, not at checkout

`LocationSetupScreen` is the first screen after an OTP sign-in
(`AuthProvider.justOnboarded`, which is true only for a session that started
with a sign-in in this launch — never a restored one). The delivery fee depends
on distance, so an address is part of the price, not a formality collected at
the end: a customer who only meets the field at checkout has already chosen
what to eat before finding out what delivery costs, or that the branch does not
reach them.

**Skipping is a first-class outcome.** A location prompt that traps someone on
the first screen of a food app loses the order outright, so Skip is plain and
visible, a denied permission routes to manual entry rather than arguing, and the
home header's "Add your delivery address" is still there afterwards.

A pin whose written address cannot be read is **not discarded** — `AddAddress`
opens on it (`route.params.latitude/longitude`) so the customer supplies only
the words. The coordinates are the part that decides the fee and guides the
driver.

`toAddress` (`src/util/geocode.ts`) flattens the reverse-geocode result, which
is loosely specified and differs by platform: Android often puts the number
inside `street` as well as in `streetNumber`, and in Saudi Arabia the district
is frequently what a driver actually navigates by. It returns null rather than
saving an address like ", , " — which looks fine in a list and is useless to
the person holding the bag.

`AddAddress` leaves via `canGoBack() ? goBack() : replace('Tabs')`. Onboarding
reaches it with `replace`, so there is nothing beneath it and a plain `goBack`
would strand the customer on the address form.

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
