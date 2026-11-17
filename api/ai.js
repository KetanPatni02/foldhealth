// AI drafting and summaries, one function (see _lib/dispatch.js):
// /api/pop-group-rule-from-nl, /api/care-plan-summary,
// /api/care-plan-template-draft, /api/care-plan-individualized,
// /api/patient-recap-summary, /api/clinical-protocol-parse,
// /api/template-optimization, /api/care-plan-event-update,
// /api/outreach-summary, /api/pcp-outreach-split.
import { dispatch } from './_lib/dispatch.js';
import popGroupRuleFromNl from './_handlers/pop-group-rule-from-nl.js';
import carePlanSummary from './_handlers/care-plan-summary.js';
import carePlanTemplateDraft from './_handlers/care-plan-template-draft.js';
import carePlanIndividualized from './_handlers/care-plan-individualized.js';
import patientRecapSummary from './_handlers/patient-recap-summary.js';
import clinicalProtocolParse from './_handlers/clinical-protocol-parse.js';
import templateOptimization from './_handlers/template-optimization.js';
import carePlanEventUpdate from './_handlers/care-plan-event-update.js';
import outreachSummary from './_handlers/outreach-summary.js';
import pcpOutreachSplit from './_handlers/pcp-outreach-split.js';

export default dispatch(
  {
    'pop-group-rule-from-nl': popGroupRuleFromNl,
    'care-plan-summary': carePlanSummary,
    'care-plan-template-draft': carePlanTemplateDraft,
    'care-plan-individualized': carePlanIndividualized,
    'patient-recap-summary': patientRecapSummary,
    'clinical-protocol-parse': clinicalProtocolParse,
    'template-optimization': templateOptimization,
    'care-plan-event-update': carePlanEventUpdate,
    'outreach-summary': outreachSummary,
    'pcp-outreach-split': pcpOutreachSplit,
  },
  {
    '/api/pop-group-rule-from-nl': 'pop-group-rule-from-nl',
    '/api/care-plan-summary': 'care-plan-summary',
    '/api/care-plan-template-draft': 'care-plan-template-draft',
    '/api/care-plan-individualized': 'care-plan-individualized',
    '/api/patient-recap-summary': 'patient-recap-summary',
    '/api/clinical-protocol-parse': 'clinical-protocol-parse',
    '/api/template-optimization': 'template-optimization',
    '/api/care-plan-event-update': 'care-plan-event-update',
    '/api/outreach-summary': 'outreach-summary',
    '/api/pcp-outreach-split': 'pcp-outreach-split',
  },
);
