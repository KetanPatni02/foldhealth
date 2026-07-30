import { useState } from 'react';
import { SectionTitleBar } from './SectionTitleBar';

export default {
  title: 'Navigation/SectionTitleBar',
  component: SectionTitleBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Shared third-level header used across the demo platform. Three left-side variants — `tabs`, `titleWithDropdown`, `titleWithToggle` — plus flag-based right-side actions (Search, Filter, History, Upload, Download, Saved Filters).',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['tabs', 'titleWithDropdown', 'titleWithToggle'],
      description: 'Left-side layout.',
    },
    title: { control: 'text', description: 'Title text (dropdown / toggle variants).' },
    showSearch: { control: 'boolean' },
    showFilter: { control: 'boolean' },
    showHistory: { control: 'boolean' },
    showUpload: { control: 'boolean' },
    showDownload: { control: 'boolean' },
    showSavedFilters: { control: 'boolean' },
    filterBadgeCount: { control: 'number' },
    uploadHasDropdown: { control: 'boolean' },
  },
};

const TABS = [
  { key: 'toc-worklist', label: 'TOC Worklist' },
  { key: 'toc-queue', label: 'TOC Agent Queue', notif: true },
];

const DUE_OPTIONS = [
  'Overdue',
  'Due Today',
  'Due This Week',
  'Due Next Week',
  'Due More Than 2 Weeks',
];

const SNP_TOGGLE = [
  { key: 'enrolled', label: 'Enrolled' },
  { key: 'eligible', label: 'Eligible' },
];

function Wrapper(props) {
  const [activeTab, setActiveTab] = useState('toc-worklist');
  const [dropdown, setDropdown] = useState(null);
  const [toggle, setToggle] = useState('enrolled');
  const [search, setSearch] = useState('');

  return (
    <SectionTitleBar
      {...props}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      dropdownOptions={DUE_OPTIONS}
      dropdownValue={dropdown}
      onDropdownChange={setDropdown}
      dropdownLabel="Due Date"
      toggleItems={SNP_TOGGLE}
      toggleActive={toggle}
      onToggleChange={setToggle}
      searchValue={search}
      onSearchChange={setSearch}
      onFilter={() => {}}
      onHistory={() => {}}
      onUpload={() => {}}
      onDownload={() => {}}
      onSavedFilters={() => {}}
    />
  );
}

export const Playground = {
  render: (args) => <Wrapper {...args} />,
  args: {
    variant: 'tabs',
    title: 'HCC List',
    showSearch: true,
    showFilter: true,
    showHistory: true,
    showUpload: true,
    showDownload: false,
    showSavedFilters: false,
    filterBadgeCount: 0,
    uploadHasDropdown: false,
  },
};

/* ─── Snapshot variants for docs (non-interactive reference) ──────────── */

// The right-side cluster is the SAME code path across every variant — only
// the left side changes. Each snapshot below turns every action on so this
// is obvious from Storybook alone.

const SHARED_RIGHT = {
  showSearch: true,
  showFilter: true,
  showHistory: true,
  showUpload: true,
  showDownload: true,
  showSavedFilters: true,
  filterBadgeCount: 3,
  uploadHasDropdown: true,
};

export const TabsWithBaseActions = {
  name: 'Variant 1 · Tabs (TOC pattern)',
  render: () => <Wrapper variant="tabs" {...SHARED_RIGHT} />,
};

export const TitleWithDropdown = {
  name: 'Variant 2 · Title + Dropdown (HCC List)',
  render: () => (
    <Wrapper variant="titleWithDropdown" title="HCC List" {...SHARED_RIGHT} />
  ),
};

export const TitleWithToggle = {
  name: 'Variant 3 · Title + Toggle (SNP List)',
  render: () => (
    <Wrapper variant="titleWithToggle" title="SNP List" {...SHARED_RIGHT} />
  ),
};
