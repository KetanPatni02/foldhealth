import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './ProfilePopover.module.css';

const PROFILES = [
  {
    id: 'central',
    name: 'Central Profile',
    subLabel: 'Athena ID:  939393939393',
    variant: 'selected',
  },
  {
    id: 'jade',
    name: 'JADE Health',
    subLabel: 'Member ID: 939393939393',
    variant: 'teal',
    details: [
      { label: 'Enrolled on', value: '02/01/2025' },
      { label: 'Insurance',   value: 'LOB008' },
      { label: 'HP Code',     value: 'MOLS' },
    ],
    footer: { label: 'HP Description', value: 'SCAN Insurance Handler' },
  },
  {
    id: 'ccpp',
    name: 'CCPP Health',
    subLabel: 'Member ID: 939393939393',
    variant: 'gold',
    details: [
      { label: 'Enrolled on', value: '02/01/2025' },
      { label: 'Insurance',   value: 'LOB008' },
      { label: 'HP Code',     value: 'MOLS' },
    ],
    footer: { label: 'HP Description', value: 'SCAN Insurance Handler' },
  },
];

function RadioCheck({ checked }) {
  return (
    <div className={`${styles.radio} ${checked ? styles.radioChecked : ''}`}>
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.5 6l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

export function ProfilePopover({ pos, selectedId, onSelect, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const raf = requestAnimationFrame(() => document.addEventListener('mousedown', handler));
    return () => { cancelAnimationFrame(raf); document.removeEventListener('mousedown', handler); };
  }, [onClose]);

  return createPortal(
    <div ref={ref} className={styles.popover} style={{ top: pos.top, left: pos.left }}>
      <span className={styles.title}>Member Insurance Profiles</span>

      <div className={styles.cards}>
        {PROFILES.map(profile => (
          <div
            key={profile.id}
            className={`${styles.card} ${styles[`card_${profile.variant}`]} ${selectedId === profile.id ? styles.card_active : ''}`}
            onClick={() => onSelect(profile.id)}
          >
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderText}>
                <span className={styles.cardName}>{profile.name}</span>
                <span className={styles.cardSub}>{profile.subLabel}</span>
              </div>
              <RadioCheck checked={selectedId === profile.id} />
            </div>

            {profile.details && (
              <>
                <div className={styles.detailsRow}>
                  {profile.details.map((d, i) => (
                    <div key={d.label} className={styles.detailsGroup}>
                      {i > 0 && <span className={styles.detailDivider} />}
                      <div className={styles.detailCell}>
                        <span className={styles.detailLabel}>{d.label}</span>
                        <span className={styles.detailValue}>{d.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={styles.cardFooter}>
                  <span className={styles.detailLabel}>{profile.footer.label}</span>
                  <span className={styles.detailValue}>{profile.footer.value}</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}
