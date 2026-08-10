/* ── Section definitions ── */
export const SECTIONS = [
  { id: 'agent-use-case', label: 'Agent Use Case', icon: 'solar:user-rounded-linear', complete: true },
  { id: 'personalization', label: 'Personalization', icon: 'solar:magic-stick-3-linear', complete: true },
  { id: 'policies', label: 'Policies', icon: 'solar:shield-check-linear', complete: true },
  { id: 'target-population', label: 'Target Population', icon: 'solar:users-group-rounded-linear', complete: true },
  { id: 'knowledge-base', label: 'Knowledge Base', icon: 'solar:book-2-linear', complete: false },
  { id: 'communication', label: 'Communication Preferences', icon: 'solar:phone-calling-rounded-linear', complete: true },
];

export const TONE_OPTIONS = [
  { id: 'professional', title: 'Professional', desc: 'Formal & Businesslike' },
  { id: 'warm', title: 'Warm & Caring', desc: 'Empathetic & Friendly' },
  { id: 'casual', title: 'Casual', desc: 'Relaxed & Conversational' },
  { id: 'direct', title: 'Direct', desc: 'Clear & Concise' },
];

export const VOICE_OPTIONS = [
  { id: 'erica', label: 'Erica - US Female - Empathetic & Calm' },
  { id: 'james', label: 'James - US Male - Professional & Warm' },
  { id: 'sophia', label: 'Sophia - US Female - Friendly & Upbeat' },
  { id: 'david', label: 'David - UK Male - Calm & Reassuring' },
];

export const ROLE_OPTIONS = [
  { id: 'coordinator', label: 'Care Coordinator' },
  { id: 'navigator', label: 'Care Navigator' },
  { id: 'outreach', label: 'Outreach Specialist' },
  { id: 'scheduler', label: 'Scheduling Assistant' },
];

export const LANGUAGE_OPTIONS = [
  { id: 'english', label: 'English (Primary)' },
  { id: 'chinese', label: 'Chinese (Mandarin)' },
  { id: 'spanish', label: 'Spanish' },
  { id: 'vietnamese', label: 'Vietnamese' },
  { id: 'korean', label: 'Korean' },
  { id: 'french', label: 'French' },
];

export const ADAPTATION_OPTIONS = [
  { id: 'elderly', label: 'Elderly patients (slower pace, clearer speech, simpler language)' },
  { id: 'plain', label: 'Plain language (avoid medical jargon)' },
  { id: 'lowLiteracy', label: 'Low health literacy (extra explanations)' },
  { id: 'hearing', label: 'Hearing impaired (louder, clearer, slower)' },
];

export const POLICY_TEMPLATES = [
  { id: 'emergency', name: 'Emergency Escalation', desc: 'Automatic 911 prompts for critical symptoms: chest pain, difficulty breathing, stroke symptoms, severe bleeding', recommended: false },
  { id: 'medication', name: 'Medication Adherence Monitoring', desc: 'Check each medication individually, document non-adherence reasons, offer interventions for cost or side effects', recommended: true },
  { id: 'empathetic', name: 'Empathetic Communication', desc: 'Natural acknowledgments, validation phrases, appropriate responses to patient distress', recommended: true },
];

export const POPULATION_OPTIONS = [
  { id: 'popGroup', title: 'Population Group', desc: 'Select from pop-groups' },
  { id: 'worklist', title: 'Worklist', desc: 'Select predefined Worklist' },
  { id: 'upload', title: 'Upload Patient List', desc: 'Upload Excel or CSV file' },
];

export const MODALITY_OPTIONS = [
  { id: 'voice', title: 'Voice' },
  { id: 'text', title: 'Text' },
  { id: 'both', title: 'Both' },
];

export const DEFAULT_FORM = {
  agentName: '',
  agentRole: '',
  useCaseName: '',
  description: '',
  goalIds: [],
  systemPrompt: '',
  toneOfVoice: 'professional',
  voice: 'erica',
  empathyLevel: 75,
  speakingPace: 75,
  languages: ['english'],
  adaptations: [],
  selectedPolicies: [],
  populationType: 'worklist',
  selectedWorklist: '',
  modality: 'voice',
  phone: '',
  email: '',
  officeHours: '',
};
