import { useRef, useState } from 'react';
import { Icon } from '../../../../../../components/Icon/Icon';
import { Textarea } from '../../../../../../components/Textarea/Textarea';
import { MenuPopover } from '../../../../../../components/MenuPopover/MenuPopover';
import { CloseButton } from '../../../../../../components/CloseButton/CloseButton';
import { AddTaskIcon } from '../../../../../../components/Icon/AddTaskIcon';
import { Button } from '../../../../../../components/Button/Button';
import { ActionButton } from '../../../../../../components/ActionButton/ActionButton';
import { Input } from '../../../../../../components/Input/Input';
import { RadioButton } from '../../../../../../components/RadioButton/RadioButton';
import { Switch } from '../../../../../../components/Switch/Switch';
import { Tooltip } from '../../../../../../components/Tooltip/Tooltip';
import { FieldDropdown, TypeDropdown } from './OutreachTabDropdowns';
import { DateTimePicker } from '../../../../../../components/DateTimePicker/DateTimePicker';
import { NotePanel } from './OutreachTabNotePanel';
import { AddContactDialog } from './AddContactDialog';
import { DEFAULT_CALL_TYPES, LOG_FOR_OPTIONS, LAST_CALL_TRANSCRIPT } from './OutreachTab.utils';
import { CallTranscript } from '../../../../../../components/CallTranscript/CallTranscript';
import { parseTranscript, formatTranscriptBlock } from '../../../../../../components/CallTranscript/transcript';
import styles from './OutreachTab.module.css';

