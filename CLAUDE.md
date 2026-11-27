# customer-app — project context

Expo React Native customer ordering app.

## Arabic and right-to-left (i18n)

`src/i18n/` adds an English / العربية choice (Account → Language, persisted via
`deviceStore`). The backend already serves every branch, category, product and
add-on name in Arabic (`nameAr`); before this the app **received and discarded
all of it** and was English-only. Now:

- **`strings.ts` is pure and tested** (`test/unit/i18n.spec.ts`) — no React, no
  React Native, so it runs in the fast logic suite. It holds the translation
  dictionary and three helpers: `translate(lang, key, vars)`,
  `localizedName(lang, name, nameAr)` and `resolveLang`. The same split as every
  other pure/RN boundary in this repo (`buildInfo`, `branchChoice`): the rules
  are tested, the React layer just holds the current language.
- **Fallback is layered and never blank.** `translate` falls back requested
  language → English → the key itself, so a not-yet-translated string reads in
  English rather than vanishing, and an unknown key reads as its own name
  (visible in testing, never a crash). `localizedName` falls back to the other
  language's name rather than rendering empty — showing *something real* always
  beats a gap.
- **`LanguageProvider` flips copy and content names immediately; full layout
  mirroring needs a restart.** Text direction and Arabic content switch the
  instant the toggle is pressed (`AppText` reads `isRTL` from the context, not
  from `I18nManager`). But RN mirrors *layout* (flex rows, `start`/`end`) only
  through `I18nManager`, which cannot re-mirror an already-laid-out tree — so the
  provider sets `I18nManager.forceRTL` for the **next launch** and the Account
  note says so. Do not try to "fix" this with a forced reload: there is no
  `expo-updates` here, and a half-mirrored session is worse than an honest note.
- **`useLanguage()` never throws without a provider** (English, LTR default),
  exactly like `useMotion`, so every component and the screen tests (which mount
  without it) stay renderable.

**v1 coverage, stated honestly.** Content names (`nameAr`) are localized across
the live browse surfaces — Home rails + categories, Menu chips/headings/items,
Product detail (name, groups, add-ons), Search (results + category chips, and
the filter matches `nameAr`). Core UI strings are translated on the tab bar,
Account (in full), Menu, Product and Orders. **Not yet covered, and it degrades
to English rather than breaking:** many secondary screens' UI strings
(Checkout, Cart, Offers, Loyalty, Help, the auth flow, empty/section headers),
and names that the app stored denormalized at action time (cart lines, and the
`productName` on already-placed order items) — those keep the name captured when
they were created. Variant names have no `nameAr` in the API, so they stay
English until the backend adds one. Adding a screen is one dictionary entry per
string; the framework is complete.

**Not device-verified.** Per "Device testing is now the gate" below, RTL layout
and Arabic shaping are exactly the kind of thing that only shows on a handset;
typecheck, lint and the Node tests all pass for an app whose mirroring looks
wrong in a real build.

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

**A blocker leads the screen, and the button never offers to take money we will
refuse.** Both halves were wrong: the only explanation lived in the sticky pay
bar as small red text, next to a large button still reading "SAR 11.00 · Pay".
So the first thing a customer read was an amount we were not going to accept,
and the reason was the smallest thing on screen. The blocker is now a banner
above the form that cannot fix it, and an out-of-range button says "Too far to
deliver" — the same shape as the below-minimum button, which already relabelled
itself to "Add 15.00 more". The pay bar keeps a one-line reminder for someone
who has scrolled past the banner, deliberately shorter than it rather than a
second copy.

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

## An automatic promotion has no code, and therefore no button

`/customer/config` now carries `promotions` alongside `offers`, and they are
different things. An **offer** is a coupon the customer claims: it has a code,
and tapping the card attaches it. A **promotion** is a price already being
charged — the backend applies it to any qualifying basket with nobody typing
anything.

So `PromotionCard` on the Offers tab carries **no button**. That absence is the
design, and it follows the rule the Account screens already keep: a control that
controls nothing is worse than no control at all. A "Use this offer" button here
would either do nothing or pretend to.

It also never says what a promotion is worth on *this* basket. The server prices
the order; a number computed here would be a second set of figures to disagree
with the one on the bill.

`src/util/promotion.ts` is pure and tested. Two rules in it:

