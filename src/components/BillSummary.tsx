import React from 'react';
import { View } from 'react-native';

import { BreakdownRow, PriceQuote } from '../api/types';
import { useTheme } from '../theme/theme';
import { formatSar } from '../util/money';
import { AppText } from './AppText';
import { Divider } from './ui';

/**
 * The bill, itemised, exactly as the backend built it.
 *
 * ## Where the rows come from
 *
 * The backend builds this list once and snapshots it onto the order, so the
 * customer's summary, the branch's order view and the owner's order view show
 * the same lines. Reassembling it here from the quote's columns is how those
 * drift apart, and the first person to notice is a customer reading a total
 * back over the phone. It also means any fee the owner adds — a platform fee, a
 * service charge — appears here by its own name with no change to this app.
 *
 * ## Two things it gets right that a naive list would not
 *
 * **A saving is a strikethrough, not a subtraction.** "~~65.70~~ 32.80" reads
 * as a good deal on sight; "Item total 65.70 / Discount −32.90" is arithmetic
 * the customer has to do first. The total saved is stated once at the foot.
 *
 * **VAT does not add to the total.** Prices are VAT-inclusive, so the VAT line
 * says how much of the amount *is* tax. Rows the backend marks `included` are
 * rendered muted and labelled, because a customer adding the column up must not
 * arrive at a number 15% higher than the one they are about to pay.
 */
export function BillSummary({
  quote,
  rows,
  couponLabel,
}: {
  quote: PriceQuote;
  rows?: BreakdownRow[];
  couponLabel?: string | null;
}): React.JSX.Element {
  const theme = useTheme();
  const list = rows && rows.length > 0 ? rows : fallbackRows(quote);
  const savedMinor = quote.discountMinor;

  return (
    <View>
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingHorizontal: 16,
          paddingVertical: 8,
        }}
      >
        {list.map((row, index) => (
          <Row
            key={`${row.kind}-${index}`}
            row={row}
            couponLabel={row.kind === 'ITEMS' ? couponLabel : null}
          />
        ))}
      </View>

      {/* Stated once, plainly, under the bill — the number the customer wants
          to remember, kept out of the column they might try to add up. */}
      {savedMinor > 0 ? (
        <View
          style={{
            marginTop: -8,
            paddingTop: 16,
            paddingBottom: 12,
            paddingHorizontal: 16,
            borderBottomLeftRadius: theme.radius.lg,
            borderBottomRightRadius: theme.radius.lg,
            backgroundColor: theme.colors.successSoft,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <AppText style={{ fontSize: 16 }}>🎉</AppText>
          <AppText variant="bodySmall" weight="700" style={{ color: theme.colors.success }}>
            You saved {formatSar(savedMinor)} on this order
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

function Row({
  row,
  couponLabel,
}: {
  row: BreakdownRow;
  couponLabel?: string | null;
}): React.JSX.Element {
  const isTotal = row.kind === 'TOTAL';

  return (
    <View>
      {isTotal ? <Divider style={{ marginVertical: 8 }} /> : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          paddingVertical: isTotal ? 4 : 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <AppText
            variant={isTotal ? 'h3' : 'body'}
            color={row.included ? 'textMuted' : 'text'}
            weight={isTotal ? '800' : '400'}
          >
            {row.label}
          </AppText>
          {/* The offer's name goes on its own line, not inline after the label.
              Inline it wrapped mid-phrase on any name longer than a word —
              "Items Twenty off ·" / "HANA20" — which reads as a layout fault on
              the row that is meant to explain the saving. */}
          {couponLabel ? (
            <AppText variant="caption" color="success" weight="700" style={{ marginTop: 2 }}>
              {couponLabel}
            </AppText>
          ) : null}
          {row.detail ? (
            <AppText variant="caption" color="textMuted" style={{ marginTop: 2 }}>
              {row.detail}
            </AppText>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          {/* The original, struck through, immediately before the new price —
              the two have to sit together or the saving is not visible. */}
          {typeof row.strikethroughMinor === 'number' ? (
            <AppText
              variant="bodySmall"
              color="textMuted"
              style={{ textDecorationLine: 'line-through' }}
            >
              {formatSar(row.strikethroughMinor)}
            </AppText>
          ) : null}
          <AppText
            variant={isTotal ? 'h3' : 'body'}
            color={row.included ? 'textMuted' : 'text'}
            weight={isTotal ? '800' : '600'}
            style={{ fontVariantNumeric: 'tabular-nums' } as never}
          >
            {row.negative ? '− ' : ''}
            {formatSar(row.amountMinor)}
          </AppText>
        </View>
      </View>
    </View>
  );
}

/**
 * The pre-breakdown fallback, for a backend that does not send rows yet.
 *
 * Labels VAT "included" rather than repeating the mistake of listing it as
 * though it added on top of the rows above it.
 */
function fallbackRows(quote: PriceQuote): BreakdownRow[] {
  const rows: BreakdownRow[] = [
    {
      kind: 'ITEMS',
      label: 'Item total',
      detail: null,
      amountMinor: quote.subtotalMinor - quote.discountMinor,
      ...(quote.discountMinor > 0 ? { strikethroughMinor: quote.subtotalMinor } : {}),
      included: false,
      negative: false,
    },
  ];

  if (quote.deliveryFeeMinor > 0) {
    rows.push({
      kind: 'DELIVERY_BASE',
      label: 'Delivery fee',
      detail: null,
      amountMinor: quote.deliveryFeeMinor,
      included: false,
      negative: false,
    });
  }

  rows.push({
    kind: 'VAT',
    label: 'VAT',
    detail: 'Included in the amount above',
    amountMinor: quote.vatMinor,
    included: true,
    negative: false,
  });

  rows.push({
    kind: 'TOTAL',
    label: 'To pay',
    detail: null,
    amountMinor: quote.totalMinor,
    included: false,
    negative: false,
  });

  return rows;
}
