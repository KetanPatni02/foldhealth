import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Drawer } from '../../components/Drawer/Drawer';
import { PatientBanner } from '../../components/PatientBanner/PatientBanner';
import { Button } from '../../components/Button/Button';
import { Select } from '../../components/Select/Select';
import { ChipSelect } from '../../components/ChipSelect/ChipSelect';
import { SearchBar } from '../../components/SearchBar/SearchBar';
import { Checkbox } from '../../components/ShadcnCheckbox/ShadcnCheckbox';
import { Badge } from '../../components/Badge/Badge';
import { InfoBar } from '../../components/InfoBar/InfoBar';
import { SimpleTableSkeleton } from '../../components/SimpleTableSkeleton/SimpleTableSkeleton';
import { Icon } from '../../components/Icon/Icon';
import { MEASURE_YEARS } from './data/caregapWhitelistMock';
import styles from './AddCareGapsDrawer.module.css';

const WORKFLOWS = ['Outreach', 'Clinical Note', 'Referral', 'Task'];

const isClosed = (status) => status === 'Completed' || String(status || '').startsWith('Closed');

const appliesTo = (w, { ipa, hpCode, measureYear }) =>
  w.measureYear === measureYear
  && (!w.ipas.length || w.ipas.includes(ipa))
  && (!w.hpCodes.length || w.hpCodes.includes(hpCode));

const toOptions = (values) => values.map(v => ({ value: v, label: v, searchText: v }));

