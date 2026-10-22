import { useEffect, useState } from 'react';
import { DashboardCard, DashboardCardBody, DashboardCardSkeleton } from '../../../../../../components/DashboardCard/DashboardCard';
import { PanelSectionItem, PanelSectionMore } from '../../../../../../components/PanelSection/PanelSection';
import { ScheduleDrawer } from '../../../../../../components/ScheduleDrawer/ScheduleDrawer';
import { parseLocalDate } from '../../../../../../lib/localDate';
import { useAppStore } from '../../../../../../store/useAppStore';
import { appointmentForDrawer } from './overviewItemActions';
import { useP360Profile } from './useP360Profile';
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
// (upcoming_appointments), the same list the P360 banner shows. A click
// opens that visit in the appointment drawer, using the calendar row when
// one matches so status changes persist.
export function AppointmentsCard({ patientId, patient }) {
  const profile = useP360Profile(patientId);
  const appointments = useAppStore(s => s.appointments);
  const fetchAppointments = useAppStore(s => s.fetchAppointments);
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(null);

  useEffect(() => { fetchAppointments?.(); }, [fetchAppointments]);

  if (profile === undefined) return <DashboardCardSkeleton icon="solar:calendar-linear" title="Upcoming Appointments" />;

  const appts = [...(profile?.upcoming_appointments || [])]
    .sort((a, b) => (parseLocalDate(a.date)?.getTime() ?? Infinity) - (parseLocalDate(b.date)?.getTime() ?? Infinity));

  const openAppointment = (a) => {
    setOpen(appointmentForDrawer(a, {
      patientId,
      patientName: patient?.name,
      appointments,
    }));
  };

  return (
    <DashboardCard
      icon="solar:calendar-linear"
      title="Upcoming Appointments"
      count={appts.length || null}
    >
      <DashboardCardBody className={styles.listBody}>
        {appts.length === 0 ? (
          <p className={styles.empty}>No upcoming appointments.</p>
        ) : appts.slice(0, expanded ? undefined : VISIBLE).map((a, i) => (
          <div key={`${a.date}-${a.type}-${i}`} className={styles.clickRow}>
            <PanelSectionItem
              inset
              leading={<DateTile date={a.date} />}
              title={(
                <button type="button" className={`${styles.titleButton} ${styles.stretch}`} onClick={() => openAppointment(a)}>
                  {a.provider ? `${a.type} with ${a.provider}` : a.type}
                </button>
              )}
              meta={[a.date, a.time, a.program]}
            />
          </div>
        ))}
        <PanelSectionMore expanded={expanded} hiddenCount={appts.length - VISIBLE} onToggle={() => setExpanded(v => !v)} />
      </DashboardCardBody>
      {open && (
        <ScheduleDrawer
          existingAppointment={open}
          initialPatientId={patientId}
          source="patient_overview"
          onClose={() => setOpen(null)}
        />
      )}
    </DashboardCard>
  );
}
