import { InfoBar } from './InfoBar';

const TONES = ['info', 'success', 'warning', 'error'];

export default {
  title: 'Core/InfoBar',
  component: InfoBar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A pinned informational banner that sits above a form or scroll region and explains what an action does or where its output lands. Not dismissible — the message stays put. Use for `signed notes sync to the EHR`, `this view is read-only`, `changes require sign-off`, etc.',
      },
    },
  },
  argTypes: {
    tone: {
      control: 'inline-radio',
      options: TONES,
      description: 'Tint for the icon and surface. Defaults to `info`.',
      table: { defaultValue: { summary: 'info' } },
    },
    icon: {
      control: 'text',
      description:
        'Solar icon name for the leading glyph. Defaults to `solar:info-circle-linear`.',
      table: { defaultValue: { summary: 'solar:info-circle-linear' } },
    },
    children: { control: 'text' },
  },
};

export const Default = {
  args: {
    children: "All signed notes sync to the patient's EHR.",
  },
};

export const Success = {
  args: {
    tone: 'success',
    icon: 'solar:check-circle-linear',
    children: 'Consent recorded. The care team can now access this member.',
  },
};

export const Warning = {
  args: {
    tone: 'warning',
    icon: 'solar:danger-triangle-linear',
    children: 'This gap re-opens if the note is not signed within 24 hours.',
  },
};

export const Error = {
  args: {
    tone: 'error',
    icon: 'solar:danger-circle-linear',
    children: 'We could not sync this note to the EHR — try again in a moment.',
  },
};

export const AllTones = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 520 }}>
    {TONES.map(t => (
      <InfoBar key={t} tone={t}>
        {t.toUpperCase()} — All signed notes sync to the patient&apos;s EHR.
      </InfoBar>
    ))}
  </div>
);
AllTones.parameters = {
  docs: {
    description: {
      story: 'Every tone side by side — same layout, different tint.',
    },
  },
};
