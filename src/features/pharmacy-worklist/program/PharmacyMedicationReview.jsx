import { Fragment, useMemo, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Badge } from '../../../components/Badge/Badge';
import { Icon } from '../../../components/Icon/Icon';
import { FilterChip } from '../../../components/FilterChip/FilterChip';
import { Checkbox } from '../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { RadioButton } from '../../../components/RadioButton/RadioButton';
import { Textarea } from '../../../components/Textarea/Textarea';
import { Select } from '../../../components/Select/Select';
import { Drawer } from '../../../components/Drawer/Drawer';
import { GAP_STATUS_TONE, MEASURE_NAMES, MEASURE_ORDER, fillDueTone, measureStatus, pdcTone } from '../pharmacyWorklist.utils';
import { SubStatus } from '../PharmacyCells';
import { BARRIERS } from '../adherencePicklists';
import { usePharmacyProgramMember } from './usePharmacyProgramMember';
import styles from './PharmacyMedicationReview.module.css';

const CONDITIONS = ['Type 2 diabetes', 'Hypertension', 'Hyperlipidemia', 'Chronic kidney disease', 'Heart failure', "I don't know"];

const NON_ADHERENCE_REASONS = [...BARRIERS, 'Other'].map(r => ({ value: r, label: r }));

const TONE_CLASS = { error: styles.toneError, warning: styles.toneWarning, success: styles.toneSuccess };

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
        <div><dt>Primary Phone</dt><dd>{person?.phone || '—'}</dd></div>
        {person?.fax !== undefined && <div><dt>Fax</dt><dd>{person.fax || '—'}</dd></div>}
        <div className={styles.fullRow}><dt>Address</dt><dd>{person?.address1 || '—'}</dd></div>
        <div><dt>City</dt><dd>{person?.city || '—'}</dd></div>
        <div><dt>State</dt><dd>{person?.state || '—'}</dd></div>
        <div><dt>Zip Code</dt><dd>{person?.zip || '—'}</dd></div>
      </dl>
    </section>
  );
}

