import { useState } from 'react';
import { Avatar } from '../../components/Avatar/Avatar';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Icon } from '../../components/Icon/Icon';
import { initialsOf } from './oooUtils';
import { apptLine } from './reassignUtils';
import styles from './reassign.module.css';

const PAGE = 10;

/**
 * One appointment: patient initials, name, then date, time and type. The
 * leading slot (a checkbox) and the trailing slot (covering provider,
 * status, actions) are the caller's.
 */
export function ApptRow({ appt, lead, trail, tone, children }) {
  const name = appt.patient_name ?? appt.patientName ?? 'Appointment';
  return (
    <div className={[styles.apptRow, tone ? styles[`tone_${tone}`] : ''].filter(Boolean).join(' ')}>
      <div className={styles.apptMain}>
        {lead}
        <Avatar variant="patient" initials={initialsOf(name)} size="L" />
        <span className={styles.apptText}>
          <span className={styles.apptName}>{name}</span>
          <span className={styles.apptSub}>{apptLine(appt)}</span>
        </span>
        {trail && <span className={styles.apptTrail}>{trail}</span>}
      </div>
      {children}
    </div>
  );
}

/**
 * A department card: a header (checkbox, name, "N Appointments (…)" that
 * toggles the list, then the caller's controls) over its appointments,
 * ten to a page.
 */
export function DeptGroup({ title, count, detail, lead, controls, items, renderItem, defaultOpen = false, tone }) {
  const [open, setOpen] = useState(defaultOpen);
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / PAGE));
  const pageNow = Math.min(page, pages - 1);
  const shown = items.slice(pageNow * PAGE, pageNow * PAGE + PAGE);
  return (
    <div className={[styles.dept, tone ? styles[`dept_${tone}`] : ''].filter(Boolean).join(' ')}>
      <div className={styles.deptHead}>
        {lead}
        <span className={styles.deptText}>
          <span className={styles.deptName}>{title}</span>
          <button type="button" className={styles.deptCount} onClick={() => setOpen(o => !o)} aria-expanded={open}>
            {count} Appointment{count === 1 ? '' : 's'}
            {detail && <span className={styles.deptDetail}>({detail})</span>}
            <Icon name={open ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'} size={12} color="var(--neutral-300)" />
          </button>
        </span>
        {controls}
      </div>
      {open && (
        <div className={styles.deptList}>
          {shown.map(renderItem)}
          {items.length > PAGE && (
            <div className={styles.pager}>
              <span>{pageNow * PAGE + 1}–{Math.min(items.length, pageNow * PAGE + PAGE)} of {items.length}</span>
              <ActionButton icon="solar:alt-arrow-left-linear" size="S" tooltip="Previous" state={pageNow === 0 ? 'disabled' : 'active'} onClick={() => pageNow > 0 && setPage(pageNow - 1)} />
              <ActionButton icon="solar:alt-arrow-right-linear" size="S" tooltip="Next" state={pageNow >= pages - 1 ? 'disabled' : 'active'} onClick={() => pageNow < pages - 1 && setPage(pageNow + 1)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
