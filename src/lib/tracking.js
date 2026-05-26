/**
 * Analytics + breadcrumb tracking — single fan-out helper.
 *
 * One `track(name, props?)` call fires to both:
 *   1. Vercel Analytics  → Custom Events in the Vercel dashboard
 *   2. Sentry            → breadcrumb attached to any future error
 *
 * Naming convention:
 *   `feature.action` — lowercase, dot-separated, past-tense verb.
 *   Sub-noun allowed when needed: `email.block_added`, `agent.flow_saved`.
 *   No spaces, no colons, no PascalCase.
 *
 * PHI policy:
 *   Never put patient names, DOB, emails, phone numbers, or freeform
 *   note text into `props`. Opaque IDs only (`patientId`, `goalId`,
 *   `memberId`, etc.).
 *
 * Canonical event names live in /Users/alokk/.claude/plans/i-want-you-to-wondrous-sparrow.md.
 */
import { track as vercelTrack } from '@vercel/analytics';
import * as Sentry from '@sentry/react';
import { useAppStore } from '../store/useAppStore';

const isDev = import.meta.env.DEV;

// Auto-attached to every event. Kept narrow — just enough context to slice
// dashboards by current location without leaking domain data.
function defaultProps() {
  try {
    const s = useAppStore.getState();
    return {
      page: s.activePage || null,
      tab: s.activeTab || null,
      list: s.activeSubnavList || null,
    };
  } catch {
    return {};
  }
}

export function track(name, props = {}) {
  const payload = { ...defaultProps(), ...props };

  // Both transports are wrapped — an analytics outage must never throw
  // into product code.
  try {
    vercelTrack(name, payload);
  } catch (e) {
    if (isDev) console.warn('[track] vercel failed', e);
  }
  try {
    Sentry.addBreadcrumb({
      category: 'user-action',
      type: 'user',
      level: 'info',
      message: name,
      data: payload,
    });
  } catch (e) {
    if (isDev) console.warn('[track] sentry failed', e);
  }

  if (isDev) console.debug('[track]', name, payload);
}
