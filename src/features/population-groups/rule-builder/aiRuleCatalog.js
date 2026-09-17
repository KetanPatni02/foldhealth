/**
 * Compact field catalog for Gemini prompts (server + client).
 * Keeps keys, labels, value shapes, and allowed operators in sync with fieldCatalog.js.
 */
import { EVENT_TYPES, RULE_FIELDS } from './fieldCatalog.js';

export function buildAiFieldCatalog({ compact = false } = {}) {
  return RULE_FIELDS.map((f) => {
    if (compact) {
      const entry = {
        key: f.key,
        t: f.valueType,
        ops: f.operators.map((o) => o.name),
      };
      if (f.options) entry.options = f.options;
      if (f.supportsAsOf) entry.asOf = true;
      if (f.terminology) entry.term = f.terminology;
      if (f.valueType === 'eventCount') {
        entry.eventTypes = EVENT_TYPES.map((e) => e.value);
      }
      return entry;
    }
    const entry = {
      key: f.key,
      label: f.label,
      valueType: f.valueType,
      operators: f.operators.map((o) => o.name),
    };
    if (f.options) entry.options = f.options;
    if (f.unit) entry.unit = f.unit;
    if (f.supportsAsOf) entry.supportsAsOf = true;
    if (f.terminology) entry.terminology = f.terminology;
    if (f.eventType) entry.eventType = f.eventType;
    if (f.valueType === 'eventCount') {
      entry.eventTypeOptions = EVENT_TYPES.map((e) => e.value);
    }
    return entry;
  });
}

export function buildAiRuleInstructions() {
  return [
    'Output a population-group rule tree used by our rule builder.',
    '',
    'Tree shape:',
    '- Root and nested groups: { "combinator": "and" | "or", "rules": [...] }',
    '- Leaf condition: { "field": "<key from catalog>", "operator": "<allowed operator>", "value": { ... } }',
    '',
    'Value shapes by valueType:',
    '- number: { "amount": number, "asOfMode": "today" | "date", "asOfDate": "YYYY-MM-DD" }',
    '  Use asOfMode "today" for patient age unless a specific date is requested.',
    '- select / text / list / date: { "text": string }',
    '- codedTerm: { "code", "display", "system" (icd10|snomed|cpt|rxnorm|loinc), optional "lookback": { "amount", "unit": days|weeks|months|years } }',
    '- observation: { "analyte": { "code", "display", "system": "loinc" }, "numericValue", "unit", optional "lookback" }',
    '- eventCount: { "eventType", "count", optional "filter": { "code" }, optional "lookback" }',
    '',
    'Rules:',
    '- Use ONLY field keys and operators from the catalog.',
    '- For select fields, value.text must exactly match one of the listed options.',
    '- Prefer profile/list fields (diagnosis, problem, labResult, patientAge, membershipStatus) when the user speaks loosely.',
    '- Use codedTerm / observation / eventCount only when the user mentions specific codes, LOINC, RxNorm, CPT, or visit counts.',
    '- Nest AND/OR groups when the user says "and", "or", "either", or mixes inclusion and exclusion.',
    '- Do not include "id" on nodes; the app assigns ids.',
    '- Do not use negated operators with a separate "not" flag.',
  ].join('\n');
}