export function OutreachTabForm({
  hideLogForRow,
  scopedProgram,
  logFor,
  isHccGaps,
  type, setType,
  datetime, setDatetime,
  showCallDetails,
  callBannerVisible, setCallBannerVisible,
  callDirection, setCallDirection,
  callViaNumber, setCallViaNumber,
  calledToNumber, setCalledToNumber,
  callType, setCallType,
  callDurationMin, setCallDurationMin,
  callDurationSec, setCallDurationSec,
  CALLED_TO_OPTIONS,
  CALL_VIA_OPTIONS = ['Delores Conn (581 824-1591)', 'Practice Line (800 000-0000)'],
  programsLabel,
  PROGRAM_OPTIONS,
  selectedProgs,
  toggleProgram,
  outcome, setOutcome,
  separateNotes, setSeparateNotes,
  useSeparate,
  getPanel,
  patchPanel,
  patchShared,
  toggleSyncText,
  sharedPanel,
  sharedPanelTitle,
  addOutcome,
  removeOutcome,
  setOutcomes,
  handleNoteChange,
  canSave,
  handleLogForChange,
  handleSave,
  handleDiscard,
  onAddTask,
  onSchedule,
  hideFooter = false,
  outcomeItems = null,
  callTypeOptions = DEFAULT_CALL_TYPES,
  // HCC Outreach workflow (Astrana): type stays editable in HCC Gaps mode,
  // the call gets a transcript, and the Actions row is Add Contact /
  // Schedule Follow-up / Snooze.
  hccWorkflow = false,
  hideProgramPicker = false,
  transcript = '', setTranscript,
  snoozeUntil = null, setSnoozeUntil,
  addContact,
}) {
  const transcriptLines = parseTranscript(transcript);
  // The note's transcript block (HCC calls): added by hand next to Select
  // Outcome, or from the call's transcript with Add to Note. Each selected
  // gap's note gets it when notes are separate.
  const patchNotes = (patch) => {
    if (useSeparate) selectedProgs.forEach(p => patchPanel(p, patch));
    else patchShared(patch);
  };
  const addTranscriptToNote = (lines) => patchNotes({ transcript: formatTranscriptBlock(lines) });
  const transcriptProps = (ps, patch) => (hccWorkflow && showCallDetails ? {
    transcript: ps.transcript,
    onAddTranscript: () => patch({ transcript: '', expanded: true }),
    onTranscriptChange: text => patch({ transcript: text }),
    onRemoveTranscript: () => patch({ transcript: undefined }),
  } : {});
  const [contactOpen, setContactOpen] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const snoozeRef = useRef(null);
  // Duration arrows step the whole time, so 00:59 + 1 sec is 01:00 (0 to 99:59).
  const stepDuration = (deltaSec) => {
    const total = Math.min(99 * 60 + 59, Math.max(0, (Number(callDurationMin) || 0) * 60 + (Number(callDurationSec) || 0) + deltaSec));
    setCallDurationMin(String(Math.floor(total / 60)).padStart(2, '0'));
    setCallDurationSec(String(total % 60).padStart(2, '0'));
  };
  // HCC: [00 ⇅ min] : [00 ⇅ sec], the same number field with a stepper and
  // unit pill as the Care Plan due-date offset.
  const durationPart = (value, setValue, max, unit, step) => (
    <Input
      value={value}
      inputMode="numeric"
      aria-label={`Duration ${unit}`}
      wrapperClassName={styles.durationInput}
      onChange={e => setValue(String(Math.min(max, Number(e.target.value.replace(/\D/g, '').slice(-2)) || 0)).padStart(2, '0'))}
      trailingTextSegment
      trailingText={(
        <span className={styles.durationTrailing}>
          <span className={styles.durationSpinner}>
            <button type="button" className={styles.durationSpinnerBtn} aria-label={`Increase ${unit}`} onClick={() => stepDuration(step)}>
              <Icon name="solar:alt-arrow-up-linear" size={10} color="var(--neutral-300)" />
            </button>
            <button type="button" className={styles.durationSpinnerBtn} aria-label={`Decrease ${unit}`} onClick={() => stepDuration(-step)}>
              <Icon name="solar:alt-arrow-down-linear" size={10} color="var(--neutral-300)" />
            </button>
          </span>
          <span className={styles.durationUnitPill}>{unit}</span>
        </span>
      )}
    />
  );
  const durationField = (
    <div className={styles.callFieldWrap}>
      <span className={styles.callFieldLabel}>Duration</span>
      {hccWorkflow ? (
        <div className={styles.durationRow}>
          {durationPart(callDurationMin, setCallDurationMin, 99, 'min', 60)}
          <span className={styles.durationColon} aria-hidden="true">:</span>
          {durationPart(callDurationSec, setCallDurationSec, 59, 'sec', 1)}
        </div>
      ) : (
        <div className={styles.callDurationRow}>
          <Input type="number" className={styles.callDurationInput} value={callDurationMin} min={0} max={99}
            onChange={e => setCallDurationMin(e.target.value.padStart(2, '0').slice(-2))} />
          <span className={styles.callDurationUnit}>Min</span>
          <Input type="number" className={styles.callDurationInput} value={callDurationSec} min={0} max={59}
            onChange={e => setCallDurationSec(e.target.value.padStart(2, '0').slice(-2))} />
          <span className={styles.callDurationUnit}>Sec</span>
        </div>
      )}
    </div>
  );
  const choiceItemsFor = (progs) => (outcomeItems ? outcomeItems(outcome, progs) : null);
  return (
    <div className={styles.formCard}>
      {!hideLogForRow && !scopedProgram && (
        <div className={styles.logForRow}>
          <span className={styles.logForLabel}>Log Outreach For:</span>
          {LOG_FOR_OPTIONS.map(opt => (
            <RadioButton
              key={opt.key}
              checked={logFor === opt.key}
              onChange={() => handleLogForChange(opt.key)}
              label={opt.label}
            />
          ))}
        </div>
      )}

      {/* HCC: who the outreach is to (it also picks
          the Called To list). */}
      {hccWorkflow && (
        <div className={styles.outreachToRow}>
          <span className={styles.logForLabel}>Outreach To</span>
          {callTypeOptions.map(opt => (
            <RadioButton key={opt} checked={callType === opt} onChange={() => setCallType(opt)} label={opt} />
          ))}
        </div>
      )}

      <div className={styles.formHeader}>
        <TypeDropdown value={type} onChange={setType} disabled={isHccGaps && !hccWorkflow} />
        <DateTimePicker value={datetime} onChange={setDatetime} />
      </div>

      <div className={styles.formBody}>
        {showCallDetails && (
          <div className={styles.callDetailsInner}>
            {callBannerVisible && (
              <div className={styles.callBanner}>
                <div className={styles.callBannerIconWrap}>
                  <Icon name="solar:phone-calling-linear" size={14} color="var(--primary-300)" />
                </div>
                <div className={styles.callBannerText}>
                  <span className={styles.callBannerTitle}>
                    Last Call&nbsp;•&nbsp;Outgoing&nbsp;•&nbsp;11/28/2023 10:55&nbsp;•&nbsp;05:29s
                  </span>
                  <span className={styles.callBannerSub}>
                    Via: Delores Conn (581 824‑1591)&nbsp;→&nbsp;To: Dr. Katherine Moss (581 824‑1591)
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.callBannerUseBtn}
                  onClick={() => {
                    setCallDirection('outgoing');
                    setCallViaNumber('Delores Conn (581 824-1591)');
                    setCalledToNumber('Dr. Katherine Moss (581 824-1591)');
                    setCallDurationMin('05');
                    setCallDurationSec('29');
                    if (hccWorkflow) setTranscript?.(LAST_CALL_TRANSCRIPT);
                    // The last call is now in the fields below; the card is done.
                    setCallBannerVisible(false);
                  }}
                >
                  Use This
                </button>
                <CloseButton
                  size={12}
                  onClick={() => setCallBannerVisible(false)}
                  className={styles.callBannerCloseBtn}
                  label="Dismiss call banner"
                />
              </div>
            )}

            <div className={styles.callDetailsHeader}>
              <span className={styles.callDetailsLabel}>Call Details:</span>
            </div>
            {hccWorkflow ? (
              // HCC: Call Direction and Duration share a row.
              <div className={styles.callFieldsGrid}>
                <div className={styles.callFieldWrap}>
                  <span className={styles.callFieldLabel}>Call Direction</span>
                  <div className={`${styles.callDirectionRow} ${styles.callDirectionRowField}`}>
                    <RadioButton checked={callDirection === 'outgoing'} onChange={() => setCallDirection('outgoing')} label="Outgoing" />
                    <RadioButton checked={callDirection === 'incoming'} onChange={() => setCallDirection('incoming')} label="Incoming" />
                  </div>
                </div>
                {durationField}
              </div>
            ) : (
              <div className={styles.callDirectionRow}>
                <RadioButton checked={callDirection === 'outgoing'} onChange={() => setCallDirection('outgoing')} label="Outgoing" />
                <RadioButton checked={callDirection === 'incoming'} onChange={() => setCallDirection('incoming')} label="Incoming" />
              </div>
            )}

            <div className={styles.callFieldsGrid}>
              <div className={styles.callFieldWrap}>
                <span className={styles.callFieldLabel}>Call Via Number</span>
                <FieldDropdown
                  value={callViaNumber}
                  onChange={setCallViaNumber}
                  placeholder="Select number"
                  options={CALL_VIA_OPTIONS}
                />
              </div>
              <div className={styles.callFieldWrap}>
                <span className={styles.callFieldLabel}>Called To Number</span>
                <FieldDropdown value={calledToNumber} onChange={setCalledToNumber} placeholder="Select number" options={CALLED_TO_OPTIONS} />
              </div>
              {!hccWorkflow && (
                <div className={styles.callFieldWrap}>
                  <span className={styles.callFieldLabel}>Call Type</span>
                  <FieldDropdown value={callType} onChange={setCallType} placeholder="Select type" options={callTypeOptions} />
                </div>
              )}
              {!hccWorkflow && durationField}
            </div>

            {/* Only a Fold call's transcript ("Use This" on the Last Call
                banner) shows here; a manual one goes in the note. */}
            {hccWorkflow && transcriptLines.length > 0 && (
              <CallTranscript
                defaultOpen
                lines={transcriptLines}
                isStaff={speaker => String(callViaNumber || '').toLowerCase().startsWith(speaker.toLowerCase())}
                onAddToNote={addTranscriptToNote}
              />
            )}
          </div>
        )}

        {!hideProgramPicker && (
        <div className={styles.section}>
          <div className={styles.sectionLabelRow}>
            <span className={styles.sectionLabel}>{programsLabel}</span>
            <Tooltip label="Select the programs or gaps this outreach is for. Leave them all unselected to log it as a Member Outreach.">
              <Icon name="solar:info-circle-linear" size={15} color="var(--neutral-300)" />
            </Tooltip>
          </div>
          <div className={styles.programs}>
            {PROGRAM_OPTIONS.map(prog => {
              // In HCC mode the option value is the full gap label (kept for the
              // logged note); the badge shows just the HCC number.
              const m = isHccGaps ? String(prog).match(/HCC\s+(\d+)/i) : null;
              const label = m ? m[1] : prog;
              return (
                <button
                  key={prog}
                  className={`${styles.progPill} ${selectedProgs.includes(prog) ? styles.progPillSelected : ''}`}
                  onClick={() => toggleProgram(prog)}
                  type="button"
                  title={isHccGaps ? prog : undefined}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        )}

        <div className={styles.section}>
          <span className={styles.sectionLabel}>Outreach Outcome</span>
          <div className={styles.outcomeRow2}>
            <div className={styles.radios}>
              {['Successful', 'Unsuccessful', 'Note'].map(opt => (
                <RadioButton key={opt} checked={outcome === opt} onChange={() => setOutcome(opt)} label={opt} />
              ))}
            </div>
            {selectedProgs.length >= 2 && (
              <div className={styles.separateNotesInline}>
                <Switch checked={separateNotes} onChange={setSeparateNotes} label="Separate Notes" />
              </div>
            )}
          </div>
        </div>

        {/* No program or gap picked: the note still opens, as a Member Outreach. */}
        {(selectedProgs.length > 0 || !scopedProgram) && (
          <div className={styles.notePanels}>
            {useSeparate ? (
              selectedProgs.map(prog => {
                const ps = getPanel(prog);
                return (
                  <NotePanel
                    key={prog}
                    title={prog}
                    expanded={ps.expanded}
                    outcomes={ps.outcomes}
                    note={ps.note}
                    syncText={ps.syncText}
                    outcomeOpen={ps.outcomeOpen}
                    outcomeType={outcome}
                    choiceItems={choiceItemsFor([prog])}
                    showSyncText
                    onToggleExpand={() => patchPanel(prog, { expanded: !ps.expanded })}
                    onToggleOutcomeOpen={() => {
                      selectedProgs.forEach(p => { if (p !== prog) patchPanel(p, { outcomeOpen: false }); });
                      patchPanel(prog, { outcomeOpen: !ps.outcomeOpen });
                    }}
                    onAddOutcome={val => addOutcome(prog, val)}
                    onRemoveOutcome={val => removeOutcome(prog, val)}
                    onSetOutcomes={list => setOutcomes(prog, list)}
                    onNoteChange={text => handleNoteChange(prog, text)}
                    onToggleSyncText={() => toggleSyncText(prog)}
                    cannedEntry={hccWorkflow}
                    {...transcriptProps(ps, patch => patchPanel(prog, patch))}
                  />
                );
              })
            ) : (
              <NotePanel
                title={sharedPanelTitle}
                expanded={sharedPanel.expanded}
                outcomes={sharedPanel.outcomes}
                note={sharedPanel.note}
                syncText={false}
                outcomeOpen={sharedPanel.outcomeOpen}
                outcomeType={outcome}
                choiceItems={choiceItemsFor(selectedProgs)}
                showSyncText={false}
                onToggleExpand={() => patchShared({ expanded: !sharedPanel.expanded })}
                onToggleOutcomeOpen={() => patchShared({ outcomeOpen: !sharedPanel.outcomeOpen })}
                onAddOutcome={val => addOutcome(null, val)}
                onRemoveOutcome={val => removeOutcome(null, val)}
                onSetOutcomes={list => setOutcomes(null, list)}
                onNoteChange={text => handleNoteChange(null, text)}
                onToggleSyncText={() => {}}
                cannedEntry={hccWorkflow}
                {...transcriptProps(sharedPanel, patchShared)}
              />
            )}
          </div>
        )}

        {hccWorkflow ? (
          <div className={styles.actionsRow}>
            <span className={styles.actionsLabel}>Actions:</span>
            <span className={styles.actionsDivider} />
            <ActionButton size="sm" icon="solar:user-plus-linear" tooltip="Add Contact" onClick={() => setContactOpen(true)} />
            <ActionButton size="sm" icon="solar:calendar-add-linear" tooltip="Schedule Follow-up" onClick={onSchedule} />
            <span ref={snoozeRef}>
              <ActionButton
                size="sm"
                icon="solar:alarm-sleep-linear"
                tooltip="Snooze"
                iconColor={snoozeUntil ? 'var(--primary-300)' : undefined}
                onClick={() => setSnoozeOpen(true)}
              />
            </span>
            {snoozeUntil && (
              <button type="button" className={styles.snoozeChip} onClick={() => setSnoozeUntil?.(null)} title="Remove snooze">
                Snoozed until {snoozeUntil}
                <Icon name="solar:close-circle-linear" size={12} color="currentColor" />
              </button>
            )}
            {snoozeOpen && (
              <MenuPopover
                anchorRef={snoozeRef}
                items={SNOOZE_OPTIONS.map(o => ({ key: String(o.days), label: o.label }))}
                onSelect={(key) => { setSnoozeUntil?.(snoozeDate(Number(key))); setSnoozeOpen(false); }}
                onClose={() => setSnoozeOpen(false)}
                width={180}
                ariaLabel="Snooze outreach"
              />
            )}
            {contactOpen && (
              <AddContactDialog
                open
                onCancel={() => setContactOpen(false)}
                onSubmit={(name, phone) => { addContact?.(name, phone); setContactOpen(false); }}
              />
            )}
          </div>
        ) : (
          <div className={styles.actionsRow}>
            <span className={styles.actionsLabel}>Actions:</span>
            <span className={styles.actionsDivider} />
            <ActionButton size="sm" tooltip="Add Task" onClick={onAddTask}>
              <AddTaskIcon size={16} color="var(--neutral-300)" />
            </ActionButton>
            <ActionButton size="sm" icon="solar:calendar-add-linear" tooltip="Schedule Appointment" onClick={onSchedule} />
            <ActionButton size="sm" icon="solar:alarm-linear" tooltip="Set Reminder" />
          </div>
        )}

        {!hideFooter && (
          <div className={styles.formFooter}>
            <Button disabled={!canSave} onClick={handleSave}>Save</Button>
            <Button variant="ghost" onClick={handleDiscard}>Discard</Button>
          </div>
        )}
      </div>
    </div>
  );
}

const SNOOZE_OPTIONS = [
  { days: 1, label: '1 Day' },
  { days: 3, label: '3 Days' },
  { days: 7, label: '1 Week' },
  { days: 14, label: '2 Weeks' },
];

// MM/DD/YYYY, `days` from today.
function snoozeDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}
