import { router } from 'expo-router';
import { useEffect } from 'react';

import { useStore } from '@/lib/store';

/**
 * Ensures a property is "open" before showing a property-scoped tab.
 * If none is active, sends landlords back to the property list and tenants
 * to their (auto-selected) property. Returns the active property id (or null
 * while redirecting).
 */
export function useActiveProperty(): {
  activePropertyId: string | null;
  ready: boolean;
} {
  const activePropertyId = useStore((s) => s.activePropertyId);
  const role = useStore((s) => s.role);
  const hydrated = useStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    if (!activePropertyId && role === 'landlord') {
      router.replace('/properties');
    }
  }, [hydrated, activePropertyId, role]);

  return { activePropertyId, ready: !!activePropertyId };
}
