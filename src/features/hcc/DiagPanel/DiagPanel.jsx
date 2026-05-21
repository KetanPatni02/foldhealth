import { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Drawer } from '../../../components/Drawer/Drawer';
import { Icon } from '../../../components/Icon/Icon';
import { CloseIcon } from '../../../components/Icon/CloseIcon';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Toggle } from '../../../components/Toggle/Toggle';
import { SearchIconButton } from '../../../components/SearchIconButton/SearchIconButton';
import { HccCard } from './HccGroupRow';
import { IcdRow } from './IcdRow';
import { DosSelector } from './DosSelector';
import { DosStatusMenu } from './DosStatusMenu';
import { SnapshotTiles } from './SnapshotTiles';
import { SweepIcdRow } from './SweepIcdRow';
import { LeftWorkspace } from './LeftWorkspace';
import { getSweepIcdsForMember } from '../data/sweepIcds';
import { getIcdsForMember, getNotLinkedForMember } from '../data/icds';
import styles from './DiagPanel.module.css';

// Small initials-square avatar used to the left of the DOS status pill.
// Picks orange (coder) tint if a coder is assigned, else purple (support).
function AssigneeAvatar({ coder, support }) {
  const nm = (coder || support || '').trim();
  if (!nm) return null;
  const parts = nm.split(/[\s.]+/).filter(Boolean);
  const initials = parts.map((w) => (w[0] || '').toUpperCase()).slice(0, 2).join('') || 'DH';
  const isCoder = !!coder;
  const bg = isCoder ? 'var(--secondary-100)' : 'var(--primary-50)';
  const border = isCoder ? 'var(--secondary-200)' : 'var(--primary-200)';
  const color = isCoder ? 'var(--secondary-300)' : 'var(--primary-300)';
  return (
    <span
      style={{
        width: 24, height: 24, borderRadius: 6,
        background: bg, border: `0.5px solid ${border}`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: 10, fontWeight: 500, color,
        fontFamily: 'Inter, sans-serif',
      }}
      title={nm}
    >
      {initials}
    </span>
  );
}

const isAISuggested = (icd) => ['Suspect', 'Recapture'].includes(icd.type || '');

/**
 * Group ICDs by HCC into rich `{ hcc, assoc, unlinked }` records.
 *
 * - `assoc` holds regular ICDs **plus** AI-suggested ones that have been
 *   Accepted (they're now "real" associations).
 * - `unlinked` holds AI-suggested ICDs still pending acceptance, **plus**
 *   genuinely unlinked rows from the `notLinked` list.
 */
function groupIcdsByHcc(linked, notLinked) {
  const map = new Map();
  const ensure = (key) => {
    if (!map.has(key)) map.set(key, { hcc: key, assoc: [], unlinked: [] });
    return map.get(key);
  };
  for (const icd of linked) {
    const key = icd.hcc || 'HCC Not Linked';
    const bucket = ensure(key);
    if (isAISuggested(icd) && icd.status !== 'Accepted') bucket.unlinked.push(icd);
    else bucket.assoc.push(icd);
  }
  for (const icd of notLinked) {
    const key = icd.hcc || 'HCC Not Linked';
    ensure(key).unlinked.push(icd);
  }
  return [...map.values()];
}

const VIEW_MODES = ['HCC', 'ICD'];

