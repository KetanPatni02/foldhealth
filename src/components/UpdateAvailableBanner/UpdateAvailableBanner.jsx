import { Icon } from '../Icon/Icon';
import { Button } from '../Button/Button';
import { useAppStore } from '../../store/useAppStore';

// Renders a thin strip at the very top of the app when a new build has
// been detected. Prompts a hard refresh so users don't run into the
// stale-chunk white-screen after a deploy lands mid-session.
// Inline styles here mirror DegradedBanner's pattern; the shared Button
// handles the white-on-purple CTA colors via the design system.
export function UpdateAvailableBanner() {
  const hasNewBuild = useAppStore(s => s.hasNewBuild);
  if (!hasNewBuild) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 16px',
      background: 'var(--primary-50)',
      borderBottom: '1px solid rgba(140, 90, 226, 0.2)',
      fontSize: 13,
      color: 'var(--primary-300)',
      fontWeight: 500,
      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
    }}>
      <Icon name="solar:refresh-circle-linear" size={16} />
      A new version of Fold Health is available.
      <span style={{ fontWeight: 400, fontSize: 12, marginLeft: 4, color: 'var(--neutral-400)' }}>
        Refresh to load the latest — leaving this tab on the old build can cause blank screens on navigation.
      </span>
      <Button
        variant="primary"
        size="S"
        onClick={() => window.location.reload()}
        style={{ marginLeft: 'auto' }}
      >
        Refresh
      </Button>
    </div>
  );
}
