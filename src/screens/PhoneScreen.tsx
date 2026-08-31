import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthProvider';
import { TextField } from '../components/ui';
import {
  AnimatedGradient,
  AnimatedIcon,
  MotiCard,
  PulseButton,
  ShakeView,
  Stagger,
  Toast,
  TypeWriter,
} from '../motion';
import type { ShakeViewRef } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const LOGO = require('../../assets/logo.jpeg');
const LOGO_ASPECT = 1600 / 384;

export function PhoneScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Phone'>): React.JSX.Element {
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
      setError(e instanceof ApiError ? e.message : 'Could not send the code. Try again.');
      shakeRef.current?.shake();
    } finally {
      setBusy(false);
    }
  };

  const logoWidth = 200;
  const logoHeight = logoWidth / LOGO_ASPECT;

  return (
    <AnimatedGradient style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Toast visible={!!error} message={error ?? ''} tone="danger" onHide={() => setError(null)} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center', padding: 28 }}
      >
        <Stagger>
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <Image
              source={LOGO}
              resizeMode="contain"
              style={{ width: logoWidth, height: logoHeight, marginBottom: 20 }}
              accessible
              accessibilityRole="image"
              accessibilityLabel="Bait Al Hana"
            />
            <View style={{ width: 48, height: 3, borderRadius: 2, backgroundColor: theme.colors.primary, marginBottom: 24 }} />
            <TypeWriter
              text="Welcome back"
              speed={35}
              style={{ color: theme.colors.text, fontSize: 26, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5 }}
            />
            <Text style={{ color: theme.colors.textMuted, fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22, maxWidth: 280 }}>
              Enter your mobile number and we&apos;ll text you a login code.
            </Text>
          </View>

          <ShakeView ref={shakeRef}>
            <MotiCard from="bottom" delay={100}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <AnimatedIcon icon="📱" size={40} delay={200} />
                <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700' }}>
                  Your mobile number
                </Text>
              </View>
              <TextField
                label="Mobile number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={13}
                autoFocus
                placeholder="+9665XXXXXXXX"
              />
            </MotiCard>
          </ShakeView>

          <View style={{ marginTop: 16 }}>
            <PulseButton label="Send code" onPress={submit} busy={busy} disabled={!valid} />
          </View>
        </Stagger>
      </KeyboardAvoidingView>
    </AnimatedGradient>
  );
}
