import { useMemo, useState } from 'react';
import { ActionButton } from '../../../../../../components/ActionButton/ActionButton';
import { Badge } from '../../../../../../components/Badge/Badge';
import { Button } from '../../../../../../components/Button/Button';
import { Icon } from '../../../../../../components/Icon/Icon';
import { AiInsightIcon } from '../../../../../../components/Icon/AiInsightIcon';
import { SlideshowDialog } from '../../../../../../components/SlideshowDialog/SlideshowDialog';
import { SignalActions } from './CardInsights';
import { INSIGHT_WIDGETS, signalsByWidget, widgetInsightSummary } from './widgetInsights';
import styles from './RecapDialog.module.css';

const TONE_ICON_COLOR = { high: 'var(--status-error)', medium: 'var(--status-warning)', low: 'var(--status-info)' };
const fmtDate = ms => new Date(ms).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

function SignalCard({ signal, review, onRun, onReview }) {
  return (
    <div className={`${styles.card} ${review ? styles.cardReviewed : ''}`}>
      <span className={styles.cardIcon}>
        <Icon name={signal.icon} size={16} color={review ? 'var(--neutral-300)' : TONE_ICON_COLOR[signal.severity]} />
      </span>
      <span className={styles.cardText}>
        <span className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>{signal.title}</span>
          {signal.isNew && !review && <Badge tone="info" size="S" label="New" />}
        </span>
        <span className={styles.cardMeta}>
          {review
            ? `Reviewed by ${review.reviewedByName || 'a teammate'} ${fmtDate(new Date(review.reviewedAt).getTime())}`
            : signal.detail}
        </span>
      </span>
      <span className={styles.cardActions}>
        {review ? (
          <ActionButton icon="solar:restart-linear" size="S" tooltip="Mark not reviewed" onClick={() => onReview(signal, false)} />
        ) : (
          <SignalActions signal={signal} onRun={onRun} onReview={onReview} />
        )}
      </span>
    </div>
  );
}

/**
 * Recap: the pill at the top of the Overview and the walkthrough it opens,
 * one step per widget with recent or open events, each event with its next
 * step. Same signals as the cards' Unity strips (useAttentionSignals).
 */
export function RecapButton({ patient, attention, run, review, onOpenTimeline }) {
  const [open, setOpen] = useState(false);
  const { signals, open: openSignals, reviews, since, sinceIsLastTouch } = attention;

  const steps = useMemo(() => {
    const byWidget = signalsByWidget(signals);
    return INSIGHT_WIDGETS.filter(w => byWidget[w.key]?.length).map((w) => {
      const all = byWidget[w.key];
      const pending = all.filter(s => !reviews[s.id]);
      const lead = pending.find(s => s.action);
      return {
        key: w.key,
        icon: w.icon,
        title: w.title,
        summary: pending.length ? widgetInsightSummary(w.key, pending) : 'All reviewed',
        heading: w.title,
        description: pending.length
          ? widgetInsightSummary(w.key, pending)
          : 'Everything here has been reviewed by the team.',
        preview: (
          <div className={styles.stack}>
            {all.map(s => (
              <SignalCard
                key={s.id}
                signal={s}
                review={reviews[s.id]}
                onRun={(x) => { setOpen(false); run(x); }}
                onReview={review}
              />
            ))}
          </div>
        ),
        primary: lead ? (
          <Button
            variant="primary"
            size="S"
            onClick={() => { setOpen(false); run(lead); }}
          >
            {lead.action.label}
          </Button>
        ) : null,
      };
    });
  }, [signals, reviews, run, review]);

  const newCount = openSignals.filter(s => s.isNew).length;
  const sinceLabel = sinceIsLastTouch ? `since the last touch on ${fmtDate(since)}` : 'in the last 30 days';

  return (
    <>
      <Button
        variant="secondary"
        size="S"
        className={styles.pill}
        leadingIconElement={<AiInsightIcon size={16} />}
        disabled={!steps.length}
        disabledReason="Nothing to recap yet"
        onClick={() => setOpen(true)}
      >
        Recap
        {openSignals.length > 0 && <span className={styles.pillCount}>{openSignals.length}</span>}
      </Button>
      <SlideshowDialog
        open={open}
        onOpenChange={setOpen}
        leading={(
          <span className={styles.brand}>
            <AiInsightIcon size={24} />
            Unity Recap
          </span>
        )}
        title={`What's new with ${patient?.name || 'this patient'}`}
        subtitle={`${newCount ? `${newCount} new ${sinceLabel}` : `Nothing new ${sinceLabel}`}, ${openSignals.length} open across ${steps.length} ${steps.length === 1 ? 'area' : 'areas'}.`}
        steps={steps}
        footerStart={(
          <Button variant="ghost" size="S" leadingIcon="solar:history-linear" onClick={() => { setOpen(false); onOpenTimeline(); }}>
            Open Timeline
          </Button>
        )}
      />
    </>
  );
}