- **`branchIds` is empty when a promotion runs everywhere**, not nowhere.
  Reading it the other way round hides every company-wide offer the owner
  publishes, and nobody reports it — the tab simply looks quiet. When the basket
  has settled on a branch, a promotion another branch runs is dropped; when it
  has not, everything is shown, because an empty Offers tab for someone who has
  not started an order is exactly when they were browsing for a reason to.
- **An empty product list means the whole order.** "0 items", or saying nothing,
  would both read as "this applies to nothing".

## The bill names whatever took the money off

`discountLabel` (`src/util/coupon.ts`) replaces the direct `couponLabel` call on
the cart and checkout: it names the coupon when one applied, and otherwise the
promotion. The promotion is the case it exists for — the customer typed nothing,
so without its name there is nothing on the screen explaining why the total is
below the menu price, and an unexplained saving is queried as often as an
unexplained charge.

`couponSuperseded` renders as a **muted** note, next to where `couponError`
renders in red, and outside the collapsible panel for the same reason: it
explains the amount on the button. It is not an error — the code the customer
typed is valid, it simply saved less than the standing offer, and it was not
spent. Colouring it red would tell them a working code is broken.

## Which build is this?

The Account screen footer carries a build marker — short commit and build time.
`app.config.js` injects them into `extra` (the same route the API URL and the
Maps key take); `version.ts` reads them; `util/buildInfo.ts` formats them and is
**pure, importing nothing**, so it runs in the fast logic suite. That split is
the same one `driver-app/src/util/navigationUrl.ts` makes for `Platform`, and
for the same reason: a marker rendering "Invalid Date" destroys trust in the one
signal meant to settle an argument, and no render test would catch it.

It exists because the tracking crash was found, fixed and verified in a browser
against the real web bundle — and the only question left was one nobody could
answer by looking at the app: *is this the fixed build?* Until that is settled a
stale bundle and a live bug are indistinguishable. **When a bug is reported,
read the marker first.**

A build made outside CI reports `local` rather than claiming a commit — the one
lie a marker like this cannot afford, since its whole job is saying what is
actually running.

## A type is a promise about a local value, not about what the server sends

`DeliveryTracking.driver.user` was typed `{ fullName: string }`, so the tracking
screen read `driver.user.fullName` straight through. A null there throws inside
render, React unmounts the tree, and the customer meets the error boundary on
the one screen that tells them where their food is — reproduced in Chromium
against the real `expo export --platform web` bundle, which is how this app
ships to Vercel.

It is the same failure `statusMeta` exists for (`order-status.model.ts`), on a
different field, and the reason is the same both times: **the backend owns these
shapes and an app already on a customer's phone cannot be updated to match.**
Every field on `driver` is optional now and every read in `DeliveryPanel` is
guarded. A missing name costs the name and nothing else.

A missing name renders **"Your driver"**, not "Finding a driver" — a driver is
assigned, and walking that back would tell the customer they had lost one.

`test/components/screens.spec.tsx` now mounts the panel three ways (driver
present, no driver yet, driver with no `user`). It previously only ever mounted
the 404 case, so every line inside `DeliveryPanel` — the part that appears
exactly when a driver is assigned — was unreached by any test.

## A coordinate can arrive as a string, and that crashed this screen

The tracking screen met the error boundary again, on the deployed web build.
Reproduced in Chromium against the real `expo export --platform web` bundle, by
serving a driver whose position was what the backend actually sends.

`Driver.currentLatitude` is a **`Decimal` column**, and `Prisma.Decimal`
serialises to a JSON *string* — `JSON.stringify(new Decimal('24.72'))` is
`"24.72"`. So the tracking payload carried `"24.73"` where the type said
`number`. `AppMap.web.tsx` called `.toFixed()` on it, threw inside render, React
unmounted the tree, and the customer got "Something went wrong" on the one
screen that says where their food is — **only once a driver had a position**,
which is exactly when they are watching.

It is the same shape as the `driver.user` crash above and the same lesson:
**the backend owns these shapes, and neither typechecker can see across the
wire.** Three layers now, on purpose:

- **The backend converts at its boundary** (`src/common/geo.ts`). That is the
  real fix.
- **`pointOf` (`util/branchChoice.ts`) coerces**, because it used to require
  `typeof === 'number'` — stricter than it looks. A string read as *no pin at
  all*, so the panel silently showed no distance, no ETA and no marker while the
  driver pinged every thirty seconds. That failure is invisible, which is why it
  outlived the crash on the same data.
- **`AppMap.web` never calls `.toFixed` on a raw value.** An unreadable
  coordinate costs an em dash, never the screen.

