import { useAppStore } from '../../store/useAppStore';
import { ReassignmentSummaryDrawer } from './ReassignmentSummaryDrawer';

/** The reassignment summary drawer, opened from anywhere through the store. */
export function ReassignmentSummaryHost() {
  const jobId = useAppStore(s => s.reassignmentSummaryJobId);
  const close = useAppStore(s => s.closeReassignmentSummary);
  return jobId ? <ReassignmentSummaryDrawer jobId={jobId} onClose={close} /> : null;
}
