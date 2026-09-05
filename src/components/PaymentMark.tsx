import React from 'react';
import { Image, ImageSourcePropType, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { PAYMENT_METHOD, PaymentMethod } from '../types/backend';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

/**
 * The mark beside a payment method at checkout.
 *
 * ## Why this is not an emoji
 *
 * Each method used to render a single emoji in a grey box: 💳, 🏧, an Apple
 * glyph and 💵. Two of those failed outright — the Apple glyph is a private-use
 * character that exists only on Apple platforms, so on Android and on the web
 * build it rendered as an **empty box**, and 🏧 (an ATM) is not mada by any
 * reading. A payment method a customer cannot recognise at a glance is one they
 * hesitate over on the last screen before paying.
 *
 * ## Official artwork, and what happens until it arrives
 *
 * Apple Pay and mada are trademarks with their own brand guidelines: Apple Pay
 * must use the Apple Pay Mark supplied by Apple, and the mada wordmark comes
 * from Saudi Payments / the acquirer. **Neither is redrawn here** — inventing a
 * facsimile of somebody's trademark is the kind of thing this codebase does not
 * do with payment details either.
 *
 * So `ART` is the slot for the real files. Drop `apple-pay.png` and `mada.png`
 * (and any card-scheme marks) into `assets/payment/`, add the `require` here,
 * and every checkout picks them up with no other change. Until then each method
 * gets a clean typographic chip in its own colours, which is both honest about
 * what we have and legible on every platform.
 *
 * Cash and card are ours to draw, so they are drawn — a note and a card, in the
 * same 2px line family as the rest of the icon set.
 */

/**
 * Official artwork, keyed by method. Empty until the licensed files are added
 * to `assets/payment/` — see the note above. Metro resolves `require` at build
 * time, so an entry for a file that does not exist fails the bundle; add the
 * file and the line together.
 */
const ART: Partial<Record<PaymentMethod, ImageSourcePropType>> = {};

export function PaymentMark({
  method,
  size = 40,
}: {
  method: PaymentMethod;
  size?: number;
}): React.JSX.Element {
  const theme = useTheme();
  const art = ART[method];

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: theme.radius.md,
        backgroundColor: chipBackground(method, theme.colors.surfaceAlt),
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {art ? (
        // `contain` so a wide wordmark is never cropped — a clipped trademark
        // is worse than no trademark.
        <Image source={art} resizeMode="contain" style={{ width: size - 8, height: size - 12 }} />
      ) : (
        <Fallback method={method} size={size} />
      )}
    </View>
  );
}

/** Apple Pay's mark sits on black; everything else on the app's own surface. */
function chipBackground(method: PaymentMethod, surfaceAlt: string): string {
  return method === PAYMENT_METHOD.APPLE_PAY ? '#000000' : surfaceAlt;
}

function Fallback({ method, size }: { method: PaymentMethod; size: number }): React.JSX.Element {
  const theme = useTheme();

  switch (method) {
    case PAYMENT_METHOD.APPLE_PAY:
      // The words, not the Apple glyph: naming the method is what identifies
      // it, and the glyph is the part we are not entitled to redraw.
      return <Word text="Pay" color="#FFFFFF" size={size} />;
    case PAYMENT_METHOD.MADA:
      // mada sets its wordmark lowercase; the colour is the app's own, not a
      // guess at the brand's.
      return <Word text="mada" color={theme.colors.text} size={size} />;
    case PAYMENT_METHOD.GOOGLE_PAY:
      return <Word text="G Pay" color={theme.colors.text} size={size} />;
    case PAYMENT_METHOD.CASH_ON_DELIVERY:
      return <CashGlyph color={theme.colors.text} size={size} />;
    default:
      return <CardGlyph color={theme.colors.text} size={size} />;
  }
}

function Word({ text, color, size }: { text: string; color: string; size: number }): React.JSX.Element {
  return (
    <AppText
      weight="800"
      numberOfLines={1}
      // Sized off the chip so the chip can shrink (the pay bar) without the
      // word overflowing it.
      style={{ color, fontSize: Math.max(10, Math.round(size * 0.3)), letterSpacing: -0.3 }}
    >
      {text}
    </AppText>
  );
}

function CardGlyph({ color, size }: { color: string; size: number }): React.JSX.Element {
  const s = Math.round(size * 0.55);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Rect x={2} y={5} width={20} height={14} rx={3} stroke={color} strokeWidth={2} />
      <Path d="M2 10h20" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function CashGlyph({ color, size }: { color: string; size: number }): React.JSX.Element {
  const s = Math.round(size * 0.55);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Rect x={2} y={6} width={20} height={12} rx={2} stroke={color} strokeWidth={2} />
      <Path
        d="M12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z"
        stroke={color}
        strokeWidth={2}
      />
    </Svg>
  );
}
