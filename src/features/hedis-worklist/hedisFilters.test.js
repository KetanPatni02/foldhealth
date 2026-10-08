import { describe, it, expect } from 'vitest';
import { memberMatchesFilters } from './hedisFilters';

const yearsAgo = (y, extraDays = 0) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - y);
  d.setDate(d.getDate() + extraDays);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
};
const matches = (member, groups) => memberMatchesFilters(member, { age: groups });

describe('Age filter', () => {
  it('buckets by whole years from DOB', () => {
    expect(matches({ dob: yearsAgo(1) }, ['Under 2'])).toBe(true);
    expect(matches({ dob: yearsAgo(2) }, ['Under 2'])).toBe(false);
    expect(matches({ dob: yearsAgo(2) }, ['2–17'])).toBe(true);
    expect(matches({ dob: yearsAgo(65) }, ['65–74'])).toBe(true);
    expect(matches({ dob: yearsAgo(80) }, ['75+'])).toBe(true);
  });

  it('a birthday later this year has not happened yet', () => {
    expect(matches({ dob: yearsAgo(18, 5) }, ['2–17'])).toBe(true);
  });

  it('falls back to the age text when there is no DOB', () => {
    expect(matches({ age: '22m' }, ['Under 2'])).toBe(true);
    expect(matches({ age: '67y 2m' }, ['65–74'])).toBe(true);
    expect(matches({ age: '63y' }, ['45–64', '65–74'])).toBe(true);
    expect(matches({}, ['75+'])).toBe(false);
  });
});
