import { Icon } from '../../components/Icon/Icon';
import { Avatar } from '../../components/Avatar/Avatar';
import { Checkbox } from '../../components/ui/checkbox';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { AWV_STATUS, RISK_COLOR } from './data/mock';
import styles from './AwvWorklistRow.module.css';

/**
 * Single AWV worklist row. Mirrors HccWorklistRow's column ordering but
 * with AWV-specific cells: program-status pill, due-date chip, outreach
 * log count, NP appointment date, last AWV, decile/advillness/frailty
 * vitals, risk-level pill, task count, and the Actions trio.
 */
export function AwvWorklistRow({ member, selected, onToggle, onView, onCall, showToast }) {
  const statusCfg = AWV_STATUS[member.progSubStatus] || AWV_STATUS.New;
  const riskCfg = RISK_COLOR[member.ri] || RISK_COLOR.Low;

  return (
    <tr className={[styles.row, selected ? styles.rowSelected : ''].filter(Boolean).join(' ')}>
      <td className={styles.tdCheck} style={{ position: 'sticky', left: 0, zIndex: 1, background: 'inherit' }}>
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          aria-label={`Select ${member.name}`}
        />
      </td>

      {/* Member — sticky-left so it stays visible during horizontal scroll.
          background:inherit pulls the row's bg so scrolled content
          doesn't bleed through during scroll. */}
      <td className={styles.tdMember} style={{ position: 'sticky', left: 36, zIndex: 1, background: 'inherit', borderRight: '0.5px solid var(--neutral-150)' }}>
        <div className={styles.memberCell}>
          <Avatar variant="patient" initials={member.in} />
          <div className={styles.memberText}>
            <button type="button" className={styles.memberName} onClick={onView}>
              {member.name}
              <span className={styles.memberMeta}>
                ({member.g}•{member.age})
              </span>
            </button>
            <span className={styles.memberId}>{member.memberId} • EN</span>
          </div>
        </div>
      </td>

      {/* Program Sub Status */}
      <td>
        <span
          className={styles.pill}
          style={{ color: statusCfg.color, background: statusCfg.bg, borderColor: statusCfg.color }}
        >
          {member.progSubStatus}
        </span>
      </td>

      {/* Program Name */}
      <td>{member.progName}</td>

      {/* Due Date */}
      <td>
        <div className={styles.dueCell}>
          <div className={styles.dueDate}>{member.due}</div>
          <div className={styles.dueLabel} style={{ color: member.dueCol }}>
            <Icon name="solar:clock-circle-linear" size={11} color={member.dueCol} />
            {member.dueLabel}
          </div>
        </div>
      </td>

      {/* Outreach */}
      <td>
        <AwvOutreachCell member={member} />
      </td>

      {/* Assignee */}
      <td>
        {member.assignee ? (
          <div className={styles.assigneeCell}>
            <Avatar variant="assignee" initials={member.assigneeIn} />
            <span className={styles.assigneeName}>{member.assignee}</span>
          </div>
        ) : (
          <button
            type="button"
            className={styles.assignBtn}
            onClick={() => showToast(`Assign owner for ${member.name} — coming soon`)}
          >
            Assign
          </button>
        )}
      </td>

      {/* NP Appointment */}
      <td className={styles.tdDate}>{member.npAppt || '—'}</td>

      {/* Last AWV */}
      <td className={styles.tdDate}>{member.lastAwv || '—'}</td>

      {/* Advillness */}
      <td className={styles.tdMetric}>{member.ad}</td>

      {/* Frailty */}
      <td className={styles.tdMetric}>{member.fr}</td>

      {/* Risk IQ */}
      <td>
        <span
          className={styles.pill}
          style={{ color: riskCfg.color, background: riskCfg.bg, borderColor: riskCfg.color }}
        >
          {member.ri}
        </span>
      </td>

      {/* Decile */}
      <td className={styles.tdMetric}>{member.dec}</td>

      {/* Task */}
      <td className={styles.tdMetric}>
        {member.task > 0 ? (
          <span className={styles.taskBadge}>{member.task}</span>
        ) : (
          <span className={styles.taskBadgeMuted}>0</span>
        )}
      </td>

      {/* Actions — sticky-right so the icon trio stays reachable. */}
      <td className={styles.tdActions} style={{ position: 'sticky', right: 0, zIndex: 1, background: 'inherit', borderLeft: '0.5px solid var(--neutral-150)' }}>
        <div className={styles.actionsRow}>
          <ActionButton
            icon="solar:eye-linear"
            size="S"
            tooltip="View Program"
            onClick={onView}
          />
          <ActionButton
            icon="solar:phone-calling-rounded-linear"
            size="S"
            tooltip="Call"
            onClick={onCall}
          />
          <ActionButton
            icon="solar:menu-dots-linear"
            size="S"
            tooltip="More"
            onClick={() => showToast(`More actions for ${member.name} — coming soon`)}
          />
        </div>
      </td>
    </tr>
  );
}

// AwvOutreachCell — mirrors TOC's OutreachCell exactly: status icon +
// label + date stacked, with a 3-dot history strip below. Dots come from
// a small derivation since the AWV mock stores attempt-count instead of
// per-attempt dot status (real backend would store the array).
function AwvOutreachCell({ member }) {
  const n = member.outreach || 0;
  const isCompleted = member.progSubStatus === 'Completed';
  const isDeclined  = member.progSubStatus === 'Declined';
  const dots = (() => {
    if (n === 0) return ['pending', 'pending', 'pending'];
    if (isCompleted) return ['success', 'success', n >= 3 ? 'success' : 'pending'];
    if (isDeclined)  return ['failed',  'failed',  n >= 3 ? 'failed'  : 'pending'];
    // In-progress outreach — first attempts failed, latest still pending
    return [
      n >= 1 ? 'failed' : 'pending',
      n >= 2 ? 'failed' : 'pending',
      n >= 3 ? 'failed' : 'pending',
    ];
  })();
  const hasSuccess = dots.includes('success');
  const hasFailed  = dots.includes('failed') && !hasSuccess;
  return (
    <div className={styles.outreachWl}>
      <div className={styles.outreachWlMain}>
        {hasSuccess ? (
          <>
            <Icon name="solar:phone-calling-bold" size={15} color="#059669" />
            <div>
              <div className={styles.outreachWlText}>Attended</div>
              {member.lastOutreach && (
                <div className={styles.outreachWlDate}>{member.lastOutreach}</div>
              )}
            </div>
          </>
        ) : hasFailed ? (
          <>
            <Icon name="solar:phone-bold" size={15} color="#DC2626" />
            <div>
              <div className={styles.outreachWlFailed}>Failed</div>
              {member.lastOutreach && (
                <div style={{ fontSize: 12, color: 'var(--neutral-200)' }}>{member.lastOutreach}</div>
              )}
            </div>
          </>
        ) : (
          <>
            <Icon name="solar:phone-linear" size={15} color="var(--neutral-200)" />
            <div className={styles.outreachWlNone}>—</div>
          </>
        )}
      </div>
      <div className={styles.dotsRow}>
        {dots.map((d, i) => <span key={i} className={`${styles.dot} ${styles[d]}`} />)}
      </div>
    </div>
  );
}
