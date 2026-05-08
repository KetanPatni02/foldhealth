import { Icon as IconifyIcon } from '@iconify/react';
import { FilterIcon } from './FilterIcon';
import { SmsIcon } from './SmsIcon';
import { ExpandDrawerIcon } from './ExpandDrawerIcon';
import { CampaignIcon } from './CampaignIcon';
import { CampaignBoldIcon } from './CampaignBoldIcon';

export function Icon({ name, size = 18, color, style, className }) {
  if (name === 'custom:filter') return <FilterIcon size={size} color={color} />;
  if (name === 'custom:sms') return <SmsIcon size={size} color={color} />;
  if (name === 'custom:expand-drawer') return <ExpandDrawerIcon size={size} />;
  if (name === 'custom:campaign') return <CampaignIcon size={size} color={color} />;
  if (name === 'custom:campaign-bold') return <CampaignBoldIcon size={size} color={color} />;
  return (
    <IconifyIcon
      icon={name}
      width={size}
      height={size}
      color={color}
      style={style}
      className={className}
    />
  );
}
