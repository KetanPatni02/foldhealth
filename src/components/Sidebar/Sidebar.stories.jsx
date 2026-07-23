import { Sidebar } from './Sidebar';

export default {
  title: 'Navigation/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  argTypes: {},
};

/**
 * Sidebar is store-driven — it reads the active page, theme, and unread
 * message count from `useAppStore` and dispatches navigation through the same
 * store. There are no props to configure; it simply renders in place.
 */
export const Playground = {
  render: () => (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: 24, color: 'var(--neutral-300)', fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
        App content sits to the right of the sidebar.
      </div>
    </div>
  ),
};

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: 24, fontFamily: "'Inter', sans-serif" }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--neutral-500)', marginBottom: 8 }}>
          Global left rail
        </div>
        <p style={{ fontSize: 13, color: 'var(--neutral-300)', lineHeight: 1.6, maxWidth: 520 }}>
          Ten primary nav items (Home, Population, Calendar, Tasks, Messages, Calls,
          Leads, Campaign, Analytics, Settings) with the active page rendered as the
          filled bold variant of each Solar icon. The messages badge reflects unread
          count from the store. Swap the app theme via the profile popover to see the
          alt Foldhealth mark render at the top.
        </p>
      </div>
    </div>
  ),
};
