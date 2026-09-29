import { useState } from 'react';
import { Input } from '../../components/Input/Input';
import { InfoBar } from '../../components/InfoBar/InfoBar';
import { Icon } from '../../components/Icon/Icon';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { RadioButton } from '../../components/RadioButton/RadioButton';
import { Checkbox } from '../../components/ShadcnCheckbox/ShadcnCheckbox';
import { formatDateTime } from './oooUtils';
import styles from './ooo.module.css';

// Static for now (Figma Eventus 16978:128520): the provider's appointments
// in those dates, grouped by location, plus the ones nobody can take.
const GROUPS = [
  { location: '7 Hills Department', count: 10 },
  { location: 'Home Health Centre', count: 26 },
  { location: 'Palm Health Centre', count: 30 },
  { location: 'Mary Health', count: 15 },
  { location: 'Sunrise Medical', count: 2 },
  { location: 'Lifeline Clinic', count: 2 },
];
const UNASSIGNABLE = 31;

const TOTAL = GROUPS.reduce((n, g) => n + g.count, 0) + UNASSIGNABLE;

/** Step 2's footer: what the reassignment will do. */
export function OooReassignFooter() {
  return (
    <div className={styles.reassignFooter}>
      <span>Reassigning: 0</span>
      <span aria-hidden="true">•</span>
      <span>Cancelling: 0</span>
      <span aria-hidden="true">•</span>
      <span>No action: {TOTAL}</span>
    </div>
  );
}

/**
 * Step 2 of New / Edit Out of Office Record, shown in the same drawer:
 * reassigning the provider's appointments in those dates (Figma Eventus
 * 17453:111722). For now this is a static layout: sample locations and
 * counts, nothing reassigned or cancelled.
 *
 * @param {object} props
 * @param {string} props.providerName
 * @param {string} props.startAt
 * @param {string} props.endAt
 */
export function OooReassignStep({ providerName, startAt, endAt }) {
  const [type, setType] = useState('ooo');
  const [view, setView] = useState('grouped');

  return (
      <div className={styles.form}>
        <Input label="Reassign From" required value={providerName} disabled readOnly />

        <div className={styles.fieldGroup}>
          <span className={styles.groupTitle}>Select Reassignment Type</span>
          <div className={styles.radioRow} role="radiogroup" aria-label="Reassignment type">
            <RadioButton label="Out of Office Reassignment" checked={type === 'ooo'} onChange={() => setType('ooo')} />
            <RadioButton label="Permanent Reassignment" checked={type === 'permanent'} onChange={() => setType('permanent')} />
          </div>
          <div className={styles.rangeBox}>
            <span>{formatDateTime(startAt)}</span>
            <Icon name="solar:arrow-right-linear" size={14} color="var(--neutral-300)" />
            <span>{formatDateTime(endAt)}</span>
            <Icon name="solar:calendar-linear" size={16} color="var(--neutral-300)" />
          </div>
          <label className={styles.checkRow}>
            <Checkbox checked disabled aria-label="Mark this provider as Out of Office" />
            <span>Mark this provider as Out of Office</span>
          </label>
        </div>

        <div className={styles.fieldGroup}>
          <div className={styles.groupHead}>
            <span className={styles.groupTitle}>Select Reassignment Providers</span>
            <span className={styles.groupTools}>
              <ActionButton icon="solar:filter-linear" size="L" tooltip="Filter" />
              <span className={styles.actionDivider} aria-hidden="true" />
              <span className={styles.viewToggle} role="group" aria-label="Group appointments">
                <ActionButton
                  icon="solar:sort-from-top-to-bottom-linear"
                  size="L"
                  tooltip="Group by location"
                  className={view === 'grouped' ? styles.viewToggleOn : undefined}
                  aria-pressed={view === 'grouped'}
                  onClick={() => setView('grouped')}
                />
                <ActionButton
                  icon="solar:sort-vertical-linear"
                  size="L"
                  tooltip="List every appointment"
                  tooltipLeft
                  className={view === 'list' ? styles.viewToggleOn : undefined}
                  aria-pressed={view === 'list'}
                  onClick={() => setView('list')}
                />
              </span>
            </span>
          </div>
          <InfoBar tone="info">Appointments are cancelled with the original provider and rebooked on the covering provider&apos;s EHR calendar. Double-booking may occur if that slot is already taken.</InfoBar>
          <label className={styles.checkRow}>
            <Checkbox checked={false} aria-label="Select all" />
            <span>Select All</span>
          </label>
          {GROUPS.map(g => (
            <div key={g.location} className={styles.groupCard}>
              <Checkbox checked={false} aria-label={`Select ${g.location}`} />
              <span className={styles.groupCardText}>
                <span className={styles.groupCardTitle}>{g.location}</span>
                <span className={styles.groupCardSub}>
                  {g.count} Appointments
                  <Icon name="solar:alt-arrow-right-linear" size={12} color="var(--neutral-300)" />
                </span>
              </span>
              <button type="button" className={styles.assigneePicker} aria-label={`Pick a covering provider for ${g.location}`}>
                <Icon name="solar:user-linear" size={16} color="var(--neutral-300)" />
                <Icon name="solar:alt-arrow-down-linear" size={12} color="var(--neutral-300)" />
              </button>
              <ActionButton icon="solar:menu-dots-linear" size="L" tooltip="More Options" tooltipLeft />
            </div>
          ))}
          <div className={styles.unassignable}>
            <span>No users available for reassignment</span>
            <span className={styles.countBadge}>{UNASSIGNABLE}</span>
            <Icon name="solar:alt-arrow-right-linear" size={12} color="var(--neutral-300)" />
          </div>
        </div>
      </div>
  );
}
