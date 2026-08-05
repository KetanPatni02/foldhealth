import { useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { Button } from '../../../components/Button/Button';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Checkbox } from '../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { REFERRAL_REVIEW_MOCK } from '../data/referralReviewMock';
import styles from './ReferralReview.module.css';

const SUB_TABS = ['Program Related', 'All Referrals'];

// Status → text tone. "Signed & Referred" reads as an in-progress (amber) state.
const STATUS_TONE = {
  'Signed & Referred': styles.statusWarning,
  Completed: styles.statusSuccess,
  Pending: styles.statusWarning,
  Declined: styles.statusError,
};

export function ReferralReview() {
  const [activeTab, setActiveTab] = useState('Program Related');
  const [selected, setSelected] = useState(() => new Set());

  const rows = REFERRAL_REVIEW_MOCK;
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
        <Button variant="tertiary" size="S" leadingIcon="solar:add-circle-linear" trailingIcon="solar:alt-arrow-down-linear">
          New Order
        </Button>
        <span className={styles.tabDivider} />
        <ActionButton icon="solar:filter-linear" size="S" tooltip="Filter" />
      </div>

      {/* Table */}
      <div className={styles.table}>
        <div className={styles.headRow}>
          <span className={styles.checkCell}>
            <Checkbox checked={someSelected ? 'indeterminate' : allSelected} onCheckedChange={toggleAll} aria-label="Select all referrals" />
          </span>
          <span className={styles.providerCell}>Referred By</span>
          <span className={styles.providerCell}>Referred To</span>
          <span className={styles.statusCell}>Status</span>
          <span className={styles.attachCell}>Attachment</span>
          <span className={styles.createdCell}>Created On</span>
        </div>
        {rows.map(r => (
          <div key={r.id} className={styles.row}>
            <span className={styles.checkCell}>
              <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleOne(r.id)} aria-label={`Select referral to ${r.referredToName}`} />
            </span>
            <span className={styles.providerCell}>
              <span className={styles.providerName}>{r.referredByName}</span>
              <span className={styles.providerRole}>{r.referredByRole}</span>
            </span>
            <span className={styles.providerCell}>
              <span className={styles.providerName}>{r.referredToName}</span>
              <span className={styles.providerRole}>{r.referredToRole}</span>
            </span>
            <span className={`${styles.statusCell} ${STATUS_TONE[r.status] || ''}`}>{r.status}</span>
            <span className={styles.attachCell}>
              {r.attachments > 0 ? (
                <span className={styles.attachChip}>
                  <Icon name="solar:paperclip-linear" size={14} color="var(--neutral-300)" />
                  {r.attachments} Attachment{r.attachments === 1 ? '' : 's'}
                </span>
              ) : <span className={styles.muted}>—</span>}
            </span>
            <span className={styles.createdCell}>{r.createdOn}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
