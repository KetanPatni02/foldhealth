import { useMemo, useRef, useState } from 'react';
import { Icon } from '../../../../../../components/Icon/Icon';
import { DownChevronIcon } from '../../../../../../components/Icon/DownChevronIcon';
import { Switch } from '../../../../../../components/Switch/Switch';
import { Textarea } from '../../../../../../components/Textarea/Textarea';
import { CollapsibleContent } from '../../../../../../components/Collapsible/Collapsible';
import { MenuPopover } from '../../../../../../components/MenuPopover/MenuPopover';
import { CheckboxListPopover } from '../../../../../../components/CheckboxListPopover/CheckboxListPopover';
import { Tooltip } from '../../../../../../components/Tooltip/Tooltip';
import { ActionButton } from '../../../../../../components/ActionButton/ActionButton';
import { OUTCOME_CHOICES_BY_STATUS } from './OutreachTab.utils';
import styles from './OutreachTab.module.css';

export function NotePanel({ title, expanded, outcomes, note, syncText, outcomeOpen, showSyncText,
  onToggleExpand, onToggleOutcomeOpen, onAddOutcome, onRemoveOutcome, onSetOutcomes, onNoteChange, onToggleSyncText,
  outcomeType, choiceItems = null, cannedEntry = false,
  // HCC calls: a transcript block above the note. `transcript` is undefined
  // until it's added (by hand or from the call's transcript).
  transcript, onAddTranscript, onTranscriptChange, onRemoveTranscript,
  // HCC Outreach: the same panel without the box around it.
  plain = false,
  // HCC Outreach: one outcome, shown on the Select Outcome badge itself.
  singleOutcome = false }) {
  const hasTranscript = typeof transcript === 'string';
  const outcomeBtnRef = useRef(null);
  const noteRef = useRef(null);
  // Canned messages (deferred): typing "/" at the start of a word opens the
  // picker so the entry point is in place.
  const [cannedOpen, setCannedOpen] = useState(false);
  const handleNoteInput = (e) => {
    const text = e.target.value;
    if (cannedEntry && text.length > note.length && /(^|\s)\/$/.test(text.slice(0, e.target.selectionStart))) {
      setCannedOpen(true);
    }
    onNoteChange(text);
  };
  const [anchorRect, setAnchorRect] = useState(null);
  // The menu lists only the outcomes that fit the chosen Outreach Outcome,
  // so it stays disabled until one of those radios is picked. A host can
  // supply its own items (`choiceItems`, grouped by section headers); those
  // open as a checkbox list so several outcomes go in at once.
  const menuItems = choiceItems
    ? choiceItems
    : singleOutcome
      ? (OUTCOME_CHOICES_BY_STATUS[outcomeType] || []).map(val => ({ key: val, label: val, selected: outcomes[0] === val }))
      : (OUTCOME_CHOICES_BY_STATUS[outcomeType] || []).filter(o => !outcomes.includes(o)).map(val => ({ key: val, label: val }));
  const picked = singleOutcome ? outcomes[0] : null;
  const choice = useMemo(() => {
    const keys = [], label = {}, section = {};
    let current = null;
    for (const it of choiceItems || []) {
      if (it.section) { current = it.section; continue; }
      if (!it.key) continue;
      keys.push(it.key); label[it.key] = it.label; section[it.key] = current;
    }
    return { keys, label, section };
  }, [choiceItems]);
  // Outcomes picked under another Outreach Outcome stay; the list only
  // replaces the ones it shows.
  const setChoiceOutcomes = (next) => onSetOutcomes([...outcomes.filter(o => !choice.keys.includes(o)), ...next]);
  const outcomeDisabled = !outcomeType;

  const badgeClass = outcomeType === 'Successful' ? styles.outcomeBadgeSuccess
    : outcomeType === 'Unsuccessful' ? styles.outcomeBadgeError
    : styles.outcomeBadgeWarning;

  return (
    <div className={plain ? styles.notePanelPlain : styles.notePanel}>
      <div className={styles.notePanelHeader}>
        <button className={styles.notePanelTitle} onClick={onToggleExpand} type="button">
          <span className={styles.notePanelName}>{title}</span>
          <DownChevronIcon
            size={14} color="var(--neutral-400)"
            className={styles.chevron}
            style={expanded ? undefined : { transform: 'rotate(-90deg)' }}
          />
        </button>
        <div className={styles.notePanelActions}>
          <div className={styles.selectOutcomeWrap}>
            <Tooltip label={outcomeDisabled ? 'Select Successful, Unsuccessful or Note first' : null}>
              <button
                ref={outcomeBtnRef}
                className={`${styles.selectOutcomeBtn} ${picked ? badgeClass : ''}`}
                onClick={e => { setAnchorRect(e.currentTarget.getBoundingClientRect()); onToggleOutcomeOpen(); }}
                disabled={outcomeDisabled}
                type="button"
              >
                {picked ? (
                  <>
                    <span>{picked}</span>
                    <DownChevronIcon size={12} color="currentColor" />
                  </>
                ) : (
                  <>
                    <Icon name="solar:add-circle-linear" size={12} color="var(--neutral-300)" />
                    <span>Select Outcome</span>
                    {outcomes.length === 0 && <span className={styles.mandatoryDot} aria-hidden="true" />}
                  </>
                )}
              </button>
            </Tooltip>
            {outcomeOpen && !outcomeDisabled && choiceItems && choice.keys.length > 0 && (
              <CheckboxListPopover
                anchorRect={anchorRect}
                options={choice.keys}
                selected={outcomes}
                onChange={setChoiceOutcomes}
                onClose={onToggleOutcomeOpen}
                labelOf={k => choice.label[k]}
                sectionOf={k => choice.section[k]}
                width={380}
                showClear={false}
                searchable
                searchPlaceholder="Search outcomes or stakeholder…"
              />
            )}
            {outcomeOpen && !outcomeDisabled && !choiceItems && menuItems.some(it => it.key) && (
              <MenuPopover
                anchorRef={outcomeBtnRef}
                items={menuItems}
                onSelect={singleOutcome ? (val) => { onSetOutcomes([val]); onToggleOutcomeOpen(); } : onAddOutcome}
                onClose={onToggleOutcomeOpen}
                width={260}
                ariaLabel="Select outcome"
              />
            )}
          </div>
          {onAddTranscript && (
            <>
              <span className={styles.panelDivider} />
              <ActionButton size="sm" icon="solar:document-add-linear" tooltip={hasTranscript ? 'Transcript added' : 'Add Transcript'}
                tooltipBelow tooltipLeft disabled={hasTranscript} onClick={onAddTranscript} />
            </>
          )}
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

      <CollapsibleContent open={expanded}>
        <div className={styles.notePanelBody}>
          {!singleOutcome && outcomes.length > 0 && (
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
          {/* With a transcript, the note box holds it above the note text. */}
          <div className={hasTranscript ? styles.noteField : styles.noteFieldBare}>
            {hasTranscript && (
              <div className={styles.noteTranscript}>
                <span className={styles.noteTranscriptBar} aria-hidden="true" />
                <Textarea
                  aria-label="Call transcript"
                  className={styles.noteTranscriptText}
                  autoFocus={!transcript}
                  placeholder="Paste the call transcript"
                  value={transcript}
                  onChange={e => onTranscriptChange(e.target.value)}
                />
                <ActionButton size="sm" icon="solar:trash-bin-trash-linear" tooltip="Remove transcript" tooltipBelow tooltipLeft onClick={onRemoveTranscript} />
              </div>
            )}
            <Textarea aria-label="Outreach note"
              ref={noteRef}
              className={hasTranscript ? styles.noteTextareaInner : styles.noteTextarea}
              placeholder={cannedEntry ? 'Write note, or type / for canned messages' : 'Write note'}
              value={note}
              onChange={handleNoteInput}
            />
          </div>
          {cannedOpen && (
            <MenuPopover
              anchorRef={noteRef}
              items={[{ key: 'soon', icon: 'solar:chat-square-like-linear', label: 'Canned messages are coming soon', disabled: true }]}
              onSelect={() => setCannedOpen(false)}
              onClose={() => setCannedOpen(false)}
              width={280}
              ariaLabel="Canned messages"
            />
          )}
        </div>
      </CollapsibleContent>
    </div>
  );
}
