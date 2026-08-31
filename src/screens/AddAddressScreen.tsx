import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { Region } from 'react-native-maps';

import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthProvider';
import { Card, PrimaryButton, Screen, TextField } from '../components/ui';
import { AppMap, DEFAULT_REGION } from '../maps/AppMap';
import { FadeIn, PressableScale, Stagger, Toast } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

export function AddAddressScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'AddAddress'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const [label, setLabel] = useState('Home');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('Riyadh');
  const [notes, setNotes] = useState('');
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const useMyLocation = async (): Promise<void> => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. Drop a pin on the map instead.');
        setLocating(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setPin(next);
      setRegion({ ...next, latitudeDelta: 0.01, longitudeDelta: 0.01 });
    } catch {
      setError('Couldn’t get your location. Drop a pin on the map instead.');
    } finally {
      setLocating(false);
    }
  };

  const save = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await api.createAddress({
        label,
        line1,
        city,
        notes: notes || undefined,
        latitude: pin?.latitude,
        longitude: pin?.longitude,
      });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the address.');
      setBusy(false);
    }
  };

  const valid = line1.trim().length > 0 && city.trim().length > 0;

  return (
    <Screen title="Add address" onBack={() => navigation.goBack()}>
      <Toast visible={!!error} message={error ?? ''} tone="danger" onHide={() => setError(null)} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Map section */}
        <FadeIn translateY={10}>
          <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
            <View style={{ height: 220 }}>
              <AppMap
                region={region}
                onRegionChangeComplete={setRegion}
                onPress={(coord) => setPin(coord)}
                markers={pin ? [{ id: 'pin', ...pin, kind: 'customer', title: 'Delivery here' }] : []}
              />
            </View>
            <View style={{ padding: 14 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <PressableScale
                  accessibilityRole="button"
                  onPress={useMyLocation}
                  disabled={locating}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 10,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.accent + '14',
                    opacity: locating ? 0.6 : 1,
                  }}
                >
                  <Text style={{ fontSize: 15 }}>📍</Text>
                  <Text style={{ color: theme.colors.accent, fontWeight: '700', fontSize: 14 }}>
                    {locating ? 'Locating...' : 'Use my location'}
                  </Text>
                </PressableScale>
                {pin ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: theme.radius.md,
                      backgroundColor: theme.colors.success + '14',
                    }}
                  >
                    <Text style={{ color: theme.colors.success, fontWeight: '700', fontSize: 13 }}>Pin set ✓</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Card>
        </FadeIn>

        {/* Address form */}
        <Stagger step={50}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <View style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: theme.colors.primary }} />
              <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '800' }}>Address details</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <TextField label="Label" value={label} onChangeText={setLabel} maxLength={60} />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="City" value={city} onChangeText={setCity} />
            </View>
          </View>

          <View>
            <TextField label="Street & building" value={line1} onChangeText={setLine1} placeholder="Street, building, apartment" />
          </View>

          <View>
            <TextField label="Notes for driver (optional)" value={notes} onChangeText={setNotes} maxLength={500} />
          </View>

          <View>
            <PrimaryButton label="Save address" onPress={save} busy={busy} disabled={!valid} />
          </View>
        </Stagger>
      </ScrollView>
    </Screen>
  );
}
