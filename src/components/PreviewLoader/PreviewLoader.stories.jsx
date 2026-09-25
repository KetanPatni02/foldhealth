import { PreviewLoader } from './PreviewLoader';

export default {
  title: 'Core/PreviewLoader',
  component: PreviewLoader,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Loading state for a document preview: an animated report illustration in dashed rings, an indeterminate progress bar and a label.',
      },
    },
  },
  render: (args) => <div style={{ height: 480, display: 'flex' }}><PreviewLoader {...args} /></div>,
};

export const Default = {};
export const CustomLabel = { args: { label: 'Generating care plan preview' } };
