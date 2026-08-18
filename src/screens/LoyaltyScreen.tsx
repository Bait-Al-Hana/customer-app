import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText, Card, Divider, Screen } from '../components';
import { GradientSurface } from '../components/GradientSurface';
import { LOYALTY, LoyaltyEntry } from '../data/loyalty';
import { useMotion, PressableScale } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

/** Loyalty: points, progress to the next reward, redeemable rewards and history. */
export function LoyaltyScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Loyalty'>): React.JSX.Element {
  const theme = useTheme();
  const { points, tier, nextRewardAt, rewards, history } = LOYALTY;
  const toNext = Math.max(0, nextRewardAt - points);
  const fraction = Math.min(1, points / nextRewardAt);

  return (
    <Screen title="Rewards" onBack={() => navigation.goBack()}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        {/* Points hero */}
        <GradientSurface colors={['#E5178B', '#7A2E8C']} radius={theme.radius.xl} style={theme.shadow(2)}>
          <View style={{ padding: 22 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="overline" style={{ color: 'rgba(255,255,255,0.85)' }}>
                YOUR POINTS
              </AppText>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: theme.radius.pill, paddingVertical: 4, paddingHorizontal: 12 }}>
                <AppText variant="caption" weight="800" style={{ color: '#fff' }}>
                  ⭐ {tier}
                </AppText>
              </View>
            </View>
            <AppText style={{ color: '#fff', fontSize: 48, fontWeight: '800', marginTop: 8 }}>{points}</AppText>

            <ProgressBar fraction={fraction} />
            <AppText variant="bodySmall" style={{ color: 'rgba(255,255,255,0.92)', marginTop: 10 }}>
              {toNext > 0 ? `${toNext} points to your next reward` : 'You’ve unlocked a reward!'}
            </AppText>
          </View>
        </GradientSurface>

        {/* Rewards */}
        <View>
          <AppText variant="h3" style={{ marginBottom: 12 }}>
            Available rewards
          </AppText>
          <View style={{ gap: 10 }}>
            {rewards.map((r) => {
              const canRedeem = points >= r.cost;
              return (
                <Card key={r.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 46, height: 46, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                      <AppText style={{ fontSize: 22 }}>{r.glyph}</AppText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="h3" style={{ fontSize: 15 }}>
                        {r.title}
                      </AppText>
                      <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ marginTop: 2 }}>
                        {r.description}
                      </AppText>
                    </View>
                    <PressableScale
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !canRedeem }}
                      disabled={!canRedeem}
                      onPress={() => undefined}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                        borderRadius: theme.radius.pill,
                        backgroundColor: canRedeem ? theme.colors.primary : theme.colors.surfaceAlt,
                        opacity: canRedeem ? 1 : 0.7,
                      }}
                    >
                      <AppText variant="caption" weight="800" style={{ color: canRedeem ? theme.colors.onPrimary : theme.colors.textMuted }}>
                        {r.cost} pts
                      </AppText>
                    </PressableScale>
                  </View>
                </Card>
              );
            })}
          </View>
        </View>

        {/* History */}
        <View>
          <AppText variant="h3" style={{ marginBottom: 12 }}>
            Points activity
          </AppText>
          <Card>
            {history.map((h, i) => (
              <View key={h.id}>
                {i > 0 ? <Divider style={{ marginVertical: 10 }} /> : null}
                <HistoryRow entry={h} />
              </View>
            ))}
          </Card>
        </View>

        <AppText variant="caption" color="textMuted" center style={{ paddingHorizontal: 24 }}>
          Points and rewards shown here are a preview. Your real balance is kept by our server.
        </AppText>
      </ScrollView>
    </Screen>
  );
}

function ProgressBar({ fraction }: { fraction: number }): React.JSX.Element {
  const { reduceMotion } = useMotion();
  const w = useSharedValue(reduceMotion ? fraction : 0);
  useEffect(() => {
    w.value = reduceMotion ? fraction : withTiming(fraction, { duration: 700 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fraction]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.round(w.value * 100)}%` }));
  return (
    <View style={{ height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 16, overflow: 'hidden' }}>
      <Animated.View style={[{ height: 10, borderRadius: 5, backgroundColor: '#fff' }, fill]} />
    </View>
  );
}

function HistoryRow({ entry }: { entry: LoyaltyEntry }): React.JSX.Element {
  const theme = useTheme();
  const positive = entry.points >= 0;
  const glyph = entry.kind === 'redeem' ? '🎁' : entry.kind === 'adjust' ? '✨' : '🛍️';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
        <AppText style={{ fontSize: 18 }}>{glyph}</AppText>
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="body" weight="600" numberOfLines={1}>
          {entry.label}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {entry.date}
        </AppText>
      </View>
      <AppText variant="h3" style={{ fontSize: 15, color: positive ? theme.colors.success : theme.colors.textMuted }}>
        {positive ? '+' : ''}
        {entry.points}
      </AppText>
    </View>
  );
}
