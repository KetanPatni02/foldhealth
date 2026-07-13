import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Drawer } from '../../components/Drawer/Drawer';
import { Button } from '../../components/Button/Button';
import { Dropzone } from '../../components/Dropzone/Dropzone';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import { DOC_TYPES, makeUploadedChartDoc } from './data/chartDocs';
import styles from './UploadChartDrawer.module.css';

/**
 * UploadChartDrawer — right-side drawer used by the HCC worklist to upload a
 * chart document for a single member. Mounted in `AppLayout` and driven by
 * `hccUploadMember` store state.
 *
 * Phase 3c covers the visual shell + form validation. The actual file upload
 * (Supabase storage push, audit-log entry) is a follow-up.
 */
export function UploadChartDrawer() {
  const member = useAppStore(s => s.hccUploadMember);
  const close = useAppStore(s => s.closeHccUploadDrawer);
  const showToast = useAppStore(s => s.showToast);
  // Log the upload to the Diagnosis Gaps Activity Log when the drawer was
  // launched from inside the DiagPanel. addActivityEntry resolves member +
  // current DOS from store state automatically; ICD-scope is picked up from
  // diagActivityIcd so the entry shows in both the ICD and DOS-level logs.
  const addActivityEntry = useAppStore(s => s.addActivityEntry);
  const activityIcd = useAppStore(s => s.diagActivityIcd);
  // Sync the uploaded document into the member's chart documents (the worklist
  // "Documents" column + the ChartPopover / Document Available drawer).
  const addChartDoc = useAppStore(s => s.addChartDoc);

  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [docType, setDocType] = useState('');

  if (!member) return null;

  const ok = !!(file && caption.trim() && docType);

  const handleUpload = () => {
    addChartDoc(member.id, makeUploadedChartDoc(member, { file, caption, docType }), file);
    addActivityEntry({
      t: 'upload', by: 'You', role: 'Coder',
      icds: activityIcd ? [activityIcd] : undefined,
      headline: activityIcd
        ? `Document Uploaded for ${activityIcd}`
        : 'Document Uploaded',
      file: file.name,
      fileType: docType,
    });
    showToast(`Uploaded ${file.name} to ${member.name}'s documents.`);
    setFile(null);
    setCaption('');
    setDocType('');
    close();
  };

  const handleClose = () => {
    setFile(null);
    setCaption('');
    setDocType('');
    close();
  };

  return (
    <Drawer
      title={<span className={styles.title}>Upload Document</span>}
      onClose={handleClose}
      className={styles.drawer}
      bodyClassName={styles.body}
      headerRight={
        <Button variant="primary" size="M" disabled={!ok} onClick={handleUpload}>
          Upload
        </Button>
      }
    >
      {/* Patient strip */}
      <div className={styles.patient}>
        <div className={styles.avatar}>{member.in || member.name?.split(' ').map(p => p[0]).slice(0, 2).join('')}</div>
        <div className={styles.patientText}>
          <div className={styles.patientName}>{member.name}</div>
          <div className={styles.patientMeta}>
            Patient · {member.g === 'M' ? 'Male' : member.g === 'F' ? 'Female' : member.g} ·{' '}
            {member.age || '—'}
            {member.memberId ? ` · ${member.memberId}` : ''}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className={styles.form}>
        {/* Drop zone — shared Dropzone primitive */}
        <Dropzone
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          helperText={file ? file.name : 'Supported formats: PDF, DOC, JPG, or PNG'}
          secondaryText="Max size: 100 MB"
          icon="solar:upload-minimalistic-linear"
          onPick={setFile}
        />

        {/* Caption */}
        <div className={styles.field}>
          <span className={styles.fieldLabel}>
            Caption
            <span className={styles.required} aria-hidden="true" />
          </span>
          <input
            type="text"
            value={caption}
            placeholder="Add caption"
            onChange={(e) => setCaption(e.target.value)}
            className={styles.input}
          />
        </div>

        {/* Document Type */}
        <div className={styles.field}>
          <span className={styles.fieldLabel}>
            Document Type
            <span className={styles.required} aria-hidden="true" />
          </span>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className={styles.select}>
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Drawer>
  );
}
