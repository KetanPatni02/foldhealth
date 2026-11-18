import { describe, expect, it } from 'vitest';
import {
  addedBarriers, barrierStatus, escalation, handoverFromMentions, interventionPlan, interventionTasks,
  needsPharmacistReview, ownerFor, physicianLetter, taskFor,
} from './barrierLoop';
import { addDaysMdy, enrichPharmacyMember, todayMdy } from './pharmacyWorklist.utils';
import { PHARMACY_WORKLIST_MEMBERS } from './data/mock';

const member = { id: '1', name: 'Linda Washington', dob: '08/19/1952', memberId: '19403', assigneeName: 'Marcus Reyes', pharmacist: 'Nina Shah, PharmD', coordinator: null, socialWorker: null };

describe('barrier loop', () => {
  it('finds the barriers a save adds, gap-wide or on a drug', () => {
    const before = { MAD: { barriers: ['Cost Issue'], interventions: [] } };
    const after = {
      MAD: { barriers: ['Cost Issue', 'Forgetfulness'], interventions: [] },
      MAC: { barriers: [], interventions: [], medications: [{ id: 'd1', barriers: ['Side Effects'], interventions: [] }] },
    };
    expect(addedBarriers(before, after)).toEqual([{ code: 'MAD', barrier: 'Forgetfulness' }, { code: 'MAC', barrier: 'Side Effects' }]);
  });

  it('offers the template interventions with owner and due date, skipping ones already on the gap', () => {
    const plan = interventionPlan(member, [{ code: 'MAC', barrier: 'Side Effects' }], { MAC: ['Schedule MD Appointment/Labs'] }, '11/18/2026');
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ intervention: 'Pharmacist review', due: '11/21/2026', owner: { name: 'Nina Shah, PharmD', roleLabel: 'Pharmacist' } });
  });

  it('falls back to the assignee when the role has no one', () => {
    expect(ownerFor(member, 'socialWorker')).toMatchObject({ name: 'Marcus Reyes', fromAssignee: true });
  });

  it('reads the latest task per gap and intervention, and escalates one past due', () => {
    const m = {
      interventionLog: [
        { tasks: [{ code: 'MAC', intervention: 'Pharmacist review', due: addDaysMdy(todayMdy(), -4) }] },
        { tasks: [{ code: 'MAC', intervention: 'Pharmacist review', due: '01/01/2030' }] },
      ],
    };
    const tasks = interventionTasks(m);
    expect(tasks).toHaveLength(1);
    expect(escalation(taskFor(tasks, 'MAC', 'Pharmacist review'))).toEqual({ days: 4, to: 'Team lead' });
    expect(escalation({ due: addDaysMdy(todayMdy(), 2) })).toBeNull();
  });

  it('says where a barrier stands', () => {
    expect(barrierStatus('Side Effects', ['Pharmacist review'])).toBe('Intervention in progress');
    expect(barrierStatus('Cost Issue', ['Pill Box Sent'])).toBe('Identified');
  });

  it('puts a side effect in front of the pharmacist', () => {
    expect(needsPharmacistReview(['Cost Issue', 'Side Effects'])).toBe(true);
    expect(needsPharmacistReview(['Cost Issue'])).toBe(false);
    const linda = enrichPharmacyMember(PHARMACY_WORKLIST_MEMBERS.find(m => m.id === '19403'));
    expect(linda.gaps.find(g => g.code === 'MAC').activeBarriers).toContain('Side Effects');
  });

  it('hands the member to a mentioned pharmacist', () => {
    expect(handoverFromMentions(member, [{ name: 'Nina Shah, PharmD' }])).toMatchObject({ name: 'Nina Shah, PharmD' });
    expect(handoverFromMentions(member, [{ name: 'Sam Lee', role: 'Clinical Pharmacist' }])).toMatchObject({ name: 'Sam Lee' });
    expect(handoverFromMentions(member, [{ name: 'Priya Natarajan', role: 'Care Coordinator' }])).toBeNull();
    expect(handoverFromMentions({ ...member, assigneeName: 'Nina Shah, PharmD' }, [{ name: 'Nina Shah, PharmD' }])).toBeNull();
  });

  it('drafts the physician letter with the member, drug and side effect', () => {
    const text = physicianLetter({ member, code: 'MAC', drug: 'Atorvastatin 40 MG', prescriber: { name: 'Dr. Samuel Okafor', fax: '(562) 555-0165' }, barrier: 'Side Effects', from: 'Nina Shah, PharmD' });
    expect(text).toContain('Dr. Samuel Okafor (fax (562) 555-0165)');
    expect(text).toContain('Re: Linda Washington, DOB 08/19/1952, Member ID 19403');
    expect(text).toContain('Atorvastatin 40 MG (MAC). They reported side effects.');
  });

  it('seeds an overdue pharmacist review on Linda Washington', () => {
    const tasks = interventionTasks(PHARMACY_WORKLIST_MEMBERS.find(m => m.id === '19403'));
    expect(escalation(taskFor(tasks, 'MAC', 'Pharmacist review'))?.to).toBe('Team lead');
  });
});
