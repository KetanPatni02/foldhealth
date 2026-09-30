import { useState } from 'react';
import { DateRangePopover } from '../../components/DateRangePopover/DateRangePopover';
import { Input } from '../../components/Input/Input';
import { InfoBar } from '../../components/InfoBar/InfoBar';
import { Icon } from '../../components/Icon/Icon';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { RadioButton } from '../../components/RadioButton/RadioButton';
import { Checkbox } from '../../components/ShadcnCheckbox/ShadcnCheckbox';
import { RingEmptyState } from '../../components/RingEmptyState/RingEmptyState';
import { describeRange, formatDate } from './oooUtils';
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
  // Laid out as the Reassign Appointments drawer, with the record being
  // saved in place of the record picker.
  const { span, length } = describeRange(startAt, endAt);

  return (
      <div className={`${styles.form} ${styles.reassignForm}`}>
        <Input label="Reassign From" required value={providerName} disabled readOnly />

        <ReassignmentType
          type="ooo"
          locked
          oooField={<Input label="Out of Office Record" value={span ? `${span} · ${length}` : ''} disabled readOnly />}
        />

        <ReassignProviders />
      </div>
  );
}

/**
 * "Select Reassignment Providers": the appointments grouped by location,
 * each with a covering-provider picker, plus the ones nobody can take.
 * Static for now (Figma Eventus 16978:128520). Shared by the OOO record's
 * step 2 and the Reassign Appointments drawer.
 *
 * @param {object}  props
 * @param {boolean} [props.ready=true] – false shows the "pick first" empty
 *   state (Figma Eventus 16898:43570), e.g. until an OOO record is chosen
 */
export function ReassignProviders({ ready = true }) {
  const [view, setView] = useState('grouped');
  if (!ready) {
    return (
      <div className={styles.fieldGroup}>
        <span className={styles.groupTitle}>Select Reassignment Providers</span>
        <div className={styles.providersEmpty}>
          <RingEmptyState size="S" icon="solar:users-group-rounded-linear" label="Select Provider and dates to Reassign Appointments" />
        </div>
      </div>
    );
  }
  return (
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
  );
}

const TYPES = [
  { key: 'ooo', label: 'Out of Office Reassignment' },
  { key: 'permanent', label: 'Permanent Reassignment' },
  { key: 'other', label: 'Other' },
];

// "YYYY-MM-DD" → "MM/DD/YYYY" (local, so the day doesn't shift).
const isoToLabel = (iso) => { const [y, m, d] = iso.split('-').map(Number); return formatDate(new Date(y, m - 1, d)); };

/**
 * "Select Reassignment Type" (Figma Eventus 17599:119759): three radios,
 * and under them what that type needs. Out of office: the record
 * (`oooField`, a picker or the record being saved). Permanent: a note that
 * everything moves. Other: the date range to reassign.
 *
 * @param {object}   props
 * @param {'ooo'|'permanent'|'other'} props.type
 * @param {function} props.onTypeChange
 * @param {string[]} props.range          – [startISO, endISO] or [] (Other)
 * @param {function} props.onRangeChange
 * @param {React.ReactNode} props.oooField
 * @param {boolean}  [props.locked]    – The type is fixed (a new or edited OOO
 *   record reassigns as out of office), so the radios are disabled
 */
export function ReassignmentType({ type, onTypeChange, range = [], onRangeChange, oooField, locked = false }) {
  const [anchor, setAnchor] = useState(null);
  return (
    <div className={`${styles.fieldGroup} ${styles.reassignGroup}`}>
      <span className={styles.groupTitle}>Select Reassignment Type</span>
      <div className={styles.radioRow} role="radiogroup" aria-label="Reassignment type">
        {TYPES.map(t => (
          <RadioButton key={t.key} label={t.label} checked={type === t.key} disabled={locked} onChange={() => onTypeChange(t.key)} />
        ))}
      </div>
      {type === 'ooo' && oooField}
      {type === 'permanent' && (
        <InfoBar tone="warning">All appointments will be reassigned, this is typically done when provider leaves the organization.</InfoBar>
      )}
      {type === 'other' && (
        <>
          <button
            type="button"
            className={styles.rangeField}
            aria-label="Dates to reassign"
            onClick={(e) => setAnchor(e.currentTarget.getBoundingClientRect())}
          >
            <span className={range.length ? undefined : styles.rangePlaceholder}>{range.length ? isoToLabel(range[0]) : 'Start Date'}</span>
            <Icon name="solar:arrow-right-linear" size={14} color="var(--neutral-200)" />
            <span className={range.length ? undefined : styles.rangePlaceholder}>{range.length ? isoToLabel(range[1]) : 'End Date'}</span>
            <Icon name="solar:calendar-linear" size={16} color="var(--neutral-300)" />
          </button>
          {anchor && (
            <DateRangePopover anchorRect={anchor} label="Dates to reassign" selected={range} onChange={onRangeChange} onClose={() => setAnchor(null)} />
          )}
        </>
      )}
    </div>
  );
}
