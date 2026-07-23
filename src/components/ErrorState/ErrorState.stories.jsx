import { ErrorState } from './ErrorState';

export default {
  title: 'Feedback/ErrorState',
  component: ErrorState,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Full-panel error placeholder — icon, title, message, and optional retry button.',
      },
    },
  },
  argTypes: {
    icon: {
      control: 'text',
      description: 'Solar icon name.',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'solar:danger-triangle-bold' } },
    },
    title: {
      control: 'text',
      description: 'Heading text.',
      table: { type: { summary: 'string' } },
    },
    message: {
      control: 'text',
      description: 'Supporting message.',
      table: { type: { summary: 'string' } },
    },
    onRetry: {
      action: 'onRetry',
      description: 'Retry click handler — button hidden when omitted.',
      table: { type: { summary: '() => void' } },
    },
  },
};

export const Playground = {
  args: {
    icon: 'solar:danger-triangle-bold',
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    onRetry: () => {},
  },
};

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 6 }}>Default (no retry)</div>
        <ErrorState />
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 6 }}>With retry</div>
        <ErrorState
          title="Couldn't load worklist"
          message="Supabase returned an unexpected response. Retry, or contact engineering if the issue persists."
          onRetry={() => {}}
        />
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--neutral-300)', marginBottom: 6 }}>Network-flavored</div>
        <ErrorState
          icon="solar:wi-fi-router-linear"
          title="Offline"
          message="You appear to be offline. Reconnect to continue."
          onRetry={() => {}}
        />
      </div>
    </div>
  ),
};
