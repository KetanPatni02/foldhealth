import { Link } from './Link';

export default {
  title: 'Core/Link',
  component: Link,
  tags: ['autodocs'],
  argTypes: {
    children: { control: 'text' },
  },
};

export const Playground = { args: { children: 'View patient chart' } };
export const InSentence = {
  render: () => (
    <p style={{ fontSize: 14, color: 'var(--neutral-400)' }}>
      Documents live in the <Link>Documents tab</Link>. Coders can also <Link>request new charts</Link>.
    </p>
  ),
};
