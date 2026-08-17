import { useRef } from 'react';
import { Icon } from '../../../../../../components/Icon/Icon';
import { DownChevronIcon } from '../../../../../../components/Icon/DownChevronIcon';
import { Switch } from '../../../../../../components/Switch/Switch';
import { Textarea } from '../../../../../../components/Textarea/Textarea';
import { MenuPopover } from '../../../../../../components/MenuPopover/MenuPopover';
import { OUTCOME_CHOICES } from './OutreachTab.utils';
import styles from './OutreachTab.module.css';

export function NotePanel({ title, expanded, outcomes, note, syncText, outcomeOpen, showSyncText,
  onToggleExpand, onToggleOutcomeOpen, onAddOutcome, onRemoveOutcome, onNoteChange, onToggleSyncText,
  outcomeType }) {
  const outcomeBtnRef = useRef(null);

  const badgeClass = outcomeType === 'Successful' ? styles.outcomeBadgeSuccess
    : outcomeType === 'Unsuccessful' ? styles.outcomeBadgeError
    : styles.outcomeBadgeWarning;

  return (
    <div className={styles.notePanel}>
      <div className={styles.notePanelHeader}>
        <button className={styles.notePanelTitle} onClick={onToggleExpand} type="button">
          <span className={styles.notePanelName}>{title}</span>
          <DownChevronIcon
            size={14} color="var(--neutral-400)"
            style={expanded ? undefined : { transform: 'rotate(-90deg)' }}
          />
        </button>
        <div className={styles.notePanelActions}>
          <div className={styles.selectOutcomeWrap}>
            <button ref={outcomeBtnRef} className={styles.selectOutcomeBtn} onClick={onToggleOutcomeOpen} type="button">
              <Icon name="solar:add-circle-linear" size={12} color="var(--neutral-300)" />
              <span>Select Outcome</span>
              {outcomes.length === 0 && <span className={styles.mandatoryDot} aria-hidden="true" />}
            </button>
            {outcomeOpen && (
              <MenuPopover
                anchorRef={outcomeBtnRef}
                items={OUTCOME_CHOICES.map(val => ({ key: val, label: val }))}
                onSelect={onAddOutcome}
                onClose={onToggleOutcomeOpen}
                width={150}
                ariaLabel="Select outcome"
              />
            )}
          </div>
          {showSyncText && (
            <>
              <span className={styles.panelDivider} />
              <Switch
                checked={syncText}
                onChange={onToggleSyncText}
                label="Sync Text"
                ariaLabel="Sync text across panels"
              />
            </>
          )}
        </div>
      </div>

      {expanded && (
        <>
          {outcomes.length > 0 && (
            <div className={styles.outcomeRow}>
              <span className={styles.outcomeRowLabel}>Outcome:</span>
              {outcomes.map(o => (
                <button key={o} className={`${styles.outcomeBadge} ${badgeClass}`}
                  onClick={() => onRemoveOutcome(o)} type="button">
                  {o}
                  <Icon name="solar:close-circle-linear" size={10} color="currentColor" />
                </button>
              ))}
            </div>
          )}
          <Textarea aria-label="Outreach note"
            className={styles.noteTextarea}
            placeholder="Write note"
            value={note}
            onChange={e => onNoteChange(e.target.value)}
          />
        </>
      )}
    </div>
  );
}
