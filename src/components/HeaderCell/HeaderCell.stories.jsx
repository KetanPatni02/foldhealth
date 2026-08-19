import { useState } from 'react';
import { HeaderCell } from './HeaderCell';

/*
 * Storybook wraps each render in <div id="storybook-root">; an orphan
 * <th> would be invalid HTML, so every story embeds the cell inside a
 * full <table><thead><tr>…</tr></thead></table>.
 */

const tableStyle = { tableLayout: 'auto', width: '100%', borderCollapse: 'collapse' };

export default {
  title: 'Core/HeaderCell',
  component: HeaderCell,
  tags: ['autodocs'],
  parameters: {
    controls: { sort: 'none' },
    layout: 'centered',
    docs: {
      description: {
        component:
          'Canonical column-header cell for every worklist / data table. Idle sortable columns show a double-chevron affordance; a column that owns the current sort morphs one chevron into a full arrow via a single SVG whose three parts fade in / out independently. Clicking cycles **idle → asc → desc → idle**. The hover tooltip copy is column-type-aware ("Sort A to Z", "Sort oldest to newest", "Sort lowest to highest", "Sort in ascending order").',
      },
    },
  },
  argTypes: {
    label: { control: 'text', table: { order: 1 } },
    sortable: { control: 'boolean', table: { order: 2 } },
    sortType: {
      control: 'inline-radio',
      options: ['alpha', 'date', 'number', 'priority', 'generic'],
      table: { order: 3 },
    },
  },
};

// ── Playground ─────────────────────────────────────────────────────────
function PlaygroundStory({ label, sortable, sortType }) {
  const [dir, setDir] = useState(null);
  const handleSort = () => setDir((d) => (d === null ? 'asc' : d === 'asc' ? 'desc' : null));
  return (
    <div style={{ padding: 40, background: 'var(--neutral-0)', minWidth: 280 }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <HeaderCell
              label={label}
              sortField={sortable ? 'demo' : undefined}
              sortType={sortType}
              activeKey={dir ? 'demo' : null}
              activeDir={dir}
              onSort={handleSort}
            />
          </tr>
        </thead>
      </table>
      <div style={{ marginTop: 16, fontSize: 'var(--font-sm)', color: 'var(--neutral-300)', fontFamily: 'Inter, sans-serif' }}>
        Click the header to cycle sort · current: <b>{dir ?? 'idle'}</b>
      </div>
    </div>
  );
}

export const Playground = {
  args: { label: 'Assignee', sortable: true, sortType: 'alpha' },
  render: (args) => <PlaygroundStory {...args} />,
};

// ── All Variants ───────────────────────────────────────────────────────
const SORT_TYPES = [
  { key: 'alpha',    sample: 'Assignee' },
  { key: 'date',     sample: 'Updated' },
  { key: 'number',   sample: 'RAF Score' },
  { key: 'priority', sample: 'Priority' },
  { key: 'generic',  sample: 'Approvers' },
];

const STATES = [
  { title: 'Idle',        activeKey: null,   activeDir: null  },
  { title: 'Sorted asc',  activeKey: 'demo', activeDir: 'asc' },
  { title: 'Sorted desc', activeKey: 'demo', activeDir: 'desc'},
];

function VariantCell({ label, sortField, sortType, activeKey, activeDir }) {
  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          <HeaderCell
            label={label}
            sortField={sortField}
            sortType={sortType}
            activeKey={activeKey}
            activeDir={activeDir}
            onSort={sortField ? () => {} : undefined}
          />
        </tr>
      </thead>
    </table>
  );
}

function FragmentRow({ typeLabel, label, sortField, sortType }) {
  return (
    <>
      <div style={{ fontSize: 'var(--font-sm)', color: 'var(--neutral-400)' }}>{typeLabel}</div>
      {STATES.map((s) => (
        <VariantCell
          key={s.title}
          label={label}
          sortField={sortField}
          sortType={sortType}
          activeKey={s.activeKey}
          activeDir={s.activeDir}
        />
      ))}
    </>
  );
}

export const AllVariants = {
  render: () => (
    <div style={{ padding: 24, background: 'var(--neutral-0)', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '160px repeat(3, 1fr)', gap: 12, alignItems: 'center' }}>
        <div />
        {STATES.map((s) => (
          <div key={s.title} style={{ fontSize: 'var(--font-sm)', color: 'var(--neutral-300)', fontWeight: 500 }}>{s.title}</div>
        ))}
        {SORT_TYPES.map((t) => (
          <FragmentRow key={t.key} typeLabel={`${t.sample} (${t.key})`} label={t.sample} sortField="demo" sortType={t.key} />
        ))}
        <FragmentRow typeLabel="Non-sortable" label="Visit Type" />
      </div>
      <div style={{ marginTop: 16, fontSize: 'var(--font-sm)', color: 'var(--neutral-300)' }}>
        Hover any arrow to see the type-specific tooltip copy.
      </div>
    </div>
  ),
};
