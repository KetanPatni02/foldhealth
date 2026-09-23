import { useState, useEffect, useMemo } from 'react';
import { ActionButton } from '../../../../../../components/ActionButton/ActionButton';
import { Icon } from '../../../../../../components/Icon/Icon';
import { CardSkeleton } from '../../../../../../components/CardSkeleton/CardSkeleton';
import { AddProblemsDrawer } from '../AddProblemsDrawer';
import { AddMedicationsDrawer } from '../AddMedicationsDrawer';
import { AddAllergiesDrawer } from '../AddAllergiesDrawer';
import { AddImmunizationsDrawer } from '../AddImmunizationsDrawer';
import { AddSurgicalHistoryDrawer } from '../AddSurgicalHistoryDrawer';
import { RingEmptyState } from '../../../../../../components/RingEmptyState/RingEmptyState';
import { MenuPopover } from '../../../../../../components/MenuPopover/MenuPopover';
import { ConfirmDialog } from '../../../../../../components/ConfirmDialog/ConfirmDialog';
import { DownChevronIcon } from '../../../../../../components/Icon/DownChevronIcon';
import { useAppStore } from '../../../../../../store/useAppStore';
import { formatClinicalDate, formatDaysAgo } from '../../../../../../lib/clinicalDates';
import styles from './PAMIHxTab.module.css';

const NOOP = () => {};

// — Static data —
//
// Recent Clinical Events and Lab / Imaging Reports have no source to read from
// yet, so they show fixed sample rows for every patient. Their sections keep
// the empty-state branch, ready for when real data replaces these constants.

const CLINICAL_EVENTS = [
  { id: 'ce1', title: 'New unsynced data found from Network', reportedOn: '2024-09-11', meta: '41 items', action: 'Reconcile' },
  { id: 'ce2', title: 'Patient reported data found', reportedOn: '2024-09-11', meta: '2 items', action: 'Reconcile' },
  { id: 'ce3', title: 'New Lab Report', reportedOn: '2024-09-11', meta: 'Elation Montrose', action: 'View' },
  { id: 'ce4', title: 'New Imaging Report', reportedOn: '2024-09-11', meta: null, action: 'View' },
];

const LAB_REPORTS = [
  { id: 'lr1', title: 'Complete Blood Count (CBC)', issuedOn: '2024-09-11' },
  { id: 'lr2', title: 'Comprehensive Metabolic Panel (CMP)', issuedOn: '2024-09-05' },
  { id: 'lr3', title: 'HbA1c Test', issuedOn: '2024-08-20' },
];

const IMAGING_REPORTS = [
  { id: 'ir1', title: 'Chest X-Ray', issuedOn: '2024-09-11' },
  { id: 'ir2', title: 'Abdominal Ultrasound', issuedOn: '2024-08-15' },
];

// — Shared primitives —

function Badge({ label }) {
  return <span className={styles.badge}>{label}</span>;
}

function ColHeader({ nameLabel = 'Name', statusLabel = 'Status' }) {
  return (
    <div className={styles.colHeader}>
      <span className={styles.colName}>{nameLabel}</span>
      <span className={styles.colStatus}>{statusLabel}</span>
      <span className={styles.colActions} />
    </div>
  );
}

function FooterLink({ label, onClick }) {
  return (
    <div className={styles.footerRow}>
      <button type="button" className={styles.footerLink} onClick={onClick}>
        {label}
        <Icon name="solar:alt-arrow-right-linear" size={10} color="var(--primary-300)" />
      </button>
    </div>
  );
}

function DataRow({ children, actions }) {
  return (
    <div className={styles.row}>
      {children}
      {actions || <span className={styles.actionsSpacer} aria-hidden="true" />}
    </div>
  );
}

/**
 * The row's "⋯" menu. Every PAMI list offers the same one action, so they
 * share it rather than each growing its own popover.
 *
 * Remove asks first. A status change can be undone from its toast, but a
 * removed record is gone, so this is the one place a confirm earns its click.
 */
