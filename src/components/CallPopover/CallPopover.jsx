import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '../Icon/Icon';
import { CloseIcon } from '../Icon/CloseIcon';
import { Avatar } from '../Avatar/Avatar';
import { TcpaIndicator } from '../ComplianceBadges/ComplianceBadges';
import { useAppStore } from '../../store/useAppStore';
import { resolvePatientForCall } from '../../lib/patientCall';
import styles from './CallPopover.module.css';

const LANG_MAP = { en: 'English', es: 'Spanish', zh: 'Chinese', yue: 'Cantonese', ko: 'Korean', vi: 'Vietnamese', hi: 'Hindi', pa: 'Punjabi' };

export function CallPopover() {
  const closeCallPopover = useAppStore(s => s.closeCallPopover);
  const btnRef = useAppStore(s => s.callPopoverBtnRef);
  const target = useAppStore(s => s.callPopoverNumber);
  const popRef = useRef(null);

  const p = useAppStore((s) => (
    s.callPopoverPatient ? resolvePatientForCall(s, s.callPopoverPatient) : null
  ));
  const open = Boolean(p || target);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (popRef.current && !popRef.current.contains(e.target) &&
          btnRef?.current && !btnRef.current.contains(e.target)) {
        closeCallPopover();
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open, closeCallPopover, btnRef]);

  // Measure after render so the popover can flip above the button when it
  // would run past the bottom of the viewport (links low in a drawer).
  const [pos, setPos] = useState(null);
  const lineCount = useAppStore(s => s.callLines?.length);
  useLayoutEffect(() => {
    if (!open || !popRef.current) return;
    const btnRect = btnRef?.current?.getBoundingClientRect();
    if (!btnRect) { setPos({ top: 100, left: 100 }); return; }
    const { offsetWidth: w, offsetHeight: h } = popRef.current;
    let top = btnRect.bottom + 8;
    if (top + h > window.innerHeight - 8) top = Math.max(8, btnRect.top - 8 - h);
    let left = btnRect.right - w;
    if (left < 8) left = Math.min(btnRect.left, window.innerWidth - w - 8);
    setPos({ top, left });
  }, [open, btnRef, target, p, lineCount]);

  if (!open) return null;

  return (
    <div
      ref={popRef}
      className={styles.popover}
      style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: 'hidden' }}
      onClick={e => e.stopPropagation()}
    >
      {target ? <NumberCall target={target} /> : <PatientCall p={p} />}
    </div>
  );
}

/** Patient call: pick which of the patient's numbers to dial and the line to call via. */
function PatientCall({ p }) {
  const closeCallPopover = useAppStore(s => s.closeCallPopover);
  const startActiveCall = useAppStore(s => s.startActiveCall);
  const showToast = useAppStore(s => s.showToast);
  return (
    <>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Call {p.name}</div>
          <TcpaIndicator patient={p} />
          <div className={styles.sub}>Speaks: {LANG_MAP[p.language] || 'English'}</div>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={closeCallPopover}
          aria-label="Close call popover"
        >
          <CloseIcon size={18} />
        </button>
      </div>

      <div className={styles.sectionLabel}>Patient Numbers</div>

      <label className={styles.number} style={{ borderLeft: '3px solid var(--primary-300)', background: 'var(--primary-50)' }}>
        <input type="radio" name="callNum" defaultChecked />
        <div className={styles.numberInfo}>
          <div className={styles.numberValue}>(581) 824-1591</div>
          <div className={styles.numberLabel}>Primary</div>
        </div>
        <div className={styles.tags}>
          <span className={`${styles.tag} ${styles.mostUsed}`}>Most Used</span>
          <span className={`${styles.tag} ${styles.lastUsed}`}>Last Used</span>
        </div>
      </label>
      <label className={styles.number}>
        <input type="radio" name="callNum" />
        <div className={styles.numberInfo}>
          <div className={styles.numberValue}>(581) 824-1592</div>
          <div className={styles.numberLabel}>Alternate • Used once</div>
        </div>
      </label>
      <label className={styles.number}>
        <input type="radio" name="callNum" />
        <div className={styles.numberInfo}>
          <div className={styles.numberValue}>(581) 824-1593</div>
          <div className={styles.numberLabel}>Son • Albert Flores</div>
        </div>
      </label>

      <div className={styles.via}>
        Call Via <span className={styles.viaLink}>⇆ Switch Number</span>
      </div>
      <div className={styles.caller}>
        <Avatar variant="assignee" initials="RF" />
        <div className={styles.callerInfo}>
          <div className={styles.callerName}>Richard Floyd</div>
          <div className={styles.callerPhone}>(584) 451-7666</div>
        </div>
        <span className={`${styles.tag} ${styles.lastUsed}`}>Last Used</span>
      </div>
      <button
        className={styles.callBtn}
        onClick={() => {
          closeCallPopover();
          startActiveCall(p.id);
          showToast(`Calling ${p.name}...`);
        }}
      >
        <Icon name="solar:phone-calling-bold" size={18} />
        Call Now
      </button>
    </>
  );
}

/**
 * Prescriber / pharmacy call: the number is fixed, so the only choice is
 * which of the organization's call lines to call from.
 */
function NumberCall({ target }) {
  const closeCallPopover = useAppStore(s => s.closeCallPopover);
  const showToast = useAppStore(s => s.showToast);
  const callLines = useAppStore(s => s.callLines);
  const fetchCallsConfig = useAppStore(s => s.fetchCallsConfig);
  const lines = (callLines || []).filter(l => l.phoneNumber);
  const [lineId, setLineId] = useState(null);
  const selected = lines.find(l => l.id === lineId) || lines[0];

  useEffect(() => { if (!callLines?.length) fetchCallsConfig(); }, [callLines, fetchCallsConfig]);

  return (
    <>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Call {target.label || target.number}</div>
          {target.label && <div className={styles.sub}>{target.number}</div>}
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={closeCallPopover}
          aria-label="Close call popover"
        >
          <CloseIcon size={18} />
        </button>
      </div>

      <div className={styles.sectionLabel}>Call Via</div>
      {lines.length === 0 && <div className={styles.empty}>No call lines are set up yet.</div>}
      {lines.map(line => (
        <label key={line.id} className={`${styles.number} ${line === selected ? styles.numberSelected : ''}`}>
          <input type="radio" name="callLine" checked={line === selected} onChange={() => setLineId(line.id)} />
          <div className={styles.numberInfo}>
            <div className={styles.numberValue}>{line.phoneNumber}</div>
            <div className={styles.numberLabel}>{lineName(line)}</div>
          </div>
        </label>
      ))}

      <button
        className={styles.callBtn}
        disabled={!selected}
        onClick={() => {
          closeCallPopover();
          target.onDial?.();
          showToast(`Calling ${target.label || target.number} from the ${lineName(selected)} line...`);
        }}
      >
        <Icon name="solar:phone-calling-bold" size={18} />
        Call Now
      </button>
    </>
  );
}

// Stored line labels repeat the number after a dash; the row shows the number on its own.
function lineName(line) {
  return line.label.split(/\s[\u2014-]\s/)[0];
}
