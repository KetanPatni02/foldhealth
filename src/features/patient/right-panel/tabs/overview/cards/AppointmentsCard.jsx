import { useEffect, useState } from 'react';
import { DashboardCard, DashboardCardBody, DashboardCardSkeleton } from '../../../../../../components/DashboardCard/DashboardCard';
import { PanelSectionItem, PanelSectionMore } from '../../../../../../components/PanelSection/PanelSection';
import { useAppStore } from '../../../../../../store/useAppStore';
import { parseLocalDate } from '../../../../../../lib/localDate';
import styles from './overviewCards.module.css';

const VISIBLE = 3;

function DateTile({ date }) {
  const d = parseLocalDate(date);
  if (!d) return <span className={styles.dateTile}><span className={styles.dateMonth}>TBD</span></span>;
  return (
    <span className={styles.dateTile} aria-hidden="true">
      <span className={styles.dateMonth}>{d.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</span>
      <span className={styles.dateDay}>{String(d.getDate()).padStart(2, '0')}</span>
    </span>
  );
}

// Upcoming appointments are stored on the patient's p360_profiles row
// (upcoming_appointments), the same list the P360 banner shows.
export function AppointmentsCard({ patientId }) {
  const profile = useAppStore(s => s.p360ProfilesById[patientId]);
  const fetchP360Profile = useAppStore(s => s.fetchP360Profile);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (patientId && profile === undefined) fetchP360Profile(patientId);
  }, [patientId, profile, fetchP360Profile]);

  if (profile === undefined) return <DashboardCardSkeleton icon="solar:calendar-linear" title="Upcoming Appointments" />;

  const appts = [...(profile?.upcoming_appointments || [])]
    .sort((a, b) => (parseLocalDate(a.date)?.getTime() ?? Infinity) - (parseLocalDate(b.date)?.getTime() ?? Infinity));

  return (
    <DashboardCard
      icon="solar:calendar-linear"
      title="Upcoming Appointments"
      count={appts.length || null}
    >
      <DashboardCardBody>
        {appts.length === 0 ? (
          <p className={styles.empty}>No upcoming appointments.</p>
        ) : appts.slice(0, expanded ? undefined : VISIBLE).map((a, i) => (
          <PanelSectionItem
            key={`${a.date}-${a.type}-${i}`}
            leading={<DateTile date={a.date} />}
            title={a.provider ? `${a.type} with ${a.provider}` : a.type}
            meta={[a.date, a.time, a.program]}
          />
        ))}
        <PanelSectionMore expanded={expanded} hiddenCount={appts.length - VISIBLE} onToggle={() => setExpanded(v => !v)} />
      </DashboardCardBody>
    </DashboardCard>
  );
}
