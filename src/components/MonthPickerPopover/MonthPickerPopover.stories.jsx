import { useState } from 'react';
import { MonthPickerPopover } from './MonthPickerPopover';

const addMonths = (k, n) => {
  const [y, m] = k.split('-').map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};

export default {
  title: 'Components/MonthPickerPopover',
  component: MonthPickerPopover,
};

function Demo({ span }) {
  const [start, setStart] = useState('2025-10');
  const rangeFor = (s) => ({ from: s, to: addMonths(s, span - 1) });
  return (
    <MonthPickerPopover
      anchorRect={{ left: 24, bottom: 24 }}
      label="Date Range"
      value={rangeFor(start)}
      rangeFor={rangeFor}
      max="2026-09"
      onChange={setStart}
      onClose={() => {}}
    />
  );
}

export const OneMonth = { render: () => <Demo span={1} /> };
export const Quarter = { render: () => <Demo span={3} /> };
export const Year = { render: () => <Demo span={12} /> };
