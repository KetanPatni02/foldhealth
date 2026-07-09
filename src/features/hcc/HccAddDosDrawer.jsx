import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Drawer } from '../../components/Drawer/Drawer';
import { Avatar } from '../../components/Avatar/Avatar';
import { Badge } from '../../components/Badge/Badge';
import { Button } from '../../components/Button/Button';
import { Select } from '../../components/Select/Select';
import { Input } from '../../components/Input/Input';
import { Dropzone } from '../../components/Dropzone/Dropzone';
import { Icon } from '../../components/Icon/Icon';
import styles from './HccAddDosDrawer.module.css';

const PROVIDER_OPTIONS = [
  'Dr. Angela White', 'Dr. Katherine Moss', 'Dr. Marcus Osei', 'Dr. Aisha Mehta',
  'Dr. Indigo Bolen', 'Dr. Sarah Connor', 'Dr. Calvin Reed',
].map(n => ({ value: n, label: n }));

const POS_OPTIONS = [
  { value: '11', label: '11 - Office' },
  { value: '12', label: '12 - Home' },
  { value: '19', label: '19 - Other' },
  { value: '20', label: '20 - Urgent Care Facility' },
  { value: '21', label: '21 - Inpatient Hospital' },
  { value: '22', label: '22 - On Campus-Outpatient Hospital' },
  { value: '34', label: '34 - Hospice' },
  { value: '02', label: '02 - Telehealth' },
];

const DOC_TYPE_OPTIONS = [
  { value: 'AWV', label: 'AWV Note' },
  { value: 'Progress Note', label: 'Progress Note' },
  { value: 'SOAP Note', label: 'SOAP Note' },
  { value: 'Lab', label: 'Lab' },
  { value: 'Other', label: 'Other' },
];

// Demo extraction payload — mirrors Figma 4687:127406 so the post-upload
// state looks like the design (real integration would call the OCR
// pipeline and populate these from the model's field-level output).
const DEMO_EXTRACTION = {
  fileName: 'thomas_nguyen_clinicalnote_new.pdf',
  uploadedBy: 'Robert Fox',
  uploadedAt: '08/30/2024',
  dos: '09/12/2025',
  dosConf: 44,
  provider: 'Dr. Angela White',
  providerConf: 95,
  pos: '19',
  posConf: 74,
  docType: '',
  docTypeConf: 15,
  docTypeHint: 'Maybe: AWV Note',
  icds: [
    { code: 'I50.32', desc: 'Type 2 diabetes mellitus with diabetic peripheral angiopathy without gangrene', hcc: 'HCC 37', conf: 95 },
    { code: 'E11.22', desc: 'Diabetes mellitus due to underlying condition with proliferative diabetic retinopathy with macular edema, right eye', hcc: 'HCC 37, 298', conf: 74 },
    { code: 'E11.21', desc: 'Acute Bronchitis', hcc: 'HCC 37, 298', conf: 44 },
  ],
};

function tier(score) {
  return score >= 85 ? 'high' : score >= 60 ? 'medium' : 'low';
}

// Confidence gauge + citation trigger — the small arc meter + % that sits
// next to each auto-filled field's label. Clicking cites the source doc.
function ConfGauge({ score, onCite }) {
  if (typeof score !== 'number') return null;
  const t = tier(score);
  return (
    <button
      type="button"
      className={[styles.gauge, styles[`gauge_${t}`]].join(' ')}
      onClick={onCite}
      title="View citation in source document"
    >
      <Icon name="solar:gauge-minimalistic-linear" size={12} />
      {score}%
    </button>
  );
}

function FieldRow({ label, required, confidence, onCite, children, error, hint }) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldHead}>
        <span className={styles.fieldLabel}>
          {label}{required && <span className={styles.req}>•</span>}
        </span>
        {typeof confidence === 'number' && <ConfGauge score={confidence} onCite={onCite} />}
      </div>
      {children}
      {hint && <div className={[styles.hint, error ? styles.hintError : ''].join(' ')}>{hint} <Icon name="solar:info-circle-linear" size={11} /></div>}
    </div>
  );
}

/**
 * Source-document preview — a lightweight modal rendering a dummy
 * scanned clinical note built from the extracted values, so the View
 * (eye) icon and the field/ICD citation gauges have something to open.
 */
