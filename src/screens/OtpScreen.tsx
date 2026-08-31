import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthProvider';
import { TextField } from '../components/ui';
import {
  AnimatedGradient,
  AnimatedIcon,
  MotiCard,
  PressableScale,
  PulseButton,
  ShakeView,
  Stagger,
  Toast,
} from '../motion';
import type { ShakeViewRef } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

export function OtpScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Otp'>): React.JSX.Element {
  const theme = useTheme();
  const { api, signIn } = useAuth();
  const { phone } = route.params;
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shakeRef = useRef<ShakeViewRef>(null);

  const valid = /^\d{4,8}$/.test(code);

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const tokens = await api.verifyOtp(phone, code);
      await signIn(tokens);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Wrong or expired code. Try again.');
      shakeRef.current?.shake();
      setBusy(false);
    }
  };

  return (
    <AnimatedGradient style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Toast visible={!!error} message={error ?? ''} tone="danger" onHide={() => setError(null)} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center', padding: 28 }}
      >
        <Stagger>
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <AnimatedIcon icon="🔐" size={72} delay={0} bounce />
            <View style={{ height: 24 }} />
            <Text style={{ color: theme.colors.text, fontSize: 26, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5 }}>
              Enter your code
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
              We sent a verification code to
            </Text>
            <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '700', marginTop: 4 }}>
              {phone}
            </Text>
          </View>

          <ShakeView ref={shakeRef}>
            <MotiCard from="bottom" delay={100}>
              <TextField
                label="Verification code"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={8}
                autoFocus
                placeholder="Enter code"
              />
            </MotiCard>
          </ShakeView>

          <View style={{ marginTop: 16 }}>
            <PulseButton label="Verify & sign in" onPress={submit} busy={busy} disabled={!valid} />
          </View>

          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <PressableScale accessibilityRole="button" onPress={() => navigation.goBack()}>
              <Text style={{ color: theme.colors.accent, fontWeight: '600', fontSize: 15 }}>
                ← Change number
              </Text>
            </PressableScale>
          </View>
        </Stagger>
      </KeyboardAvoidingView>
    </AnimatedGradient>
  );
}
