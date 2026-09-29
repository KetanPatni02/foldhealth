// Display and value rules for Note Template field descriptors
// (GAP_TEMPLATES / public.forms.schema.items). Shared by every renderer
// (Care Gap evidence form, Settings template preview, note preview, PDF)
// so a rule behaves the same wherever the template is shown.
//
// Descriptor additions on top of { key, label, type, options, required }:
//   showWhen: { field, equals }   – field renders (and is required) only
//                                   when answers[field] === equals
//   derive: { from, threshold, below, atOrAbove }
//                                 – value is set from a numeric field:
//                                   < threshold → below, ≥ threshold → atOrAbove
//   readOnly: true                – not user-editable (pairs with derive)
//   consentWhen: <value>          – when this field equals <value>, the
//                                   note-level telehealth consent is required
//   type 'content'                – read-only block: { title, bullets: [] }.
//                                   The block shown is saved into the answers
//                                   under its key, so a signed note keeps the
//                                   exact wording even if the template changes.
//   type 'user-select'            – every system user; those with clinical
//                                   `role` are grouped first. Stores the
//                                   email, shown as "Name (email)".

export function isFieldVisible(field, answers) {
  const rule = field?.showWhen;
  if (!rule) return true;
  return answers?.[rule.field] === rule.equals;
}

function deriveValue(rule, answers) {
  const raw = answers?.[rule.from];
  if (raw === '' || raw == null) return '';
  const n = Number(raw);
  if (!Number.isFinite(n)) return '';
  return n < rule.threshold ? rule.below : rule.atOrAbove;
}

// Returns the derived-field patch implied by `answers` (only keys whose
// value changes), so callers can merge it into the same update. Derived
// values are applied first so content blocks follow the new value.
export function derivedPatch(items, answers) {
  const patch = {};
  for (const f of items || []) {
    if (!f.derive) continue;
    const next = deriveValue(f.derive, answers);
    if ((answers?.[f.key] ?? '') !== next) patch[f.key] = next;
  }
  const merged = { ...answers, ...patch };
  for (const f of items || []) {
    if (f.type !== 'content') continue;
    const next = isFieldVisible(f, merged) ? { title: f.title, bullets: f.bullets || [] } : '';
    if (JSON.stringify(answers?.[f.key] ?? '') !== JSON.stringify(next)) patch[f.key] = next;
  }
  return patch;
}

// The saved block for a content field, else the template's current copy.
export function contentOf(field, answers) {
  const saved = answers?.[field.key];
  return saved && typeof saved === 'object' ? saved : { title: field.title, bullets: field.bullets || [] };
}

// Keys that must be filled for the template to count as complete: the
// required fields that are currently visible. Content blocks carry no value.
export function requiredKeys(items, answers) {
  return (items || [])
    .filter(f => f.required && f.type !== 'content' && isFieldVisible(f, answers))
    .map(f => f.key);
}

// True when a field's `consentWhen` value is selected, i.e. the note-level
// telehealth consent (audio-only / audio-video) must be ticked.
export function needsTelehealthConsent(items, answers) {
  return (items || []).some(f => f.consentWhen != null && answers?.[f.key] === f.consentWhen);
}

export function userSelectOptions(field, users) {
  const toOption = (u) => ({
    value: u.email || u.name,
    label: u.email ? `${u.name} (${u.email})` : u.name,
    searchText: `${u.name} ${u.email || ''}`.trim(),
  });
  const all = (users || []).filter(u => u.name).sort((a, b) => a.name.localeCompare(b.name));
  const inRole = field.role ? all.filter(u => (u.clinicalRoles || []).includes(field.role)) : [];
  if (!inRole.length) return all.map(toOption);
  const others = all.filter(u => !inRole.includes(u));
  return [
    { type: 'header', value: '__role', label: `${field.role}s` },
    ...inRole.map(toOption),
    ...(others.length ? [{ type: 'header', value: '__others', label: 'All users' }, ...others.map(toOption)] : []),
  ];
}
