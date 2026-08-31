import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { Card } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import {
  EmptyState,
  ErrorState,
  FadeIn,
  GradientHeader,
  PressableScale,
  PulsingDot,
  Skeleton,
  Stagger,
  StatusBadge,
} from '../motion';
import { RootStackParamList } from '../navigation/types';
import { formatSar } from '../util/money';
import { useTheme } from '../theme/theme';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function BranchesScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Branches'>): React.JSX.Element {
  const theme = useTheme();
  const { api, signOut } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.listBranches(), []);

  const headerRight = (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="My orders"
        onPress={() => navigation.navigate('Orders')}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.accent + '18',
        }}
      >
        <Text style={{ color: theme.colors.accent, fontWeight: '700', fontSize: 14 }}>My Orders</Text>
      </PressableScale>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        onPress={() => signOut()}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: theme.colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 16 }}>↗</Text>
      </PressableScale>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <GradientHeader
        title={getGreeting()}
        subtitle="Where would you like to order from?"
        right={headerRight}
        large
      />

      {loading ? (
        <View style={{ padding: 20, gap: 14 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={120} radius={theme.radius.lg} />
          ))}
        </View>
      ) : error ? (
        <ErrorState title="Couldn't load branches" message={error.message} actionLabel="Retry" onAction={reload} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No branches yet" message="Please check back soon." />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 14 }}>
          <Stagger>
            {data.map((branch) => (
              <PressableScale
                key={branch.id}
                accessibilityRole="button"
                onPress={() => navigation.navigate('Menu', { branchId: branch.id, branchName: branch.name })}
              >
                <Card>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }}>
                        {branch.name}
                      </Text>
                      <Text style={{ color: theme.colors.textMuted, marginTop: 4, fontSize: 14, lineHeight: 20 }}>
                        {[branch.district, branch.city].filter(Boolean).join(', ')}
                      </Text>
                    </View>

                    {branch.isAcceptingOrders ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <PulsingDot color={theme.colors.success} size={7} />
                        <StatusBadge label="Open" color={theme.colors.success + '1A'} textColor={theme.colors.success} />
                      </View>
                    ) : (
                      <StatusBadge label="Closed" color={theme.colors.danger + '1A'} textColor={theme.colors.danger} />
                    )}
                  </View>

                  {branch.isAcceptingOrders ? (
                    <FadeIn delay={100}>
                      <View style={{ flexDirection: 'row', marginTop: 14, gap: 8, flexWrap: 'wrap' }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: theme.colors.surfaceAlt,
                            borderRadius: theme.radius.pill,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            gap: 4,
                          }}
                        >
                          <Text style={{ fontSize: 13 }}>🚗</Text>
                          <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' }}>
                            {formatSar(branch.deliveryFeeMinor)}
                          </Text>
                        </View>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: theme.colors.surfaceAlt,
                            borderRadius: theme.radius.pill,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            gap: 4,
                          }}
                        >
                          <Text style={{ fontSize: 13 }}>📦</Text>
                          <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' }}>
                            Min {formatSar(branch.minOrderMinor)}
                          </Text>
                        </View>
                      </View>
                    </FadeIn>
                  ) : null}

                  {/* Decorative arrow */}
                  <View style={{ position: 'absolute', right: 16, bottom: 16 }}>
                    <Text style={{ color: theme.colors.border, fontSize: 18 }}>›</Text>
                  </View>
                </Card>
              </PressableScale>
            ))}
          </Stagger>
        </ScrollView>
      )}
    </View>
  );
}
