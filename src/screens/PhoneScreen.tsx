import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useRef, useState } from 'react';
import { Image, Text, View } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const LOGO = require('../../assets/logo.jpeg');

import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthProvider';
import { PrimaryButton, Screen, TextField } from '../components/ui';
import { ShakeView, Toast } from '../motion';
import type { ShakeViewRef } from '../motion';
import { AuthStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

/** Step 1 of OTP login: enter phone, request a code. */
export function PhoneScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Phone'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const [phone, setPhone] = useState('+9665');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shakeRef = useRef<ShakeViewRef>(null);

  const valid = /^\+9665\d{8}$/.test(phone);

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await api.requestOtp(phone);
      navigation.navigate('Otp', { phone });
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.details && e.details.length > 0 ? e.details.join(' ') : e.message);
      } else {
        setError('Could not send the code. Try again.');
      }
      shakeRef.current?.shake();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Sign in">
      <Toast visible={!!error} message={error ?? ''} tone="danger" onHide={() => setError(null)} />
      <View style={{ padding: 20 }}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Image source={LOGO} style={{ width: 200, height: 80 }} resizeMode="contain" accessibilityLabel="بيت الهناء" />
        </View>
        <Text style={{ color: theme.colors.textMuted, fontSize: 15, lineHeight: 22, marginBottom: 24, textAlign: 'center' }}>
          Enter your mobile number and we&apos;ll text you a login code.
        </Text>
        <ShakeView ref={shakeRef}>
          <TextField
            label="Mobile number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={13}
            autoFocus
            placeholder="+9665XXXXXXXX"
          />
        </ShakeView>
        <PrimaryButton label="Send code" onPress={submit} busy={busy} disabled={!valid} />
      </View>
    </Screen>
  );
}
