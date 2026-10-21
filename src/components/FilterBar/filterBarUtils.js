export const FILTER_DEFS = [
  { key: 'gender', label: 'Gender', primary: true, options: [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
    { value: 'O', label: 'Other' },
  ]},
  { key: 'language', label: 'Language', primary: true, options: [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'zh', label: 'Chinese' },
    { value: 'yue', label: 'Cantonese' },
    { value: 'ko', label: 'Korean' },
    { value: 'vi', label: 'Vietnamese' },
  ]},
  { key: 'lace', label: 'LACE Acuity', primary: true, options: [
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' },
  ]},
  { key: 'tocStatus', label: 'TCM Status', primary: true, options: [
    { value: 'enrolled', label: 'Enrolled' },
    { value: 'engaged', label: 'Engaged' },
    { value: 'attempted', label: 'Attempted' },
    { value: 'new', label: 'New' },
  ]},
  { key: 'status', label: 'Status', primary: true, options: [
    { value: 'completed', label: 'Completed' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'oncall', label: 'On Call' },
    { value: 'queued', label: 'Queued' },
    { value: 'failed', label: 'Failed' },
  ]},
  { key: 'assignee', label: 'Assigned to', primary: true, optionsFromData: true },
  { key: 'outreachType', label: 'Outreach Window', primary: true, options: [
    { value: '48h', label: 'TCM 48h' },
    { value: '7d', label: 'TCM 7d' },
  ]},
  { key: 'tocType', label: 'Trigger Type', primary: false, options: [
    { value: 'IP', label: 'IP (Inpatient)' },
    { value: 'ED', label: 'ED (Emergency)' },
  ]},
  { key: 'readmission', label: 'Readmission', primary: false, options: [
    { value: 'Yes', label: 'Yes' },
    { value: 'No', label: 'No' },
  ]},
  { key: 'carePlanStatus', label: 'Care Plan', primary: false, options: [
    { value: 'updated', label: 'Updated' },
    { value: 'pending', label: 'Pending' },
    { value: 'none', label: 'No Care Plan' },
  ]},
  { key: 'priority', label: 'Priority', primary: false, options: [
    { value: '1', label: 'Critical' },
    { value: '2', label: 'High' },
    { value: '3', label: 'Medium' },
    { value: '4', label: 'Low' },
  ]},
  { key: 'outreachCategory', label: 'Outreach Category', primary: false, options: [
    { value: 'post-visit', label: 'Post-Visit' },
    { value: 'appointment', label: 'Appointment' },
    { value: 'refill', label: 'Refill' },
    { value: 'care-gap', label: 'Care Gap' },
    { value: 'waitlist', label: 'Waitlist' },
  ]},
  { key: 'agentAssigned', label: 'Agent', primary: false, optionsFromData: true },
];

// TOC IP's filter allocation per the worklist filter spec: always-primary
// (Gender, Language, Assignee; the rest aren't on TOC IP yet), then Program
// Sub Status (the TOC IP Status chip), Care Plan Status and Readmission.
// Everything else is secondary, under its domain in More Filters. TCM keeps
// FILTER_DEFS as they are.
const TOC_IP_PRIMARY = ['gender', 'language', 'assignee', 'tocStatus', 'carePlanStatus', 'readmission'];
const TOC_IP_GROUP = {
  status: 'Workflow Status', outreachType: 'Workflow Status', tocType: 'Workflow Status',
  priority: 'Workflow Status', outreachCategory: 'Workflow Status',
  agentAssigned: 'Assignment',
  lace: 'Clinical',
};
const TOC_IP_LABEL = { assignee: 'Assignee', carePlanStatus: 'Care Plan Status' };

function tocIpDefs(defs) {
  const byKey = Object.fromEntries(defs.map(d => [d.key, d]));
  const primary = TOC_IP_PRIMARY.map(k => ({ ...byKey[k], primary: true, label: TOC_IP_LABEL[k] || byKey[k].label }));
  const secondary = defs
    .filter(d => !TOC_IP_PRIMARY.includes(d.key))
    .map(d => ({ ...d, primary: false, group: TOC_IP_GROUP[d.key] }));
  return [...primary, ...secondary];
}

/** Relabel status + outreach chips for the standalone TOC queue vs TCM. */
export function filterDefsForList(list) {
  const program = list === 'TOC IP' ? 'TOC IP' : 'TCM';
  const defs = FILTER_DEFS.map((def) => {
    if (def.key === 'tocStatus') return { ...def, label: `${program} Status` };
    if (def.key === 'outreachType') {
      return {
        ...def,
        options: [
          { value: '48h', label: `${program} 48h` },
          { value: '7d', label: `${program} 7d` },
        ],
      };
    }
    return def;
  });
  return list === 'TOC IP' ? tocIpDefs(defs) : defs;
}

export function resolveOptions(filterDef, patients) {
  if (filterDef.optionsFromData) {
    const unique = [...new Set((patients || []).flatMap(p => { const v = p[filterDef.key]; return v ? [v] : []; }))];
    return unique.sort().map(a => ({ value: a, label: a }));
  }
  return filterDef.options || [];
}

export function mergeRefs(...refs) {
  return (node) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') ref(node);
      else ref.current = node;
    }
  };
}
