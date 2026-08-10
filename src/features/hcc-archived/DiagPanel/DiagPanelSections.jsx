import { useMemo, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Icon } from '../../../components/Icon/Icon';
import { IcdRow } from './IcdRow';
import { SweepIcdRow } from './SweepIcdRow';
import { getSweepIcdsForMember } from '../data/sweepIcds';
import styles from './DiagPanel.module.css';

  const acceptHccGap = useAppStore(s => s.acceptHccGap);
  const dismissHccGap = useAppStore(s => s.dismissHccGap);
  const sweepIcds = useMemo(() => getSweepIcdsForMember(memberName), [memberName]);

  return (
    <div className={styles.sweepWrap}>
      <div className={styles.sweepBanner}>
        <Icon name="solar:info-circle-linear" size={12} color="var(--status-warning)" />
        <span>Deduplicated across all DOSs — showing most recent DOS per ICD.</span>
      </div>
      <div className={styles.sweepHeaderRow}>
        <div className={styles.sweepHeaderCode}>Code</div>
        <div className={styles.sweepHeaderDesc}>Description + DOS(s)</div>
        <div className={styles.sweepHeaderActions}>Actions</div>
      </div>
      <div className={styles.sweepList}>
        {sweepIcds.map((icd) => (
          <SweepIcdRow
            key={icd.code}
            icd={icd}
            dosList={dosList}
            onAccept={acceptHccGap}
            onDismiss={dismissHccGap}
          />
        ))}
      </div>
    </div>
  );
}

// ── IcdSections — "View by: ICD" mode (default). Mirrors the prototype's
// 4-section structure (lines 3106–3217):
//   1. Associated with DOS (N)
//   2. Not Associated with DOS (N) — with "✦ Unity Suggested" badge
//   3. Overridden ICDs (N)
//   4. Closed ICDs (N)
// Each section is collapsible; the first two open by default.
export function IcdSections({ assocICDs, allNotAssoc, overriddenICDs, closedICDs }) {
  const [assocOpen, setAssocOpen] = useState(true);
  const [notAssocOpen, setNotAssocOpen] = useState(true);
  const [overriddenOpen, setOverriddenOpen] = useState(false);
  const [closedOpen, setClosedOpen] = useState(false);

  return (
    <div className={styles.icdSections}>
      <IcdSection
        title="Associated with DOS"
        count={assocICDs.length}
        open={assocOpen}
        onToggle={() => setAssocOpen(o => !o)}
      >
        {assocICDs.length === 0
          ? <SectionEmpty label="No associated ICDs" />
          : assocICDs.map((icd, i) => <IcdRow key={`a-${icd.code}-${i}`} icd={icd} />)
        }
      </IcdSection>

      <IcdSection
        title="Not Associated with DOS"
        count={allNotAssoc.length}
        open={notAssocOpen}
        onToggle={() => setNotAssocOpen(o => !o)}
        badge={(
          <span className={styles.unitySuggestedBadge}>
            <Icon name="solar:star-bold" size={9} color="var(--primary-300)" />
            <span>Unity Suggested</span>
          </span>
        )}
      >
        {allNotAssoc.length === 0
          ? <SectionEmpty label="No unlinked ICDs" />
          : allNotAssoc.map((icd, i) => <IcdRow key={`u-${icd.code}-${i}`} icd={icd} />)
        }
      </IcdSection>

      <IcdSection
        title="Overridden ICDs"
        count={overriddenICDs.length}
        open={overriddenOpen}
        onToggle={() => setOverriddenOpen(o => !o)}
      >
        {overriddenICDs.length === 0
          ? <SectionEmpty label="No overridden ICDs" />
          : overriddenICDs.map((icd, i) => <IcdRow key={`o-${icd.code}-${i}`} icd={icd} />)
        }
      </IcdSection>

      <IcdSection
        title="Closed ICDs"
        count={closedICDs.length}
        open={closedOpen}
        onToggle={() => setClosedOpen(o => !o)}
      >
        {closedICDs.length === 0
          ? <SectionEmpty label="No closed ICDs" />
          : closedICDs.map((icd, i) => <IcdRow key={`c-${icd.code}-${i}`} icd={icd} />)
        }
      </IcdSection>
    </div>
  );
}

// Section wrapper — collapsible header + content area
export function IcdSection({ title, count, open, onToggle, badge, children }) {
  return (
    <section className={styles.icdSection}>
      <button type="button" className={styles.icdSectionHeader} onClick={onToggle}>
        <span className={styles.icdSectionTitle}>
          {title} ({count})
        </span>
        {badge}
        <Icon
          name={open ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'}
          size={12}
          color="var(--neutral-300)"
        />
      </button>
      {open && (
        <div className={styles.icdSectionBody}>
          {children}
        </div>
      )}
    </section>
  );
}

export function SectionEmpty({ label }) {
  return <div className={styles.icdSectionEmpty}>{label}</div>;
}
