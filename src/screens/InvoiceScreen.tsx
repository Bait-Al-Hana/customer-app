import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useAuth } from '../auth/AuthProvider';
import { Card, Screen } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { ErrorState, Skeleton } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { formatSar } from '../util/money';
import { useTheme } from '../theme/theme';

/**
 * The customer's digital ZATCA tax invoice for one order.
 *
 * The invoice is issued by RestoPOS, not this app — we render what it returned:
 * the QR (a TLV/base64 ZATCA payload), the serial number, the VAT-inclusive
 * totals and whether it has been reported to ZATCA yet. It says plainly that it
 * **is a tax invoice**, because it is one. A 404 means the invoice has not been
 * issued yet (the order is not paid), which is a normal, explained state — not
 * an error the customer did anything about.
 */
export function InvoiceScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Invoice'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { orderId } = route.params;
  const { data, loading, error, reload } = useAsync(() => api.taxInvoice(orderId), [orderId]);

  return (
    <Screen title="Tax invoice" onBack={() => navigation.goBack()}>
      {loading && !data ? (
        <Skeleton height={280} />
      ) : error ? (
        // The most common "error" is a 404 before payment settles — phrase it as
        // a state, not a failure, and offer a retry for a genuine hiccup.
        <ErrorState
          title="Invoice not ready yet"
          message="Your tax invoice appears here once your payment is confirmed."
          actionLabel="Check again"
          onAction={reload}
        />
      ) : data ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          <Card>
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text }}>
              This is a tax invoice
            </Text>
            <Text style={{ color: theme.colors.textMuted, marginTop: 2 }}>
              Simplified tax invoice · {data.serialNumber}
            </Text>

            {data.qr ? (
              <View style={{ alignItems: 'center', marginTop: 16 }}>
                <View style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }}>
                  <QRCode value={data.qr} size={200} />
                </View>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 8 }}>
                  Scan to verify (ZATCA)
                </Text>
              </View>
            ) : null}
          </Card>

          <Card>
            <Row label="Branch" value={data.branchName} theme={theme} />
            <Row label="Order" value={`#${data.orderNumber}`} theme={theme} />
            <Row label="Reference" value={data.referenceId} theme={theme} />
            <Row label="Subtotal (excl. VAT)" value={formatSar(data.totalExclusiveMinor)} theme={theme} />
            <Row label="VAT (15%)" value={formatSar(data.totalVatMinor)} theme={theme} />
            <Row label="Total" value={formatSar(data.totalInclusiveMinor)} theme={theme} strong />
            <Row label="ZATCA status" value={statusLabel(data.submissionStatus)} theme={theme} />
            <Row
              label="Issued"
              value={new Date(data.issuedAt).toLocaleString()}
              theme={theme}
            />
          </Card>
        </ScrollView>
      ) : null}
    </Screen>
  );
}

function Row({
  label,
  value,
  theme,
  strong,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>;
  strong?: boolean;
}): React.JSX.Element {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: theme.colors.textMuted }}>{label}</Text>
      <Text
        style={{
          color: theme.colors.text,
          fontWeight: strong ? '700' : '500',
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case 'REPORTED':
      return 'Reported to ZATCA';
    case 'CLEARED':
      return 'Cleared by ZATCA';
    case 'FAILED':
      return 'Reporting failed';
    default:
      return 'Being reported';
  }
}
