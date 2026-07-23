import { Toaster, toast } from './Toast';
import { Button } from '../Button/Button';

export default {
  title: 'Overlays/Toast',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Imperative toast notifications backed by Sonner. Mount `<Toaster />` once at the app root, then call `toast(...)`, `toast.success(...)`, or `toast.error(...)` from anywhere.',
      },
    },
  },
};

export const Playground = {
  render: () => (
    <div style={{ padding: 24 }}>
      <Toaster />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button variant="primary" onClick={() => toast('Saved')}>Default</Button>
        <Button variant="success" onClick={() => toast.success('Uploaded chart.pdf')}>Success</Button>
        <Button variant="danger" onClick={() => toast.error('Upload failed')}>Error</Button>
        <Button variant="secondary" onClick={() => toast('With description', { description: 'The document was sent for review.' })}>
          With description
        </Button>
      </div>
    </div>
  ),
};
