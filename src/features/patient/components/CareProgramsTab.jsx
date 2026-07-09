import { useState, useRef, useEffect } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Button } from '../../../components/Button/Button';
import { Select } from '../../../components/Select/Select';
import { DatePicker } from '../../../components/DatePicker/DatePicker';
import { Drawer } from '../../../components/Drawer/Drawer';
import { ProgressRing } from '../../hcc/DiagPanel/ReviewProgressPopover';
import {
  CARE_PROGRAMS_MOCK, CP_SUB_TABS, CP_FILTERS,
  programsForPatient, apcmDefaultsForPatient,
} from '../data/programActivityMock';
import { useAppStore } from '../../../store/useAppStore';
import { ProgramDetailView } from './ProgramDetailView';
import styles from './CareProgramsTab.module.css';

// Programs shown in the "New Program" picker. Order matches the design mock;
// only APE has a real Create flow wired up right now — the rest short-circuit
// to a "coming soon" toast.
const PROGRAM_OPTIONS = [
  { key: 'TCM',    label: 'TCM' },
  { key: 'AWV',    label: 'AWV' },
  { key: 'DM',     label: 'DM' },
  { key: 'SNP',    label: 'SNP' },
  { key: 'CMP',    label: 'CMP' },
  { key: 'TOC IP', label: 'TOC IP' },
  { key: 'TOC ED', label: 'TOC ED' },
  { key: 'HICM',   label: 'HICM' },
  { key: 'CAH',    label: 'CAH' },
  { key: 'APE',    label: 'APE' },
];

// ─── Measurement Year — rolling-quarter Year Display Logic (per AC-19) ──────
// A stand-in "today" for demos — swap this constant to jog through the rules
// during walkthroughs. In prod this would be `new Date()`.
const TODAY = new Date();

// Given a Date, return the sorted list of Measurement Years the dropdown
// should surface, following the rule set in the user story:
//   Dec of MY N            → [N, N+1]
//   Jan–Mar of MY N+1      → [N, N+1]     (still in the Dec-window overlap)
//   Apr–Sep of MY N+1      → [N+1]        (single year — no overlap)
//   Oct–Dec of MY N+1      → [N+1, N+2]
// Rule interpretation: measurement year rolls in April; Dec + Q1 form a
// two-year overlap window with the previous MY. Oct+Nov+Dec form the
// forward-looking overlap with the next MY.
function computeMeasurementYearOptions(today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-based: Jan = 0
  const currentMY = month <= 2 /* Jan-Mar */ ? year - 1 : year;
  let years;
  if (month === 11 /* Dec */) {
    years = [currentMY, currentMY + 1];
  } else if (month <= 2 /* Jan-Mar */) {
    years = [currentMY, currentMY + 1];
  } else if (month <= 8 /* Apr-Sep */) {
    years = [currentMY];
  } else /* Oct-Nov */ {
    years = [currentMY, currentMY + 1];
  }
  return years.map(y => ({ label: String(y), value: String(y) }));
}

function currentMeasurementYear(today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth();
  return month <= 2 ? year - 1 : year;
}

const APE_TYPE_OPTIONS = [
  { label: 'Initial APE',    value: 'initial' },
  { label: 'Subsequent APE', value: 'subsequent' },
];

const IPA_OPTIONS = [
  { label: 'CFC',      value: 'CFC' },
  { label: 'Astrana',  value: 'Astrana' },
  { label: 'Regal',    value: 'Regal' },
];

// All LOBs are still selectable — Medicare/Medicare Advantage are surfaced
// so we can throw an APE-specific error (per AC-6). The story restricts APE
// to non-Medicare LOBs, so any Medicare selection is blocked at Create time.
const LOB_OPTIONS = [
  { label: 'Medicare Advantage', value: 'medicare-advantage' },
  { label: 'Medicare',           value: 'medicare' },
  { label: 'Medicaid',           value: 'medicaid' },
  { label: 'Dual Eligible',      value: 'dual' },
  { label: 'Commercial',         value: 'commercial' },
];
const MEDICARE_LOB_VALUES = new Set(['medicare', 'medicare-advantage']);

