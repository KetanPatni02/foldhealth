import { useState } from 'react';
import { StickyNote } from './StickyNote';

export default {
  title: 'Composed/StickyNote',
  component: StickyNote,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    notes: {
      control: 'object',
      description: 'Array of note objects { id, text, author_name, author_date, ehr_profile }',
    },
    collapsedOnly: {
      control: 'boolean',
      description: 'Force the single-line collapsed view (no expand-on-click)',
      table: { defaultValue: { summary: 'false' } },
    },
    initialExpanded: {
      control: 'boolean',
      description: 'Start in the expanded view',
      table: { defaultValue: { summary: 'false' } },
    },
    onSave: { action: 'onSave', description: '(id, text) => void' },
    onCreate: { action: 'onCreate', description: '(text) => void' },
    onDelete: { action: 'onDelete', description: '(id) => void — soft-delete' },
    onAuditLog: { action: 'onAuditLog', description: 'Open audit log' },
  },
};

const SAMPLE_NOTE = {
  id: 'note-1',
  text: 'Patient prefers morning calls before 10am. Spouse is primary contact for care coordination.',
  author_name: 'Dr. Sarah Chen',
  author_date: '2026-05-14T09:32:00Z',
  ehr_profile: 'Central Profile',
};

const MULTI_NOTES = [
  SAMPLE_NOTE,
  {
    id: 'note-2',
    text: 'Blue Cross plan — prior auth required for A1c strips. Called MedRx 5/12.',
    author_name: 'Michael Torres',
    author_date: '2026-05-12T14:15:00Z',
    ehr_profile: 'BCBS PPO',
  },
  {
    id: 'note-3',
    text: 'Medicare Advantage secondary. Copay assistance active through 12/2026.',
    author_name: 'Priya Nair',
    author_date: '2026-04-30T11:08:00Z',
    ehr_profile: 'UHC MAPD',
  },
];

function Wrapper({ initialNotes = [SAMPLE_NOTE], ...props }) {
  const [notes, setNotes] = useState(initialNotes);
  return (
    <StickyNote
      notes={notes}
      onSave={(id, text) => setNotes(n => n.map(x => x.id === id ? { ...x, text } : x))}
      onCreate={(text) => setNotes(n => [...n, { id: `note-${Date.now()}`, text, author_name: 'You', author_date: new Date().toISOString(), ehr_profile: 'Central Profile' }])}
      onDelete={(id) => setNotes(n => n.filter(x => x.id !== id))}
      onAuditLog={() => {}}
      {...props}
    />
  );
}

export const Playground = {
  render: (args) => <Wrapper {...args} />,
  args: {
    initialNotes: [SAMPLE_NOTE],
    collapsedOnly: false,
    initialExpanded: false,
  },
};

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 480 }}>
      <div>
        <p style={{ fontSize: 13, color: 'var(--neutral-300)', marginBottom: 8 }}>Empty — collapsed prompt</p>
        <Wrapper initialNotes={[]} />
      </div>
      <div>
        <p style={{ fontSize: 13, color: 'var(--neutral-300)', marginBottom: 8 }}>Single note — collapsed</p>
        <Wrapper initialNotes={[SAMPLE_NOTE]} />
      </div>
      <div>
        <p style={{ fontSize: 13, color: 'var(--neutral-300)', marginBottom: 8 }}>Expanded on mount</p>
        <Wrapper initialNotes={[SAMPLE_NOTE]} initialExpanded />
      </div>
      <div>
        <p style={{ fontSize: 13, color: 'var(--neutral-300)', marginBottom: 8 }}>Multiple notes (chevron pagination)</p>
        <Wrapper initialNotes={MULTI_NOTES} initialExpanded />
      </div>
      <div>
        <p style={{ fontSize: 13, color: 'var(--neutral-300)', marginBottom: 8 }}>Collapsed-only (locked)</p>
        <Wrapper initialNotes={[SAMPLE_NOTE]} collapsedOnly />
      </div>
    </div>
  ),
};
