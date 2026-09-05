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
 * ## Official artwork
 *
 * Apple Pay and mada are trademarks with their own brand guidelines: Apple Pay
 * must use the Apple Pay Mark supplied by Apple, and the mada wordmark comes
 * from Saudi Payments / the acquirer. **Neither is redrawn here** — inventing a
 * facsimile of somebody's trademark is the kind of thing this codebase does not
 * do with payment details either. The owner supplied both, and they live in
 * `assets/payment/`, cropped to the mark so the chip is not letterboxing a
 * field of the source image's own background.
 *
 * A method with no artwork still renders: `Fallback` gives it a legible
 * typographic chip rather than a hole. Add a card-scheme mark the same way —
 * the file, and one line in `ART`.
 *
 * Cash and card are ours to draw, so they are drawn — a note and a card, in the
 * same 2px line family as the rest of the icon set.
 */

/**
 * The official artwork, keyed by method. Supplied by the owner and cropped to
 * the mark itself, so the chip does not letterbox a wordmark inside a field of
 * its own background.
 *
 * Metro resolves `require` at build time, so an entry for a file that does not
 * exist fails the bundle: add the file and the line together. A method with no
 * entry falls through to `Fallback` below and still renders.
 */
const ART: Partial<Record<PaymentMethod, ImageSourcePropType>> = {
  [PAYMENT_METHOD.APPLE_PAY]: require('../../assets/payment/apple-pay.png'),
  [PAYMENT_METHOD.MADA]: require('../../assets/payment/mada.png'),
};

/**
 * A wordmark is wide; a 40pt square would render it about 14pt tall and
 * illegible. Methods carrying real artwork get a landscape chip in the
 * proportion the marks actually are, and the drawn glyphs keep the square.
 */
const MARK_ASPECT = 1.5;

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
        width: art ? Math.round(size * MARK_ASPECT) : size,
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
        // `contain`, always: a clipped trademark is worse than a small one, and
        // these marks are supplied at their own proportions.
        <Image
          source={art}
          resizeMode="contain"
          // Near-flush inside the chip. `contain` already keeps the whole mark,
          // and every point of padding here is a point the wordmark shrinks by
          // — mada is the wider of the two and loses most.
          style={{ width: Math.round(size * MARK_ASPECT) - 6, height: size - 8 }}
        />
      ) : (
        <Fallback method={method} size={size} />
      )}
    </View>
  );
}

/**
 * The ground each mark is drawn for. Apple Pay's is white-on-black and mada's
 * is drawn for white; putting either on the app's cream surface is the way a
 * supplied mark ends up looking like a mistake.
 */
function chipBackground(method: PaymentMethod, surfaceAlt: string): string {
  if (method === PAYMENT_METHOD.APPLE_PAY) {
    return '#000000';
  }
  if (method === PAYMENT_METHOD.MADA) {
    return '#FFFFFF';
  }
  return surfaceAlt;
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
