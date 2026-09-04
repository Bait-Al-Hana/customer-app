import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

interface Props {
  children: React.ReactNode;
  /** Called when the customer taps "Try again", to send them somewhere safe. */
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

/**
 * Catches a render-time exception and shows something the customer can act on.
 *
 * React unmounts the **entire tree** when a render throws and nothing catches
 * it. In a React Native app that is a blank view the customer can only escape
 * by force-quitting, and on a release build there is no red box explaining
 * why. One unexpected null from an API response is enough.
 *
 * This app was the only one of the four without a boundary. The other three
 * each added one after a real blank screen; there was no reason to think the
 * customer app was immune, only that nobody had hit it yet.
 *
 * The fallback says nothing technical. What matters to someone mid-order is
 * that their cart and any placed order are safe, and that there is a way out.
 *
 * It must be a class: `componentDidCatch` / `getDerivedStateFromError` have no
 * hook equivalent.
 *
 * Colours are hard-coded rather than read from the theme on purpose — the theme
 * provider is one of the things that can throw, and a fallback that needs a
 * working provider is no fallback.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // No crash-reporting service is configured and inventing one is not this
    // component's decision, so the trace goes to the console for a dev build.
    console.error("Unhandled render error:", error, info.componentStack);
  }

  private readonly reset = (): void => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  override render(): React.ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Text
            accessibilityRole="header"
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: "#1B1820",
              marginBottom: 8,
            }}
          >
            Something went wrong
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: "#5C5666",
              lineHeight: 22,
              marginBottom: 24,
            }}
          >
            We couldn’t show this screen. Your cart and any order you have
            placed are safe — this is a problem displaying the app, not with
            your order.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={this.reset}
            style={{
              backgroundColor: "#A3195B",
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>
              Try again
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

/**
 * Wraps one screen in its own boundary.
 *
 * The root boundary in `App.tsx` keeps the app off a blank view, but it takes
 * the whole app down with the one screen that threw — the customer loses their
 * place and navigates back from the start. Per screen, the failure stays where
 * it happened and "Try again" returns them to the previous screen, which is
 * almost always one that works.
 *
 * `key`ing on the screen name matters: without it React reuses the boundary
 * instance across screens and a caught error persists onto the next one.
 */
export function withErrorBoundary<P extends { navigation?: { goBack: () => void; canGoBack?: () => boolean } }>(
  name: string,
  Screen: React.ComponentType<P>,
): React.ComponentType<P> {
  function Wrapped(props: P): React.JSX.Element {
    const nav = props.navigation;
    return (
      <ErrorBoundary
        key={name}
        onReset={() => {
          if (nav && (nav.canGoBack ? nav.canGoBack() : true)) {
            nav.goBack();
          }
        }}
      >
        <Screen {...props} />
      </ErrorBoundary>
    );
  }
  Wrapped.displayName = `WithErrorBoundary(${name})`;
  return Wrapped as React.ComponentType<P>;
}
