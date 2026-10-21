import { Fragment, useMemo, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Badge } from '../../../components/Badge/Badge';
import { Icon } from '../../../components/Icon/Icon';
import { PhoneLink } from '../../../components/PhoneLink/PhoneLink';
import { Checkbox } from '../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { RadioButton } from '../../../components/RadioButton/RadioButton';
import { Textarea } from '../../../components/Textarea/Textarea';
import { Select } from '../../../components/Select/Select';
import { Drawer } from '../../../components/Drawer/Drawer';
import { GAP_STATUS_TONE, MEASURE_NAMES, MEASURE_ORDER, OPEN_GAPS, fillDueTone, measureStatus, pdcTone } from '../pharmacyWorklist.utils';
import { MeasureCode, SubStatus } from '../PharmacyCells';
import { BARRIERS } from '../adherencePicklists';
import { usePharmacyProgramMember } from './usePharmacyProgramMember';
import styles from './PharmacyMedicationReview.module.css';

const CONDITIONS = ['Type 2 diabetes', 'Hypertension', 'Hyperlipidemia', 'Chronic kidney disease', 'Heart failure', "I don't know"];

const NON_ADHERENCE_REASONS = [...BARRIERS, 'Other'].map(r => ({ value: r, label: r }));

const TONE_CLASS = { error: styles.toneError };

const conditionsOf = (d) => d.conditions ?? (d.condition ? [d.condition] : []);

// A text field that saves on blur rather than per keystroke (each save
// rewrites the member's measures jsonb).
function DraftTextarea({ value, onCommit, ...rest }) {
  const [draft, setDraft] = useState(value || '');
  return (
    <Textarea
      {...rest}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { if (draft !== (value || '')) onCommit(draft); }}
    />
  );
}

function ContactCard({ title, person }) {
  return (
    <section className={styles.card}>
      <header className={styles.cardTitle}>{title}{person?.name ? <span className={styles.cardName}>{person.name}</span> : null}</header>
      <dl className={styles.cardGrid}>
        <div className={styles.wideCell}><dt>Primary Phone</dt><dd><PhoneLink number={person?.phone} label={person?.name} /></dd></div>
        {person?.fax !== undefined && <div><dt>Fax</dt><dd>{person.fax || '—'}</dd></div>}
        <div className={styles.fullRow}><dt>Address</dt><dd>{person?.address1 || '—'}</dd></div>
        <div><dt>City</dt><dd>{person?.city || '—'}</dd></div>
        <div><dt>State</dt><dd>{person?.state || '—'}</dd></div>
        <div><dt>Zip Code</dt><dd>{person?.zip || '—'}</dd></div>
      </dl>
    </section>
  );
}

