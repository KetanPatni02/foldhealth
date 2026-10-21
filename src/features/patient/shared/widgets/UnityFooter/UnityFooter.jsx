import { Fragment } from 'react';
import { Icon } from '../../../../../components/Icon/Icon';
import UnityAILogo from '../../../../../assets/unity-ai-logo.svg';
import styles from './UnityFooter.module.css';

/**
 * One-line footer for a Unity-generated section (Health Map, Patient
 * Synopsis): the Unity mark, who can see it and when it was generated, and
 * the section's feedback actions on the right. `visibility` is 'internal'
 * (staff only) or 'shared' (shared with the patient); omit it to hide the cue.
 */
export function UnityFooter({ visibility, generatedOn, generatedBy, actions }) {
  const parts = [
    visibility === 'internal' && (
      <span className={styles.visibility}><Icon name="solar:lock-keyhole-linear" size={12} color="currentColor" />Internal use only</span>
    ),
    visibility === 'shared' && (
      <span className={styles.visibility}><Icon name="solar:share-linear" size={12} color="currentColor" />Shared with patient</span>
    ),
    generatedOn,
    generatedBy,
  ].filter(Boolean);

  return (
    <div className={styles.footer}>
      <div className={styles.left}>
        <span className={styles.brand}>
          <img src={UnityAILogo} width={14} height={14} alt="" />
          <span className={styles.unity}>Unity</span>
          <span className={styles.alpha}>Alpha</span>
        </span>
        {parts.map((p, i) => (
          // Parts are positional and never reorder.
          <Fragment key={i}>
            <span className={styles.dot} aria-hidden="true">•</span>
            <span className={styles.part}>{p}</span>
          </Fragment>
        ))}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
