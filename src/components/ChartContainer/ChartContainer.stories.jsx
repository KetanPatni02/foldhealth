import { ChartContainer } from './ChartContainer';

export default {
  title: 'Core/ChartContainer',
  component: ChartContainer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'The card every chart sits in: title with an optional (i) definition, a subtitle, a grouped action bar (expand, download, more) and a body for the chart. Pass `height` (or `bodyHeight`) so a row of charts lines up.',
      },
    },
  },
  args: {
    title: 'Chart Title',
    info: 'What this chart measures.',
    subtitle: 'Chart Subtitle',
    height: 330,
    onExpand: () => {},
    onDownload: () => {},
    menuItems: [
      { key: 'table', label: 'View as table', icon: 'solar:list-linear' },
      { key: 'hide', label: 'Hide widget', icon: 'solar:eye-closed-linear' },
    ],
  },
  render: (args) => (
    <div style={{ width: 600 }}>
      <ChartContainer {...args}>
        <div style={{ flex: 1, borderRadius: 8, background: 'var(--neutral-50)' }} />
      </ChartContainer>
    </div>
  ),
};

export const Default = {};
export const Empty = { args: { empty: true } };
export const NoActions = { args: { onExpand: undefined, onDownload: undefined, menuItems: undefined } };
