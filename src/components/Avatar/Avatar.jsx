import styles from './Avatar.module.css';

// Wrap the rendered avatar in a locked container when a caller passes
// `locked` — greys the avatar out and stamps a lock badge (white rounded
// square + outlined red lock) on the bottom-right corner. Matches the HCC
// "record rejected" treatment (Figma spec).
function LockedWrapper({ locked, children, className }) {
  if (!locked) return children;
  return (
    <span className={[styles.lockedWrap, className || ''].filter(Boolean).join(' ')}>
      {children}
      <span className={styles.lockBadge} aria-label="Locked — record rejected">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="12" height="12" rx="2" fill="white" />
          <path
            d="M3 5V4C3 2.34315 4.34315 1 6 1C7.65685 1 9 2.34315 9 4V5M4 11H8C9.41421 11 10.1213 11 10.5607 10.5607C11 10.1213 11 9.41421 11 8C11 6.58579 11 5.87868 10.5607 5.43934C10.1213 5 9.41421 5 8 5H4C2.58579 5 1.87868 5 1.43934 5.43934C1 5.87868 1 6.58579 1 8C1 9.41421 1 10.1213 1.43934 10.5607C1.87868 11 2.58579 11 4 11ZM7 8C7 8.55228 6.55228 9 6 9C5.44772 9 5 8.55228 5 8C5 7.44772 5.44772 7 6 7C6.55228 7 7 7.44772 7 8Z"
            stroke="var(--status-error)"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </span>
  );
}

export function Avatar({ variant = 'patient', initials, agentName, size, icon, backgroundColor, borderColor, color, className, locked = false }) {
  const agentKey = agentName ? agentName.toLowerCase() : '';
  const lockedClass = locked ? styles.locked : '';
  
  if (variant === 'generic' || variant === 'icon') {
    return (
      <div 
        className={[styles.generic, className || ''].filter(Boolean).join(' ')}
        style={{ 
          background: backgroundColor, 
          borderColor: borderColor, 
          color: color,
          width: size,
          height: size
        }}
      >
        {icon || initials}
      </div>
    );
  }

  if (variant === 'agent') {
    const hasGradient = ['erica', 'ricardo', 'maria', 'jia', 'dubois'].includes(agentKey);
    return (
      <div className={[styles.agent, styles[agentKey], className || ''].filter(Boolean).join(' ')}>
        {!hasGradient && initials}
      </div>
    );
  }
  if (variant === 'invokeAgent') {
    return <div className={[styles.invokeAgent, styles[agentKey], className || ''].filter(Boolean).join(' ')} />;
  }
  if (variant === 'provider') {
    // Honor a numeric `size` override so callers can render a compact
    // provider chip (e.g. 24×24) without duplicating the variant. Font
    // scales at ~44% of size (matches the default 14px / 32px ratio) with
    // a 10px floor so short initials don't disappear.
    const style = typeof size === 'number'
      ? { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.44)) }
      : undefined;
    return (
      <LockedWrapper locked={locked}>
        <div className={[styles.provider, lockedClass, className || ''].filter(Boolean).join(' ')} style={style}>
          {initials}
        </div>
      </LockedWrapper>
    );
  }
  if (variant === 'assignee') {
    return (
      <LockedWrapper locked={locked}>
        <div className={[styles.assignee, lockedClass, className || ''].filter(Boolean).join(' ')}>{initials}</div>
      </LockedWrapper>
    );
  }
  if (variant === 'callCard') {
    return <div className={[styles.callCard, className || ''].filter(Boolean).join(' ')}>{initials}</div>;
  }
  const sizeClass = size === 'lg' ? styles.lg : '';
  return (
    <LockedWrapper locked={locked}>
      <div className={[styles.patient, sizeClass, lockedClass, className || ''].filter(Boolean).join(' ')}>{initials}</div>
    </LockedWrapper>
  );
}
