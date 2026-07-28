import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { Button } from '../../../components/Button/Button';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { CardSkeleton } from '../../../components/Skeleton/CardSkeleton';
import { useAppStore } from '../../../store/useAppStore';
import { CCM_UNLOGGED_SECONDS, secondsToTime } from '../data/ccmBillingMock';
import { CcmUnloggedTable } from './CcmUnloggedTable';
import { CcmBillingReportDrawer } from './CcmBillingReportDrawer';
import styles from './CcmBillingReview.module.css';

const REPORT_MONTH_LABEL = (ym) => {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, 1))
    .toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

const REPORT_DATE_LABEL = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

const COMPLEXITY_LABEL = { high: 'High Complexity', moderate: 'Moderate Complexity' };
const COMPLEXITY_OPTIONS = [
  { value: 'high', label: 'High Complexity' },
  { value: 'moderate', label: 'Moderate Complexity' },
];

const YEAR_MONTH_LABEL = (ym) => {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, (m || 1) - 1, 1));
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

// Formats an ISO timestamp as "MM/DD/YYYY, HH:MM AM/PM" to match the Figma.
const formatActivityTime = (iso) => {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${date}, ${time}`;
};

const TABS = ['Billable', 'Billing History'];

function ComplexityDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.complexityWrap}>
      <button
        type="button"
        className={styles.complexityBtn}
        onClick={() => setOpen(o => !o)}
      >
        {COMPLEXITY_LABEL[value] || 'Moderate Complexity'}
        <Icon name="solar:alt-arrow-down-linear" size={14} color="var(--primary-300)" />
      </button>
      {open && (
        <>
          <div className={styles.dropdownOverlay} onClick={() => setOpen(false)} />
          <div className={styles.complexityMenu} role="listbox">
            {COMPLEXITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`${styles.complexityOption} ${opt.value === value ? styles.complexityOptionActive : ''}`}
                onClick={() => { onChange?.(opt.value); setOpen(false); }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ActivityRow({ activity }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = activity.description && activity.description.length > 160;
  return (
    <div className={styles.activityRow}>
      <span className={styles.activityBullet} aria-hidden="true" />
      <div className={styles.activityMain}>
        <div className={styles.activityHead}>
          <span className={styles.activityTitle}>{activity.activityType}</span>
          <span className={styles.activityDuration}>{secondsToTime(activity.durationSeconds)} mins</span>
        </div>
        <div className={styles.activityMeta}>
          {formatActivityTime(activity.occurredAt)} <span className={styles.metaDot}>•</span>{' '}
          <span className={styles.metaAuthor}>{activity.loggedBy} (You)</span>
        </div>
        <p className={`${styles.activityDesc} ${!expanded && isLong ? styles.activityDescClamped : ''}`}>
          {activity.description}
        </p>
        {isLong && (
          <button
            type="button"
            className={styles.showMoreBtn}
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? 'Show Less' : 'Show More'}
          </button>
        )}
      </div>
    </div>
  );
}

export function CcmBillingReview({ program, patientId: patientIdProp }) {
  // Allow callers (e.g. the CCM worklist's Billable Mins drawer) to pass an
  // explicit patientId; falls back to the routed patient when omitted.
  const selectedPatientId = useAppStore(s => s.selectedPatientId);
  const patientId = patientIdProp || selectedPatientId;
  const periods = useAppStore(s => s.ccmBillingPeriodsByPatient[patientId]);
  const activities = useAppStore(s => s.ccmBillableActivitiesByPatient[patientId]);
  const reports = useAppStore(s => s.ccmBillingReportsByPatient[patientId]);
  const loading = useAppStore(s => s.ccmBillingLoadingByPatient[patientId]);
  const fetchCcmBilling = useAppStore(s => s.fetchCcmBilling);
  const fetchCcmBillingReports = useAppStore(s => s.fetchCcmBillingReports);

  const [activeTab, setActiveTab] = useState('Billable');
  const [complexity, setComplexity] = useState('high');
  const [unloggedExpanded, setUnloggedExpanded] = useState(false);
  const [openReport, setOpenReport] = useState(null);

  useEffect(() => {
    if (!patientId) return;
    if (periods == null) fetchCcmBilling(patientId);
    if (reports == null) fetchCcmBillingReports(patientId);
  }, [patientId, periods, reports, fetchCcmBilling, fetchCcmBillingReports]);

  const currentPeriod = useMemo(() => (periods && periods[0]) || null, [periods]);
  useEffect(() => {
    if (currentPeriod?.complexity) setComplexity(currentPeriod.complexity);
  }, [currentPeriod]);

  const periodActivities = useMemo(() => {
    if (!activities) return [];
    if (!currentPeriod) return activities;
    return activities.filter(a => a.periodId === currentPeriod.id);
  }, [activities, currentPeriod]);

  const totalSeconds = useMemo(
    () => periodActivities.reduce((sum, a) => sum + (a.durationSeconds || 0), 0),
    [periodActivities],
  );
  // Required minutes lives on the period row. Complexity is a display
  // classifier — the CPT threshold is set by the operator, not derived here.
  const requiredMinutes = currentPeriod?.requiredMinutes ?? 20;
  const requiredSeconds = requiredMinutes * 60;
  const overshoot = totalSeconds - requiredSeconds;
  const isReady = overshoot >= 0;

  if (loading && periodActivities.length === 0) {
    return (
      <div className={styles.wrap}>
        <div className={styles.cardSkeleton}><CardSkeleton /></div>
        <div className={styles.cardSkeleton}><CardSkeleton /></div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {/* Sub-tabs */}
      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab}
            type="button"
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Billable' ? (
        <>
          {/* Month card */}
          <div className={styles.monthCard}>
            <div className={styles.monthHead}>
              <span className={styles.monthTitle}>{YEAR_MONTH_LABEL(currentPeriod?.yearMonth) || 'This Month'}</span>
              <ComplexityDropdown value={complexity} onChange={setComplexity} />
            </div>
            <div className={styles.monthBody}>
              <div className={styles.monthLeft}>
                <span className={styles.monthTotal}>{secondsToTime(totalSeconds)} mins</span>
                <span className={styles.monthTotalLabel}>Total Billable Time</span>
                <span className={`${styles.readyRow} ${isReady ? styles.readyRowOk : styles.readyRowShort}`}>
                  <Icon
                    name={isReady ? 'solar:check-circle-linear' : 'solar:info-circle-linear'}
                    size={14}
                    color={isReady ? 'var(--status-success)' : 'var(--status-warning)'}
                  />
                  {isReady ? 'Ready to Bill' : 'Not Ready'}
                  <span className={styles.readyDot}>•</span>
                  <span className={styles.readyReq}>Required: {requiredMinutes} mins</span>
                  <span className={styles.readyDelta}>
                    ({overshoot >= 0 ? '+' : '−'}{secondsToTime(Math.abs(overshoot))})
                  </span>
                </span>
              </div>
              <div className={styles.monthActions}>
                <Button variant="tertiary" size="S" leadingIcon="solar:document-add-linear">
                  Generate Bill
                </Button>
                <Button variant="primary" size="S" disabled={!isReady}>
                  Send Claim
                </Button>
              </div>
            </div>
          </div>

          {/* Unlogged time — collapsible inline table (Figma 450:19899).
              Click the header to expand into a per-session grid where the
              user classifies + logs each chunk into billable activities. */}
          <CcmUnloggedTable
            patientId={patientId}
            periodId={currentPeriod?.id}
            expanded={unloggedExpanded}
            onToggleExpanded={() => setUnloggedExpanded(v => !v)}
            initialSeconds={CCM_UNLOGGED_SECONDS}
          />

          {/* Activities section */}
          <div className={styles.activitiesHead}>
            <span className={styles.activitiesTitle}>Billable Activities</span>
            <div className={styles.activitiesHeadRight}>
              <ActionButton icon="solar:add-circle-linear" size="S" tooltip="Add activity" />
              <span className={styles.activitiesTotal}>{secondsToTime(totalSeconds)} mins</span>
            </div>
          </div>

          <div className={styles.activityList}>
            {periodActivities.length === 0 ? (
              <div className={styles.empty}>
                <Icon name="solar:clipboard-list-linear" size={36} color="var(--neutral-200)" />
                <span>No billable activities yet. Start the timer to log time.</span>
              </div>
            ) : (
              periodActivities.map(a => <ActivityRow key={a.id} activity={a} />)
            )}
          </div>
        </>
      ) : (
        <div className={styles.historyTableWrap}>
          {(reports || []).length === 0 ? (
            <div className={styles.empty}>
              <Icon name="solar:history-linear" size={36} color="var(--neutral-200)" />
              <span>Billing history will appear here once claims are sent.</span>
            </div>
          ) : (
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>Monthly Report</th>
                  <th>Est. Billing Amount</th>
                  <th>Total Time Spent</th>
                  <th>Integrated EHR</th>
                  <th className={styles.historyActionHead}>Action</th>
                </tr>
              </thead>
              <tbody>
                {(reports || []).map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className={styles.historyName}>
                        Billing Report #{r.reportNumber} - {REPORT_MONTH_LABEL(r.yearMonth)}
                      </div>
                      <div className={styles.historySub}>Generated on: {REPORT_DATE_LABEL(r.generatedAt)}</div>
                    </td>
                    <td className={styles.historyAmount}>
                      ${r.estBillingAmount.toFixed(2)}
                    </td>
                    <td>
                      <span className={styles.historyTime}>
                        <Icon name="solar:clock-circle-linear" size={14} color="var(--status-success)" />
                        {secondsToTime(r.totalSeconds)} min
                      </span>
                    </td>
                    <td className={styles.historyEhr}>{r.integratedEhr}</td>
                    <td>
                      <div className={styles.historyActions}>
                        <Button variant="tertiary" size="S" onClick={() => setOpenReport(r)}>
                          View
                        </Button>
                        <ActionButton
                          icon="solar:printer-linear"
                          size="S"
                          tooltip="Print"
                          onClick={() => setOpenReport(r)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {openReport && (
        <CcmBillingReportDrawer report={openReport} onClose={() => setOpenReport(null)} />
      )}

    </div>
  );
}
