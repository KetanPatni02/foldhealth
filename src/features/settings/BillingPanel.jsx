import { useState } from 'react';
import { ApcmBillingTable } from '../apcm-billing/ApcmBillingTable';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { SectionTitleBar } from '../../components/SectionTitleBar/SectionTitleBar';
import styles from './BillingPanel.module.css';

const TABS = [
  { key: 'apcm', label: 'APCM Billing' },
];

export function BillingPanel() {
  const [activeTab, setActiveTab] = useState('apcm');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className={styles.wrapper}>
      <SectionTitleBar
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showSearch
        searchPlaceholder="Search member, ID, or EHR ID…"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        showFilter
        filterActive={filtersOpen}
        onFilter={() => setFiltersOpen(o => !o)}
        rightExtras={
          <ActionButton icon="solar:upload-minimalistic-linear" size="L" tooltip="Export" onClick={() => {}} />
        }
      />

      <div className={styles.content}>
        {activeTab === 'apcm' && <ApcmBillingTable searchQuery={searchQuery} filtersOpen={filtersOpen} />}
      </div>
    </div>
  );
}
