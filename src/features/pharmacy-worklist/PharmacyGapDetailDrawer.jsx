import { useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Drawer } from '../../components/Drawer/Drawer';
import { PatientBanner } from '../../components/PatientBanner/PatientBanner';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { AssigneeChange } from '../../components/AssigneeChange/AssigneeChange';
import { Badge } from '../../components/Badge/Badge';
import { Button } from '../../components/Button/Button';
import { CloseButton } from '../../components/CloseButton/CloseButton';
import { FilterChip } from '../../components/FilterChip/FilterChip';
import { Icon } from '../../components/Icon/Icon';
import { MenuPopover } from '../../components/MenuPopover/MenuPopover';
import { TabStrip } from '../../components/TabStrip/TabStrip';
import { DownChevronIcon } from '../../components/Icon/DownChevronIcon';
import { clinicalRolesPickerLabel } from '../../lib/worklistAssignee';
import { MANUAL_GAP_STATUSES, GAP_STATUS_TONE, MEASURE_NAMES, daysFromToday, enrichPharmacyMember, medLabel } from './pharmacyWorklist.utils';
import { SubStatus } from './PharmacyCells';
import { PharmacySnapshotStep } from './program/PharmacySnapshotStep';
import { MedicationDetail, PharmacyMedicationReview } from './program/PharmacyMedicationReview';
import { usePharmacyOutreachTab } from './program/usePharmacyOutreachTab';
import { OutreachTabView } from '../patient/left-panel/tabs/outreach/OutreachTab/OutreachTab';
import { PharmacyBarrierStep } from './program/PharmacyBarrierStep';
import { PharmacyVerificationStep } from './program/PharmacyVerificationStep';
import { PharmacyActivityLog } from './program/PharmacyActivityLog';
// Same layout system as the HEDIS Care Gap Details drawer, so both read as one.
import styles from '../hedis-worklist/CareGapDetailDrawer.module.css';
import local from './PharmacyGapDetailDrawer.module.css';

const PHARM_PROGRAM = { code: 'PHARM' };
const AUTO_STATUS = '__auto';
const HCC_ONLY_ROLES = new Set(['Coder', 'Support', 'QA', 'Compliance']);

const TABS = [
  { key: 'snapshot', label: 'Snapshot' },
  { key: 'medication', label: 'Medication Review' },
  { key: 'outreach', label: 'Outreaches' },
  { key: 'barriers', label: 'Barriers & Interventions' },
  { key: 'verification', label: 'Verification' },
  { key: 'activity', label: 'Activity' },
];

const WORKSPACE_TITLE = {
  outreach: 'Add Outreach',
  verify: 'Pharmacy Verification',
  barriers: 'Barriers & Interventions',
};

const ago = (mdy) => {
  const d = daysFromToday(mdy);
  return d == null ? '' : d === 0 ? 'today' : d < 0 ? `${-d}d ago` : `in ${d}d`;
};

/**
 * Pharmacy Gap Details — opens from the Pharmacy worklist the same way Care
 * Gap Details opens from HEDIS: patient banner, a header for the gap
 * (measurement year, assignee, status), suggested actions, tabs, and a side
 * workspace on the left for logging work without leaving the gap.
 */
export function PharmacyGapDetailDrawer() {
  const target = useAppStore(s => s.pharmacyGapDrawer);
  const row = useAppStore(s => (target ? s.pharmacyWorklistMembers.find(m => m.id === target.memberId) : null));
  // A member with no pharmacy measures has no gap to show.
  if (!target || !row || !row.measures?.length) return null;
  // Keyed by member: the outreach state reads the member's log once per mount.
  // A rework link for another drug remounts it on that drug's claims.
  return <PharmacyGapDrawerBody key={`${row.id}|${target.medId || ''}`} target={target} row={row} />;
}

