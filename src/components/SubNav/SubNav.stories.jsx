import { SubNav } from './SubNav';

export default {
  title: 'Navigation/SubNav',
  component: SubNav,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    collapsed: { control: 'boolean', description: 'Collapse the nav rail to icon-only' },
  },
};

export const Expanded = { render: () => <SubNav collapsed={false} /> };
export const Collapsed = { render: () => <SubNav collapsed={true} /> };
