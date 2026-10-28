import { supabase } from '@/lib/supabase';
import { NavRail } from '@/components/NavRail/NavRail';
import { Button } from '@/components/Button/Button';
import { Icon } from '@/components/Icon/Icon';
import { Tooltip } from '@/components/Tooltip/Tooltip';
import { AvatarBase } from '@/components/Avatar/AvatarBase';
import { useHashRoute } from '../lib/useHashRoute';
import { HomePage } from '../pages/HomePage';
import { ComingSoonPage } from '../pages/ComingSoonPage';
import styles from './PatientShell.module.css';

const NAV = [
  { id: 'home', label: 'Home', icon: 'solar:home-2-linear' },
  { id: 'messages', label: 'Messages', icon: 'solar:chat-round-line-linear' },
  { id: 'settings', label: 'Settings', icon: 'solar:settings-linear' },
];
const FOOTER_NAV = [
  { id: 'help', label: 'Help', icon: 'solar:question-circle-linear' },
  { id: 'logout', label: 'Logout', icon: 'solar:logout-2-linear' },
];
const PAGES = {
  home: { title: 'Home', render: () => <HomePage /> },
  messages: { title: 'Messages', render: () => <ComingSoonPage icon="solar:chat-round-line-linear" title="Messages" /> },
  settings: { title: 'Settings', render: () => <ComingSoonPage icon="solar:settings-linear" title="Settings" /> },
  help: { title: 'Help', render: () => <ComingSoonPage icon="solar:question-circle-linear" title="Help" /> },
};

function initialsOf(user) {
  const name = user.user_metadata?.full_name?.trim();
  if (name) return name.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return (user.email || '?')[0].toUpperCase();
}

export function PatientShell({ user }) {
  const [route, navigate] = useHashRoute('home');
  const page = PAGES[route] || PAGES.home;

  const handleSelect = (id) => {
    if (id === 'logout') supabase.auth.signOut();
    else navigate(id);
  };

  return (
    <div className={styles.shell}>
      <NavRail items={NAV} footerItems={FOOTER_NAV} activeId={PAGES[route] ? route : 'home'} onSelect={handleSelect} />
      <div className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>{page.title}</h1>
          <div className={styles.actions}>
            <button type="button" className={styles.iconButton} aria-label="Notifications">
              <Icon name="solar:bell-linear" size={20} color="var(--neutral-300)" />
            </button>
            <Tooltip label="Booking is coming soon" placement="bottom">
              <Button variant="primary" size="L" leadingIcon="solar:calendar-add-linear" disabled>
                Book Appointment
              </Button>
            </Tooltip>
            <AvatarBase variant="patient" size="M" initials={initialsOf(user)} />
          </div>
        </header>
        <div className={styles.content}>{page.render()}</div>
      </div>
    </div>
  );
}
