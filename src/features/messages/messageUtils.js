export function getInitials(profile) {
  if (!profile) return '?';
  if (profile.first_name && profile.last_name)
    return (profile.first_name[0] + profile.last_name[0]).toUpperCase();
  if (profile.full_name)
    return profile.full_name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  if (profile.email) return profile.email.slice(0, 2).toUpperCase();
  return '?';
}

export function getDisplayName(profile) {
  if (!profile) return 'Unknown';
  if (profile.first_name && profile.last_name) return `${profile.first_name} ${profile.last_name}`;
  if (profile.full_name) return profile.full_name;
  return profile.email?.split('@')[0] || 'Unknown';
}

export function formatTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatMsgTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function shouldShowTimestamp(msg, prevMsg) {
  if (!prevMsg) return true;
  return new Date(msg.created_at) - new Date(prevMsg.created_at) > 5 * 60 * 1000;
}
