import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/Icon/Icon';
import { DocEvidenceViewer } from './DiagPanel/DocEvidenceViewer';
import styles from './DocPreviewDrawer.module.css';

// Status pill styling, mirroring the ChartPopover chip.
const STATUS_STYLE = {
  Passed:  { color: 'var(--status-success)', bg: 'var(--status-success-light)', border: 'rgba(0, 155, 83, 0.2)',  icon: 'solar:check-read-linear',    label: 'Passed' },
  Failed:  { color: 'var(--status-error)',   bg: 'var(--status-error-light)',   border: 'rgba(215, 40, 37, 0.2)', icon: 'solar:close-circle-linear',  label: 'Failed' },
  Pending: { color: 'var(--neutral-300)',    bg: 'var(--neutral-50)',           border: 'var(--neutral-150)',     icon: 'solar:clock-circle-linear',  label: 'Pending' },
};

/**
 * DocPreviewDrawer — read-only document preview for non-Support roles
 * (Coder / QA / Compliance). Shows the selected chart's PDF with its current
 * review status (Passed / Failed / Pending) and no actions. Figma 9799:173025.
 *
 * @param {object}   props
 * @param {object[]} props.charts    – full document list from getChartDocs
 * @param {string}   [props.initialId] – doc to preview (falls back to the first)
 * @param {object}   props.member
 * @param {function} props.onClose
 */
export function DocPreviewDrawer({ charts, initialId, member, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const docs = charts || [];
  if (docs.length === 0) return null;
  const doc = docs.find(d => d.id === initialId) || docs[0];
  const st = STATUS_STYLE[doc.status] || STATUS_STYLE.Pending;

  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.panel} role="dialog" aria-label="Document Preview">
        <div className={styles.titleBar}>
          <span className={styles.title}>Document Preview</span>
          <span className={styles.statusPill} style={{ color: st.color, background: st.bg, borderColor: st.border }}>
            <Icon name={st.icon} size={12} color={st.color} />
            {st.label}
          </span>
          <span className={styles.vDivider} />
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <Icon name="solar:close-square-linear" size={20} color="var(--neutral-400)" />
          </button>
        </div>
        <div className={styles.pdfWrap}>
          {doc.pdf ? (
            <iframe src={doc.pdf} title={doc.n} />
          ) : (
            <DocEvidenceViewer member={member} />
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
