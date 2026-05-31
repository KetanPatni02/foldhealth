/**
 * Analytics tab for the form builder. Hosts three nested tabs (Insight / Report
 * / Responses) styled like the Agent Analytics panel. Fetches the form's
 * responses once and shares them across all three views.
 */
import { useEffect, useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { useAppStore } from '../../../store/useAppStore';
import { InsightView } from './InsightView';
import { ReportView } from './ReportView';
import { ResponsesView } from './ResponsesView';
import { splitByStatus } from './aggregate';
import styles from './FormAnalyticsPanel.module.css';

const SUB_TABS = [
  { id: 'insight', label: 'Insight', icon: 'solar:chart-2-linear' },
  { id: 'report', label: 'Report', icon: 'solar:document-text-linear' },
  { id: 'responses', label: 'Responses', icon: 'solar:inbox-in-linear' },
];

export function FormAnalyticsPanel({ formId, fields, scoring, formName }) {
  const fetchFormResponses = useAppStore((s) => s.fetchFormResponses);
  const [tab, setTab] = useState('insight');
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  const isLocal = typeof formId === 'string' && String(formId).startsWith('local-');
  const { completed, pending } = splitByStatus(responses);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchFormResponses(formId).then((rows) => {
      if (!active) return;
      setResponses(rows);
      setLoading(false);
    });
    return () => { active = false; };
  }, [formId, fetchFormResponses]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.tabBar}>
        <div className={styles.tabBarInner}>
          {SUB_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => setTab(t.id)}
            >
              <Icon name={t.icon} size={16} color={tab === t.id ? 'var(--primary-300)' : 'var(--neutral-300)'} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {isLocal ? (
        <div className={styles.empty}>
          <Icon name="solar:inbox-linear" size={32} color="var(--neutral-150)" />
          <span className={styles.emptyTitle}>Save the form first</span>
          <span className={styles.emptyDesc}>Once saved, responses and analytics will appear here.</span>
        </div>
      ) : loading ? (
        <div className={styles.empty}><span className={styles.emptyDesc}>Loading…</span></div>
      ) : responses.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="solar:inbox-linear" size={32} color="var(--neutral-150)" />
          <span className={styles.emptyTitle}>No responses yet</span>
          <span className={styles.emptyDesc}>Share the form link to start collecting responses, then return here for insights.</span>
        </div>
      ) : tab === 'responses' ? (
        <ResponsesView fields={fields} scoring={scoring} formName={formName} completed={completed} pending={pending} />
      ) : (
        <div className={styles.scrollArea}>
          {tab === 'insight' && (
            <InsightView fields={fields} scoring={scoring} completed={completed} pending={pending} onViewResponses={() => setTab('responses')} />
          )}
          {tab === 'report' && <ReportView fields={fields} responses={completed} />}
        </div>
      )}
    </div>
  );
}

export default FormAnalyticsPanel;
