import { useRef } from 'react';
import { Icon } from '../../../../../../components/Icon/Icon';
import { DownChevronIcon } from '../../../../../../components/Icon/DownChevronIcon';
import { Switch } from '../../../../../../components/Switch/Switch';
import { Textarea } from '../../../../../../components/Textarea/Textarea';
import { MenuPopover } from '../../../../../../components/MenuPopover/MenuPopover';
import { Tooltip } from '../../../../../../components/Tooltip/Tooltip';
import { OUTCOME_CHOICES_BY_STATUS } from './OutreachTab.utils';
import styles from './OutreachTab.module.css';

export function NotePanel({ title, expanded, outcomes, note, syncText, outcomeOpen, showSyncText,
  onToggleExpand, onToggleOutcomeOpen, onAddOutcome, onRemoveOutcome, onNoteChange, onToggleSyncText,
  outcomeType }) {
  const outcomeBtnRef = useRef(null);
  // The menu lists only the outcomes that fit the chosen Outreach Outcome,
  // so it stays disabled until one of those radios is picked.
  const choices = (OUTCOME_CHOICES_BY_STATUS[outcomeType] || []).filter(o => !outcomes.includes(o));
  const outcomeDisabled = !outcomeType;

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
            <Tooltip label={outcomeDisabled ? 'Select Successful, Unsuccessful or Note first' : null}>
              <button
                ref={outcomeBtnRef}
                className={styles.selectOutcomeBtn}
                onClick={onToggleOutcomeOpen}
                disabled={outcomeDisabled}
                type="button"
              >
                <Icon name="solar:add-circle-linear" size={12} color="var(--neutral-300)" />
                <span>Select Outcome</span>
                {outcomes.length === 0 && <span className={styles.mandatoryDot} aria-hidden="true" />}
              </button>
            </Tooltip>
            {outcomeOpen && !outcomeDisabled && choices.length > 0 && (
              <MenuPopover
                anchorRef={outcomeBtnRef}
                items={choices.map(val => ({ key: val, label: val }))}
                onSelect={onAddOutcome}
                onClose={onToggleOutcomeOpen}
                width={260}
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
