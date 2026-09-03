import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';

/**
 * The web build's map.
 *
 * `react-native-maps` is native-only: it reaches into `react-native/Libraries`
 * by deep path for the codegen'd native commands, and those files have no web
 * variant — so importing it at all breaks the web bundle. Metro resolves
 * `.web.tsx` ahead of `.tsx` for `platform=web`, so this file simply replaces
 * the native one there and `react-native-maps` never enters the graph.
 *
 * It renders a placeholder rather than a blank box, matching what the app
 * already shows when no Maps key is configured: the map is the one part of the
 * screen that degrades, and everything around it — the address, the driver, the
 * order — still works. Web is a development and demo surface here; the shipped
 * customer app is the native build, where the real map is used.
 *
 * The exported types and `DEFAULT_REGION` mirror `AppMap.tsx` exactly, so a
 * screen importing either gets the same API.
 */

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  /** A tint hint the map may use for the pin. */
  kind?: 'customer' | 'driver' | 'branch';
}

export interface AppMapProps {
  region: Region;
  markers?: MapMarker[];
  onPress?: (coord: { latitude: number; longitude: number }) => void;
  onRegionChangeComplete?: (region: Region) => void;
  scrollEnabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppMap({ markers = [], style }: AppMapProps): React.JSX.Element {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Map preview is not available in the web build"
      style={[
        {
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F0EAEE',
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 28 }}>🗺️</Text>
      <Text style={{ color: '#5C5666', fontWeight: '700', marginTop: 6 }}>Map unavailable on web</Text>
      {markers.length > 0 ? (
        <Text style={{ color: '#5C5666', fontSize: 12, marginTop: 2 }}>
          {markers.length} location{markers.length === 1 ? '' : 's'}
        </Text>
      ) : null}
    </View>
  );
}

/** A sensible default region (Riyadh) when we have no coordinate yet. */
export const DEFAULT_REGION: Region = {
  latitude: 24.7136,
  longitude: 46.6753,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};
