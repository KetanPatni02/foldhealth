import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/Button/Button';
import { Badge } from '../../../components/Badge/Badge';
import { Switch } from '../../../components/Switch/Switch';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { ConfirmDialog } from '../../../components/ConfirmDialog/ConfirmDialog';
import { RingEmptyState } from '../../../components/RingEmptyState/RingEmptyState';
import { TableSkeleton } from '../../../components/TableSkeleton/TableSkeleton';
import { AddIconMinimalist } from '../../../components/Icon/AddIconMinimalist';
import { useAppStore } from '../../../store/useAppStore';
import { AutomationRuleDrawer } from './AutomationRuleDrawer';
import { describeCondition } from './lib/automationRules';
import styles from './AutomationRules.module.css';

const fmtWhen = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';
};

/**
 * Settings > Automation Rules: account-level auto-apply rules. When a patient
 * enrolls in a care program, each enabled rule watching that program is
 * checked against their chronic conditions, labs, recent encounters and
 * assessment answers; a match attaches its templates to the care plan in
 * draft and queues a care manager review task (store: runAutoApplyRules).
 */
export function AutomationRulesPanel() {
  const rules = useAppStore(s => s.automationRules);
  const status = useAppStore(s => s.automationRulesStatus);
  const runs = useAppStore(s => s.automationRuleRuns);
  const templates = useAppStore(s => s.carePlanTemplates);
  const fetchAutomationRules = useAppStore(s => s.fetchAutomationRules);
  const fetchAutomationRuleRuns = useAppStore(s => s.fetchAutomationRuleRuns);
  const fetchCarePlanLibrary = useAppStore(s => s.fetchCarePlanLibrary);
  const saveAutomationRule = useAppStore(s => s.saveAutomationRule);
  const deleteAutomationRule = useAppStore(s => s.deleteAutomationRule);
  const showToast = useAppStore(s => s.showToast);
  const [editing, setEditing] = useState(null); // rule | 'new' | null
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchAutomationRules();
    fetchAutomationRuleRuns();
    if (!templates.length) fetchCarePlanLibrary();
  }, [fetchAutomationRules, fetchAutomationRuleRuns, fetchCarePlanLibrary, templates.length]);

  const templateName = useMemo(() => new Map((templates || []).map(t => [t.id, t.name])), [templates]);
  const ruleName = useMemo(() => new Map(rules.map(r => [r.id, r.name])), [rules]);
  const lastMatchByRule = useMemo(() => {
    const m = new Map();
    for (const r of runs) if (r.matched && !m.has(r.ruleId)) m.set(r.ruleId, r);
    return m;
  }, [runs]);

  const save = async (draft) => {
    const saved = await saveAutomationRule(draft, editing && editing !== 'new' ? editing.id : null);
    if (saved) showToast(`Rule "${saved.name}" saved`);
    return !!saved;
  };

  const loading = status === 'idle' || status === 'loading';

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <span className={styles.title}>Automation Rules</span>
          <span className={styles.subtitle}>
            When a patient enrolls in a care program, matching rules attach care plan templates in draft and queue a review task for the care manager.
          </span>
        </div>
        <Button
          size="L"
          leadingIconElement={<AddIconMinimalist size={16} />}
          disabled={status === 'missing'}
          onClick={() => setEditing('new')}
        >
          New Rule
        </Button>
      </div>

      {loading ? (
        <TableSkeleton rows={4} />
      ) : status === 'missing' ? (
        <RingEmptyState icon="solar:database-linear" label="Automation rules need the automation rules migration (automation_rules_migration.sql)" />
      ) : rules.length === 0 ? (
        <RingEmptyState icon="solar:bolt-linear" label="No automation rules yet">
          <Button variant="secondary" size="L" onClick={() => setEditing('new')}>Create a Rule</Button>
        </RingEmptyState>
      ) : (
        <div className={styles.rules}>
          {rules.map(rule => {
            const last = lastMatchByRule.get(rule.id);
            return (
              <div key={rule.id} className={`${styles.rule} ${rule.enabled ? '' : styles.ruleOff}`}>
                <div className={styles.ruleHead}>
                  <Switch
                    checked={rule.enabled}
                    onChange={v => saveAutomationRule({ ...rule, enabled: v }, rule.id)}
                    ariaLabel={`${rule.enabled ? 'Disable' : 'Enable'} ${rule.name}`}
                  />
                  <span className={styles.ruleName}>{rule.name}</span>
                  <span className={styles.programs}>
                    {(rule.programCodes || []).length
                      ? rule.programCodes.map(c => <Badge key={c} tone="grey" size="S" label={c} />)
                      : <Badge tone="grey" size="S" label="Any program" />}
                  </span>
                  <ActionButton size="S" icon="solar:pen-linear" tooltip="Edit rule" onClick={() => setEditing(rule)} />
                  <ActionButton size="S" icon="solar:trash-bin-trash-linear" tooltip="Delete rule" onClick={() => setDeleting(rule)} />
                </div>
                <div className={styles.ruleBody}>
                  <span className={styles.label}>{rule.match === 'any' ? 'Any of' : 'All of'}</span>
                  <ul className={styles.conditions}>
                    {rule.conditions.map((c, i) => <li key={i}>{describeCondition(c)}</li>)}
                  </ul>
                  <span className={styles.label}>Attach in draft</span>
                  <span className={styles.templates}>
                    {rule.templateIds.map(id => (
                      <Badge key={id} tone="primary" size="S" icon="solar:clipboard-list-linear" label={templateName.get(id) || 'Missing template'} />
                    ))}
                  </span>
                  <span className={styles.label}>Review task</span>
                  <span className={styles.meta}>{rule.reviewer?.name || 'Program assignee (unassigned if none)'}</span>
                </div>
                <span className={styles.meta}>
                  {last ? `Last matched ${fmtWhen(last.createdAt)}` : 'Hasn’t matched yet'}
                  {rule.updatedBy ? ` · Updated by ${rule.updatedBy}` : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {status === 'ready' && runs.length > 0 && (
        <div className={styles.runs}>
          <span className={styles.blockTitle}>Recent evaluations</span>
          <table className={styles.runsTable}>
            <thead>
              <tr><th>When</th><th>Rule</th><th>Patient</th><th>Program</th><th>Result</th><th>Why</th></tr>
            </thead>
            <tbody>
              {runs.slice(0, 25).map(r => (
                <tr key={r.id}>
                  <td>{fmtWhen(r.createdAt)}</td>
                  <td>{ruleName.get(r.ruleId) || 'Deleted rule'}</td>
                  <td>{r.patientId}</td>
                  <td>{r.programCode || '—'}</td>
                  <td><Badge tone={r.matched ? 'success' : 'grey'} size="S" label={r.matched ? 'Matched' : 'No match'} /></td>
                  <td className={styles.reasons}>{r.reasons.join(' · ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <AutomationRuleDrawer
          rule={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete automation rule?"
          description={`"${deleting.name}" stops running on new enrollments. Plans it already drafted stay as they are.`}
          confirmLabel="Delete Rule"
          variant="destructive"
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            const id = deleting.id;
            setDeleting(null);
            if (await deleteAutomationRule(id)) showToast('Rule deleted');
          }}
        />
      )}
    </div>
  );
}
