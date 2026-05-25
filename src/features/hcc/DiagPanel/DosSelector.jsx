import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../../components/Icon/Icon';
import styles from './DosSelector.module.css';

/**
 * DOS Selector — trigger button + popover combo for picking which Date of
 * Service the DiagPanel scopes to. Sweep mode (`All DOSs`) gets a special
 * top-of-list row with warning-tinted styling.
 *
 * Props:
 *  - value          (string|null)         Current DOS — null means "first DOS";
 *                                          'All DOSs' enables sweep.
 *  - dosList        ({date, visitInfo?, status?, progressColors?, due?, hasBorderBottom?}[])
 *  - includeAllDOSs (boolean)             Show the All-DOSs sweep row at the top.
 *  - statusOf       (fn(row) => statusLabel)  Optional resolver for the per-row
 *                                              status pill (otherwise row.status is used).
 *  - onChange       (fn(string))          Called with the new DOS date (or 'All DOSs').
 */
export function DosSelector({
  value,
  dosList = [],
  includeAllDOSs = true,
  onChange,
}) {
  const triggerRef = useRef(null);
  const [popRect, setPopRect] = useState(null);

  const isSweep = value === 'All DOSs';
  const label = isSweep ? 'All DOSs' : (value || dosList[0]?.date || '—');

  const open = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPopRect(rect);
  };
  const close = () => setPopRect(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={popRect ? close : open}
      >
        <span className={styles.triggerLabel}>DOS</span>
        <span className={styles.triggerDivider}>|</span>
        {isSweep && <Icon name="solar:bolt-linear" size={12} color="var(--status-warning)" />}
        <span className={[styles.triggerValue, isSweep ? styles.triggerValueSweep : ''].join(' ')}>
          {label}
        </span>
        <Icon name="solar:alt-arrow-down-linear" size={9} color="var(--neutral-200)" />
      </button>

      {popRect && (
        <DosPopup
          rect={popRect}
          value={value}
          dosList={dosList}
          includeAllDOSs={includeAllDOSs}
          onSelect={(v) => { onChange?.(v); close(); }}
          onClose={close}
        />
      )}
    </>
  );
}

function DosPopup({ rect, value, dosList, includeAllDOSs, onSelect, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const top = rect.bottom + 4;
  const left = rect.left;
  const isSweep = value === 'All DOSs';

  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div
        className={styles.popover}
        style={{ top, left }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Select DOS"
      >
        <div className={styles.header}>DOS</div>

        {includeAllDOSs && (
          <button
            type="button"
            className={[styles.row, styles.sweepRow, isSweep ? styles.sweepRowActive : ''].join(' ')}
            onClick={() => onSelect('All DOSs')}
          >
            <span className={[styles.radio, isSweep ? styles.radioSweepActive : ''].join(' ')}>
              {isSweep && <span className={styles.radioDot} />}
            </span>
            <div className={styles.rowText}>
              <div className={styles.rowDate}>All DOS</div>
              <div className={styles.rowMeta}>Sweep Mode — All visits</div>
            </div>
          </button>
        )}

        {dosList.map((d) => {
          const isSel = value === d.date;
          const rowStatus = d.status || 'New';
          const dueColor = d.due?.startsWith('Overdue')
            ? 'var(--status-error)'
            : d.due?.startsWith('Due')
            ? 'var(--status-warning)'
            : 'var(--neutral-200)';
          return (
            <button
              key={d.date}
              type="button"
              className={[styles.row, isSel ? styles.rowActive : ''].join(' ')}
              onClick={() => onSelect(d.date)}
            >
              <span className={[styles.radio, isSel ? styles.radioActive : ''].join(' ')}>
                {isSel && <span className={styles.radioDot} />}
              </span>
              <div className={styles.rowText}>
                <div className={styles.rowTopline}>
                  <span className={styles.rowDate}>{d.date}</span>
                  {d.visitInfo && <span className={styles.rowVisit}>({d.visitInfo})</span>}
                  <span className={[styles.statusPill, statusClass(rowStatus)].join(' ')}>
                    {rowStatus}
                  </span>
                </div>
                {(d.progressColors || d.due) && (
                  <div className={styles.progressRow}>
                    {d.progressColors && (
                      <>
                        <span className={styles.progressLabel}>Progress:</span>
                        <div className={styles.progressDots}>
                          {d.progressColors.map((col, i) => (
                            <span key={i} className={styles.progressDot} style={{ background: col }} />
                          ))}
                        </div>
                      </>
                    )}
                    {d.progressColors && d.due && <span className={styles.miniDivider} />}
                    {d.due && <span style={{ color: dueColor, fontSize: 12 }}>{d.due}</span>}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </>,
    document.body,
  );
}

// Map a status string to a small CSS class for pill coloring.
function statusClass(status) {
  switch (status) {
    case 'New':                return styles.pillNew;
    case 'In Progress':        return styles.pillInProgress;
    case 'Completed':          return styles.pillCompleted;
    case 'Records Requested':  return styles.pillRecRequested;
    case 'Records Received':   return styles.pillRecReceived;
    case 'Rejected':           return styles.pillRejected;
    case 'Returned':           return styles.pillReturned;
    case 'Insufficient':       return styles.pillInsufficient;
    case 'Closed':             return styles.pillClosed;
    default:                   return styles.pillDefault;
  }
}
