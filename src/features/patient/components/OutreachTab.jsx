import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../../components/Icon/Icon';
import { DownChevronIcon } from '../../../components/Icon/DownChevronIcon';
import { MenuPopover } from '../../../components/MenuPopover/MenuPopover';
import { CloseButton } from '../../../components/CloseButton/CloseButton';
import { SmsIcon } from '../../../components/Icon/SmsIcon';
import { AddTaskIcon } from '../../../components/Icon/AddTaskIcon';
import { OutreachIcon } from '../../../components/Icon/OutreachIcon';
import { Button } from '../../../components/Button/Button';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Input } from '../../../components/Input/Input';
import { Switch } from '../../../components/Switch/Switch';
import { RadioButton } from '../../../components/RadioButton/RadioButton';
import { useAppStore } from '../../../store/useAppStore';
import { SearchBar } from '../../../components/SearchBar/SearchBar';
import { Tooltip } from '../../../components/Tooltip/Tooltip';
import { toast } from '../../../components/Toast/Toast';
import { ScheduleDrawer } from '../../../components/ScheduleDrawer/ScheduleDrawer';
import { AddTaskDrawer } from './AddTaskDrawer';
import { INITIAL_LOG_GROUPS } from '../data/outreachLogMock';
import styles from './OutreachTab.module.css';

