import { useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Drawer } from '../../components/Drawer/Drawer';
import { PatientBanner } from '../../components/PatientBanner/PatientBanner';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { AssigneeChange } from '../../components/AssigneeChange/AssigneeChange';
import { Badge } from '../../components/Badge/Badge';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { Button } from '../../components/Button/Button';
import { CloseButton } from '../../components/CloseButton/CloseButton';
import { FilterChip } from '../../components/FilterChip/FilterChip';
import { Icon } from '../../components/Icon/Icon';
import { MenuPopover } from '../../components/MenuPopover/MenuPopover';
import { TabStrip } from '../../components/TabStrip/TabStrip';
import { Toggle } from '../../components/Toggle/Toggle';
import { clinicalRolesPickerLabel } from '../../lib/worklistAssignee';
import { MEASURE_ORDER, PROGRESS_TONE, enrichPharmacyMember, medLabel } from './pharmacyWorklist.utils';
import { PharmacyContacts, PharmacyGapsCard } from './program/PharmacySnapshotStep';
import { MedicationDetail, PharmacyMedicationReview } from './program/PharmacyMedicationReview';
import { usePharmacyOutreachTab } from './program/usePharmacyOutreachTab';
import { OutreachTabView } from '../patient/left-panel/tabs/outreach/OutreachTab/OutreachTab';
import { PharmacyBarrierStep } from './program/PharmacyBarrierStep';
import { PharmacyVerificationStep } from './program/PharmacyVerificationStep';
import { PharmacyActivityLog } from './program/PharmacyActivityLog';
// Same layout system as the HEDIS Care Gap Details drawer, so both read as one.
import styles from '../hedis-worklist/CareGapDetailDrawer.module.css';
import local from './PharmacyGapDetailDrawer.module.css';
import { escalation, pickupReminder } from './pharmacyRules';

const PHARM_PROGRAM = { code: 'PHARM' };
const HCC_ONLY_ROLES = new Set(['Coder', 'Support', 'QA', 'Compliance']);

const TABS = [
  { key: 'medication', label: 'Medication Review' },
  { key: 'outreach', label: 'Outreaches' },
  { key: 'barriers', label: 'Barriers & Interventions' },
  { key: 'verification', label: 'Verification' },
  { key: 'activity', label: 'Activity' },
  { key: 'contacts', label: 'Contacts' },
];

const WORKSPACE_TITLE = {
  outreach: 'Add Outreach',
  verify: 'Pharmacy Verification',
  barriers: 'Barriers & Interventions',
};

/**
 * Pharmacy Gap Details: one drawer per member, as on the HCC worklist. The
 * member level (assignee, Progress) heads it; below, every pharmacy gap with
 * its own status. Ticking gaps scopes the tabs and the actions, so one
 * outreach or verification call can cover one gap or all of them.
 */
export function PharmacyGapDetailDrawer() {
  const target = useAppStore(s => s.pharmacyGapDrawer);
  const row = useAppStore(s => (target ? s.pharmacyWorklistMembers.find(m => m.id === target.memberId) : null));
  // A member with no pharmacy measures has no gap to show.
  if (!target || !row || !row.measures?.length) return null;
  // Keyed by member: the outreach state reads the member's log once per mount,
  // and the starting selection follows how the drawer was opened.
  return <PharmacyGapDrawerBody key={`${row.id}|${target.focus ? target.code : ''}|${target.medId || ''}`} target={target} row={row} />;
}

