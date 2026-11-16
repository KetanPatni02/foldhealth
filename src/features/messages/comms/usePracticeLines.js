import { useEffect } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { inboxOf } from './commsInboxes';
import { lineSnapshot, showPracticeLine } from './practiceLine';

/**
 * The practice's SMS lines (SMS inboxes), whether threads show the line a
 * patient used, and a conversation's own line (its inbox, as a snapshot).
 */
export function usePracticeLines() {
  const inboxes = useAppStore(s => s.commsInboxes);
  const sample = useAppStore(s => s.commsInboxesTableMissing);
  const alwaysShow = useAppStore(s => s.alwaysShowSmsLine);
  const fetchCommsInboxes = useAppStore(s => s.fetchCommsInboxes);
  const fetchOrgFeatures = useAppStore(s => s.fetchOrgFeatures);
  useEffect(() => { fetchCommsInboxes(); fetchOrgFeatures(); }, [fetchCommsInboxes, fetchOrgFeatures]);

  const lines = inboxes.filter(i => i.channel === 'sms');
  const conversationLine = (conversation) => {
    if (conversation?.channel !== 'sms') return null;
    const id = inboxOf(conversation, sample);
    return lineSnapshot(lines.find(i => i.id === id));
  };
  // `sample`: lines are the fallback rows (comms_inboxes not migrated), so
  // there's no inbox_id column to write a line to yet.
  return { lines, sample, show: showPracticeLine(lines.length, alwaysShow), conversationLine };
}
