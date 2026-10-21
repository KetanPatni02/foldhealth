import { useMemo } from 'react';
import { ActivityLog } from '../../../components/ActivityLog/ActivityLog';
import { Drawer } from '../../../components/Drawer/Drawer';
import { toActivityLogEntries } from '../../hedis-worklist/CareGapDetailDrawer.utils';
import { usePharmacyProgramMember } from './usePharmacyProgramMember';

// Everything done on a pharmacy member — outreach, verification calls,
// pickups and the fill dates they moved, barrier logs, medication edits,
// status and assignee changes — newest first, grouped by month.
export function PharmacyActivityLog({ member }) {
  const entries = useMemo(
    () => toActivityLogEntries((member?.activityLog || []).map(e => ({ ...e, when: e.at }))),
    [member],
  );
  return <ActivityLog entries={entries} relaxed flushTop emptyLabel="No activity recorded yet." />;
}

// Activity Log step of the Pharmacy program.
export function PharmacyActivityLogStep() {
  const member = usePharmacyProgramMember();
  return <PharmacyActivityLog member={member} />;
}

// Worklist row → "Activity Log".
export function PharmacyActivityDrawer({ member, onClose }) {
  return (
    <Drawer title={`Activity Log · ${member.name}`} onClose={onClose} width={560}>
      <PharmacyActivityLog member={member} />
    </Drawer>
  );
}
