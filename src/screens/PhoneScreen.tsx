import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';

const LOGO = require('../../assets/logo.jpeg');

import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthProvider';
import { PrimaryButton, Screen, TextField } from '../components/ui';
import { Toast } from '../motion';
import { AuthStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

/** Step 1 of OTP login: enter phone, request a code. */
export function PhoneScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Phone'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const [phone, setPhone] = useState('+9665');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = /^\+9665\d{8}$/.test(phone);

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await api.requestOtp(phone);
      navigation.navigate('Otp', { phone });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send the code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Sign in">
      <Toast visible={!!error} message={error ?? ''} tone="danger" onHide={() => setError(null)} />
      <View style={{ padding: 20 }}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Image source={LOGO} style={{ width: 96, height: 96, borderRadius: 16 }} resizeMode="contain" />
          <Text style={{ marginTop: 12, fontSize: 22, fontWeight: '700', color: theme.colors.text }}>Bait Al Hana</Text>
        </View>
        <Text style={{ color: theme.colors.textMuted, fontSize: 15, lineHeight: 22, marginBottom: 24, textAlign: 'center' }}>
          Enter your mobile number and we’ll text you a login code.
        </Text>
        <TextField
          label="Mobile number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={13}
          autoFocus
          placeholder="+9665XXXXXXXX"
        />
        <PrimaryButton label="Send code" onPress={submit} busy={busy} disabled={!valid} />
      </View>
    </Screen>
  );
}
