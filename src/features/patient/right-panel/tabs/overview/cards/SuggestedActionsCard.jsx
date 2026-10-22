import { DashboardCard, DashboardCardBody } from '../../../../../../components/DashboardCard/DashboardCard';
import { PanelSectionItem } from '../../../../../../components/PanelSection/PanelSection';
import { CappedRows } from './CappedRows';
import { Button } from '../../../../../../components/Button/Button';
import { Icon } from '../../../../../../components/Icon/Icon';
import { useAppStore } from '../../../../../../store/useAppStore';
import styles from './overviewCards.module.css';

const COMING_SOON = {
  'order-lab': 'Ordering labs',
  'send-form': 'Sending forms',
  review: 'Medication review',
};

export function SuggestedActionsCard({ memberId, overview, actions }) {
  const setStatus = useAppStore(s => s.setSuggestedActionStatus);
  const showToast = useAppStore(s => s.showToast);
  const open = (overview?.suggestedActions || []).filter(a => a.status === 'open');

  const run = (a) => {
    if (a.action === 'schedule') {
      actions.schedule({ onSaved: () => setStatus(memberId, a.id, 'accepted') });
      return;
    }
    showToast(`${COMING_SOON[a.action] || a.cta} is coming soon`);
  };

  const dismiss = (a) => {
    setStatus(memberId, a.id, 'dismissed');
    showToast('Suggestion dismissed');
  };

  return (
    <DashboardCard
      icon="custom:ai"
      title="Suggested Actions"
      count={open.length || null}
      className={styles.aiOutline}
      footer={open.length ? 'Suggestions update as new clinical data arrives  •  Powered by Unity' : null}
    >
      <DashboardCardBody className={styles.listBody}>
        {open.length === 0 ? (
          <p className={styles.empty}>
            {overview?.suggestedActions?.length
              ? 'You’re all caught up. New suggestions appear as Unity reviews new data.'
              : 'No suggestions yet. They appear as Unity reviews this patient’s data.'}
          </p>
        ) : (
          <CappedRows
            items={open}
            render={a => (
              <PanelSectionItem
                key={a.id}
                inset
                alignTop
                title={a.title}
                meta={a.reason}
                wrapTitle
                trailing={(
                  <span className={`${styles.trail} ${styles.suggestTrail}`}>
                    <Button variant="secondary" size="S" className={`${styles.ctaButton} ${styles.suggestCta}`} onClick={() => run(a)}>{a.cta}</Button>
                    <button type="button" className={styles.suggestClose} aria-label="Dismiss" onClick={() => dismiss(a)}>
                      <Icon name="solar:close-linear" size={12} />
                    </button>
                  </span>
                )}
              />
            )}
          />
        )}
      </DashboardCardBody>
    </DashboardCard>
  );
}
