import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import { View } from 'react-native';

import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthProvider';
import { AppText, Card, PrimaryButton, Screen } from '../components';
import { PinIcon } from '../components/icons';
import { FadeIn, PressableScale, Toast } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';
import { toAddress } from '../util/geocode';

/**
 * Asked once, right after signing in: where should we bring your food?
 *
 * ## Why this is a screen and not a prompt at checkout
 *
 * The delivery fee depends on distance, so an address is not a formality
 * collected at the end — it is part of the price. A customer who only meets
 * the address field at checkout has already chosen what to eat before finding
 * out what delivery costs, or that the branch does not reach them at all. This
 * asks first, and the whole app is priced correctly from then on.
 *
 * ## Skipping is a first-class outcome
 *
 * A customer may decline the permission, be indoors with no fix, or simply not
 * want to. **They must still be able to browse.** Skip is a plain, visible
 * choice, not a greyed-out afterthought, and the address can be added later
 * from the home header or at checkout. A location prompt that traps someone on
 * the first screen of a food app loses the order outright.
 *
 * ## What is saved
 *
 * The pin, always — the coordinates are what the fee is computed from and what
 * the driver navigates to. The written address is best-effort on top: reverse
 * geocoding is loosely specified and often partial, so a pin whose address
 * cannot be read is still saved, and the customer is sent to fill in the words.
 */
export function LocationSetupScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'LocationSetup'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = (): void => navigation.replace('Tabs');

  const detectMyLocation = async (): Promise<void> => {
    setBusy(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        // Not an error state. They said no, which is allowed — send them to
        // type it instead of arguing with them about a system dialog.
        setBusy(false);
        navigation.replace('AddAddress');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = position.coords;

      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude }).catch(() => []);
      const address = toAddress(place);

      if (!address) {
        // A pin with no readable address. The coordinates are the part that
        // matters and they are not lost — AddAddress opens on this pin so the
        // customer only has to supply the words.
        setBusy(false);
        navigation.replace('AddAddress', { latitude, longitude });
        return;
      }

      await api.createAddress({
        label: 'Home',
        line1: address.line1,
        city: address.city,
        latitude,
        longitude,
      });

      done();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Could not read your location. Enter your address instead.',
      );
      setBusy(false);
    }
  };

  return (
    <Screen title="">
      <Toast visible={!!error} message={error ?? ''} tone="danger" onHide={() => setError(null)} />

      <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 20 }}>
        <FadeIn translateY={12}>
          <View style={{ alignItems: 'center', gap: 16 }}>
            <View
              style={{
                width: 84,
                height: 84,
                borderRadius: 42,
                backgroundColor: theme.colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PinIcon color={theme.colors.primary} size={40} />
            </View>
            <AppText variant="h1" center>
              Where should we bring it?
            </AppText>
            <AppText variant="body" color="textMuted" center>
              We use your location to work out the delivery fee and to get the driver to your door.
              You can change it any time.
            </AppText>
          </View>
        </FadeIn>

        <FadeIn translateY={12} delay={80}>
          <View style={{ gap: 12 }}>
            <PrimaryButton
              label={busy ? 'Finding you…' : 'Use my current location'}
              onPress={() => void detectMyLocation()}
              disabled={busy}
            />

            <PressableScale
              accessibilityRole="button"
              onPress={() => navigation.replace('AddAddress')}
              style={{ paddingVertical: 12, alignItems: 'center' }}
            >
              <AppText variant="button" color="primary">
                Enter my address instead
              </AppText>
            </PressableScale>

            {/* A plain, visible choice. A location prompt that traps someone on
                the first screen of a food app loses the order outright. */}
            <PressableScale
              accessibilityRole="button"
              onPress={done}
              style={{ paddingVertical: 8, alignItems: 'center' }}
            >
              <AppText variant="bodySmall" color="textMuted">
                Skip for now
              </AppText>
            </PressableScale>
          </View>
        </FadeIn>

        <FadeIn translateY={12} delay={140}>
          <Card>
            <AppText variant="caption" color="textMuted" center>
              Your location is only used for this order and is never shared with anyone outside the
              restaurant and your driver.
            </AppText>
          </Card>
        </FadeIn>
      </View>
    </Screen>
  );
}
