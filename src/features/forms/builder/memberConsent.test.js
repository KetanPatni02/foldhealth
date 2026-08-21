import { describe, expect, it } from 'vitest';
import {
  createCustomConsentItem,
  insertConsentItem,
  makeMemberConsent,
  reorderConsentItems,
  syncConsentQuestions,
} from './memberConsent';

const assignIds = (field) => ({ ...field, linkId: `id-${field.consentKey}` });

describe('member consent health component', () => {
  it('starts with the configured program and service decisions', () => {
    const field = makeMemberConsent();

    expect(field.healthKey).toBe('memberConsent');
    expect(field.items).toHaveLength(6);
    expect(field.items.find((item) => item.consentKey === 'ccm')).toMatchObject({
      required: true,
      options: [
        { value: 'consented', label: 'I give my consent for CCM' },
        { value: 'declined', label: 'I decline to give my consent for CCM' },
      ],
    });
  });

  it('removes excluded items and keeps existing question ids stable', () => {
    const field = makeMemberConsent();
    const existing = field.items.map(assignIds);
    const consentItems = field.consentItems.map((item) => (
      item.id === 'ccm' ? { ...item, mandatory: false } : item
    )).filter((item) => item.id !== 'podiatry');

    const questions = syncConsentQuestions(existing, consentItems, assignIds);

    expect(questions.some((item) => item.consentKey === 'podiatry')).toBe(false);
    expect(questions.find((item) => item.consentKey === 'ccm')).toMatchObject({
      linkId: 'id-ccm',
      required: false,
    });
  });

  it('creates a custom consent decision with clean response values', () => {
    const item = createCustomConsentItem('Palliative Care', 'service', 'custom-1');
    const questions = syncConsentQuestions([], [item], assignIds);

    expect(questions[0]).toMatchObject({
      linkId: 'id-custom-1',
      consentCategory: 'service',
      options: [
        { value: 'consented', label: 'I give my consent for Palliative Care' },
        { value: 'declined', label: 'I decline to give my consent for Palliative Care' },
      ],
    });
  });

  it('adds a custom item at the end of its own category, not the whole list', () => {
    const field = makeMemberConsent();
    const item = createCustomConsentItem('Palliative Care', 'program', 'custom-1');

    const items = insertConsentItem(field.consentItems, item);
    const questions = syncConsentQuestions(field.items.map(assignIds), items, assignIds);

    expect(items.map((i) => i.id)).toEqual([
      'ccm', 'apcm', 'bhi', 'custom-1', 'podiatry', 'mental-health', 'wound-care',
    ]);
    expect(questions.map((q) => q.consentKey)).toEqual([
      'ccm', 'apcm', 'bhi', 'custom-1', 'podiatry', 'mental-health', 'wound-care',
    ]);
  });

  it('reorders items within a category and reorders the questions with them', () => {
    const field = makeMemberConsent();
    const items = reorderConsentItems(field.consentItems, 'ccm', 'bhi');
    const questions = syncConsentQuestions(field.items.map(assignIds), items, assignIds);

    expect(items.map((i) => i.id)).toEqual([
      'apcm', 'bhi', 'ccm', 'podiatry', 'mental-health', 'wound-care',
    ]);
    expect(questions.map((q) => q.consentKey)).toEqual([
      'apcm', 'bhi', 'ccm', 'podiatry', 'mental-health', 'wound-care',
    ]);
    expect(questions.find((q) => q.consentKey === 'ccm').linkId).toBe('id-ccm');
  });

  it('refuses to move an item across categories', () => {
    const field = makeMemberConsent();

    expect(reorderConsentItems(field.consentItems, 'podiatry', 'ccm')).toBe(field.consentItems);
  });

  it('keeps insertion order when the category has no items yet', () => {
    const item = createCustomConsentItem('Transportation', 'service', 'custom-2');
    const items = insertConsentItem([{ id: 'ccm', category: 'program' }], item);

    expect(items.map((i) => i.id)).toEqual(['ccm', 'custom-2']);
  });
});
