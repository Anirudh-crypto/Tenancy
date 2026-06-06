import { router } from 'expo-router';

type ReplaceHref = Parameters<typeof router.replace>[0];

/**
 * Custom header buttons should return to the screen that owns the current flow.
 * Browser/native history can include auth redirects, which makes router.back()
 * feel like a no-op after protected-route redirects.
 */
export function goBackTo(fallback: ReplaceHref) {
  router.replace(fallback);
}
