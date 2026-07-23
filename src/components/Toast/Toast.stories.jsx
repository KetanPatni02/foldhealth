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
        <Button variant="success" onClick={() => toast.success('Uploaded chart.pdf')}>Success</Button>
        <Button variant="danger" onClick={() => toast.error('Upload failed')}>Error</Button>
        <Button variant="info" onClick={() => toast.info('A newer version of Foldhealth is available.')}>Info</Button>
        <Button variant="alt" onClick={() => toast.warning('Session will expire in 2 minutes.')}>Warning</Button>
        <Button variant="primary" onClick={() => toast.success('DOS reassigned', { description: 'Ownership handed off to Priya Nair. The prior coder\'s notes are preserved.' })}>
          With description
        </Button>
      </div>
    </div>
  ),
};
