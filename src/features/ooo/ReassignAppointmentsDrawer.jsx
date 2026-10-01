import { useMemo, useState } from 'react';
import { Drawer } from '../../components/Drawer/Drawer';
import { Avatar } from '../../components/Avatar/Avatar';
import { Badge } from '../../components/Badge/Badge';
import { Button } from '../../components/Button/Button';
import { Select } from '../../components/Select/Select';
import { TabStrip } from '../../components/TabStrip/TabStrip';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { Link } from '../../components/Link/Link';
import { AddIconMinimalist } from '../../components/Icon/AddIconMinimalist';
import { RingEmptyState } from '../../components/RingEmptyState/RingEmptyState';
import { useAppStore } from '../../store/useAppStore';
import { OooReassignFooter, ReassignmentType, ReassignProviders } from './OooReassignStep';
import { canEdit, describeRange, OOO_ICON, oooStatus, recordsFor, sortRecords, STATUS_TONE } from './oooUtils';
import styles from './ooo.module.css';

const TABS = [
  { key: 'reassign', label: 'Reassign Appointments' },
  { key: 'history', label: 'History' },
];

/**
 * Reassign Appointments (Figma Eventus 17574:114531), from the calendar's
 * Schedule menu: pick whose appointments to move, why, and (for out of
 * office) which record. The provider list below is the same static block
 * as the OOO record's step 2, so Confirm stays disabled for now.
 *
 * @param {object}   props
 * @param {{ name: string }[]} props.users
 * @param {string}   [props.initialUser]   – Preselected "Reassign From"
 * @param {string}   [props.initialRecordId] – Preselected period (else the provider's latest)
 * @param {function} props.onNewOoo        – (userName) => void, "+ New Out of Office"
 * @param {function} props.onClose
 */
export function ReassignAppointmentsDrawer({ users, initialUser, initialRecordId, onNewOoo, onClose }) {
  const oooRecords = useAppStore(s => s.oooRecords);
  const [tab, setTab] = useState('reassign');
  // The preselected provider is always in the list, even before everyone
  // has loaded, so Reassign From never shows blank.
  const fromOptions = useMemo(() => {
    const names = (users || []).map(u => u.name);
    if (initialUser && !names.includes(initialUser)) names.unshift(initialUser);
    return names.map(n => ({ value: n, label: n }));
  }, [users, initialUser]);
  const [from, setFrom] = useState(initialUser || '');
  const [type, setType] = useState('ooo');
  // Picked by default: the provider's latest period, i.e. the ongoing one,
  // else the next upcoming (the list's own order). Still changeable.
  const latestFor = (name) => (name ? sortRecords(recordsFor(oooRecords, name).filter(r => canEdit(r)))[0]?.id || '' : '');
  const [recordId, setRecordId] = useState(() => initialRecordId || latestFor(initialUser));
  const [range, setRange] = useState([]); // One-time: [startISO, endISO]

  // The provider's current and upcoming records; past ones have nothing
  // left to reassign.
  const recordOptions = useMemo(() => sortRecords(recordsFor(oooRecords, from).filter(r => canEdit(r)))
    .map((r) => {
      const status = oooStatus(r);
      const { span, length } = describeRange(r.startAt, r.endAt);
      return {
        value: r.id,
        // Like the user pickers: a grey OOO tile, the dates over how long,
        // and the status on the right.
        label: (
          <span className={styles.recordOption}>
            <Avatar type="icon" variant="others" iconName={OOO_ICON} size="M" className={styles.recordAvatar} />
            <span className={styles.recordOptionText}>
              <span className={styles.recordOptionHead}>{span}</span>
              <span className={styles.recordOptionSub}>{length}</span>
            </span>
            <Badge tone={STATUS_TONE[status]} size="S" label={status} />
          </span>
        ),
        triggerLabel: `${span} • ${length}`,
        searchText: span,
      };
    }),
  [oooRecords, from]);

  const headerRight = (
    <>
      <Button variant="primary" size="L" disabled>Confirm</Button>
      <span className={styles.headerDivider} aria-hidden="true" />
    </>
  );

  return (
    <Drawer
      title="Reassign Appointments"
      width={640}
      onClose={onClose}
      headerRight={headerRight}
      noCloseDivider
      // The banner slot is already full-bleed, so the strip mustn't bleed again.
      banner={<TabStrip items={TABS} activeKey={tab} onChange={setTab} fullWidth={false} />}
      footer={tab === 'reassign' ? <OooReassignFooter /> : undefined}
    >
      {tab === 'history' ? (
        <RingEmptyState icon="solar:history-linear" label="No reassignments yet" />
      ) : (
        <div className={`${styles.form} ${styles.reassignForm}`}>
          <Select
            label="Reassign From"
            required
            portal
            searchable
            placeholder="Select a provider"
            options={fromOptions}
            value={from || undefined}
            onChange={(name) => { setFrom(name); setRecordId(latestFor(name)); }}
          />

          <ReassignmentType
            type={type}
            onTypeChange={setType}
            range={range}
            onRangeChange={setRange}
            oooField={(
              <>
                {/* Disabled until there's a provider; the tooltip says why. */}
                <Tooltip label={from ? '' : 'Please select a provider to select an Out of Office Period'} className={styles.recordPickerTip} followCursor maxWidth={240}>
                  <Select
                    label="Out of Office Period"
                    portal
                    placeholder="Select Out of Office Period"
                    options={recordOptions}
                    value={recordId || undefined}
                    onChange={setRecordId}
                    disabled={!from}
                    // A provider with nothing to pick opens to this
                    // (Figma Mar-Present 3961:41376), which adds one.
                    emptyText={(
                      <span className={styles.recordEmpty}>
                        <RingEmptyState size="S" icon={OOO_ICON} label="No out of office records present for this user">
                          <Link
                            className={styles.newRecordLink}
                            role="button"
                            tabIndex={0}
                            onClick={() => onNewOoo(from)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNewOoo(from); } }}
                          >
                            <AddIconMinimalist size={12} color="currentColor" />
                            Add New
                          </Link>
                        </RingEmptyState>
                      </span>
                    )}
                  />
                </Tooltip>
                <span>
                  <Link
                    className={styles.newRecordLink}
                    role="button"
                    tabIndex={0}
                    onClick={() => onNewOoo(from)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNewOoo(from); } }}
                  >
                    <AddIconMinimalist size={12} color="currentColor" />
                    New Out of Office
                  </Link>
                </span>
              </>
            )}
          />

          {/* Nothing to list until we know whose appointments, and for
              out of office, which record's dates; for other, which dates. */}
          <ReassignProviders ready={!!from && (type === 'ooo' ? !!recordId : type === 'other' ? range.length === 2 : true)} />
        </div>
      )}
    </Drawer>
  );
}
