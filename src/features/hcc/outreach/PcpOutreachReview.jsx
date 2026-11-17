import { useState } from 'react';
import { Badge } from '../../../components/Badge/Badge';
import { Button } from '../../../components/Button/Button';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { PcpPatientLine } from './PcpPatientLine';
import { PCP_NOTE_OUTCOMES } from './pcpOutreach';
import { Icon } from '../../../components/Icon/Icon';
import { DownChevronIcon } from '../../../components/Icon/DownChevronIcon';
import { Select } from '../../../components/Select/Select';
import { Textarea } from '../../../components/Textarea/Textarea';
import { CATEGORIES, outcomesFor } from './outreachModel';
import {
  confirmFlag, moveDraft, unresolveDraft, placeUnassigned, unresolveUnassigned,
  removePatient, addPatient, setDraftField, suggestedName,
} from './pcpReview';
import styles from './PcpOutreach.module.css';

const toOptions = (list) => list.map(v => ({ value: v, label: v }));

/**
 * PCP Outreach, step 2: one draft per patient to check before save. Flagged
 * parts are confirmed, moved, or marked Unresolved (kept on the PCP outreach
 * only); unassigned parts are placed; patients can be added or removed.
 */
// `inline`: under the outreach details in PCP Outreach. Each patient's header
// is their avatar row with a remove ✕; `detailed` adds that patient's own
// outcome and summary under it (Log details per patient).
export function PcpOutreachReview({ review, setReview, pcpPatients, outcomeList, aiOk, error, inline = false, detailed = true }) {
  // Per-patient blocks fold from the chevron on their left.
  const [collapsed, setCollapsed] = useState(() => new Set());
  const toggleCollapsed = (key) => setCollapsed(c => {
    const next = new Set(c);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const selectedKeys = review.drafts.map(d => d.patientKey);
  const others = (key) => review.drafts.filter(d => d.patientKey !== key).map(d => ({ value: d.patientKey, label: d.name }));
  const addable = pcpPatients.filter(p => !selectedKeys.includes(p.key));
  const findPatient = (m) => pcpPatients.find(p => p.name.toLowerCase() === m.name.toLowerCase() || (m.memberId && p.memberId === m.memberId));
  const defaults = { category: review.drafts[0]?.category || 'Successful', outcome: review.drafts[0]?.outcome || '' };

  return (
    <div className={inline ? styles.reviewInline : styles.body}>
      {detailed && !aiOk && (
        <div className={styles.notice}>
          <Icon name="solar:info-circle-linear" size={14} color="currentColor" />
          Couldn’t draft the summaries. Write each patient’s part below.
        </div>
      )}

      {review.drafts.map(d => {
        const outcomes = d.category === 'Note' ? PCP_NOTE_OUTCOMES : outcomesFor(d.category, 'pcp', outcomeList);
        return (
          <div key={d.patientKey} className={inline && !detailed ? styles.patientRowPlain : `${styles.card} ${d.flagged ? styles.cardFlagged : ''}`}>
            {inline ? (
              <div className={styles.cardHead}>
                {detailed && (
                  <button type="button" className={styles.cardChevron} aria-expanded={!collapsed.has(d.patientKey)}
                    aria-label={`${collapsed.has(d.patientKey) ? 'Expand' : 'Collapse'} ${d.name}`} onClick={() => toggleCollapsed(d.patientKey)}>
                    <DownChevronIcon size={14} color="var(--neutral-400)" style={collapsed.has(d.patientKey) ? { transform: 'rotate(-90deg)' } : undefined} />
                  </button>
                )}
                <PcpPatientLine p={pcpPatients.find(p => p.key === d.patientKey) || { name: d.name }} />
                <ActionButton size="sm" icon="solar:close-linear" tooltip={`Remove ${d.name}`} tooltipLeft onClick={() => setReview(s => removePatient(s, d.patientKey))} />
              </div>
            ) : (
              <div className={styles.cardHead}>
                <span className={styles.patientName}>{d.name}</span>
                <Button variant="ghost" size="sm" onClick={() => setReview(s => removePatient(s, d.patientKey))}>Remove</Button>
              </div>
            )}
            {detailed && !collapsed.has(d.patientKey) && (<>

            {d.flagged && (
              <div className={styles.flag}>
                <div className={styles.flagText}>
                  <Icon name="solar:danger-triangle-linear" size={14} color="currentColor" />
                  <span>Flagged: {d.flagReason}{d.purpose ? ` (purpose: ${d.purpose})` : ''}.
                  {d.suggestedKey && <> Suggested patient: <strong>{suggestedName(review, d.suggestedKey)}</strong>.</>}</span>
                </div>
                <div className={styles.flagActions}>
                  {d.suggestedKey && d.suggestedKey !== d.patientKey ? (
                    <Button size="sm" onClick={() => setReview(s => moveDraft(s, d.patientKey, d.suggestedKey))}>Move to {suggestedName(review, d.suggestedKey)}</Button>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => setReview(s => confirmFlag(s, d.patientKey))}>Keep with {d.name}</Button>
                  {others(d.patientKey).length > 0 && (
                    <div className={styles.moveSelect}>
                      <Select size="sm" placeholder="Move to…" options={others(d.patientKey)} value="" onValueChange={(to) => setReview(s => moveDraft(s, d.patientKey, to))} aria-label="Move to patient" />
                    </div>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setReview(s => unresolveDraft(s, d.patientKey))}>Mark Unresolved</Button>
                </div>
              </div>
            )}

            {d.noDiscussion && !d.summary && (
              <div className={styles.hint}>No discussion found for this patient.</div>
            )}

            <div className={styles.grid}>
              <Select label="Category" options={toOptions(CATEGORIES)} value={d.category}
                onValueChange={(c) => setReview(s => setDraftField(setDraftField(s, d.patientKey, 'category', c), d.patientKey, 'outcome', (c === 'Note' ? PCP_NOTE_OUTCOMES : outcomesFor(c, 'pcp', outcomeList)).includes(d.outcome) ? d.outcome : ''))} />
              {d.category && (
                <Select label="Outcome" placeholder="Select outcome" options={toOptions(outcomes)} value={d.outcome}
                  onValueChange={(o) => setReview(s => setDraftField(s, d.patientKey, 'outcome', o))} />
              )}
            </div>
            <Textarea title="Summary for this patient" placeholder="What was discussed or agreed for this patient" value={d.summary}
              onValueChange={(v) => setReview(s => setDraftField(s, d.patientKey, 'summary', v))} />
            {d.actions.length > 0 && (
              <ul className={styles.actions}>
                {d.actions.map((a, i) => (
                  <li key={i}>
                    {a.text}{' '}
                    {a.refs.map(r => (
                      <Badge key={`${r.type}-${r.id}`} size="sm" tone={r.matched ? 'primary' : 'neutral'}
                        label={r.matched ? `${r.type === 'DOS' ? 'DOS ' : ''}${r.id}` : `${r.id}: Not matched to a record`} />
                    ))}
                  </li>
                ))}
              </ul>
            )}
            </>)}
          </div>
        );
      })}

      {detailed && review.unassigned.length > 0 && (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Not matched to a selected patient</span>
          {review.unassigned.map((u, i) => (
            <div key={i} className={`${styles.card} ${styles.cardFlagged}`}>
              <p className={styles.text}>{u.text}</p>
              {u.purpose && <span className={styles.hint}>Purpose: {u.purpose}</span>}
              <div className={styles.flagActions}>
                {u.suggestedKey && (
                  <Button size="sm" onClick={() => setReview(s => placeUnassigned(s, i, u.suggestedKey))}>Add to {suggestedName(review, u.suggestedKey)}</Button>
                )}
                <div className={styles.moveSelect}>
                  <Select size="sm" placeholder="Add to…" options={review.drafts.map(d => ({ value: d.patientKey, label: d.name }))} value=""
                    onValueChange={(key) => setReview(s => placeUnassigned(s, i, key))} aria-label="Add to patient" />
                </div>
                <Button size="sm" variant="ghost" onClick={() => setReview(s => unresolveUnassigned(s, i))}>Mark Unresolved</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {detailed && review.mentioned.length > 0 && (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Mentioned but not selected</span>
          {review.mentioned.map(m => {
            const p = findPatient(m);
            return (
              <div key={m.name} className={styles.row}>
                <span className={styles.text}>{m.name}{m.memberId ? ` (Member ID ${m.memberId})` : ''}</span>
                {p
                  ? <Button size="sm" variant="outline" onClick={() => setReview(s => addPatient(s, p, defaults))}>Add</Button>
                  : <span className={styles.hint}>Not in this PCP’s patient list</span>}
              </div>
            );
          })}
        </div>
      )}

      {!inline && addable.length > 0 && (
        <div className={styles.moveSelect}>
          <Select size="sm" searchable placeholder="Add a patient from this PCP’s list" options={addable.map(p => ({ value: p.key, label: `${p.name} · ${p.memberId || '-'}` }))}
            value="" onValueChange={(key) => setReview(s => addPatient(s, addable.find(p => p.key === key), defaults))} aria-label="Add patient" />
        </div>
      )}

      {review.unresolved.length > 0 && (
        <div className={styles.hint}>
          {review.unresolved.length} unresolved part{review.unresolved.length > 1 ? 's' : ''} will stay flagged on the PCP outreach and won’t be added to any patient.
        </div>
      )}

      {error && (
        <div className={styles.error} role="alert">
          <Icon name="solar:danger-circle-linear" size={14} color="currentColor" />
          {error}
        </div>
      )}
    </div>
  );
}
