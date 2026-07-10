import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Button } from '../../../components/Button/Button';
import { SearchListPopover } from '../../../components/Popover/SearchListPopover';
import { SearchBar } from '../../../components/SearchBar/SearchBar';
import { FilterChip } from '../../../components/FilterChip/FilterChip';
import { Checkbox } from '../../../components/ui/checkbox';
import { ProgressRing } from '../../hcc/DiagPanel/ReviewProgressPopover';
import { CP_SUB_TABS, CP_FILTERS } from '../data/programActivityMock';
import { CARE_PROGRAM_CATALOG } from '../data/careProgramCatalog';
import { useAppStore } from '../../../store/useAppStore';
import { ProgramDetailView } from './ProgramDetailView';
import { ProgramDetailSkeleton } from './ProgramDetailSkeleton';
import styles from './CareProgramsTab.module.css';

const matchesTab = (p, tab) => {
  if (tab === 'New') return p.status === 'New';
  if (tab === 'Enrolled') return p.status === 'Enrolled' || p.status === 'Engaged';
  if (tab === 'Completed') return p.status === 'Completed';
  if (tab === 'Closed') return p.status === 'Closed';
  return true;
};

const SUB_STATUS_OPTIONS = ['Assigned', 'Unassigned'];
const DATE_RANGE_OPTIONS = ['Last 7 days', 'Last 30 days', 'Last 90 days'];
const EMPTY_FILTERS = { assignee: [], program: [], status: [], subStatus: [], startDate: [], endDate: [] };

