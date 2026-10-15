import { Tooltip } from '../Tooltip/Tooltip';
import { ageFromDobMdy } from '../../lib/patientDisplay';

/**
 * A patient's second line: "11103 • F • 72y 4m". Each is its own detail;
 * hovering the age shows the DOB.
 *
 * @param {{ memberId?, gender?, age?, dob? }} props.patient
 * @param {string} [props.className]
 */
export function PatientMeta({ patient: p, className }) {
  const age = ageFromDobMdy(p.dob) || (p.age != null && p.age !== '' ? `${p.age}y` : '');
  const parts = [
    p.memberId && <span key="id">{p.memberId}</span>,
    p.gender && <span key="sex">{String(p.gender)[0].toUpperCase()}</span>,
    age && (p.dob
      ? <Tooltip key="age" label={`DOB: ${p.dob}`}><span>{age}</span></Tooltip>
      : <span key="age">{age}</span>),
  ].filter(Boolean);
  return (
    <span className={className}>
      {parts.map((part, i) => [i > 0 && ' • ', part])}
    </span>
  );
}
