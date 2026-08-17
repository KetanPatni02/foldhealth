import { useRef, useState } from 'react';
import { Icon } from '../../../../../../components/Icon/Icon';
import { DownChevronIcon } from '../../../../../../components/Icon/DownChevronIcon';
import { SmsIcon } from '../../../../../../components/Icon/SmsIcon';
import { ActionButton } from '../../../../../../components/ActionButton/ActionButton';
import { MenuPopover } from '../../../../../../components/MenuPopover/MenuPopover';
import { LOG_TYPE_ICON } from './OutreachTab.utils';
import styles from './OutreachTab.module.css';

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
      <ActionButton
        ref={btnRef}
        icon="solar:menu-dots-linear"
        size="S"
        tooltip="More actions"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
      />
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
  const expandable = hasNote || !!log.callDetails;

  return (
    <div className={styles.logEntry}>
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

export function LogGroup({ label, logs, onEdit, onDelete }) {
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
