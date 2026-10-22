import { useRef, useState } from 'react';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Badge } from '../../../components/Badge/Badge';
import { Button } from '../../../components/Button/Button';
import { Icon } from '../../../components/Icon/Icon';
import { MenuPopover } from '../../../components/MenuPopover/MenuPopover';
import { Tooltip } from '../../../components/Tooltip/Tooltip';
import { STATUSES, statusDef } from '../lib/catalog';
import styles from './AutomationBuilder.module.css';

const STATUS_TONE = { draft: 'grey', active: 'success', inactive: 'warning' };

/**
 * Title (rename in place), unsaved-changes dot, status menu, and the actions:
 * Test, History, Duplicate | Close | Save.
 */
export function BuilderHeader({
  name, onRename, status, onStatus, dirty, lastAutosave, isNew, canTest, testing,
  onTest, onHistory, onDuplicate, onClose, onSave,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [menu, setMenu] = useState(false);
  const statusRef = useRef(null);

  const commit = () => {
    const v = draft.trim();
    if (v && v !== name) onRename(v);
    else setDraft(name);
    setEditing(false);
  };

  return (
    <div className={styles.header}>
      <div className={styles.titleRow}>
        {dirty && (
          <Tooltip
            maxWidth={300}
            label={isNew
              ? 'This automation isn’t saved yet. Save it to keep your changes.'
              : 'Your automation has unsaved changes. They are saved as a working copy every 10 minutes; Save publishes them.'}
          >
            <span className={styles.unsavedDot} aria-label="Unsaved changes" />
          </Tooltip>
        )}
        {editing ? (
          <input
            className={styles.titleInput}
            value={draft}
            autoFocus
            maxLength={120}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(name); setEditing(false); } }}
            aria-label="Automation name"
          />
        ) : (
          <button type="button" className={styles.title} onClick={() => { setDraft(name); setEditing(true); }}>
            {name}
            <Icon name="solar:pen-linear" size={14} />
          </button>
        )}
        <button
          ref={statusRef}
          type="button"
          className={styles.statusButton}
          onClick={() => setMenu(m => !m)}
          aria-haspopup="menu"
          aria-expanded={menu}
        >
          <Badge tone={STATUS_TONE[status]} size="S" label={`${statusDef(status).label} automation`} chevron />
        </button>
        {menu && (
          <MenuPopover
            anchorRef={statusRef}
            align="left"
            width={180}
            items={STATUSES.map(s => ({ key: s.value, label: s.label, selected: s.value === status }))}
            onSelect={(key) => { setMenu(false); if (key !== status) onStatus(key); }}
            onClose={() => setMenu(false)}
            ariaLabel="Automation status"
          />
        )}
        {lastAutosave && !dirty && (
          <span className={styles.autosaved}>Working copy saved {lastAutosave.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
        )}
      </div>
      <div className={styles.headerActions}>
        <Tooltip label={canTest ? 'Simulates the workflow without touching real data. Delay steps are skipped.' : 'Select a trigger and add a step to test.'} maxWidth={260}>
          <span>
            <Button variant="tertiary" size="M" leadingIcon="solar:play-linear" disabled={!canTest || testing} onClick={onTest}>Test</Button>
          </span>
        </Tooltip>
        {!isNew && <ActionButton icon="solar:history-linear" tooltip="Edit log & history" onClick={onHistory} />}
        {!isNew && <ActionButton icon="solar:copy-linear" tooltip="Duplicate" onClick={onDuplicate} />}
        <span className={styles.headerDivider} />
        <ActionButton icon="solar:close-circle-linear" tooltip="Close" onClick={onClose} />
        <span className={styles.headerDivider} />
        <Button size="M" leadingIcon="solar:check-read-linear" onClick={onSave}>Save</Button>
      </div>
    </div>
  );
}
