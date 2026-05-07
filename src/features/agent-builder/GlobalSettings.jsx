import { useState, useEffect } from 'react';
import { Icon } from '../../components/Icon/Icon';
import { Switch } from '../../components/Switch/Switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import { Slider } from '../../components/ui/slider';
import { useAppStore } from '../../store/useAppStore';
import styles from './GlobalSettings.module.css';

/**
 * Global Settings — agent-wide configuration that applies across every node
 * in the conversation flow. Section list and field layouts match the
 * Avergent product's Global Settings page (see screenshots).
 *
 * Sections (in order):
 *   1. Agent Identity
 *   2. Global Prompt
 *   3. Utility Configuration
 *   4. Interface
 *   5. Voice Configuration
 *   6. Speech Settings
 *   7. Call Settings
 *   8. Security & Fallback Settings
 *   9. Summary template
 *  10. Welcome message
 *
 * State persists on builderAgent.globalSettings via the store.
 */

const LLM_MODELS = [
  { id: 'gpt-4.1', label: 'GPT 4.1' },
  { id: 'gpt-4.1-mini', label: 'GPT 4.1 mini' },
  { id: 'claude-opus-4-7', label: 'Claude Opus 4.7' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
];

const VOICES = [
  { id: 'erica', label: 'Erica · American · Female' },
  { id: 'sarah', label: 'Sarah · British · Female' },
  { id: 'james', label: 'James · American · Male' },
  { id: 'mei', label: 'Mei · Mandarin · Female' },
];

const LANGUAGES = ['English (US)', 'English (UK)', 'Spanish', 'French', 'German', 'Mandarin', 'Japanese', 'Hindi'];

const BACKGROUND_SOUNDS = [
  { id: 'none', label: 'None' },
  { id: 'office', label: 'Office Ambient' },
  { id: 'cafe', label: 'Coffee Shop' },
  { id: 'callcenter', label: 'Call center' },
  { id: 'static', label: 'Phone Static' },
];

const VOICEMAIL_ACTIONS = [
  { id: 'leave', label: 'Leave a message' },
  { id: 'hangup', label: 'Hang up immediately' },
];

const FALLBACK_BEHAVIORS = [
  { id: 'transfer', label: 'Transfer to human' },
  { id: 'retry', label: 'Retry once then transfer' },
  { id: 'end', label: 'End the call gracefully' },
];

/* ── Reusable section primitive ──
   Collapsed = single-line icon + title + chevron (matches the product).
   Expanded body opens with an optional in-body title + description, then
   the fields. */
function Section({ icon, title, defaultOpen = true, description, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={styles.section}>
      <button
        className={`${styles.sectionHeader} ${open ? styles.sectionHeaderActive : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        <div className={styles.sectionHeaderLeft}>
          <Icon name={icon} size={16} color="var(--neutral-400)" />
          <span className={styles.sectionTitle}>{title}</span>
        </div>
        <Icon
          name={open ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
          size={14}
          color="var(--neutral-300)"
        />
      </button>
      {open && (
        <div className={styles.sectionBody}>
          {description && <p className={styles.sectionDescription}>{description}</p>}
          {children}
        </div>
      )}
    </section>
  );
}

function Field({ label, hint, required, children, footer }) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldHeader}>
        <span className={styles.fieldLabel}>
          {label}
          {required && <span className={styles.fieldRequired}>*</span>}
        </span>
        {hint && <span className={styles.fieldHint}>{hint}</span>}
      </div>
      {children}
      {footer && <div className={styles.fieldFooter}>{footer}</div>}
    </div>
  );
}

function StaticField({ label, value }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.staticValue}>{value}</span>
    </div>
  );
}

function SliderField({ label, hint, value, min = 0, max = 1, step = 0.05, formatValue, onChange, extra }) {
  return (
    <Field label={label} hint={hint}>
      <div className={styles.sliderRow}>
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={(v) => onChange(v[0])}
          className={styles.slider}
        />
        {formatValue !== false && (
          <span className={styles.sliderValue}>
            {formatValue ? formatValue(value) : value.toFixed(2)}
          </span>
        )}
      </div>
      {extra}
    </Field>
  );
}

function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <div className={styles.toggleRow}>
      <div className={styles.toggleRowText}>
        <span className={styles.fieldLabel}>{label}</span>
        {hint && <span className={styles.fieldHint}>{hint}</span>}
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

function CheckRow({ label, checked, onChange }) {
  return (
    <label className={styles.checkRow}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function NumberUnit({ value, onChange, unit, min = 0, max = 9999 }) {
  return (
    <div className={styles.numberUnit}>
      <input
        type="number"
        className={styles.numberInput}
        value={value}
        min={min}
        max={max}
        onChange={e => onChange(Number(e.target.value))}
      />
      <span className={styles.numberUnitLabel}>{unit}</span>
    </div>
  );
}

const DEFAULT_SETTINGS = {
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

export function GlobalSettings() {
  const builderAgent = useAppStore(s => s.builderAgent);
  const updateBuilderAgent = useAppStore(s => s.updateBuilderAgent);
  const showToast = useAppStore(s => s.showToast);

  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    agentName: builderAgent?.name || '',
    ...(builderAgent?.globalSettings || {}),
  }));
  // Track which required fields have been "touched" so we don't yell at
  // the user before they've started filling things in. A click on the
  // Save Settings button marks everything touched at once.
  const [touched, setTouched] = useState({});

  const errors = {
    agentName: settings.agentName?.trim() ? '' : 'Agent Name is required',
    useCaseName: settings.useCaseName?.trim() ? '' : 'Use Case is required',
  };
  const isValid = !errors.agentName && !errors.useCaseName;

  const update = (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    if (updateBuilderAgent) updateBuilderAgent({ globalSettings: next });
  };

  const markTouched = (key) => setTouched(t => ({ ...t, [key]: true }));

  // Surface inline errors when a field has been blurred OR when the
  // toolbar Save was clicked while the field was invalid (the store
  // bumps `builderValidationAttempt` to signal that).
  const validationAttempt = useAppStore(s => s.builderValidationAttempt) || 0;
  useEffect(() => {
    if (validationAttempt > 0) setTouched({ agentName: true, useCaseName: true });
  }, [validationAttempt]);

  const showAgentNameError = touched.agentName && errors.agentName;
  const showUseCaseError = touched.useCaseName && errors.useCaseName;

  return (
    <div className={styles.panel}>
      <div className={styles.scrollArea}>

        {/* ── 1. Agent Identity ── */}
        <Section
          icon="solar:user-rounded-linear"
          title="Agent Identity"
          description="Select from the library or add custom goals to guide instruction generation."
        >
          <StaticField label="Agent type" value={settings.agentType} />
          <Field label="Agent Name" required>
            <input
              type="text"
              className={`${styles.input} ${showAgentNameError ? styles.inputError : ''}`}
              value={settings.agentName}
              onChange={e => update('agentName', e.target.value)}
              onBlur={() => markTouched('agentName')}
              placeholder="Enter agent name"
              aria-invalid={!!showAgentNameError}
            />
            {showAgentNameError && <span className={styles.errorMsg}>{errors.agentName}</span>}
          </Field>
          <Field
            label="Use Case"
            required
            footer={
              <>
                {showUseCaseError && <span className={styles.errorMsg}>{errors.useCaseName}</span>}
                <span className={styles.charCount} style={{ marginLeft: 'auto' }}>
                  {settings.useCaseName.length}/500
                </span>
              </>
            }
          >
            <textarea
              className={`${styles.textarea} ${showUseCaseError ? styles.inputError : ''}`}
              value={settings.useCaseName}
              onChange={e => update('useCaseName', e.target.value.slice(0, 500))}
              onBlur={() => markTouched('useCaseName')}
              maxLength={500}
              rows={2}
              placeholder="Describe what this agent is for"
              aria-invalid={!!showUseCaseError}
            />
          </Field>
        </Section>

        {/* ── 2. Global Prompt ── */}
        <Section
          icon="solar:pen-new-square-linear"
          title="Global Prompt"
          defaultOpen={false}
          description="Persona, instructions, and guardrails applied across every node."
        >
          <Field label="Model">
            <Select value={settings.llmModel} onValueChange={v => update('llmModel', v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LLM_MODELS.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <textarea
            className={styles.textarea}
            value={settings.globalPrompt}
            onChange={e => update('globalPrompt', e.target.value)}
            rows={8}
            placeholder="You are an AI assistant calling on behalf of the care team..."
          />
        </Section>

        {/* ── 3. Utility Configuration ── */}
        <Section
          icon="solar:settings-linear"
          title="Utility Configuration"
          defaultOpen={false}
          description="Reusable variables and dynamic context available to every node. Reference with {{variable_name}} from any prompt."
        >
          <Field label="Utility Variables">
            <textarea
              className={styles.textarea}
              value={(settings.utilityVariables || []).join('\n')}
              onChange={e => update('utilityVariables', e.target.value.split('\n').filter(Boolean))}
              rows={4}
              placeholder="patient.name=Jane Doe&#10;patient.dob=1986-04-12&#10;previous_conversation=Discussed med refills"
            />
          </Field>
        </Section>

        {/* ── 4. Interface ── */}
        <Section
          icon="solar:monitor-linear"
          title="Interface"
          defaultOpen={false}
          description="How the agent connects with users — voice, chat, or both — and which languages it speaks."
        >
          <Field label="Modality">
            <Select value={settings.interfaceMode} onValueChange={v => update('interfaceMode', v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="voice">Voice</SelectItem>
                <SelectItem value="chat">Chat</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <ToggleRow
            label="Allow multiple languages"
            hint="Agent can switch between selected languages mid-call."
            checked={settings.multipleLanguages}
            onChange={v => update('multipleLanguages', v)}
          />
          <Field label={settings.multipleLanguages ? 'Languages' : 'Agent Language'}>
            {settings.multipleLanguages ? (
              <div className={styles.checkGrid}>
                {LANGUAGES.map(l => (
                  <CheckRow
                    key={l}
                    label={l}
                    checked={(settings.languages || []).includes(l)}
                    onChange={(checked) => {
                      const list = settings.languages || [];
                      update('languages', checked ? [...list, l] : list.filter(x => x !== l));
                    }}
                  />
                ))}
              </div>
            ) : (
              <Select value={settings.agentLanguage} onValueChange={v => update('agentLanguage', v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </Field>
        </Section>

        {/* ── 5. Voice Configuration ── */}
        <Section
          icon="solar:volume-loud-linear"
          title="Voice Configuration"
          defaultOpen={false}
        >
          <Field label="Voice">
            <Select value={settings.voiceId} onValueChange={v => update('voiceId', v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {VOICES.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <SliderField
            label="Voice Temperature"
            hint="Lower is more stable, higher is more variant."
            value={settings.voiceTemperature}
            onChange={v => update('voiceTemperature', v)}
          />
          <SliderField
            label="Voice Speed"
            hint="Talking pace."
            value={settings.voiceSpeed}
            min={0.5}
            max={2}
            step={0.05}
            formatValue={v => `${v.toFixed(2)}×`}
            onChange={v => update('voiceSpeed', v)}
          />
          <SliderField
            label="Voice Volume"
            value={settings.voiceVolume}
            min={0}
            max={2}
            step={0.05}
            formatValue={v => `${Math.round(v * 100)}%`}
            onChange={v => update('voiceVolume', v)}
          />
        </Section>

        {/* ── 6. Speech Settings ── */}
        <Section
          icon="solar:chat-round-dots-linear"
          title="Speech Settings"
          defaultOpen={false}
        >
          <Field label="Background Sound">
            <Select value={settings.backgroundSound} onValueChange={v => update('backgroundSound', v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BACKGROUND_SOUNDS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <SliderField
            label="Responsiveness"
            hint="Control how fast the agent responds after users finish speaking."
            value={settings.responsiveness}
            min={0}
            max={1}
            step={0.05}
            formatValue={false}
            onChange={v => update('responsiveness', v)}
            extra={
              <CheckRow
                label="Dynamically adjust based on user input"
                checked={settings.responsivenessDynamic}
                onChange={v => update('responsivenessDynamic', v)}
              />
            }
          />

          <SliderField
            label="Interruption Sensitivity"
            hint="Control how sensitively AI can be interrupted by human speech."
            value={settings.interruptionSensitivity}
            min={0}
            max={1}
            step={0.05}
            formatValue={false}
            onChange={v => update('interruptionSensitivity', v)}
          />

          <ToggleRow
            label="Enable Backchanneling"
            hint='Enables the agent to use affirmations like "yeah" or "uh-huh" during conversations.'
            checked={settings.enableBackchanneling}
            onChange={v => update('enableBackchanneling', v)}
          />

          <ToggleRow
            label="Enable Speech Normalization"
            hint="Converts text elements like numbers, currency, and dates into human-like spoken forms."
            checked={settings.enableSpeechNormalization}
            onChange={v => update('enableSpeechNormalization', v)}
          />

          <Field label="Reminder Message Frequency" hint="Control how often AI will send a reminder message.">
            <div className={styles.numberUnitRow}>
              <NumberUnit
                value={settings.reminderEverySec}
                onChange={v => update('reminderEverySec', v)}
                unit="seconds"
                min={1}
                max={300}
              />
              <NumberUnit
                value={settings.reminderTimes}
                onChange={v => update('reminderTimes', v)}
                unit="times"
                min={1}
                max={20}
              />
            </div>
          </Field>
        </Section>

        {/* ── 7. Call Settings ── */}
        <Section
          icon="solar:phone-linear"
          title="Call Settings"
          defaultOpen={false}
        >
          <ToggleRow
            label="Voicemail Detection"
            hint="Detect voicemail and decide what to do."
            checked={settings.voicemailDetection}
            onChange={v => update('voicemailDetection', v)}
          />
          {settings.voicemailDetection && (
            <>
              <Field label="When voicemail is detected">
                <Select value={settings.voicemailAction} onValueChange={v => update('voicemailAction', v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VOICEMAIL_ACTIONS.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              {settings.voicemailAction === 'leave' && (
                <Field label="Voicemail Message">
                  <textarea
                    className={styles.textarea}
                    value={settings.voicemailMessage}
                    onChange={e => update('voicemailMessage', e.target.value)}
                    rows={3}
                  />
                </Field>
              )}
            </>
          )}
          <SliderField
            label="End Call on Silence"
            hint="Hang up after N seconds of silence."
            value={settings.endOnSilenceSec}
            min={5}
            max={120}
            step={1}
            formatValue={v => `${Math.round(v)}s`}
            onChange={v => update('endOnSilenceSec', v)}
          />
          <SliderField
            label="Maximum Call Duration"
            value={settings.maxCallDurationMin}
            min={1}
            max={120}
            step={1}
            formatValue={v => `${Math.round(v)} min`}
            onChange={v => update('maxCallDurationMin', v)}
          />
          <SliderField
            label="Pause Before Speaking"
            hint="Initial delay before agent speaks."
            value={settings.pauseBeforeSpeakingSec}
            min={0}
            max={3}
            step={0.1}
            formatValue={v => `${v.toFixed(1)}s`}
            onChange={v => update('pauseBeforeSpeakingSec', v)}
          />
          <Field label="Speaker Priority">
            <Select value={settings.speakerPriority} onValueChange={v => update('speakerPriority', v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent speaks first</SelectItem>
                <SelectItem value="user">User speaks first</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Section>

        {/* ── 8. Security & Fallback Settings ── */}
        <Section
          icon="solar:shield-check-linear"
          title="Security & Fallback Settings"
          defaultOpen={false}
        >
          <ToggleRow
            label="Opt out of sensitive data storage"
            hint="Don't persist potentially sensitive transcript data."
            checked={settings.optOutSensitive}
            onChange={v => update('optOutSensitive', v)}
          />
          <Field label="Webhook URL" hint="POST event payloads here.">
            <input
              type="url"
              className={styles.input}
              value={settings.webhookUrl}
              onChange={e => update('webhookUrl', e.target.value)}
              placeholder="https://api.example.com/retell/events"
            />
          </Field>
          <Field label="Fallback Behavior" hint="What to do if the agent fails or stalls.">
            <Select value={settings.fallbackBehavior} onValueChange={v => update('fallbackBehavior', v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FALLBACK_BEHAVIORS.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </Section>

        {/* ── 9. Summary template ── */}
        <Section
          icon="solar:pen-new-square-linear"
          title="Summary template"
          defaultOpen={false}
          description="Format the post-call summary the agent generates. Use {{variable}} placeholders."
        >
          <textarea
            className={styles.textarea}
            value={settings.summaryTemplate}
            onChange={e => update('summaryTemplate', e.target.value)}
            rows={6}
            placeholder={'Caller: {{caller_name}}\nReason: {{reason}}\nKey points: {{key_points}}\nNext step: {{next_step}}'}
          />
        </Section>

        {/* ── 10. Welcome message ── */}
        <Section
          icon="solar:chat-round-dots-linear"
          title="Welcome message"
          defaultOpen={false}
          description="First thing the agent says when the call connects."
        >
          <textarea
            className={styles.textarea}
            value={settings.welcomeMessage}
            onChange={e => update('welcomeMessage', e.target.value)}
            rows={3}
            placeholder="Hi, this is Anna calling from your care team. Is now a good time to talk?"
          />
        </Section>
      </div>

    </div>
  );
}