function PharmacyGapDrawerBody({ target, row }) {
  const close = useAppStore(s => s.closePharmacyGapDrawer);
  const openDrawer = useAppStore(s => s.openPharmacyGapDrawer);
  const platformUsers = useAppStore(s => s.platformUsers);
  const setPharmacyAssignee = useAppStore(s => s.setPharmacyAssignee);
  const setPharmacyGapStatus = useAppStore(s => s.setPharmacyGapStatus);

  // Opened from a "Claim not matched" flag: the drug's claim history in the
  // side workspace, outreach logging in the main pane.
  const rework = target.view === 'claims' && target.medId;
  const [tab, setTab] = useState(rework ? 'outreach' : 'snapshot');
  const [workspace, setWorkspace] = useState(rework ? { medId: target.medId, tab: 'claims' } : null); // 'outreach' | 'verify' | 'barriers' | { medId, tab? }
  const [statusRect, setStatusRect] = useState(null);
  const [moreRect, setMoreRect] = useState(null);
  const statusBtnRef = useRef(null);
  const moreBtnRef = useRef(null);

  const m = useMemo(() => enrichPharmacyMember(row), [row]);
  // One outreach state backs the side-workspace form and the Outreach tab
  // log, the same as Care Gap Details; it keeps the PHARM automations
  // (pickups move fill dates, outcomes feed Barriers & Interventions).
  const outreach = usePharmacyOutreachTab(row, { patientId: row.patientId || row.id, memberName: row.name });

  // Unknown code (e.g. a stale link): fall back to the row's focus gap.
  const found = m.gaps.findIndex(g => g.code === target.code);
  const idx = found >= 0 ? found : Math.max(0, m.gaps.findIndex(g => g.code === m.urgent?.code));
  const gap = m.gaps[idx];
  const closeWorkspace = () => {
    if (workspace === 'outreach') outreach.handleDiscard();
    setWorkspace(null);
  };
  const go = (i) => { closeWorkspace(); openDrawer(m.id, m.gaps[i].code); };
  const openOutreach = () => {
    outreach.setDatetime(outreach.formatNow());
    if (!outreach.selectedProgs.includes(gap.code)) outreach.toggleProgram(gap.code);
    outreach.setFormOpen(true);
    setWorkspace('outreach');
  };
  const saveOutreach = () => {
    if (!outreach.canSave) return;
    outreach.handleSave();
    setWorkspace(null);
  };
  const year = (gap.failDate || '').slice(6) || String(new Date().getFullYear());
  const inSplit = !!workspace;
  const openMed = workspace?.medId
    ? m.gaps.flatMap(g => g.medications.map(d => ({ ...d, measure: g.code }))).find(d => d.id === workspace.medId)
    : null;

  const users = (platformUsers || [])
    .filter(u => !u.clinicalRoles?.some(r => HCC_ONLY_ROLES.has(r)))
    .map(u => ({ id: u.id, name: u.name, initials: u.initials, role: clinicalRolesPickerLabel(u) }));

  const statusItems = [
    ...MANUAL_GAP_STATUSES.map(s => ({ key: s, label: s, selected: s === gap.status.gap })),
    ...(gap.status.manual ? [{ key: AUTO_STATUS, label: 'Use status from data' }] : []),
  ];

  const banner = (
    <PatientBanner
      initials={m.initials}
      name={m.name}
      gender={m.gender}
      age={m.age}
      dob={m.dob}
      memberId={m.memberId}
      hidePatientLabel
      patientId={m.patientId || m.id}
    />
  );

  const tabCounts = {
    outreach: (m.callHistory || []).length,
    medication: m.gaps.reduce((n, g) => n + g.medications.length, 0),
  };

  return (
    <Drawer
      title="Pharmacy Gap Details"
      onClose={close}
      noCloseDivider
      width={inSplit ? 1280 : 700}
      className={`${styles.panel} ${inSplit ? styles.panelExpanded : ''}`}
      bodyClassName={inSplit ? `${styles.drawerBody} ${styles.drawerBodySplit}` : styles.drawerBody}
      headerRight={
        <div className={styles.headerNav}>
          <ActionButton icon="solar:alt-arrow-left-linear" size="L" tooltip="Previous gap" state={idx > 0 ? 'active' : 'disabled'} onClick={() => idx > 0 && go(idx - 1)} />
          <ActionButton icon="solar:alt-arrow-right-linear" size="L" tooltip="Next gap" state={idx < m.gaps.length - 1 ? 'active' : 'disabled'} onClick={() => idx < m.gaps.length - 1 && go(idx + 1)} />
          <span className={styles.headerDivider} />
        </div>
      }
      banner={inSplit ? undefined : <div className={styles.patientBannerWrap}>{banner}</div>}
    >
      {inSplit && (
        <div className={styles.leftPane}>
          <div className={styles.paneHeader}>
            <span className={styles.paneTitle}>{openMed ? `${medLabel(openMed)} (${openMed.generic})` : WORKSPACE_TITLE[workspace]}</span>
            <div className={styles.paneHeaderRight}>
              {workspace === 'outreach' && (
                <>
                  <Button variant="primary" size="M" disabled={!outreach.canSave} onClick={saveOutreach}>Save</Button>
                  <span className={styles.headerDivider} />
                </>
              )}
              <CloseButton size={18} onClick={closeWorkspace} label={`Close ${openMed ? 'medication' : WORKSPACE_TITLE[workspace]}`} />
            </div>
          </div>
          <div className={styles.leftPaneBody}>
            {workspace === 'outreach' && (
              <OutreachTabView tab={outreach} hideLogForRow hideActivity hideFormFooter flush taskMember={m.name} />
            )}
            {workspace === 'verify' && <PharmacyVerificationStep member={row} program={PHARM_PROGRAM} />}
            {workspace === 'barriers' && <PharmacyBarrierStep member={row} />}
            {openMed && <MedicationDetail key={openMed.id} med={openMed} memberRowId={m.id} interventionLog={m.interventionLog} plan={m.healthPlan} initialTab={workspace.tab} />}
          </div>
        </div>
      )}

      <div className={styles.contentBody}>
        {inSplit && <div className={styles.patientBannerWrap}>{banner}</div>}

        <div className={styles.gapHeader}>
          <div className={styles.gapToolbar}>
            <div className={styles.yearWrap}>
              <FilterChip
                label="Measurement Year"
                options={[year]}
                selected={[year]}
                onChange={() => {}}
                singleSelect
                noClear
                size="S"
                info={`PDC for ${gap.code} is measured over calendar year ${year}.`}
              />
            </div>
            <div className={styles.gapToolbarRight}>
              {/* Assignment is per patient on the pharmacy worklist. */}
              <AssigneeChange
                avatarOnly
                unassigned={!m.assigneeName}
                name={m.assigneeName || undefined}
                initials={m.assigneeInitials || undefined}
                ariaLabel={m.assigneeName || 'Assign'}
                users={users}
                pickerTitle={m.assigneeName ? 'Change assignee' : 'Assign to'}
                onSelect={(u) => setPharmacyAssignee(m.id, u)}
              />
              <button
                ref={statusBtnRef}
                type="button"
                className={styles.statusBtnReset}
                onClick={() => setStatusRect(r => (r ? null : statusBtnRef.current?.getBoundingClientRect()))}
                aria-haspopup="menu"
                aria-expanded={!!statusRect}
              >
                <Badge size="M" tone={GAP_STATUS_TONE[gap.status.gap] || 'grey'} label={gap.status.gap} trailingIconElement={<DownChevronIcon size={13} color="currentColor" />} style={{ height: 28 }} />
              </button>
              {statusRect && (
                <MenuPopover
                  anchorRect={statusRect}
                  items={statusItems}
                  onSelect={(key) => { setPharmacyGapStatus(m.id, gap.code, key === AUTO_STATUS ? null : key); setStatusRect(null); }}
                  onClose={() => setStatusRect(null)}
                  width={220}
                  ariaLabel={`Change ${gap.code} status`}
                />
              )}
              <span className={styles.headerDivider} />
              <ActionButton
                ref={moreBtnRef}
                icon="solar:menu-dots-linear"
                size="L"
                tooltip="More"
                tooltipBelow
                tooltipLeft
                onClick={() => setMoreRect(r => (r ? null : moreBtnRef.current?.getBoundingClientRect()))}
              />
              {moreRect && (
                <MenuPopover
                  anchorRect={moreRect}
                  items={[
                    { key: 'activity', label: 'Activity log', icon: 'solar:history-linear' },
                  ]}
                  onSelect={(key) => {
                    setMoreRect(null);
                    if (key === 'activity') setTab('activity');
                  }}
                  onClose={() => setMoreRect(null)}
                  width={220}
                  ariaLabel="More actions"
                />
              )}
            </div>
          </div>

          <div className={styles.gapTitleWrap}>
            <div className={local.gapTitle}>{gap.code} - {MEASURE_NAMES[gap.code]}</div>
            <div className={styles.gapSubRow}>
              {gap.startDate && <span>Started {gap.startDate} ({ago(gap.startDate)})</span>}
              {gap.failDate && <><span>•</span><span>Fail date {gap.failDate}</span></>}
              <span>•</span>
              <SubStatus label={gap.status.label} />
            </div>
          </div>
        </div>

        <div className={styles.suggestSection}>
          <div className={styles.suggestRow}>
            <Icon name="solar:magic-stick-3-bold" size={14} color="var(--primary-300)" /> Suggested Actions
          </div>
          <div className={styles.suggestActions}>
            <Button variant="primary" size="L" onClick={openOutreach}>Add Outreach</Button>
            <Button variant="tertiary" size="L" onClick={() => setWorkspace('verify')}>Verify with Pharmacy</Button>
            <Button variant="tertiary" size="L" onClick={() => setWorkspace('barriers')}>Update Barriers</Button>
          </div>
        </div>

        <TabStrip
          items={TABS.map(t => ({ key: t.key, label: tabCounts[t.key] != null ? `${t.label} (${tabCounts[t.key]})` : t.label }))}
          activeKey={tab}
          onChange={setTab}
          fullWidth={false}
          size="S"
        />

        <div className={styles.tabContentWrap}>
          {tab === 'snapshot' && <PharmacySnapshotStep member={row} />}
          {tab === 'medication' && <PharmacyMedicationReview member={row} onOpenMed={(medId, medTab) => setWorkspace({ medId, tab: medTab })} />}
          {tab === 'outreach' && (
            <OutreachTabView tab={outreach} hideLogForRow hideForm={workspace === 'outreach'} taskMember={m.name} onLogNew={openOutreach} />
          )}
          {tab === 'barriers' && <PharmacyBarrierStep member={row} />}
          {tab === 'verification' && <PharmacyVerificationStep member={row} program={PHARM_PROGRAM} />}
          {tab === 'activity' && <PharmacyActivityLog member={row} />}
        </div>
      </div>
    </Drawer>
  );
}
