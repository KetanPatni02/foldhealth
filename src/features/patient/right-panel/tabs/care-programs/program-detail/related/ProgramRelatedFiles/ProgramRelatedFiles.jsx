import { useState } from 'react';
import { Icon } from '../../../../../../../../components/Icon/Icon';
import { Button } from '../../../../../../../../components/Button/Button';
import { ActionButton } from '../../../../../../../../components/ActionButton/ActionButton';
import { Checkbox } from '../../../../../../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { PROGRAM_FILES_MOCK } from '../../../../../../data/programFilesMock';
import styles from './ProgramRelatedFiles.module.css';

const SUB_TABS = ['Program Related', 'All Documents'];

export function ProgramRelatedFiles() {
  const [activeTab, setActiveTab] = useState('Program Related');
  const [view, setView] = useState('list');
  const [selected, setSelected] = useState(() => new Set());

  const rows = PROGRAM_FILES_MOCK;
  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.id));
  const someSelected = rows.some(r => selected.has(r.id)) && !allSelected;
  const toggleAll = () => setSelected(prev => (prev.size === rows.length ? new Set() : new Set(rows.map(r => r.id))));
  const toggleOne = (id) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className={styles.container}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <ActionButton icon="solar:magnifer-linear" size="S" tooltip="Search" />
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
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${view === 'list' ? styles.viewBtnActive : ''}`}
            onClick={() => setView('list')}
            aria-label="List view"
          >
            <Icon name="solar:list-linear" size={16} color={view === 'list' ? 'var(--primary-300)' : 'var(--neutral-300)'} />
          </button>
          <button
            className={`${styles.viewBtn} ${view === 'grid' ? styles.viewBtnActive : ''}`}
            onClick={() => setView('grid')}
            aria-label="Grid view"
          >
            <Icon name="solar:widget-linear" size={16} color={view === 'grid' ? 'var(--primary-300)' : 'var(--neutral-300)'} />
          </button>
        </div>
        <Button variant="tertiary" size="S" leadingIcon="solar:upload-minimalistic-linear">Upload File</Button>
        <span className={styles.tabDivider} />
        <ActionButton icon="solar:filter-linear" size="S" tooltip="Filter" />
      </div>

      {/* Table */}
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
    </div>
  );
}
