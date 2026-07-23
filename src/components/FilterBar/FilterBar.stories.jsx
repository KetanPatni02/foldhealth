import { FilterBar } from './FilterBar';

export default {
  title: 'Composed/FilterBar',
  component: FilterBar,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  argTypes: {},
};

// FilterBar pulls state entirely from the shared Zustand store
// (viewBy, activeFilters, patients, savedFilters). No props to configure —
// interact with it directly inside the canvas.
export const Playground = {
  render: () => (
    <div style={{ padding: 16, background: 'var(--neutral-50)', minHeight: 200 }}>
      <FilterBar />
    </div>
  ),
};

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <p style={{ color: 'var(--neutral-400)', fontSize: 13, marginBottom: 8, padding: '0 16px' }}>
          The canonical TOC worklist FilterBar — View By toggle plus the full FilterChip cluster.
          Selecting any chip triggers the "N active", "Clear All" and "Save Filter" affordances.
        </p>
        <div style={{ padding: 16, background: 'var(--neutral-50)' }}>
          <FilterBar />
        </div>
      </div>
    </div>
  ),
};
