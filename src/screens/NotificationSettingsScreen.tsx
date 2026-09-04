import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { AppText, Card, Screen } from '../components';
import { ChevronRight } from '../components/icons';
import { useAsync } from '../hooks/useAsync';
import { PressableScale } from '../motion';
import type { CustomerProfile } from '../api/types';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

/**
 * What the app sends, and where it arrives.
 *
 * There are deliberately **no toggles here**. Switching a message off has to be
 * honoured by the server that sends it, and this platform has no per-customer
 * notification preference yet — a switch on this screen would move and change
 * nothing, which is worse than the "coming soon" row it replaced, because it
 * would look like it worked.
 *
 * So the screen says exactly what is sent, to which number, and what is not
 * being sent at all. When the backend grows a preference, the switches belong
 * here and this note goes.
 */
export function NotificationSettingsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'NotificationSettings'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const profile = useAsync<CustomerProfile | null>(() => api.getProfile().catch(() => null), []);
  const phone = profile.data?.phone;

  return (
    <Screen title="Notification settings" subtitle="What we send you" onBack={() => navigation.goBack()}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Row
          glyph="🧾"
          title="Order updates"
          body={
            phone
              ? `Sent by SMS to ${phone} when your order is confirmed, when it is on its way and when it arrives. They are also kept in your in-app inbox.`
              : 'Sent by SMS to your sign-in number when your order is confirmed, when it is on its way and when it arrives. They are also kept in your in-app inbox.'
          }
        />
        <Row
          glyph="💳"
          title="Payment and refunds"
          body="Sent when a payment succeeds or fails, and when a refund is on its way back to your card."
        />
        <Row
          glyph="🎁"
          title="Marketing"
          body="We send none. Offers live on the Offers tab for you to look at when you want them — they are not pushed to your phone."
        />
        <Row
          glyph="🔔"
          title="Push notifications"
          body="Not switched on yet. Until they are, order updates reach you by SMS and in the inbox, so nothing is missed."
        />

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Open notifications inbox"
          onPress={() => navigation.navigate('Notifications')}
        >
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <AppText variant="body" weight="600" style={{ flex: 1 }}>
                Open my inbox
              </AppText>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </View>
          </Card>
        </PressableScale>

        <AppText variant="caption" color="textMuted" style={{ paddingHorizontal: 8, lineHeight: 18 }}>
          Order updates cannot be switched off while an order is in progress — they are how you
          know where your food is.
        </AppText>
      </ScrollView>
    </Screen>
  );
}

function Row({ glyph, title, body }: { glyph: string; title: string; body: string }): React.JSX.Element {
  const theme = useTheme();
  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: theme.colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText style={{ fontSize: 19 }}>{glyph}</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="h3" style={{ fontSize: 15 }}>
            {title}
          </AppText>
          <AppText variant="bodySmall" color="textMuted" style={{ marginTop: 4, lineHeight: 20 }}>
            {body}
          </AppText>
        </View>
      </View>
    </Card>
  );
}