Every read of a coordinate goes through `pointOf`. The types admit `number |
string` deliberately: an app already on a customer's phone cannot be updated to
match a server.

**`Order.items` is optional for the same reason.** The Home "Order again" strip
and the Orders list read `.length` off it; a payload without the key threw and
took the tree down before the tracking screen was even reached. `itemCountLabel`
(`util/orderItems.ts`, pure and tested) is how it is read now.

A browser harness drives the real web bundle through seventeen degraded
tracking payloads — missing items, an unknown status, a null address, a driver
with no user, string coordinates, a 404 and a 500 — and asserts none of them
reaches the error boundary. That is what "fixed" means here; a passing unit test
was already true of the bundle that was crashing.

## Tracking starts when the food is ready, not when a driver is picked

The delivery panel used to render only from `DRIVER_ASSIGNED`. The backend opens
the `Delivery` record — drop-off snapshot and all — when the order reaches
**READY**, which is before anyone has been assigned to carry it, so for that
whole window a customer watching this screen saw nothing about their delivery at
all: no destination, no "we're finding a driver", just an order that had
apparently stopped. That window is exactly when people ring the branch.

`HAS_DELIVERY` now starts at `READY`, and the panel names the state it is in:
**"Finding a driver"**, not a driver's name with no position and not an em dash
under "On its way", which reads as a number that failed to load. `awaitingDriver`
is `!tracking.driver` — the one honest test, since the delivery row exists
either way.

