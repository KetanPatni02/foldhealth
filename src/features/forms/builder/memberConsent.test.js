import { describe, expect, it } from 'vitest';
import {
  createCustomConsentItem,
  makeMemberConsent,
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
});
