import { Icon } from '../../components/Icon/Icon';
import { Avatar } from '../../components/Avatar/Avatar';
import { Badge } from '../../components/Badge/Badge';
import { Checkbox } from '../../components/ui/checkbox';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { useAppStore } from '../../store/useAppStore';
import styles from './HedisWorklistRow.module.css';

const LANG_MAP = {
  en: 'English', es: 'Spanish; Castilian', zh: 'Chinese', yue: 'Cantonese',
  ko: 'Korean', vi: 'Vietnamese', hi: 'Hindi', bn: 'Bengali', ar: 'Arabic',
};

// HEDIS risk level → existing Badge variant.
const RISK_BADGE_VARIANT = {
  '1_High':     'priority-critical',
  '2_Mod-High': 'priority-high',
  '3_Moderate': 'priority-medium',
  '4_Mod-Low':  'toc-engaged',
  '5_Low':      'compliance-pass',
};

const STATUS_CLASS = { Open: styles.gapStatusOpen, Closed: styles.gapStatusClosed, Excluded: styles.gapStatusExcluded };

// Outreach cell — mirrors the TOC worklist's outreach pattern
// (src/features/toc-worklist/WorklistRow.jsx OutreachCell).
function OutreachCell({ member }) {
  const dots = member.outreachDots || ['pending', 'pending', 'pending'];
  const hasSuccess = dots.includes('success');
  const hasFailed = dots.includes('failed') && !hasSuccess;

  return (
    <div className={styles.outreachWl}>
      <div className={styles.outreachWlMain}>
        {hasSuccess ? (
          <>
            <Icon name="solar:phone-calling-bold" size={15} color="#059669" />
            <div>
              <div className={styles.outreachWlText}>Attended</div>
              {member.outreachDate && (
                <div className={styles.outreachWlDate}>{member.outreachDate}</div>
              )}
            </div>
          </>
        ) : hasFailed ? (
          <>
            <Icon name="solar:phone-bold" size={15} color="#DC2626" />
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

export function HedisWorklistRow({ member, isSelected, onSelect, onOpenGap }) {
  const showToast = useAppStore(s => s.showToast);
  const primaryGap = member.gaps[0];

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

      {/* Member — matches src/features/toc-worklist member-cell pattern */}
      <td className={`${styles.memberTd} ${styles.stickyLeft} ${styles.stickyMember}`}>
        <div className={styles.patientCell}>
          <Avatar variant="patient" initials={member.in} />
          <div>
            <div className={styles.patientName}>
              <button className={styles.patientNameLink} onClick={e => e.stopPropagation()}>
                {member.name}
              </button>{' '}
              <span className={styles.patientDemo}>({member.gender}&bull;{member.age})</span>
            </div>
            <div className={styles.patientMeta}>
              {member.memberId} &bull;{' '}
              <span className={styles.langBadge}>
                {langShort}
                <span className={styles.langTooltip}>Preferred Language: {langFull}</span>
              </span>
            </div>
          </div>
        </div>
      </td>

      {/* Total Gaps — neutral <Badge> for every measure code */}
      <td className={styles.td} onClick={e => e.stopPropagation()}>
        <div className={styles.gapList}>
          {member.gaps.map(g => (
            <span key={g.code} onClick={() => onOpenGap?.(member, g.code)} style={{ cursor: 'pointer' }}>
              <Badge variant="compliance-na" label={g.code} />
            </span>
          ))}
        </div>
      </td>

      {/* Gap Status */}
      <td className={styles.td}>
        <div className={styles.gapStatusCell}>
          {member.gaps.map(g => (
            <div key={g.code} className={styles.gapStatusLine}>
              <span className={styles.gapStatusCode}>{g.code}:</span>{' '}
              <span className={STATUS_CLASS[g.status] || ''}>{g.status}</span>
            </div>
          ))}
        </div>
      </td>

      {/* Outreach — TOC pattern */}
      <td className={styles.td}>
        <OutreachCell member={member} />
      </td>

      {/* Assignee */}
      <td className={styles.td} onClick={e => e.stopPropagation()}>
        <div className={styles.assigneeCell}>
          <span className={styles.assigneeCode}>{primaryGap.code}:</span>
          {member.assignee ? (
            <div className={styles.assigneeName}>
              <Icon name="solar:user-circle-linear" size={14} color="var(--primary-300)" />
              <span>{member.assignee}</span>
            </div>
          ) : (
            <button
              className={styles.assigneeBtn}
              onClick={() => showToast('Assign care manager — coming soon')}
            >
              <Icon name="solar:user-plus-rounded-linear" size={13} color="var(--neutral-300)" />
              Assign
            </button>
          )}
        </div>
      </td>

      {/* Start Date */}
      <td className={styles.td}>
        <div className={styles.startDateCell}>
          <span className={styles.startDateCode}>{primaryGap.code}:</span>
          <span className={styles.startDateValue}>{member.startDate}</span>
        </div>
      </td>

      {/* AdvIllness */}
      <td className={styles.td}>
        <span className={styles.numText}>{member.advIllness ?? 0}</span>
      </td>

      {/* Frailty */}
      <td className={styles.td}>
        <span className={styles.numText}>{member.frailty ?? 0}</span>
      </td>

      {/* Risk Level — uses shared <Badge> with risk variants */}
      <td className={styles.td}>
        {member.riskLevel ? (
          <Badge variant={RISK_BADGE_VARIANT[member.riskLevel]} label={member.riskLevel} />
        ) : (
          <span className={styles.muted}>—</span>
        )}
      </td>

      {/* Tasks */}
      <td className={styles.td}>
        {member.tasks != null
          ? <span className={styles.numText}>{member.tasks}</span>
          : <span className={styles.muted}>—</span>}
      </td>

      {/* Actions */}
      <td className={`${styles.actionsCell} ${styles.stickyRight}`}>
        <div className={styles.actionsBtns}>
          <ActionButton
            icon="solar:eye-linear"
            size="L"
            tooltip="View care gap details"
            onClick={e => { e.stopPropagation(); onOpenGap?.(member, primaryGap.code); }}
          />
          <ActionButton
            icon="solar:phone-linear"
            size="L"
            tooltip="Call"
            onClick={e => { e.stopPropagation(); showToast('Call — coming soon'); }}
          />
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
