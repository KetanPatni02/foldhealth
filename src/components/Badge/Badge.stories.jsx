import { Fragment } from 'react';
import { Badge } from './Badge';

const TONES = ['white','grey','ghost','primary','secondary','success','warning','error','info','disabled'];
const SIZES = ['S','M','L'];

export default {
  title: 'Core/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A small pill that surfaces status, category, or scoring at a glance. Canonical API: pick a `tone` + `size` from the Figma "Fold Pixel 1.0" spec. Legacy `variant` prop (`lace-*`, `toc-*`, `awv-*`, `status-*`, etc.) stays supported for existing callers.',
      },
    },
  },
  argTypes: {
    tone: {
      control: 'select',
      options: TONES,
      description: 'Canonical Figma tone. Drives the color palette.',
      table: { defaultValue: { summary: 'undefined' } },
    },
    size: {
      control: 'inline-radio',
      options: SIZES,
      description: 'S=18px, M=22px, L=30px height.',
      table: { defaultValue: { summary: 'M' } },
    },
    hover: {
      control: 'boolean',
      description: 'Force the hover-state class (Storybook demo). Real UX uses CSS :hover.',
    },
    label: { control: 'text', description: 'Badge text' },
    icon: { control: 'text', description: 'Optional leading Solar icon name (e.g. solar:check-circle-bold)' },
    trailingIcon: { control: 'text', description: 'Optional trailing Solar icon name' },
    dot: { control: 'boolean', description: 'Show leading colored dot' },
    variant: {
      control: 'select',
      options: [
        '',
        'status-completed', 'status-scheduled', 'status-queued', 'status-failed',
        'lace-high', 'lace-medium', 'lace-low',
        'toc-enrolled', 'toc-engaged', 'toc-attempted', 'toc-new', 'toc-oncall',
        'outreach-48h', 'outreach-7d', 'ai-care',
        'awv-open', 'awv-new', 'awv-unable', 'awv-engaged', 'awv-attempted', 'awv-engaged-followup',
      ],
      description: 'Legacy variant (feature-specific). Prefer `tone`.',
    },
  },
};

export const Playground = {
  args: { tone: 'primary', size: 'M', label: 'Badge', hover: false, dot: false },
  render: (args) => <Badge {...args} />,
};

/**
 * Mirrors the Figma matrix at node 24:1678 — every tone (rows) × size
 * (columns) × hover=false/true (row pairs). Read-only visual reference.
 */
export const AllStates = {
  parameters: {
    docs: {
      description: {
        story: 'Every tone × size × hover=false/true. Mirrors the Figma "Badge" node 24:1678 layout.',
      },
    },
  },
  render: () => {
    const cellStyle = { padding: 6, display: 'flex', justifyContent: 'center' };
    const labelStyle = { padding: '6px 12px', fontSize: 'var(--font-sm)', fontWeight: 500, color: 'var(--neutral-300)', textTransform: 'capitalize', textAlign: 'right' };
    const headerStyle = { padding: '6px 12px', fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' };
    return (
      <div style={{ padding: 24, fontFamily: 'Inter, sans-serif' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(3, 1fr)', gap: 4, alignItems: 'center' }}>
          <div />
          {SIZES.map(size => <div key={size} style={headerStyle}>Size {size}</div>)}
          {TONES.flatMap(tone => {
            // Disabled + Ghost skip the hover row (matches Figma — those types
            // don't have a hover state defined).
            const hoverStates = (tone === 'disabled') ? [false] : [false, true];
            return hoverStates.map(hover => (
              <Fragment key={`${tone}-${hover}`}>
                <div style={labelStyle}>
                  {tone}{hover ? ' (hover)' : ''}
                </div>
                {SIZES.map(size => (
                  <div key={size} style={cellStyle}>
                    <Badge tone={tone} size={size} hover={hover} label="Badge" />
                  </div>
                ))}
              </Fragment>
            ));
          })}
        </div>
      </div>
    );
  },
};

/**
 * Slot variations — dot, leading icon, trailing icon, count, all together.
 */
export const Slots = {
  parameters: {
    docs: { description: { story: 'Slot options: dot, leading icon, trailing icon.' } },
  },
  render: () => (
    <div style={{ display: 'flex', gap: 12, padding: 24, flexWrap: 'wrap', fontFamily: 'Inter, sans-serif' }}>
      <Badge tone="success" size="M" label="Enrolled" />
      <Badge tone="success" size="M" label="Enrolled" dot />
      <Badge tone="success" size="M" label="Enrolled" icon="solar:check-circle-bold" />
      <Badge tone="warning" size="M" label="Attempted" trailingIcon="solar:alt-arrow-down-linear" />
      <Badge tone="error" size="M" label="3" />
    </div>
  ),
};
