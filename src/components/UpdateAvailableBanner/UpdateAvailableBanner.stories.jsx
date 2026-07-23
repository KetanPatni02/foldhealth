import { UpdateAvailableBanner } from './UpdateAvailableBanner';

export default {
  title: 'Feedback/UpdateAvailableBanner',
  component: UpdateAvailableBanner,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Global banner prompting the user to reload when a newer build has been deployed (detected via the service-worker update event). No props.',
      },
    },
  },
};

export const Default = { render: () => <UpdateAvailableBanner /> };
