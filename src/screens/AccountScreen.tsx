import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { useCart } from '../cart/CartProvider';
import { useFavorites } from '../favorites/FavoritesProvider';
import { AppText, Button, Card, Divider, Screen } from '../components';
import { ChevronRight } from '../components/icons';
import { useAsync } from '../hooks/useAsync';
import { PressableScale, Toast } from '../motion';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';
import { APP_VERSION, buildMarker } from '../version';

interface Row {
  glyph: string;
  label: string;
  hint?: string;
  onPress: () => void;
}

/**
 * Account: profile summary and everywhere else in the app.
 *
 * **Every row goes somewhere.** Six of them used to raise "coming soon", which
 * on a screen a customer opens looking for help is a dead end wearing the
 * clothes of a feature. Payment methods, notification settings, help and the
 * two legal documents are real screens now, and the catch-all "Settings" row is
 * gone rather than kept as a bucket with nothing in it — everything it would
 * have contained has its own row here.
 */
export function AccountScreen(): React.JSX.Element {
  const theme = useTheme();
  const { api, signOut } = useAuth();
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabNav = useNavigation<BottomTabScreenProps<MainTabParamList>['navigation']>();
  const favorites = useFavorites();
  const { count } = useCart();
  const [toast, setToast] = useState<string | null>(null);
  const profile = useAsync(() => api.getProfile(), []);
  const reloadProfile = profile.reload;
  // Reflect a name edited on the Profile screen when returning here.
  useFocusEffect(useCallback(() => reloadProfile(), [reloadProfile]));

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: 'Orders & activity',
      rows: [
        { glyph: '🧾', label: 'My orders', onPress: () => tabNav.navigate('Orders') },
        { glyph: '🔔', label: 'Notifications', onPress: () => rootNav.navigate('Notifications') },
        { glyph: '❤️', label: 'Favorites', hint: favorites.count > 0 ? `${favorites.count}` : undefined, onPress: () => rootNav.navigate('Favorites') },
        { glyph: '⭐', label: 'Rewards', onPress: () => rootNav.navigate('Loyalty') },
        { glyph: '🎁', label: 'Offers & coupons', onPress: () => tabNav.navigate('Offers') },
      ],
    },
    {
      title: 'Preferences',
      rows: [
        { glyph: '📍', label: 'Saved addresses', onPress: () => rootNav.navigate('Addresses') },
        { glyph: '💳', label: 'Payment methods', onPress: () => rootNav.navigate('PaymentMethods') },
        {
          glyph: '🔔',
          label: 'Notification settings',
          onPress: () => rootNav.navigate('NotificationSettings'),
        },
      ],
    },
    {
      title: 'Support & legal',
      rows: [
        { glyph: '💬', label: 'Help & support', onPress: () => rootNav.navigate('Help') },
        { glyph: '🔒', label: 'Privacy policy', onPress: () => rootNav.navigate('Legal', { document: 'privacy' }) },
        { glyph: '📄', label: 'Terms of service', onPress: () => rootNav.navigate('Legal', { document: 'terms' }) },
      ],
    },
  ];

  return (
    <Screen title="Account">
      <Toast visible={!!toast} message={toast ?? ''} tone="neutral" onHide={() => setToast(null)} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>
        {/* Profile header — tap to edit name / view phone */}
        <Card elevated>
          <PressableScale accessibilityRole="button" accessibilityLabel="Edit profile" onPress={() => rootNav.navigate('Profile')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <AppText style={{ fontSize: 28 }}>🙂</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="h2" style={{ fontSize: 19 }}>
                  {profile.data?.fullName?.trim() || 'Welcome back'}
                </AppText>
                <AppText variant="bodySmall" color="textMuted" style={{ marginTop: 2 }}>
                  {profile.data?.phone ?? 'بيت الهناء'}
                </AppText>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </View>
          </PressableScale>
          {count > 0 ? (
            <View style={{ marginTop: 14 }}>
              <Button label={`You have ${count} item${count === 1 ? '' : 's'} in your cart`} variant="secondary" onPress={() => rootNav.navigate('Cart')} />
            </View>
          ) : null}
        </Card>

        {sections.map((section) => (
          <View key={section.title}>
            <AppText variant="overline" color="textMuted" style={{ marginBottom: 8, marginLeft: 4 }}>
              {section.title}
            </AppText>
            <Card padded={false}>
              {section.rows.map((row, i) => (
                <View key={row.label}>
                  {i > 0 ? <Divider style={{ marginLeft: 56 }} /> : null}
                  <PressableScale accessibilityRole="button" accessibilityLabel={row.label} onPress={row.onPress}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 16 }}>
                      <View style={{ width: 30, alignItems: 'center' }}>
                        <AppText style={{ fontSize: 18 }}>{row.glyph}</AppText>
                      </View>
                      <AppText variant="body" weight="600" style={{ flex: 1 }}>
                        {row.label}
                      </AppText>
                      {row.hint ? (
                        <View style={{ backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.pill, paddingVertical: 2, paddingHorizontal: 8 }}>
                          <AppText variant="caption" weight="700" color="primary">
                            {row.hint}
                          </AppText>
                        </View>
                      ) : null}
                      <ChevronRight color={theme.colors.textMuted} size={18} />
                    </View>
                  </PressableScale>
                </View>
              ))}
            </Card>
          </View>
        ))}

        <Button label="Log out" variant="danger" onPress={() => signOut()} />
        {/* The build marker. A customer never reads it; the person diagnosing
            a report does, and until it existed "is this the fixed build?" was
            unanswerable — which makes a stale bundle and a live bug look
            identical. See `util/buildInfo.ts`. */}
        <AppText variant="caption" color="textMuted" center>
          بيت الهناء · v{APP_VERSION} · {buildMarker()}
        </AppText>
      </ScrollView>
    </Screen>
  );
}
