/**
 * Formats "which build is this?" for the screen.
 *
 * ## Why a build marker exists at all
 *
 * `admin-app` grew one after a change was merged, its CI went green, and nobody
 * could tell whether the panel in front of them contained it — its Vercel
 * project had stopped deploying and nothing on screen said so. This app met the
 * same wall from the other side: a real crash on the tracking screen was fixed
 * and verified in a browser, and the only remaining question — "is the build I
 * am looking at the fixed one?" — could not be answered by anyone looking at
 * the app.
 *
 * That question is the expensive one. Until it is settled, a stale bundle and a
 * live bug are indistinguishable, and every round of diagnosis starts by
 * re-proving code that was already correct.
 *
 * ## Why this file imports nothing
 *
 * The values come from `expo-constants`, which is part of the React Native
 * module graph and cannot be loaded by the pure logic suite. So the read lives
 * in `src/version.ts` and the formatting lives here, taking its inputs as
 * arguments — the same split `driver-app/src/util/navigationUrl.ts` makes for
 * `Platform`, and for the same reason: a marker that renders "Invalid Date"
 * destroys trust in the one signal meant to settle an argument, and that is not
 * something a render test would ever catch.
 */

/**
 * "a3f9c21 · today 14:23" — enough to compare against a merge without asking
 * anyone to read an ISO string.
 *
 * `now` is an argument so the relative part is testable. A build older than
 * today drops the "today" shorthand for a date, because that is where the
 * question changes from "did my change land" to "how stale is this".
 *
 * An absent or unparseable timestamp falls back to the commit alone rather than
 * printing a broken date.
 */
export function buildLabel(sha: string, builtAt: string, now: Date = new Date()): string {
  const when = builtAt ? new Date(builtAt) : null;
  if (!when || Number.isNaN(when.getTime())) {
    return sha;
  }

  const time = when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const sameDay = when.toDateString() === now.toDateString();
  if (sameDay) {
    return `${sha} · today ${time}`;
  }

  const date = when.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${sha} · ${date} ${time}`;
}
