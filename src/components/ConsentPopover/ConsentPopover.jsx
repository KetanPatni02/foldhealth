import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon/Icon';
import { ActionButton } from '../ActionButton/ActionButton';
import { Switch } from '../Switch/Switch';
import styles from './ConsentPopover.module.css';

const SECTIONS = [
  {
    id: 'program',
    title: 'Program Consent',
    items: [
      { id: 'ccm',  label: 'CCM Consent',  status: 'Consent Withdrawn', date: '09/11/2024 9:30 AM' },
      { id: 'apcm', label: 'APCM Consent', status: 'Consent Given',     date: '09/11/2024 9:30 AM' },
    ],
  },
  {
    id: 'communication',
    title: 'Communication Consent',
    sectionToggle: true,
    items: [
      { id: 'call',  label: 'Call Consent',   status: 'Consent Not Given' },
      { id: 'sms',   label: 'SMS Consent',    status: 'Consent Not Given' },
      { id: 'email', label: 'Emails Consent', status: 'Consent Not Given' },
    ],
  },
  {
    id: 'other',
    title: 'Other Consents',
    items: [
      { id: 'data', label: 'Data Sharing Consent', status: 'Consent Given', date: '09/11/2024 9:30 AM' },
    ],
  },
];

const INITIAL_TOGGLES = (() => {
  const m = {};
  SECTIONS.forEach(s => {
    if (s.sectionToggle) m[s.id] = true;
    s.items.forEach(item => { m[item.id] = true; });
  });
  return m;
})();

export function ConsentPopover({ pos, onClose }) {
  const ref = useRef(null);
  const [toggles, setToggles] = useState(INITIAL_TOGGLES);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const raf = requestAnimationFrame(() => document.addEventListener('mousedown', handler));
    return () => { cancelAnimationFrame(raf); document.removeEventListener('mousedown', handler); };
  }, [onClose]);

  const flip = (id) => setToggles(prev => ({ ...prev, [id]: !prev[id] }));

  return createPortal(
    <div ref={ref} className={styles.popover} style={{ top: pos.top, left: pos.left }}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Patient Consent</span>
        <ActionButton icon="solar:history-linear" size="S" tooltip="Audit Log" />
      </div>

      <div className={styles.body}>
        {SECTIONS.flatMap((section, si) => {
          const parts = [];
          if (si > 0) parts.push(<div key={`div-${section.id}`} className={styles.divider} />);
          parts.push(
            <div key={section.id} className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>{section.title}</span>
                {section.sectionToggle && (
                  <Switch checked={toggles[section.id]} onChange={() => flip(section.id)} />
                )}
              </div>
              {section.items.map(item => (
                <div key={item.id} className={styles.row}>
                  <div className={styles.rowCheck}>
                    <Icon name="solar:check-circle-bold" size={12} color="var(--status-success)" />
                  </div>
                  <div className={styles.rowText}>
                    <span className={styles.rowLabel}>{item.label}</span>
                    <span className={styles.rowStatus}>
                      {item.status}{item.date ? ` • ${item.date}` : ''}
                    </span>
                  </div>
                  <Switch checked={toggles[item.id]} onChange={() => flip(item.id)} />
                </div>
              ))}
            </div>
          );
          return parts;
        })}
      </div>
    </div>,
    document.body
  );
}
