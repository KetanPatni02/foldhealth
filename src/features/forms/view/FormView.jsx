/**
 * Shareable form fill-view (#/f/{id}). Renders the saved form via the shared
 * FormRenderer (honoring the form's layout mode) and submits to form_responses
 * with an engine-evaluated score snapshot.
 */
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { Button } from '../../../components/Button/Button';
import { CloseButton } from '../../../components/CloseButton/CloseButton';
import { useAppStore } from '../../../store/useAppStore';
import { evaluate } from '../scoring/evaluate';
import { toQuestionnaire } from '../builder/engineAdapter';
import { FormRenderer } from '../render/FormRenderer';
import { normalizeLayout } from '../render/layout';
import { injectGoogleFonts } from '../../email-builder/googleFonts';
import styles from './FormView.module.css';

injectGoogleFonts();

export function FormView({ id: propId, isPublic = false }) {
  const storeFormViewId = useAppStore((s) => s.formViewId);
  const formViewId = propId ?? storeFormViewId;
  const fetchFormById = useAppStore((s) => s.fetchFormById);
  const submitFormResponse = useAppStore((s) => s.submitFormResponse);
  const showToast = useAppStore((s) => s.showToast);

  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
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
  const settings = form?.settings;
  // Paged layouts show their own end screen inside FormRenderer; only the
  // entire-page layout falls back to this view's thank-you.
  const paged = normalizeLayout(settings?.layout) !== 'entire-page';

  const close = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.hash = '#/home';
  };

  // FormRenderer validates (per step + full form) before calling this; here we
  // just score + persist.
  const handleSubmit = async () => {
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
    if (ok && !paged) setSubmitted(true); // paged → FormRenderer shows its end screen
    return ok;
  };

  return (
    <div className={styles.page} style={{ background: settings?.background || undefined }}>
      <header className={styles.header}>
        <span className={styles.brand}>
          <Icon name="solar:clipboard-text-linear" size={18} color="var(--primary-300)" />
          {form?.name || 'Form'}
        </span>
        {!isPublic && <CloseButton onClick={close} />}
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
          <FormRenderer
            fields={items}
            settings={settings}
            formName={form.name}
            formDescription={form.description}
            answers={answers}
            onAnswer={setAnswer}
            onSubmit={handleSubmit}
            submitting={submitting}
            scope="standalone"
            onValidationFail={(n) => showToast?.(`Please answer ${n} required field${n === 1 ? '' : 's'}`)}
          />
        )}
      </div>
    </div>
  );
}

export default FormView;