function PharmacyGapDrawerBody({ target, row }) {
  const close = useAppStore(s => s.closePharmacyGapDrawer);
  const openDrawer = useAppStore(s => s.openPharmacyGapDrawer);
  const order = useAppStore(s => s.pharmacyWorklistOrder);
  const platformUsers = useAppStore(s => s.platformUsers);
  const setPharmacyAssignee = useAppStore(s => s.setPharmacyAssignee);
  const setPharmacyGapStatus = useAppStore(s => s.setPharmacyGapStatus);

  const m = useMemo(() => enrichPharmacyMember(row), [row]);
  const codes = useMemo(() => m.gaps.map(g => g.code), [m]);

  // The gap toggle: All, or one gap. Opened from one gap (its badge or rework
  // flag): that gap; otherwise All.
  const [scope, setScope] = useState(() => (target.focus && codes.includes(target.code) ? target.code : 'all'));
  const selected = useMemo(() => new Set(scope === 'all' ? codes : [scope]), [scope, codes]);
  const picked = MEASURE_ORDER.filter(c => selected.has(c));
  const scopeLabel = scope === 'all' ? 'All gaps' : scope;

  // The member as the tabs see it: only the picked gaps.
  const scoped = useMemo(() => ({ ...row, measures: row.measures.filter(x => selected.has(x.code)) }), [row, selected]);

  // Opened from a "Claim not matched" flag: the drug's claim history in the
  // side workspace, outreach logging in the main pane.
  const rework = target.view === 'claims' && target.medId;
  const [tab, setTab] = useState(rework ? 'outreach' : 'medication');
  const [workspace, setWorkspace] = useState(rework ? { medId: target.medId, tab: 'claims' } : null); // 'outreach' | 'verify' | 'barriers' | { medId, tab? }
  const [moreRect, setMoreRect] = useState(null);
  const moreBtnRef = useRef(null);

  // One outreach state backs the side-workspace form and the Outreach tab
  // log, the same as Care Gap Details; it keeps the PHARM automations
  // (pickups move fill dates, outcomes feed Barriers & Interventions).
  const outreach = usePharmacyOutreachTab(row, { patientId: row.patientId || row.id, memberName: row.name });

  const closeWorkspace = () => {
    if (workspace === 'outreach') outreach.handleDiscard();
    setWorkspace(null);
  };
  // Previous / next member, in the worklist's order on screen.
  const ids = order.length ? order : [m.id];
  const at = ids.indexOf(m.id);
  const goMember = (step) => {
    const id = ids[at + step];
    if (!id) return;
    closeWorkspace();
    openDrawer(id, null);
  };
  // One outreach for the picked gaps: the form starts with exactly those.
  const openOutreach = () => {
    outreach.setDatetime(outreach.formatNow());
    outreach.setSelectedProgs(picked);
    outreach.setFormOpen(true);
    setWorkspace('outreach');
  };
  const saveOutreach = () => {
    if (!outreach.canSave) return;
    outreach.handleSave();
    setWorkspace(null);
  };
  const year = (m.gaps.find(g => g.failDate)?.failDate || '').slice(6) || String(new Date().getFullYear());
  // What the outreach rules ask for next on the picked gaps.
  const prompts = m.gaps.filter(g => selected.has(g.code)).map(g => ({ g, escalate: escalation(g, m), reminder: pickupReminder(g) }));
  const escalating = prompts.filter(p => p.escalate);
  const inSplit = !!workspace;
  const openMed = workspace?.medId
    ? m.gaps.flatMap(g => g.medications.map(d => ({ ...d, measure: g.code }))).find(d => d.id === workspace.medId)
    : null;

  const users = (platformUsers || [])
    .filter(u => !u.clinicalRoles?.some(r => HCC_ONLY_ROLES.has(r)))
    .map(u => ({ id: u.id, name: u.name, initials: u.initials, role: clinicalRolesPickerLabel(u) }));

  // The Outreach tab lists only outreach that touched a picked gap.
  const touchesPicked = (programs) => !programs?.length || programs.some(p => selected.has(p));
  const scopedOutreach = useMemo(() => ({
    ...outreach,
    filteredLogGroups: outreach.filteredLogGroups
      .map(g => ({ ...g, logs: g.logs.filter(l => touchesPicked(l.programs)) }))
      .filter(g => g.logs.length),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [outreach, selected]);

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
    outreach: (m.callHistory || []).filter(c => touchesPicked(c.measures)).length,
    medication: m.gaps.filter(g => selected.has(g.code)).reduce((n, g) => n + g.medications.length, 0),
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
          <ActionButton icon="solar:alt-arrow-left-linear" size="L" tooltip="Previous member" state={at > 0 ? 'active' : 'disabled'} onClick={() => goMember(-1)} />
          <ActionButton icon="solar:alt-arrow-right-linear" size="L" tooltip="Next member" state={at >= 0 && at < ids.length - 1 ? 'active' : 'disabled'} onClick={() => goMember(1)} />
          <span className={styles.headerDivider} />
        </div>
      }
      banner={inSplit ? undefined : <div className={styles.patientBannerWrap}>{banner}</div>}
    >
      {inSplit && (
        <div className={styles.leftPane}>
          <div className={styles.paneHeader}>
            <span className={styles.paneTitle}>
              {openMed ? `${medLabel(openMed)} (${openMed.generic})` : `${WORKSPACE_TITLE[workspace]} · ${scopeLabel}`}
            </span>
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
            {workspace === 'verify' && <PharmacyVerificationStep member={scoped} program={PHARM_PROGRAM} />}
            {workspace === 'barriers' && <PharmacyBarrierStep member={scoped} />}
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
                info={`PDC for MAD, MAH and MAC is measured over calendar year ${year}.`}
              />
            </div>
            <div className={styles.gapToolbarRight}>
              {/* Member level: one assignee and one Progress for all the
                  member's pharmacy gaps. Progress is Fold's roll-up. */}
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
              <Tooltip label={`Member progress: ${m.progress.closed} of ${m.progress.total} gaps closed (Closed or Met for Year)`} placement="bottom">
                <span><Badge size="M" tone={PROGRESS_TONE[m.progress.label]} label={m.progress.label} style={{ height: 28 }} /></span>
              </Tooltip>
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

        </div>

        <div className={local.gapsSection}>
          <PharmacyGapsCard
            compact
            member={scoped}
            titleExtra={codes.length > 1 && (
              <Toggle
                size="S"
                items={[{ key: 'all', label: 'All' }, ...codes.map(c => ({ key: c, label: c }))]}
                active={scope}
                onChange={setScope}
              />
            )}
            onSetStatus={(code, status) => setPharmacyGapStatus(m.id, code, status)}
          />
        </div>

        <div className={styles.suggestSection}>
          {picked.length > 0 && (
            <div className={local.actionRow}>
              <Button variant="primary" size="L" onClick={openOutreach}>Add Outreach</Button>
              <Button variant="tertiary" size="L" onClick={() => setWorkspace('verify')}>Verify with Pharmacy</Button>
              <Button variant="tertiary" size="L" onClick={() => setWorkspace('barriers')}>Update Barriers</Button>
              {escalating.length > 0 && <Button variant="tertiary" size="L" leadingIcon="solar:stethoscope-linear" onClick={openOutreach}>Call Prescriber</Button>}
            </div>
          )}
          {prompts.map(({ g, escalate, reminder }) => (
            <div key={g.code}>
              {escalate && (
                <div className={local.ruleHint}>
                  <Icon name="solar:danger-triangle-linear" size={14} color="var(--status-warning)" />
                  <span>
                    <b>{g.code}: escalate to {escalate.prescriber?.name || 'the prescriber'}</b>
                    {escalate.prescriber?.phone ? ` (${escalate.prescriber.phone})` : ''}: {escalate.reason}. Outreach goes to the prescriber of the drug, not the PCP.
                  </span>
                </div>
              )}
              {reminder && (
                <div className={local.ruleHint}>
                  <Icon name={reminder.action === 'call' ? 'solar:phone-linear' : 'solar:chat-round-line-linear'} size={14} color="var(--neutral-300)" />
                  <span><b>{g.code}: {reminder.label}</b>: {reminder.detail}.</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <TabStrip
          items={TABS.map(t => ({ key: t.key, label: tabCounts[t.key] != null ? `${t.label} (${tabCounts[t.key]})` : t.label }))}
          activeKey={tab}
          onChange={setTab}
          fullWidth={false}
          size="S"
        />

        <div className={styles.tabContentWrap}>
          {picked.length > 0 && (
            <>
              {tab === 'medication' && <PharmacyMedicationReview compact member={scoped} onOpenMed={(medId, medTab) => setWorkspace({ medId, tab: medTab })} />}
              {tab === 'outreach' && (
                <OutreachTabView tab={scopedOutreach} hideLogForRow hideForm={workspace === 'outreach'} taskMember={m.name} onLogNew={openOutreach} />
              )}
              {tab === 'barriers' && <PharmacyBarrierStep member={scoped} />}
              {tab === 'verification' && <PharmacyVerificationStep member={scoped} program={PHARM_PROGRAM} />}
            </>
          )}
          {tab === 'activity' && <PharmacyActivityLog member={row} />}
          {tab === 'contacts' && <div className={local.contacts}><PharmacyContacts member={row} /></div>}
        </div>
      </div>
    </Drawer>
  );
}
