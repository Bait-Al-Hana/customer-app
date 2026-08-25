import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { Card, PrimaryButton, Screen, TextField } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { ErrorState, PressableScale, Skeleton } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

export function ProfileScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Profile'>): React.JSX.Element {
  const theme = useTheme();
  const { api, signOut } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.profile(), []);

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.fullName) setName(data.fullName);
  }, [data]);

  const dirty = data !== null && name.trim() !== (data.fullName ?? '');

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setSaved(false);
    try {
      await api.updateProfile(trimmed);
      setSaved(true);
      reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="My profile" onBack={() => navigation.goBack()}>
      {loading ? (
        <View style={{ padding: 20, gap: 12 }}>
          <Skeleton height={120} radius={theme.radius.lg} />
          <Skeleton height={80} radius={theme.radius.lg} />
        </View>
      ) : error ? (
        <ErrorState title="Couldn't load profile" message={error.message} actionLabel="Retry" onAction={reload} />
      ) : data ? (
        <View style={{ padding: 16, gap: 16 }}>
          <Card>
            <Text style={{ color: theme.colors.textMuted, fontSize: 11, textTransform: 'uppercase', fontWeight: '600' }}>Phone</Text>
            <Text style={{ color: theme.colors.text, fontSize: 16, marginTop: 4 }}>{data.phone}</Text>
            {data.email ? (
              <>
                <Text style={{ color: theme.colors.textMuted, fontSize: 11, textTransform: 'uppercase', fontWeight: '600', marginTop: 12 }}>Email</Text>
                <Text style={{ color: theme.colors.text, fontSize: 16, marginTop: 4 }}>{data.email}</Text>
              </>
            ) : null}
          </Card>

          <View>
            <TextField label="Display name" value={name} onChangeText={(t) => { setName(t); setSaved(false); }} placeholder="Your name" maxLength={120} />
            {saved ? <Text style={{ color: theme.colors.success, fontSize: 13, marginBottom: 8 }}>Saved</Text> : null}
            <PrimaryButton label="Save" onPress={save} busy={saving} disabled={!dirty || !name.trim()} />
          </View>

          <PressableScale accessibilityRole="button" onPress={() => navigation.navigate('Loyalty')}>
            <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 15 }}>Loyalty points</Text>
              <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>View ›</Text>
            </Card>
          </PressableScale>

          <PressableScale accessibilityRole="button" onPress={signOut} style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text style={{ color: theme.colors.danger, fontWeight: '600', fontSize: 15 }}>Sign out</Text>
          </PressableScale>
        </View>
      ) : null}
    </Screen>
  );
}
