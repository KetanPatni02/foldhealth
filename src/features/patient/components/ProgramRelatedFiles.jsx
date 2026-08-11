import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/Button/Button';
import { Icon } from '../../../components/Icon/Icon';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Toggle } from '../../../components/Toggle/Toggle';
import { SearchBar } from '../../../components/SearchBar/SearchBar';
import { Checkbox } from '../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { DocumentUploader } from '../../../components/DocumentUploader/DocumentUploader';
import { RingEmptyState } from '../../../components/RingEmptyState/RingEmptyState';
import { useAppStore } from '../../../store/useAppStore';
import styles from './ProgramRelatedFiles.module.css';

const SUB_TABS = ['Program Related', 'All Documents'];

const VIEW_ITEMS = [
  { key: 'list', icon: 'solar:list-linear' },
  { key: 'grid', icon: 'solar:widget-linear' },
];

const todayMMDDYYYY = () => {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
};

/**
 * Program Documents step — a patient's document library. Empty by default;
 * documents accrue as the user uploads them via the inline DocumentUploader
 * (opened by the "Upload File" toolbar button). Uploaded docs persist to the
 * `program_documents` table, scoped by programCode + patientId.
 *
 * Toolbar/search/tab formatting mirrors the Letters step; the view Toggle
 * switches between the list table and a card grid (doc cards match the Add
 * Letter card layout).
 */
export function ProgramRelatedFiles({ programCode, patientId }) {
  const [activeTab, setActiveTab] = useState('Program Related');
  const [view, setView] = useState('list');
  const [selected, setSelected] = useState(() => new Set());
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const fetchProgramDocuments = useAppStore(s => s.fetchProgramDocuments);
  const addProgramDocument = useAppStore(s => s.addProgramDocument);
  const programDocuments = useAppStore(s => s.programDocuments);
  useEffect(() => { fetchProgramDocuments(); }, [fetchProgramDocuments]);

  const docs = useMemo(() => programDocuments.filter(d =>
    d.programCode === programCode
    && (patientId == null || String(d.patientId) === String(patientId))
  ), [programDocuments, programCode, patientId]);

  const q = searchText.trim().toLowerCase();
  const rows = useMemo(
    () => (q ? docs.filter(d => (d.name || '').toLowerCase().includes(q)) : docs),
    [docs, q],
  );

  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.id));
  const someSelected = rows.some(r => selected.has(r.id)) && !allSelected;
  const toggleAll = () => setSelected(prev => (prev.size === rows.length ? new Set() : new Set(rows.map(r => r.id))));
  const toggleOne = (id) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const handleUpload = ({ file, caption, category, status }) => {
    addProgramDocument({
      id: `pd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      programCode,
      patientId: patientId != null ? String(patientId) : null,
      name: caption || file.name,
      type: category,
      status,
      sizeBytes: file.size,
      updatedBy: 'You',
      updatedDate: todayMMDDYYYY(),
    });
    setUploaderOpen(false);
  };

  return (
    <div className={styles.container}>
      {/* Toolbar — mirrors the Letters step formatting. */}
      <div className={styles.toolbar}>
        {searchOpen ? (
          <div className={styles.searchWrap}>
            <SearchBar
              fullWidth
              placeholder="Search documents"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onClose={() => { setSearchOpen(false); setSearchText(''); }}
            />
          </div>
        ) : (
          <>
            <ActionButton icon="solar:magnifer-linear" size="S" tooltip="Search" onClick={() => setSearchOpen(true)} />
            <span className={styles.tabDivider} />
            {SUB_TABS.map(tab => (
              <button
                key={tab}
                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
            <div className={styles.spacer} />
          </>
        )}
        <Toggle size="S" items={VIEW_ITEMS} active={view} onChange={setView} />
        <Button
          variant="tertiary"
          size="S"
          leadingIcon="solar:upload-minimalistic-linear"
          onClick={() => setUploaderOpen(v => !v)}
        >
          Upload File
        </Button>
        <span className={styles.tabDivider} />
        <ActionButton icon="solar:filter-linear" size="S" tooltip="Filter" />
      </div>

      {uploaderOpen && (
        <div className={styles.uploaderWrap}>
          <DocumentUploader onSubmit={handleUpload} onCancel={() => setUploaderOpen(false)} />
        </div>
      )}

      {rows.length === 0 ? (
        <div className={styles.empty}>
          <RingEmptyState icon="solar:file-text-linear" label={q ? 'No Documents Found' : 'No Documents Added'} />
        </div>
      ) : view === 'grid' ? (
        <div className={styles.grid}>
          {rows.map(f => (
            <div key={f.id} className={styles.card}>
              <div className={styles.cardThumb}>
                <Icon name="solar:file-text-linear" size={40} color="var(--neutral-200)" />
              </div>
              <div className={styles.cardFooter}>
                <span className={styles.cardName}>{f.name}</span>
                <span className={styles.cardType}>{f.type}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.headRow}>
            <span className={styles.checkCell}>
              <Checkbox checked={someSelected ? 'indeterminate' : allSelected} onCheckedChange={toggleAll} aria-label="Select all files" />
            </span>
            <span className={styles.nameCell}>File Name</span>
            <span className={styles.typeCell}>File Type</span>
            <span className={styles.updatedCell}>Last Updated</span>
          </div>
          {rows.map(f => (
            <div key={f.id} className={styles.row}>
              <span className={styles.checkCell}>
                <Checkbox checked={selected.has(f.id)} onCheckedChange={() => toggleOne(f.id)} aria-label={`Select ${f.name}`} />
              </span>
              <span className={styles.nameCell}>{f.name}</span>
              <span className={styles.typeCell}>{f.type}</span>
              <span className={styles.updatedCell}>
                <span className={styles.updatedBy}>{f.updatedBy}</span>
                <span className={styles.updatedDate}>{f.updatedDate}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
