import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ApiError } from '../api/http';
import { Address } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { AppText, Badge, Button, Card, Screen } from '../components';
import { PinIcon } from '../components/icons';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, ErrorState, PressableScale, Skeleton, Toast } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

/** Manage saved delivery addresses: view, add and remove. */
export function AddressesScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Addresses'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { data, loading, error, reload } = useAsync<Address[]>(() => api.listAddresses(), []);
  const [toast, setToast] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  useFocusEffect(useCallback(() => reload(), [reload]));

  const remove = async (id: string): Promise<void> => {
    setRemoving(id);
    try {
      await api.deleteAddress(id);
      setToast('Address removed');
      reload();
    } catch (e) {
      setToast(e instanceof ApiError ? e.message : 'Couldn’t remove the address.');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <Screen title="Saved addresses" onBack={() => navigation.goBack()}>
      <Toast visible={!!toast} message={toast ?? ''} tone="neutral" onHide={() => setToast(null)} />
      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[0, 1].map((i) => (
            <Skeleton key={i} height={96} radius={theme.radius.lg} />
          ))}
        </View>
      ) : error ? (
        <ErrorState title="Couldn’t load addresses" message={error.message} actionLabel="Retry" onAction={reload} />
      ) : !data || data.length === 0 ? (
        <View style={{ flex: 1 }}>
          <EmptyState
            glyph="📍"
            title="No saved addresses"
            message="Add a delivery address so we know where to bring your food."
            actionLabel="Add address"
            onAction={() => navigation.navigate('AddAddress')}
          />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}>
          {data.map((a) => (
            <Card key={a.id}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <PinIcon color={theme.colors.primary} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AppText variant="h3" style={{ fontSize: 15 }}>
                      {a.label ?? 'Address'}
                    </AppText>
                    {a.isDefault ? <Badge label="Default" tone="progress" /> : null}
                  </View>
                  <AppText variant="bodySmall" color="textMuted" style={{ marginTop: 4 }}>
                    {[a.line1, a.district, a.city].filter(Boolean).join(', ')}
                  </AppText>
                  {a.notes ? (
                    <AppText variant="caption" color="textMuted" style={{ marginTop: 4 }}>
                      Note: {a.notes}
                    </AppText>
                  ) : null}
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${a.label ?? 'address'}`}
                    disabled={removing === a.id}
                    onPress={() => remove(a.id)}
                    style={{ marginTop: 10, alignSelf: 'flex-start' }}
                  >
                    <AppText variant="bodySmall" weight="700" color="danger">
                      {removing === a.id ? 'Removing…' : 'Remove'}
                    </AppText>
                  </PressableScale>
                </View>
              </View>
            </Card>
          ))}
        </ScrollView>
      )}

      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
        <Button label="Add a new address" onPress={() => navigation.navigate('AddAddress')} />
      </View>
    </Screen>
  );
}
