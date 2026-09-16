import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, View } from 'react-native';

import type { LoyaltyEntry } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { AppText, Card, Divider, Screen } from '../components';
import { GradientSurface } from '../components/GradientSurface';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, ErrorState, Skeleton } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

const TYPE_META: Record<string, { label: string; glyph: string }> = {
  EARN: { label: 'Points earned', glyph: '🛍️' },
  REDEEM: { label: 'Points redeemed', glyph: '🎁' },
  REVERSE: { label: 'Points reversed', glyph: '↩️' },
  ADJUST: { label: 'Adjustment', glyph: '✨' },
};

function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Rewards: the customer's real points balance and history from the backend ledger. */
export function LoyaltyScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Loyalty'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.loyalty(), []);

  return (
    <Screen title="Rewards" onBack={() => navigation.goBack()}>
      {loading ? (
        <View style={{ padding: 16, gap: 16 }}>
          <Skeleton height={150} radius={theme.radius.xl} />
          <Skeleton height={72} radius={theme.radius.lg} />
        </View>
      ) : error ? (
        <ErrorState title="Couldn’t load rewards" message={error.message} actionLabel="Retry" onAction={reload} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
          <GradientSurface colors={['#E5178B', '#7A2E8C']} radius={theme.radius.xl} style={theme.shadow(2)}>
            <View style={{ padding: 22 }}>
              <AppText variant="overline" style={{ color: 'rgba(255,255,255,0.85)' }}>
                YOUR POINTS
              </AppText>
              <AppText style={{ color: '#fff', fontSize: 48, fontWeight: '800', marginTop: 8 }}>
                {data?.balance ?? 0}
              </AppText>
              <AppText variant="bodySmall" style={{ color: 'rgba(255,255,255,0.92)', marginTop: 6 }}>
                You earn points on every completed order.
              </AppText>
            </View>
          </GradientSurface>

          {!data || data.data.length === 0 ? (
            <EmptyState glyph="✨" title="No points yet" message="Order something to start earning." />
          ) : (
            <View>
              <AppText variant="h3" style={{ marginBottom: 12 }}>
                Points activity
              </AppText>
              <Card>
                {data.data.map((entry, i) => (
                  <View key={entry.id}>
                    {i > 0 ? <Divider style={{ marginVertical: 10 }} /> : null}
                    <HistoryRow entry={entry} />
                  </View>
                ))}
              </Card>
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

function HistoryRow({ entry }: { entry: LoyaltyEntry }): React.JSX.Element {
  const theme = useTheme();
  const positive = entry.points >= 0;
  const meta = TYPE_META[entry.type] ?? { label: entry.type, glyph: '•' };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
        <AppText style={{ fontSize: 18 }}>{meta.glyph}</AppText>
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="body" weight="600" numberOfLines={1}>
          {entry.reason ?? meta.label}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {dateLabel(entry.createdAt)}
        </AppText>
      </View>
      <AppText variant="h3" style={{ fontSize: 15, color: positive ? theme.colors.success : theme.colors.textMuted }}>
        {positive ? '+' : ''}
        {entry.points}
      </AppText>
    </View>
  );
}
