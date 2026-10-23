import { Fragment, useMemo, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Badge } from '../../../components/Badge/Badge';
import { Icon } from '../../../components/Icon/Icon';
import { DownChevronIcon } from '../../../components/Icon/DownChevronIcon';
import { PhoneLink } from '../../../components/PhoneLink/PhoneLink';
import { Checkbox } from '../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { RadioButton } from '../../../components/RadioButton/RadioButton';
import { Textarea } from '../../../components/Textarea/Textarea';
import { Select } from '../../../components/Select/Select';
import { Drawer } from '../../../components/Drawer/Drawer';
import { Button } from '../../../components/Button/Button';
import { TabStrip } from '../../../components/TabStrip/TabStrip';
import { MedicationClaims } from './MedicationClaims';
import { DatePicker } from '../../../components/DatePicker/DatePicker';
import { GAP_STATUS_TONE, MEASURE_NAMES, MEASURE_ORDER, annotateClaims, isActiveGap, effectivePdc, fillDueTone, latestConfirmedFill, matchFill, measureStatus, pdcTone } from '../pharmacyWorklist.utils';
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

const claimKey = (c) => `${c.claimId}|${c.claimSeq ?? 1}|${c.date}`;

// The drug's latest fill confirmed in Fold and its claim match, if any.
const fillMatchOf = (d, plan) => {
  const fill = latestConfirmedFill(d);
  return fill ? { fill, ...matchFill(fill, annotateClaims(d.refills), plan) } : null;
};

// Tag for a fill date confirmed in Fold: Projected until its claim matches;
// a rework link when the claim did not match.
function FillMatchTag({ match, onRework }) {
  if (!match) return null;
  if (match.status === 'Verified') return <Badge size="S" tone="success" icon="solar:check-circle-linear" label="Claim verified" />;
  if (match.status === 'Not matched') {
    return (
      <button type="button" className={styles.reworkLink} onClick={(e) => { e.stopPropagation(); onRework?.(); }} title={match.detail}>
        Claim not matched
      </button>
    );
  }
  return <Badge size="S" tone="warning" label="Projected" />;
}

