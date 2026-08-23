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

interface Row {
  glyph: string;
  label: string;
  hint?: string;
  onPress: () => void;
}

/** Account: profile summary and the app's settings/links. */
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

  const soon = (what: string) => () => setToast(`${what} — coming soon`);

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
        { glyph: '💳', label: 'Payment methods', onPress: soon('Payment methods') },
        { glyph: '🔕', label: 'Notification settings', onPress: soon('Notification settings') },
        { glyph: '⚙️', label: 'Settings', onPress: soon('Settings') },
      ],
    },
    {
      title: 'Support & legal',
      rows: [
        { glyph: '💬', label: 'Help & support', onPress: soon('Help & support') },
        { glyph: '🔒', label: 'Privacy policy', onPress: soon('Privacy policy') },
        { glyph: '📄', label: 'Terms of service', onPress: soon('Terms of service') },
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
                  {profile.data?.phone ?? 'Bait Al Hana member'}
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
        <AppText variant="caption" color="textMuted" center>
          Bait Al Hana · v0.1.0
        </AppText>
      </ScrollView>
    </Screen>
  );
}
