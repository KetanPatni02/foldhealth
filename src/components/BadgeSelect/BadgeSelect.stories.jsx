import { useState } from 'react';
import { BadgeSelect } from './BadgeSelect';

export default {
  title: 'Inputs/BadgeSelect',
  component: BadgeSelect,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A badge-styled single-choice dropdown for section headers in side panels: "View By: Active", a synopsis template, a year. The badge shows the current value; the menu highlights it. For filtering lists by several values, use FilterChip.',
      },
    },
  },
};

export const ViewBy = {
  render: () => {
    const [value, setValue] = useState('Active');
    return <BadgeSelect label="View By" value={value} options={['Active', 'Inactive', 'All']} onChange={setValue} />;
  },
};

export const ValueOnly = {
  render: () => {
    const [value, setValue] = useState('Health Overview');
    return <BadgeSelect value={value} options={['Health Overview', 'Diabetes Standard Template']} onChange={setValue} />;
  },
};
