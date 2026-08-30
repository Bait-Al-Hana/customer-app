import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { Card, PrimaryButton, Screen, TextField } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { ErrorState, PressableScale, Skeleton, Toast } from '../motion';
import { useI18n } from '../i18n';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

export function ProfileScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Profile'>): React.JSX.Element {
  const theme = useTheme();
  const { api, signOut } = useAuth();
  const { t } = useI18n();
  const { data, loading, error, reload } = useAsync(() => api.profile(), []);
  const addresses = useAsync(() => api.listAddresses(), []);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setName(data.fullName ?? '');
      setEmail(data.email ?? '');
    }
  }, [data]);

  const save = async (): Promise<void> => {
    setBusy(true);
    try {
      await api.updateProfile({ fullName: name || undefined, email: email || undefined });
      setSaved(true);
    } catch { /* swallow */ }
    setBusy(false);
  };

  const deleteAddr = async (id: string): Promise<void> => {
    try {
      await api.deleteAddress(id);
      addresses.reload();
    } catch { /* swallow */ }
  };

  return (
    <Screen title={t('profileTitle')} onBack={() => navigation.goBack()}>
      <Toast visible={saved} message={t('profileSaved')} tone="success" onHide={() => setSaved(false)} />
      {loading ? (
        <View style={{ padding: 20, gap: 12 }}>
          <Skeleton height={48} />
          <Skeleton height={48} />
        </View>
      ) : error ? (
        <ErrorState title={t('error')} message={error.message} actionLabel={t('retry')} onAction={reload} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Card>
            <TextField label={t('profileName')} value={name} onChangeText={setName} placeholder="Full name" />
            <TextField label={t('profilePhone')} value={data?.phone ?? ''} onChangeText={() => {}} />
            <TextField label={t('profileEmail')} value={email} onChangeText={setEmail} placeholder="email@example.com" keyboardType="email-address" />
            <PrimaryButton label={t('profileSave')} onPress={save} busy={busy} />
          </Card>

          <Card>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '800', marginBottom: 12 }}>
              {t('myAddresses')}
            </Text>
            {addresses.loading ? (
              <Skeleton height={40} />
            ) : addresses.data && addresses.data.length > 0 ? (
              addresses.data.map((a) => (
                <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{a.label ?? 'Address'}</Text>
                    <Text style={{ color: theme.colors.textMuted }} numberOfLines={1}>{[a.line1, a.city].filter(Boolean).join(', ')}</Text>
                  </View>
                  <PressableScale accessibilityRole="button" onPress={() => deleteAddr(a.id)}>
                    <Text style={{ color: theme.colors.danger, fontWeight: '600' }}>{t('deleteAddress')}</Text>
                  </PressableScale>
                </View>
              ))
            ) : (
              <Text style={{ color: theme.colors.textMuted }}>{t('noAddress')}</Text>
            )}
            <PressableScale accessibilityRole="button" onPress={() => navigation.navigate('AddAddress')} style={{ marginTop: 12 }}>
              <Text style={{ color: theme.colors.accent, fontWeight: '700' }}>{t('addAddress')}</Text>
            </PressableScale>
          </Card>

          <PressableScale
            accessibilityRole="button"
            onPress={() => signOut()}
            style={{
              paddingVertical: 16,
              alignItems: 'center',
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: theme.colors.danger,
            }}
          >
            <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>{t('signOut')}</Text>
          </PressableScale>
        </ScrollView>
      )}
    </Screen>
  );
}
