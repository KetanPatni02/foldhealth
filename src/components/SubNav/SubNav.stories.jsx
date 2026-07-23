import { SubNav } from './SubNav';

export default {
  title: 'Navigation/SubNav',
  component: SubNav,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Second-level navigation rail (Worklists, Saved Filters, Patients, Population Groups). Reads its selected item from the app store.',
      },
    },
  },
  argTypes: {
    collapsed: {
      control: 'boolean',
      description: 'Collapse the rail to icon-only.',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
  },
};

export const Expanded = { render: () => <SubNav collapsed={false} /> };
export const Collapsed = { render: () => <SubNav collapsed={true} /> };
