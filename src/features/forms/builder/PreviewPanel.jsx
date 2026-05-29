/**
 * Preview tab — fill the form for real and watch the score update live via the
 * scoring engine. Renders the chosen header/footer, font family, background,
 * and the Submit button so the preview matches the shared/public fill view.
 */
import { useMemo, useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { Button } from '../../../components/Button/Button';
import { evaluate } from '../scoring/evaluate';
import { toQuestionnaire } from './engineAdapter';
import { FieldInput } from './FieldInput';
import { FormHeader, FormFooter } from './FormChrome';
import { getFontStack, injectGoogleFonts } from '../../email-builder/googleFonts';
import styles from './FormBuilder.module.css';

injectGoogleFonts();

const SEV_COLOR = {
  neutral: 'var(--neutral-300)',
  info: 'var(--status-info)',
  warning: 'var(--status-warning)',
  high: 'var(--status-warning)',
  critical: 'var(--status-error)',
};

function PreviewField({ field, value, onChange }) {
  if (field.type === 'group') {
    return (
      <div className={styles.pvSection}>
        <div className={styles.pvSectionTitle}>{field.text}</div>
        {(field.items || []).map((sub) => (
          <PreviewField key={sub.linkId} field={sub} value={value} onChange={onChange} />
        ))}
      </div>
    );
  }
  if (field.type === 'display') {
    return <div className={styles.pvField}><FieldInput field={field} interactive={false} /></div>;
  }
  return (
    <div className={styles.pvField}>
      <label className={styles.pvLabel}>
        {field.text}{field.required && <span className={styles.req}>*</span>}
      </label>
      {field.description ? <p className={styles.pvDesc}>{field.description}</p> : null}
      <FieldInput
        field={field}
        interactive
        value={value[field.linkId]}
        onChange={(v) => onChange(field.linkId, v)}
      />
    </div>
  );
}

export function PreviewPanel({ fields, scoring, formName, settings }) {
  const [answers, setAnswers] = useState({});
  const setAnswer = (linkId, v) => setAnswers((prev) => ({ ...prev, [linkId]: v }));

  const result = useMemo(() => {
    const form = {
      questionnaire: toQuestionnaire(fields),
      scores: scoring?.scores || [],
      criticalTriggers: scoring?.criticalTriggers || [],
    };
    try {
      return evaluate(form, answers);
    } catch {
      return { scores: [], criticalsTriggered: [] };
    }
  }, [fields, scoring, answers]);

  const hasScores = (scoring?.scores?.length || 0) > 0;

  return (
    <div className={styles.previewWrap}>
      <div className={styles.previewScroll} style={{ background: settings?.background || undefined }}>
        <div className={styles.previewSheet} style={{ fontFamily: getFontStack(settings?.fontFamily) }}>
          <FormHeader settings={settings} className={styles.pvHeaderBleed} />
          <h2 className={styles.previewTitle}>{formName}</h2>
          {fields.length === 0 ? (
            <p className={styles.pvEmpty}>Add fields in the Edit tab to preview the form.</p>
          ) : (
            <>
              {fields.map((f) => (
                <PreviewField key={f.linkId} field={f} value={answers} onChange={setAnswer} />
              ))}
              <div className={styles.pvSubmitRow}>
                <Button variant="primary" size="L">Submit</Button>
              </div>
            </>
          )}
          <FormFooter settings={settings} className={styles.pvFooterBleed} />
        </div>
      </div>

      {(hasScores || result.criticalsTriggered.length > 0) && (
        <aside className={styles.previewResult}>
          <div className={styles.propsHeader}>Live Score</div>
          <div className={styles.pvResultBody}>
            {result.scores.map((s) => (
              <div key={s.id} className={styles.pvScoreCard}>
                <div className={styles.pvScoreVal}>{s.value ?? '—'}</div>
                <div className={styles.pvScoreMeta}>
                  <span className={styles.pvScoreName}>{scoring.scores.find((d) => d.id === s.id)?.label || s.id}</span>
                  <span className={styles.pvScoreStatus}>{s.status}</span>
                </div>
                {s.band ? (
                  <span className={styles.pvBand} style={{ color: SEV_COLOR[s.band.severity], borderColor: SEV_COLOR[s.band.severity] }}>
                    {s.band.label}
                  </span>
                ) : null}
              </div>
            ))}
            {result.criticalsTriggered.map((c) => (
              <div key={c.triggerId} className={styles.pvAlert}>
                <Icon name="solar:danger-triangle-linear" size={16} color="var(--status-error)" />
                <span>{c.alert}</span>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}

export default PreviewPanel;
