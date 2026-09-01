# Customer App — UI/UX Design System

The design language and screen architecture for the Bait Al Hana **customer
app**. It sits on top of, and never replaces, the shared
[Motion & Animation Design System](./motion-design-system.md) — motion tokens,
the `useMotion()` runtime and the reduced-motion gating are defined there and
reused verbatim here. This document covers the *visual* system (colour,
typography, spacing, components) and every screen.

> **Principle:** the app **displays** food and totals; it never computes a
> payable amount and holds no business rules. Prices, VAT, delivery fees,
> coupons and payment outcomes are always the backend's. The UI shows the
> server's numbers and, where it must preview locally (the cart estimate), says
> so plainly.

---

## 1. Design principles

- **Find food fast.** Open → find → customise → add → checkout → track, with the
  fewest taps. The home screen is a discovery surface, not a form.
- **Hierarchy over decoration.** Size, weight and colour carry importance;
  nothing is big or animated without a reason.
- **One system, every screen.** The same tokens, components, spacing and motion
  everywhere — no screen invents its own language.
- **Trustworthy about money.** Estimates are labelled as estimates; the server
  total is always the one shown before payment. "An animation is never proof of
  payment" (inherited from the backend).
- **Accessible by construction.** Colour is never the only cue, touch targets
  are generous, motion is optional, and every control is labelled.

---

## 2. Colour system

Defined once in [`src/theme/theme.ts`](../src/theme/theme.ts), sampled from the
logo, with full light **and** dark variants.

| Role | Light | Purpose |
| --- | --- | --- |
| `primary` | `#E5178B` | Logo magenta — CTAs, active states, cart. |
| `secondary` | `#F47C20` | Shawarma/citrus orange — secondary accents. |
| `accent` | `#2E63A6` | Tagline blue — links/quiet actions. |
| `background` / `surface` | `#FCF7FA` / `#FFFFFF` | Page and card. |
| `surfaceAlt` / `surfaceSunken` | tints | Chips, inputs, icon wells. |
| `text` / `textMuted` | `#1E1A1C` / `#6E6167` | Primary and secondary text. |
| `border` | `#EBDCE5` | Hairlines and card edges. |
| `success` / `warning` / `danger` | greens/ambers/reds | Status. |
| `rating` | `#F5A623` | Star amber. |
| `*Soft` | low-alpha | Tinted backgrounds for selected/tinted states. |

Every colour has a dark-mode counterpart; the app follows the OS setting via
`useColorScheme()`. Never hard-code a hex in a screen — read a token.

---

## 3. Typography

One ramp, in `theme.type`, applied through the **`<AppText variant>`** component
so screens never declare a `fontSize`.

| Variant | Size / weight | Use |
| --- | --- | --- |
| `display` | 32 / 800 | Rare hero numbers. |
| `h1` | 26 / 800 | Screen/detail titles. |
| `h2` | 21 / 800 | Section titles, header title. |
| `h3` | 17 / 700 | Card titles, list rows. |
| `body` / `bodySmall` | 15 / 13 | Copy. |
| `caption` | 12 | Metadata, hints. |
| `overline` | 11, tracked | Section eyebrows. |
| `button` | 16 / 700 | Button labels. |
| `price` | 16 / 800 | Money. |

Nothing drops below 12pt. `AppText` also applies RTL writing direction from
`I18nManager`, the groundwork for full Arabic support.

---

## 4. Spacing & radius

- **Spacing:** a 4-pt scale via `theme.spacing(n)` (`spacing(4)` = 16). Screen
  gutters are 16; card padding 16; rail gaps 12.
- **Radius:** `sm 8 · md 12 · lg 16 · xl 24 · pill 999`. Cards use `lg`, chips
  and CTAs use `pill`, hero surfaces use `xl`.
- **Elevation:** `theme.shadow(1|2|3)` for consistent soft shadows (Android
  `elevation` included).

---

## 5. Component library

