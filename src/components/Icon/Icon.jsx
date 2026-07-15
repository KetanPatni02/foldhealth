import { Icon as IconifyIcon } from '@iconify/react';
import { FilterIcon } from './FilterIcon';
import { SmsIcon } from './SmsIcon';
import { ExpandDrawerIcon } from './ExpandDrawerIcon';
import { CallPcpIcon } from './CallPcpIcon';
import { PdfFileIcon } from './PdfFileIcon';
import { CampaignIcon } from './CampaignIcon';
import { CampaignBoldIcon } from './CampaignBoldIcon';
import { PhoneLinearIcon } from './PhoneLinearIcon';
import { PhoneCallingLinearIcon } from './PhoneCallingLinearIcon';
import { CallHistoryIcon } from './CallHistoryIcon';
import { IncomingCallIcon } from './IncomingCallIcon';
import { OutgoingCallIcon } from './OutgoingCallIcon';
import { EndCallIcon } from './EndCallIcon';
import { RefreshIcon } from './RefreshIcon';
import { MenuDotsIcon } from './MenuDotsIcon';
import { HistoryIcon } from './HistoryIcon';
import { ExportIcon } from './ExportIcon';
import { AddDosIcon } from './AddDosIcon';
import { CollapseSidebarIcon } from './CollapseSidebarIcon';
import { BulkSelectIcon } from './BulkSelectIcon';
import { BulkSelectCloseIcon } from './BulkSelectCloseIcon';
import { UploadIcon } from './UploadIcon';

export function Icon({ name, size = 18, color, style, className }) {
  if (name === 'custom:filter') return <FilterIcon size={size} color={color} />;
  if (name === 'custom:menu-dots') return <MenuDotsIcon size={size} color={color} />;
  if (name === 'custom:history') return <HistoryIcon size={size} color={color} />;
  if (name === 'custom:export') return <ExportIcon size={size} color={color} />;
  if (name === 'custom:add-dos') return <AddDosIcon size={size} color={color} />;
  if (name === 'custom:collapse-sidebar') return <CollapseSidebarIcon size={size} color={color} />;
  if (name === 'custom:bulk-select') return <BulkSelectIcon size={size} color={color} />;
  if (name === 'custom:bulk-select-close') return <BulkSelectCloseIcon size={size} color={color} />;
  if (name === 'custom:upload') return <UploadIcon size={size} color={color} />;
  if (name === 'custom:sms') return <SmsIcon size={size} color={color} />;
  if (name === 'custom:expand-drawer') return <ExpandDrawerIcon size={size} />;
  if (name === 'custom:call-pcp') return <CallPcpIcon size={size} color={color} />;
  if (name === 'custom:pdf-file') return <PdfFileIcon size={size} color={color} />;
  if (name === 'custom:campaign') return <CampaignIcon size={size} color={color} />;
  if (name === 'custom:campaign-bold') return <CampaignBoldIcon size={size} color={color} />;
  if (name === 'solar:phone-linear') return <PhoneLinearIcon size={size} color={color} />;
  if (name === 'solar:phone-calling-linear') return <PhoneCallingLinearIcon size={size} color={color} />;
  if (name === 'solar:phone-calling-rounded-linear') return <PhoneCallingLinearIcon size={size} color={color} />;
  if (name === 'custom:call-history') return <CallHistoryIcon size={size} color={color} />;
  if (name === 'solar:incoming-call-rounded-linear') return <IncomingCallIcon size={size} color={color} />;
  if (name === 'solar:incoming-call-linear') return <IncomingCallIcon size={size} color={color} />;
  if (name === 'solar:outgoing-call-rounded-linear') return <OutgoingCallIcon size={size} color={color} />;
  if (name === 'solar:outgoing-call-linear') return <OutgoingCallIcon size={size} color={color} />;
  if (name === 'solar:end-call-linear') return <EndCallIcon size={size} color={color} />;
  if (name === 'solar:end-call-rounded-linear') return <EndCallIcon size={size} color={color} />;
  if (name === 'solar:refresh-linear') return <RefreshIcon size={size} color={color} />;
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
