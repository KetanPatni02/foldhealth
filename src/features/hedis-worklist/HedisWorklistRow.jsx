import { Icon } from '../../components/Icon/Icon';
import { Avatar } from '../../components/Avatar/Avatar';
import { Badge } from '../../components/Badge/Badge';
import { Checkbox } from '../../components/ShadcnCheckbox/ShadcnCheckbox';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { useAppStore } from '../../store/useAppStore';
import { FoldIdTag } from '../../components/FoldIdTag/FoldIdTag';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { formatDobDisplay, deriveDob } from '../../lib/patientDob';
import styles from './HedisWorklistRow.module.css';

const LANG_MAP = {
  en: 'English', es: 'Spanish; Castilian', zh: 'Chinese', yue: 'Cantonese',
  ko: 'Korean', vi: 'Vietnamese', hi: 'Hindi', bn: 'Bengali', ar: 'Arabic',
};

const RISK_BADGE_VARIANT = {
  '1_High':     'priority-critical',
  '2_Mod-High': 'priority-high',
  '3_Moderate': 'priority-medium',
  '4_Mod-Low':  'toc-engaged',
  '5_Low':      'compliance-pass',
};

const STATUS_BADGE_VARIANT = {
  Open:                            'ai-care',
  Engaged:                         'status-queued',
  'Engaged Requires Follow-Up':    'status-queued',
  Submitted:                       'status-queued',
  Completed:                       'status-completed',
  'Closed - Do not call':          'ai-neutral',
  'Closed - UTR':                  'ai-neutral',
  'Closed - Other':                'ai-neutral',
};

