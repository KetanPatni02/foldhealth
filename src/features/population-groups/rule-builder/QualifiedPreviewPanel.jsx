import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Icon } from '../../../components/Icon/Icon';
import { Button } from '../../../components/Button/Button';
import styles from './ruleBuilder.module.css';

/**
 * Collapsible right-side panel in the rule builder's edit/create modes.
 * Shows the live qualified-member count and a compact list of matching
 * patients, updating as the rule tree changes — so the builder always
 * gives feedback on how many patients a draft rule matches.
 */
export function QualifiedPreviewPanel({ open, onToggle, members, count, loading, error, onRetry }) {
  if (!open) {
    return (
      <button type="button" className={styles.previewCollapsed} onClick={onToggle} title="Show matching patients">
        <Icon name="solar:users-group-rounded-linear" size={16} color="var(--neutral-400)" />
        <span className={styles.previewCollapsedCount}>
          {loading ? '…' : (error ? '!' : (count ?? '—'))}
        </span>
      </button>
    );
  }

  return (
    <aside className={styles.previewPanel}>
      <div className={styles.previewHeader}>
        <span className={styles.previewTitle}>
          <Icon name="solar:users-group-rounded-linear" size={16} color="var(--neutral-400)" />
          Matching Patients
        </span>
        <ActionButton icon="solar:alt-arrow-right-linear" size="S" tooltip="Collapse" onClick={onToggle} />
      </div>

      <div className={styles.previewCount}>
        {loading ? '…' : (error ? '—' : count)}
      </div>

      {error && (
        <div className={styles.previewError}>
          <Icon name="solar:danger-triangle-linear" size={14} color="var(--status-error)" />
          <span>Failed to load patients</span>
          <Button variant="tertiary" size="S" onClick={onRetry}>Retry</Button>
        </div>
      )}

      <div className={styles.previewList}>
        {!error && !loading && members.length === 0 && (
          <span className={styles.previewEmpty}>No matches yet — add or adjust conditions.</span>
        )}
        {!error && members.slice(0, 50).map(m => (
          <div key={m.id} className={styles.previewRow}>
            <span className={styles.previewName}>{m.name}</span>
            <span className={styles.previewMeta}>{m.age}y • {m.gender || '—'}</span>
          </div>
        ))}
        {!error && members.length > 50 && (
          <span className={styles.previewMore}>+{members.length - 50} more</span>
        )}
      </div>
    </aside>
  );
}
