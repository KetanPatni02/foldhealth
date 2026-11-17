import { Drawer } from '../../../components/Drawer/Drawer';
import { PatientOutreachTab } from './PatientOutreachTab';

/**
 * Patient Outreach outside the HCC chart (for example the AWV worklist):
 * the same patient-level log, tagged with the program it was opened from.
 * The opener calls requestPatientOutreachLog() first so the drawer opens on a
 * new, blank form. Outside HCC there is no DOS context, so the AI summary
 * links HCCs and ICDs only.
 */
export function PatientOutreachDrawer({ member, program, onClose }) {
  return (
    <Drawer title={`Outreach · ${member.name}`} onClose={onClose}>
      <PatientOutreachTab member={member} program={program} dosContext={program === 'RA'} />
    </Drawer>
  );
}
