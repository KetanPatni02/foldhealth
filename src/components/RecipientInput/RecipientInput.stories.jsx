import { useState } from 'react';
import { RecipientInput } from './RecipientInput';

export default {
  title: 'Components/RecipientInput',
  component: RecipientInput,
};

export const Default = {
  render: () => {
    const [to, setTo] = useState(['hr@northwind.com', 'not-an-email']);
    return <div style={{ width: 480 }}><RecipientInput label="To" required value={to} onChange={setTo} /></div>;
  },
};
