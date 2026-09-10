import { PhoneVerifiedIcon } from '../Icon/PhoneVerifiedIcon';
import { Tooltip } from '../Tooltip/Tooltip';

/**
 * Green phone-with-checkmark shown next to a patient name when they are
 * active on the Fold patient mobile app.
 */
export function PatientAppActiveIndicator({ size = 16, className }) {
  return (
    <Tooltip label="Active on patient app" placement="bottom">
      <span className={className} style={{ display: 'inline-flex', lineHeight: 0 }}>
        <PhoneVerifiedIcon size={size} color="var(--status-success-bright)" />
      </span>
    </Tooltip>
  );
}
