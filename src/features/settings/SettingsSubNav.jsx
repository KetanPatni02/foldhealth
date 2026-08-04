import { SideNav } from '../../components/SideNav/SideNav';

const MENU_ITEMS = [
  { icon: 'solar:user-check-rounded-linear', label: 'Member/Leads' },
  { icon: 'solar:calendar-date-linear', label: 'Calendar' },
  { icon: 'solar:checklist-minimalistic-linear', label: 'Tasks' },
  { icon: 'solar:chat-square-linear', label: 'Messages', key: 'messages' },
  { icon: 'solar:phone-linear', label: 'Calls' },
  { icon: 'solar:widget-add-linear', label: 'CRM Widgets' },
  { icon: 'solar:code-square-linear', label: 'Embed', key: 'embedded-components' },
  { icon: 'solar:documents-linear', label: 'Content', key: 'content' },
  { icon: 'solar:watch-square-linear', label: 'Wearables' },
  { icon: 'solar:rocket-linear', label: 'Journeys' },
  { icon: 'solar:ghost-smile-linear', label: 'Agents', key: 'agents' },
  { icon: 'solar:settings-linear', label: 'Automations' },
  { icon: 'solar:library-linear', label: 'Cost Template' },
  { icon: 'solar:user-id-linear', label: 'Memberships' },
  { icon: 'solar:bill-list-linear', label: 'Billing', key: 'billing' },
  { icon: 'solar:shield-user-linear', label: 'Account' },
];

const SECTIONS = [{
  key: 'settings',
  items: MENU_ITEMS.map(item => ({
    key: item.key || item.label.toLowerCase(),
    label: item.label,
    icon: item.icon,
  })),
}];

export function SettingsSubNav({ activeItem = 'agents', onItemClick }) {
  return (
    <SideNav
      width={180}
      sections={SECTIONS}
      activeKey={activeItem}
      onSelect={(key) => onItemClick?.(key)}
    />
  );
}
