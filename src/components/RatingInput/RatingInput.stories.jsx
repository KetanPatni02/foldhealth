import { useState } from 'react';
import { RatingInput } from './RatingInput';

export default {
  title: 'Core/RatingInput',
  component: RatingInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Picks one point on a scale: as a filled slider with an icon thumb, a row of dots, or NPS tiles coloured by band. Used by the Form Builder\'s Rating question.',
      },
    },
  },
};

const points = (n) => Array.from({ length: n }, (_, i) => ({ value: String(i + 1) }));
const third = (i, n) => { const p = i / (n - 1); return p < 1 / 3 ? 'low' : p < 2 / 3 ? 'mid' : 'high'; };

function Controlled(args) {
  const [value, setValue] = useState(args.value);
  return <div style={{ width: 360 }}><RatingInput {...args} value={value} onChange={setValue} /></div>;
}

export const Star = { render: Controlled, args: { look: 'slider', thumb: 'solar:star-bold', points: points(10), value: '3', fillColor: '#FFC849', name: 'star', ariaLabel: 'Rating' } };
export const Heart = { render: Controlled, args: { look: 'slider', thumb: 'solar:heart-bold', points: points(10), value: '5', fillColor: '#E81E63', name: 'heart', ariaLabel: 'Rating' } };
export const Circle = { render: Controlled, args: { look: 'dots', points: points(10), value: '6', fillColor: '#8C5AE2', name: 'circle', ariaLabel: 'Rating' } };
export const Nps = { render: Controlled, args: { look: 'tiles', points: points(10), value: '7', toneOf: third, name: 'nps', ariaLabel: 'Rating' } };
export const Unanswered = { render: Controlled, args: { look: 'slider', thumb: 'solar:star-bold', points: points(5), fillColor: '#8C5AE2', name: 'empty', ariaLabel: 'Rating' } };
