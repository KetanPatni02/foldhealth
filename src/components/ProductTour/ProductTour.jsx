import { useState, useCallback, useEffect } from 'react';
import { Joyride, STATUS, ACTIONS } from 'react-joyride';
import { TourTooltip } from './TourTooltip';
import {
  getLocalSeenTours,
  markLocalTourSeen,
  getUserId,
  getDbSeenTours,
  markDbTourSeen,
} from './ProductTour.utils';

/**
 * ProductTour — wraps React Joyride with Fold Health design system.
 * Tour state is persisted to Supabase (cross-device) with localStorage fallback.
 */
export function ProductTour({ tourId, steps, run = true, onFinish, continuous = true }) {
  const [running, setRunning] = useState(false);
  const [checked, setChecked] = useState(false);

  // Check both local and DB on mount
  useEffect(() => {
    if (!run) { setChecked(true); return; }

    // Quick local check first (instant, no flicker)
    const localSeen = getLocalSeenTours();
    if (localSeen[tourId]) { setChecked(true); return; }

    // Then check DB for cross-device persistence
    let cancelled = false;
    (async () => {
      const userId = await getUserId();
      if (cancelled) return;
      if (userId) {
        const dbSeen = await getDbSeenTours(userId);
        if (cancelled) return;
        if (dbSeen[tourId]) {
          // Sync to local so next check is instant
          markLocalTourSeen(tourId);
          setChecked(true);
          return;
        }
      }
      // Not seen anywhere — show the tour
      setRunning(true);
      setChecked(true);
    })();
    return () => { cancelled = true; };
  }, [tourId, run]);

  // Mark as seen immediately when tour starts (both local + DB)
  useEffect(() => {
    if (!running) return;
    markLocalTourSeen(tourId);
    (async () => {
      const userId = await getUserId();
      if (userId) markDbTourSeen(userId, tourId);
    })();
  }, [running, tourId]);

  const handleCallback = useCallback((data) => {
    const { status, action } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED || action === ACTIONS.CLOSE) {
      setRunning(false);
      onFinish?.();
    }
  }, [onFinish]);

  if (!checked || !running || !steps?.length) return null;

  return (
    <Joyride
      steps={steps}
      run={running}
      continuous={continuous}
      showSkipButton
      showProgress={false}
      disableOverlayClose={false}
      disableScrolling={false}
      spotlightClicks
      callback={handleCallback}
      tooltipComponent={TourTooltip}
      // react-joyride v3 API: zIndex/overlayColor moved from styles.options
      // to the options prop, and spotlight rounding is the spotlightRadius
      // option — styles.spotlight is spread as props onto an SVG <path>, so
      // borderRadius there hits the DOM and triggers a React warning.
      options={{
        zIndex: 10000,
        overlayColor: 'rgba(0, 0, 0, 0.35)',
        spotlightRadius: 8,
      }}
      floaterProps={{
        disableAnimation: true,
      }}
    />
  );
}
