import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { NavRail } from '@/components/NavRail/NavRail';
import { Button } from '@/components/Button/Button';
import { Icon } from '@/components/Icon/Icon';
import { AvatarBase } from '@/components/Avatar/AvatarBase';
import { useHashRoute } from '../lib/useHashRoute';
import { useProfile } from '../lib/profileContext';
import { initialsOf } from '../lib/profileFormat';
import { HomePage } from '../pages/HomePage';
import { ComingSoonPage } from '../pages/ComingSoonPage';
import { BookVisitDrawer } from '../appointments/BookVisitDrawer';
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
  home: { title: 'Home', render: (p) => <HomePage {...p} /> },
  messages: { title: 'Messages', render: () => <ComingSoonPage icon="solar:chat-round-line-linear" title="Messages" /> },
  settings: { title: 'Settings', render: () => <ComingSoonPage icon="solar:settings-linear" title="Settings" /> },
  help: { title: 'Help', render: () => <ComingSoonPage icon="solar:question-circle-linear" title="Help" /> },
};

export function PatientShell() {
  const { profile } = useProfile();
  const [route, navigate] = useHashRoute('home');
  const [booking, setBooking] = useState(false);
  const [visitsVersion, setVisitsVersion] = useState(0);
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
            <Button variant="primary" size="L" leadingIcon="solar:calendar-add-linear" onClick={() => setBooking(true)}>
              Book Appointment
            </Button>
            <AvatarBase variant="patient" size="M" initials={initialsOf(profile)} />
          </div>
        </header>
        <div className={styles.content}>
          {page.render({ refreshKey: `${profile.member_id}:${visitsVersion}`, onBook: () => setBooking(true) })}
        </div>
      </div>
      {booking && (
        <BookVisitDrawer
          key={profile.member_id}
          profile={profile}
          onClose={() => setBooking(false)}
          onBooked={() => setVisitsVersion((v) => v + 1)}
        />
      )}
    </div>
  );
}
