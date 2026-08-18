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
