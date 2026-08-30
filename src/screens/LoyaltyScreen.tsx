import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { Card, Screen } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, ErrorState, Skeleton, Stagger } from '../motion';
import { useI18n } from '../i18n';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

const TYPE_COLORS: Record<string, string> = {
  EARN: '#2E9E5B',
  REDEEM: '#E5178B',
  REVERSE: '#F47C20',
  ADJUST: '#2E63A6',
};

export function LoyaltyScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Loyalty'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { t } = useI18n();
  const balance = useAsync(() => api.loyaltyBalance(), []);
  const history = useAsync(() => api.loyaltyHistory(), []);

  const typeLabel = (type: string): string => {
    switch (type) {
      case 'EARN': return t('loyaltyEarn');
      case 'REDEEM': return t('loyaltyRedeem');
      case 'REVERSE': return t('loyaltyReverse');
      case 'ADJUST': return t('loyaltyAdjust');
      default: return type;
    }
  };

  return (
    <Screen title={t('loyaltyTitle')} onBack={() => navigation.goBack()}>
      {balance.loading ? (
        <View style={{ padding: 20, gap: 12 }}>
          <Skeleton height={100} radius={theme.radius.lg} />
          <Skeleton height={200} radius={theme.radius.lg} />
        </View>
      ) : balance.error ? (
        <ErrorState title={t('error')} message={balance.error.message} actionLabel={t('retry')} onAction={balance.reload} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Text style={{ color: theme.colors.textMuted, fontSize: 14, fontWeight: '600', textTransform: 'uppercase' }}>
              {t('loyaltyBalance')}
            </Text>
            <Text style={{ color: theme.colors.primary, fontSize: 48, fontWeight: '800', marginTop: 4 }}>
              {balance.data?.balance ?? 0}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>{t('loyaltyPoints')}</Text>
          </Card>

          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800', marginTop: 8 }}>
            {t('loyaltyHistory')}
          </Text>

          {history.loading ? (
            <View style={{ gap: 8 }}>
              {[0, 1, 2].map((i) => <Skeleton key={i} height={60} radius={theme.radius.md} />)}
            </View>
          ) : history.error ? (
            <ErrorState title={t('error')} message={history.error.message} actionLabel={t('retry')} onAction={history.reload} />
          ) : !history.data || history.data.data.length === 0 ? (
            <EmptyState title={t('loyaltyEmpty')} message={t('loyaltyEmptyMsg')} />
          ) : (
            <Stagger>
              {history.data.data.map((entry) => (
                <Card key={entry.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: TYPE_COLORS[entry.type] ?? theme.colors.text, fontWeight: '700' }}>
                        {typeLabel(entry.type)}
                      </Text>
                      {entry.description ? (
                        <Text style={{ color: theme.colors.textMuted, marginTop: 2 }} numberOfLines={1}>{entry.description}</Text>
                      ) : null}
                      <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 4 }}>
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={{ color: entry.points >= 0 ? theme.colors.success : theme.colors.danger, fontSize: 20, fontWeight: '800' }}>
                      {entry.points >= 0 ? '+' : ''}{entry.points}
                    </Text>
                  </View>
                </Card>
              ))}
            </Stagger>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
