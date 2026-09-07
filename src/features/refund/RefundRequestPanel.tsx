import React, { useState } from 'react';
import { Text, View } from 'react-native';

import type { RefundEligibility, RefundRequest } from '../../api/types';
import { Card, PrimaryButton, TextField } from '../../components/ui';
import { PressableScale } from '../../motion';
import { useTheme } from '../../theme/theme';
import { RequestTone, refundPanel } from './refund-request.model';

/**
 * "Cancel this" / "something went wrong" on the order screen.
 *
 * Before this the customer app had a `cancelOrder` API method that **nothing
 * called** — a customer whose order was wrong had no route at all except
 * finding the branch's number. Past the point the order engine allows a
 * self-cancel there was not even that: the platform recorded nothing, so
 * whether anything happened depended on somebody remembering a phone call.
 *
 * Two rules this screen keeps:
 *
 *   - **The server decides what is offered.** `refundEligibility` says whether
 *     the order can still be cancelled outright, whether a request can be
 *     raised and what it would be. This app renders that; it does not keep a
 *     second copy of the rule, which is how a button ends up being offered for
 *     something the server then refuses.
 *   - **A decision is shown, not just the ask.** The whole failure this
 *     replaces is a customer with no way to see what was decided, so an
 *     approved, declined or withdrawn request stays on the screen with the
 *     branch's own words on it.
 */
export function RefundRequestPanel({
  eligibility,
  requests,
  onCancelOrder,
  onRequest,
  onWithdraw,
}: {
  eligibility: RefundEligibility | null;
  requests: RefundRequest[];
  onCancelOrder: (reason: string) => Promise<void>;
  onRequest: (reason: string) => Promise<void>;
  onWithdraw: (id: string) => Promise<void>;
}): React.JSX.Element | null {
  const theme = useTheme();
  const panel = refundPanel(eligibility, requests);

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!panel.visible) {
    return null;
  }

  const toneColor = (tone: RequestTone): string =>
    tone === 'success'
      ? theme.colors.success
      : tone === 'danger'
        ? theme.colors.danger
        : tone === 'neutral'
          ? theme.colors.textMuted
          : theme.colors.warning;

  const submit = async (): Promise<void> => {
    const trimmed = reason.trim();
    if (panel.action.kind === 'request' && trimmed.length < 3) {
      setError('Tell us briefly what’s wrong — the branch reads this.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (panel.action.kind === 'cancel') {
        await onCancelOrder(trimmed);
      } else {
        await onRequest(trimmed);
      }
      setOpen(false);
      setReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That didn’t go through. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (id: string): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await onWithdraw(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That didn’t go through. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const summary = panel.summary;
  const openRequest = panel.request;

  return (
    <Card>
      {summary ? (
        <View style={{ marginBottom: panel.action.kind === 'none' ? 0 : 14 }}>
          <Text style={{ color: toneColor(summary.tone), fontWeight: '800', marginBottom: 4 }}>
            {summary.title}
          </Text>
          <Text style={{ color: theme.colors.text, lineHeight: 20 }}>{summary.body}</Text>
          {summary.canWithdraw && openRequest ? (
            <PressableScale
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void withdraw(openRequest.id)}
              style={{ marginTop: 10 }}
            >
              <Text style={{ color: theme.colors.textMuted, fontWeight: '700' }}>
                Never mind — withdraw this
              </Text>
            </PressableScale>
          ) : null}
        </View>
      ) : null}

      {panel.note ? (
        <Text style={{ color: theme.colors.textMuted, marginBottom: 10, lineHeight: 20 }}>
          {panel.note}
        </Text>
      ) : null}

      {panel.action.kind !== 'none' ? (
        open ? (
          <View>
            <TextField
              label={
                panel.action.kind === 'cancel'
                  ? 'Why are you cancelling? (optional)'
                  : 'What went wrong?'
              }
              value={reason}
              onChangeText={setReason}
              maxLength={1000}
              autoFocus
            />
            {error ? (
              <Text
                accessibilityRole="alert"
                style={{ color: theme.colors.danger, marginBottom: 10 }}
              >
                {error}
              </Text>
            ) : null}
            <PrimaryButton
              label={panel.action.kind === 'cancel' ? 'Cancel my order' : 'Send to the branch'}
              busy={busy}
              onPress={() => void submit()}
            />
            <PressableScale
              accessibilityRole="button"
              disabled={busy}
              onPress={() => {
                setOpen(false);
                setError(null);
              }}
              style={{ marginTop: 10, alignItems: 'center' }}
            >
              <Text style={{ color: theme.colors.textMuted, fontWeight: '700' }}>Not now</Text>
            </PressableScale>
          </View>
        ) : (
          <PressableScale
            accessibilityRole="button"
            onPress={() => setOpen(true)}
            style={{
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.pill,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: theme.colors.text, fontWeight: '800' }}>
              {panel.action.label}
            </Text>
          </PressableScale>
        )
      ) : null}

      {error && !open ? (
        <Text accessibilityRole="alert" style={{ color: theme.colors.danger, marginTop: 10 }}>
          {error}
        </Text>
      ) : null}
    </Card>
  );
}
