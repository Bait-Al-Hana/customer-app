import React from 'react';
import { View } from 'react-native';

import { BreakdownRow, PriceQuote } from '../api/types';
import { formatSar } from '../util/money';
import { AppText } from './AppText';
import { PriceRow } from './primitives';
import { Divider } from './ui';

/**
 * The itemised order total, as the backend built it.
 *
 * ## Why the rows come from the server
 *
 * The backend builds this list once and snapshots it onto the order, so the
 * customer's summary, the branch's order view and the owner's order view show
 * the same lines. Reassembling it here from the quote's columns is how those
 * three drift apart — and the first person to notice is a customer reading a
 * total back over the phone.
 *
 * It also means a row the backend starts sending — a new charge, a promotion —
 * appears here with no change to this app.
 *
 * ## The VAT trap
 *
 * Prices are VAT-inclusive: the VAT line says how much of the total *is* tax,
 * it does not add to it. Rows the backend marks `included` are rendered set
 * apart and labelled, so nobody reading down the list adds them in.
 *
 * Falls back to the quote's own columns when the backend has not been
 * deployed yet, so checkout never shows an empty summary.
 */
export function OrderSummaryRows({
  quote,
  rows,
  couponLabel,
}: {
  quote: PriceQuote;
  rows?: BreakdownRow[];
  couponLabel?: string | null;
}): React.JSX.Element {
  const list = rows && rows.length > 0 ? rows : fallbackRows(quote, couponLabel);

  return (
    <View>
      {list.map((row, index) =>
        row.kind === 'TOTAL' ? (
          <View key={`${row.kind}-${index}`}>
            <Divider style={{ marginVertical: 6 }} />
            <PriceRow label={row.label} value={formatSar(row.amountMinor)} emphasis />
          </View>
        ) : (
          <View key={`${row.kind}-${index}`}>
            <PriceRow
              label={couponLabel && row.kind === 'DISCOUNT' ? `${row.label} (${couponLabel})` : row.label}
              value={`${row.negative ? '- ' : ''}${formatSar(row.amountMinor)}`}
              tone={row.negative ? 'discount' : 'default'}
            />
            {row.detail ? (
              <AppText
                variant="caption"
                color="textMuted"
                style={{ marginTop: -6, marginBottom: 8 }}
              >
                {row.detail}
              </AppText>
            ) : null}
          </View>
        ),
      )}
    </View>
  );
}

/**
 * The pre-breakdown fallback.
 *
 * Labels VAT "included" rather than repeating the mistake of listing it as
 * though it added on top of the rows above it.
 */
function fallbackRows(quote: PriceQuote, couponLabel?: string | null): BreakdownRow[] {
  const rows: BreakdownRow[] = [
    {
      kind: 'ITEMS',
      label: 'Subtotal',
      detail: null,
      amountMinor: quote.subtotalMinor,
      included: false,
      negative: false,
    },
  ];

  if (quote.discountMinor > 0) {
    rows.push({
      kind: 'DISCOUNT',
      label: couponLabel ? `Discount (${couponLabel})` : 'Discount',
      detail: null,
      amountMinor: quote.discountMinor,
      included: false,
      negative: true,
    });
  }

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
    detail: 'Included in the total',
    amountMinor: quote.vatMinor,
    included: true,
    negative: false,
  });

  rows.push({
    kind: 'TOTAL',
    label: 'Total',
    detail: null,
    amountMinor: quote.totalMinor,
    included: false,
    negative: false,
  });

  return rows;
}
