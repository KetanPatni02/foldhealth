import { useContext, useState } from 'react';
import { ActionButton } from '../../../../../../components/ActionButton/ActionButton';
import { Badge } from '../../../../../../components/Badge/Badge';
import { Button } from '../../../../../../components/Button/Button';
import {
  UnityInsightHeader, UnityInsightStrip, UnityInsights, UnityRecommendation,
} from '../../../../../../components/UnityInsights/UnityInsights';
import { OverviewInsightsContext, OverviewWidgetKeyContext } from './OverviewInsightsContext';
import { ACTION_ICON, widgetInsightSummary } from './widgetInsights';

/** One signal's next step and its Mark reviewed check. */
export function SignalActions({ signal, onRun, onReview, primary = false }) {
  return (
    <>
      {signal.action && (
        <Button
          variant={primary ? 'primary' : 'tertiary'}
          size="S"
          leadingIcon={ACTION_ICON[signal.action.key]}
          onClick={() => onRun(signal)}
        >
          {signal.action.label}
        </Button>
      )}
      <ActionButton icon="solar:check-read-linear" size="S" tooltip="Mark reviewed" onClick={() => onReview(signal, true)} />
    </>
  );
}

/**
 * The Unity layer at the foot of an Overview card: the widget's headline
 * strip (click to fold) over its recommendations, one per open signal.
 * Renders nothing when the widget has no open signals.
 */
export function CardInsights() {
  const ctx = useContext(OverviewInsightsContext);
  const widgetKey = useContext(OverviewWidgetKeyContext);
  const [open, setOpen] = useState(true);
  const signals = (ctx && widgetKey && ctx.byWidget[widgetKey]) || [];
  if (!signals.length) return null;
  return (
    <UnityInsights>
      <UnityInsightStrip expanded={open} onToggle={() => setOpen(v => !v)}>
        {widgetInsightSummary(widgetKey, signals)}
      </UnityInsightStrip>
      {open && (
        <>
          <UnityInsightHeader title="Recommendations:" />
          {signals.map(s => (
            <UnityRecommendation
              key={s.id}
              title={s.title}
              description={s.detail}
              aside={s.isNew ? <Badge tone="info" size="S" label="New" /> : null}
              actions={<SignalActions signal={s} onRun={ctx.run} onReview={ctx.review} />}
            />
          ))}
        </>
      )}
    </UnityInsights>
  );
}
