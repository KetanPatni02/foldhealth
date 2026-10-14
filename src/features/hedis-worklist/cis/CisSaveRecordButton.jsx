import { useState } from 'react';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { cisPdfFile } from './downloadCisSchedule';
import { fmtDate, seriesStartDate } from './cisStatusConfig';

/**
 * Save to Document & Sync to EHR, in one click: the immunization record PDF
 * (Astrana branding) is saved to the care gap's Documents and synced to the
 * patient's EHR. A non-standard note; nothing is billed. Disabled until a
 * dose is on record.
 *
 * @param {object}   props
 * @param {object}   props.member
 * @param {object}   props.result         – evaluateCis() output
 * @param {object}   [props.notes]
 * @param {function} props.onSaveEvidence – ({ file, caption }) => void
 * @param {'S'|'L'}  [props.size='S']
 */
export function CisSaveRecordButton({ member, result, notes, onSaveEvidence, size = 'S' }) {
  const [busy, setBusy] = useState(false);
  const hasDoses = result.antigens.some(a => a.rows.some(r => r.kind === 'given'));
  const save = async () => {
    setBusy(true);
    try {
      const file = await cisPdfFile({ member, result, notes, startedOn: seriesStartDate(result), mode: 'record', brand: 'astrana' });
      onSaveEvidence({ file, caption: `Immunization Record (CIS-CMB10) ${fmtDate(new Date())}` });
    } finally {
      setBusy(false);
    }
  };
  const disabled = !onSaveEvidence || !hasDoses || busy;
  return (
    <ActionButton
      size={size}
      icon="solar:file-send-linear"
      tooltip={hasDoses ? 'Save to Document & Sync to EHR' : 'No doses on record yet'}
      tooltipLeft
      state={disabled ? 'disabled' : 'active'}
      onClick={disabled ? undefined : save}
    />
  );
}