// Today's date in YYYY-MM-DD (used as the DatePicker's max attribute to
// block future dates per AC-8).
function todayIso() {
  const t = TODAY;
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

// Program is "active" for the AWV/APE exclusivity check unless it's been
// closed/completed/closed-data.
function isActiveProgram(p) {
  const s = (p?.status || '').toLowerCase();
  return !['closed', 'completed', 'closed-data'].includes(s);
}

// Case-insensitive lookups over the current programs list.
function findActiveAwv(programs) {
  return programs.find(p => isActiveProgram(p) && /awv|annual wellness visit/i.test(p.name));
}
function findActiveApeForYear(programs, year) {
  return programs.find(p =>
    isActiveProgram(p) &&
    /ape|annual physical exam/i.test(p.name) &&
    (p.measurementYear === String(year) || p.name.includes(`'${String(year).slice(-2)}`))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small in-place popover shown under "New Program". Users type-to-filter the
// list and click a program to launch its create flow.
function ProgramPicker({ anchorRef, onPick, onClose }) {
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      // Close on outside click, but ignore clicks on the anchor button since
      // it toggles the picker itself.
      if (
        wrapRef.current && !wrapRef.current.contains(e.target) &&
        anchorRef.current && !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    const keyHandler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [anchorRef, onClose]);

  const filtered = query.trim()
    ? PROGRAM_OPTIONS.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : PROGRAM_OPTIONS;

  return (
    <div ref={wrapRef} className={styles.programPicker} role="listbox">
      <div className={styles.programPickerSearch}>
        <Icon name="solar:magnifer-linear" size={14} color="var(--neutral-300)" />
        <input
          autoFocus
          type="text"
          placeholder="Search Care Programs"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      <div className={styles.programPickerList}>
        {filtered.length === 0 ? (
          <div className={styles.programPickerEmpty}>No matching programs</div>
        ) : filtered.map(opt => (
          <button
            key={opt.key}
            type="button"
            className={styles.programPickerItem}
            onClick={() => onPick(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create-APE drawer. Header carries Cancel + Create; Create is disabled until
// all required fields have values.
function CreateApeProgramDrawer({ onClose, onCreate, programs, defaultIpa = '', defaultLob = '' }) {
  const yearOptions = computeMeasurementYearOptions(TODAY);
  const defaultYear = String(currentMeasurementYear(TODAY));

  const [measurementYear, setMeasurementYear] = useState(defaultYear);
  const [apeType, setApeType] = useState('subsequent');
  // IPA + LOB are pre-populated from the patient profile so care coordinators
  // don't have to re-enter data Athena already knows. Still user-editable.
  const [ipa, setIpa] = useState(defaultIpa);
  const [lob, setLob] = useState(defaultLob);
  const [lastApeDate, setLastApeDate] = useState('');
  const [errors, setErrors] = useState({});

  // ── Cross-program validation (AC-9, AC-10, AC-14, AC-15) ─────────────────
  // Computed live from the current programs list so the banner disappears
  // once the user resolves the conflict (e.g. switches the MY dropdown).
  const activeAwv = findActiveAwv(programs);
  const dupApe = findActiveApeForYear(programs, measurementYear);

  const crossProgramError = activeAwv
    ? 'Patient has an active AWV program; APE program cannot be created'
    : dupApe
      ? `APE program for Measurement Year ${measurementYear} already exists for this patient`
      : null;

  // ── Field validation (AC-16) ─────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!measurementYear) e.measurementYear = 'Required';
    if (!ipa) e.ipa = 'Required';
    if (!lob) e.lob = 'Required';
    else if (MEDICARE_LOB_VALUES.has(lob)) {
      // AC-6: APE is restricted to non-Medicare LOBs. Medicare patients are
      // eligible for AWV instead — surface the guidance so it's actionable.
      e.lob = 'APE is not applicable to Medicare LOBs. Medicare patients qualify for AWV instead.';
    }
    if (lastApeDate) {
      // AC-8: Last APE Date cannot be in the future.
      if (lastApeDate > todayIso()) e.lastApeDate = 'Last APE Date cannot be in the future';
    }
    return e;
  };

  const handleCreate = () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    if (crossProgramError) return;
    const typeLabel = APE_TYPE_OPTIONS.find(o => o.value === apeType)?.label || apeType;
    const lobLabel = LOB_OPTIONS.find(o => o.value === lob)?.label || lob;
    onCreate({
      measurementYear,
      apeType: typeLabel,
      ipa,
      lob: lobLabel,
      lobValue: lob,
      lastApeDate,
    });
  };

  // Wrap setters so touching a field clears its error state.
  const clearErr = (k) => setErrors(prev => (prev[k] ? { ...prev, [k]: null } : prev));
  const bindYear = (v) => { setMeasurementYear(v); clearErr('measurementYear'); };
  const bindIpa  = (v) => { setIpa(v); clearErr('ipa'); };
  const bindLob  = (v) => { setLob(v); clearErr('lob'); };
  const bindDate = (v) => { setLastApeDate(v); clearErr('lastApeDate'); };

  return (
    <Drawer
      title="Create APE Program"
      onClose={onClose}
      noCloseDivider
      headerRight={
        <>
          <Button variant="secondary" size="S" onClick={onClose}>Cancel</Button>
          <span className={styles.headerDivider} />
          <Button
            variant="primary"
            size="S"
            state={crossProgramError ? 'disabled' : 'active'}
            onClick={handleCreate}
          >
            Create
          </Button>
          <span className={styles.headerDivider} />
        </>
      }
    >
      <div className={styles.apeForm}>
        <div className={styles.apeField}>
          <label className={styles.apeLabel}>
            Measurement Year <span className={styles.apeRequired}>*</span>
          </label>
          <Select
            options={yearOptions}
            value={measurementYear}
            onChange={bindYear}
          />
          {errors.measurementYear && (
            <span className={styles.apeError}>{errors.measurementYear}</span>
          )}
          {/* Cross-program conflict error — shown right under the MY field
              since both AWV-exists and same-year APE conflicts hinge on the
              year the user is picking (AC-14, AC-15). */}
          {crossProgramError && (
            <span className={styles.apeError}>{crossProgramError}</span>
          )}
        </div>

        <div className={styles.apeField}>
          <label className={styles.apeLabel}>
            APE Type <span className={styles.apeRequired}>*</span>
          </label>
          <Select
            options={APE_TYPE_OPTIONS}
            value={apeType}
            onChange={setApeType}
          />
        </div>

        <div className={styles.apeField}>
          <label className={styles.apeLabel}>
            IPA <span className={styles.apeRequired}>*</span>
          </label>
          <Select
            options={IPA_OPTIONS}
            value={ipa}
            onChange={bindIpa}
            placeholder="Select IPA…"
          />
          {errors.ipa && <span className={styles.apeError}>{errors.ipa}</span>}
        </div>

        <div className={styles.apeField}>
          <label className={styles.apeLabel}>
            LOB <span className={styles.apeRequired}>*</span>
          </label>
          <Select
            options={LOB_OPTIONS}
            value={lob}
            onChange={bindLob}
            placeholder="Select LOB…"
          />
          {errors.lob && <span className={styles.apeError}>{errors.lob}</span>}
        </div>

        <div className={styles.apeField}>
          <label className={styles.apeLabel}>Last APE Date</label>
          {/* Native date input; use max to block future dates (AC-8). */}
          <input
            type="date"
            className={styles.apeDateInput}
            value={lastApeDate}
            max={todayIso()}
            onChange={e => bindDate(e.target.value)}
          />
          {errors.lastApeDate && (
            <span className={styles.apeError}>{errors.lastApeDate}</span>
          )}
        </div>
      </div>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function CareProgramsTab() {
  const selectedPatientId = useAppStore(s => s.selectedPatientId);
  // Per-patient scenario overlay drives which pre-existing programs are on
  // the table + which IPA/LOB defaults pre-fill the Create APE drawer.
  const apcmDefaults = apcmDefaultsForPatient(selectedPatientId);

  const [activeSubTab, setActiveSubTab] = useState('All');
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [programs, setProgramsState] = useState(() => programsForPatient(selectedPatientId));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [apeDrawerOpen, setApeDrawerOpen] = useState(false);
  const showToast = useAppStore(s => s.showToast);
  const newProgramBtnRef = useRef(null);

  // Reset the programs list when navigating to a different patient so each
  // patient's scenario is honored on entry.
  useEffect(() => {
    setProgramsState(programsForPatient(selectedPatientId));
  }, [selectedPatientId]);

  const handlePickProgram = (key) => {
    setPickerOpen(false);
    if (key === 'APE') {
      setApeDrawerOpen(true);
    } else {
      showToast(`${key} program creation — coming soon`);
    }
  };

  const handleCreateApe = (form) => {
    const now = new Date();
    const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;
    // AC-20: title format "Annual Physical Exam (APE'YY)" (curly apostrophe,
    // short year). Full MY is retained on the row's `measurementYear` field
    // for downstream filtering (AC-13).
    const shortYear = form.measurementYear.slice(-2);
    const newRow = {
      id: `cp-ape-${Date.now()}`,
      name: `Annual Physical Exam (APE’${shortYear})`,
      acuity: null,
      status: 'New',
      statusColor: 'var(--primary-300)',
      startDate: dateStr,
      endDate: '',
      lastUpdated: dateStr,
      assignee: 'Unassigned',
      pcp: 'Dr. Robert Frost',
      progress: 0,
      measurementYear: form.measurementYear,
      lob: form.lob,
      lobValue: form.lobValue,
      ipa: form.ipa,
      lastApeDate: form.lastApeDate,
      apeType: form.apeType,
    };
    setProgramsState(prev => [newRow, ...prev]);
    setApeDrawerOpen(false);
    showToast(`APE program created for ${form.measurementYear}`);
  };

  if (selectedProgram) {
    return <ProgramDetailView program={selectedProgram} onClose={() => setSelectedProgram(null)} />;
  }

  return (
    <div className={styles.view}>
      {/* Sub-tab bar */}
      <div className={styles.subTabBar}>
        <div className={styles.subTabs}>
          <ActionButton icon="solar:magnifer-linear" size="S" tooltip="Search" />
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
        <div className={styles.newProgramWrap}>
          <button
            ref={newProgramBtnRef}
            className={styles.newProgramBtn}
            onClick={() => setPickerOpen(v => !v)}
          >
            <Icon name="solar:add-circle-linear" size={16} color="var(--primary-300)" />
            New Program
          </button>
          {pickerOpen && (
            <ProgramPicker
              anchorRef={newProgramBtnRef}
              onPick={handlePickProgram}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>
        <span style={{ width: 0.5, height: 16, background: 'var(--neutral-150)', flexShrink: 0 }} />
        <ActionButton icon="solar:filter-linear" size="S" tooltip="Filter" />
      </div>

      {/* Filter badges */}
      <div className={styles.filterBar}>
        {CP_FILTERS.map(f => (
          <button key={f.key} className={styles.filterChip}>
            {f.label}
            <Icon name="solar:alt-arrow-down-linear" size={16} color="var(--neutral-300)" />
          </button>
        ))}
        <button className={styles.clearAll}>
          <Icon name="solar:backspace-linear" size={16} color="var(--primary-300)" />
          Clear All
        </button>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkCell}><input type="checkbox" className={styles.checkbox} /></th>
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
            {programs.map(p => (
              <tr key={p.id} className={styles.clickableRow} onClick={() => setSelectedProgram(p)}>
                <td className={styles.checkCell}><input type="checkbox" className={styles.checkbox} onClick={e => e.stopPropagation()} /></td>
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

      {apeDrawerOpen && (
        <CreateApeProgramDrawer
          programs={programs}
          defaultIpa={apcmDefaults.ipa}
          defaultLob={apcmDefaults.lob}
          onClose={() => setApeDrawerOpen(false)}
          onCreate={handleCreateApe}
        />
      )}
    </div>
  );
}