function DocPreview({ extracted, onClose }) {
  return (
    <div className={styles.previewOverlay} onClick={onClose}>
      <div className={styles.previewModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.previewBar}>
          <span className={styles.previewFile}>
            <Icon name="solar:document-text-linear" size={14} color="var(--primary-300)" />
            {extracted.fileName}
          </span>
          <button type="button" className={styles.previewClose} onClick={onClose} aria-label="Close preview">
            <Icon name="solar:close-circle-linear" size={18} color="var(--neutral-400)" />
          </button>
        </div>
        <div className={styles.previewSheet}>
          <div className={styles.sheetOrg}>Fold Health Medical Group</div>
          <div className={styles.sheetOrgSub}>123 Main Street · San Francisco, CA 94102 · (415) 555-0123</div>
          <h1 className={styles.sheetH1}>Clinical Progress Note</h1>
          <div className={styles.sheetMeta}>
            <div><strong>DOS:</strong> {extracted.dos}</div>
            <div><strong>Provider:</strong> {extracted.provider}</div>
            <div><strong>POS:</strong> {POS_OPTIONS.find(o => o.value === extracted.pos)?.label || extracted.pos}</div>
            <div><strong>Uploaded by:</strong> {extracted.uploadedBy}</div>
          </div>
          <div className={styles.sheetSection}>
            <h2 className={styles.sheetH2}>Assessment &amp; Plan</h2>
            <ul className={styles.sheetIcds}>
              {extracted.icds.map(icd => (
                <li key={icd.code}><strong>{icd.code}</strong> — {icd.desc} <span className={styles.sheetHcc}>({icd.hcc})</span></li>
              ))}
            </ul>
          </div>
          <div className={styles.sheetFooter}>Electronically signed · {extracted.provider} · {extracted.dos}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * One DOS block inside the Add DOS drawer. Empty state = dropzone +
 * blank fields; once a file is "uploaded" it flips to the extracted
 * state (Documents card + auto-filled fields with confidence gauges +
 * ICD list), matching Figma 4684:127213 / 4687:127406.
 */
function DosBlock({ block, onChange, onRemove, showToast }) {
  const { extracted } = block;
  const [previewOpen, setPreviewOpen] = useState(false);
  const cite = () => setPreviewOpen(true);

  const onPick = (file) => {
    // Simulate OCR extraction landing after upload.
    onChange({
      ...block,
      file: { name: file.name },
      extracting: true,
    });
    setTimeout(() => {
      onChange({
        ...block,
        file: { name: file.name },
        extracting: false,
        extracted: { ...DEMO_EXTRACTION, fileName: file.name || DEMO_EXTRACTION.fileName },
        dos: DEMO_EXTRACTION.dos,
        provider: DEMO_EXTRACTION.provider,
        pos: DEMO_EXTRACTION.pos,
        docType: DEMO_EXTRACTION.docType,
        icds: DEMO_EXTRACTION.icds,
      });
    }, 900);
  };

  return (
    <div className={styles.dosBlock}>
      <div className={styles.dosBlockHead}>
        <Icon name="solar:alt-arrow-down-linear" size={16} color="var(--neutral-400)" />
        <span className={styles.dosBlockTitle}>DOS: {block.dos || '-'}</span>
        <Badge variant="status-review" icon="solar:hourglass-line-linear" label="Not Ready" />
        <button type="button" className={styles.trashBtn} onClick={onRemove} aria-label="Remove DOS">
          <Icon name="solar:trash-bin-trash-linear" size={16} color="var(--neutral-300)" />
        </button>
      </div>

      {!extracted ? (
        <>
          <Dropzone
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            helperText="Supported formats: PDF, DOC, JPG, or PNG"
            secondaryText="Max size: 100 MB"
            icon="solar:upload-minimalistic-linear"
            onPick={onPick}
          />
          {/* One-click demo document so the extraction flow is testable
              without picking a real file from disk. */}
          <div className={styles.demoRow}>
            <span className={styles.demoLabel}>No file handy? Try a demo document:</span>
            <button type="button" className={styles.demoChip} onClick={() => onPick({ name: DEMO_EXTRACTION.fileName })}>
              <Icon name="solar:document-text-linear" size={13} color="var(--primary-300)" />
              {DEMO_EXTRACTION.fileName}
            </button>
          </div>
        </>
      ) : (
        <div className={styles.docsSection}>
          <div className={styles.docsHead}>
            <span className={styles.docsLabel}>Documents</span>
            <button type="button" className={styles.uploadLink}>
              <Icon name="solar:upload-minimalistic-linear" size={13} color="var(--primary-300)" />
              Upload
            </button>
          </div>
          <div className={styles.docCard}>
            <span className={styles.docIcon}><Icon name="solar:document-text-linear" size={16} color="var(--primary-300)" /></span>
            <div className={styles.docMeta}>
              <div className={styles.docName}>{extracted.fileName}</div>
              <div className={styles.docSub}>
                {extracted.uploadedAt} • {extracted.uploadedBy} •{' '}
                <span className={styles.docUploaded}><Icon name="solar:check-circle-bold" size={12} color="var(--status-success)" /> Uploaded 1 min ago</span>
              </div>
            </div>
            <button type="button" className={styles.docAction} aria-label="View" onClick={() => setPreviewOpen(true)}><Icon name="solar:eye-linear" size={15} color="var(--neutral-400)" /></button>
            <button type="button" className={styles.docAction} aria-label="Remove" onClick={() => onChange({ id: block.id })}><Icon name="solar:trash-bin-trash-linear" size={15} color="var(--neutral-400)" /></button>
          </div>
        </div>
      )}

      {previewOpen && extracted && (
        <DocPreview extracted={extracted} onClose={() => setPreviewOpen(false)} />
      )}

      {/* Field grid */}
      <div className={styles.grid}>
        <FieldRow label="DOS" required confidence={extracted ? extracted.dosConf : undefined} onCite={cite}>
          <Input value={block.dos || ''} placeholder="Select Date of Service" onChange={(e) => onChange({ ...block, dos: e.target.value })} />
        </FieldRow>
        <FieldRow label="Rendering Provider" required confidence={extracted ? extracted.providerConf : undefined} onCite={cite}>
          <Select options={PROVIDER_OPTIONS} value={block.provider || ''} placeholder="Select Rendering Provider" onChange={(v) => onChange({ ...block, provider: v })} />
        </FieldRow>
        <FieldRow label="POS" required confidence={extracted ? extracted.posConf : undefined} onCite={cite}>
          <Select options={POS_OPTIONS} value={block.pos || ''} placeholder="Select Place of Service" onChange={(v) => onChange({ ...block, pos: v })} />
        </FieldRow>
        <FieldRow
          label="Document Type"
          required
          confidence={extracted ? extracted.docTypeConf : undefined}
          onCite={cite}
          error={extracted && !block.docType}
          hint={extracted && !block.docType ? extracted.docTypeHint : null}
        >
          <Select options={DOC_TYPE_OPTIONS} value={block.docType || ''} placeholder="Select Document Type" onChange={(v) => onChange({ ...block, docType: v })} variant={extracted && !block.docType ? 'error' : 'default'} />
        </FieldRow>
      </div>

      {/* ICD Codes */}
      <div className={styles.icdSection}>
        <span className={styles.fieldLabel}>ICD Codes</span>
        <Input placeholder="Search and Add ICD Code & Description, HCC Code & Description" />
        {(block.icds || []).map((icd) => (
          <div key={icd.code} className={styles.icdRow}>
            <span className={styles.icdCode}>{icd.code}</span>
            <div className={styles.icdMain}>
              <div className={styles.icdDesc}>{icd.desc}</div>
              <div className={styles.icdHcc}>{icd.hcc}</div>
            </div>
            <ConfGauge score={icd.conf} onCite={cite} />
            <button type="button" className={styles.trashBtn} onClick={() => onChange({ ...block, icds: block.icds.filter(i => i.code !== icd.code) })} aria-label={`Remove ${icd.code}`}>
              <Icon name="solar:trash-bin-trash-linear" size={15} color="var(--neutral-300)" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HccAddDosDrawer() {
  const member = useAppStore(s => s.hccAddDosMember);
  const close = useAppStore(s => s.closeHccAddDos);
  const showToast = useAppStore(s => s.showToast);
  const [blocks, setBlocks] = useState([{ id: 1 }]);

  if (!member) return null;

  const canSave = blocks.some(b => b.dos && b.provider && b.pos && b.docType);

  const setBlock = (idx, next) => setBlocks(bs => bs.map((b, i) => i === idx ? next : b));
  const removeBlock = (idx) => setBlocks(bs => bs.length > 1 ? bs.filter((_, i) => i !== idx) : bs);
  const addBlock = () => setBlocks(bs => [...bs, { id: Date.now() }]);

  const doClose = () => { setBlocks([{ id: 1 }]); close(); };
  const doSave = () => {
    showToast?.(`DOS added to ${member.name}'s worklist`);
    doClose();
  };

  const headerRight = (
    <>
      <Button variant="primary" size="S" disabled={!canSave} onClick={doSave}>Save</Button>
      <span className={styles.headerDivider} />
    </>
  );

  return (
    <Drawer
      title="Add DOS"
      onClose={doClose}
      headerRight={headerRight}
      noCloseDivider
      bodyClassName={styles.body}
    >
      <div className={styles.patientHead}>
        <Avatar variant="patient" initials={member.in} />
        <div className={styles.patientText}>
          <div className={styles.patientName}>
            {member.name}
            <Icon name="solar:arrow-right-linear" size={15} color="var(--neutral-400)" />
          </div>
          <div className={styles.patientMeta}>
            {member.g} • {member.dob || '—'} ({member.age}) • Central Profile
            <Icon name="solar:alt-arrow-down-linear" size={13} color="var(--neutral-400)" />
          </div>
        </div>
      </div>

      {blocks.map((b, i) => (
        <DosBlock
          key={b.id}
          block={b}
          onChange={(next) => setBlock(i, next)}
          onRemove={() => removeBlock(i)}
          showToast={showToast}
        />
      ))}

      <button type="button" className={styles.addMore} onClick={addBlock}>
        <Icon name="solar:add-square-linear" size={15} color="var(--primary-300)" />
        Add More DOS
      </button>
    </Drawer>
  );
}
