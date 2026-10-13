import { useCallback } from 'react';
import { useAppStore } from '../../../../../../../store/useAppStore';

/**
 * Write one entry to this program's activity log (`patient_program_activity`),
 * for the selected patient. `opts` takes activityKind, statusLabel, statusType.
 */
export function useProgramActivityLog(programCode) {
  const logProgramActivity = useAppStore(s => s.logProgramActivity);
  return useCallback(
    (title, opts = {}) => logProgramActivity({ programCode, title, ...opts }),
    [logProgramActivity, programCode],
  );
}
