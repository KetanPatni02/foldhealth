import { Badge } from '../../../../../components/Badge/Badge';
import { ActionButton } from '../../../../../components/ActionButton/ActionButton';
import { AddIconMinimalist } from '../../../../../components/Icon/AddIconMinimalist';
import { CarePlanGoalsTable } from '../../../../patient/right-panel/tabs/care-programs/care-plan/tables/CarePlanGoalsTable';
import { CarePlanInterventionsTable } from '../../../../patient/right-panel/tabs/care-programs/care-plan/tables/CarePlanInterventionsTable';
import { CarePlanBarriersTable } from '../../../../patient/right-panel/tabs/care-programs/care-plan/tables/CarePlanBarriersTable';
import styles from './CarePlanSections.module.css';

/**
 * The Goals / Interventions / Barriers stack, rendered with the patient care
 * plan's own GBI tables. Shared by the template screen and New Care Plan so a
 * plan reads identically wherever it is being built or reviewed.
 */
export function CarePlanSections({
  goalRows, interventionRows, barrierRows, footer,
  onOpenGoal, onOpenIntervention,
  linkedForGoal, linkedForChild,
  onAddGoal, onAddIntervention, onAddBarrier,
  onRowMenuGoal, onRowMenuIntervention, onRowMenuBarrier,
}) {
  // The "+" only appears where the caller can act on it, so a read-only
  // rendering of the same sections stays read-only.
  const section = (label, count, table, onAdd) => (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionTitle}>{label}</span>
        <Badge tone="grey" size="S" label={String(count)} />
        {onAdd && (
          <>
            <span className={styles.headDivider} aria-hidden="true" />
            <ActionButton size="S" tooltip={`Add ${label.toLowerCase()}`} onClick={onAdd}>
              <AddIconMinimalist size={16} color="var(--neutral-300)" />
            </ActionButton>
          </>
        )}
      </div>
      {table}
    </div>
  );

  return (
    <div className={styles.sections}>
      {section('Goals', goalRows.length,
        <CarePlanGoalsTable
          rows={goalRows}
          canEdit={false}
          linked={linkedForGoal || (() => null)}
          template
          onOpenGoal={onOpenGoal || (() => {})}
          onRowMenu={onRowMenuGoal}
        />, onAddGoal)}
      {section('Interventions', interventionRows.length,
        <CarePlanInterventionsTable
          rows={interventionRows}
          canEdit={false}
          linked={linkedForChild || (() => null)}
          template
          onOpenIntervention={onOpenIntervention || (() => {})}
          onRowMenu={onRowMenuIntervention}
        />, onAddIntervention)}
      {section('Barriers', barrierRows.length,
        <CarePlanBarriersTable
          rows={barrierRows}
          canEdit={false}
          linked={linkedForChild || (() => null)}
          template
          onRowMenu={onRowMenuBarrier}
        />, onAddBarrier)}
      {footer}
    </div>
  );
}
