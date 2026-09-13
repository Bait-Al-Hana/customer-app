import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Linking, ScrollView, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { AppText, Card, Screen } from '../components';
import { ChevronRight } from '../components/icons';
import { useAsync } from '../hooks/useAsync';
import { PressableScale, Skeleton } from '../motion';
import type { Branch } from '../api/types';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';
import { APP_VERSION } from '../version';

/**
 * Help: the answers to the questions the counter actually gets, and a way to
 * reach a human.
 *
 * The branch numbers are read from the live branch list rather than written
 * into the app, so a new branch is reachable the day the owner creates it and a
 * number that changes cannot go stale here. A branch with no number on file is
 * shown without a call button rather than with one that dials nothing.
 */
export function HelpScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Help'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const branchesReq = useAsync<Branch[]>(() => api.listBranches().catch(() => []), []);
  const branches = branchesReq.data ?? [];

  const faqs: { q: string; a: string }[] = [
    {
      q: 'Where is my order?',
      a: 'Open Orders and tap the one you are waiting for. It shows the live status, and once a driver has picked it up you can follow them on the map.',
    },
    {
      q: 'Can I change or cancel an order?',
      a: 'You can cancel from the order screen up until the kitchen starts preparing it. After that, call the branch — they will tell you what is still possible.',
    },
    {
      q: 'How is the delivery fee worked out?',
      a: 'By distance from the branch that is delivering to you. The exact fee for your basket and address is shown at checkout before you pay, in the bill breakdown.',
    },
    {
      q: 'Why is there a minimum order for delivery?',
      a: 'Delivery has a fixed cost per trip. Checkout tells you how much more to add if your basket is under the minimum — pickup has no minimum.',
    },
    {
      q: 'My coupon was not accepted.',
      a: 'Codes have conditions — a minimum spend, an end date, sometimes one use per customer. Checkout says which one was not met, and your basket is priced without it so you can still order.',
    },
    {
      q: 'How do refunds work?',
      a: 'A refund is issued by the branch back to the card you paid with. It leaves us straight away and then takes as long as your bank needs, usually a few working days.',
    },
    {
      q: 'Do you keep my card details?',
      a: 'No. Cards are entered on the payment provider’s own page and are never stored by this app or the restaurant.',
    },
  ];

  return (
    <Screen title="Help & support" subtitle="Answers, and how to reach us" onBack={() => navigation.goBack()}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <View>
          <AppText variant="overline" color="textMuted" style={{ marginBottom: 8, marginLeft: 4 }}>
            Talk to a branch
          </AppText>
          {branchesReq.loading ? (
            <Skeleton height={110} radius={theme.radius.lg} />
          ) : branches.length === 0 ? (
            <Card>
              <AppText variant="bodySmall" color="textMuted">
                Branch contact details will appear here once branches are open.
              </AppText>
            </Card>
          ) : (
            <Card padded={false}>
              {branches.map((b, i) => (
                <View key={b.id}>
                  {i > 0 ? <View style={{ height: 1, backgroundColor: theme.colors.border, marginLeft: 16 }} /> : null}
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={b.phone ? `Call ${b.name}` : b.name}
                    disabled={!b.phone}
                    onPress={() => b.phone && Linking.openURL(`tel:${b.phone}`)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
                      <View style={{ flex: 1 }}>
                        <AppText variant="h3" style={{ fontSize: 15 }} numberOfLines={1}>
                          {b.name}
                        </AppText>
                        <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ marginTop: 2 }}>
                          {b.phone ?? [b.district, b.city].filter(Boolean).join(', ')}
                        </AppText>
                      </View>
                      {b.phone ? (
                        <AppText variant="bodySmall" weight="700" color="primary">
                          Call
                        </AppText>
                      ) : null}
                    </View>
                  </PressableScale>
                </View>
              ))}
            </Card>
          )}
        </View>

        <View>
          <AppText variant="overline" color="textMuted" style={{ marginBottom: 8, marginLeft: 4 }}>
            Common questions
          </AppText>
          <View style={{ gap: 10 }}>
            {faqs.map((faq) => (
              <Card key={faq.q}>
                <AppText variant="h3" style={{ fontSize: 15 }}>
                  {faq.q}
                </AppText>
                <AppText variant="bodySmall" color="textMuted" style={{ marginTop: 6, lineHeight: 20 }}>
                  {faq.a}
                </AppText>
              </Card>
            ))}
          </View>
        </View>

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Your orders"
          onPress={() => navigation.navigate('Tabs', { screen: 'Orders' })}
        >
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <AppText variant="body" weight="600" style={{ flex: 1 }}>
                Check an order
              </AppText>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </View>
          </Card>
        </PressableScale>

        <AppText variant="caption" color="textMuted" center>
          بيت الهناء · app v{APP_VERSION}
        </AppText>
      </ScrollView>
    </Screen>
  );
}
