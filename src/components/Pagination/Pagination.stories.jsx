import { useState } from 'react';
import { Pagination } from './Pagination';

export default {
  title: 'Data/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Table/list footer showing current page and per-page selector. Reads/writes shared store state when props are omitted, or accept explicit props to drive it from the outside.',
      },
    },
  },
  argTypes: {
    totalItems: {
      control: 'number',
      description: 'Total row count in the underlying list.',
      table: { type: { summary: 'number' } },
    },
    currentPage: {
      control: 'number',
      description: '1-indexed current page.',
      table: { type: { summary: 'number' }, defaultValue: { summary: '1' } },
    },
    perPage: {
      control: 'select',
      options: [10, 25, 50, 100],
      description: 'Rows per page.',
      table: { type: { summary: '10 | 25 | 50 | 100' }, defaultValue: { summary: '10' } },
    },
    onPageChange: {
      action: 'onPageChange',
      description: 'Fires with the new page number.',
      table: { type: { summary: '(page: number) => void' } },
    },
    onPerPageChange: {
      action: 'onPerPageChange',
      description: 'Fires with the new perPage value.',
      table: { type: { summary: '(perPage: number) => void' } },
    },
  },
};

function Wrapper(props) {
  const [page, setPage] = useState(props.currentPage ?? 1);
  const [perPage, setPerPage] = useState(props.perPage ?? 10);
  return (
    <Pagination
      totalItems={props.totalItems ?? 137}
      currentPage={page}
      perPage={perPage}
      onPageChange={setPage}
      onPerPageChange={setPerPage}
    />
  );
}

export const Playground = { render: (args) => <Wrapper {...args} />, args: { totalItems: 137, currentPage: 1, perPage: 10 } };
