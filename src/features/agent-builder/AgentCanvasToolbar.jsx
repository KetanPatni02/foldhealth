import { Toggle } from '../../components/Toggle/Toggle';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { CloseButton } from '../../components/CloseButton/CloseButton';
import { Button } from '../../components/Button/Button';
import styles from './AgentCanvas.module.css';

const BUILDER_TABS = ['Workflow', 'Configure', 'Analytics'];

export function AgentCanvasToolbar({
  agentName,
  autoSaveStatus,
  activeTab,
  onTabChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  saving,
  onSave,
  onClose,
}) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        <Button variant="ghost" size="S" iconOnly leadingIcon="solar:arrow-left-linear" onClick={onClose} title="Back to Agents" />
        <span className={styles.agentName}>{agentName}</span>
        {autoSaveStatus !== 'idle' && (
          <span className={styles.autoSaveStatus}>
            {autoSaveStatus === 'saving' ? 'Saving…' : 'Auto-saved'}
          </span>
        )}
      </div>

      <div className={styles.toolbarCenter}>
        <Toggle items={BUILDER_TABS} active={activeTab} onChange={onTabChange} />
      </div>

      <div className={styles.toolbarRight}>
        <ActionButton
          icon="solar:undo-left-linear"
          size="L"
          tooltip="Undo (⌘Z)"
          state={canUndo ? 'active' : 'disabled'}
          onClick={onUndo}
        />
        <ActionButton
          icon="solar:undo-right-linear"
          size="L"
          tooltip="Redo (⌘⇧Z)"
          state={canRedo ? 'active' : 'disabled'}
          onClick={onRedo}
        />
        <span className={styles.toolbarDivider} />
        <Button variant="secondary" size="L" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <span className={styles.toolbarDivider} />
        <Button variant="ghost" size="L" leadingIcon="solar:play-linear" disabled>
          Run Test
        </Button>
        <Button variant="ghost" size="L" disabled>
          Deploy Agent Now
        </Button>
        <CloseButton onClick={onClose} />
      </div>
    </div>
  );
}

export { BUILDER_TABS };
