import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/Icon/Icon';
import { Avatar } from '../../components/Avatar/Avatar';
import { useAppStore } from '../../store/useAppStore';
import { DocEvidenceViewer } from './DiagPanel/DocEvidenceViewer';
import { staffForRole } from './assignment/astranaStaff';
import styles from './ChartDetailDrawer.module.css';

// Document-review status options for the "Action Needed" dropdown. The icon
// (a light-filled status circle) sits beside the label and is mirrored into the
// trigger when selected.
const STATUS_OPTIONS = [
  { key: 'action-needed', label: 'Action Needed' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'insufficient', label: 'Insufficient' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected', textColor: 'var(--status-error)' },
];

function StatusIcon({ status, size = 16 }) {
  const common = { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', style: { flexShrink: 0 } };
  switch (status) {
    case 'in-progress':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.5" stroke="var(--status-warning)" strokeWidth="1.2" />
          <path d="M8 1.5A6.5 6.5 0 0 1 8 14.5Z" fill="var(--status-warning)" />
        </svg>
      );
    case 'insufficient':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="7" fill="var(--status-warning-light)" stroke="var(--status-warning)" />
          <path d="M8 4.5V8.6" stroke="var(--status-warning)" strokeLinecap="round" />
          <circle cx="8" cy="11" r="0.75" fill="var(--status-warning)" />
        </svg>
      );
    case 'completed':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="7" fill="var(--status-success-light)" stroke="var(--status-success)" />
          <path d="M5 8.2l2 2 4-4.4" stroke="var(--status-success)" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'rejected':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="7" fill="var(--status-error-light)" stroke="var(--status-error)" />
          <path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" stroke="var(--status-error)" strokeLinecap="round" />
        </svg>
      );
    case 'action-needed':
    default:
      return (
        <svg {...common}>
          <path d="M8 0.5C12.1421 0.5 15.5 3.85786 15.5 8C15.5 12.1421 12.1421 15.5 8 15.5C3.85786 15.5 0.5 12.1421 0.5 8C0.5 3.85786 3.85786 0.5 8 0.5Z" fill="var(--status-warning-light)" />
          <path d="M8 0.5C12.1421 0.5 15.5 3.85786 15.5 8C15.5 12.1421 12.1421 15.5 8 15.5C3.85786 15.5 0.5 12.1421 0.5 8C0.5 3.85786 3.85786 0.5 8 0.5Z" stroke="var(--neutral-400)" />
          <path d="M8 4V5.33333M12 8H10.6667M8 12V10.6667M4 8H5.33333M5.17151 5.17157L6.11432 6.11438M10.8284 5.17157L9.88556 6.11438M10.8285 10.8284L9.88568 9.88561M5.17163 10.8284L6.11444 9.88561" stroke="var(--neutral-400)" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

/**
 * ChartDetailDrawer — "Document Available Details" full-width overlay opened
 * when a chart row is clicked in the ChartPopover. Left pane shows the chart
 * PDF; right pane shows the document's metadata (created date, teams, the
 * associated-DOS document row). Figma: ICD-Import 4481:112907.
 *
 * @param {object}   props
 * @param {object}   props.chart   – { n, meta, status } from getChartDocs
 * @param {object}   props.member  – worklist member (patient banner + PDF)
 * @param {function} props.onClose
 */
export function ChartDetailDrawer({ chart, member, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // "Assign Support Team" dropdown anchored on the team (DM) badge.
  const dmRef = useRef(null);
  const [assignPos, setAssignPos] = useState(null);
  const [selectedSupport, setSelectedSupport] = useState(null);
  useEffect(() => {
    if (!assignPos) return;
    const onDoc = (e) => {
      if (!dmRef.current?.contains(e.target) && !e.target.closest?.(`.${styles.assignMenu}`)) setAssignPos(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [assignPos]);

  // "Action Needed" status dropdown anchored on the status button.
  const actionRef = useRef(null);
  const [actionStatus, setActionStatus] = useState('action-needed');
  const [actionPos, setActionPos] = useState(null);
  const [docAction, setDocAction] = useState(null); // null | 'pass' | 'fail'
  const showToast = useAppStore(s => s.showToast);
  useEffect(() => {
    if (!actionPos) return;
    const onDoc = (e) => {
      if (!actionRef.current?.contains(e.target) && !e.target.closest?.(`.${styles.statusMenu}`)) setActionPos(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [actionPos]);

  if (!chart) return null;

  const supportStaff = staffForRole('support');
  const openAssign = () => {
    if (assignPos) { setAssignPos(null); return; }
    const r = dmRef.current?.getBoundingClientRect();
    if (r) setAssignPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  };

  const reviewerName = selectedSupport?.name || member?.sup || 'D Morris';
  const passDoc = () => { setDocAction('pass'); showToast('Support Task is Completed'); };

  const currentStatus = STATUS_OPTIONS.find(s => s.key === actionStatus) || STATUS_OPTIONS[0];
  const openAction = () => {
    if (actionPos) { setActionPos(null); return; }
    const r = actionRef.current?.getBoundingClientRect();
    if (r) setActionPos({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 198) });
  };

  const [metaDate, metaType] = String(chart.meta || '').split(' · ');
  const gender = member?.g === 'F' ? 'Female' : 'Male';
  const overdue = /overdue/i.test(member?.due || '');

  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.panel} role="dialog" aria-label="Document Available Details">
        {/* Title bar */}
        <div className={styles.titleBar}>
          <span className={styles.title}>Document Available Details</span>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <Icon name="solar:close-square-linear" size={20} color="var(--neutral-400)" />
          </button>
        </div>

        {/* Patient banner */}
        <div className={styles.banner}>
          <div className={styles.avatar}>{member?.in || 'AB'}</div>
          <div className={styles.bannerText}>
            <div className={styles.bannerName}>
              <span>{member?.name || 'Patient'}</span>
              <Icon name="solar:arrow-right-linear" size={13} color="var(--neutral-300)" />
            </div>
            <div className={styles.bannerMeta}>
              <span>Patient</span><span className={styles.dot}>•</span>
              <span>{gender}</span><span className={styles.dot}>•</span>
              <span>{member?.age || '—'}</span><span className={styles.dot}>•</span>
              <span>#{member?.memberId || '219384756102'}</span><span className={styles.dot}>•</span>
              <span>RAF</span>
              <span className={styles.rafVal}>{member?.raf || '—'}</span>
              <span className={styles.rafBadge}>
                {member?.ri || '0.512'}
                <Icon name={member?.ru === false ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-up-linear'} size={12} color="var(--status-success)" />
              </span>
            </div>
          </div>
          <div className={styles.bannerActions}>
            <button type="button" className={styles.iconBtn} aria-label="Call PCP">
              <Icon name="custom:call-pcp" size={20} color="var(--neutral-300)" />
            </button>
            <span className={styles.vDivider} />
            <button type="button" className={styles.iconBtn} aria-label="Expand">
              <Icon name="custom:expand-drawer" size={20} />
            </button>
          </div>
        </div>

        {/* Two-pane body */}
        <div className={styles.body}>
          {/* Left — PDF */}
          <div className={styles.leftPane}>
            <div className={styles.paneHeader}>{chart.n}</div>
            <div className={styles.pdfWrap}>
              <DocEvidenceViewer member={member} />
            </div>
          </div>

          {/* Right — metadata */}
          <div className={styles.rightPane}>
            <div className={styles.rightHeader}>
              <div className={styles.createdGroup}>
                <span className={styles.createdLabel}>Created :</span>
                <span className={styles.createdDate}>{member?.date || '06/15/2026'}</span>
                {overdue && <span className={styles.overdue}>({member.due})</span>}
              </div>
              <span className={styles.vDivider} />
              <span className={styles.teamBadge}>
                <span className={styles.progressDot} aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6.5" stroke="var(--status-success)" strokeWidth="1.5" />
                    <path d="M8 2A6 6 0 0 1 8 14Z" fill="var(--status-success)" />
                  </svg>
                </span>
                Support Team
              </span>
              <div className={styles.rightHeaderEnd}>
                <button type="button" ref={dmRef} className={styles.dmBadge} onClick={openAssign}>
                  <span className={styles.dmAvatar}>{selectedSupport ? selectedSupport.initials : 'DM'}</span>
                  <Icon name="solar:alt-arrow-down-linear" size={11} color="var(--secondary-300)" />
                </button>
                <span className={styles.vDivider} />
                <button type="button" ref={actionRef} className={styles.actionNeeded} onClick={openAction}>
                  <StatusIcon status={currentStatus.key} size={12} />
                  {currentStatus.label}
                  <Icon name="solar:alt-arrow-down-linear" size={12} color="var(--neutral-300)" />
                </button>
              </div>
            </div>

            {docAction === 'pass' && (
              <div className={styles.passBanner}>
                <Icon name="solar:info-circle-linear" size={16} color="var(--status-success)" />
                <span>{reviewerName} Completed Document Review Task on {member?.date || '—'}.</span>
              </div>
            )}

            <div className={styles.rightBody}>
              <div className={styles.assocRow}>
                <div className={styles.assocLeft}>
                  <span className={styles.assocLabel}>Document Associated with</span>
                  <span className={styles.dosBadge}>
                    {(member?.cv || member?.tv || 3)}/{(member?.tv || 3)} DOSs
                    <Icon name="solar:alt-arrow-down-linear" size={11} color="var(--primary-300)" />
                  </span>
                </div>
                <button type="button" className={styles.uploadLink}>
                  <Icon name="solar:upload-minimalistic-linear" size={16} color="var(--primary-300)" />
                  Upload
                </button>
              </div>

              <div className={styles.docCard}>
                <div className={styles.docCardText}>
                  <span className={styles.docName}>{chart.n}</span>
                  <span className={styles.docMeta}>
                    {metaType || 'Progress Note'} • {metaDate || '—'} • {member?.sup || 'Benjamin Cummings'} (Support Team)
                  </span>
                </div>
                <div className={styles.docActions}>
                  {docAction === 'pass' ? (
                    <>
                      <span className={styles.passedBadge}>
                        <Icon name="solar:check-read-linear" size={12} color="var(--status-success)" />
                        Passed
                      </span>
                      <button type="button" className={styles.undoBtn} aria-label="Undo" onClick={() => setDocAction(null)}>
                        <Icon name="solar:undo-left-round-linear" size={16} color="var(--neutral-400)" />
                      </button>
                    </>
                  ) : docAction === 'fail' ? (
                    <>
                      <span className={styles.failedBadge}>
                        <Icon name="solar:close-circle-linear" size={12} color="var(--status-error)" />
                        Failed
                      </span>
                      <button type="button" className={styles.undoBtn} aria-label="Undo" onClick={() => setDocAction(null)}>
                        <Icon name="solar:undo-left-round-linear" size={16} color="var(--neutral-400)" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className={styles.passFailPill} title="Pass" onClick={passDoc}>
                        <Icon name="solar:check-circle-linear" size={12} color="var(--neutral-300)" />
                        Pass
                      </button>
                      <button type="button" className={styles.passFailPill} title="Fail" onClick={() => setDocAction('fail')}>
                        <Icon name="solar:close-circle-linear" size={12} color="var(--neutral-300)" />
                        Fail
                      </button>
                    </>
                  )}
                  <button type="button" className={styles.moreBtn} aria-label="More actions">
                    <Icon name="solar:menu-dots-linear" size={15} color="currentColor" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {assignPos && (
        <div
          className={styles.assignMenu}
          style={{ top: assignPos.top, right: assignPos.right }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.assignTitle}>Assign Support Team</div>
          {supportStaff.map(s => (
            <button
              key={s.id}
              type="button"
              className={styles.assignItem}
              onClick={() => { setSelectedSupport(s); setAssignPos(null); }}
            >
              <Avatar variant="assignee" initials={s.initials} />
              <span className={styles.assignName}>{s.name}</span>
              <span className={styles.assignRole}>Support Team</span>
            </button>
          ))}
        </div>
      )}

      {actionPos && (
        <div
          className={styles.statusMenu}
          style={{ top: actionPos.top, left: actionPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {STATUS_OPTIONS.map(opt => {
            const sel = opt.key === actionStatus;
            return (
              <button
                key={opt.key}
                type="button"
                className={`${styles.statusItem} ${sel ? styles.statusItemSelected : ''}`}
                onClick={() => { setActionStatus(opt.key); setActionPos(null); }}
              >
                <StatusIcon status={opt.key} size={16} />
                <span
                  className={styles.statusLabel}
                  style={{ color: sel ? 'var(--primary-300)' : (opt.textColor || 'var(--neutral-400)') }}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </>,
    document.body,
  );
}
