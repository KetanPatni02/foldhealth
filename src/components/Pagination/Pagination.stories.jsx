import { useState } from 'react';
import { Pagination } from './Pagination';

export default {
  title: 'Data/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    totalItems: { control: 'number' },
    currentPage: { control: 'number' },
    perPage: { control: 'select', options: [10, 25, 50, 100] },
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
export const OneOfMany = { render: () => <Wrapper totalItems={2413} currentPage={12} perPage={25} /> };
export const FewItems = { render: () => <Wrapper totalItems={4} currentPage={1} perPage={10} /> };