All in [`src/components/`](../src/components), exported from its barrel
(`src/components/index.ts`).

| Component | Purpose |
| --- | --- |
| `AppText` | The one text primitive (variant + colour token). |
| `Button` / `PrimaryButton` | CTA with `primary`/`secondary`/`ghost`/`danger` variants + busy state. |
| `IconButton` | Circular glyph/SVG button. |
| `Card` / `Divider` | Surface and hairline. |
| `TextField` | Labelled input with focus ring, optional multiline. |
| `Chip` | Selectable pill (categories, filters, searches). |
| `Badge` / `StatusBadge` | Tone-coloured status/label pill. |
| `SearchBar` | Live input or tap-through button mode. |
| `SectionHeader` | Title + optional "See all". |
| `PriceRow` | Label/value row for price breakdowns. |
| `Rating` | Star + value + count. |
| `FoodCard` / `FoodListItem` | Vertical rail card / horizontal menu row. |
| `CategoryCard` | Category tile for the category rail. |
| `PromoBanner` | Gradient hero promo. |
| `OrderCard` | Order summary with track/reorder. |
| `AddressCard` / `PaymentMethodCard` | Selectable rows for checkout. |
| `AddButton` | "+" with press spring and a check flash. |
| `FavoriteButton` | Heart toggle with a pop on fill. |
| `SuccessCheck` | One-shot animated success mark. |
| `GradientSurface` | SVG gradient surface (no native dependency). |
| `FoodImage` | Image with a branded food-glyph placeholder. |
| `FloatingCart` | Persistent "view cart" bar above the tab bar. |
| Icons (`icons.tsx`) | One 24×24 / 2px line-icon family. |

Reused from the motion system: `PressableScale`, `FadeIn`, `Stagger`,
`Skeleton`, `BottomSheet`, `QuantityStepper`, `CartBadge`, `Toast`,
`EmptyState`, `ErrorState`, and the hero `OrderStatusTracker` /
`PaymentStateView`.

---

## 6. Navigation

Two graphs, switched by auth state
([`src/navigation`](../src/navigation)):

- **Signed out:** `Phone → Otp` (OTP login).
- **Signed in:** a **bottom tab bar** (`Home · Search · Orders · Offers ·
  Account`) with a custom, brand-styled `TabBar` (a single indicator pill that
  springs to the active tab; icons fill on focus). All task flows push **above**
  the tabs as focused full-screen steps:

  `Home → Menu → Product → Cart → Checkout → PaymentProcessing → OrderSuccess →
  OrderTracking`, plus `Addresses`, `AddAddress`, `Favorites`, `Loyalty`.

The **cart** is always one tap away: the `FloatingCart` bar appears above the
tab bar whenever the cart has items.

---

## 7. Screens

| Screen | What it does |
| --- | --- |
| **Home** | Location header, search entry, promo carousel, branch selector, categories, Popular / Recommended rails, Special offers, Order again. Content is driven by the real branches + menu APIs. |
| **Search** | Live client-side filtering of the branch menu; recent + popular searches, category shortcuts, results, no-results state. |
| **Menu** | Sticky category chips, grouped food list, tap-through to Product. |
| **Product** | Hero image, rating, size/variant, add-on modifier groups (min/max enforced), special instructions, sticky quantity + "Add to cart · SAR XX". |
| **Cart** | Item rows with images and customisations, coupon entry, kitchen notes, an estimate summary (delivery/VAT shown as "calculated at checkout"). |
| **Checkout** | Pickup/delivery (gated by branch), address selection, live server quote, payment-method cards, place order. |
| **Payment** | `PaymentStateView` driven by the **server** status; processing → success/failed with retry. |
| **Order success** | Animated success mark, order number, track/home. |
| **Order tracking** | `OrderStatusTracker` timeline, driver + ETA + live map panel while on the way, items summary, polling. |
| **Orders** | Active / Past segments, status badges, track and reorder. |
| **Offers** | Gradient offer cards with codes, expiry, apply-to-cart. |
| **Loyalty** | Points hero, animated progress to next reward, redeemable rewards, history. |
| **Account** | Profile summary and grouped settings (orders, favorites, rewards, addresses, support, logout). |
| **Addresses / Add address** | Manage saved addresses; add with a map pin. |
| **Favorites** | Saved items, add-to-cart, remove. |

