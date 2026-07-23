import { useState } from 'react';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  SelectGroup, SelectLabel, SelectSeparator,
} from './select';

export default {
  title: 'shadcn/Select',
  tags: ['autodocs'],
};

function Wrapper({ withGroups } = {}) {
  const [value, setValue] = useState('');
  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger style={{ width: 240 }}>
        <SelectValue placeholder="Select role" />
      </SelectTrigger>
      <SelectContent>
        {withGroups ? (
          <>
            <SelectGroup>
              <SelectLabel>Clinical</SelectLabel>
              <SelectItem value="coder">Coder</SelectItem>
              <SelectItem value="qa">QA</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Operations</SelectLabel>
              <SelectItem value="support">Support</SelectItem>
            </SelectGroup>
          </>
        ) : (
          <>
            <SelectItem value="support">Support</SelectItem>
            <SelectItem value="coder">Coder</SelectItem>
            <SelectItem value="qa">QA</SelectItem>
            <SelectItem value="compliance">Compliance</SelectItem>
          </>
        )}
      </SelectContent>
    </Select>
  );
}

export const Playground = { render: () => <Wrapper /> };
export const WithGroups = { render: () => <Wrapper withGroups /> };
