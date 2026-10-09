import { useState } from 'react';
import { Badge } from '../../../../../../../components/Badge/Badge';
import { Icon } from '../../../../../../../components/Icon/Icon';
import { SectionTitle } from './CarePlanViewSections';
import { INSTANCE_STATUS, formatInstanceDate } from '../lib/templateRenewal';
import viewStyles from './CarePlanView.module.css';
import styles from './PreviousTemplateRuns.module.css';

const KINDS = [
  { key: 'goals', label: 'Goals', icon: 'solar:flag-linear' },
  { key: 'interventions', label: 'Interventions', icon: 'solar:checklist-minimalistic-linear' },
  { key: 'barriers', label: 'Barriers', icon: 'solar:signpost-2-linear' },
];

/**
 * Earlier runs of templates that were reinstated: auto-closed as completed or
 * closed, with the goals, interventions and barriers they held, read-only.
 * Collapsed by default, and absent until a template has been reinstated.
 */
export function PreviousTemplateRuns({ instances, retired }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());
  const runs = (instances || []).filter(i => i.autoClosed).reverse();
  if (runs.length === 0) return null;

  const toggleRun = id => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  return (
    <div className={viewStyles.section}>
      <div className={viewStyles.sectionHead}>
        <SectionTitle label="Previous runs" count={runs.length} open={open} onToggle={() => setOpen(v => !v)} />
      </div>
      {open && (
        <div className={styles.list}>
          {runs.map(run => {
            const status = INSTANCE_STATUS[run.status] || INSTANCE_STATUS.closed;
            const isOpen = expanded.has(run.id);
            const items = Object.fromEntries(KINDS.map(k => [
              k.key, (retired?.[k.key] || []).filter(x => x.retiredInstanceId === run.id),
            ]));
            const start = run.startedAt ? formatInstanceDate(run.startedAt) : 'Start not recorded';
            return (
              <div key={run.id} className={styles.run}>
                <button type="button" className={styles.runHead} onClick={() => toggleRun(run.id)} aria-expanded={isOpen}>
                  <Icon
                    name="solar:alt-arrow-down-linear"
                    size={14}
                    color="var(--neutral-300)"
                    className={isOpen ? '' : styles.chevronClosed}
                  />
                  <span className={styles.runName}>{run.templateName || 'Template'}</span>
                  <Badge size="S" tone={status.tone} label={status.label} />
                  <Badge size="S" tone="warning" icon="solar:restart-linear" label="Auto-closed" />
                  <span className={styles.runDates}>{start} – {formatInstanceDate(run.endedAt)}</span>
                </button>
                <p className={styles.runMeta}>
                  {run.totalCount != null && `${run.doneCount} of ${run.totalCount} goals and interventions met. `}
                  Closed when the template was reinstated.
                </p>
                {isOpen && (
                  <div className={styles.items}>
                    {KINDS.filter(k => items[k.key].length).map(k => (
                      <div key={k.key} className={styles.kind}>
                        <span className={styles.kindLabel}>{k.label}</span>
                        {items[k.key].map(item => (
                          <div key={item.id} className={styles.item}>
                            <Icon name={k.icon} size={14} color="var(--neutral-300)" />
                            <span className={styles.itemTitle}>{item.title}</span>
                            {item.status && <Badge size="S" tone="grey" label={item.status} />}
                          </div>
                        ))}
                      </div>
                    ))}
                    {KINDS.every(k => !items[k.key].length) && (
                      <p className={styles.runMeta}>No goals, interventions or barriers were on this run.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
