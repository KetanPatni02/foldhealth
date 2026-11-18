import { Icon } from '../../../../../../components/Icon/Icon';
import { LOG_TYPE_ICON } from './OutreachTab.utils';
import { LogRowMenu } from './OutreachLogRowMenu';
import styles from './OutreachTab.module.css';

const SMS_ICON = 'solar:chat-round-line-linear';

/**
 * Outreach log groups as shared ActivityLog entries, so the Outreach tab's
 * timeline reads like every other activity log: month headers, the icon
 * rail, meta line, headline with program badges, outcome and View Note.
 */
export function outreachActivityEntries(groups, { onEdit, onDelete, extraActions, sequenceOf = null } = {}) {
  return (groups || []).flatMap(group => [
    { t: 'group', label: group.label },
    ...group.logs.map(log => {
      const [by, role] = String(log.author || '').split(/ \((.*)\)$/);
      const programs = log.programs || [];
      return {
        id: log.id,
        t: 'outreach',
        icon: log.type === 'SMS' ? SMS_ICON : (LOG_TYPE_ICON[log.type]?.icon || 'solar:document-text-linear'),
        date: log.date,
        time: log.time,
        by,
        role,
        context: (sequenceOf?.[log.id] || log.outreachSource) ? (
          <>
            {sequenceOf?.[log.id]}
            {sequenceOf?.[log.id] && log.outreachSource && ' • '}
            {log.outreachSource && <span className={styles.logMetaSource} title={`Source: ${log.outreachSource}`}>via {log.outreachSource}</span>}
          </>
        ) : null,
        title: log.title,
        // An HCC gap pill logs its full name ("HCC 37 - Diabetes…"); the badge reads "HCC 37".
        badges: programs.length
          ? programs.map(p => {
            const hcc = /^(HCC\s*\d+)\s*-/.exec(p);
            return hcc ? { label: hcc[1], title: p } : p;
          })
          : [{ label: 'Member Outreach', tone: 'grey', title: 'Member outreach: not tied to a care program' }],
        outcome: log.outcome,
        outcomeColor: log.outcomeColor,
        outcomeAside: log.type === 'Call' && log.callDetailsMissing ? (
          <span className={styles.logCallNoDetails} title="External call: call details not available">
            <Icon name="solar:info-circle-linear" size={10} color="var(--neutral-300)" />
            Call details unavailable
          </span>
        ) : null,
        expandLabel: 'View Note',
        note: log.note,
        callDetails: log.type === 'Call' ? log.callDetails : undefined,
        trailing: <LogRowMenu log={log} onEdit={onEdit} onDelete={onDelete} extraActions={extraActions} />,
      };
    }),
  ]);
}
