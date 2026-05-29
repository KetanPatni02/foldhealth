/**
 * Shareable form fill-view (#/f/{id}). Renders the saved form for a logged-in
 * respondent to fill and submit; submission saves to form_responses with an
 * engine-evaluated score snapshot. Reuses FieldInput for the controls.
 */
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { Button } from '../../../components/Button/Button';
import { CloseButton } from '../../../components/CloseButton/CloseButton';
import { useAppStore } from '../../../store/useAppStore';
import { evaluate } from '../scoring/evaluate';
import { isAnswered } from '../scoring/util';
import { toQuestionnaire } from '../builder/engineAdapter';
import { FieldInput } from '../builder/FieldInput';
import styles from './FormView.module.css';

function FormField({ field, answers, onChange, missing }) {
  if (field.type === 'group') {
    return (
      <section className={styles.section}>
        <div className={styles.sectionTitle}>{field.text}</div>
        {(field.items || []).map((sub) => (
          <FormField key={sub.linkId} field={sub} answers={answers} onChange={onChange} missing={missing} />
        ))}
      </section>
    );
  }
  if (field.type === 'display') {
    return <div className={styles.field}><FieldInput field={field} interactive={false} /></div>;
  }
  return (
    <div className={styles.field}>
      <label className={styles.label}>
        {field.text}{field.required && <span className={styles.req}>*</span>}
      </label>
      {field.description ? <p className={styles.desc}>{field.description}</p> : null}
      <FieldInput field={field} interactive value={answers[field.linkId]} onChange={(v) => onChange(field.linkId, v)} />
      {missing.has(field.linkId) ? <span className={styles.missing}>This field is required.</span> : null}
    </div>
  );
}

export function FormView() {
  const formViewId = useAppStore((s) => s.formViewId);
  const fetchFormById = useAppStore((s) => s.fetchFormById);
  const submitFormResponse = useAppStore((s) => s.submitFormResponse);
  const showToast = useAppStore((s) => s.showToast);

  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [missing, setMissing] = useState(() => new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchFormById(formViewId).then((f) => {
      if (!active) return;
      setForm(f);
      setLoading(false);
    });
    return () => { active = false; };
  }, [formViewId, fetchFormById]);

  const items = useMemo(() => form?.schema?.items || [], [form]);
  const setAnswer = (linkId, v) => setAnswers((prev) => ({ ...prev, [linkId]: v }));

  // Flatten leaf fields for required-field validation.
  const leaves = useMemo(() => {
    const out = [];
    const walk = (list) => (list || []).forEach((f) => (f.items ? walk(f.items) : out.push(f)));
    walk(items);
    return out;
  }, [items]);

  const close = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.hash = '#/home';
  };

  const handleSubmit = async () => {
    const unanswered = leaves.filter(
      (f) => f.required && f.type !== 'display' && !isAnswered(answers[f.linkId]),
    );
    if (unanswered.length) {
      setMissing(new Set(unanswered.map((f) => f.linkId)));
      showToast?.(`Please answer ${unanswered.length} required field${unanswered.length === 1 ? '' : 's'}`);
      return;
    }
    setSubmitting(true);
    let scoreSnapshot = {};
    try {
      const result = evaluate(
        { questionnaire: toQuestionnaire(items), scores: form.scoring?.scores || [], criticalTriggers: form.scoring?.criticalTriggers || [] },
        answers,
      );
      scoreSnapshot = { scores: result.scores, criticalsTriggered: result.criticalsTriggered };
    } catch { /* submit answers even if scoring fails */ }
    const ok = await submitFormResponse(form.id, answers, scoreSnapshot);
    setSubmitting(false);
    if (ok) setSubmitted(true);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.brand}>
          <Icon name="solar:clipboard-text-linear" size={18} color="var(--primary-300)" />
          {form?.name || 'Form'}
        </span>
        <CloseButton onClick={close} />
      </header>

      <div className={styles.scroll}>
        {loading ? (
          <div className={styles.state}>Loading…</div>
        ) : !form ? (
          <div className={styles.state}>This form could not be found.</div>
        ) : submitted ? (
          <div className={styles.sheet}>
            <div className={styles.thanks}>
              <Icon name="solar:check-circle-linear" size={40} color="var(--status-success)" />
              <h2 className={styles.title}>Thank you</h2>
              <p className={styles.desc}>Your response has been submitted.</p>
              <Button variant="secondary" size="L" onClick={close}>Done</Button>
            </div>
          </div>
        ) : (
          <div className={styles.sheet}>
            <h1 className={styles.title}>{form.name}</h1>
            {form.description ? <p className={styles.formDesc}>{form.description}</p> : null}
            {items.length === 0 ? (
              <p className={styles.desc}>This form has no questions yet.</p>
            ) : (
              items.map((f) => (
                <FormField key={f.linkId} field={f} answers={answers} onChange={setAnswer} missing={missing} />
              ))
            )}
            {items.length > 0 && (
              <div className={styles.submitRow}>
                <Button variant="primary" size="XL" disabled={submitting} onClick={handleSubmit}>
                  {submitting ? 'Submitting…' : 'Submit'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default FormView;
