import React from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../../theme/theme';
import { FadeIn } from './FadeIn';

export interface SectionTitleProps {
  title: string;
  delay?: number;
}

/**
 * A category or section heading with a short brand-coloured accent bar
 * and a gentle fade-in entrance.
 */
export function SectionTitle({ title, delay = 0 }: SectionTitleProps): React.JSX.Element {
  const theme = useTheme();
  return (
    <FadeIn translateY={6} delay={delay}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <View
          style={{
            width: 4,
            height: 22,
            borderRadius: 2,
            backgroundColor: theme.colors.primary,
          }}
        />
        <Text style={{ color: theme.colors.text, fontSize: 19, fontWeight: '800' }}>
          {title}
        </Text>
      </View>
    </FadeIn>
  );
}
