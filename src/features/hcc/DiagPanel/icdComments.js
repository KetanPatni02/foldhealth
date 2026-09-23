import { useMemo } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { commentsForMember } from '../data/ancillary';

/**
 * Comment state for one ICD on the open patient: how many comments are on
 * it, and whether any of them are unread by the logged-in user (not in their
 * seen set). Falls back to the seeded `fallbackCount` until comments load.
 */
export function useIcdComments(code, fallbackCount = 0) {
  const dbComments = useAppStore(s => s.hccDiagComments);
  const memberId = useAppStore(s => s.diagPanelMemberId);
  const seenIds = useAppStore(s => s.hccDiagSeen[memberId]?.comments);
  return useMemo(() => {
    if (!dbComments?.length) return { count: fallbackCount, unread: false };
    const mine = commentsForMember(dbComments, memberId).filter(c => c?.icd === code);
    // No seen record yet means the first-visit baseline hasn't run; don't
    // flag anything until it has.
    const seen = seenIds ? new Set(seenIds) : null;
    return { count: mine.length, unread: !!seen && mine.some(c => !seen.has(c.id)) };
  }, [dbComments, memberId, seenIds, code, fallbackCount]);
}
