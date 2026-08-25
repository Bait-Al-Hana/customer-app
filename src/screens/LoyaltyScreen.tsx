import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { Card, Screen } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, ErrorState, Skeleton, Stagger } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

const TYPE_LABELS: Record<string, string> = {
  EARN: 'Earned',
  REVERSE: 'Reversed',
  ADJUST: 'Adjusted',
  REDEEM: 'Redeemed',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function LoyaltyScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Loyalty'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.loyalty(), []);

  return (
    <Screen title="Loyalty" onBack={() => navigation.goBack()}>
      {loading ? (
        <View style={{ padding: 20, gap: 12 }}>
          <Skeleton height={100} radius={theme.radius.lg} />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={60} radius={theme.radius.lg} />
          ))}
        </View>
      ) : error ? (
        <ErrorState title="Couldn't load loyalty" message={error.message} actionLabel="Retry" onAction={reload} />
      ) : data ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13, textTransform: 'uppercase', fontWeight: '600' }}>Your balance</Text>
            <Text style={{ color: theme.colors.primary, fontSize: 36, fontWeight: '800', marginTop: 4 }}>{data.balance}</Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>points</Text>
          </Card>

          {data.data.length === 0 ? (
            <EmptyState title="No activity yet" message="Points you earn from orders will appear here." />
          ) : (
            <Stagger>
              {data.data.map((tx) => (
                <Card key={tx.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{TYPE_LABELS[tx.type] ?? tx.type}</Text>
                      {tx.reason ? <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 2 }}>{tx.reason}</Text> : null}
                      <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 4 }}>{formatDate(tx.createdAt)}</Text>
                    </View>
                    <Text style={{ color: tx.points >= 0 ? theme.colors.success : theme.colors.danger, fontSize: 18, fontWeight: '700' }}>
                      {tx.points >= 0 ? '+' : ''}{tx.points}
                    </Text>
                  </View>
                </Card>
              ))}
            </Stagger>
          )}
        </ScrollView>
      ) : null}
    </Screen>
  );
}