const PROGRAMS = ['SNP', 'AWV', 'CCM', 'TCM', 'ECM', 'CBP', 'MRP'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const OUTCOME_CHOICES = ['Completed', 'Engaged', 'Left Voicemail', 'No Answer', 'Declined'];

const TYPE_OPTIONS = [
  { label: 'General',   icon: 'solar:document-text-linear',  flip: false },
  { label: 'Call',      icon: 'solar:phone-calling-linear',   flip: false },
  { label: 'In Person', icon: 'solar:user-linear',            flip: false },
  { label: 'Virtual',   icon: 'solar:videocamera-linear',     flip: false },
  { label: 'Chat',      icon: 'solar:chat-round-linear',      flip: true  },
  { label: 'SMS',       isSms: true                                        },
  { label: 'Email',     icon: 'solar:letter-linear',          flip: false },
  { label: 'Letter',    icon: 'solar:letter-opened-linear',   flip: false },
];

const LOG_TYPE_ICON = {
  'General':   { icon: 'solar:document-text-linear',  flip: false },
  'Call':      { icon: 'solar:phone-calling-linear',   flip: false },
  'In Person': { icon: 'solar:user-linear',            flip: false },
  'Virtual':   { icon: 'solar:videocamera-linear',     flip: false },
  'Chat':      { icon: 'solar:chat-round-linear',      flip: true  },
  'SMS':       { icon: null,                           flip: false },
  'Email':     { icon: 'solar:letter-linear',          flip: false },
  'Letter':    { icon: 'solar:letter-opened-linear',   flip: false },
};

const TYPE_LOG_LABEL = {
  'General':   'General',
  'Call':      'Outgoing Call',
  'In Person': 'In Person',
  'Virtual':   'Virtual Call',
  'Chat':      'Chat',
  'SMS':       'Outgoing SMS',
  'Email':     'Email',
  'Letter':    'Letter',
};

const OUTCOME_COLOR = {
  'Successful':   'var(--status-success)',
  'Unsuccessful': 'var(--status-error)',
  'Note':         'var(--status-warning)',
};

// Bucket a log into an Outreach Activity filter tab by its outcome color:
// green → Successful, red → Unsuccessful, anything else → Note.
const logActivityCategory = (log) => {
  const c = log.outcomeColor || '';
  if (c.includes('success')) return 'Successful';
  if (c.includes('error')) return 'Unsuccessful';
  return 'Note';
};

// Does a log match the selected outreach scope? Scope is 'All', a program
// code (matches log.programs), 'HCC Gaps' (external/HCC-sourced outreach), or
// 'Care Gaps' (care-program/gap outreach).
const matchesOutreachScope = (log, scope) => {
  if (!scope || scope === 'All') return true;
  if (scope === 'HCC Gaps') return !!log.outreachSource || log.logFor === 'hcc-gaps';
  if (scope === 'Care Gaps') return (log.programs || []).length > 0 || log.logFor === 'care-program';
  return (log.programs || []).includes(scope);
};

function formatNow() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd}/${yyyy}, ${hh}:${min}`;
}


function parseDatetime(dt) {
  if (!dt) {
    const now = new Date();
    return {
      date: now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      monthLabel: now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      monthKey: `${now.getMonth()}-${now.getFullYear()}`,
    };
  }
  const [datePart, timePart] = dt.split(', ');
  const [mm, dd, yyyy] = datePart.split('/');
  const d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
  return {
    date: `${mm}/${dd}`,
    time: (timePart || '').trim(),
    monthLabel: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    monthKey: `${d.getMonth()}-${d.getFullYear()}`,
  };
}

/* ── FieldDropdown — Input-styled select with portal menu ── */
function FieldDropdown({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const rect = triggerRef.current?.getBoundingClientRect();

  return (
    <div ref={triggerRef} className={styles.fieldDropdownWrap}>
      <button
        type="button"
        className={`${styles.fieldDropdownTrigger} ${!value ? styles.fieldDropdownPlaceholder : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        <span className={styles.fieldDropdownValue}>{value || placeholder}</span>
        <DownChevronIcon size={12} color="var(--neutral-300)" />
      </button>

      {open && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)}>
          <div
            className={styles.fieldDropdownMenu}
            style={{ top: rect ? rect.bottom + 4 : 0, left: rect ? rect.left : 0, minWidth: rect ? rect.width : 160 }}
            onClick={e => e.stopPropagation()}
          >
            {options.map(opt => (
              <button
                key={opt}
                type="button"
                className={`${styles.fieldDropdownItem} ${value === opt ? styles.fieldDropdownItemSelected : ''}`}
                onClick={() => { onChange(opt); setOpen(false); }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── TypeDropdown ── */
function TypeDropdown({ value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const selected = TYPE_OPTIONS.find(o => o.label === value) || TYPE_OPTIONS[0];
  const rect = triggerRef.current?.getBoundingClientRect();

  return (
    <div ref={triggerRef} className={styles.typeDropdownWrap}>
      <button
        type="button"
        className={`${styles.typeDropdownTrigger} ${disabled ? styles.typeDropdownTriggerDisabled : ''}`}
        onClick={() => !disabled && setOpen(v => !v)}
        disabled={disabled}
      >
        {selected.isSms
          ? <SmsIcon size={14} color="var(--neutral-400)" />
          : <Icon name={selected.icon} size={14} color="var(--neutral-400)"
              style={selected.flip ? { transform: 'scaleX(-1)' } : undefined} />
        }
        <span className={styles.typeDropdownValue}>{selected.label}</span>
        <DownChevronIcon size={12} color="var(--neutral-300)" />
      </button>

      {open && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)}>
          <div
            className={styles.typeDropdownMenu}
            style={{ top: rect ? rect.bottom + 4 : 0, left: rect ? rect.left : 0 }}
            onClick={e => e.stopPropagation()}
          >
            {TYPE_OPTIONS.map(opt => {
              const isSelected = value === opt.label;
              const iconColor = isSelected ? 'var(--primary-300)' : 'var(--neutral-400)';
              return (
                <button
                  key={opt.label}
                  type="button"
                  className={`${styles.typeDropdownItem} ${isSelected ? styles.typeDropdownItemSelected : ''}`}
                  onClick={() => { onChange(opt.label); setOpen(false); }}
                >
                  {opt.isSms
                    ? <SmsIcon size={14} color={iconColor} />
                    : <Icon name={opt.icon} size={14} color={iconColor}
                        style={opt.flip ? { transform: 'scaleX(-1)' } : undefined} />
                  }
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── OutreachDateTimePicker ── */
function parsePickerValue(v) {
  if (!v) return { date: null, hour: 0, minute: 0 };
  const parts = v.split(', ');
  const datePart = parts[0];
  const timePart = parts[1] || '';
  // 24h format
  const match24 = timePart.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) return { date: datePart, hour: parseInt(match24[1]), minute: parseInt(match24[2]) };
  // legacy 12h format (backwards compat)
  const match12 = timePart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1]);
    const m = parseInt(match12[2]);
    const ap = match12[3].toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return { date: datePart, hour: h, minute: m };
  }
  return { date: datePart, hour: 0, minute: 0 };
}

export function OutreachDateTimePicker({ value, onChange, className }) {
  const parsed = parsePickerValue(value);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (parsed.date) {
      const [mm, dd, yyyy] = parsed.date.split('/');
      return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
    }
    return new Date();
  });
  const [selectedDate, setSelectedDate] = useState(parsed.date);
  const [pickerHour, setPickerHour] = useState(parsed.hour);
  const [pickerMinute, setPickerMinute] = useState(parsed.minute);
  const triggerRef = useRef(null);
  const hourColRef = useRef(null);
  const minColRef = useRef(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const MINUTES = Array.from({ length: 60 }, (_, i) => i);

  const scrollToTime = (h, m) => {
    setTimeout(() => {
      hourColRef.current?.querySelector(`[data-h="${h}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      minColRef.current?.querySelector(`[data-m="${m}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 0);
  };

  // Reset — revert the picker back to the currently-committed value.
  const handleReset = () => {
    const p = parsePickerValue(value);
    setSelectedDate(p.date);
    setPickerHour(p.hour);
    setPickerMinute(p.minute);
    if (p.date) {
      const [mm, dd, yyyy] = p.date.split('/');
      setViewDate(new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
    }
    scrollToTime(p.hour, p.minute);
  };

  const handleOk = () => {
    if (!selectedDate) return;
    const hStr = String(pickerHour).padStart(2, '0');
    const mStr = String(pickerMinute).padStart(2, '0');
    onChange(`${selectedDate}, ${hStr}:${mStr}`);
    setOpen(false);
  };

  const rect = triggerRef.current?.getBoundingClientRect();

  return (
    <div ref={triggerRef} className={`${styles.dateInputWrap}${className ? ` ${className}` : ''}`}>
      <button
        className={styles.datePickerTrigger}
        onClick={() => setOpen(v => !v)}
        type="button"
      >
        <span className={value ? styles.datePickerText : styles.datePickerPlaceholder}>
          {value || 'MM/DD/YYYY, HH:MM'}
        </span>
        <Icon name="solar:calendar-linear" size={14} color="var(--neutral-300)" />
      </button>

      {open && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)}>
          <div
            className={styles.dateTimeDropdown}
            style={{ top: rect ? rect.bottom + 4 : 0, right: rect ? window.innerWidth - rect.right : 0 }}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.dtPickerBody}>
              {/* Calendar */}
              <div className={styles.calendarSection}>
                <div className={styles.calendarHeader}>
                  <ActionButton icon="solar:alt-arrow-left-linear" size="S"
                    onClick={() => setViewDate(new Date(year, month - 1, 1))} />
                  <span className={styles.calendarTitle}>{MONTH_NAMES[month]} {year}</span>
                  <ActionButton icon="solar:alt-arrow-right-linear" size="S"
                    onClick={() => setViewDate(new Date(year, month + 1, 1))} />
                </div>
                <div className={styles.calendarGrid}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} className={styles.calendarDayLabel}>{d}</div>
                  ))}
                  {days.map((d, i) => d ? (
                    <button
                      key={i}
                      type="button"
                      className={`${styles.calendarDay} ${
                        selectedDate === `${String(month + 1).padStart(2, '0')}/${String(d).padStart(2, '0')}/${year}`
                          ? styles.calendarDaySelected : ''
                      }`}
                      onClick={() => setSelectedDate(`${String(month + 1).padStart(2, '0')}/${String(d).padStart(2, '0')}/${year}`)}
                    >{d}</button>
                  ) : <div key={i} />)}
                </div>
              </div>

              {/* Time columns */}
              <div className={styles.timeColumnsSection}>
                <div className={styles.timeColsRow}>
                  <div className={styles.timeColWrap}>
                    <span className={styles.timeColLabel}>Hr</span>
                    <div className={styles.timeCol} ref={hourColRef}>
                      {HOURS.map(h => (
                        <button key={h} type="button" data-h={h}
                          className={`${styles.timeColItem} ${pickerHour === h ? styles.timeColItemSelected : ''}`}
                          onClick={() => setPickerHour(h)}>
                          {String(h).padStart(2, '0')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.timeColWrap}>
                    <span className={styles.timeColLabel}>Min</span>
                    <div className={styles.timeCol} ref={minColRef}>
                      {MINUTES.map(m => (
                        <button key={m} type="button" data-m={m}
                          className={`${styles.timeColItem} ${pickerMinute === m ? styles.timeColItemSelected : ''}`}
                          onClick={() => setPickerMinute(m)}>
                          {String(m).padStart(2, '0')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Footer spans the full width, under both the calendar and the
                Hr/Min columns. */}
            <div className={styles.pickerFooter}>
              <button type="button" className={styles.nowBtn} onClick={handleReset}>Reset</button>
              <button type="button"
                className={`${styles.okBtn} ${!selectedDate ? styles.okBtnDisabled : ''}`}
                onClick={handleOk} disabled={!selectedDate}>Save</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── NotePanel ── */
function NotePanel({ title, expanded, outcomes, note, syncText, outcomeOpen, showSyncText,
  onToggleExpand, onToggleOutcomeOpen, onAddOutcome, onRemoveOutcome, onNoteChange, onToggleSyncText,
  outcomeType }) {

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
            <button className={styles.selectOutcomeBtn} onClick={onToggleOutcomeOpen} type="button">
              <Icon name="solar:add-circle-linear" size={12} color="var(--neutral-300)" />
              <span>Select Outcome</span>
              {/* Mandatory field — red dot until an outcome is chosen. */}
              {outcomes.length === 0 && <span className={styles.mandatoryDot} aria-hidden="true" />}
            </button>
            {outcomeOpen && (
              <div className={styles.outcomeDropdown}>
                {OUTCOME_CHOICES.map(val => (
                  <button key={val} className={styles.outcomeDropdownItem}
                    onClick={() => onAddOutcome(val)} type="button">
                    {val}
                  </button>
                ))}
              </div>
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
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              ))}
            </div>
          )}
          <textarea
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

/* ── LogEntry ── */
/**
 * LogRowMenu — `...` overflow menu on each row. Opens a small popover
 * with Edit / Delete. Replaces the hover edit-pen + trash icons with
 * the menu surface from Figma 11:258515.
 */
function LogRowMenu({ log, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  if (!onEdit && !onDelete) return null;
  const items = [
    ...(onEdit ? [{ key: 'edit', icon: 'solar:pen-2-linear', label: 'Edit' }] : []),
    ...(onDelete ? [{ key: 'delete', icon: 'solar:trash-bin-trash-linear', label: 'Delete', danger: true }] : []),
  ];
  return (
    <span className={styles.logRowMenuWrap}>
      <button
        type="button"
        ref={btnRef}
        className={styles.logRowMenuTrigger}
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        aria-label="More actions"
        title="More actions"
      >
        <Icon name="solar:menu-dots-linear" size={14} color="var(--neutral-300)" />
      </button>
      {open && (
        <MenuPopover
          anchorRef={btnRef}
          items={items}
          onSelect={(key) => { if (key === 'edit') onEdit(log); else onDelete(log); }}
          onClose={() => setOpen(false)}
          width={140}
          ariaLabel="Log actions"
        />
      )}
    </span>
  );
}

function LogEntry({ log, isLast, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const { icon, flip } = LOG_TYPE_ICON[log.type] || {};
  const hasNote = Boolean(log.note && log.note.trim());
  // Rows are expandable when they have a note OR carry call details
  // (the Figma always lets users expand a Call row to surface
  // via/To/Duration + recording + transcript).
  const expandable = hasNote || !!log.callDetails;

  return (
    <div className={styles.logEntry}>
      {/* Timeline column */}
      <div className={styles.logTimeline}>
        <div className={styles.logTimelineTop}>
          <div className={styles.logTimelineLine} />
        </div>
        <div className={styles.logIconAvatar}>
          {log.type === 'SMS'
            ? <SmsIcon size={14} color="var(--neutral-300)" />
            : icon
              ? <Icon name={icon} size={14} color="var(--neutral-300)"
                  style={flip ? { transform: 'scaleX(-1)' } : undefined} />
              : <Icon name="solar:document-text-linear" size={14} color="var(--neutral-300)" />
          }
        </div>
        {!isLast && (
          <div className={styles.logTimelineBottom}>
            <div className={styles.logTimelineLine} />
          </div>
        )}
      </div>

      {/* Card */}
      <div
        className={`${styles.logCard} ${expanded ? styles.logCardExpanded : ''}`}
        onClick={e => { e.stopPropagation(); if (expandable) setExpanded(v => !v); }}
        role="button"
        tabIndex={0}
        onKeyDown={expandable ? e => e.key === 'Enter' && setExpanded(v => !v) : undefined}
      >
        <div className={styles.logBody}>
          <div className={styles.logMeta}>
            <span>{log.date}</span>
            <span className={styles.logMetaDot}>•</span>
            <span>{log.time}</span>
            <span className={styles.logMetaDot}>•</span>
            <span>{log.author}</span>
            {log.outreachSource && (
              <>
                <span className={styles.logMetaDot}>•</span>
                <span className={styles.logMetaSource} title={`Source: ${log.outreachSource}`}>
                  via {log.outreachSource}
                </span>
              </>
            )}
          </div>
          <div className={styles.logTitleRow}>
            <span className={styles.logTitle}>{log.title}</span>
            {(log.programs || []).length > 0
              ? log.programs.map(p => (
                  <span key={p} className={styles.logProgBadge}>{p}</span>
                ))
              : <span className={styles.logContactBadge} title="Outreach recorded at contact level — not tied to a care program">Contact-level</span>
            }
            <LogRowMenu log={log} onEdit={onEdit} onDelete={onDelete} />
          </div>
          <div className={styles.logOutcomeRow}>
            <span className={styles.logOutcome} style={{ color: log.outcomeColor }}>
              {log.outcome}
            </span>
            {expandable && (
              <button
                type="button"
                className={styles.logViewNoteBtn}
                onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
              >
                <span className={styles.logViewNoteDot}>·</span>
                View Note
                <DownChevronIcon
                  size={11}
                  color="var(--neutral-400)"
                  style={expanded ? { transform: 'rotate(180deg)' } : undefined}
                />
              </button>
            )}
            {log.type === 'Call' && log.callDetailsMissing && (
              <span className={styles.logCallNoDetails} title="External call — call details not available">
                <Icon name="solar:info-circle-linear" size={10} color="var(--neutral-300)" />
                Call details unavailable
              </span>
            )}
          </div>

          {expanded && (hasNote || log.callDetails) && (
            <div className={styles.logExpandedCard}>
              {log.type === 'Call' && log.callDetails ? (
                /* Call expanded view — Figma 11:258515. Bordered
                   card: Call Details meta · "Note :" + transcript
                   card · plain note · Call Recording + Transcript
                   buttons. */
                <>
                  <div className={styles.logExpandedLabel}>Call Details:</div>
                  <div className={styles.logExpandedCallMeta}>
                    via: <strong>{log.callDetails.via}</strong>
                    <span className={styles.logExpandedMetaDot}>·</span>
                    To: <strong>{log.callDetails.to}</strong>
                    <span className={styles.logExpandedMetaDot}>·</span>
                    Duration: <strong>{log.callDetails.durationMin}mins</strong>
                  </div>

                  {(hasNote || (Array.isArray(log.callDetails.transcript) && log.callDetails.transcript.length > 0)) && (
                    <div className={styles.logExpandedNoteLabel}>Note :</div>
                  )}

                  {Array.isArray(log.callDetails.transcript) && log.callDetails.transcript.length > 0 && (
                    <div className={styles.logTranscriptCard}>
                      <div className={styles.logTranscriptCaption}>Call Transcript</div>
                      {log.callDetails.transcript.slice(0, 2).map((t, i) => (
                        <div key={i} className={styles.logTranscriptLine}>
                          <div>{t.speaker} - {t.t}</div>
                          <div>{t.text}</div>
                        </div>
                      ))}
                      {log.callDetails.transcript.length > 2 && (
                        <button type="button" className={styles.logTranscriptMore}>
                          Show More
                          <DownChevronIcon size={11} color="var(--primary-300)" />
                        </button>
                      )}
                    </div>
                  )}

                  {hasNote && (
                    <p className={styles.logExpandedNote}>{log.note}</p>
                  )}

                  <div className={styles.logExpandedActions}>
                    {log.callDetails.recordingUrl && (
                      <button type="button" className={styles.logExpandedAction}>
                        <Icon name="solar:play-circle-linear" size={13} color="var(--neutral-400)" />
                        Call Recording
                      </button>
                    )}
                    {log.callDetails.transcriptUrl && (
                      <button type="button" className={styles.logExpandedAction}>
                        <Icon name="solar:document-text-linear" size={13} color="var(--neutral-400)" />
                        Transcript
                      </button>
                    )}
                  </div>
                </>
              ) : (
                /* Non-Call expanded view — Figma 3:52173. Bordered card with
                   just the Duration meta and a plain "Note :" body. */
                <>
                  <div className={styles.logExpandedCallMeta}>
                    Duration: <strong>5mins</strong>
                  </div>
                  {hasNote && (
                    <>
                      <div className={styles.logExpandedNoteLabel}>Note :</div>
                      <p className={styles.logExpandedNote}>{log.note}</p>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── LogGroup ── */
function LogGroup({ label, logs, onEdit, onDelete }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={styles.logGroup}>
      <button
        type="button"
        className={styles.logGroupHeader}
        onClick={() => setCollapsed(v => !v)}
      >
        <span className={styles.logGroupTitle}>{label}</span>
        <DownChevronIcon
          size={13}
          color="var(--neutral-400)"
          style={collapsed ? { transform: 'rotate(-90deg)' } : undefined}
        />
      </button>
      {!collapsed && (
        <div className={styles.logGroupEntries}>
          {logs.map((log, i) => (
            <LogEntry
              key={log.id}
              log={log}
              isLast={i === logs.length - 1}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const ACTIVITY_FILTERS = [
  { key: 'All', dot: null },
  { key: 'Successful', dot: 'var(--status-success)' },
  { key: 'Unsuccessful', dot: 'var(--status-error)' },
  { key: 'Note', dot: '#145ECC' },
];


const LOG_FOR_OPTIONS = [
  { key: 'care-program', label: 'Care Program/Gaps' },
  { key: 'hcc-gaps',     label: 'HCC Gaps' },
];

/* ── OutreachTab ──
   Props (all optional; defaults preserve QuickView behavior):
   - programs           string[]  — pill choices in "Select Programs/Gaps"
   - programsLabel      string    — section title above the pills
   - recipientOptions   string[]  — choices for "Called To Number" dropdown
   - defaultCalledTo    string    — pre-selected Called To Number
   - defaultLogFor      string    — 'care-program' | 'hcc-gaps'
   - hideLogForRow      boolean   — hide the "Log Outreach For" radio row
*/
export function OutreachTab({
  programs,
  programsLabel = 'Select Programs/Gaps',
  recipientOptions,
  defaultCalledTo,
  defaultLogFor = 'hcc-gaps',
  hideLogForRow = false,
  defaultPrograms = [],
  defaultFormOpen = false,
  scopedProgram = null,
} = {}) {
  // Preselected programs are always available as pills even if not in the
  // standard list (e.g. the open care program in the Program Detail view).
  const PROGRAM_OPTIONS = [...new Set([...(programs && programs.length ? programs : PROGRAMS), ...defaultPrograms])];
  const CALLED_TO_OPTIONS = recipientOptions && recipientOptions.length
    ? recipientOptions
    : ['Dr. Katherine Moss (581 824-1591)', 'Carlos Hernandez (555 000-0000)'];
  const INITIAL_CALLED_TO = defaultCalledTo || CALLED_TO_OPTIONS[0];

  const currentUserProfile = useAppStore(s => s.currentUserProfile);
  const patientId = useAppStore(s => s.selectedPatientId);
  const addProgramTask = useAppStore(s => s.addProgramTask);
  const addProgramAppointment = useAppStore(s => s.addProgramAppointment);
  // Quick-action drawers (program scope only).
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(defaultFormOpen);
  // Id of the row currently being edited (null = creating a new one).
  // When set, handleSave updates that row in place instead of pushing.
  const [editingId, setEditingId] = useState(null);
  const [logFor, setLogFor] = useState(defaultLogFor);
  const isHccGaps = logFor === 'hcc-gaps';
  const [activityFilter, setActivityFilter] = useState('All');
  const [activitySearchOpen, setActivitySearchOpen] = useState(false);
  const [activitySearchText, setActivitySearchText] = useState('');
  const [outreachScope, setOutreachScope] = useState('All'); // 'All' | code | 'Care Gaps' | 'HCC Gaps'
  const [filterMenu, setFilterMenu] = useState(null);         // { rect } | null
  const [logGroups, setLogGroups] = useState(INITIAL_LOG_GROUPS);
  const [type, setType] = useState(defaultLogFor === 'hcc-gaps' ? 'Call' : 'General');
  const [datetime, setDatetime] = useState(defaultFormOpen ? formatNow() : '');
  const [selectedProgs, setSelectedProgs] = useState(defaultPrograms);
  const [outcome, setOutcome] = useState(null);
  const [separateNotes, setSeparateNotes] = useState(false);
  const [panels, setPanels] = useState({});
  const [sharedPanel, setSharedPanel] = useState({ expanded: true, outcomes: [], note: '', outcomeOpen: false });

  // Call Details state
  const [callBannerVisible, setCallBannerVisible] = useState(true);
  const [callDirection, setCallDirection] = useState('outgoing');
  const [callViaNumber, setCallViaNumber] = useState('Delores Conn (581 824-1591)');
  const [calledToNumber, setCalledToNumber] = useState(INITIAL_CALLED_TO);
  const [callType, setCallType] = useState('Provider');
  const [callDurationMin, setCallDurationMin] = useState('00');
  const [callDurationSec, setCallDurationSec] = useState('00');

  const showCallDetails = type === 'Call';
  const getPanel = (prog) => panels[prog] || { expanded: true, outcomes: [], note: '', syncText: false, outcomeOpen: false };
  const patchPanel = (prog, patch) => setPanels(p => ({ ...p, [prog]: { ...getPanel(prog), ...patch } }));
  const patchShared = (patch) => setSharedPanel(p => ({ ...p, ...patch }));

  const toggleProgram = (prog) => {
    setSelectedProgs(prev => {
      const alreadySelected = prev.includes(prog);
      const next = alreadySelected ? prev.filter(p => p !== prog) : [...prev, prog];
      if (next.length < 2) setSeparateNotes(false);
      if (!alreadySelected) {
        setPanels(p => ({
          ...p,
          [prog]: p[prog] || { expanded: true, outcomes: [], note: '', syncText: false, outcomeOpen: false },
        }));
      }
      return next;
    });
  };

  const useSeparate = separateNotes && selectedProgs.length >= 2;

  const sharedPanelTitle = !useSeparate && selectedProgs.length >= 2
    ? `Common Note (${selectedProgs.join(', ')})`
    : selectedProgs.length === 1 ? selectedProgs[0] : null;

  const addOutcome = (prog, val) => {
    if (useSeparate && prog) {
      const cur = getPanel(prog);
      if (!cur.outcomes.includes(val)) {
        const next = [...cur.outcomes, val];
        patchPanel(prog, { outcomes: next, outcomeOpen: false });
        if (cur.syncText) {
          selectedProgs.forEach(p => { if (p !== prog) patchPanel(p, { outcomes: next }); });
        }
      }
    } else {
      if (!sharedPanel.outcomes.includes(val)) {
        patchShared({ outcomes: [...sharedPanel.outcomes, val], outcomeOpen: false });
      }
    }
  };

  const removeOutcome = (prog, val) => {
    if (useSeparate && prog) {
      patchPanel(prog, { outcomes: getPanel(prog).outcomes.filter(o => o !== val) });
    } else {
      patchShared({ outcomes: sharedPanel.outcomes.filter(o => o !== val) });
    }
  };

  const handleNoteChange = (prog, text) => {
    if (useSeparate && prog) {
      const cur = getPanel(prog);
      patchPanel(prog, { note: text });
      if (cur.syncText) {
        selectedProgs.forEach(p => { if (p !== prog) patchPanel(p, { note: text }); });
      }
    } else {
      patchShared({ note: text });
    }
  };

  const hasNote = useSeparate
    ? selectedProgs.some(p => getPanel(p).note.trim().length > 0)
    : sharedPanel.note.trim().length > 0;

  const canSave = selectedProgs.length > 0 && outcome !== null && hasNote;

  const handleLogForChange = (key) => {
    setLogFor(key);
    // HCC Gaps always uses Call type (locked); Care Program/Gaps resets to General
    setType(key === 'hcc-gaps' ? 'Call' : 'General');
  };

  const resetForm = () => {
    setLogFor(defaultLogFor);
    setType(defaultLogFor === 'hcc-gaps' ? 'Call' : 'General');
    // In program scope the form stays open, so reset to a fresh, ready-to-fill
    // state (current time + the scoped program pre-selected) rather than blank.
    setDatetime(scopedProgram ? formatNow() : '');
    setSelectedProgs(scopedProgram ? defaultPrograms : []);
    setOutcome(null);
    setSeparateNotes(false);
    setPanels({});
    setSharedPanel({ expanded: true, outcomes: [], note: '', outcomeOpen: false });
    setCallBannerVisible(true);
    setCallDirection('outgoing');
    setCallViaNumber('Delores Conn (581 824-1591)');
    setCalledToNumber(INITIAL_CALLED_TO);
    setCallType('Provider');
    setCallDurationMin('00');
    setCallDurationSec('00');
  };

  const handleSave = () => {
    if (!canSave) return;

    const { date, time, monthLabel, monthKey } = parseDatetime(datetime);
    const author = currentUserProfile?.name || 'You';
    const label = TYPE_LOG_LABEL[type] || type;
    const now = Date.now();

    // One entry per selected program
    const newEntries = selectedProgs.map((prog, i) => {
      const panelData = useSeparate ? getPanel(prog) : sharedPanel;
      const outcomeText = panelData.outcomes.length > 0 ? panelData.outcomes[0] : outcome;
      return {
        id: now + i,
        type,
        date,
        time,
        author,
        title: label,
        programs: [prog],
        outcome: outcomeText,
        outcomeColor: OUTCOME_COLOR[outcome] || 'var(--neutral-300)',
        note: panelData.note,
      };
    });

    setLogGroups(prev => {
      // EDIT path — replace the row in place. We keep the row's
      // original month group so the visual position doesn't shift; the
      // editor only mutates fields, not date/time-derived grouping.
      if (editingId != null) {
        return prev.map(g => ({
          ...g,
          logs: g.logs.map(l => l.id === editingId
            ? { ...l, ...newEntries[0], id: editingId }
            : l),
        }));
      }
      // CREATE path — append into the appropriate month group.
      const idx = prev.findIndex(g => g.id === monthKey);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], logs: [...newEntries, ...updated[idx].logs] };
        return updated;
      }
      return [{ id: monthKey, label: monthLabel, logs: newEntries }, ...prev];
    });

    setEditingId(null);
    resetForm();
    if (!scopedProgram) setFormOpen(false);
    toast.success('Outreach logged successfully');
  };

  const handleDiscard = () => { resetForm(); if (!scopedProgram) setFormOpen(false); setEditingId(null); };

  /**
   * Edit an existing log entry — opens the inline form pre-filled
   * with the row's data. Save will replace the row in place (see
   * editingId branch in handleSave). Maps 1-to-1 with the API's
   * PUT /api/v2/outreach/{outreachId} surface.
   */
  const handleEdit = (log) => {
    setEditingId(log.id);
    setFormOpen(true);
    setType(log.type || 'General');
    setSelectedProgs(Array.isArray(log.programs) ? log.programs : []);
    setOutcome(log.outcome ? 'successful' : null);
    // Hydrate date/time from the entry's display strings. The form's
    // datetime input takes a free-form string so this is safe to round-
    // trip back.
    setDatetime(`${log.date} ${log.time}`);
    // Note panel — single shared (no per-program split for edits).
    setSeparateNotes(false);
    setSharedPanel({ expanded: true, outcomes: log.outcome ? [log.outcome] : [], note: log.note || '', outcomeOpen: false });
    // Call details restore (when present).
    if (log.callDetails) {
      setCallViaNumber(log.callDetails.via || '');
      setCalledToNumber(log.callDetails.to || '');
      const totalSec = (log.callDetails.durationMin || 0) * 60;
      setCallDurationMin(String(Math.floor(totalSec / 60)).padStart(2, '0'));
      setCallDurationSec(String(totalSec % 60).padStart(2, '0'));
    }
  };

  /**
   * Delete an existing log entry — confirms then removes. Real wiring
   * would DELETE /api/v2/outreach/{outreachId}; here we drop the row
   * from local state.
   */
  const handleDelete = (log) => {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const ok = window.confirm(`Delete this ${log.type.toLowerCase()} outreach from ${log.date}?`);
      if (!ok) return;
    }
    setLogGroups(prev => prev
      .map(g => ({ ...g, logs: g.logs.filter(l => l.id !== log.id) }))
      .filter(g => g.logs.length > 0));
  };

  return (
    <div className={styles.wrapper}>
      {/* Form card or empty state. Inside a care program the form is always
          open — there's no "Log New Outreach" collapsed step. */}
      {!formOpen && !scopedProgram ? (
        <div className={styles.emptyCard}>
          <Button
            variant="alt"
            size="L"
            leadingIconElement={<OutreachIcon size={16} color="var(--primary-300)" />}
            onClick={() => { setDatetime(formatNow()); setFormOpen(true); }}
          >
            Log New Outreach
          </Button>
        </div>
      ) : (
        <div className={styles.formCard}>
          {/* Log Outreach For selector — hidden when the host scope is fixed:
              the HCC drawer (HCC-only) or inside a care program (program-only,
              so HCC Gaps isn't a valid target). */}
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

          {/* Header: type dropdown + datetime picker */}
          <div className={styles.formHeader}>
            <TypeDropdown value={type} onChange={setType} disabled={isHccGaps} />
            <OutreachDateTimePicker value={datetime} onChange={setDatetime} />
          </div>

          {/* Form body */}
          <div className={styles.formBody}>

            {/* ── Call Details ── */}
            {showCallDetails && (
              <div className={styles.callDetailsInner}>
                {/* Last Call banner */}
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

                {/* Section label + direction radios */}
                <div className={styles.callDetailsHeader}>
                  <span className={styles.callDetailsLabel}>Call Details:</span>
                </div>
                <div className={styles.callDirectionRow}>
                  <RadioButton
                    checked={callDirection === 'outgoing'}
                    onChange={() => setCallDirection('outgoing')}
                    label="Outgoing"
                  />
                  <RadioButton
                    checked={callDirection === 'incoming'}
                    onChange={() => setCallDirection('incoming')}
                    label="Incoming"
                  />
                </div>

                {/* 2-column fields grid */}
                <div className={styles.callFieldsGrid}>
                  <div className={styles.callFieldWrap}>
                    <label className={styles.callFieldLabel}>Call Via Number</label>
                    <FieldDropdown
                      value={callViaNumber}
                      onChange={setCallViaNumber}
                      placeholder="Select number"
                      options={['Delores Conn (581 824-1591)', 'Practice Line (800 000-0000)']}
                    />
                  </div>
                  <div className={styles.callFieldWrap}>
                    <label className={styles.callFieldLabel}>Called To Number</label>
                    <FieldDropdown
                      value={calledToNumber}
                      onChange={setCalledToNumber}
                      placeholder="Select number"
                      options={CALLED_TO_OPTIONS}
                    />
                  </div>
                  <div className={styles.callFieldWrap}>
                    <label className={styles.callFieldLabel}>Call Type</label>
                    <FieldDropdown
                      value={callType}
                      onChange={setCallType}
                      placeholder="Select type"
                      options={['Provider', 'Patient', 'Caregiver', 'Family']}
                    />
                  </div>
                  <div className={styles.callFieldWrap}>
                    <label className={styles.callFieldLabel}>Duration</label>
                    <div className={styles.callDurationRow}>
                      <Input
                        type="number"
                        className={styles.callDurationInput}
                        value={callDurationMin}
                        min={0} max={99}
                        onChange={e => setCallDurationMin(e.target.value.padStart(2, '0').slice(-2))}
                      />
                      <span className={styles.callDurationUnit}>Min</span>
                      <Input
                        type="number"
                        className={styles.callDurationInput}
                        value={callDurationSec}
                        min={0} max={59}
                        onChange={e => setCallDurationSec(e.target.value.padStart(2, '0').slice(-2))}
                      />
                      <span className={styles.callDurationUnit}>Sec</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Programs */}
            <div className={styles.section}>
              <div className={styles.sectionLabelRow}>
                <span className={styles.sectionLabel}>{programsLabel}</span>
                <Tooltip label="Select from programs or gaps below to log outreach.">
                  <Icon name="solar:info-circle-linear" size={15} color="var(--neutral-300)" />
                </Tooltip>
              </div>
              <div className={styles.programs}>
                {PROGRAM_OPTIONS.map(prog => (
                  <button
                    key={prog}
                    className={`${styles.progPill} ${selectedProgs.includes(prog) ? styles.progPillSelected : ''}`}
                    onClick={() => toggleProgram(prog)}
                    type="button"
                  >
                    {prog}
                  </button>
                ))}
              </div>
            </div>

            {/* Outreach Outcome + Separate Notes inline */}
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Outreach Outcome</span>
              <div className={styles.outcomeRow2}>
                <div className={styles.radios}>
                  {['Successful', 'Unsuccessful', 'Note'].map(opt => (
                    <RadioButton
                      key={opt}
                      checked={outcome === opt}
                      onChange={() => setOutcome(opt)}
                      label={opt}
                    />
                  ))}
                </div>

                {selectedProgs.length >= 2 && (
                  <div className={styles.separateNotesInline}>
                    <Switch
                      checked={separateNotes}
                      onChange={setSeparateNotes}
                      label="Separate Notes"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Note panels */}
            {selectedProgs.length > 0 && (
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
                        showSyncText
                        onToggleExpand={() => patchPanel(prog, { expanded: !ps.expanded })}
                        onToggleOutcomeOpen={() => {
                          selectedProgs.forEach(p => { if (p !== prog) patchPanel(p, { outcomeOpen: false }); });
                          patchPanel(prog, { outcomeOpen: !ps.outcomeOpen });
                        }}
                        onAddOutcome={val => addOutcome(prog, val)}
                        onRemoveOutcome={val => removeOutcome(prog, val)}
                        onNoteChange={text => handleNoteChange(prog, text)}
                        onToggleSyncText={() => {
                          const next = !ps.syncText;
                          patchPanel(prog, { syncText: next });
                          if (next) {
                            selectedProgs.forEach(p => { if (p !== prog) patchPanel(p, { note: ps.note }); });
                          }
                        }}
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
                    showSyncText={false}
                    onToggleExpand={() => patchShared({ expanded: !sharedPanel.expanded })}
                    onToggleOutcomeOpen={() => patchShared({ outcomeOpen: !sharedPanel.outcomeOpen })}
                    onAddOutcome={val => addOutcome(null, val)}
                    onRemoveOutcome={val => removeOutcome(null, val)}
                    onNoteChange={text => handleNoteChange(null, text)}
                    onToggleSyncText={() => {}}
                  />
                )}
              </div>
            )}

            {/* Actions row */}
            <div className={styles.actionsRow}>
              <span className={styles.actionsLabel}>Actions:</span>
              <span className={styles.actionsDivider} />
              <ActionButton size="S" tooltip="Add Task" onClick={() => setAddTaskOpen(true)}>
                <AddTaskIcon size={16} color="var(--neutral-300)" />
              </ActionButton>
              <ActionButton size="S" icon="solar:calendar-add-linear" tooltip="Schedule Appointment" onClick={() => setScheduleOpen(true)} />
              <ActionButton size="S" icon="solar:alarm-linear" tooltip="Set Reminder" />
            </div>

            {/* Footer */}
            <div className={styles.formFooter}>
              <Button
                variant="primary"
                size="L"
                disabled={!canSave}
                onClick={handleSave}
              >
                Save
              </Button>
              <Button
                variant="ghost"
                size="L"
                onClick={handleDiscard}
              >
                Discard
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Outreach Activity section header */}
      <div className={styles.activityHeader}>
        <span className={styles.activityLabel}>Outreach Activity</span>
      </div>

      {/* Activity filter bar — the Search icon expands into a search field in
          place; the tabs and filter stay put. */}
      <div className={styles.activityFilterBar}>
        <div className={styles.activityFilterTabs}>
          {ACTIVITY_FILTERS.map(({ key, dot }) => (
            <button
              key={key}
              type="button"
              className={`${styles.activityFilterTab} ${activityFilter === key ? styles.activityFilterTabActive : ''}`}
              onClick={() => setActivityFilter(key)}
            >
              {dot && <span className={styles.activityFilterDot} style={{ background: dot }} />}
              {key}
            </button>
          ))}
        </div>
        <div className={styles.activityFilterActions}>
          {activitySearchOpen ? (
            <SearchBar
              className={styles.activitySearchBar}
              placeholder="Search activity"
              value={activitySearchText}
              onChange={e => setActivitySearchText(e.target.value)}
              onClose={() => { setActivitySearchOpen(false); setActivitySearchText(''); }}
            />
          ) : (
            <ActionButton size="S" icon="solar:magnifer-linear" tooltip="Search" onClick={() => setActivitySearchOpen(true)} />
          )}
          <span className={styles.activityFilterDivider} />
          <ActionButton
            size="S"
            icon="custom:filter"
            tooltip="Filter"
            iconColor={outreachScope !== 'All' ? 'var(--primary-300)' : undefined}
            onClick={e => setFilterMenu({ rect: e.currentTarget.getBoundingClientRect() })}
          />
        </div>
      </div>

      {/* Activity log — the patient's full outreach history, narrowed by the
          scope filter (program / Care Gaps / HCC Gaps), the outcome filter tab,
          and the search text. */}
      {(() => {
        const q = activitySearchText.trim().toLowerCase();
        const keep = (l) =>
          matchesOutreachScope(l, outreachScope)
          && (activityFilter === 'All' || logActivityCategory(l) === activityFilter)
          && (!q || `${l.title || ''} ${l.author || ''} ${l.outcome || ''} ${l.note || ''}`.toLowerCase().includes(q));
        return logGroups
          .map(g => ({ ...g, logs: g.logs.filter(keep) }))
          .filter(g => g.logs.length > 0);
      })().map(group => (
        <LogGroup
          key={group.id}
          label={group.label}
          logs={group.logs}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}

      {/* Scope filter — patient's programs (from the log history) plus Care
          Gaps and HCC Gaps. */}
      {filterMenu && (() => {
        const codes = [...new Set(logGroups.flatMap(g => g.logs.flatMap(l => l.programs || [])))];
        const opt = (key, text) => ({
          key,
          label: <span style={{ color: outreachScope === key ? 'var(--primary-300)' : undefined }}>{text}</span>,
        });
        return (
          <MenuPopover
            anchorRect={filterMenu.rect}
            align="right"
            width={200}
            ariaLabel="Filter outreach by"
            items={[
              opt('All', 'All Outreach'),
              ...codes.map(c => opt(c, c)),
              opt('Care Gaps', 'Care Gaps'),
              opt('HCC Gaps', 'HCC Gaps'),
            ]}
            onSelect={key => setOutreachScope(key)}
            onClose={() => setFilterMenu(null)}
          />
        );
      })()}

      {/* Quick-action drawers — created items drop into this program's
          Related Tasks / Appointments lists (session state). */}
      {addTaskOpen && (
        <AddTaskDrawer
          onClose={() => setAddTaskOpen(false)}
          onSave={task => scopedProgram && addProgramTask(scopedProgram, task)}
        />
      )}
      {scheduleOpen && (
        <ScheduleDrawer
          initialPatientId={patientId}
          onClose={() => setScheduleOpen(false)}
          onSave={row => {
            if (!scopedProgram || !row) return;
            addProgramAppointment(scopedProgram, {
              id: `appt-${Date.now()}`,
              title: row.appointment_type_name || 'Appointment',
              subtitle: row.reason_for_visit || row.mode || '',
              type: 'Appointment',
              programCode: scopedProgram,
              date: row.date || '',
              time: row.time_start || '',
              assignee: row.primary_user || 'Unassigned',
              recurring: !!row.recurring,
            });
          }}
        />
      )}
    </div>
  );
}