function ParentGapDetails({ parent }) {
  const rows = [
    ['Status', parent.status],
    ['Opened', parent.startDate || '-'],
    ['Closed', parent.closedDate || '-'],
    ['Assignee', parent.assignee || 'Unassigned'],
    ['Measure Year', parent.measureYear ? `MY${parent.measureYear}` : '-'],
  ];
  return (
    <div className={styles.parent}>
      <div className={styles.parentHead}>
        <Icon name="solar:link-minimalistic-2-linear" size={14} color="var(--neutral-400)" />
        Parent gap
      </div>
      <dl className={styles.parentGrid}>
        {rows.map(([k, v]) => (
          <div key={k} className={styles.parentItem}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function GapRow({ whitelist, parent, checked, onToggle }) {
  return (
    <div className={[styles.gapRow, checked ? styles.gapRowOn : ''].join(' ')}>
      <label className={styles.gapMain}>
        <Checkbox checked={checked} onCheckedChange={onToggle} aria-label={`Add ${whitelist.code}`} />
        <span className={styles.gapCode}>{whitelist.code}</span>
        <span className={styles.gapName}>{whitelist.name}</span>
        <span className={styles.gapMeta}>
          {parent && <Badge size="S" variant="status-queued" icon="solar:history-linear" label={`Previous: ${parent.status}`} />}
        </span>
      </label>
      {checked && parent && <ParentGapDetails parent={parent} />}
    </div>
  );
}

export function AddCareGapsDrawer() {
  const member = useAppStore(s => s.addCareGapsMember);
  const close = useAppStore(s => s.closeAddCareGaps);
  const addCareGaps = useAppStore(s => s.addCareGaps);
  const showToast = useAppStore(s => s.showToast);
  const whitelist = useAppStore(s => s.caregapWhitelist);
  const loading = useAppStore(s => s.caregapWhitelistLoading);
  const fetchWhitelist = useAppStore(s => s.fetchCaregapWhitelist);
  const hedisMembers = useAppStore(s => s.hedisMembers);

  const [ipa, setIpa] = useState('');
  const [hpCode, setHpCode] = useState('');
  const [measureYear, setMeasureYear] = useState(MEASURE_YEARS[0]);
  const [workflows, setWorkflows] = useState([]);
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!member) return;
    fetchWhitelist();
    setIpa(member.ipa || '');
    setHpCode(member.hpCode || '');
    setMeasureYear(MEASURE_YEARS[0]);
    setWorkflows([]);
    setSelected([]);
    setQuery('');
  }, [member?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const ipaOptions = useMemo(
    () => toOptions([...new Set(hedisMembers.map(m => m.ipa).concat(member?.ipa).filter(Boolean))].sort()),
    [hedisMembers, member],
  );
  const hpOptions = useMemo(
    () => toOptions([...new Set(hedisMembers.map(m => m.hpCode).concat(member?.hpCode).filter(Boolean))].sort()),
    [hedisMembers, member],
  );
  const yearOptions = MEASURE_YEARS.map(y => ({ value: String(y), label: `MY${y}` }));

  // Read the live row so a gap added moments ago drops out of the list.
  const liveMember = hedisMembers.find(m => m.id === member?.id) || member;
  const existingByCode = useMemo(
    () => Object.fromEntries((liveMember?.gaps || []).filter(g => !g.supersededAt).map(g => [g.code, g])),
    [liveMember],
  );

  const whitelisted = useMemo(
    () => whitelist.filter(w => appliesTo(w, { ipa, hpCode, measureYear })),
    [whitelist, ipa, hpCode, measureYear],
  );
  // A gap the patient already has open can't be added again, so it isn't listed.
  const eligible = whitelisted.filter(w => {
    const existing = existingByCode[w.code];
    return !existing || isClosed(existing.status);
  });
  const q = query.trim().toLowerCase();
  const visible = q
    ? eligible.filter(w => w.code.toLowerCase().includes(q) || w.name.toLowerCase().includes(q))
    : eligible;
  // Selection outlives a filter change only for gaps still whitelisted.
  const picked = eligible.filter(w => selected.includes(w.code));

  if (!member) return null;

  const canSave = picked.length > 0 && ipa && hpCode && workflows.length > 0;

  const toggle = (code) => setSelected(sel => sel.includes(code) ? sel.filter(c => c !== code) : [...sel, code]);

  const doSave = () => {
    const items = picked.map(w => {
      const existing = existingByCode[w.code];
      return { whitelist: w, parent: existing && isClosed(existing.status) ? existing : null };
    });
    addCareGaps(member.id, { items, ipa, hpCode, measureYear, workflows });
    showToast?.(`${items.length} care gap${items.length === 1 ? '' : 's'} added for ${member.name}`);
    close();
  };

  const headerRight = (
    <>
      <Button variant="primary" size="S" disabled={!canSave} onClick={doSave}>
        {picked.length > 1 ? `Add ${picked.length} Gaps` : 'Add Gap'}
      </Button>
      <span className={styles.headerDivider} />
    </>
  );

  return (
    <Drawer
      title="Add Care Gaps"
      onClose={close}
      headerRight={headerRight}
      noCloseDivider
      bodyClassName={styles.body}
    >
      <PatientBanner
        initials={member.in}
        name={member.name}
        gender={member.gender === 'M' ? 'Male' : member.gender === 'F' ? 'Female' : member.gender}
        age={member.age || ''}
        dob={member.dob}
        memberId={member.memberId}
        patientId={member.id}
      />

      <div className={styles.container}>
        <section className={styles.section}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <span className={styles.label}>IPA<span className={styles.req}>•</span></span>
              <Select options={ipaOptions} value={ipa} placeholder="Select IPA" searchable onChange={setIpa} />
            </div>
            <div className={styles.field}>
              <span className={styles.label}>HP Code<span className={styles.req}>•</span></span>
              <Select options={hpOptions} value={hpCode} placeholder="Select HP Code" searchable onChange={setHpCode} />
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Measure Year<span className={styles.req}>•</span></span>
              <Select options={yearOptions} value={String(measureYear)} onChange={(v) => setMeasureYear(Number(v))} />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <span className={styles.label}>Required Workflow<span className={styles.req}>•</span></span>
          <ChipSelect options={WORKFLOWS} value={workflows} onChange={setWorkflows} ariaLabel="Required workflow" />
          <span className={styles.helper}>Applies to every gap added below.</span>
        </section>

        <section className={styles.section}>
          <div className={styles.listHead}>
            <span className={styles.label}>Whitelisted Care Gaps<span className={styles.req}>•</span></span>
            <span className={styles.count}>{picked.length} selected</span>
          </div>
          <SearchBar value={query} onChange={(e) => setQuery(e.target.value)} autoFocus={false} fullWidth placeholder="Search by measure code or name" />
          {loading ? (
            <SimpleTableSkeleton rows={5} cols={2} />
          ) : visible.length === 0 ? (
            <div className={styles.empty}>
              {whitelisted.length > 0 && eligible.length === 0
                ? 'Every whitelisted care gap is already open for this patient.'
                : eligible.length === 0
                ? `No care gaps are whitelisted for ${ipa || 'this IPA'} · ${hpCode || 'this HP code'} · MY${measureYear}.`
                : 'No whitelisted care gaps match your search.'}
            </div>
          ) : (
            <div className={styles.list}>
              {visible.map(w => (
                <GapRow
                  key={w.id}
                  whitelist={w}
                  parent={existingByCode[w.code] || null}
                  checked={selected.includes(w.code)}
                  onToggle={() => toggle(w.code)}
                />
              ))}
            </div>
          )}
        </section>

        <InfoBar>
          Only whitelisted gaps are billed. A gap is added to SSD automatically once its clinical note is signed; otherwise close it manually.
        </InfoBar>
      </div>
    </Drawer>
  );
}
