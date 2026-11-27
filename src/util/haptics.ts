/**
 * Haptic feedback — a thin, fail-safe wrapper over `expo-haptics`.
 *
 * Haptics are a delight accent, never load-bearing: they reinforce an action
 * the UI already confirms visually (a cart badge pops, a success view appears).
 * So every call here is best-effort and swallows errors, and the whole module
 * no-ops on web (where the Expo haptics API is not meaningful) — a missing or
 * unsupported haptic must never surface as an error to the customer.
 *
 * Kept out of the render path on purpose: screens call these imperatively in
 * their event handlers, so there is nothing to mock when a component mounts.
 */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/** A light tap — for a confirmed micro-action, e.g. add-to-cart. */
export function hapticLight(): void {
  if (Platform.OS === 'web') {
    return;
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
    // Best-effort: a device without a taptic engine, or a transient failure,
    // is not the customer's problem and must not throw.
  });
}

/** A success notification pattern — for a completed, celebratory moment. */
export function hapticSuccess(): void {
  if (Platform.OS === 'web') {
    return;
  }
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
