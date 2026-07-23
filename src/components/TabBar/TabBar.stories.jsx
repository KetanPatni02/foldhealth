import { TabBar } from './TabBar';

export default {
  title: 'Navigation/TabBar',
  component: TabBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Third-level tab bar between SubNav and page content (`TOC Worklist`, `TOC Agent Queue`, `HCC Coder`, …). Store-driven — no props.',
      },
    },
  },
};

export const Default = { render: () => <TabBar /> };