function MedicationDetail({ med, memberRowId, interventionLog }) {
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
        <Badge size="S" tone="primary" label={med.measure} />
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
                {e.rec.barriers.map(b => <Badge key={b} size="S" tone="error" label={b} />)}
                {e.rec.interventions.map(v => <Badge key={v} size="S" tone="info" label={v} />)}
                {e.rec.result && <Badge size="S" tone="success" icon="solar:check-circle-linear" label={e.rec.result} />}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.subTitle}>Refill History</div>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr><th>Fill Date</th><th>Qty</th><th>Days Supply</th><th>Pharmacy</th><th>Prescriber</th><th>Prescriber Address</th><th>Source</th></tr>
          </thead>
          <tbody>
            {med.refills.map(r => (
              <tr key={`${r.date}-${r.source || 'claim'}`}>
                <td>{r.date}</td><td>{r.qty}</td><td>{r.daysSupply}</td>
                <td>{r.pharmacy}</td><td>{r.prescriber}</td><td>{r.prescriberAddress}</td>
                {/* Call-confirmed pickups land here before the claim does. */}
                <td>{r.source ? <Badge size="S" tone="success" icon="solar:phone-linear" label={r.source} /> : 'Claim'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Medication Review step of the Pharmacy program: every medication linked to
// the member's MAD / MAH / MAC measures, grouped by measure (collapsible, with
// the measure's PDC / next due / status on the group row). Clicking a
// medication opens its details + refill history in a side drawer, so the
// list stays usable however many medications a measure has.
export function PharmacyMedicationReview() {
  const member = usePharmacyProgramMember();
  const [measureFilter, setMeasureFilter] = useState([]);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [openId, setOpenId] = useState(null);

  const measures = useMemo(() => (member?.measures || [])
    .toSorted((a, b) => MEASURE_ORDER.indexOf(a.code) - MEASURE_ORDER.indexOf(b.code)), [member]);
  const shown = measureFilter.length ? measures.filter(x => measureFilter.includes(x.code)) : measures;
  const medCount = shown.reduce((n, x) => n + x.medications.length, 0);
  const openMed = openId
    ? measures.flatMap(x => x.medications.map(d => ({ ...d, measure: x.code }))).find(d => d.id === openId)
    : null;
  const toggle = (code) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(code)) next.delete(code); else next.add(code);
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
      <div className={styles.toolbar}>
        <FilterChip
          label="Measure"
          options={measures.map(x => x.code)}
          selected={measureFilter}
          onChange={setMeasureFilter}
        />
        <span className={styles.count}>{medCount} medication{medCount === 1 ? '' : 's'}</span>
      </div>

      <div className={styles.tableScroll}>
        <table className={`${styles.table} ${styles.medTable}`}>
          <thead>
            <tr>
              <th>Rx</th><th>Last Fill</th><th>Next Fill</th><th>PDC</th><th>MPR</th>
              <th>DS</th><th>Qty</th><th>Barrier</th><th>Prescriber</th><th>Pharmacy</th><th aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {shown.map(x => {
              const isOpen = !collapsed.has(x.code);
              const st = measureStatus(x, member);
              return (
                <Fragment key={x.code}>
                  <tr className={styles.groupRow} onClick={() => toggle(x.code)} aria-expanded={isOpen}>
                    <td colSpan={11}>
                      <span className={styles.groupHead}>
                        <Icon name={isOpen ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'} size={14} color="var(--neutral-300)" />
                        <Badge size="S" tone="primary" label={x.code} />
                        <span className={styles.groupName}>{MEASURE_NAMES[x.code]}</span>
                        <span className={styles.groupMeta}>{x.medications.length} medication{x.medications.length === 1 ? '' : 's'}</span>
                        <span className={styles.groupMeta}>PDC <b className={TONE_CLASS[pdcTone(x.pdc)] || ''}>{x.pdc == null ? '—' : `${x.pdc}%`}</b></span>
                        <span className={styles.groupMeta}>Next due <b className={TONE_CLASS[fillDueTone(x.nextFillDue)] || ''}>{x.nextFillDue || '—'}</b></span>
                        <Badge size="S" tone={GAP_STATUS_TONE[st.gap]} label={st.gap} />
                        <SubStatus label={st.label} />
                      </span>
                    </td>
                  </tr>
                  {isOpen && x.medications.map(d => {
                    const fillTone = fillDueTone(d.nextFill);
                    return (
                      <tr
                        key={d.id}
                        className={`${styles.medRow} ${openId === d.id ? styles.medRowSelected : ''} ${d.status === 'Discontinued' ? styles.medRowDc : ''}`}
                        onClick={() => setOpenId(d.id)}
                      >
                        <td className={styles.rxCell}>
                          <span className={styles.rxName}>{d.name.toUpperCase()} {d.strength} {d.unit}</span>
                          <span className={styles.rxGeneric}>{d.generic}</span>
                        </td>
                        <td>{d.lastFill}</td>
                        <td><span className={`${styles.nextFill} ${fillTone === 'error' ? styles.nextFillOverdue : ''} ${TONE_CLASS[fillTone] || ''}`}>{d.nextFill}</span></td>
                        <td className={TONE_CLASS[pdcTone(d.pdc)] || ''}>{d.pdc == null ? '—' : `${d.pdc}%`}</td>
                        <td>{d.mpr ?? '—'}</td>
                        <td>{d.daysSupply}</td>
                        <td>{d.qty}</td>
                        <td>{d.nonAdherenceReason ? <Badge size="S" tone="error" label={d.nonAdherenceReason} /> : '—'}</td>
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
          title={`${openMed.name.toUpperCase()} ${openMed.strength} ${openMed.unit} (${openMed.generic})`}
          onClose={() => setOpenId(null)}
          width={760}
        >
          <MedicationDetail key={openMed.id} med={openMed} memberRowId={member.id} interventionLog={member.interventionLog} />
        </Drawer>
      )}
    </div>
  );
}