---

## 8. Frontend data & backend boundary

The app talks to the real backend for everything it can: branches, menu,
pricing quote, order placement, orders, delivery tracking, payment, addresses
(`src/api`). Where the backend does not yet serve something to the customer app,
a clearly-isolated, typed **mock** stands in so the screen is fully designed and
demoable, and can later be swapped for a real endpoint **without any screen
changing**:

| Placeholder (`src/data/…`) | Why | Replace with |
| --- | --- | --- |
| `content.ts` (promos, offers, popular searches) | No customer content API. | A content/CMS endpoint. |
| `loyalty.ts` | No customer loyalty read endpoint wired here. | `GET /customer/loyalty`. |
| `ratings.ts` | No product ratings exposed. | Real ratings on the menu. |
| `menu.ts` (popular/recommended) | Derived from the real menu deterministically. | A "popular products" endpoint if added. |

**Two known backend gaps** (surfaced here rather than papered over):

1. **Product variants (sizes)** are shown and priced locally, but the
   `OrderItemInput` the backend accepts is `productId + quantity + addonIds` —
   there is no `variantId`, so a size choice is **not** sent; the server prices
   its default. Add-ons/modifiers **are** fully wired end-to-end. The checkout
   server quote is always authoritative.
2. **Per-item special instructions** have no backend field, so they are folded
   into the order-level `customerNotes` the backend does accept, tagged with the
   product name.

---

## 9. Animation

Inherited wholesale from the [motion system](./motion-design-system.md). New
usage in this app:

- **Add to cart:** `AddButton` springs and flashes a check; the `CartBadge` and
  `FloatingCart` pop/spring in — all at once, never blocking.
- **Tab bar:** one indicator pill springs to the active tab.
- **Loyalty progress** and **success mark** animate once on mount.
- **Rails and lists** use `Stagger`/`FadeIn` on first paint only; `Skeleton`
  for every loading state (never a bare spinner).

Everything collapses to instant/crossfade under the OS reduce-motion setting via
the shared `useMotion()` gate — no screen branches on it.

---

## 10. Loading, empty & error states

- **Loading:** shape-matched `Skeleton`s on Home, Menu, Search, Orders,
  Addresses, Checkout, Tracking.
- **Empty:** `EmptyState` for empty cart, no orders (per tab), no favorites, no
  addresses, no search results — each with copy and a next action.
- **Error:** `ErrorState` with a Retry that re-runs the fetch; raw technical
  errors are never shown. Data fetches that are non-critical (e.g. tracking,
  order-again) fail soft.

---

## 11. Responsive & accessibility

- Layouts use flex and relative widths; images use `cover` with fixed heights;
  rails scroll horizontally, so nothing overflows on small screens. Sticky CTAs
  respect the bottom safe-area inset.
- Touch targets are ≥ 40pt; colour is paired with icon/shape/text everywhere;
  every control has an `accessibilityRole`/`accessibilityLabel`; reduced motion
  is honoured; text uses the readable ramp.
- `AppText` applies RTL writing direction — the groundwork for Arabic, which the
  backend already carries (`nameAr` on branches/products/categories) for a later
  localisation pass.

---

## 12. Testing

- **Pure logic** (cart reducer incl. variants, money, order/payment models,
  motion tokens) is unit-tested — `npm test`.
- **Components** mount-test every primitive and the new card library to prove
  each renders without throwing — `npm run test:components`.
- **Types** — `npm run typecheck`; **lint** — `npm run lint`.
