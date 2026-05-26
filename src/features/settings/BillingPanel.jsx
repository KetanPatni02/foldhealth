import { useState } from 'react';
import { ApcmBillingTable } from '../apcm-billing/ApcmBillingTable';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Icon } from '../../components/Icon/Icon';
import { SearchIconButton } from '../../components/SearchIconButton/SearchIconButton';
import styles from './BillingPanel.module.css';

const TABS = [
  { key: 'apcm', label: 'APCM Billing' },
];

export function BillingPanel() {
  const [activeTab, setActiveTab] = useState('apcm');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className={styles.wrapper}>
      {/* Tab bar mirrors AccountPanel — tabs on the left, action buttons
          (Search / Filter / Export) on the right. */}
      <div className={styles.tabBar}>
        <div className={styles.tabs}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={[styles.tab, activeTab === tab.key ? styles.tabActive : ''].filter(Boolean).join(' ')}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.tabActions}>
          <div className={styles.searchWrap}>
            {searchOpen ? (
              <div className={styles.searchInput}>
                <Icon name="solar:magnifer-linear" size={15} color="var(--neutral-300)" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search member, ID…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.searchClose}
                  onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                  aria-label="Close search"
                >&#x2715;</button>
              </div>
            ) : (
              <SearchIconButton title="Search" onClick={() => setSearchOpen(true)} />
            )}
          </div>
          <ActionButton icon="custom:filter" size="L" tooltip="Filter" onClick={() => {}} />
          <ActionButton icon="solar:upload-minimalistic-linear" size="L" tooltip="Export" onClick={() => {}} />
        </div>
      </div>

      <div className={styles.content}>
        {activeTab === 'apcm' && <ApcmBillingTable searchQuery={searchQuery} />}
      </div>
    </div>
  );
}
