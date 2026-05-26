import { useState } from 'react';
import { ApcmBillingTable } from '../apcm-billing/ApcmBillingTable';
import styles from './BillingPanel.module.css';

const TABS = [
  { key: 'apcm', label: 'APCM' },
];

export function BillingPanel() {
  const [activeTab, setActiveTab] = useState('apcm');

  return (
    <div className={styles.panel}>
      <div className={styles.tabBar}>
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
      <div className={styles.content}>
        {activeTab === 'apcm' && <ApcmBillingTable />}
      </div>
    </div>
  );
}
