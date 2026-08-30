import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { Card, Screen } from '../components/ui';
import { useConfig } from '../config';
import { useAsync } from '../hooks/useAsync';
import { useI18n, useLocalName } from '../i18n';
import { EmptyState, ErrorState, PressableScale, Skeleton, Stagger } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { formatSar } from '../util/money';
import { useTheme } from '../theme/theme';

/** Home: choose a branch to order from. */
export function BranchesScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Branches'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { t } = useI18n();
  const localName = useLocalName();
  const config = useConfig();
  const { data, loading, error, reload } = useAsync(() => api.listBranches(), []);

  const headerRight = (
    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
      {config.loyaltyEnabled ? (
        <PressableScale accessibilityRole="button" accessibilityLabel={t('loyaltyTitle')} onPress={() => navigation.navigate('Loyalty')}>
          <Text style={{ color: theme.colors.secondary, fontWeight: '600' }}>{t('loyaltyTitle')}</Text>
        </PressableScale>
      ) : null}
      <PressableScale accessibilityRole="button" accessibilityLabel={t('ordersTitle')} onPress={() => navigation.navigate('Orders')}>
        <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>{t('ordersTitle')}</Text>
      </PressableScale>
      <PressableScale accessibilityRole="button" accessibilityLabel={t('profileTitle')} onPress={() => navigation.navigate('Profile')}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: '600' }}>{t('profileTitle')}</Text>
      </PressableScale>
    </View>
  );

  return (
    <Screen title={t('branchesTitle')} right={headerRight}>
      {loading ? (
        <View style={{ padding: 20, gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={92} radius={theme.radius.lg} />
          ))}
        </View>
      ) : error ? (
        <ErrorState title={t('branchLoadError')} message={error.message} actionLabel={t('retry')} onAction={reload} />
      ) : !data || data.length === 0 ? (
        <EmptyState title={t('noBranches')} message={t('noBranchesMsg')} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          <Stagger>
            {data.map((branch) => (
              <PressableScale
                key={branch.id}
                accessibilityRole="button"
                onPress={() => navigation.navigate('Menu', { branchId: branch.id, branchName: branch.name })}
              >
                <Card>
                  <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '700' }}>{localName(branch.name, branch.nameAr)}</Text>
                  <Text style={{ color: theme.colors.textMuted, marginTop: 4 }}>
                    {[branch.district, branch.city].filter(Boolean).join(', ')}
                  </Text>
                  <View style={{ flexDirection: 'row', marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
                    {!branch.isAcceptingOrders ? (
                      <Text style={{ color: theme.colors.danger, fontWeight: '600' }}>{t('closedNow')}</Text>
                    ) : (
                      <>
                        <Text style={{ color: theme.colors.textMuted }}>{t('delivery')} {formatSar(branch.deliveryFeeMinor)}</Text>
                        <Text style={{ color: theme.colors.textMuted }}>· {t('minOrder')} {formatSar(branch.minOrderMinor)}</Text>
                      </>
                    )}
                  </View>
                </Card>
              </PressableScale>
            ))}
          </Stagger>
        </ScrollView>
      )}
    </Screen>
  );
}
