import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthProvider';
import { PrimaryButton, TextField } from '../components/ui';
import { FadeIn, PressableScale, Stagger, Toast } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

export function OtpScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Otp'>): React.JSX.Element {
  const theme = useTheme();
  const { api, signIn } = useAuth();
  const { phone } = route.params;
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = /^\d{4,8}$/.test(code);

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const tokens = await api.verifyOtp(phone, code);
      await signIn(tokens);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Wrong or expired code. Try again.');
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Toast visible={!!error} message={error ?? ''} tone="danger" onHide={() => setError(null)} />

      {/* Decorative background orbs */}
      <View style={{ position: 'absolute', top: -60, left: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: theme.colors.primary, opacity: 0.05 }} />
      <View style={{ position: 'absolute', bottom: 80, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: theme.colors.secondary, opacity: 0.04 }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center', padding: 28 }}
      >
        <Stagger>
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            {/* Code icon */}
            <FadeIn translateY={10}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: theme.colors.primary + '14',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 24,
                }}
              >
                <Text style={{ fontSize: 32 }}>🔐</Text>
              </View>
            </FadeIn>
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

          <View>
            <TextField
              label="Verification code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={8}
              autoFocus
              placeholder="Enter code"
            />
          </View>

          <View>
            <PrimaryButton label="Verify & sign in" onPress={submit} busy={busy} disabled={!valid} />
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
    </View>
  );
}
