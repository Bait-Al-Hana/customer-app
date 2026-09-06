import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthProvider';
import { AppText, Button, Card, Screen } from '../components';
import { Toast } from '../motion';
import { RootStackParamList } from '../navigation/types';

/**
 * Delete my account.
 *
 * Apple requires an app that creates accounts to let a customer delete theirs
 * **from inside the app** (App Store Review Guideline 5.1.1(v)), and it is
 * checked during review. That is why the screen exists at all. What is on it is
 * decided by something else.
 *
 * **It says what is kept, before the customer confirms.** The server does not
 * remove the row: `Order.customerId` is `onDelete: Restrict`, and those orders
 * are the restaurant's sales and VAT records, which it is required to retain.
 * So "everything is deleted" would be a false statement made at the exact
 * moment someone is relying on it — the kind of sentence a regulator reads
 * literally. The two lists below are the honest version, and neither should be
 * softened into a single reassuring line.
 *
 * **Two presses, and no typing.** The confirmation is a second deliberate act
 * rather than a `confirm()` dismissed by reflex, but it does not ask anyone to
 * type an English word: this app ships bilingual to customers in Saudi Arabia,
 * and a Latin-alphabet shibboleth in front of a destructive action locks out
 * the people most likely to need help getting through it.
 *
 * The session dies server-side the moment the request succeeds, so this screen
 * clears the device itself rather than leaving tokens that authenticate
 * nothing. It signs out **locally** — `signOut()` would call `POST
 * /auth/logout` with a refresh token that has already been revoked, and a
 * "couldn't sign you out" error after a successful deletion is a lie about what
 * happened.
 */
export function DeleteAccountScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'DeleteAccount'>): React.JSX.Element {
  const { api, forgetSession } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const removed = [
    'Your name, and your email address if you gave us one',
    'Every saved delivery address, including the map pins',
    'Your phone number, which is released — you can sign up again with it later',
    'Every device you are signed in on',
  ];

  const kept = [
    'Your past orders, which are the restaurant’s sales and tax records and cannot be removed',
    'Any loyalty points already earned on them, which you will not be able to use',
  ];

  const remove = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await api.deleteAccount();
      // Nothing to sign out of any more — the account and its sessions are
      // gone server-side. Clear the device and the root navigator swaps to the
      // signed-out stack on its own.
      await forgetSession();
    } catch (e) {
      setBusy(false);
      setError(
        e instanceof ApiError ? e.message : 'Could not delete your account. Please try again.',
      );
    }
  };

  return (
    <Screen title="Delete account" onBack={() => navigation.goBack()}>
      <Toast
        visible={!!error}
        message={error ?? ''}
        tone="danger"
        onHide={() => setError(null)}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}>
        <Card>
          <AppText variant="h2" style={{ fontSize: 19, marginBottom: 6 }}>
            This cannot be undone
          </AppText>
          <AppText variant="bodySmall" color="textMuted">
            Deleting your account signs you out everywhere and removes your details from the app.
            Read what stays before you confirm.
          </AppText>
        </Card>

        <Card>
          <AppText variant="overline" color="textMuted" style={{ marginBottom: 8 }}>
            What is deleted
          </AppText>
          {removed.map((line) => (
            <View key={line} style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
              <AppText variant="body" color="danger">
                ×
              </AppText>
              <AppText variant="bodySmall" style={{ flex: 1 }}>
                {line}
              </AppText>
            </View>
          ))}
        </Card>

        <Card>
          <AppText variant="overline" color="textMuted" style={{ marginBottom: 8 }}>
            What the restaurant keeps
          </AppText>
          {kept.map((line) => (
            <View key={line} style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
              <AppText variant="body" color="textMuted">
                •
              </AppText>
              <AppText variant="bodySmall" style={{ flex: 1 }}>
                {line}
              </AppText>
            </View>
          ))}
          <AppText variant="caption" color="textMuted" style={{ marginTop: 4 }}>
            Those orders no longer carry your name or phone number.
          </AppText>
        </Card>

        {confirming ? (
          <View style={{ gap: 10 }}>
            <AppText variant="bodySmall" weight="700" color="danger" center>
              Delete your account for good?
            </AppText>
            <Button
              label="Yes, delete my account"
              variant="danger"
              busy={busy}
              onPress={remove}
            />
            <Button
              label="Keep my account"
              variant="secondary"
              disabled={busy}
              onPress={() => setConfirming(false)}
            />
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Button
              label="Delete my account"
              variant="danger"
              onPress={() => setConfirming(true)}
            />
            <AppText variant="caption" color="textMuted" center>
              You will be asked to confirm.
            </AppText>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
