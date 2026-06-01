/**
 * Shared form renderer for the builder Preview tab and the public fill view.
 *
 * Layouts (settings.layout):
 *  - entire-page : one scrolling page with header/footer (default, legacy).
 *  - by-question : Typeform-style, ONE question per screen, start + end screens,
 *                  keyboard nav, auto-advance on single-select.
 *  - by-section  : same one-question-at-a-time flow + a top section stepper and
 *                  section progress.
 * Paged modes replace the header/footer with configurable Start / End screens.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { Button } from '../../../components/Button/Button';
import { FieldInput } from '../builder/FieldInput';
import { FormHeader, FormFooter } from '../builder/FormChrome';
import { getFontStack } from '../../email-builder/googleFonts';
import { isAnswered } from '../scoring/util';
import { evaluate } from '../scoring/evaluate';
import { toQuestionnaire } from '../builder/engineAdapter';
import { normalizeLayout, buildFlow, requiredLeaves, isVisible } from './layout';
import styles from './FormRenderer.module.css';

// ── Entire-page recursive renderer (group / display / leaf) ──
function FieldNode({ field, answers, onAnswer, missing, visibility }) {
  if (!isVisible(field.linkId, visibility)) return null; // branching: hidden field/group
  if (field.type === 'group') {
    return (
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{field.text}</div>
        {(field.items || []).map((sub) => (
          <FieldNode key={sub.linkId} field={sub} answers={answers} onAnswer={onAnswer} missing={missing} visibility={visibility} />
        ))}
      </div>
    );
  }
  if (field.type === 'display') {
    return <div className={styles.field}><FieldInput field={field} interactive={false} /></div>;
  }
  return (
    <div className={styles.field}>
      <label className={styles.label}>{field.text}{field.required && <span className={styles.req}>*</span>}</label>
      {field.description ? <p className={styles.desc}>{field.description}</p> : null}
      <FieldInput field={field} interactive value={answers[field.linkId]} onChange={(v) => onAnswer(field.linkId, v)} />
      {missing.has(field.linkId) ? <span className={styles.missing}>This field is required.</span> : null}
    </div>
  );
}

// Keyboard glyph icons (provided by design). currentColor so they inherit.
function EnterIcon({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={{ flexShrink: 0 }}>
      <path d="M9.5 7L4.5 12L9.5 17M4.5 12L14.5 12C16.1667 12 19.5 11 19.5 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ShiftIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 4 11h4v8h8v-8h4L12 3Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Bare ↵ icon shown after a button label — inherits the label's color + size.
function EnterBadge() {
  return <EnterIcon size="1.05em" className={styles.enterBadge} />;
}

// ── Typeform-style single question (big text + lettered option cards) ──
function TypeformChoice({ field, value, onChange }) {
  const multi = field.control === 'checkbox';
  const arr = Array.isArray(value) ? value : [];
  return (
    <div className={styles.tfOptions}>
      {(field.options || []).map((o, i) => {
        const checked = multi ? arr.includes(o.value) : value === o.value;
        const select = () => (multi ? onChange(checked ? arr.filter((v) => v !== o.value) : [...arr, o.value]) : onChange(o.value));
        return (
          <button key={i} type="button" className={`${styles.tfOption} ${checked ? styles.tfOptionSel : ''}`} onClick={select}>
            <span className={styles.tfLetter}>{String.fromCharCode(65 + i)}</span>
            <span className={styles.tfOptText}>{o.value}</span>
            {checked ? <Icon name="solar:check-circle-bold" size={18} color="var(--primary-300)" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function TypeformQuestion({ field, number, answers, onAnswer, missing, onNext, btnSize = 'L' }) {
  if (field.type === 'display') {
    return <div className={styles.tfQuestion}><FieldInput field={field} interactive={false} /></div>;
  }
  const isTextInput = ['string', 'text', 'integer', 'decimal', 'date'].includes(field.type);
  const isChoice = field.type === 'choice';
  return (
    <div className={styles.tfQuestion}>
      <div className={styles.tfHead}>
        <span className={styles.tfNum}>{number}</span>
        <div className={styles.tfHeadText}>
          <div className={styles.tfQText}>{field.text}{field.required && <span className={styles.req}>*</span>}</div>
          {field.description ? <p className={styles.tfDesc}>{field.description}</p> : null}
        </div>
      </div>
      <div className={styles.tfBody}>
        {isChoice
          ? <TypeformChoice field={field} value={answers[field.linkId]} onChange={(v) => onAnswer(field.linkId, v)} />
          : <FieldInput field={field} interactive value={answers[field.linkId]} onChange={(v) => onAnswer(field.linkId, v)} className={styles.tfInput} />}
        {missing.has(field.linkId) ? <span className={styles.missing}>This field is required.</span> : null}
        {/* Long text gets the "Shift + Enter = line break" affordance, like Typeform */}
        {field.type === 'text' && (
          <span className={styles.lineBreakHint}>
            <strong>Shift <ShiftIcon /></strong> + <strong>Enter <EnterIcon size={12} /></strong> to make a line break
          </span>
        )}
        {/* OK ↵ button for text-style inputs (mirrors the Typeform affordance) */}
        {isTextInput && (
          <Button variant="primary" size={btnSize} className={styles.okBtn} onClick={onNext}>OK <EnterBadge /></Button>
        )}
      </div>
    </div>
  );
}

