import { useState } from 'react';
import { SectionCustomizer } from './SectionCustomizer';

export default {
  title: 'Inputs/SectionCustomizer',
  component: SectionCustomizer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Switch sections and their items on or off, and drag either into a new order (as in the analytics Export Report drawer). The patient panel’s Customize drawer uses it for tabs and their widgets.',
      },
    },
  },
  decorators: [Story => <div style={{ width: 420 }}><Story /></div>],
};

const INITIAL = [
  { key: 'gaps', label: 'Gaps', on: true, items: [
    { key: 'care-gaps', label: 'Care Gaps', on: true },
    { key: 'diagnosis-gaps', label: 'Diagnosis Gaps', on: true },
    { key: 'alerts', label: 'Alerts', on: false },
  ] },
  { key: 'comms', label: 'Comms', on: true, items: [] },
  { key: 'summary', label: 'Summary', on: false, items: [
    { key: 'health-map', label: 'Health Map', on: true },
    { key: 'insurance', label: 'Insurance', on: true },
  ] },
];

export const Default = {
  render: () => {
    const [sections, setSections] = useState(INITIAL);
    const bySection = (key, fn) => setSections(prev => prev.map(s => (s.key === key ? fn(s) : s)));
    return (
      <SectionCustomizer
        sections={sections}
        itemNoun="widget"
        onReorderSections={keys => setSections(prev => keys.map(k => prev.find(s => s.key === k)))}
        onToggleSection={(key, on) => bySection(key, s => ({ ...s, on }))}
        onReorderItems={(key, keys) => bySection(key, s => ({ ...s, items: keys.map(k => s.items.find(i => i.key === k)) }))}
        onToggleItem={(key, itemKey, on) => bySection(key, s => ({ ...s, items: s.items.map(i => (i.key === itemKey ? { ...i, on } : i)) }))}
      />
    );
  },
};
