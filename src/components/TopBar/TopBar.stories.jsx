import { TopBar } from './TopBar';

export default {
  title: 'Navigation/TopBar',
  component: TopBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'App-wide top bar — breadcrumbs, patient search, Ask Unity, Notifications, Create New popover, Schedule drawer trigger, profile popover. Store-driven — no props.',
      },
    },
  },
};

/**
 * TopBar is store-driven — breadcrumbs, patient search, notifications,
 * Create New, Schedule, and the profile popover all wire directly to
 * `useAppStore` and Supabase auth. There are no props to configure.
 */
export const Playground = {
  render: () => (
    <div style={{ minHeight: '100vh', background: 'var(--neutral-0)' }}>
      <TopBar />
      <div style={{ padding: 24, color: 'var(--neutral-300)', fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
        App content sits below the top bar.
      </div>
    </div>
  ),
};

export const AllExamples = {
  render: () => (
    <div style={{ minHeight: '100vh', background: 'var(--neutral-0)' }}>
      <TopBar />
      <div style={{ padding: 24, fontFamily: "'Inter', sans-serif" }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--neutral-500)', marginBottom: 8 }}>
          Global top bar
        </div>
        <p style={{ fontSize: 13, color: 'var(--neutral-300)', lineHeight: 1.6, maxWidth: 640 }}>
          Left: breadcrumb driven by the active page and sub-nav list. Center:
          patient search and the "Ask Unity" pill. Right: notifications bell
          (with unread dot), "Create New" popover, "Schedule" drawer trigger,
          and the profile avatar with role switcher.
        </p>
      </div>
    </div>
  ),
};
