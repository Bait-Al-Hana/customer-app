# customer-app — project context

Expo React Native customer ordering app.

## Client-demo decisions (locked)

**Read `../backend/DEMO_DECISIONS.md` before touching payments, SMS, push or
maps.** Tap Payments, real SMS and real push are mocked until the client
approves; Google Maps keys are needed for delivery tracking; there is **no
invoice screen** — the restaurant issues its own ZATCA invoice separately.

## Money rules

The app **displays** totals; it never computes a payable amount. The cart's
`estimatedTotalMinor` is a local preview only — the checkout shows the server
quote, and placement prices everything again server-side.

**`POST /pricing/quote` is authenticated.** Calling it without the token
returns 401, which surfaces as "Couldn't price your order" and blocks checkout
outright. The whole shopping flow is behind sign-in, so the token is always
available.

## Coupons

Checkout prices through **`POST /customer/orders/quote`**, not the anonymous
pricing endpoint: a coupon is evaluated against *this* customer — their past
usage and eligibility — so only the authenticated quote can apply one. An
unusable code is **not** an error; the base price comes back with
`couponError` set, so the totals never disappear while someone fixes a typo.

Only a code the server accepted is sent on placement, where it is validated
again. The app never decides a discount.

## Reorder

`useReorder` + the pure `cartFromOrder` rebuild the cart from a past order.
An order snapshots what was sold and its `productId` is **nulled when the
product is deleted** — a catalogue change must never rewrite history — so a
line can genuinely have nothing to reorder. Those lines are dropped and
**named to the customer**, never silently substituted and never guessed at by
matching the snapshotted name. The same applies to a deleted add-on:
reordering without it would change what was asked for.

## Home screen

`/customer/config` is one public call carrying banners, the owner's homepage
sections, promotions and feature flags. The banners render on the branches
screen and honour their section's `enabled` flag and title — turning the
section off in the admin app has to actually turn it off.

**Only banners are rendered.** The other section kinds (FEATURED,
BESTSELLERS, CATEGORIES…) name a section but `/customer/config` carries no
products for them, so rendering them would mean inventing their contents.
They wait for the backend to serve them.

The config load never blocks the branch list: a failed banner fetch means no
banners, not a customer who cannot order.

## Menu availability

**`MenuProduct.isAvailable` must be honoured wherever a cart is built.** The
branch menu returns the whole catalogue with a flag (a dish that vanishes
reads as discontinued), and the backend only rejects an unavailable item at
*placement* — so ignoring the flag means a customer builds a whole order and is
refused at checkout. Sold-out items stay listed, dimmed and marked, with the
add button replaced.

## Order numbers and the reference

`orderNumber` counts **per branch from 1000000**, so it repeats across branches
and cannot identify one order. `referenceId` — globally unique, 12 digits — is
what the customer quotes when they ring about an order, and it is shown on the
tracking screen (selectable, so it can be copied) and under each order in the
list.

## White screens

`App.tsx` wraps everything in `<ErrorBoundary>`, **outside every provider** —
React unmounts the whole tree on an uncaught render error, and on a release
build that is a blank view escapable only by force-quitting. The fallback shows
no stack trace: it says the order is safe and offers Try again. Colours are
hard-coded because the theme provider is one of the things that can throw.

## Screens are mounted in tests

`test/components/screens.spec.tsx` mounts every screen against a stubbed API.
The pure tests cover the arithmetic and the backend's contract suites cover the
requests; neither covers a screen *rendering*, which is where a blank page comes
from. The fixtures are deliberately awkward — a null district, a sold-out dish,
an order with no delivery, an order with no reference, a rejected coupon, empty
lists — because a screen that only renders against tidy data is not actually
known to work. Add a case here when a screen starts reading a new nullable
field.

## Pure logic is tested

Cart maths (`cart/cart.ts`), menu search (`util/menu-search.ts`), home config
(`features/home/home-config.ts`), money and VAT formatting (`util/money.ts`)
are all pure and unit-tested. Keep new logic that way rather than embedding it
in a screen.
