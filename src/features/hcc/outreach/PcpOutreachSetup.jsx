import { useMemo, useState } from 'react';
import { Input } from '../../../components/Input/Input';
import { Select } from '../../../components/Select/Select';
import { Textarea } from '../../../components/Textarea/Textarea';
import { RadioButton } from '../../../components/RadioButton/RadioButton';
import { PcpPatientLine } from './PcpPatientLine';
import { DateTimePicker } from '../../../components/DateTimePicker/DateTimePicker';
import { TypeDropdown, FieldDropdown } from '../../patient/left-panel/tabs/outreach/OutreachTab/OutreachTabDropdowns';
import { NotePanel } from '../../patient/left-panel/tabs/outreach/OutreachTab/OutreachTabNotePanel';
import { DurationField } from '../../patient/left-panel/tabs/outreach/OutreachTab/DurationField';
import { TYPE_OPTIONS } from '../../patient/left-panel/tabs/outreach/OutreachTab/OutreachTab.utils';
import { CATEGORIES, outcomesFor } from './outreachModel';
import { PCP_CALL_OUR_LINES, PCP_NOTE_OUTCOMES, pcpCallLines } from './pcpOutreach';
import o from '../../patient/left-panel/tabs/outreach/OutreachTab/OutreachTab.module.css';
import styles from './PcpOutreach.module.css';

const toOptions = (list) => list.map(v => ({ value: v, label: v }));

/**
 * PCP Outreach, step 1, in the HCC Outreach form's layout. It is always with
 * the PCP / PCP Office (the drawer's title says so), so there is no Log
 * Outreach With row: the PCP and the patients
 * discussed (open DOS where that PCP is the rendering provider), the mode
 * and its details, and one outcome for the whole outreach. A transcript is
 * pasted into the note box from the icon next to Select Outcome.
 * Controlled: `form` / `setForm`.
 */