The tracking call still 404s before the delivery is opened (a pickup order
legitimately never has one, and the backend's contract suite pins that 404). It
is caught and read as "not dispatched yet", never surfaced as an error.

## The tracking screen is pushed, not just polled

`src/realtime/RealtimeProvider.tsx` holds one authenticated socket for the
signed-in customer; `useOrderUpdates` reloads the order on `order.transitioned`.

The eight-second poll is fine for "preparing" and wrong for the two moments a
customer is actually staring at the screen: the branch accepting the order, and
a driver being assigned. The backend has emitted into a per-customer room
(`ROOMS.customer`) since the realtime layer was built — the admin panel and the
POS were its only clients, and this app polled past it.

Three things to keep:

- **The poll stays**, as the floor, and the hook fires once on every reconnect
  so a status that changed while the socket was down is not stranded.
- **Events are filtered to this order.** A customer with two live orders would
  otherwise refetch the screen they are looking at every time the other moved.
  An event with no `orderId` (an older backend) is treated as relevant — a
  needless refetch is cheaper than a screen that never advances.
- **`useRealtime` deliberately does not throw** without a provider, so a screen
  with no socket still polls rather than going blank. The screen tests mount
  without it.

## Cancelling, and asking for a refund

`features/refund/` is the panel on the order screen, and it offers **one** of
three things — the server decides which, and this app keeps no second copy of
the rule:

- **Cancel order**, while **nothing has been paid**. Money is the gate, not
  time: an unpaid order costs the branch nothing to drop, so it needs nobody's
  approval. This app already shipped a `cancelOrder` API method that **no screen
  called** — the same built-and-inert shape as promotions and opening hours.
- **Ask to cancel this order / Ask for a refund** once money has been captured,
  filing a `RefundRequest` the branch works in the admin panel. Before this, a
  customer past the self-cancel point had no route at all: the API said
  "contact the branch" and the platform recorded nothing.
- **Nothing, quietly.** A "there's nothing left to refund" line under every past
  order is noise, and a screen that nags about refunds is a screen that suggests
  them.

Four things it has to keep saying:

- **A paid order cannot be cancelled from here at all**, however early. Once
  money is captured, cancelling means giving it back, which is the branch's
  decision — so the panel offers the *request*, and the server refuses a direct
  cancel even if this app asked for one.
- **Approved is not paid.** The branch agreeing and the owner sending the money
  are separate acts, often hours apart (the owner issues it in the payment
  gateway's dashboard). An approved request says the refund is **being
  arranged**; only once the server reports `refundIssuedAt` does it say
  **sent**. A customer told the second thing too early checks their statement
  and rings the branch. A `MANUAL_SETTLEMENT` (cash) approval says the branch
  will settle in person rather than implying money has moved.
- **The decision is shown, not just the ask.** An approved, declined or
  withdrawn request stays on screen with the branch's own words on it — a
  customer with no way to learn what was decided is the whole failure this
  replaces.
- **Two clocks, both the server's.** 10 minutes from *placing* to ask the branch
  to cancel; 10 minutes from *delivery* to ask for a refund. The app renders
  `windowClosesAt` and the sentence that comes with it and holds neither number.
  A reason is **required** on both paths — the cancel field's old "(optional)"
  label led straight into a validation error the screen had promised would not
  happen.

`GET /customer/orders/:id/refund-eligibility` is the single read behind all of
it, and both calls **fail soft**: a refund panel that cannot load must never
cost somebody the sight of where their food is.

## The driver marker moves on the news, not on the poll

`useDriverLocation` (`src/realtime/`) subscribes to `driver.location` for the
order on screen. The map used to move only when the tracking screen's
eight-second poll came round, so the marker lagged reality by up to eight
seconds on the one screen somebody watches *because* they want to know where
their food is now.

**The poll stays as the floor** — a phone that loses its socket in a lift still
gets a marker, just a slower one. A pushed position wins over the polled one
because it is strictly newer.

`acceptDriverPing` (pure, tested) decides what to believe, and both its rules
are correctness rather than tidiness:

- **An unlabelled ping is dropped, not trusted** — deliberately the opposite of
  `useOrderUpdates`, which treats an event with no `orderId` as relevant. A
  needless refetch is cheap; a marker in the wrong place is a customer watching
  a stranger drive around on the screen they opened to find their own dinner.
- **Coordinates that are not numbers are dropped.** These are `Decimal` columns
  and a `Decimal` serialises to a JSON *string* — the exact shape that crashed
  this screen inside render once already (see above).

The server decides *when* a customer is told at all: only while the delivery is
`PICKED_UP` or `OUT_FOR_DELIVERY`, the same window in which the driver may ring
them. This app holds no copy of that rule either.

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

## Two different things close a branch

`util/branchOpen.ts`, pure and tested. The backend now enforces a branch's
**opening hours** at placement, on top of `isAcceptingOrders`, and the two are
not interchangeable:

- **`isAcceptingOrders`** is a switch staff flipped. It means "not right now"
  and carries no promise about when that changes — so the app must **not** say
  "opens at 17:00" for it. They may not resume then.
- **`isOpenNow`** is the schedule running on its own, and it knows when the
  branch opens again. That difference is what decides whether a customer waits
  or goes elsewhere.

**An absent `isOpenNow` means no opinion, never closed.** A backend older than
the schedule does not send it, and reading a missing field as shut would close
every branch for anyone whose app had not been updated. The server is what
actually refuses an order; this only decides what the screen says.

`resolveBranch` reads both halves now. It used to consider only the switch, so
a customer was routed to the "nearest open branch" that had actually closed at
23:00 — and found out at the Pay button.

Checkout leads with it, above the form that cannot fix it, the same way the
delivery blockers do — and it is checked **first**, because "Add 15.00 more" is
useless advice to someone whose branch closed an hour ago. The pay button reads
**"Branch closed"** rather than quoting a price the server will refuse.
`branchOpen.message` comes from the server, which knows the opening time and
any holiday note; an older backend sends nothing and the screen simply says
less.

Verified in Chromium against the real web bundle across four branch shapes —
open, closed with an opening time, closed for a holiday, and a backend with no
hours field at all — because "no opinion means open" is the case that would
have shut every branch on the platform.

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

## Release configuration (EAS)

`eas.json` is committed, with `development` / `preview` / `production`
profiles — **do not run `eas build:configure`**, it overwrites them. Each
profile sets `API_BASE_URL`; `app.config.js` injects it, along with
`GOOGLE_MAPS_API_KEY`, which comes from an EAS secret and is never committed.

`cli.appVersionSource` is `remote` and `production` sets `autoIncrement: true`,
so EAS owns the build number. `app.json`'s `version` (`1.0.0`),
`ios.buildNumber` and `android.versionCode` are the seed values for the first
production build; bump `version` by hand for a release, never the build number.

**The icon is a stopgap.** `assets/logo.jpeg` is a 1600 × 384 JPEG, and it was
the icon, the splash, the Android adaptive foreground and the favicon — a
combination that could never have been uploaded, because App Store Connect
rejects a JPEG and rejects any alpha channel. Those four now point at generated
PNGs (`scripts/generate-icons.py`), which clears the *technical* rejection and
nothing else: a 4 : 1 wordmark centred in a square is illegible at icon size.
`assets/README.md` states exactly what artwork is needed to replace it. The
wordmark is still the right thing on the launch and sign-in screens and stays
there.

`ios.supportsTablet` was flipped to `false`. Apple checks iPad screenshots
against it, and none exist; turning it back on means committing to an iPad
layout, not just a config value.

## Deleting an account is anonymisation, and the screen says so

`DeleteAccountScreen`, reached from the last row of Account → Support & legal.
It exists because Apple rejects an app that creates accounts and offers no way
to delete one from inside it (Guideline 5.1.1(v)), and a reviewer looks for it.

The backend does not remove the row — `Order.customerId` is `onDelete: Restrict`
and those orders are the restaurant's sales and VAT records. So the screen
carries **two lists**: what is deleted (name, email, every address and its map
pin, the phone number, which is released so the person can sign up again) and
what the restaurant keeps (the orders, now carrying nobody's name). Do not
collapse those into one reassuring line: "everything is deleted" would be a
false statement made at the exact moment someone is relying on it.

Two presses, and **no typing**. The confirmation is a second deliberate act
rather than a dialog dismissed by reflex, but it does not ask for an English
word — this app ships bilingual to customers in Saudi Arabia, and a
Latin-alphabet shibboleth in front of a destructive action locks out the people
most likely to need help getting through it.

It calls `forgetSession()`, not `signOut()`. Every session is already revoked
server-side by the time the request resolves, so `signOut` would present a dead
refresh token and surface "couldn't sign you out" after something that
succeeded. A **failed** delete clears nothing — signing someone out of an
account that still exists, with no way to tell which happened, is the worse
error, and a screen test holds that line.

## Expo SDK 57, and the New Architecture

Upgraded from SDK 51 (RN 0.74.5) to **SDK 57 / RN 0.86.3 / React 19.2**, because
Google Play has required **API level 36** for new apps and updates since
**31 August 2026**. SDK 51 targets API 34, so no build from it could be
uploaded. This was not optional and it was not a nice-to-have.

**The single biggest thing to know: this app now runs on the New Architecture,
and there is no way back.** RN 0.82 removed the legacy architecture and
hardcoded `newArchEnabled` to true; SDK 55 dropped it from `app.json`
altogether, which is why the key is gone from ours. Every native module in the
app — maps, location, secure store, reanimated — now goes through Fabric and
TurboModules rather than the bridge. **Nothing in this repo can prove that
works.** 218 Node tests, a clean typecheck and a working web bundle are all
still true of an app that crashes on launch on a handset, and the New
Architecture is exactly the kind of change that only shows up there. Treat a
device pass as required before this is trusted, not as a formality.

Four changes worth knowing about:

- **Reanimated 4 sits on `react-native-worklets`.** `babel.config.js` names
  `react-native-worklets/plugin` directly rather than
  `react-native-reanimated/plugin`, which is now a one-line re-export — the day
  that shim is dropped should not be the day every animation silently stops.
  `jest.config.js` needs `resolver: 'react-native-worklets/jest/resolver'`,
  because the worklets `.native` entry installs native bindings at import time
  and throws under jest; without it the official Reanimated mock cannot even be
  imported.
- **`react-native-maps` 1.27 resolves its TurboModule at import time**, so
  importing any screen with a map throws under jest. `test/setup.ts` mocks it
  with a plain view. 1.14 did not do this, which is why the mock arrived with
  the upgrade rather than with the screens.
- **`Animated.SharedValue` is gone** — import `SharedValue` from
  `react-native-reanimated` directly. And `CountUp` needs one cast: Reanimated
  renders a shared value passed as a child of `Animated.Text`, but its own types
  make `DerivedValue<string>` unassignable to `SharedValue<ReactNode>`. The
  runtime contract is unchanged; only the declaration needs the bridge.
- **`moti` warns about RN's deprecated `SafeAreaView`** on every mount. It is
  moti's import, not ours — nothing in `src/` touches it — and it is noise, not
  a defect. Do not "fix" it by patching moti.

`nativewind` stays on **4.2.6**. v5 exists only as a preview, and a preview
dependency has no business in a store build.

## Device testing is now the gate

Nothing in the store-readiness work removes the need for
`eas build --profile preview` on a real iPhone and a real mid-range Android
before anything is submitted. After the SDK 57 upgrade that is doubly true.
Walk a whole order: sign in → browse → cart → checkout → place → track. Watch
in particular for Keychain token persistence, the location permission dialog,
Google Maps rendering, the `baitalhana://` deep link, and the safe-area layout
around the notch — all of them native-module behaviour that changed
architecture underneath this app.
