import React, { useEffect, useState } from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';

import { useReducedMotion } from '../useReducedMotion';
import { useTheme } from '../../theme/theme';

export interface TypeWriterProps {
  text: string;
  speed?: number;
  style?: StyleProp<TextStyle>;
  onFinish?: () => void;
}

export function TypeWriter({
  text,
  speed = 40,
  style,
  onFinish,
}: TypeWriterProps): React.JSX.Element {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [displayed, setDisplayed] = useState(reduced ? text : '');

  useEffect(() => {
    if (reduced) {
      setDisplayed(text);
      onFinish?.();
      return;
    }
    setDisplayed('');
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        onFinish?.();
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed, reduced, onFinish]);

  return (
    <Text style={[{ color: theme.colors.text, fontSize: 16 }, style]}>
      {displayed}
      {displayed.length < text.length && !reduced ? (
        <Text style={{ opacity: 0.5 }}>|</Text>
      ) : null}
    </Text>
  );
}
