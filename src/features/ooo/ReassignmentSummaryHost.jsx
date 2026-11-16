import { useAppStore } from '../../store/useAppStore';
import { ReassignmentSummaryDrawer } from './ReassignmentSummaryDrawer';
import { AwaySummaryDrawer } from './AwaySummaryDrawer';

/** The reassignment summary and While You Were Away drawers, opened from anywhere through the store. */
export function ReassignmentSummaryHost() {
  const away = useAppStore(s => s.awaySummary);
  const closeAway = useAppStore(s => s.closeAwaySummary);
  const jobId = useAppStore(s => s.reassignmentSummaryJobId);
  const mine = useAppStore(s => s.reassignmentSummaryMine);
  const close = useAppStore(s => s.closeReassignmentSummary);
  if (away) return <AwaySummaryDrawer key={away.jobId} jobId={away.jobId} recordId={away.recordId} onClose={closeAway} />;
  return jobId ? <ReassignmentSummaryDrawer key={`${jobId}-${mine}`} jobId={jobId} mineOnly={mine} onClose={close} /> : null;
}