export function CareProgramsTab() {
  const [activeSubTab, setActiveSubTab] = useState('All');
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [searchMode, setSearchMode] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [startAtFirstStep, setStartAtFirstStep] = useState(false);
  const [pendingProgram, setPendingProgram] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState([]);
  const [npOpen, setNpOpen] = useState(false);
  const npBtnRef = useRef(null);

  const patientId = useAppStore(s => s.selectedPatientId);
  const careProgramsByPatient = useAppStore(s => s.careProgramsByPatient);
  const addCareProgram = useAppStore(s => s.addCareProgram);
  const programs = useMemo(
    () => careProgramsByPatient[patientId] || [],
    [careProgramsByPatient, patientId],
  );

  // New Program picker options — short codes only, disabled once enrolled.
  const programOptions = useMemo(() => {
    const added = new Set(programs.map(p => p.code));
    return CARE_PROGRAM_CATALOG.map(entry => ({
      value: entry.code,
      label: entry.code,
      disabled: added.has(entry.code),
      searchText: `${entry.code} ${entry.name}`,
    }));
  }, [programs]);

  // Filter chip options (string lists), derived from the enrolled programs.
  const assigneeOptions = useMemo(
    () => [...new Set(programs.map(p => p.assignee).filter(Boolean))],
    [programs],
  );
  const programOptionsList = useMemo(
    () => [...new Set(programs.map(p => p.code))],
    [programs],
  );
  const statusOptions = useMemo(
    () => [...new Set(programs.map(p => p.status))],
    [programs],
  );
  const filterOptionsFor = (key) => {
    if (key === 'assignee') return assigneeOptions;
    if (key === 'program') return programOptionsList;
    if (key === 'status') return statusOptions;
    if (key === 'subStatus') return SUB_STATUS_OPTIONS;
    return DATE_RANGE_OPTIONS; // startDate / endDate
  };

  const setFilter = (key, vals) => setFilters(f => ({ ...f, [key]: vals }));
  const clearFilters = () => setFilters(EMPTY_FILTERS);

  // Enroll the patient and drop into the program's workflow at its first step,
  // bridged by a short loading state so the screen fills in smoothly.
  const handleAddProgram = (code) => {
    const entry = CARE_PROGRAM_CATALOG.find(e => e.code === code);
    if (!entry) return;
    addCareProgram(patientId, entry);
    const created = useAppStore.getState().careProgramsByPatient[patientId]?.find(p => p.code === code);
    if (created) setPendingProgram({ program: created, firstStep: true });
  };

  const openProgram = (program) => setPendingProgram({ program, firstStep: false });

  // Show the loading placeholder briefly, then commit to the detail view.
  useEffect(() => {
    if (!pendingProgram) return;
    const t = setTimeout(() => {
      setStartAtFirstStep(pendingProgram.firstStep);
      setSelectedProgram(pendingProgram.program);
      setPendingProgram(null);
    }, 700);
    return () => clearTimeout(t);
  }, [pendingProgram]);

  const visible = useMemo(() => {
    let list = programs;
    if (activeSubTab !== 'All') list = list.filter(p => matchesTab(p, activeSubTab));
    if (filters.assignee.length) list = list.filter(p => filters.assignee.includes(p.assignee));
    if (filters.program.length) list = list.filter(p => filters.program.includes(p.code));
    if (filters.status.length) list = list.filter(p => filters.status.includes(p.status));
    const q = searchText.trim().toLowerCase();
    if (q) list = list.filter(p => p.name.toLowerCase().includes(q));
    return list;
  }, [programs, activeSubTab, filters, searchText]);

  const visibleIds = visible.map(p => p.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
  const someSelected = visibleIds.some(id => selectedIds.includes(id)) && !allSelected;
  const toggleAll = (checked) =>
    setSelectedIds(checked
      ? [...new Set([...selectedIds, ...visibleIds])]
      : selectedIds.filter(id => !visibleIds.includes(id)));
  const toggleOne = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const newProgramControl = (align = 'left') => (
    <div className={styles.npWrap}>
      <Button
        ref={npBtnRef}
        variant="tertiary"
        size="L"
        leadingIcon="solar:add-circle-linear"
        trailingIcon="solar:alt-arrow-down-linear"
        onClick={() => setNpOpen(o => !o)}
      >
        New Program
      </Button>
      {npOpen && (
        <SearchListPopover
          anchorRect={npBtnRef.current?.getBoundingClientRect()}
          align={align}
          options={programOptions}
          onSelect={handleAddProgram}
          onClose={() => setNpOpen(false)}
          searchPlaceholder="Search programs"
          emptyText="No programs found"
        />
      )}
    </div>
  );

  if (pendingProgram) {
    return <ProgramDetailSkeleton />;
  }

  if (selectedProgram) {
    return (
      <ProgramDetailView
        program={selectedProgram}
        startAtFirstStep={startAtFirstStep}
        onClose={() => setSelectedProgram(null)}
      />
    );
  }

  // ── Empty state — patient not yet enrolled in any program ──
  if (programs.length === 0) {
    return (
      <div className={styles.view}>
        <div className={styles.emptyWrap}>
          <div className={styles.emptyCard}>
            <div className={styles.emptyIcon}>
              <span className={styles.iconInner}>
                <Icon name="solar:hand-heart-linear" size={46} color="var(--neutral-200)" />
              </span>
            </div>
            <p className={styles.emptyText}>No Active Programs</p>
            {newProgramControl('left')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.view}>
      {/* Top area: sub-tab bar + filter bar sit flush (no gap between them) */}
      <div className={styles.topArea}>
        {/* Sub-tab bar — transforms into a search bar when search is active */}
        {searchMode ? (
          <div className={styles.subTabBar}>
            <SearchBar
              fullWidth
              placeholder="Search programs"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onClose={() => { setSearchMode(false); setSearchText(''); }}
            />
          </div>
        ) : (
          <div className={styles.subTabBar}>
            <div className={styles.subTabs}>
              <ActionButton icon="solar:magnifer-linear" size="S" tooltip="Search" onClick={() => setSearchMode(true)} />
              <span style={{ width: 0.5, height: 16, background: 'var(--neutral-150)', flexShrink: 0 }} />
              {CP_SUB_TABS.map(tab => (
                <button
                  key={tab}
                  className={`${styles.subTab} ${activeSubTab === tab ? styles.subTabActive : ''}`}
                  onClick={() => setActiveSubTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            {newProgramControl('right')}
            <span style={{ width: 0.5, height: 16, background: 'var(--neutral-150)', flexShrink: 0 }} />
            <ActionButton
              icon="solar:filter-linear"
              size="S"
              tooltip="Filter"
              tooltipLeft
              iconColor={showFilters ? 'var(--primary-300)' : undefined}
              onClick={() => setShowFilters(v => !v)}
            />
          </div>
        )}

        {/* Filter bar — filter chips; only shown when toggled on */}
        {showFilters && !searchMode && (
          <div className={styles.filterBar}>
            {CP_FILTERS.map(f => (
              <FilterChip
                key={f.key}
                label={f.label}
                options={filterOptionsFor(f.key)}
                selected={filters[f.key]}
                onChange={vals => setFilter(f.key, vals)}
              />
            ))}
            <button className={styles.clearAll} onClick={clearFilters}>
              <Icon name="solar:backspace-linear" size={16} color="var(--primary-300)" />
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkCell}>
                <Checkbox
                  checked={someSelected ? 'indeterminate' : allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all programs"
                />
              </th>
              <th className={styles.programCell}>Program Name</th>
              <th className={styles.statusCell}>Status</th>
              <th className={styles.dateCell}>Start Date</th>
              <th className={styles.dateCell}>End Date</th>
              <th className={styles.dateCell}>Last Updated</th>
              <th className={styles.assigneeCell}>Assignee</th>
              <th className={styles.pcpCell}>PCP</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(p => (
              <tr key={p.id} className={styles.clickableRow} onClick={() => openProgram(p)}>
                <td className={styles.checkCell} onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(p.id)}
                    onCheckedChange={() => toggleOne(p.id)}
                    aria-label={`Select ${p.name}`}
                  />
                </td>
                <td className={styles.programCell}>
                  <div className={styles.programName}>
                    <ProgressRing progress={p.progress} size={16} stroke={2} />
                    <div className={styles.nameBlock}>
                      <span className={styles.nameText}>{p.name}</span>
                      {p.acuity && <span className={styles.acuityText}>Acuity : {p.acuity}</span>}
                    </div>
                  </div>
                </td>
                <td className={styles.statusCell}>
                  <button className={styles.statusBtn} style={{ color: p.statusColor }}>
                    {p.status}
                    <Icon name="solar:alt-arrow-down-linear" size={16} color={p.statusColor} />
                  </button>
                </td>
                <td className={styles.dateCell}>{p.startDate}</td>
                <td className={styles.dateCell}>{p.endDate}</td>
                <td className={styles.dateCell}>{p.lastUpdated}</td>
                <td className={styles.assigneeCell}>{p.assignee}</td>
                <td className={styles.pcpCell}>{p.pcp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