function StartScreen({ start, formName, onStart, btnSize = 'L' }) {
  return (
    <div className={styles.tfScreen}>
      <h1 className={styles.tfScreenTitle}>{start?.title || formName || 'Welcome'}</h1>
      {start?.description ? <p className={styles.tfScreenDesc}>{start.description}</p> : null}
      {/* ↵ badge sits inside the button — Typeform style */}
      <Button variant="primary" size={btnSize} onClick={onStart}>
        {start?.buttonLabel || 'Start'}<EnterBadge />
      </Button>
    </div>
  );
}

function EndScreen({ end }) {
  return (
    <div className={styles.tfScreen}>
      <Icon name="solar:check-circle-bold" size={48} color="var(--status-success)" />
      <h1 className={styles.tfScreenTitle}>{end?.title || 'Thank you!'}</h1>
      {end?.description ? <p className={styles.tfScreenDesc}>{end.description}</p> : null}
    </div>
  );
}

function SectionStepper({ sections, current }) {
  return (
    <div className={styles.stepper}>
      {sections.map((s, i) => (
        <div key={i} className={styles.stepperRow}>
          <div className={`${styles.stepperItem} ${i === current ? styles.stepperActive : i < current ? styles.stepperDone : ''}`}>
            <span className={styles.stepperNum}>{i < current ? <Icon name="solar:check-circle-bold" size={12} color="var(--primary-300)" /> : i + 1}</span>
            <span className={styles.stepperLabel}>{s.title}</span>
          </div>
          {i < sections.length - 1 && <span className={`${styles.stepperConn} ${i < current ? styles.stepperConnDone : ''}`} />}
        </div>
      ))}
    </div>
  );
}