export function DiagPanel() {
  const memberId = useAppStore(s => s.diagPanelMemberId);
  const closeDiagPanel = useAppStore(s => s.closeDiagPanel);
  const diagViewMode = useAppStore(s => s.diagViewMode);
  const setDiagViewMode = useAppStore(s => s.setDiagViewMode);
  const member = useAppStore(s => s.hccMembers.find(m => m.id === memberId));
  const showToast = useAppStore(s => s.showToast);
  const fetchHccDiagnosisGaps = useAppStore(s => s.fetchHccDiagnosisGaps);
  const diagnosisGaps = useAppStore(s => s.hccDiagnosisGaps);
  const diagnosisGapsLoading = useAppStore(s => s.hccDiagnosisGapsLoading);
  const diagDosFilter = useAppStore(s => s.diagDosFilter);
  const setDiagDosFilter = useAppStore(s => s.setDiagDosFilter);
  const diagDosStatus = useAppStore(s => s.diagDosStatus);
  const setDiagDosStatus = useAppStore(s => s.setDiagDosStatus);
  // Assignment-engine read/write — drives the Coder status pill below.
  const hccDosAssignments = useAppStore(s => s.hccDosAssignments);
  const initializeHccPatient = useAppStore(s => s.initializeHccPatient);
  const hccCompleteCoder = useAppStore(s => s.hccCompleteCoder);
  const hccRequestRecords = useAppStore(s => s.hccRequestRecords);
  const hccMarkInsufficient = useAppStore(s => s.hccMarkInsufficient);
  const hccRejectDos = useAppStore(s => s.hccRejectDos);
  const hccReturnDos = useAppStore(s => s.hccReturnDos);
  const diagSnapFilter = useAppStore(s => s.diagSnapFilter);
  const setDiagSnapFilter = useAppStore(s => s.setDiagSnapFilter);
  const diagSnapOpen = useAppStore(s => s.diagSnapOpen);
  const setDiagSnapOpen = useAppStore(s => s.setDiagSnapOpen);
  const diagLeftPanel = useAppStore(s => s.diagLeftPanel);
  const setDiagLeftPanel = useAppStore(s => s.setDiagLeftPanel);

  const [overriddenOpen, setOverriddenOpen] = useState(false);
  const [closedOpen, setClosedOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch diagnosis gaps from Supabase when member changes
  useEffect(() => {
    if (member?.name) fetchHccDiagnosisGaps(member.name);
  }, [member?.name, fetchHccDiagnosisGaps]);

  // Phase 2f — fall back to the local ICD mock when Supabase has no rows for
  // this member. Without the fallback, the panel would render empty for any
  // member that hasn't been seeded into `hcc_diagnosis_gaps` yet.
  const icdsRaw = useMemo(() => {
    const fromSupabase = diagnosisGaps.filter(g => g.isLinked !== false);
    if (fromSupabase.length > 0) return fromSupabase;
    return member?.name ? getIcdsForMember(member.name) : [];
  }, [diagnosisGaps, member?.name]);

  const notLinkedRaw = useMemo(() => {
    const fromSupabase = diagnosisGaps.filter(g => g.isLinked === false);
    if (fromSupabase.length > 0) return fromSupabase;
    return member?.name ? getNotLinkedForMember(member.name) : [];
  }, [diagnosisGaps, member?.name]);

  // Snapshot-tile filter: 'Open' = anything not Accepted/Dismissed,
  // 'Suspect' / 'Recapture' / 'Other' narrows by AI suggestion type.
  const passSnapFilter = (icd) => {
    if (!diagSnapFilter || diagSnapFilter === 'Open') return true;
    if (diagSnapFilter === 'Suspect')   return icd.type === 'Suspect';
    if (diagSnapFilter === 'Recapture') return icd.type === 'Recapture';
    // 'Other' = not Suspect/Recapture
    return !['Suspect', 'Recapture'].includes(icd.type || '');
  };

  const icds = useMemo(
    () => icdsRaw.filter(passSnapFilter),
    [icdsRaw, diagSnapFilter],
  );
  const notLinked = useMemo(
    () => notLinkedRaw.filter(passSnapFilter),
    [notLinkedRaw, diagSnapFilter],
  );

  const hccGroups = useMemo(() => groupIcdsByHcc(icds, notLinked), [icds, notLinked]);

  // Buckets used by the ICD (default) view, matching the prototype's
  // four-section layout (lines 3106–3217):
  //  - assocICDs: regular ICDs + AI-suggested ICDs that have been accepted.
  //  - allNotAssoc: AI-suggested ICDs not yet accepted, plus genuinely
  //    unlinked rows.
  //  - overriddenICDs: any ICD with the `overrides` flag (dismissed-with-reason).
  //  - closedICDs: Accepted or Dismissed status.
  const isAI = (i) => ['Suspect', 'Recapture'].includes(i.type || '');
  const assocICDs = useMemo(
    () => icds.filter(i => !isAI(i) || i.status === 'Accepted'),
    [icds],
  );
  const allNotAssoc = useMemo(() => [
    ...icds.filter(i => isAI(i) && i.status !== 'Accepted'),
    ...notLinked,
  ], [icds, notLinked]);
  const overriddenICDs = useMemo(
    () => [...icdsRaw, ...notLinkedRaw].filter(i => i.dismissReason),
    [icdsRaw, notLinkedRaw],
  );
  const closedICDs = useMemo(
    () => [...icdsRaw, ...notLinkedRaw].filter(i => ['Accepted', 'Dismissed'].includes(i.status)),
    [icdsRaw, notLinkedRaw],
  );

  // ── DOS list — for the DosSelector dropdown. Mostly comes from the member's
  // dos_list field (loaded from Supabase / hcc store). If empty, we fall back
  // to a single-row stub built from member.dos so the selector still works.
  const dosList = useMemo(() => {
    if (member?.dos_list?.length) return member.dos_list;
    if (member?.dos) return [{ date: member.dos, status: diagDosStatus }];
    return [];
  }, [member, diagDosStatus]);

  const isSweep = diagDosFilter === 'All DOSs';
  const currentDos = isSweep ? null : (diagDosFilter || dosList[0]?.date || null);

  // Lazily seed the assignment engine for this patient — the first time the
  // DiagPanel opens, every DOS gets a Support assignee + Awaiting status.
  // Idempotent, so subsequent opens are no-ops.
  useEffect(() => {
    if (member?.id) initializeHccPatient(member.id);
  }, [member?.id, initializeHccPatient]);

  // Live engine state for the currently-selected DOS. Used to drive the
  // status pill below and the assignee badge.
  const dosStateKey = member && currentDos ? `${member.id}::${currentDos}` : null;
  const dosState = dosStateKey ? hccDosAssignments[dosStateKey] : null;
  const coderStatus = dosState?.coder?.status || diagDosStatus || member?.cdrS || 'New';

  // Bridge from the DosStatusMenu's onChange (status label) to the right
  // lifecycle transition. The menu is currently rooted in the Coder view.
  const handleCoderStatusChange = (next) => {
    if (!member || !currentDos) { setDiagDosStatus(next); return; }
    switch (next) {
      case 'Completed':         hccCompleteCoder(member.id, currentDos); break;
      case 'Record Requested':  hccRequestRecords(member.id, currentDos); break;
      case 'Insufficient':      hccMarkInsufficient(member.id, currentDos, 'current-user', 'Docs incomplete'); break;
      case 'Reject':            hccRejectDos(member.id, currentDos, 'current-user', 'Docs failed checklist'); break;
      case 'Returned':          hccReturnDos(member.id, currentDos, 'r1', 'current-user', 'Returned from Coder context'); break;
      default:                  /* New / Awaiting / In Progress / Record Received are system-driven */ break;
    }
    setDiagDosStatus(next);
  };

  // Snapshot-tile counts — derived from the *raw* (un-snapFiltered) data
  // so the counts remain stable while the user toggles the snapshot tiles.
  // 'Open' = anything not Accepted or Dismissed.
  // Suspect/Recapture buckets the AI-suggested ICDs; everything else falls
  // into "Other".
  const snapCounts = useMemo(() => {
    const all = [...icdsRaw, ...notLinkedRaw].filter(g => !['Accepted', 'Dismissed'].includes(g.status));
    const suspect = all.filter(g => g.type === 'Suspect').length;
    const recapture = all.filter(g => g.type === 'Recapture').length;
    const other = all.length - suspect - recapture;
    return { open: all.length, suspect, recapture, other };
  }, [icdsRaw, notLinkedRaw]);

  if (!member) return null;

  // Bucket groups by their overall resolution state. A group is "active" if
  // any ICD in either bucket is still open. "Overridden" surfaces groups that
  // have at least one dismissed-with-reason row but are no longer active.
  // "Closed" — everything fully resolved.
  const all = (g) => [...g.assoc, ...g.unlinked];
  const isOpen = (i) => !['Dismissed', 'Accepted'].includes(i.status);

  const activeGroups = hccGroups.filter(g => all(g).some(isOpen));
  const overriddenGroups = hccGroups.filter(g =>
    all(g).some(i => i.dismissReason) && !activeGroups.some(ag => ag.hcc === g.hcc),
  );
  const closedGroups = hccGroups.filter(g => all(g).every(i => !isOpen(i)));

  const rafImpact = (Number(member.ri) || 0).toFixed(3);
  const noop = (label) => () => showToast(`${label} — coming soon`);

  return (
    <Drawer
      title={<span className={styles.drawerTitle}>Diagnosis Gaps Details</span>}
      onClose={closeDiagPanel}
      className={[styles.panel, diagLeftPanel ? styles.panelExpanded : ''].join(' ')}
      bodyClassName={[styles.body, diagLeftPanel ? styles.bodyExpanded : ''].join(' ')}
      headerStyle={{ display: 'none' }}
    >
      {/* When expanded, the workspace sits to the LEFT of the regular drawer
          content. Wrapping both in a flex row keeps the existing panel layout
          intact when the workspace is closed. */}
      {diagLeftPanel && (
        <LeftWorkspace
          active={diagLeftPanel}
          onChange={setDiagLeftPanel}
          onClose={() => setDiagLeftPanel(null)}
          member={member}
        />
      )}

      <div className={diagLeftPanel ? styles.rightPane : styles.rightPaneFull}>
      {/* ── Row 1: Title + Close ── */}
      <div className={styles.titleRow}>
        <span className={styles.titleText}>Diagnosis Gaps Details</span>
        <ActionButton size="L" tooltip="Close" onClick={closeDiagPanel}>
          <CloseIcon size={20} color="var(--neutral-300)" />
        </ActionButton>
      </div>

      {/* ── Row 2: Patient Banner — mirrors prototype line 1911:
          avatar (40×40) + name on top + single inline meta row
          [Patient · Sex · Age · #MemberId · RAF · 0.265↑] + right-side
          phone icon + chevron button. ── */}
      <div className={styles.patientBanner}>
        <div className={styles.avatar}>{member.in}</div>
        <div className={styles.memberInfo}>
          <div className={styles.memberNameRow}>
            <span className={styles.memberName}>{member.name}</span>
            <Icon name="solar:alt-arrow-right-linear" size={11} color="var(--neutral-300)" />
          </div>
          <div className={styles.memberMeta}>
            <span>Patient</span>
            <span className={styles.metaDot}>&bull;</span>
            <span>{member.g === 'M' ? 'Male' : member.g === 'F' ? 'Female' : member.g}</span>
            <span className={styles.metaDot}>&bull;</span>
            <span>{member.age || '—'}</span>
            <span className={styles.metaDot}>&bull;</span>
            <span>{member.memberId || `#${member.id}`}</span>
            <span className={styles.metaDot}>&bull;</span>
            <span className={styles.rafLabel}>RAF</span>
            <span className={styles.rafValue}>{member.raf}</span>
            <span className={styles.rafImpact}>
              {rafImpact}
              <Icon
                name={member.ru !== false ? 'solar:arrow-up-linear' : 'solar:arrow-down-linear'}
                size={10}
                color={member.ru !== false ? 'var(--status-success)' : 'var(--status-error)'}
              />
            </span>
          </div>
        </div>
        <div className={styles.bannerActions}>
          <ActionButton icon="solar:phone-linear" size="S" tooltip="Call" onClick={noop('Call')} />
          <span className={styles.divider} />
          <ActionButton icon="solar:alt-arrow-down-linear" size="S" tooltip="More" onClick={noop('More')} />
        </div>
      </div>

      {/* ── DOS selector + status pill ── */}
      <div className={styles.dosRow}>
        <div className={styles.dosRowLeft}>
          <DosSelector
            value={diagDosFilter ?? dosList[0]?.date}
            dosList={dosList}
            includeAllDOSs={true}
            onChange={(v) => setDiagDosFilter(v)}
          />
          {!isSweep && (
            <>
              <span className={styles.dosRowDivider} />
              <span className={styles.withCoderPill}>
                <span className={styles.withCoderRing} />
                <span>With Coder</span>
              </span>
            </>
          )}
        </div>
        <div className={styles.dosRowRight}>
          <AssigneeAvatar coder={member.cdr} support={member.sup} />
          <span className={styles.dosRowDivider} />
          {isSweep ? (
            <span className={styles.sweepBadge}>Sweep Mode</span>
          ) : (
            <DosStatusMenu
              value={coderStatus}
              onChange={handleCoderStatusChange}
            />
          )}
        </div>
      </div>

      {/* ── Patient Gap Snapshot tiles ── */}
      {!isSweep && (
        <SnapshotTiles
          counts={snapCounts}
          filter={diagSnapFilter}
          onFilter={setDiagSnapFilter}
          open={diagSnapOpen}
          onToggle={setDiagSnapOpen}
        />
      )}

      {/* ── Row 3: View-by toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.viewBy}>
          <span className={styles.viewByLabel}>View by:</span>
          <Toggle items={VIEW_MODES} active={diagViewMode} onChange={setDiagViewMode} size="S" />
        </div>

        <div className={styles.toolbarIcons}>
          <ActionButton icon="solar:refresh-linear" size="S" tooltip="Refresh" onClick={noop('Refresh')} />
          <span className={styles.divider} />
          <button type="button" className={styles.addIcdBtn} onClick={noop('Add ICD')}>
            <Icon name="solar:add-circle-linear" size={16} color="var(--primary-300)" />
            <span>ICD</span>
          </button>
          <span className={styles.divider} />
          <ActionButton icon="solar:check-square-linear" size="S" tooltip="Bulk Action" onClick={noop('Bulk Action')} />
          <span className={styles.divider} />
          <ActionButton icon="custom:filter" size="S" tooltip="Filter" notification count="1" onClick={noop('Filter')} />
          <span className={styles.divider} />
          <ActionButton icon="solar:sort-vertical-linear" size="S" tooltip="Sort" onClick={noop('Sort')} />
          <span className={styles.divider} />
          <ActionButton
            icon="solar:history-linear"
            size="S"
            tooltip="Activity Log"
            className={diagLeftPanel === 'activity' ? styles.activeIcon : ''}
            onClick={() => setDiagLeftPanel(diagLeftPanel === 'activity' ? null : 'activity')}
          />
          <span className={styles.divider} />
          <ActionButton
            icon="solar:notes-linear"
            size="S"
            tooltip="Notes"
            className={diagLeftPanel === 'notes' ? styles.activeIcon : ''}
            onClick={() => setDiagLeftPanel(diagLeftPanel === 'notes' ? null : 'notes')}
          />
          <span className={styles.divider} />
          <ActionButton icon="solar:magnifer-linear" size="S" tooltip="Search" onClick={() => setSearchOpen(o => !o)} />
        </div>
      </div>

      {/* ── Search bar (shown when search icon toggled) ── */}
      {searchOpen && (
        <div className={styles.searchBar}>
          <div className={styles.searchInput}>
            <Icon name="solar:magnifer-linear" size={15} color="var(--neutral-300)" />
            <input
              autoFocus
              type="text"
              placeholder="Search by code or description"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="button"
              className={styles.searchClose}
              onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
              aria-label="Close search"
            >
              <Icon name="solar:close-linear" size={14} color="var(--neutral-300)" />
            </button>
          </div>
        </div>
      )}

      {/* ── Body: Sweep / ICD mode / HCC mode ────────────────────────────
          ICD mode is the default and matches the prototype's 4-section
          layout (Associated / Not Associated / Overridden / Closed). HCC
          mode shows the grouped cards. Sweep mode renders SweepList. */}
      <div className={styles.cardsList}>
        {isSweep ? (
          <SweepList memberName={member.name} dosList={dosList} />
        ) : diagViewMode === 'ICD' ? (
          <IcdSections
            assocICDs={assocICDs}
            allNotAssoc={allNotAssoc}
            overriddenICDs={overriddenICDs}
            closedICDs={closedICDs}
          />
        ) : (
          <>
            {activeGroups.length === 0 && notLinked.length === 0 && (
              <div className={styles.empty}>
                <Icon name="solar:file-text-linear" size={32} color="var(--neutral-200)" />
                <p>No HCC codes recorded yet for this member.</p>
              </div>
            )}
            {activeGroups.map(g => (
              <HccCard
                key={g.hcc}
                hccTitle={g.hcc}
                assoc={g.assoc}
                unlinked={g.unlinked}
              />
            ))}
          </>
        )}
      </div>
      </div>{/* ── /rightPane ── */}
    </Drawer>
  );
}

// ── SweepList — deduplicated ICD list across all DOSes. Phase 2d. ────────
function SweepList({ memberName, dosList }) {
  const acceptHccGap = useAppStore(s => s.acceptHccGap);
  const dismissHccGap = useAppStore(s => s.dismissHccGap);
  const sweepIcds = useMemo(() => getSweepIcdsForMember(memberName), [memberName]);

  return (
    <div className={styles.sweepWrap}>
      <div className={styles.sweepBanner}>
        <Icon name="solar:info-circle-linear" size={11} color="var(--status-warning)" />
        <span>Deduplicated across all DOSs — showing most recent DOS per ICD.</span>
      </div>
      <div className={styles.sweepHeaderRow}>
        <div className={styles.sweepHeaderCode}>Code</div>
        <div className={styles.sweepHeaderDesc}>Description + DOS(s)</div>
        <div className={styles.sweepHeaderActions}>Actions</div>
      </div>
      <div className={styles.sweepList}>
        {sweepIcds.map((icd) => (
          <SweepIcdRow
            key={icd.code}
            icd={icd}
            dosList={dosList}
            onAccept={acceptHccGap}
            onDismiss={dismissHccGap}
          />
        ))}
      </div>
    </div>
  );
}

// ── IcdSections — "View by: ICD" mode (default). Mirrors the prototype's
// 4-section structure (lines 3106–3217):
//   1. Associated with DOS (N)
//   2. Not Associated with DOS (N) — with "✦ Unity Suggested" badge
//   3. Overridden ICDs (N)
//   4. Closed ICDs (N)
// Each section is collapsible; the first two open by default.
function IcdSections({ assocICDs, allNotAssoc, overriddenICDs, closedICDs }) {
  const [assocOpen, setAssocOpen] = useState(true);
  const [notAssocOpen, setNotAssocOpen] = useState(true);
  const [overriddenOpen, setOverriddenOpen] = useState(false);
  const [closedOpen, setClosedOpen] = useState(false);

  return (
    <div className={styles.icdSections}>
      <IcdSection
        title="Associated with DOS"
        count={assocICDs.length}
        open={assocOpen}
        onToggle={() => setAssocOpen(o => !o)}
      >
        {assocICDs.length === 0
          ? <SectionEmpty label="No associated ICDs" />
          : assocICDs.map((icd, i) => <IcdRow key={`a-${icd.code}-${i}`} icd={icd} />)
        }
      </IcdSection>

      <IcdSection
        title="Not Associated with DOS"
        count={allNotAssoc.length}
        open={notAssocOpen}
        onToggle={() => setNotAssocOpen(o => !o)}
        badge={(
          <span className={styles.unitySuggestedBadge}>
            <Icon name="solar:star-bold" size={9} color="var(--primary-300)" />
            <span>Unity Suggested</span>
          </span>
        )}
      >
        {allNotAssoc.length === 0
          ? <SectionEmpty label="No unlinked ICDs" />
          : allNotAssoc.map((icd, i) => <IcdRow key={`u-${icd.code}-${i}`} icd={icd} />)
        }
      </IcdSection>

      <IcdSection
        title="Overridden ICDs"
        count={overriddenICDs.length}
        open={overriddenOpen}
        onToggle={() => setOverriddenOpen(o => !o)}
      >
        {overriddenICDs.length === 0
          ? <SectionEmpty label="No overridden ICDs" />
          : overriddenICDs.map((icd, i) => <IcdRow key={`o-${icd.code}-${i}`} icd={icd} />)
        }
      </IcdSection>

      <IcdSection
        title="Closed ICDs"
        count={closedICDs.length}
        open={closedOpen}
        onToggle={() => setClosedOpen(o => !o)}
      >
        {closedICDs.length === 0
          ? <SectionEmpty label="No closed ICDs" />
          : closedICDs.map((icd, i) => <IcdRow key={`c-${icd.code}-${i}`} icd={icd} />)
        }
      </IcdSection>
    </div>
  );
}

// Section wrapper — collapsible header + content area
function IcdSection({ title, count, open, onToggle, badge, children }) {
  return (
    <section className={styles.icdSection}>
      <button type="button" className={styles.icdSectionHeader} onClick={onToggle}>
        <span className={styles.icdSectionTitle}>
          {title} ({count})
        </span>
        {badge}
        <Icon
          name={open ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'}
          size={14}
          color="var(--neutral-300)"
        />
      </button>
      {open && (
        <div className={styles.icdSectionBody}>
          {children}
        </div>
      )}
    </section>
  );
}

function SectionEmpty({ label }) {
  return <div className={styles.icdSectionEmpty}>{label}</div>;
}
