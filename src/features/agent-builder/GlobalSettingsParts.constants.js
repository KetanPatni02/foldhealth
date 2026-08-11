export const LLM_MODELS = [
  { id: 'gpt-4.1', label: 'GPT 4.1' },
  { id: 'gpt-4.1-mini', label: 'GPT 4.1 mini' },
  { id: 'claude-opus-4-7', label: 'Claude Opus 4.7' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
];

export const VOICES = [
  { id: 'erica', label: 'Erica · American · Female' },
  { id: 'sarah', label: 'Sarah · British · Female' },
  { id: 'james', label: 'James · American · Male' },
  { id: 'mei', label: 'Mei · Mandarin · Female' },
];

export const LANGUAGES = ['English (US)', 'English (UK)', 'Spanish', 'French', 'German', 'Mandarin', 'Japanese', 'Hindi'];

export const BACKGROUND_SOUNDS = [
  { id: 'none', label: 'None' },
  { id: 'office', label: 'Office Ambient' },
  { id: 'cafe', label: 'Coffee Shop' },
  { id: 'callcenter', label: 'Call center' },
  { id: 'static', label: 'Phone Static' },
];

export const VOICEMAIL_ACTIONS = [
  { id: 'leave', label: 'Leave a message' },
  { id: 'hangup', label: 'Hang up immediately' },
];

export const FALLBACK_BEHAVIORS = [
  { id: 'transfer', label: 'Transfer to human' },
  { id: 'retry', label: 'Retry once then transfer' },
  { id: 'end', label: 'End the call gracefully' },
];

export const DEFAULT_SETTINGS = {
  // Agent Identity
  agentType: 'Conversation flow agent',
  agentName: '',
  useCaseName: '',
  // Global Prompt
  llmModel: 'gpt-4.1-mini',
  globalPrompt: '',
  // Utility Configuration
  utilityVariables: [],
  // Interface
  interfaceMode: 'voice',
  agentLanguage: 'English (US)',
  multipleLanguages: false,
  languages: ['English (US)'],
  // Voice Configuration
  voiceId: 'erica',
  voiceTemperature: 0.5,
  voiceSpeed: 1.0,
  voiceVolume: 1.0,
  // Speech Settings
  backgroundSound: 'callcenter',
  responsiveness: 1.0,
  responsivenessDynamic: false,
  interruptionSensitivity: 1.0,
  enableBackchanneling: false,
  enableSpeechNormalization: false,
  reminderEverySec: 10,
  reminderTimes: 1,
  boostedKeywords: [],
  pronunciationGuide: '',
  // Call Settings
  voicemailDetection: true,
  voicemailAction: 'leave',
  voicemailMessage: 'Hi, this is your care team. Please call us back at your convenience.',
  endOnSilenceSec: 30,
  maxCallDurationMin: 30,
  pauseBeforeSpeakingSec: 0.5,
  speakerPriority: 'agent',
  // Security & Fallback
  optOutSensitive: false,
  webhookUrl: '',
  fallbackBehavior: 'transfer',
  // Summary template
  summaryTemplate: '',
  // Welcome message
  welcomeMessage: '',
};