export function FormRenderer({
  fields = [], settings, scoring, formName, formDescription,
  answers, onAnswer, onSubmit, submitting, compact,
  scope = 'standalone', onValidationFail, // eslint-disable-line no-unused-vars
}) {
  const layout = normalizeLayout(settings?.layout);
  const paged = layout !== 'entire-page';
  const mode = layout === 'by-question' ? 'by-question' : 'by-section';

  // Branching: run the (pure) engine over the current answers to get the
  // visibility map, then drive the flow + validation off it. enableWhen needs
  // only the questionnaire; score-driven reveals also use `scoring`.
  const visibility = useMemo(() => {
    try {
      return evaluate(
        { questionnaire: toQuestionnaire(fields), scores: scoring?.scores || [], criticalTriggers: scoring?.criticalTriggers || [] },
        answers || {},
      ).visibility;
    } catch {
      return {}; // fail-safe: show everything if evaluation throws
    }
  }, [fields, scoring, answers]);

  const flow = useMemo(
    () => (paged ? buildFlow(fields, mode, visibility) : { questions: [], sections: null }),
    [fields, paged, mode, visibility],
  );
  const questions = flow.questions;
  const sections = flow.sections;
  const total = questions.length;

  const startCfg = settings?.start || {};
  const endCfg = settings?.end || {};
  const startEnabled = startCfg.enabled !== false; // default on for paged
  const endEnabled = endCfg.enabled !== false;

  const [started, setStarted] = useState(false);
  const [pos, setPos] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [missing, setMissing] = useState(() => new Set());
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(max-width: 640px)').matches,
  );
  const rootRef = useRef(null);
  const advanceTimer = useRef(null);
  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  // Mobile (compact iPhone frame OR a real ≤640px viewport) → XL buttons.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => setIsNarrow(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  const btnSize = compact || isNarrow ? 'XL' : 'L';

  // Reset on a layout switch or a new/edited form — NOT on `total`, which now
  // changes as branching reveals/hides questions mid-fill.
  useEffect(() => { setStarted(false); setPos(0); setSubmitted(false); setMissing(new Set()); }, [layout, fields]);
  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  const safePos = Math.min(pos, Math.max(0, total - 1));
  const currentQ = questions[safePos];
  const currentSection = sections ? (currentQ?.sectionIndex ?? 0) : null;

  const clearMissing = (linkId) => setMissing((prev) => {
    if (!prev.has(linkId)) return prev;
    const n = new Set(prev); n.delete(linkId); return n;
  });

  const doSubmit = async () => {
    const unanswered = requiredLeaves(fields, visibility).filter((f) => !isAnswered(answersRef.current[f.linkId]));
    if (unanswered.length) {
      setMissing(new Set(unanswered.map((f) => f.linkId)));
      onValidationFail?.(unanswered.length);
      const idx = questions.findIndex((q) => q.field.linkId === unanswered[0].linkId);
      if (idx >= 0) setPos(idx);
      return;
    }
    const ok = await onSubmit?.();
    if (ok !== false && endEnabled) setSubmitted(true);
  };

  const goNext = () => {
    clearTimeout(advanceTimer.current);
    const f = currentQ?.field;
    if (!f) return;
    if (f.required && f.type !== 'display' && !isAnswered(answersRef.current[f.linkId])) {
      setMissing(new Set([f.linkId])); onValidationFail?.(1); return;
    }
    if (safePos < total - 1) setPos(safePos + 1);
    else doSubmit();
  };
  const goBack = () => {
    clearTimeout(advanceTimer.current);
    if (safePos > 0) setPos(safePos - 1);
    else if (startEnabled) setStarted(false);
  };

  const handleAnswer = (linkId, v) => {
    onAnswer(linkId, v);
    clearMissing(linkId);
    const f = currentQ?.field;
    if (f && f.linkId === linkId && f.type === 'choice' && f.control !== 'checkbox' && isAnswered(v)) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => goNext(), 320);
    }
  };

  const screen = startEnabled && !started ? 'start' : submitted ? 'end' : 'question';

  const onKeyDown = (e) => {
    if (!paged) return;
    if (screen === 'start') { if (e.key === 'Enter') { e.preventDefault(); setStarted(true); } return; }
    if (screen === 'end') return;
    const tag = e.target.tagName;
    const isTextEntry = tag === 'TEXTAREA' || (tag === 'INPUT' && ['text', 'email', 'tel', 'number', 'search', 'date'].includes(e.target.type));
    // Enter advances (incl. textarea); Shift+Enter in a textarea makes a line break.
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); goNext(); return; }
    if (isTextEntry) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); goNext(); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); goBack(); return; }
    const f = currentQ?.field;
    if (f?.type === 'choice' && f.control !== 'checkbox') {
      let idx = -1;
      if (/^[1-9]$/.test(e.key)) idx = Number(e.key) - 1;
      else if (/^[a-zA-Z]$/.test(e.key)) idx = e.key.toUpperCase().charCodeAt(0) - 65;
      const opt = idx >= 0 ? f.options?.[idx] : null;
      if (opt) { e.preventDefault(); handleAnswer(f.linkId, opt.value); }
    }
  };

  useEffect(() => {
    if (!paged) return;
    const el = rootRef.current;
    if (el && (!document.activeElement || !el.contains(document.activeElement))) el.focus({ preventScroll: true });
  }, [safePos, screen, paged]);

  const fontFamily = getFontStack(settings?.fontFamily);
  // Paged views fill the device frame; entire-page keeps the card look.
  const sheetClass = paged
    ? `${styles.pagedSheet} ${compact ? styles.compact : ''}`
    : `${styles.sheet} ${compact ? styles.compact : ''}`;

  // ── Entire page ──
  if (!paged) {
    return (
      <div className={sheetClass} style={{ fontFamily }}>
        <FormHeader settings={settings} className={styles.headerBleed} />
        <h2 className={styles.title}>{formName}</h2>
        {formDescription ? <p className={styles.formDesc}>{formDescription}</p> : null}
        {fields.length === 0 ? (
          <p className={styles.empty}>No questions yet.</p>
        ) : (
          <>
            {fields.map((f) => <FieldNode key={f.linkId} field={f} answers={answers} onAnswer={handleAnswer} missing={missing} visibility={visibility} />)}
            <div className={styles.submitRow}>
              <Button variant="primary" size="L" disabled={submitting} onClick={doSubmit}>{submitting ? 'Submitting…' : 'Submit'}</Button>
            </div>
          </>
        )}
        <FormFooter settings={settings} className={styles.footerBleed} />
      </div>
    );
  }

  // ── Paged: start / question / end ──
  if (total === 0) {
    return (
      <div className={sheetClass} style={{ fontFamily }}>
        <p className={styles.empty}>Add fields in the Edit tab to preview the form.</p>
      </div>
    );
  }

  const isLast = safePos >= total - 1;
  return (
    <div ref={rootRef} tabIndex={-1} onKeyDown={onKeyDown} className={`${sheetClass} ${styles.pagedRoot}`} style={{ fontFamily }}>
      {screen === 'start' ? (
        <StartScreen start={startCfg} formName={formName} onStart={() => setStarted(true)} btnSize={btnSize} />
      ) : screen === 'end' ? (
        <EndScreen end={endCfg} />
      ) : (
        <>
          {/* Progress bar pinned to the very top edge */}
          <div className={styles.progress}>
            <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: `${((safePos + 1) / total) * 100}%` }} /></div>
            <span className={styles.progressText}>
              {sections ? `Section ${currentSection + 1} of ${sections.length}` : `${safePos + 1} of ${total}`}
            </span>
          </div>
          {sections ? <div className={styles.stepperWrap}><SectionStepper sections={sections} current={currentSection} /></div> : null}
          {/* Question vertically centered in the remaining space */}
          <div className={styles.pagedMain}>
            <div key={safePos} className={styles.stepBox}>
              <TypeformQuestion field={currentQ.field} number={safePos + 1} answers={answers} onAnswer={handleAnswer} missing={missing} onNext={goNext} btnSize={btnSize} />
            </div>
          </div>
          {/* Nav pinned to the bottom of the screen */}
          <div className={styles.stepNav}>
            <Button variant="ghost" size={btnSize} disabled={safePos === 0 && !startEnabled} onClick={goBack} leadingIcon="solar:arrow-left-linear">Back</Button>
            <Button variant="primary" size={btnSize} disabled={submitting} onClick={goNext}>
              {isLast ? (submitting ? 'Submitting…' : 'Submit') : <>{' Next '}<EnterBadge /></>}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default FormRenderer;