export function PcpOutreachSetup({ form, setForm, pcps, patients, outcomeList, error, titleExtra, selectedSlot }) {
  const [query, setQuery] = useState('');
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(true);
  const set = (patch) => setForm(f => ({ ...f, ...patch }));
  const [picking, setPicking] = useState(false);
  const addable = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients.filter(p => !form.selected.includes(p.key)
      && (!q || `${p.name} ${p.memberId || ''}`.toLowerCase().includes(q)));
  }, [patients, query, form.selected]);
  const toggle = (key, on) => set({ selected: on ? [...new Set([...form.selected, key])] : form.selected.filter(k => k !== key) });
  const choices = useMemo(
    () => Object.fromEntries(CATEGORIES.map(c => [c, c === 'Note' ? PCP_NOTE_OUTCOMES : outcomesFor(c, 'pcp', outcomeList)])),
    [outcomeList],
  );
  const isCall = form.mode === 'Call';
  // Outgoing: Call Via is our line, Called To the PCP side; incoming swaps them.
  const incoming = form.direction === 'incoming';
  const viaOptions = incoming ? pcpCallLines(form.pcp) : PCP_CALL_OUR_LINES;
  const toOptions2 = incoming ? PCP_CALL_OUR_LINES : pcpCallLines(form.pcp);
  const setDirection = (direction) => {
    if (direction !== form.direction) set({ direction, callVia: form.calledTo, calledTo: form.callVia });
  };

  return (
    <div className={styles.body}>
      <div className={styles.form}>
        <Select
          label="PCP"
          required
          searchable
          placeholder="Search and select a PCP"
          options={toOptions(pcps)}
          value={form.pcp}
          onValueChange={(pcp) => set({ pcp, selected: [], ...(incoming ? { callVia: pcpCallLines(pcp)[0] } : { calledTo: pcpCallLines(pcp)[0] }) })}
        />

        {/* The outreach itself, in one card; the patients follow, so the
            outcome above says whether they were discussed. */}
        <div className={`${o.formCard} ${styles.detailsCard}`}>
          <div className={o.formHeader}>
            <TypeDropdown value={form.mode} onChange={(mode) => set({ mode })} options={TYPE_OPTIONS} />
            <DateTimePicker value={form.datetime} onChange={(datetime) => set({ datetime })}
              errorText={error && /future/.test(error) ? 'Can’t be in the future' : undefined} />
          </div>

          <div className={`${o.formBody} ${styles.detailsBody}`}>
            {isCall && (
              <div className={o.callDetailsInner}>
                <div className={o.callDetailsHeader}>
                  <span className={o.hccTitle}>Call Details:</span>
                </div>
                <div className={o.callFieldsGrid}>
                  <div className={o.callFieldWrap}>
                    <span className={o.callFieldLabel}>Call Direction</span>
                    <div className={`${o.callDirectionRow} ${o.callDirectionRowField}`}>
                      <RadioButton checked={form.direction === 'outgoing'} onChange={() => setDirection('outgoing')} label="Outgoing" />
                      <RadioButton checked={form.direction === 'incoming'} onChange={() => setDirection('incoming')} label="Incoming" />
                    </div>
                  </div>
                  <div className={o.callFieldWrap}>
                    <span className={o.callFieldLabel}>Duration</span>
                    <DurationField min={form.durMin} sec={form.durSec}
                      onMinChange={(durMin) => set({ durMin })} onSecChange={(durSec) => set({ durSec })} />
                  </div>
                </div>
                <div className={o.callFieldsGrid}>
                  <div className={o.callFieldWrap}>
                    <span className={o.callFieldLabel}>Call Via Number</span>
                    <FieldDropdown value={form.callVia} onChange={(callVia) => set({ callVia })} placeholder="Select number" options={viaOptions} />
                  </div>
                  <div className={o.callFieldWrap}>
                    <span className={o.callFieldLabel}>Called To Number</span>
                    <FieldDropdown value={form.calledTo} onChange={(calledTo) => set({ calledTo })} placeholder="Select number" options={toOptions2} />
                  </div>
                </div>
              </div>
            )}

            {form.mode === 'Email' && (
              <div className={styles.section}>
                <div className={styles.grid}>
                  <Input label="To" required type="email" placeholder="records@practice.com" value={form.emailTo} onChange={e => set({ emailTo: e.target.value })} />
                  <Input label="Subject" required value={form.emailSubject} onChange={e => set({ emailSubject: e.target.value })} />
                </div>
                <Textarea title="Body" placeholder="Email text. Refer to patients by Member ID." value={form.emailBody} onValueChange={(emailBody) => set({ emailBody })} />
              </div>
            )}

            <div className={o.section}>
              <span className={o.hccTitle}>Outreach Outcome</span>
              <div className={o.outcomeRow2}>
                <div className={o.radios}>
                  {CATEGORIES.map(c => (
                    <RadioButton key={c} checked={form.category === c}
                      onChange={() => set({ category: c, outcome: choices[c].includes(form.outcome) ? form.outcome : '' })} label={c} />
                  ))}
                </div>
              </div>
            </div>

            <NotePanel
              title="PCP Outreach"
              plain
              singleOutcome
              expanded={noteOpen}
              onToggleExpand={() => setNoteOpen(v => !v)}
              outcomes={form.outcome ? [form.outcome] : []}
              outcomeType={form.category || null}
              outcomeChoices={choices}
              outcomeOpen={outcomeOpen}
              onToggleOutcomeOpen={() => setOutcomeOpen(!outcomeOpen)}
              onSetOutcomes={(list) => set({ outcome: list[0] || '' })}
              onAddOutcome={(val) => { set({ outcome: val }); setOutcomeOpen(false); }}
              onRemoveOutcome={() => set({ outcome: '' })}
              note={form.notes}
              onNoteChange={(notes) => set({ notes })}
              syncText={false}
              showSyncText={false}
              onToggleSyncText={() => {}}
              cannedEntry
              {...(isCall ? {
                transcript: form.transcript,
                onAddTranscript: () => { set({ transcript: '' }); setNoteOpen(true); },
                onTranscriptChange: (transcript) => set({ transcript }),
                onRemoveTranscript: () => set({ transcript: undefined }),
              } : {})}
            />
          </div>
        </div>

        {form.pcp && (
          // Patients discussed (Figma 40:136688 in patient context): search
          // this PCP's patients to add them, then the selected list below.
          <div className={styles.section}>
            <div className={styles.pickTitleRow}>
              <div className={styles.pickTitle}>
                <span>{form.category === 'Unsuccessful' ? 'Patients Not Discussed' : 'Patients Discussed'}</span>
                <span className={styles.requiredDot} aria-hidden="true" />
              </div>
              {titleExtra}
            </div>
            {patients.length === 0 ? (
              <div className={styles.empty}>No patients with open DOSs for this PCP</div>
            ) : (
              <div className={styles.picker}>
                <Input
                  leadingIcon="solar:magnifer-linear"
                  placeholder="Search patients by name or Member ID to add"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={() => setPicking(true)}
                  onBlur={() => setPicking(false)}
                  aria-label="Search patients to add"
                />
                {/* Open while the field has focus; once everyone is added it
                    stays shut unless there's a search to answer. */}
                {picking && (addable.length > 0 || query.trim()) && (
                  <div className={styles.results} role="listbox" aria-label="Patients">
                    {addable.length === 0 ? (
                      <div className={styles.resultsEmpty}>No matching patients</div>
                    ) : addable.map(p => (
                      <button key={p.key} type="button" role="option" aria-selected="false" className={styles.resultRow}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => { toggle(p.key, true); setQuery(''); }}>
                        <PcpPatientLine p={p} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {selectedSlot}
          </div>
        )}
      </div>
    </div>
  );
}
