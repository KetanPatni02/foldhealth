import styles from './Avatar.module.css';

export function Avatar({ variant = 'patient', initials, agentName, size, icon, backgroundColor, borderColor, color, className }) {
  const agentKey = agentName ? agentName.toLowerCase() : '';
  
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
      <div className={[styles.provider, className || ''].filter(Boolean).join(' ')} style={style}>
        {initials}
      </div>
    );
  }
  if (variant === 'assignee') {
    return <div className={[styles.assignee, className || ''].filter(Boolean).join(' ')}>{initials}</div>;
  }
  if (variant === 'callCard') {
    return <div className={[styles.callCard, className || ''].filter(Boolean).join(' ')}>{initials}</div>;
  }
  const sizeClass = size === 'lg' ? styles.lg : '';
  return (
    <div className={[styles.patient, sizeClass, className || ''].filter(Boolean).join(' ')}>{initials}</div>
  );
}
