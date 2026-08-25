import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { Card, Screen } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { EmptyState, ErrorState, PressableScale, Skeleton, Stagger } from '../motion';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/theme';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Notifications'>): React.JSX.Element {
  const theme = useTheme();
  const { api } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.notifications(), []);
  const items = data?.data ?? [];

  return (
    <Screen title="Notifications" onBack={() => navigation.goBack()}>
      {loading ? (
        <View style={{ padding: 20, gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={72} radius={theme.radius.lg} />
          ))}
        </View>
      ) : error ? (
        <ErrorState title="Couldn't load notifications" message={error.message} actionLabel="Retry" onAction={reload} />
      ) : items.length === 0 ? (
        <EmptyState title="No notifications" message="You're all caught up." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          <Stagger>
            {items.map((n) => (
              <PressableScale
                key={n.id}
                accessibilityRole="button"
                onPress={() => {
                  if (n.orderId) navigation.navigate('OrderTracking', { orderId: n.orderId });
                }}
              >
                <Card>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '700', flex: 1 }} numberOfLines={1}>{n.title}</Text>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 11, marginLeft: 8 }}>{timeAgo(n.createdAt)}</Text>
                  </View>
                  <Text style={{ color: theme.colors.textMuted, marginTop: 4, fontSize: 14 }} numberOfLines={2}>{n.body}</Text>
                </Card>
              </PressableScale>
            ))}
          </Stagger>
        </ScrollView>
      )}
    </Screen>
  );
}
