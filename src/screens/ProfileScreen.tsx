import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthProvider';
import { AppText, Button, Card, Screen, TextField } from '../components';
import { useAsync } from '../hooks/useAsync';
import { ErrorState, Skeleton, Toast } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

/** View and edit the customer's own profile. Name is editable; phone is view-only. */
export function ProfileScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Profile'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.getProfile(), []);

  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [tone, setTone] = useState<'success' | 'danger'>('success');

  // Seed the name field once, when the profile first loads.
  const seeded = React.useRef(false);
  if (data && !seeded.current) {
    seeded.current = true;
    setName(data.fullName ?? '');
  }

  const dirty = data != null && name.trim().length > 0 && name.trim() !== (data.fullName ?? '');

  const save = async (): Promise<void> => {
    if (!dirty) {
      return;
    }
    setBusy(true);
    try {
      await api.updateProfile({ fullName: name.trim() });
      setTone('success');
      setToast('Profile updated.');
      reload();
    } catch (e) {
      setTone('danger');
      setToast(e instanceof ApiError ? e.message : 'Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Profile" onBack={() => navigation.goBack()}>
      <Toast visible={!!toast} message={toast ?? ''} tone={tone} onHide={() => setToast(null)} />
      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton height={72} radius={theme.radius.lg} />
          <Skeleton height={120} radius={theme.radius.lg} />
        </View>
      ) : error ? (
        <ErrorState title="Couldn’t load profile" message={error.message} actionLabel="Retry" onAction={reload} />
      ) : data ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          <Card>
            <TextField label="Name" value={name} onChangeText={setName} placeholder="Your name" maxLength={120} />
            <AppText variant="caption" color="textMuted" weight="600" style={{ marginBottom: 6 }}>
              Phone
            </AppText>
            <AppText variant="body">{data.phone}</AppText>
            <AppText variant="caption" color="textMuted" style={{ marginTop: 6 }}>
              Your phone is your login and can’t be changed here.
            </AppText>
          </Card>

          <Button label="Save changes" onPress={save} busy={busy} disabled={!dirty} />
        </ScrollView>
      ) : null}
    </Screen>
  );
}
