import { EVENT_TYPES, FIELD_BY_KEY } from './fieldCatalog';

const isGroup = (node) => Array.isArray(node?.rules);

let idSeq = 0;
function nextId(prefix) {
  idSeq += 1;
  return `${prefix}-${Date.now()}-${idSeq}`;
}

function normalizeLookback(lb) {
  if (!lb || lb.amount == null || lb.amount === '') return null;
  const amount = Number(lb.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = ['days', 'weeks', 'months', 'years'].includes(lb.unit) ? lb.unit : 'months';
  return { amount, unit };
}

function matchSelectOption(options, text) {
  if (!text || !options?.length) return null;
  const t = String(text).trim();
  const exact = options.find((o) => o === t);
  if (exact) return exact;
  const lower = t.toLowerCase();
  return options.find((o) => String(o).toLowerCase() === lower) || null;
}

function normalizeLeaf(raw, errors) {
  if (!raw || typeof raw !== 'object') {
    errors.push('Invalid condition node');
    return null;
  }
  const fieldKey = raw.field;
  const field = FIELD_BY_KEY[fieldKey];
  if (!field) {
    errors.push(`Unknown field: ${fieldKey || '(missing)'}`);
    return null;
  }
  const opName = raw.operator;
  if (!field.operators.some((o) => o.name === opName)) {
    errors.push(`Invalid operator "${opName}" for ${field.label}`);
    return null;
  }
  const v = raw.value && typeof raw.value === 'object' ? raw.value : {};
  let value;

  switch (field.valueType) {
    case 'number': {
      const amount = Number(v.amount);
      if (!Number.isFinite(amount)) {
        errors.push(`${field.label}: missing numeric amount`);
        return null;
      }
      value = { amount };
      if (field.supportsAsOf) {
        const asOfMode = v.asOfMode === 'date' ? 'date' : 'today';
        value.asOfMode = asOfMode;
        if (asOfMode === 'date' && v.asOfDate) value.asOfDate = String(v.asOfDate);
      }
      break;
    }
    case 'select': {
      const matched = matchSelectOption(field.options, v.text);
      if (!matched) {
        errors.push(`${field.label}: pick one of ${(field.options || []).join(', ')}`);
        return null;
      }
      value = { text: matched };
      break;
    }
    case 'codedTerm': {
      const code = String(v.code || '').trim();
      const display = String(v.display || '').trim();
      const system = String(v.system || field.terminology || '').trim().toLowerCase();
      if (!code) {
        errors.push(`${field.label}: coded condition needs a code`);
        return null;
      }
      value = { code, display: display || code, system };
      const lookback = normalizeLookback(v.lookback);
      if (lookback) value.lookback = lookback;
      break;
    }
    case 'observation': {
      const analyte = v.analyte;
      const code = analyte?.code ? String(analyte.code).trim() : '';
      if (!code) {
        errors.push(`${field.label}: observation needs a LOINC analyte code`);
        return null;
      }
      const numericValue = Number(v.numericValue);
      if (!Number.isFinite(numericValue)) {
        errors.push(`${field.label}: observation needs numericValue`);
        return null;
      }
      value = {
        analyte: {
          code,
          display: analyte.display ? String(analyte.display) : code,
          system: 'loinc',
        },
        numericValue,
        unit: v.unit ? String(v.unit) : '',
      };
      const lookback = normalizeLookback(v.lookback);
      if (lookback) value.lookback = lookback;
      break;
    }
    case 'eventCount': {
      const eventType = String(v.eventType || '').trim();
      if (!EVENT_TYPES.some((e) => e.value === eventType)) {
        errors.push(`${field.label}: invalid eventType`);
        return null;
      }
      const count = Number(v.count);
      if (!Number.isFinite(count)) {
        errors.push(`${field.label}: event count needs a number`);
        return null;
      }
      value = { eventType, count };
      if (v.filter?.code) value.filter = { code: String(v.filter.code).trim() };
      const lookback = normalizeLookback(v.lookback);
      if (lookback) value.lookback = lookback;
      break;
    }
    default: {
      const text = String(v.text ?? '').trim();
      if (!text) {
        errors.push(`${field.label}: missing text value`);
        return null;
      }
      value = { text };
      break;
    }
  }

  return {
    id: raw.id || nextId('rb'),
    field: fieldKey,
    operator: opName,
    value,
  };
}

function normalizeNode(raw, errors, prefix) {
  if (!raw || typeof raw !== 'object') {
    errors.push('Invalid rule node');
    return null;
  }
  if (isGroup(raw)) {
    const combinator = raw.combinator === 'or' ? 'or' : 'and';
    const rules = (raw.rules || [])
      .map((child, i) => normalizeNode(child, errors, `${prefix}-${i}`))
      .filter(Boolean);
    if (rules.length === 0) {
      errors.push('Rule group has no valid conditions');
      return null;
    }
    return {
      id: raw.id || nextId(`${prefix}-g`),
      combinator,
      rules,
    };
  }
  return normalizeLeaf(raw, errors);
}

/**
 * Validates and normalizes an AI-generated rule tree for the builder.
 * @returns {{ query: object | null, errors: string[] }}
 */
export function normalizeAiRuleQuery(raw) {
  idSeq = 0;
  const errors = [];
  if (!raw || typeof raw !== 'object') {
    return { query: null, errors: ['Missing rule object'] };
  }
  const query = normalizeNode(raw, errors, 'ai');
  if (!query || !isGroup(query)) {
    return { query: null, errors: errors.length ? errors : ['Rule must be a group with combinator and rules'] };
  }
  return { query, errors };
}
