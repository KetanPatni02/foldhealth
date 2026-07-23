import { useEffect, useRef, useState } from 'react';
import { MenuPopover } from './MenuPopover';
import { CheckboxListPopover } from './CheckboxListPopover';
import { RadioListPopover } from './RadioListPopover';
import { SearchListPopover } from './SearchListPopover';

export default {
  title: 'Overlays/Popover',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

function PopoverDemo({ buttonLabel = 'Open popover', children }) {
  const btnRef = useRef(null);
  const [rect, setRect] = useState(null);
  useEffect(() => {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect());
  }, []);
  return (
    <div style={{ padding: 32, minHeight: 360 }}>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => setRect(rect ? null : e.currentTarget.getBoundingClientRect())}
        style={{
          padding: '6px 12px',
          borderRadius: 6,
          border: '1px solid var(--neutral-150)',
          background: 'var(--white)',
          cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
          fontSize: 13,
          color: 'var(--neutral-400)',
        }}
      >
        {buttonLabel}
      </button>
      {rect && children({ rect, close: () => setRect(null) })}
    </div>
  );
}

export const Menu = {
  render: () => (
    <PopoverDemo buttonLabel="Row actions">
      {({ rect, close }) => (
        <MenuPopover
          anchorRect={rect}
          onClose={close}
          onSelect={() => {}}
          items={[
            { key: 'edit', icon: 'solar:pen-linear', label: 'Edit' },
            { key: 'copy', icon: 'solar:copy-linear', label: 'Duplicate' },
            { key: 'archive', icon: 'solar:archive-linear', label: 'Archive', trailing: true },
            { key: 'delete', icon: 'solar:trash-bin-trash-linear', label: 'Delete', danger: true },
          ]}
        />
      )}
    </PopoverDemo>
  ),
};

function CheckboxDemo({ label, options, initial = [], searchable = false, buttonLabel }) {
  const [selected, setSelected] = useState(initial);
  return (
    <PopoverDemo buttonLabel={buttonLabel || label}>
      {({ rect, close }) => (
        <CheckboxListPopover
          anchorRect={rect}
          onClose={close}
          label={label}
          options={options}
          selected={selected}
          onChange={setSelected}
          searchable={searchable}
        />
      )}
    </PopoverDemo>
  );
}

export const CheckboxList = {
  render: () => (
    <CheckboxDemo
      label="Status"
      buttonLabel="Filter status"
      options={['New', 'In Progress', 'Under Review', 'Closed']}
      initial={['New']}
    />
  ),
};

export const CheckboxListSearchable = {
  render: () => (
    <CheckboxDemo
      label="Diagnosis"
      buttonLabel="Filter diagnosis"
      searchable
      options={[
        'E11.9 Type 2 diabetes',
        'I10 Essential hypertension',
        'J45.909 Asthma, unspecified',
        'N18.3 CKD stage 3',
        'F32.9 Depression, unspecified',
        'M17.11 Osteoarthritis, right knee',
      ]}
    />
  ),
};

function RadioDemo({ label, options, initial = [], buttonLabel }) {
  const [selected, setSelected] = useState(initial);
  return (
    <PopoverDemo buttonLabel={buttonLabel || label}>
      {({ rect, close }) => (
        <RadioListPopover
          anchorRect={rect}
          onClose={close}
          label={label}
          options={options}
          selected={selected}
          onChange={setSelected}
        />
      )}
    </PopoverDemo>
  );
}

export const RadioList = {
  render: () => (
    <RadioDemo
      label="Sort by"
      buttonLabel="Sort"
      options={['Newest first', 'Oldest first', 'Highest score', 'Lowest score']}
      initial={['Newest first']}
    />
  ),
};

export const SearchList = {
  render: () => (
    <PopoverDemo buttonLabel="Assignee">
      {({ rect, close }) => (
        <SearchListPopover
          anchorRect={rect}
          onClose={close}
          searchPlaceholder="Search team members…"
          options={[
            { value: 'alice', label: 'Alice Nguyen' },
            { value: 'bob', label: 'Bob Chen' },
            { value: 'charlie', label: 'Charlie Rivera' },
            { value: 'diana', label: 'Diana Patel' },
            { value: 'eve', label: 'Eve Johnson' },
            { value: 'frank', label: 'Frank Weber', disabled: true },
          ]}
          onSelect={() => {}}
        />
      )}
    </PopoverDemo>
  ),
};
