import { describe, expect, it } from 'vitest';
import { isAllergen } from './allergySubstances.js';

describe('isAllergen', () => {
  it('keeps substances, organisms and objects', () => {
    expect(isAllergen('Peanut', 'substance')).toBe(true);
    expect(isAllergen('Penicillium', 'organism')).toBe(true);
    expect(isAllergen('Latex rubber gloves', 'physical object')).toBe(true);
  });
  it('keeps findings and disorders only when they name an allergy', () => {
    expect(isAllergen('Allergy to peanut', 'finding')).toBe(true);
    expect(isAllergen('Bee sting-induced anaphylaxis', 'disorder')).toBe(true);
    expect(isAllergen('Late onset dysthymia', 'disorder')).toBe(false);
  });
  it('drops procedures and the antibodies and reagents labs measure', () => {
    expect(isAllergen('Latex agglutination test', 'procedure')).toBe(false);
    expect(isAllergen('Peanut specific immunoglobulin E', 'substance')).toBe(false);
    expect(isAllergen('Cat dander IgG4', 'substance')).toBe(false);
    expect(isAllergen('Peanut diagnostic allergen extract', 'substance')).toBe(false);
  });
  it('keeps a concept whose tag could not be looked up', () => {
    expect(isAllergen('Peanut', null)).toBe(true);
  });
});
