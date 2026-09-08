import { Alert } from './Alert';

export default {
  title: 'Feedback/Alert',
  component: Alert,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Inline status banner for warnings, deadlines, and contextual notices.',
      },
    },
  },
  argTypes: {
    tone: {
      control: 'select',
      options: ['error', 'warning', 'info', 'success'],
    },
    message: { control: 'text' },
    meta: { control: 'text' },
  },
};

export const DischargeDeadline = {
  args: {
    tone: 'error',
    message: 'Discharged Mercy General 8/21 6:40 AM · CHF exacerbation · TCM contact required',
    meta: 'due 5:00 PM today',
  },
};

export const Warning = {
  args: {
    tone: 'warning',
    message: 'Patient missed last two vitals check-ins.',
    meta: 'Follow up today',
  },
};

export const Info = {
  args: {
    tone: 'info',
    message: 'Care plan review scheduled for tomorrow.',
  },
};
