import { useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { DownChevronIcon } from '../../../components/Icon/DownChevronIcon';
import { Button } from '../../../components/Button/Button';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Checkbox } from '../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { ScheduleDrawer } from '../../../components/ScheduleDrawer/ScheduleDrawer';
import { toast } from '../../../components/Toast/Toast';
import { useAppStore } from '../../../store/useAppStore';
import styles from './AppointmentStep.module.css';

// One appointment/reminder row of the Upcoming / Program-related tables.
function ApptRow({ appt }) {
  return (
    <div className={styles.row}>
      <span className={styles.checkCell} onClick={e => e.stopPropagation()}>
        <Checkbox aria-label={`Select ${appt.title}`} />
      </span>
      <span className={styles.titleCell}>
        <span className={styles.titleText}>{appt.title}</span>
        <span className={styles.subtitle}>{appt.subtitle}</span>
      </span>
      <span className={styles.typeCell}>
        {appt.type}
        {appt.recurring && (
          <span className={styles.recurring}><Icon name="solar:refresh-linear" size={12} color="var(--primary-300)" /></span>
        )}
      </span>
      <span className={styles.dateCell}>
        <span>{appt.date}</span>
        <span className={styles.time}>{appt.time}</span>
      </span>
      <span className={styles.assigneeCell}>{appt.assignee}</span>
    </div>
  );
}

function ApptTable({ rows }) {
  return (
    <div className={styles.table}>
      <div className={styles.headRow}>
        <span className={styles.checkCell} />
        <span className={styles.titleCell}>Title</span>
        <span className={styles.typeCell}>Type</span>
        <span className={styles.dateCell}>Date &amp; Time</span>
        <span className={styles.assigneeCell}>Assignee</span>
      </div>
      {rows.map(a => <ApptRow key={a.id} appt={a} />)}
    </div>
  );
}

/**
 * Appointment step (ICT / Follow Up Appointments). Figma E2R1KfF 2358:348528.
 * Shows program-related bookings (matched to the open program) above the
 * Upcoming Appointments & Reminders table; an empty card when the program has
 * no booking yet.
 */
export function AppointmentStep({ patientId, programCode }) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [upcomingOpen, setUpcomingOpen] = useState(true);

  const addedForProgram = useAppStore(s => s.programAddedAppointments[programCode]);
  const addProgramAppointment = useAppStore(s => s.addProgramAppointment);
  const added = addedForProgram || [];

  const all = [...added];
  const programAppts = all.filter(a => a.type === 'Appointment' && a.programCode && a.programCode === programCode);

  const handleScheduled = (row) => {
    if (!row) return;
    addProgramAppointment(programCode, {
      id: `appt-${Date.now()}`,
      title: row.appointment_type_name || 'Appointment',
      subtitle: row.reason_for_visit || row.mode || '',
      type: 'Appointment',
      programCode,
      date: row.date || '',
      time: row.time_start || '',
      assignee: row.primary_user || 'Unassigned',
      recurring: !!row.recurring,
    });
  };

  return (
    <div className={styles.container}>
      {programAppts.length > 0 ? (
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionTitle}>Program related appointments</span>
            <ActionButton icon="solar:add-circle-linear" size="S" tooltip="Schedule appointment" onClick={() => setScheduleOpen(true)} />
          </div>
          <ApptTable rows={programAppts} />
        </div>
      ) : (
        <div className={styles.emptyCard}>
          <span className={styles.iconWrap}>
            <span className={styles.iconInner}>
              <Icon name="solar:calendar-linear" size={22} color="var(--neutral-200)" />
            </span>
          </span>
          <span className={styles.emptyText}>Program Related Appointment Not Scheduled</span>
          <div className={styles.actions}>
            <Button variant="primary" size="L" onClick={() => setScheduleOpen(true)}>Schedule Appointment</Button>
            <Button variant="secondary" size="L" trailingIcon="solar:arrow-right-up-linear" onClick={() => toast.success('Link Appointments — coming soon')}>
              Link Appointments
            </Button>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <button type="button" className={styles.collapseToggle} onClick={() => setUpcomingOpen(o => !o)} aria-expanded={upcomingOpen}>
            <DownChevronIcon size={16} color="var(--neutral-300)" style={upcomingOpen ? undefined : { transform: 'rotate(-90deg)' }} />
            <span className={styles.sectionTitle}>Upcoming Appointments &amp; Reminders</span>
          </button>
          {upcomingOpen && (
            <ActionButton icon="solar:add-circle-linear" size="S" tooltip="Add" onClick={() => setScheduleOpen(true)} />
          )}
        </div>
        {upcomingOpen && (
          all.length > 0
            ? <ApptTable rows={all} />
            : <div className={styles.sectionEmpty}>No upcoming appointments or reminders.</div>
        )}
      </div>

      {scheduleOpen && (
        <ScheduleDrawer initialPatientId={patientId} onClose={() => setScheduleOpen(false)} onSave={handleScheduled} />
      )}
    </div>
  );
}
