import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { AppText, Card, Screen } from '../components';
import { useAsync } from '../hooks/useAsync';
import { Skeleton } from '../motion';
import type { Branch } from '../api/types';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

/**
 * How you can pay — what this app accepts, and where.
 *
 * Deliberately **not** a saved-cards screen. No card is stored anywhere in this
 * platform: card details never touch this app or our servers, they are entered
 * on the payment provider's own page at checkout. A screen offering to "add a
 * card" would be promising something that does not exist, which is the same
 * failure as the row that used to say "coming soon".
 *
 * Cash on delivery is per branch (the owner switches it on for each one), so
 * that half of the screen is read from the live branch list rather than
 * asserted — a customer at a branch that takes no cash must not be told it can.
 */
export function PaymentMethodsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'PaymentMethods'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const branchesReq = useAsync<Branch[]>(() => api.listBranches().catch(() => []), []);

  const branches = branchesReq.data ?? [];
  const cashBranches = branches.filter((b) => b.acceptsCashOnDelivery);

  return (
    <Screen title="Payment methods" subtitle="How you can pay for an order" onBack={() => navigation.goBack()}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Method
          glyph="💳"
          title="Card"
          body="Pay when you place the order. The card details are entered on our payment provider’s secure page — they are never stored in this app or by the restaurant."
        />
        <Method
          glyph="🏦"
          title="mada"
          body="Saudi debit cards are accepted the same way as any other card at checkout."
        />
        <Method
          glyph="🍎"
          title="Apple Pay"
          body="Offered at checkout on a supported device once the restaurant’s merchant account has it enabled."
        />

        {branchesReq.loading ? (
          <Skeleton height={110} radius={theme.radius.lg} />
        ) : (
          <Method
            glyph="💵"
            title="Cash on delivery"
            body={
              cashBranches.length === 0
                ? 'Not offered at the moment. Each branch decides whether it takes cash, and none is doing so right now.'
                : `Pay the driver when the order arrives. Available from ${listNames(cashBranches)}.`
            }
          />
        )}

        <Card>
          <AppText variant="h3" style={{ fontSize: 15 }}>
            No saved cards
          </AppText>
          <AppText variant="bodySmall" color="textMuted" style={{ marginTop: 6 }}>
            This app keeps no card on file. Every payment goes through the provider’s own page at
            the moment you pay, so there is nothing here to add, remove or leak.
          </AppText>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Method({ glyph, title, body }: { glyph: string; title: string; body: string }): React.JSX.Element {
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
          <AppText variant="bodySmall" color="textMuted" style={{ marginTop: 4 }}>
            {body}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

/** "Kakkiyah branch and Olaya branch" — a list a person would read out. */
function listNames(branches: Branch[]): string {
  const names = branches.map((b) => b.name);
  if (names.length <= 1) {
    return names[0] ?? '';
  }
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
