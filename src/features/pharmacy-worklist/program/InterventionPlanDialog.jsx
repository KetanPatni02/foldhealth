import { useState } from 'react';
import { ConfirmDialog } from '../../../components/ConfirmDialog/ConfirmDialog';
import { Checkbox } from '../../../components/Checkbox/Checkbox';
import { Sep } from '../PharmacyCells';
import styles from './InterventionPlanDialog.module.css';

// After a barrier is logged (Suresh): the template's interventions for it,
// each with its owner and due date, all picked to start. Confirm adds the
// picked ones to the gap and creates a task for each.
// `plan`: interventionPlan(...) rows. `onConfirm(rows)`, `onSkip()`.
export function InterventionPlanDialog({ plan, onConfirm, onSkip }) {
  const [picked, setPicked] = useState(() => new Set(plan.map(p => p.key)));
  const toggle = (key, on) => setPicked(prev => {
    const next = new Set(prev);
    if (on) next.add(key); else next.delete(key);
    return next;
  });
  const groups = [...new Set(plan.map(p => `${p.code}|${p.barrier}`))];
  const chosen = plan.filter(p => picked.has(p.key));
  return (
    <ConfirmDialog
      variant="primary"
      icon="solar:checklist-minimalistic-linear"
      iconColor="var(--primary-300)"
      align="start"
      className={styles.wide}
      title="Add interventions for the new barriers?"
      description="Each one picked is added to the gap and becomes a task for its owner, due in the days shown."
      confirmLabel={chosen.length ? `Add ${chosen.length} intervention${chosen.length === 1 ? '' : 's'}` : 'Add interventions'}
      confirmDisabled={!chosen.length}
      cancelLabel="Skip"
      onConfirm={() => onConfirm(chosen)}
      onCancel={onSkip}
      onClose={onSkip}
    >
      <div className={styles.groups}>
        {groups.map(g => {
          const [code, barrier] = g.split('|');
          return (
            <section key={g} className={styles.group}>
              <span className={styles.groupTitle}>{code}<Sep />{barrier}</span>
              {plan.filter(p => `${p.code}|${p.barrier}` === g).map(p => (
                <label key={p.key} className={styles.row}>
                  <Checkbox checked={picked.has(p.key)} onCheckedChange={v => toggle(p.key, !!v)} aria-label={`${p.intervention} for ${barrier} on ${code}`} />
                  <span className={styles.main}>
                    <span className={styles.name}>{p.intervention}</span>
                    <span className={styles.meta}>
                      {p.owner.name ? `${p.owner.name} (${p.owner.roleLabel})` : `${p.owner.roleLabel}: not assigned`}
                      <Sep />
                      {`Due ${p.due} (${p.days}d)`}
                    </span>
                  </span>
                </label>
              ))}
            </section>
          );
        })}
      </div>
    </ConfirmDialog>
  );
}
