import { OutreachTabView } from '../../patient/left-panel/tabs/outreach/OutreachTab/OutreachTab';
import { usePharmacyOutreachTab } from './usePharmacyOutreachTab';
import { usePharmacyProgramMember } from './usePharmacyProgramMember';

function OutreachStepBody({ member, programCode }) {
  const tab = usePharmacyOutreachTab(member, { programCode, defaultFormOpen: true });
  return <OutreachTabView tab={tab} />;
}

// Outreach step of the Pharmacy program.
export function PharmacyOutreachStep({ program, member: memberProp }) {
  const fromProfile = usePharmacyProgramMember();
  const member = memberProp || fromProfile;
  // The outreach state reads the member's log once per mount.
  const codes = (member?.measures || []).map(x => x.code).join();
  return <OutreachStepBody key={`${member?.id || 'none'}-${codes}`} member={member} programCode={program?.code || 'PHARM'} />;
}
