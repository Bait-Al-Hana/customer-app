import React from 'react';
import { AnimatePresence } from 'moti';

export interface AnimatePresenceWrapperProps {
  children: React.ReactNode;
  exitBeforeEnter?: boolean;
}

export function AnimatePresenceWrapper({
  children,
  exitBeforeEnter,
}: AnimatePresenceWrapperProps): React.JSX.Element {
  return (
    <AnimatePresence exitBeforeEnter={exitBeforeEnter}>
      {children}
    </AnimatePresence>
  );
}
