import { Badge } from '../../../components/Badge/Badge';
import { Tooltip } from '../../../components/Tooltip/Tooltip';
import { apptDate } from './cisAppointments';
import { fmtDate } from './cisStatusConfig';
import styles from './DoseAppointmentChip.module.css';

/**
 * A booked vaccine appointment on a dose: "Scheduled <date>" before the
 * visit, "Confirm <date>" once it has passed with the dose still
 * unrecorded. Click to edit or cancel the appointment.
 *
 * @param {object}   props
 * @param {{ appt: object, passed: boolean } | null} props.match – appointmentForDose()
 * @param {function} props.onOpen – (appt) => void
 */
export function DoseAppointmentChip({ match, onOpen }) {
  if (!match) return null;
  const { appt, passed } = match;
  const date = fmtDate(apptDate(appt));
  // Short on the chip so it fits the date column; the tooltip has the year.
  const short = date.slice(0, 5);
  const tip = [
    `${passed ? 'Appointment was on' : 'Appointment on'} ${date}${appt.time ? ` at ${appt.time}` : ''}`,
    appt.provider,
    passed ? 'Record the date given, or reschedule.' : null,
    appt.bookedByName ? `Booked by ${appt.bookedByName}` : null,
  ].filter(Boolean).join('. ');
  return (
    <Tooltip label={tip} variant="light" maxWidth={260}>
      <button
        type="button"
        className={styles.chip}
        onClick={() => onOpen(appt)}
        aria-label={`${passed ? 'Confirm dose given, appointment was' : 'Scheduled'} ${date}. Edit appointment`}
      >
        <Badge
          tone={passed ? 'warning' : 'primary'}
          size="S"
          icon="solar:calendar-add-linear"
          label={passed ? `Confirm ${short}` : `Scheduled ${short}`}
        />
      </button>
    </Tooltip>
  );
}
