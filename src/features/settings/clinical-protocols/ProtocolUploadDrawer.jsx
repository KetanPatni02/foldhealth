import { Drawer } from '../../../components/Drawer/Drawer';
import { Button } from '../../../components/Button/Button';
import { Badge } from '../../../components/Badge/Badge';
import { Dropzone } from '../../../components/Dropzone/Dropzone';
import { Icon } from '../../../components/Icon/Icon';
import { useAppStore } from '../../../store/useAppStore';
import { PROTOCOL_ACCEPT, PROTOCOL_ACCEPT_MIME } from './lib/extractProtocolText';
import { foldProtocolJsonTemplate } from './lib/protocolSchema';
import styles from './ClinicalProtocols.module.css';

const STATUS = {
  queued: { label: 'Queued', tone: 'grey' },
  reading: { label: 'Reading file', tone: 'info' },
  uploading: { label: 'Storing file', tone: 'info' },
  parsing: { label: 'Parsing', tone: 'info' },
  done: { label: 'Ready for review', tone: 'success' },
  failed: { label: 'Failed', tone: 'error' },
};
const KIND_ICON = { pdf: 'solar:file-text-linear', docx: 'solar:document-text-linear', json: 'solar:code-file-linear' };

function downloadTemplate() {
  const blob = new Blob([JSON.stringify(foldProtocolJsonTemplate(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fold-protocol-template.json';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Upload clinical practice guidance: drop PDFs, Word files or JSON (many at
 * once). Each file is stored, parsed into a draft protocol and queued for
 * review; uploads keep running if the drawer is closed.
 */
export function ProtocolUploadDrawer({ onClose, onReview }) {
  const uploads = useAppStore(s => s.protocolUploads);
  const uploadClinicalProtocols = useAppStore(s => s.uploadClinicalProtocols);
  const clearFinished = useAppStore(s => s.clearFinishedProtocolUploads);
  const showToast = useAppStore(s => s.showToast);
  const finished = uploads.filter(u => u.status === 'done' || u.status === 'failed').length;
  const running = uploads.length - finished;

  return (
    <Drawer
      title="Upload Protocols"
      onClose={onClose}
      noCloseDivider
      headerRight={(
        <>
          <Button variant="secondary" size="L" leadingIcon="solar:file-download-linear" onClick={downloadTemplate}>JSON Template</Button>
          {finished > 0 && <Button variant="secondary" size="L" onClick={clearFinished}>Clear Finished</Button>}
          <span className={styles.headerDivider} />
        </>
      )}
    >
      <div className={styles.drawerBody}>
        <p className={styles.hint}>
          Upload a client&apos;s clinical practice guidance. Each file is parsed into a draft protocol (thresholds, decision rules,
          cadence, medication titration and cross-references) for a supervisor to review. Nothing is used until it is approved.
          JSON in the Fold protocol format imports directly.
        </p>
        <Dropzone
          accept={PROTOCOL_ACCEPT}
          acceptMime={PROTOCOL_ACCEPT_MIME}
          multiple
          helperText="PDF, Word (.docx) or JSON"
          secondaryText="Up to 25 MB each"
          onPick={(files) => uploadClinicalProtocols(Array.isArray(files) ? files : [...(files || [])])}
          onReject={() => showToast?.('Upload PDF, Word (.docx) or JSON files')}
        />
        {uploads.length > 0 && (
          <>
            <span className={styles.label}>
              {running > 0 ? `Processing ${running} of ${uploads.length}` : `${uploads.length} processed`}
            </span>
            <div className={styles.queue}>
              {uploads.map((u) => {
                const status = STATUS[u.status] || STATUS.queued;
                const ext = u.name.split('.').pop().toLowerCase();
                return (
                  <div key={u.key} className={styles.queueRow}>
                    <Icon name={KIND_ICON[ext] || 'solar:file-linear'} size={20} color="var(--neutral-300)" />
                    <span className={styles.queueText}>
                      <span className={styles.queueName}>{u.name}</span>
                      {u.error && <span className={styles.queueError}>{u.error}</span>}
                    </span>
                    <Badge tone={status.tone} size="S" label={status.label} />
                    {u.status === 'done' && u.protocolId && (
                      <Button variant="secondary" size="S" onClick={() => onReview(u.protocolId)}>Review</Button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}
