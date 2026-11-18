import { Badge } from '../../../components/Badge/Badge';

// Status badges are text only (colour + label carry the status); pass
// `hideIcon={false}` to show the leading icon.
export function CisStatusBadge({ map, status, size = 'sm', label, hideIcon = true }) {
  const cfg = map[status] || { tone: 'neutral', icon: 'solar:info-circle-linear' };
  return <Badge tone={cfg.tone} size={size} icon={hideIcon ? undefined : cfg.icon} label={label ?? status} />;
}
