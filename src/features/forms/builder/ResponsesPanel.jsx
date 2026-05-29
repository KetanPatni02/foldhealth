/**
 * Responses tab — lists every submission for the form (from form_responses),
 * with the submitter, timestamp, score summary, and the per-question answers.
 */
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { useAppStore } from '../../../store/useAppStore';
import styles from './FormBuilder.module.css';

const SEV_COLOR = {
  neutral: 'var(--neutral-300)', info: 'var(--status-info)', warning: 'var(--status-warning)',
  high: 'var(--status-warning)', critical: 'var(--status-error)',
};

function fmt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatAnswer(v) {
  if (v == null || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

export function ResponsesPanel({ formId, fields }) {
  const fetchFormResponses = useAppStore((s) => s.fetchFormResponses);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchFormResponses(formId).then((rows) => {
      if (!active) return;
      setResponses(rows);
      setOpenId(rows[0]?.id ?? null);
      setLoading(false);
    });
    return () => { active = false; };
  }, [formId, fetchFormResponses]);

  // linkId → question label, for rendering answers.
  const labels = useMemo(() => {
    const map = {};
    const walk = (list) => (list || []).forEach((f) => {
      if (f.type !== 'display') map[f.linkId] = f.text;
      if (f.items) walk(f.items);
    });
    walk(fields);
    return map;
  }, [fields]);

  const isLocal = typeof formId === 'string' && String(formId).startsWith('local-');

  return (
    <div className={styles.responsesWrap}>
      <div className={styles.responsesHead}>
        Responses {responses.length > 0 ? <span className={styles.responsesCount}>{responses.length}</span> : null}
      </div>
      <div className={styles.responsesScroll}>
        {isLocal ? (
          <div className={styles.responsesEmpty}>
            <Icon name="solar:inbox-linear" size={32} color="var(--neutral-150)" />
            <p>Save the form to start collecting responses.</p>
          </div>
        ) : loading ? (
          <div className={styles.responsesEmpty}>Loading…</div>
        ) : responses.length === 0 ? (
          <div className={styles.responsesEmpty}>
            <Icon name="solar:inbox-linear" size={32} color="var(--neutral-150)" />
            <p>No responses yet. Share the form link to start collecting.</p>
          </div>
        ) : (
          responses.map((r) => {
            const open = openId === r.id;
            const scores = r.scores?.scores || [];
            const criticals = r.scores?.criticalsTriggered || [];
            return (
              <div key={r.id} className={styles.respCard}>
                <button className={styles.respHeader} onClick={() => setOpenId(open ? null : r.id)}>
                  <Icon name={open ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'} size={14} color="var(--neutral-300)" />
                  <span className={styles.respWho}>{r.submittedByName || 'Anonymous'}</span>
                  <span className={styles.respTime}>{fmt(r.createdAt)}</span>
                  <span className={styles.respScores}>
                    {scores.map((s) => (
                      <span key={s.id} className={styles.respBadge} style={s.band ? { color: SEV_COLOR[s.band.severity], borderColor: SEV_COLOR[s.band.severity] } : undefined}>
                        {s.value ?? '—'}{s.band ? ` · ${s.band.label}` : ''}
                      </span>
                    ))}
                    {criticals.length > 0 && (
                      <span className={styles.respAlert}>
                        <Icon name="solar:danger-triangle-linear" size={12} color="var(--status-error)" /> {criticals.length}
                      </span>
                    )}
                  </span>
                </button>
                {open && (
                  <div className={styles.respBody}>
                    {Object.keys(labels).filter((lid) => r.answers[lid] !== undefined).length === 0 ? (
                      <div className={styles.respMuted}>No answers recorded.</div>
                    ) : (
                      Object.keys(labels)
                        .filter((lid) => r.answers[lid] !== undefined)
                        .map((lid) => (
                          <div key={lid} className={styles.respQA}>
                            <span className={styles.respQ}>{labels[lid]}</span>
                            <span className={styles.respA}>{formatAnswer(r.answers[lid])}</span>
                          </div>
                        ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ResponsesPanel;
