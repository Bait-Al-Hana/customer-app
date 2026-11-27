# customer-app

Bait Al Hana customer ordering app — **React Native (Expo)**.

Account & OTP login, branches, menu, cart, checkout, online payment, order
tracking, invoices, coupons, loyalty and notifications. It talks only to the
[backend](https://github.com/Bait-Al-Hana/backend) API — it holds no business
rules and never computes a payable amount itself.

> **Current state:** a full customer experience on a shared design system,
> themed to the Bait Al Hana brand. Bottom-tab navigation (Home · Search ·
> Orders · Offers · Account) with the ordering flow pushing above it:
> **Home → Menu → Product (size/add-ons/notes) → Cart (coupon, notes) →
> Checkout → Payment → Order success → Live tracking**, plus Loyalty, Favorites,
> saved Addresses and an Account area. Branches, menu, pricing, orders, payment,
> tracking and addresses are wired to the backend API; content the backend does
> not yet expose to this app (promos, offers, loyalty, ratings) is isolated,
> typed mock data ready to swap for real endpoints. See
> [`docs/customer-ui-ux.md`](./docs/customer-ui-ux.md).
>
> Recent additions: an **English / العربية** language choice with right-to-left
> support, an **add-to-cart flight** animation, and an **installable web PWA**
> (manifest + home-screen icons). See the matching sections in
> [`CLAUDE.md`](./CLAUDE.md).

---

## Quick start

**Requirements:** Node.js 20+, and the Expo tooling (installed via `npx`).

```bash
npm install
npm start          # Expo dev server — open in Expo Go or a simulator
# or: npm run ios / npm run android
```

The app boots into the ordering experience (`App.tsx → RootNavigator`): the OTP
login when signed out, the bottom-tab home when signed in. A living catalogue of
the motion system also exists at `src/demo/MotionDemoScreen.tsx` for design
review. Toggle the OS "reduce motion" setting to see the accessible, motion-free
form of everything.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Expo dev server |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm test` | Pure-logic unit tests (tokens, reduced-motion, order/payment models) |
| `npm run test:components` | React Native component mount tests (jest-expo) |

---

## Architecture

```
src/
  motion/            # The motion system — tokens, hooks, reusable components
    tokens.ts        #   the single source of truth (durations, easings, springs)
    reduced-motion.ts#   accessibility gating (pure)
    MotionProvider   #   resolves reduce-motion once; exposes useMotion()
    transitions.ts   #   screen-transition presets
    components/      #   PressableScale, FadeIn, Stagger, Skeleton, BottomSheet,
                     #   CartBadge, QuantityStepper, Toast, EmptyState, ErrorState
  theme/theme.ts     # visual design tokens — colour, typography, spacing, radius
  components/        # the UI kit — AppText, Button, cards, chips, icons, states…
  screens/           # Home, Search, Menu, Product, Cart, Checkout, Payment,
                     #   OrderSuccess, OrderTracking, Orders, Offers, Loyalty,
                     #   Account, Addresses, Favorites, Phone/Otp
  navigation/        # RootNavigator + bottom-tab MainTabs + custom TabBar
  features/
    order/           # OrderStatusTracker + its pure, tested model
    payment/         # PaymentStateView + its pure, tested model
    refund/          # RefundRequestPanel + its pure, tested model
  data/              # isolated frontend mock data (promos, offers, loyalty,
                     #   ratings) + menu-shaping helpers — swappable for real APIs
  favorites/         # in-memory favourites provider
  cart/ auth/ api/   # cart reducer, auth session, typed API client
  types/backend.ts   # backend enums, mirrored (kept in sync with the API)
docs/
  customer-ui-ux.md         # the customer-app UI/UX design system
  motion-design-system.md   # the shared motion system
```

### The "no crashes" approach

Correctness-critical logic (token math, reduced-motion gating, the
order-status and payment-state mappings) lives in **pure, framework-free
TypeScript** that is exhaustively unit-tested and imports nothing from React
Native. The React Native components are kept thin, are fully typechecked, and
are mount-tested to prove every state renders without throwing. See
[`docs/motion-design-system.md` §10](./docs/motion-design-system.md).

### Cancelling, and asking for a refund

`features/refund/` is the panel on the order screen. It offers **one** of three
things, and the server decides which:

- **Cancel order**, while **nothing has been paid**. Money is the gate, not
  time: an unpaid order costs the branch nothing to drop, so it needs nobody's
  approval. This app already had a `cancelOrder` API method and **no screen
  called it** — the feature existed and was unreachable.
- **Ask to cancel this order / Ask for a refund**, once it does not. That files
  a `RefundRequest` the branch works through the admin panel. Before it, a
  customer past that point had no route at all: the API said "contact the
  branch" and nothing was recorded.
- **Nothing**, and quietly — a "there's nothing left to refund" line under every
  past order is noise, and a screen that nags about refunds is a screen that
  suggests them.

Three rules it keeps:

1. **The server decides what is offered.** `GET /customer/orders/:id/
   refund-eligibility` returns whether a self-cancel is still possible, whether
   a request can be raised, what it would be, and a sentence to show. This app
   renders that sentence; it keeps no second copy of the rule, which is how an
   app ends up offering a button the server refuses.
2. **A decision is shown, not just the ask.** The whole failure this replaces is
   a customer with no way to learn what was decided, so an approved, declined or
   withdrawn request stays on the screen with the branch's own words on it.
3. **Approved is not paid, and the panel must never blur the two.** The branch
   agreeing and the money being sent are separate acts, often hours apart: the
   branch decides, and the owner then issues the refund in the payment gateway's
   dashboard. So an approved request says the refund is **being arranged**, and
   only once the server reports `refundIssuedAt` does it say it has been **sent**
   (with the few-days caveat). A customer told the second thing too early checks
   their statement and rings the branch. Where the branch approved a *cash*
   order there is no online refund at all, and the panel says the branch will
   settle it in person rather than implying money has moved.

4. **Cancelling and asking are on different clocks.** 10 minutes from *placing*
   to ask the branch to cancel; 10 minutes from *delivery* to ask for a refund.
   Both are the server's rule — the app renders `windowClosesAt` and the sentence
   that comes with it, and holds no copy of either number.

5. **A paid order cannot be cancelled from here at all**, however early. Once
   money is captured, cancelling means giving it back, which is the branch's
   decision — so the panel offers the request instead, and the server refuses a
   direct cancel even if this app asked for one. A reason is required on both
   paths; the "(optional)" label the cancel field used to carry would have led
   straight into a validation error the screen had promised wouldn't happen.

Both calls fail soft: a refund panel that cannot load must never cost somebody
the sight of where their food is.

### The driver marker moves on the news, not on the poll

`useDriverLocation` (`src/realtime/`) subscribes to `driver.location` for the
order on screen. The map used to move only when the screen's eight-second poll
came round — so the marker lagged reality by up to eight seconds on the one
screen somebody watches *because* they want to know where their food is now.

**The poll stays as the floor.** A phone that loses its socket in a lift still
gets a marker, just a slower one; the push only removes the wait. A pushed
position wins over the polled one when both exist, because it is strictly newer.

`acceptDriverPing` (pure, tested) decides what to believe, and its two rules are
correctness rather than tidiness:

- **An unlabelled ping is dropped, not trusted** — the opposite of what
  `useOrderUpdates` does with an unlabelled event, and deliberately so. A
  needless refetch is cheap; a marker in the wrong place is a customer watching
  a stranger drive around on the screen they opened to find their own dinner.
- **Coordinates that are not numbers are dropped.** These are `Decimal` columns
  and a `Decimal` serialises to a JSON *string* — the exact shape that once
  crashed this screen inside render.

The server decides *when* a customer is told at all: only while the delivery is
`PICKED_UP` or `OUT_FOR_DELIVERY`, the same window in which the driver may ring
them. This app holds no copy of that rule.

### Two rules this app inherits from the backend

1. **An animation is never proof of payment.** `PaymentStateView` shows success
   only for a server-reported `PAID`; a client returning from the gateway always
   shows "processing" and waits for the backend.
2. **Fulfilment and payment are separate.** The order tracker reflects
   `order.status`; refund states are shown as annotations on a delivered order,
   never derived from one another.

---

## Configuration

The API base URL comes from `app.json → expo.extra.apiBaseUrl` per environment.
**No secrets live in this repo** — the app holds no gateway credentials; all
payment secrets stay on the backend.

---

## Stack

Expo SDK 51 · React Native 0.74 · TypeScript · React Native Reanimated 3
(UI-thread animation) · react-native-svg · React Navigation (native-stack +
bottom-tabs) · Jest (ts-jest + jest-expo).
