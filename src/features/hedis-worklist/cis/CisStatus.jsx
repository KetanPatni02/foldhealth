import { Badge } from '../../../components/Badge/Badge';

// `hideIcon` drops the leading status icon (colour + label still carry it).
export function CisStatusBadge({ map, status, size = 'S', label, hideIcon = false }) {
  const cfg = map[status] || { tone: 'grey', icon: 'solar:info-circle-linear' };
  return <Badge tone={cfg.tone} size={size} icon={hideIcon ? undefined : cfg.icon} label={label ?? status} />;
}
