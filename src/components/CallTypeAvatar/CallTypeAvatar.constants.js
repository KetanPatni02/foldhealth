export const DIR_ICON = {
  outgoing: { icon: 'solar:outgoing-call-rounded-linear', color: 'var(--primary-300)',        bg: 'var(--primary-100)',        border: 'var(--primary-200)' },
  incoming: { icon: 'solar:incoming-call-rounded-linear', color: 'var(--status-success)',     bg: 'rgba(5, 150, 105, 0.1)',   border: 'rgba(5, 150, 105, 0.2)' },
  answered: { icon: 'solar:phone-calling-linear',         color: 'var(--status-success)',     bg: 'rgba(5, 150, 105, 0.1)',   border: 'rgba(5, 150, 105, 0.2)' },
  missed:   { isMissed: true,                             color: 'var(--status-error)',       bg: 'rgba(220, 38, 38, 0.1)',    border: 'rgba(220, 38, 38, 0.2)' },
  declined: { isDeclined: true,                           color: 'var(--neutral-300)',       bg: 'var(--neutral-50)',         border: 'var(--neutral-150)' },
};

export const DIR_LABEL = {
  outgoing: 'Outgoing',
  incoming: 'Incoming',
  missed:   'Missed',
  answered: 'Answered',
  declined: 'Declined',
};
