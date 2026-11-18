import { useState } from 'react';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { toast } from '../../../components/Toast/sonnerToast';
import { cisRecordEvidence } from './downloadCisSchedule';
import { hasGivenDose } from './cisStatusConfig';

/**
 * Sync with EHR: the immunization record PDF (Astrana branding) is synced to
 * the patient's EHR and kept in the care gap's Documents. A non-standard
 * note; nothing is billed. Always clickable: with no dose on record there is
 * nothing to sync, so it shows an info toast instead.
 *
 * @param {object}   props
 * @param {object}   props.member
 * @param {object}   props.result         – evaluateCis() output
 * @param {object}   [props.notes]
 * @param {function} props.onSaveEvidence – ({ file, caption, sync }) => void
 * @param {'sm'|'md'} [props.size='sm']
 */
export function CisSyncEhrButton({ member, result, notes, onSaveEvidence, size = 'sm' }) {
  const [busy, setBusy] = useState(false);
  const sync = async () => {
    if (busy) return;
    if (!onSaveEvidence || !hasGivenDose(result)) {
      toast.info('Nothing available to sync with the EHR yet');
      return;
    }
    setBusy(true);
    try {
      onSaveEvidence({ ...(await cisRecordEvidence({ member, result, notes })), sync: true });
      toast.success('Immunization record synced with the EHR');
    } catch {
      toast.error('Could not sync with the EHR. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <ActionButton
      size={size}
      icon="solar:refresh-circle-linear"
      tooltip="Sync with EHR"
      tooltipLeft
      onClick={sync}
    />
  );
}