function RowMenu({ label, onRemove }) {
  const [menuRect, setMenuRect] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  if (!onRemove) return null;

  const remove = async () => {
    setRemoving(true);
    await onRemove();
    setRemoving(false);
    setConfirming(false);
  };

  return (
    <div className={styles.moreBtn}>
      <ActionButton
        icon="solar:menu-dots-linear"
        size="S"
        tooltip="More"
        aria-label={`Actions for ${label}`}
        onClick={(e) => setMenuRect(e.currentTarget.getBoundingClientRect())}
      />
      {menuRect && (
        <MenuPopover
          anchorRect={menuRect}
          align="right"
          width={140}
          ariaLabel={`${label} actions`}
          items={[{ key: 'remove', label: 'Remove', icon: 'solar:trash-bin-trash-linear', danger: true }]}
          onSelect={() => { setMenuRect(null); setConfirming(true); }}
          onClose={() => setMenuRect(null)}
        />
      )}
      {confirming && (
        <ConfirmDialog
          variant="destructive"
          title={`Remove ${label}?`}
          description="This removes it from the patient's record and can't be undone."
          confirmLabel="Remove"
          loading={removing}
          onConfirm={remove}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

function SectionHeader({ title, actions, collapsed, onToggle }) {
  return (
    <div className={styles.sectionHeader}>
      <span className={styles.sectionTitle}>{title}</span>
      {onToggle && (
        <button className={styles.collapseToggle} onClick={onToggle} aria-expanded={!collapsed} aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}>
          <DownChevronIcon size={12} color="var(--neutral-200)" style={collapsed ? { transform: 'rotate(-90deg)' } : undefined} />
        </button>
      )}
      {actions && <div className={styles.sectionActions}>{actions}</div>}
    </div>
  );
}

function CollapseWrapper({ collapsed, children }) {
  return (
    <div className={`${styles.collapseOuter} ${collapsed ? styles.collapsedSection : ''}`}>
      <div className={styles.collapseInner}>{children}</div>
    </div>
  );
}

function AddBtn({ onClick, disabled }) {
  return (
    <ActionButton
      icon="solar:add-linear"
      size="S"
      tooltip="Add"
      className={styles.addBtn}
      onClick={onClick}
      disabled={disabled}
    />
  );
}

// — Row components —

function ClinicalEventRow({ event }) {
  return (
    <DataRow key={event.id}>
      <div className={styles.nameCell}>
        <span className={styles.name}>{event.title}</span>
        <div className={styles.metaRow}>
          <span className={styles.meta}>Reported on: {formatClinicalDate(event.reportedOn)}</span>
          {event.meta && <><span className={styles.metaDot}>•</span><span className={styles.meta}>{event.meta}</span></>}
        </div>
      </div>
      <div className={styles.eventAction}>
        <button className={styles.actionLink} onClick={NOOP}>
          <Icon
            name={event.action === 'Reconcile' ? 'solar:refresh-linear' : 'solar:eye-linear'}
            size={12}
            color="var(--primary-300)"
          />
          {event.action}
        </button>
      </div>
    </DataRow>
  );
}

function ProblemRow({ item, onRemove }) {
  // Same meta line as the Add Problems drawer: plain text throughout, joined
  // by bullets, with no trailing separator.
  const meta = [item.onsetLabel || item.date, item.type, item.severity].filter(Boolean);
  return (
    <div className={styles.row}>
      <div className={styles.nameCell}>
        <span className={styles.name}>{item.title}</span>
        <div className={styles.metaRow}>
          {meta.map((part, i) => (
            <span key={part} className={styles.meta}>
              {i > 0 && <span className={styles.metaDot}>•</span>}
              {part}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.statusCell}>
        <span className={styles.statusActive}>{item.status}</span>
      </div>
      {onRemove
        ? <RowMenu label={item.title} onRemove={() => onRemove(item)} />
        : <span className={styles.actionsSpacer} aria-hidden="true" />}
    </div>
  );
}

function AllergyRow({ item, onRemove }) {
  const meta = [
    item.reactionType,
    item.criticality ? `${item.criticality} Criticality` : '',
    item.sinceDate ? `Since ${formatClinicalDate(item.sinceDate)}` : '',
  ].filter(Boolean);
  return (
    <DataRow key={item.id} actions={<RowMenu label={item.title} onRemove={onRemove && (() => onRemove(item))} />}>
      <div className={styles.nameCell}>
        <span className={styles.name}>{item.title}</span>
        <div className={styles.metaRow}>
          {meta.map((part, i) => (
            <span key={part} className={styles.meta}>
              {i > 0 && <span className={styles.metaDot}>•</span>}
              {part}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.statusCell}>
        <span className={styles.statusNeutral}>{item.status || 'Active'}</span>
      </div>
    </DataRow>
  );
}

function MedicationRow({ item, onRemove }) {
  return (
    <DataRow key={item.id} actions={<RowMenu label={item.name} onRemove={onRemove && (() => onRemove(item))} />}>
      <div className={styles.nameCell}>
        <span className={styles.name}>{item.name}</span>
        <span className={styles.meta}>
          {item.start ? `Start: ${formatClinicalDate(item.start)}` : ''}{item.stop ? ` • Stop: ${formatClinicalDate(item.stop)}` : ''}
        </span>
        {item.sig && <span className={styles.meta}>{item.sig}</span>}
      </div>
      <div className={styles.statusCell}>
        <span className={styles.statusNeutral}>{item.status}</span>
      </div>
    </DataRow>
  );
}

function ImmunizationRow({ item, onRemove }) {
  const dose = [item.doseQuantity, item.doseUnits].filter(Boolean).join(' ');
  const meta = [
    item.dateAdministered ? `Date Administered: ${formatClinicalDate(item.dateAdministered)}` : '',
    dose,
  ].filter(Boolean);
  return (
    <DataRow key={item.id} actions={<RowMenu label={item.title} onRemove={onRemove && (() => onRemove(item))} />}>
      <div className={styles.nameCell}>
        <span className={styles.name}>{item.title}</span>
        <div className={styles.metaRow}>
          {meta.map((part, i) => (
            <span key={part} className={styles.meta}>
              {i > 0 && <span className={styles.metaDot}>•</span>}
              {part}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.statusCell}>
        <span className={styles.statusNeutral}>{item.status}</span>
      </div>
    </DataRow>
  );
}

// Medical and surgical entries are a condition plus when it was recorded.
function DatedHistoryRow({ item }) {
  return (
    <div className={styles.historyRow}>
      <div className={styles.historyContent}>
        <span className={styles.name}>{item.title}</span>
        {item.recordedOn && <span className={styles.meta}>{formatDaysAgo(item.recordedOn)}</span>}
      </div>
    </div>
  );
}

function SurgicalHistoryRow({ item, onRemove }) {
  return (
    <div className={styles.historyRow}>
      <div className={styles.historyContent}>
        <span className={styles.name}>{item.title}</span>
        {item.recordedOn && <span className={styles.meta}>Performed: {formatClinicalDate(item.recordedOn)}</span>}
      </div>
      <RowMenu label={item.title} onRemove={onRemove && (() => onRemove(item))} />
    </div>
  );
}

function FamilyHistoryRow({ item }) {
  return (
    <div className={styles.historyFamilyRow}>
      <span className={styles.familyRelation}>{item.relation}</span>
      <span className={styles.familyName}>{item.title}</span>
      <span className={styles.familyDesc}>{item.detail}</span>
    </div>
  );
}

function SocialHistoryRow({ item }) {
  return (
    <div className={styles.historyRow}>
      <div className={styles.historyContent}>
        <span className={styles.name}>{item.title}</span>
        <span className={styles.meta}>{item.detail}</span>
      </div>
    </div>
  );
}

function ReportRow({ item }) {
  return (
    <div className={styles.row}>
      <div className={styles.nameCell}>
        <span className={styles.name}>{item.title}</span>
        <span className={styles.meta}>Issued On: {formatClinicalDate(item.issuedOn)}</span>
      </div>
      <div className={styles.reportActionsCell}>
        <ActionButton icon="solar:eye-linear" size="S" tooltip="View" />
        <span className={styles.reportActionDivider} />
        <ActionButton icon="solar:download-minimalistic-linear" size="S" tooltip="Download" />
      </div>
    </div>
  );
}

function ReportColHeader({ nameLabel }) {
  return (
    <div className={styles.colHeader}>
      <span className={styles.colName}>{nameLabel}</span>
      <div className={styles.reportColActions}>
        <ActionButton icon="solar:sort-linear" size="S" tooltip="Sort" />
        <ActionButton icon="custom:filter" size="S" tooltip="Filter" />
      </div>
    </div>
  );
}

// — Section components —

function RecentClinicalEvents({ updates, loading }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={styles.section}>
      <SectionHeader title="Recent Clinical Events" collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      <CollapseWrapper collapsed={collapsed}>
        {!loading && updates.length === 0 ? (
          <div className={styles.emptyCard}>
            <RingEmptyState icon="solar:bell-linear" label="No Recent Clinical Events" iconSize={31} />
          </div>
        ) : (
          <div className={styles.card}>
            <div className={styles.colHeader}>
              <span className={styles.colName}>Event Name</span>
              <span className={styles.colActions} />
            </div>
            {loading
              ? <CardSkeleton rows={3} />
              : updates.map(ev => <ClinicalEventRow key={ev.id} event={ev} />)}
          </div>
        )}
      </CollapseWrapper>
    </div>
  );
}

function ProblemsSection({ patientId }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const storeProblems = useAppStore(s => (patientId ? s.patientProblems[patientId] : null));
  const loadedFor = useAppStore(s => (patientId ? s.patientProblemsLoadedFor[patientId] : false));
  const fetchPatientProblems = useAppStore(s => s.fetchPatientProblems);
  const removePatientProblem = useAppStore(s => s.removePatientProblem);

  useEffect(() => { if (patientId) fetchPatientProblems(patientId); }, [patientId, fetchPatientProblems]);

  const problems = useMemo(() => storeProblems || [], [storeProblems]);
  // Controlled stays on the active list — see the Add Problems drawer.
  const active = problems.filter(p => p.status !== 'Resolved');
  const resolvedCount = problems.filter(p => p.status === 'Resolved').length;
  const loading = !!patientId && !loadedFor;

  return (
    <div className={styles.section}>
      <SectionHeader
        title="Problems"
        actions={<AddBtn onClick={() => setDrawerOpen(true)} disabled={!patientId} />}
        collapsed={collapsed}
        onToggle={() => setCollapsed(v => !v)}
      />
      <CollapseWrapper collapsed={collapsed}>
        {!loading && active.length === 0 ? (
          <div className={styles.emptyCard}>
            <RingEmptyState icon="solar:health-linear" label="No Active Problems" iconSize={31} />
          </div>
        ) : (
        <div className={styles.card}>
          <ColHeader />
          {loading ? (
            <CardSkeleton rows={3} />
          ) : (
            active.map(item => (
              <ProblemRow
                key={item.id}
                item={item}
                onRemove={p => removePatientProblem(patientId, p.id)}
              />
            ))
          )}
          {resolvedCount > 0 && (
            <FooterLink
              label={`Resolved (${resolvedCount})`}
              onClick={() => setDrawerOpen('resolved')}
            />
          )}
        </div>
        )}
      </CollapseWrapper>
      {drawerOpen && (
        <AddProblemsDrawer
          patientId={patientId}
          focus={drawerOpen === 'resolved' ? 'resolved' : undefined}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}

function AllergiesSection({ patientId }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const stored = useAppStore(s => (patientId ? s.patientAllergies[patientId] : null));
  const loadedFor = useAppStore(s => (patientId ? s.patientAllergiesLoadedFor[patientId] : false));
  const fetchPatientAllergies = useAppStore(s => s.fetchPatientAllergies);
  const removePatientAllergy = useAppStore(s => s.removePatientAllergy);

  useEffect(() => { if (patientId) fetchPatientAllergies(patientId); }, [patientId, fetchPatientAllergies]);

  const allergies = useMemo(() => stored || [], [stored]);
  const active = allergies.filter(a => (a.status || 'Active') !== 'Past');
  const pastCount = allergies.filter(a => a.status === 'Past').length;
  const loading = !!patientId && !loadedFor;

  return (
    <div className={styles.section}>
      <SectionHeader
        title="Allergies"
        actions={<AddBtn onClick={() => setDrawerOpen(true)} disabled={!patientId} />}
        collapsed={collapsed}
        onToggle={() => setCollapsed(v => !v)}
      />
      <CollapseWrapper collapsed={collapsed}>
        {!loading && active.length === 0 ? (
          <div className={styles.emptyCard}>
            <RingEmptyState icon="custom:allergy" label="No Active Allergies" iconSize={31} />
          </div>
        ) : (
        <div className={styles.card}>
          <ColHeader />
          {loading
            ? <CardSkeleton rows={3} />
            : active.map(item => (
              <AllergyRow
                key={item.id}
                item={item}
                onRemove={a => removePatientAllergy(patientId, a.id)}
              />
            ))}
          {pastCount > 0 && (
            <FooterLink
              label={`Past (${pastCount})`}
              onClick={() => setDrawerOpen('past')}
            />
          )}
        </div>
        )}
      </CollapseWrapper>
      {drawerOpen && (
        <AddAllergiesDrawer
          patientId={patientId}
          focus={drawerOpen === 'past' ? 'past' : undefined}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}

function MedicationsSection({ patientId }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const storeMeds = useAppStore(s => (patientId ? s.patientMedications[patientId] : null));
  const loadedFor = useAppStore(s => (patientId ? s.patientMedicationsLoadedFor[patientId] : false));
  const fetchPatientMedications = useAppStore(s => s.fetchPatientMedications);
  const removePatientMedication = useAppStore(s => s.removePatientMedication);

  useEffect(() => { if (patientId) fetchPatientMedications(patientId); }, [patientId, fetchPatientMedications]);

  const meds = useMemo(() => storeMeds || [], [storeMeds]);
  const active = meds.filter(m => (m.status || 'Active') !== 'Stopped');
  const stoppedCount = meds.filter(m => m.status === 'Stopped').length;
  const loading = !!patientId && !loadedFor;

  return (
    <div className={styles.section}>
      <SectionHeader
        title="Medications"
        actions={<AddBtn onClick={() => setDrawerOpen(true)} disabled={!patientId} />}
        collapsed={collapsed}
        onToggle={() => setCollapsed(v => !v)}
      />
      <CollapseWrapper collapsed={collapsed}>
        {!loading && active.length === 0 ? (
          <div className={styles.emptyCard}>
            <RingEmptyState icon="solar:pill-linear" label="No Active Medications" iconSize={31} />
          </div>
        ) : (
        <div className={styles.card}>
          <ColHeader />
          {loading
            ? <CardSkeleton rows={3} />
            : active.map(item => (
              <MedicationRow
                key={item.id}
                item={item}
                onRemove={m => removePatientMedication(patientId, m.id)}
              />
            ))}
          {stoppedCount > 0 && (
            <FooterLink
              label={`Stopped (${stoppedCount})`}
              onClick={() => setDrawerOpen('stopped')}
            />
          )}
        </div>
        )}
      </CollapseWrapper>
      {drawerOpen && (
        <AddMedicationsDrawer
          patientId={patientId}
          focus={drawerOpen === 'stopped' ? 'stopped' : undefined}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}

function ImmunizationsSection({ patientId }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const stored = useAppStore(s => (patientId ? s.patientImmunizations[patientId] : null));
  const loadedFor = useAppStore(s => (patientId ? s.patientImmunizationsLoadedFor[patientId] : false));
  const fetchPatientImmunizations = useAppStore(s => s.fetchPatientImmunizations);
  const removePatientImmunization = useAppStore(s => s.removePatientImmunization);

  useEffect(() => { if (patientId) fetchPatientImmunizations(patientId); }, [patientId, fetchPatientImmunizations]);

  const immunizations = useMemo(() => stored || [], [stored]);
  const active = immunizations.filter(i => (i.status || 'Active') !== 'Completed');
  const completedCount = immunizations.filter(i => i.status === 'Completed').length;
  const loading = !!patientId && !loadedFor;

  return (
    <div className={styles.section}>
      <SectionHeader
        title="Immunizations"
        actions={<AddBtn onClick={() => setDrawerOpen(true)} disabled={!patientId} />}
        collapsed={collapsed}
        onToggle={() => setCollapsed(v => !v)}
      />
      <CollapseWrapper collapsed={collapsed}>
        {!loading && active.length === 0 ? (
          <div className={styles.emptyCard}>
            <RingEmptyState icon="solar:syringe-linear" label="No Active Immunizations" iconSize={31} />
          </div>
        ) : (
        <div className={styles.card}>
          <ColHeader />
          {loading
            ? <CardSkeleton rows={3} />
            : active.map(item => (
              <ImmunizationRow
                key={item.id}
                item={item}
                onRemove={i => removePatientImmunization(patientId, i.id)}
              />
            ))}
          {completedCount > 0 && (
            <FooterLink
              label={`Completed (${completedCount})`}
              onClick={() => setDrawerOpen('completed')}
            />
          )}
        </div>
        )}
      </CollapseWrapper>
      {drawerOpen && (
        <AddImmunizationsDrawer
          patientId={patientId}
          focus={drawerOpen === 'completed' ? 'completed' : undefined}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}

function HistorySubCard({ title, actions, children, footer }) {
  return (
    <div className={styles.historyCard}>
      <div className={styles.historySubHeader}>
        <span className={styles.historySubTitle}>{title}</span>
        {actions && <div className={styles.subHeaderActions}>{actions}</div>}
      </div>
      {children}
      {footer}
    </div>
  );
}

function ReportsSection({ title, nameLabel, emptyLabel, emptyIcon, reports, loading }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={styles.section}>
      <SectionHeader title={title} actions={<AddBtn />} collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      <CollapseWrapper collapsed={collapsed}>
        {!loading && reports.length === 0 ? (
          <div className={styles.emptyCard}>
            <RingEmptyState icon={emptyIcon} label={emptyLabel} iconSize={31} />
          </div>
        ) : (
          <div className={styles.card}>
            <ReportColHeader nameLabel={nameLabel} />
            {loading
              ? <CardSkeleton rows={2} />
              : reports.map(item => <ReportRow key={item.id} item={item} />)}
          </div>
        )}
      </CollapseWrapper>
    </div>
  );
}

// "Not Synced (N)" counts real rows now; with nothing unsynced there is
// nothing to say, so the footer drops away.
function unsyncedFooter(entries) {
  const n = entries.filter(e => !e.synced).length;
  return n > 0 ? <FooterLink label={`Not Synced (${n})`} /> : null;
}

// Every history card shares one loading / empty / list treatment, so the four
// cards can't drift apart.
function HistoryEntries({ entries, loading, emptyIcon, emptyLabel, render }) {
  if (loading) return <CardSkeleton rows={1} />;
  if (entries.length === 0) {
    return (
      <div className={styles.emptyCard}>
        <RingEmptyState icon={emptyIcon} label={emptyLabel} iconSize={31} />
      </div>
    );
  }
  return entries.map(render);
}

function HistorySection({ patientId, history, loading }) {
  const [collapsed, setCollapsed] = useState(false);
  const [surgicalOpen, setSurgicalOpen] = useState(false);
  const removePatientHistoryEntry = useAppStore(s => s.removePatientHistoryEntry);
  const byKind = (kind) => history.filter(h => h.kind === kind);
  const medical = byKind('medical');
  // Newest first, matching the drawer.
  const surgical = byKind('surgical').sort((a, b) => (b.recordedOn || '').localeCompare(a.recordedOn || ''));
  const family = byKind('family');
  const social = byKind('social');

  return (
    <div className={styles.section}>
      <SectionHeader title="History" collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      <CollapseWrapper collapsed={collapsed}>
      <div className={styles.historyWrapper}>
        <HistorySubCard title="Medical History" actions={<AddBtn onClick={NOOP} />} footer={unsyncedFooter(medical)}>
          <HistoryEntries
            entries={medical}
            loading={loading}
            emptyIcon="custom:medical-history"
            emptyLabel="No Medical History"
            render={item => <DatedHistoryRow key={item.id} item={item} />}
          />
        </HistorySubCard>

        <HistorySubCard
          title="Surgical History"
          actions={<AddBtn onClick={() => setSurgicalOpen(true)} disabled={!patientId} />}
          footer={unsyncedFooter(surgical)}
        >
          <HistoryEntries
            entries={surgical}
            loading={loading}
            emptyIcon="custom:scalpel"
            emptyLabel="No Surgical History"
            render={item => (
              <SurgicalHistoryRow
                key={item.id}
                item={item}
                onRemove={e => removePatientHistoryEntry(patientId, e.id)}
              />
            )}
          />
        </HistorySubCard>

        <HistorySubCard
          title="Family History"
          actions={
            <>
              <ActionButton icon="solar:sort-linear" size="S" tooltip="Sort" />
              <ActionButton icon="custom:filter" size="S" tooltip="Filter" />
            </>
          }
          footer={unsyncedFooter(family)}
        >
          <HistoryEntries
            entries={family}
            loading={loading}
            emptyIcon="custom:family-history"
            emptyLabel="No Family History"
            render={item => <FamilyHistoryRow key={item.id} item={item} />}
          />
        </HistorySubCard>

        <HistorySubCard
          title="Social History"
          actions={
            <>
              <button className={styles.profileLink} onClick={NOOP}>
                Central Profile
                <Icon name="solar:alt-arrow-down-linear" size={10} color="var(--neutral-300)" />
              </button>
              <span className={styles.subHeaderDivider} />
              <AddBtn onClick={NOOP} />
            </>
          }
          footer={unsyncedFooter(social)}
        >
          <HistoryEntries
            entries={social}
            loading={loading}
            emptyIcon="custom:social-history"
            emptyLabel="No Social History"
            render={item => <SocialHistoryRow key={item.id} item={item} />}
          />
        </HistorySubCard>
      </div>
      </CollapseWrapper>
      {surgicalOpen && (
        <AddSurgicalHistoryDrawer patientId={patientId} onClose={() => setSurgicalOpen(false)} />
      )}
    </div>
  );
}

const EMPTY_RECORDS = { history: [] };

export function PAMIHxTab({ patientId }) {
  const records = useAppStore(s => (patientId ? s.patientPamiRecords[patientId] : null)) || EMPTY_RECORDS;
  const loadedFor = useAppStore(s => (patientId ? s.patientPamiRecordsLoadedFor[patientId] : false));
  const fetchPatientPamiRecords = useAppStore(s => s.fetchPatientPamiRecords);

  useEffect(() => { if (patientId) fetchPatientPamiRecords(patientId); }, [patientId, fetchPatientPamiRecords]);
  const loading = !!patientId && !loadedFor;

  return (
    <div className={styles.wrapper}>
      <RecentClinicalEvents updates={CLINICAL_EVENTS} loading={false} />
      <ProblemsSection patientId={patientId} />
      <AllergiesSection patientId={patientId} />
      <MedicationsSection patientId={patientId} />
      <ImmunizationsSection patientId={patientId} />
      <HistorySection patientId={patientId} history={records.history} loading={loading} />
      <ReportsSection
        title="Lab Reports"
        nameLabel="Lab Name"
        emptyLabel="No Lab Reports"
        emptyIcon="solar:test-tube-linear"
        reports={LAB_REPORTS}
        loading={false}
      />
      <ReportsSection
        title="Imaging Reports"
        nameLabel="Report Name"
        emptyLabel="No Imaging Reports"
        emptyIcon="custom:imaging"
        reports={IMAGING_REPORTS}
        loading={false}
      />
    </div>
  );
}
