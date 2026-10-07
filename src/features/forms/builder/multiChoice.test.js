import { describe, expect, it } from 'vitest';
import { toggleMultiChoice } from './multiChoice';

const options = [{ value: 'No one', exclusive: true }, { value: 'Spouse' }, { value: 'Parent' }];

describe('toggleMultiChoice', () => {
  it('adds and removes ordinary options', () => {
    expect(toggleMultiChoice(['Spouse'], options, 'Parent')).toEqual(['Spouse', 'Parent']);
    expect(toggleMultiChoice(['Spouse', 'Parent'], options, 'Spouse')).toEqual(['Parent']);
  });
  it('an exclusive option clears the rest', () => {
    expect(toggleMultiChoice(['Spouse', 'Parent'], options, 'No one')).toEqual(['No one']);
  });
  it('any other option clears the exclusive one', () => {
    expect(toggleMultiChoice(['No one'], options, 'Spouse')).toEqual(['Spouse']);
  });
});