export function MedicationDetail({ med, memberRowId, interventionLog, plan, initialTab }) {
  // Barrier & Intervention log entries for this medication's measure.
  const barrierLog = (interventionLog || [])
    .filter(e => e.measures?.[med.measure])
    .map(e => ({ date: e.date, by: e.by, source: e.source, rec: e.measures[med.measure] }));
  const update = useAppStore(s => s.updatePharmacyMedication);
  const save = (patch) => update(memberRowId, med.id, patch);
  // Claims tab (as in HCC), or the medication's details.
  const [tab, setTab] = useState(initialTab || 'details');
  const claims = annotateClaims(med.refills);
  const countedClaims = new Set(claims.filter(c => c.counts).map(claimKey));
  const claimCount = (med.refills || []).length;
  const conditions = conditionsOf(med);
  const toggleCondition = (c) => save({
    conditions: conditions.includes(c) ? conditions.filter(x => x !== c) : [...conditions, c],
  });

  return (
    <div className={styles.detail}>
      <TabStrip
        items={[{ key: 'details', label: 'Details' }, { key: 'claims', label: `Claim History (${claimCount})` }]}
        activeKey={tab}
        onChange={setTab}
        fullWidth={false}
        size="S"
      />
      {tab === 'claims' ? <MedicationClaims med={med} plan={plan} memberRowId={memberRowId} /> : <>
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
            {/* Only claims that count are fills; reversals, voided and other
                coverage lines are in Claim History only. */}
            {med.refills.filter(r => r.source || countedClaims.has(claimKey(r))).map((r, i) => (
              <tr key={`${r.date}-${r.source || 'claim'}-${i}`}>
                <td>{r.date}</td><td>{r.qty}</td><td>{r.daysSupply}</td>
                <td>{r.pharmacy}</td><td>{r.prescriber}</td><td>{r.prescriberAddress}</td>
                {/* Call-confirmed pickups land here before the claim does. */}
                <td>{r.source ? (
                  <span className={styles.sourceCell}>
                    <Badge size="S" tone="grey" icon={r.manual ? 'solar:pen-linear' : 'solar:phone-linear'} label={r.manual ? 'Entered by hand' : r.source} />
                    <FillMatchTag match={matchFill(r, claims, plan)} onRework={() => setTab('claims')} />
                  </span>
                ) : 'Claim'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>}
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
const classOf = (d) => CLASS_BY_GENERIC.find(([re]) => re.test(d.generic || ''))?.[1] || 'Other';

// MM/DD/YYYY (stored) ↔ YYYY-MM-DD (date input).
const toIso = (mdy) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(mdy || '');
  return m ? `${m[3]}-${m[1]}-${m[2]}` : '';
};
const fromIso = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[2]}/${m[3]}/${m[1]}` : '';
};

// One gap's medications, grouped by therapeutic class so a switch within a
// class (one ARB discontinued, another started) sits together.
function classGroups(x) {
  const out = [];
  for (const d of x.medications) {
    const cls = classOf(d);
    let g = out.find(y => y.cls === cls);
    if (!g) { g = { cls, meds: [] }; out.push(g); }
    g.meds.push({ ...d, measure: x.code });
  }
  return out;
}

// Medication Review step of the Pharmacy program. Every pharmacy gap is an
// expandable card, the one opened from the worklist first; open gaps start
// expanded, closed ones (picked up, closed by data) collapsed. Inside, the
// gap's medications are grouped by therapeutic class so drug switches are
// visible. Last Fill is the claims date; Recent Fill (set by a pickup or
// refill-approved outreach) is editable and drives next fill and PDC. Clicking a medication opens its details and refill history.
// `onOpenMed` lets a host (the gap drawer) show a medication in its own
// side workspace instead of the stacked drawer.
export function PharmacyMedicationReview({ member: memberProp, onOpenMed }) {
  const fromProfile = usePharmacyProgramMember();
  const member = memberProp || fromProfile;
  const focus = useAppStore(s => s.pharmacyFocusGap);
  const setRecentFill = useAppStore(s => s.setPharmacyRecentFill);
  // Expansion the user chose, per gap; gaps they haven't touched follow
  // their default, so a later status change doesn't flip a chosen state.
  const [chosen, setChosen] = useState(() => new Map());
  const [openId, setOpenId] = useState(null);
  const [openTab, setOpenTab] = useState(null);
  // Opens a drug's details, or its claim history for a rework.
  const openDrug = (medId, medTab = null) => {
    if (onOpenMed) { onOpenMed(medId, medTab); return; }
    setOpenId(medId);
    setOpenTab(medTab);
  };
  // Bulk Recent Fill: drugs picked across any gaps, as "code|medId".
  const setRecentFillBulk = useAppStore(s => s.setPharmacyRecentFillBulk);
  const [picked, setPicked] = useState(() => new Set());
  const [bulkDate, setBulkDate] = useState('');
  // Picks belong to one patient: drop them when another patient opens on
  // this step (the step is not remounted).
  const [pickedFor, setPickedFor] = useState(member?.id);
  if (pickedFor !== member?.id) {
    setPickedFor(member?.id);
    setPicked(new Set());
    setBulkDate('');
  }
  const pickKey = (code, medId) => `${code}|${medId}`;
  const togglePick = (key) => setPicked(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  // Select-all: every active drug of one gap, or of all gaps.
  const activeKeys = (xs) => xs.flatMap(x => x.medications.filter(d => d.status !== 'Discontinued').map(d => pickKey(x.code, d.id)));
  const checkState = (keys) => (keys.length && keys.every(k => picked.has(k)) ? true : keys.some(k => picked.has(k)) ? 'indeterminate' : false);
  const setMany = (keys, on) => setPicked(prev => {
    const next = new Set(prev);
    for (const k of keys) { if (on) next.add(k); else next.delete(k); }
    return next;
  });
  const applyBulk = () => {
    setRecentFillBulk(member.id, [...picked].map(k => { const [code, medId] = k.split('|'); return { code, medId }; }), fromIso(bulkDate));
    setPicked(new Set());
    setBulkDate('');
  };

  const all = useMemo(() => (member?.measures || [])
    .map(x => ({ ...x, st: measureStatus(x, member) }))
    .toSorted((a, b) => MEASURE_ORDER.indexOf(a.code) - MEASURE_ORDER.indexOf(b.code)), [member]);
  const focusCode = focus?.memberId === member?.id ? focus.code : null;
  const shown = all.toSorted((a, b) => (b.code === focusCode) - (a.code === focusCode));

  const openCodes = new Set(all.filter(x => isActiveGap(x.st)).map(x => x.code));
  // Red only for an open gap's risk; a closed gap's numbers are history.
  const riskClass = (code, tone) => (openCodes.has(code) ? TONE_CLASS[tone] || '' : '');
  // Open gaps (and the one opened from the worklist) start expanded.
  const isExpanded = (code) => (chosen.has(code) ? chosen.get(code) : openCodes.has(code) || code === focusCode);
  const toggle = (code) => setChosen(prev => new Map(prev).set(code, !isExpanded(code)));
  const medCount = all.reduce((n, x) => n + x.medications.length, 0);
  const openMed = openId
    ? all.flatMap(x => x.medications.map(d => ({ ...d, measure: x.code }))).find(d => d.id === openId)
    : null;

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
        {activeKeys(all).length > 0 && (
          <label className={styles.checkRow}>
            <Checkbox
              checked={checkState(activeKeys(all))}
              onCheckedChange={() => setMany(activeKeys(all), checkState(activeKeys(all)) !== true)}
              aria-label="Select all medications"
            />
            <span>Select all medications</span>
          </label>
        )}
        <span className={styles.count}>{all.length} gap{all.length === 1 ? '' : 's'} · {medCount} medication{medCount === 1 ? '' : 's'}</span>
      </div>
      <p className={styles.helper}>
        <Icon name="solar:info-circle-linear" size={14} color="var(--neutral-300)" />
        A Recent Fill date entered here is projected: it updates PDC, next fill and fail date, but the gap only closes when a matching Part D claim arrives.
      </p>

      {picked.size > 0 && (
        <div className={styles.bulkBar} role="region" aria-label="Set recent fill for selected medications">
          <span className={styles.bulkCount}>{picked.size} medication{picked.size === 1 ? '' : 's'} selected</span>
          <span className={styles.bulkField}>
            <span className={styles.groupMeta}>Recent Fill</span>
            <DatePicker value={bulkDate} onSelect={setBulkDate} aria-label="Recent fill date for selected medications" />
          </span>
          <Button variant="primary" size="M" disabled={!bulkDate} onClick={applyBulk}>Apply to {picked.size}</Button>
          <Button variant="ghost" size="M" onClick={() => setPicked(new Set())}>Clear selection</Button>
        </div>
      )}

      {shown.map(x => {
        const expanded = isExpanded(x.code);
        return (
          <section key={x.code} className={`${styles.gapCard} ${x.code === focusCode ? styles.gapCardFocus : ''}`}>
            <button type="button" className={styles.gapCardToggle} onClick={() => toggle(x.code)} aria-expanded={expanded}>
              <span className={styles.gapCardHead}>
                <DownChevronIcon size={14} className={`${styles.chevron} ${expanded ? '' : styles.chevronRight}`} />
                <MeasureCode code={x.code} />
                <span className={styles.groupName}>{MEASURE_NAMES[x.code]}</span>
                {x.code === focusCode && <span className={styles.groupMeta}>Opened from worklist</span>}
                <span className={styles.groupMeta}>{x.medications.length} medication{x.medications.length === 1 ? '' : 's'}</span>
              </span>
              <span className={styles.gapCardMeta}>
                <Badge size="S" tone={GAP_STATUS_TONE[x.st.gap]} label={x.st.gap} />
                <SubStatus label={x.st.label} />
                <span className={styles.groupMeta}>{x.pdcProjected != null ? 'Projected PDC' : 'PDC'} <b className={riskClass(x.code, pdcTone(effectivePdc(x)))}>{effectivePdc(x) == null ? '—' : `${effectivePdc(x)}%`}</b></span>
                <span className={styles.groupMeta}>Next due <b className={riskClass(x.code, fillDueTone(x.nextFillDue))}>{x.nextFillDue || '—'}</b></span>
              </span>
            </button>

            {expanded && (
              <div className={styles.tableScroll}>
                <table className={`${styles.table} ${styles.medTable}`}>
                  <thead>
                    <tr>
                      <th className={styles.pickCol}>
                        {activeKeys([x]).length > 0 && (
                          <Checkbox
                            checked={checkState(activeKeys([x]))}
                            onCheckedChange={() => setMany(activeKeys([x]), checkState(activeKeys([x])) !== true)}
                            aria-label={`Select all ${x.code} medications`}
                          />
                        )}
                      </th><th>Rx</th><th>Last Fill</th><th>Recent Fill</th><th>Next Fill</th><th>PDC</th><th>MPR</th>
                      <th>DS</th><th>Quantity</th><th>Barrier</th><th>Prescriber</th><th>Pharmacy</th><th aria-label="Open" />
                    </tr>
                  </thead>
                  <tbody>
                    {classGroups(x).map(g => {
                      const switched = g.meds.some(d => d.status === 'Discontinued') && g.meds.some(d => d.status !== 'Discontinued');
                      return (
                        <Fragment key={g.cls}>
                          <tr className={styles.groupRow}>
                            <td colSpan={13}>
                              <span className={styles.groupHead}>
                                <span className={styles.groupName}>{g.cls}</span>
                                <span className={styles.groupMeta}>{g.meds.length} medication{g.meds.length === 1 ? '' : 's'}</span>
                                {switched && <Badge size="S" tone="grey" icon="solar:refresh-linear" label="Drug switched" />}
                              </span>
                            </td>
                          </tr>
                          {g.meds.map(d => (
                            <tr
                              key={d.id}
                              className={`${styles.medRow} ${openId === d.id ? styles.medRowSelected : ''} ${d.status === 'Discontinued' ? styles.medRowDc : ''}`}
                              onClick={() => openDrug(d.id)}
                            >
                              <td className={styles.pickCol} onClick={e => e.stopPropagation()}>
                                {d.status !== 'Discontinued' && (
                                  <Checkbox
                                    checked={picked.has(pickKey(x.code, d.id))}
                                    onCheckedChange={() => togglePick(pickKey(x.code, d.id))}
                                    aria-label={`Select ${d.name}`}
                                  />
                                )}
                              </td>
                              <td className={styles.rxCell}>
                                <span className={styles.rxName}>{d.name} {d.strength} {d.unit}</span>
                                <span className={styles.rxGeneric}>{d.generic}{d.status === 'Discontinued' ? ' · Discontinued' : ''}</span>
                              </td>
                              <td>{d.lastFill}</td>
                              {d.status === 'Discontinued' ? (
                                <td>{d.recentFill || '—'}</td>
                              ) : (
                                <td className={styles.dateCell} onClick={e => e.stopPropagation()}>
                                  <DatePicker
                                    value={toIso(d.recentFill)}
                                    onSelect={(iso) => setRecentFill(member.id, x.code, d.id, fromIso(iso) || null)}
                                    aria-label={`${d.name} recent fill date`}
                                  />
                                  <FillMatchTag match={fillMatchOf(d, member.healthPlan)} onRework={() => openDrug(d.id, 'claims')} />
                                </td>
                              )}
                              <td className={riskClass(d.measure, fillDueTone(d.nextFill))}>{d.nextFill}</td>
                              <td className={riskClass(d.measure, pdcTone(d.pdc))}>{d.pdc == null ? '—' : `${d.pdc}%`}</td>
                              <td>{d.mpr ?? '—'}</td>
                              <td>{d.daysSupply}</td>
                              <td>{d.qty}</td>
                              <td>{d.nonAdherenceReason ? <Badge size="S" tone="grey" label={d.nonAdherenceReason} /> : '—'}</td>
                              <td>{d.prescriber?.name || '—'}</td>
                              <td>{d.pharmacy?.name || '—'}</td>
                              <td className={styles.openCell}>
                                <DownChevronIcon size={14} className={`${styles.chevron} ${styles.chevronRight}`} />
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}

      {openMed && (
        <Drawer
          title={`${openMed.name} ${openMed.strength} ${openMed.unit} (${openMed.generic})`}
          onClose={() => setOpenId(null)}
          width={760}
        >
          <MedicationDetail key={`${openMed.id}-${openTab || 'details'}`} med={openMed} memberRowId={member.id} interventionLog={member.interventionLog} plan={member.healthPlan} initialTab={openTab} />
        </Drawer>
      )}
    </div>
  );
}