// Outreach cell — mirrors the TOC worklist's outreach pattern.
function OutreachCell({ member }) {
  const dots = Array.isArray(member.outreachDots)
    ? member.outreachDots
    : ['pending', 'pending', 'pending'];
  const hasSuccess = dots.includes('success');
  const hasFailed = dots.includes('failed') && !hasSuccess;

  return (
    <div className={styles.outreachWl}>
      <div className={styles.outreachWlMain}>
        {hasSuccess ? (
          <>
            <Icon name="solar:phone-calling-bold" size={15} color="var(--status-success)" />
            <div>
              <div className={styles.outreachWlText}>Attended</div>
              {member.outreachDate && (
                <div className={styles.outreachWlDate}>{member.outreachDate}</div>
              )}
            </div>
          </>
        ) : hasFailed ? (
          <>
            <Icon name="solar:phone-bold" size={15} color="var(--status-error)" />
            <div>
              <div className={styles.outreachWlFailed}>Failed</div>
              {member.outreachDate && (
                <div className={styles.outreachWlDateMuted}>{member.outreachDate}</div>
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
        {dots.map((d, i) => <div key={i} className={`${styles.dot} ${styles[d]}`} />)}
      </div>
    </div>
  );
}

/**
 * Middle-column defs for HEDIS. Every column carries `renderCell(member,
 * ctx)` so hide + reorder in the Show Columns popover ripple through the
 * table body. The per-gap columns (total gaps, gap status, assignee, start
 * date) map each gap to its own row inside the cell, keeping the original
 * multi-gap presentation.
 *
 * Some cells stop row-click propagation because they contain their own
 * click targets (gap badges, assign button). `stopRowClickPropagation`
 * routes that through the row iterator without repeating the pattern
 * inline per cell.
 *
 * ctx shape: { onOpenGap, showToast }
 */
export const HEDIS_MIDDLE_COLUMNS = [
  {
    key: 'totalGaps',
    label: 'Total Gaps',
    stopRowClickPropagation: true,
    getTdClassName: (member) => (
      (Array.isArray(member.gaps) && member.gaps.length === 1)
        ? `${styles.tdGap} ${styles.tdGapCenter}`
        : styles.tdGap
    ),
    renderCell: (member, ctx) => (
      <div className={styles.gapItems}>
        {(member.gaps || []).map(g => (
          <div key={g.code} className={styles.gapItem}>
            <span onClick={() => ctx.onOpenGap?.(member, g.code)} style={{ cursor: 'pointer' }}>
              <Badge size="M" variant="compliance-na" label={g.code} />
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: 'gapStatus',
    label: 'Gap Status',
    getTdClassName: (member) => (
      (Array.isArray(member.gaps) && member.gaps.length === 1)
        ? `${styles.tdGap} ${styles.tdGapCenter}`
        : styles.tdGap
    ),
    renderCell: (member) => (
      <div className={styles.gapItems}>
        {(member.gaps || []).map(g => (
          <div key={g.code} className={styles.gapItem}>
            <Badge size="M" variant={STATUS_BADGE_VARIANT[g.status] || 'ai-neutral'} label={g.status} />
          </div>
        ))}
      </div>
    ),
  },
  {
    key: 'assignee',
    label: 'Assignee',
    stopRowClickPropagation: true,
    getTdClassName: (member) => (
      (Array.isArray(member.gaps) && member.gaps.length === 1)
        ? `${styles.tdGap} ${styles.tdGapCenter}`
        : styles.tdGap
    ),
    renderCell: (member, ctx) => (
      <div className={styles.gapItems}>
        {(member.gaps || []).map(g => {
          const assignee = g.assignee ?? member.assignee;
          return (
            <div key={g.code} className={styles.gapItem}>
              {assignee ? (
                <div className={styles.assigneeName}>
                  <Icon name="solar:user-linear" size={14} color="var(--neutral-400)" />
                  <span>{assignee}</span>
                </div>
              ) : (
                <button
                  className={styles.assigneeBtn}
                  onClick={() => ctx.showToast('Assign care manager — coming soon')}
                >
                  <Icon name="solar:user-linear" size={14} color="var(--neutral-200)" />
                  Assign
                </button>
              )}
            </div>
          );
        })}
      </div>
    ),
  },
  {
    key: 'startDate',
    label: 'Start Date',
    sortKey: 'startDate',
    getTdClassName: (member) => (
      (Array.isArray(member.gaps) && member.gaps.length === 1)
        ? `${styles.tdGap} ${styles.tdGapCenter} ${styles.tdGapDivide}`
        : `${styles.tdGap} ${styles.tdGapDivide}`
    ),
    renderCell: (member) => (
      <div className={styles.gapItems}>
        {(member.gaps || []).map(g => (
          <div key={g.code} className={styles.gapItem}>
            <span className={styles.startDateValue}>{g.startDate ?? member.startDate}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: 'outreach',
    label: 'Outreach',
    renderCell: (member) => <OutreachCell member={member} />,
  },
  {
    key: 'advIllness',
    label: 'AdvIllness',
    sortKey: 'advIllness',
    renderCell: (member) => <span className={styles.numText}>{member.advIllness ?? 0}</span>,
  },
  {
    key: 'frailty',
    label: 'Frailty',
    sortKey: 'frailty',
    renderCell: (member) => <span className={styles.numText}>{member.frailty ?? 0}</span>,
  },
  {
    key: 'riskLevel',
    label: 'Risk Level',
    sortKey: 'riskLevel',
    renderCell: (member) => (
      member.riskLevel
        ? <Badge size="M" variant={RISK_BADGE_VARIANT[member.riskLevel]} label={member.riskLevel} />
        : <span className={styles.muted}>—</span>
    ),
  },
  {
    key: 'tasks',
    label: 'Tasks',
    sortKey: 'tasks',
    renderCell: (member) => (
      member.tasks != null
        ? <span className={styles.numText}>{member.tasks}</span>
        : <span className={styles.muted}>—</span>
    ),
  },
];

export function HedisWorklistRow({ member, columns, hiddenSet, isSelected, onSelect, onOpenGap }) {
  const showToast = useAppStore(s => s.showToast);
  const openQuickView = useAppStore(s => s.openQuickView);
  const gaps = Array.isArray(member.gaps) ? member.gaps : [];
  if (gaps.length === 0) return null;
  const primaryGap = gaps[0];

  const middleCols = (columns || HEDIS_MIDDLE_COLUMNS)
    .filter(c => !c.sticky && !c.showCheckbox && c.renderCell);
  const visibleMiddle = hiddenSet ? middleCols.filter(c => !hiddenSet.has(c.key)) : middleCols;

  const cellCtx = { onOpenGap, showToast };

  const langShort = (member.language || 'en').toUpperCase();
  const langFull = LANG_MAP[member.language] || member.language;

  return (
    <tr
      className={[styles.row, isSelected ? styles.rowChecked : ''].filter(Boolean).join(' ')}
      onClick={() => onOpenGap?.(member, primaryGap.code)}
    >
      {/* Checkbox */}
      <td className={`${styles.checkTd} ${styles.stickyLeft} ${styles.stickyCheck}`} onClick={e => e.stopPropagation()}>
        <Checkbox checked={isSelected} onCheckedChange={() => onSelect(member.id)} aria-label={`Select ${member.name}`} />
      </td>

      {/* Member */}
      <td className={`${styles.memberTd} ${styles.stickyLeft} ${styles.stickyMember}`}>
        <div className={styles.patientCell}>
          <Avatar variant="patient" initials={member.in} />
          <div>
            <div className={styles.patientName}>
              <button
                className={styles.patientNameLink}
                onClick={e => {
                  e.stopPropagation();
                  openQuickView({ id: member.id, name: member.name, initials: member.in, gender: member.gender, age: member.age, memberId: member.memberId, language: member.language });
                }}
              >
                {member.name}
              </button>{' '}
              {(() => {
                const dobLabel = formatDobDisplay(member.dob) || deriveDob(member.age, member.name);
                return (
                  <Tooltip label={dobLabel ? `DOB: ${dobLabel}` : ''} placement="bottom">
                    <span className={styles.patientDemo}>({member.gender}&bull;{member.age})</span>
                  </Tooltip>
                );
              })()}
            </div>
            <div className={styles.patientMeta}>
              <FoldIdTag id={member.memberId} className={styles.foldId} showToast={showToast} />{' '}&bull;{' '}
              <span className={styles.langBadge}>
                {langShort}
                <span className={styles.langTooltip}>Preferred Language: {langFull}</span>
              </span>
            </div>
          </div>
        </div>
      </td>

      {visibleMiddle.map(col => {
        const className = col.getTdClassName ? col.getTdClassName(member) : (col.tdClassName || styles.td);
        return (
          <td
            key={col.key}
            data-col-key={col.key}
            className={className}
            onClick={col.stopRowClickPropagation ? (e) => e.stopPropagation() : undefined}
          >
            {col.renderCell(member, cellCtx)}
          </td>
        );
      })}

      {/* Actions */}
      <td className={`${styles.actionsCell} ${styles.stickyRight}`}>
        <div className={styles.actionsBtns}>
          <ActionButton
            icon="solar:eye-linear"
            size="L"
            tooltip="View care gap details"
            onClick={e => { e.stopPropagation(); onOpenGap?.(member, primaryGap.code); }}
          />
          <span className={styles.actionsDivider} />
          <ActionButton
            icon="solar:phone-linear"
            size="L"
            tooltip="Call"
            onClick={e => { e.stopPropagation(); showToast('Call — coming soon'); }}
          />
          <span className={styles.actionsDivider} />
          <ActionButton
            icon="solar:menu-dots-bold"
            size="L"
            tooltip="More"
            onClick={e => { e.stopPropagation(); showToast('More actions — coming soon'); }}
          />
        </div>
      </td>
    </tr>
  );
}