export function MedicationDetail({ med, memberRowId, interventionLog }) {
  // Barrier & Intervention log entries for this medication's measure.
  const barrierLog = (interventionLog || [])
    .filter(e => e.measures?.[med.measure])
    .map(e => ({ date: e.date, by: e.by, source: e.source, rec: e.measures[med.measure] }));
  const update = useAppStore(s => s.updatePharmacyMedication);
  const save = (patch) => update(memberRowId, med.id, patch);
  const conditions = conditionsOf(med);
  const toggleCondition = (c) => save({
    conditions: conditions.includes(c) ? conditions.filter(x => x !== c) : [...conditions, c],
  });

  return (
    <div className={styles.detail}>
      <div className={styles.detailHead}>
        <MeasureCode code={med.measure} />
        <span className={styles.detailMeta}><span>Dose Form:</span> {med.doseForm}</span>
        <span className={styles.detailMeta}><span>Route:</span> {med.route}</span>
      </div>

      <div className={styles.detailGrid}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Med Status</span>
          <div className={styles.radios}>
            {['Active', 'Discontinued'].map(s => (
              <RadioButton key={s} checked={med.status === s} onChange={() => save({ status: s })} label={s} />
            ))}
          </div>
          <span className={styles.fieldLabel}>SIG</span>
          <DraftTextarea key={`sig-${med.id}`} value={med.sig} onCommit={sig => save({ sig })} placeholder="Directions for use" aria-label="SIG" />
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Condition</span>
          <div className={styles.checks}>
            {CONDITIONS.map(c => (
              <label key={c} className={styles.checkRow}>
                <Checkbox checked={conditions.includes(c)} onCheckedChange={() => toggleCondition(c)} />
                <span>{c}</span>
              </label>
            ))}
          </div>
          <span className={styles.fieldLabel}>Reason for Non-Adherence</span>
          <Select
            options={NON_ADHERENCE_REASONS}
            value={med.nonAdherenceReason || ''}
            onChange={v => save({ nonAdherenceReason: v })}
            placeholder="Select reason"
          />
        </div>

        <ContactCard title="Prescriber" person={med.prescriber} />
        <ContactCard title="Pharmacy" person={med.pharmacy} />

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Notes to MD</span>
          <DraftTextarea key={`md-${med.id}`} value={med.notesToMd} onCommit={notesToMd => save({ notesToMd })} placeholder="Note for the prescriber" aria-label="Notes to MD" />
          <span className={styles.fieldLabel}>Internal Notes</span>
          <DraftTextarea key={`int-${med.id}`} value={med.internalNotes} onCommit={internalNotes => save({ internalNotes })} placeholder="Visible to the care team only" aria-label="Internal notes" />
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Barriers &amp; Interventions ({med.measure})</span>
          {barrierLog.length === 0 && <span className={styles.muted}>None logged for {med.measure} yet.</span>}
          {barrierLog.map((e, i) => (
            <div key={`${e.date}-${i}`} className={`${styles.barrierEntry} ${i === 0 ? styles.barrierLatest : ''}`}>
              <span className={styles.barrierMeta}>
                {i === 0 ? 'Latest · ' : ''}{e.date} · {e.by}{e.source ? ` · from ${e.source.toLowerCase()}` : ''}
              </span>
              <span className={styles.barrierChips}>
                {e.rec.barriers.map(b => <Badge key={b} size="S" tone="grey" label={b} />)}
                {e.rec.interventions.map(v => <Badge key={v} size="S" tone="grey" label={v} />)}
                {e.rec.result && <Badge size="S" tone="grey" icon="solar:check-circle-linear" label={e.rec.result} />}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.subTitle}>Refill History</div>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr><th>Fill Date</th><th>Quantity</th><th>Days Supply</th><th>Pharmacy</th><th>Prescriber</th><th>Prescriber Address</th><th>Source</th></tr>
          </thead>
          <tbody>
            {med.refills.map(r => (
              <tr key={`${r.date}-${r.source || 'claim'}`}>
                <td>{r.date}</td><td>{r.qty}</td><td>{r.daysSupply}</td>
                <td>{r.pharmacy}</td><td>{r.prescriber}</td><td>{r.prescriberAddress}</td>
                {/* Call-confirmed pickups land here before the claim does. */}
                <td>{r.source ? <Badge size="S" tone="grey" icon="solar:phone-linear" label={r.source} /> : 'Claim'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Therapeutic class by generic name, so a switch within a class (one ARB
// discontinued, another started) sits together.
const CLASS_BY_GENERIC = [
  [/metformin/, 'Biguanides'],
  [/glipizide|glyburide|glimepiride/, 'Sulfonylureas'],
  [/sitagliptin|linagliptin|saxagliptin|alogliptin/, 'DPP-4 inhibitors'],
  [/pioglitazone/, 'Thiazolidinediones'],
  [/pril$/, 'ACE inhibitors'],
  [/sartan/, 'ARBs'],
  [/statin/, 'Statins'],
];
const CONDITION_BY_MEASURE = { MAD: 'Diabetes', MAH: 'Hypertension', MAC: 'Cholesterol' };
const classOf = (d) => CLASS_BY_GENERIC.find(([re]) => re.test(d.generic || ''))?.[1] || 'Other';

// Medication Review step of the Pharmacy program. The member's open pharmacy
// gaps sit together at the top, the one opened from the worklist first; the
// medications below are grouped by condition and therapeutic class so drug
// switches are visible. Clicking a medication opens its details and refill
// history in a side drawer.
// `onOpenMed` lets a host (the gap drawer) show a medication in its own
// side workspace instead of the stacked drawer.
export function PharmacyMedicationReview({ member: memberProp, onOpenMed }) {
  const fromProfile = usePharmacyProgramMember();
  const member = memberProp || fromProfile;
  const focus = useAppStore(s => s.pharmacyFocusGap);
  const [includeClosed, setIncludeClosed] = useState(false);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [openId, setOpenId] = useState(null);

  const all = useMemo(() => (member?.measures || [])
    .map(x => ({ ...x, st: measureStatus(x, member) }))
    .toSorted((a, b) => MEASURE_ORDER.indexOf(a.code) - MEASURE_ORDER.indexOf(b.code)), [member]);
  const focusCode = focus?.memberId === member?.id ? focus.code : null;
  // The gap opened from the worklist always shows, even when it's closed.
  const open = all.filter(x => OPEN_GAPS.has(x.st.gap) || x.code === focusCode);
  const shown = (includeClosed || !open.length ? all : open)
    .toSorted((a, b) => (b.code === focusCode) - (a.code === focusCode));

  // condition → class → medications (each tagged with its gap)
  const groups = useMemo(() => {
    const out = [];
    for (const x of shown) {
      const condition = CONDITION_BY_MEASURE[x.code];
      for (const d of x.medications) {
        const key = `${condition} · ${classOf(d)}`;
        let g = out.find(y => y.key === key);
        if (!g) { g = { key, condition, cls: classOf(d), code: x.code, meds: [] }; out.push(g); }
        g.meds.push({ ...d, measure: x.code });
      }
    }
    return out;
  }, [shown]);

  const medCount = groups.reduce((n, g) => n + g.meds.length, 0);
  // Red only for an open gap's risk; a closed gap's numbers are history.
  const openCodes = new Set(all.filter(x => OPEN_GAPS.has(x.st.gap)).map(x => x.code));
  const riskClass = (code, tone) => (openCodes.has(code) ? TONE_CLASS[tone] || '' : '');
  const openMed = openId
    ? all.flatMap(x => x.medications.map(d => ({ ...d, measure: x.code }))).find(d => d.id === openId)
    : null;
  const toggle = (key) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  if (!member) {
    return (
      <div className={styles.empty}>
        <Icon name="solar:pill-linear" size={40} color="var(--neutral-200)" />
        <p>No MAD, MAH or MAC medications on file for this member.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.gapStrip}>
        {shown.map(x => (
          <div key={x.code} className={`${styles.gapCard} ${x.code === focusCode ? styles.gapCardFocus : ''}`}>
            <span className={styles.gapCardHead}>
              <MeasureCode code={x.code} />
              <span className={styles.groupName}>{MEASURE_NAMES[x.code]}</span>
              {x.code === focusCode && <span className={styles.groupMeta}>Opened from worklist</span>}
            </span>
            <span className={styles.gapCardMeta}>
              <Badge size="S" tone={GAP_STATUS_TONE[x.st.gap]} label={x.st.gap} />
              <SubStatus label={x.st.label} />
              <span className={styles.groupMeta}>PDC <b className={riskClass(x.code, pdcTone(x.pdc))}>{x.pdc == null ? '—' : `${x.pdc}%`}</b></span>
              <span className={styles.groupMeta}>Next due <b className={riskClass(x.code, fillDueTone(x.nextFillDue))}>{x.nextFillDue || '—'}</b></span>
            </span>
          </div>
        ))}
      </div>

      <div className={styles.toolbar}>
        {open.length > 0 && open.length < all.length && (
          <label className={styles.checkRow}>
            <Checkbox checked={includeClosed} onCheckedChange={v => setIncludeClosed(!!v)} />
            <span>Include closed gaps ({all.length - open.length})</span>
          </label>
        )}
        <span className={styles.count}>{medCount} medication{medCount === 1 ? '' : 's'}</span>
      </div>

      <div className={styles.tableScroll}>
        <table className={`${styles.table} ${styles.medTable}`}>
          <thead>
            <tr>
              <th>Rx</th><th>Gap</th><th>Last Fill</th><th>Next Fill</th><th>PDC</th><th>MPR</th>
              <th>DS</th><th>Quantity</th><th>Barrier</th><th>Prescriber</th><th>Pharmacy</th><th aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {groups.map(g => {
              const isOpen = !collapsed.has(g.key);
              const switched = g.meds.some(d => d.status === 'Discontinued') && g.meds.some(d => d.status !== 'Discontinued');
              return (
                <Fragment key={g.key}>
                  <tr className={styles.groupRow} onClick={() => toggle(g.key)} aria-expanded={isOpen}>
                    <td colSpan={12}>
                      <span className={styles.groupHead}>
                        <Icon name={isOpen ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'} size={14} color="var(--neutral-300)" />
                        <span className={styles.groupName}>{g.condition}</span>
                        <span className={styles.groupMeta}>{g.cls}</span>
                        <span className={styles.groupMeta}>{g.meds.length} medication{g.meds.length === 1 ? '' : 's'}</span>
                        {switched && <Badge size="S" tone="grey" icon="solar:refresh-linear" label="Drug switched" />}
                      </span>
                    </td>
                  </tr>
                  {isOpen && g.meds.map(d => {
                    return (
                      <tr
                        key={d.id}
                        className={`${styles.medRow} ${openId === d.id ? styles.medRowSelected : ''} ${d.status === 'Discontinued' ? styles.medRowDc : ''}`}
                        onClick={() => (onOpenMed ? onOpenMed(d.id) : setOpenId(d.id))}
                      >
                        <td className={styles.rxCell}>
                          <span className={styles.rxName}>{d.name} {d.strength} {d.unit}</span>
                          <span className={styles.rxGeneric}>{d.generic}{d.status === 'Discontinued' ? ' · Discontinued' : ''}</span>
                        </td>
                        <td><MeasureCode code={d.measure} /></td>
                        <td>{d.lastFill}</td>
                        <td className={riskClass(d.measure, fillDueTone(d.nextFill))}>{d.nextFill}</td>
                        <td className={riskClass(d.measure, pdcTone(d.pdc))}>{d.pdc == null ? '—' : `${d.pdc}%`}</td>
                        <td>{d.mpr ?? '—'}</td>
                        <td>{d.daysSupply}</td>
                        <td>{d.qty}</td>
                        <td>{d.nonAdherenceReason ? <Badge size="S" tone="grey" label={d.nonAdherenceReason} /> : '—'}</td>
                        <td>{d.prescriber?.name || '—'}</td>
                        <td>{d.pharmacy?.name || '—'}</td>
                        <td className={styles.openCell}>
                          <Icon name="solar:alt-arrow-right-linear" size={14} color="var(--neutral-300)" />
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {openMed && (
        <Drawer
          title={`${openMed.name} ${openMed.strength} ${openMed.unit} (${openMed.generic})`}
          onClose={() => setOpenId(null)}
          width={760}
        >
          <MedicationDetail key={openMed.id} med={openMed} memberRowId={member.id} interventionLog={member.interventionLog} />
        </Drawer>
      )}
    </div>
  );
}
