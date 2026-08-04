import { useState } from 'react';
import { Icon } from '../../components/Icon/Icon';
import { Avatar } from '../../components/Avatar/Avatar';
import { Badge } from '../../components/Badge/Badge';
import { DownChevronIcon } from '../../components/Icon/DownChevronIcon';
import { Checkbox } from '../../components/ShadcnCheckbox/ShadcnCheckbox';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { MenuPopover } from '../../components/MenuPopover/MenuPopover';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { formatDobDisplay, deriveDob } from '../../lib/patientDob';
import { useAppStore } from '../../store/useAppStore';
import { FoldIdTag } from '../../components/FoldIdTag/FoldIdTag';
import styles from './AwvWorklistRow.module.css';

/**
 * Map AWV Program Sub Status → shared Badge variant. Uses the awv-*
 * palette declared in Badge.module.css (blue for info, grey for
 * unreachable, green for engaged, amber for attempted / follow-up).
 */
const STATUS_VARIANT = {
  Open: 'awv-open',
  New: 'awv-new',
  'Unable to Reach': 'awv-unable',
  Engaged: 'awv-engaged',
  Attempted: 'awv-attempted',
  'Engaged - Requires Follow Up': 'awv-engaged-followup',
};

/** Risk IQ → shared Badge lace-* variant (Low / Medium / High). */
const RISK_VARIANT = {
  Low: 'lace-low',
  Medium: 'lace-medium',
  High: 'lace-high',
};

const LANG_MAP = {
  en: 'English', es: 'Spanish', zh: 'Chinese', yue: 'Cantonese',
  ko: 'Korean', vi: 'Vietnamese', hi: 'Hindi', pa: 'Punjabi',
};

/**
 * Single AWV worklist row. Row-level styling comes from
 * AwvWorklistRow.module.css, which mirrors TOC's WorklistRow.module.css
 * so both worklists read as the same visual system (row divider, cell
 * padding, sticky column backgrounds, L-size action buttons with
 * dividers). AWV-specific cells (program-status pill, due-date chip,
 * task badge, assignee assign-button) sit on top of that shared base.
 */
export function AwvWorklistRow({ member, selected, onToggle, onView, onCall, showToast }) {
  const updateAwvMemberStatus = useAppStore(s => s.updateAwvMemberStatus);
  const openQuickView = useAppStore(s => s.openQuickView);
  const [statusAnchor, setStatusAnchor] = useState(null);

  const statusVariant = STATUS_VARIANT[member.progSubStatus] || 'awv-new';
  const riskVariant = RISK_VARIANT[member.ri] || 'lace-low';
  const language = member.language || 'en';

  return (
    <tr className={[styles.row, selected ? styles.rowSelected : ''].filter(Boolean).join(' ')}>
      {/* Sticky-left checkbox */}
      <td className={`${styles.checkTd} ${styles.stickyLeft}`} style={{ left: 0 }}>
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          aria-label={`Select ${member.name}`}
        />
      </td>

      {/* Sticky-left Members cell — mirrors TOC's DOM structure exactly */}
      <td className={`${styles.membersTd} ${styles.stickyLeft}`} style={{ left: 36 }}>
        <div className={styles.patientCell}>
          <Avatar variant="patient" initials={member.in} />
          <div>
            <div className={styles.patientName}>
              <button
                type="button"
                className={styles.patientNameLink}
                onClick={(e) => {
                  e.stopPropagation();
                  openQuickView({
                    id: member.id,
                    name: member.name,
                    initials: member.in,
                    gender: member.g,
                    age: member.age,
                    memberId: member.memberId,
                    language: member.language,
                  });
                }}
              >
                {member.name}
              </button>{' '}
              {(() => {
                const dobLabel = formatDobDisplay(member.dob) || deriveDob(member.age, member.name);
                return (
                  <Tooltip label={dobLabel ? `DOB: ${dobLabel}` : ''} placement="bottom">
                    <span className={styles.patientDemo}>({member.g}•{member.age})</span>
                  </Tooltip>
                );
              })()}
            </div>
            <div className={styles.patientMeta}>
              <FoldIdTag id={member.memberId} className={styles.foldId} showToast={showToast} />{' '}•{' '}
              <button
                type="button"
                className={styles.langBadge}
                onClick={(e) => e.stopPropagation()}
              >
                {language.toUpperCase()}
                <span className={styles.langTooltip}>Preferred Language: {LANG_MAP[language] || 'English'}</span>
              </button>
            </div>
          </div>
        </div>
      </td>

      {/* Program Sub Status — clickable Badge with DownChevron. Wrapping
          Badge in a bare <button> keeps the pill visuals fully owned by
          the shared Badge component (color, radius, border, padding) while
          the surrounding button handles the click-to-open-menu affordance. */}
      <td className={styles.td}>
        <button
          type="button"
          className={styles.statusBtn}
          onClick={(e) => {
            e.stopPropagation();
            setStatusAnchor(e.currentTarget);
          }}
        >
          <Badge
            size="M"
            variant={statusVariant}
            label={member.progSubStatus}
            trailingIconElement={<DownChevronIcon size={12} color="currentColor" />}
          />
        </button>
        {statusAnchor && (
          <MenuPopover
            anchorRef={{ current: statusAnchor }}
            width={240}
            items={[
              { label: 'Engaged', key: 'Engaged' },
              { label: 'Attempted', key: 'Attempted' },
              { label: 'Engaged - Requires Follow Up', key: 'Engaged - Requires Follow Up' },
            ]}
            onSelect={(key) => updateAwvMemberStatus(member.id, key)}
            onClose={() => setStatusAnchor(null)}
          />
        )}
      </td>

      {/* Program Name */}
      <td className={styles.td}>{member.progName}</td>

      {/* Due Date — date on top, colored label below */}
      <td className={styles.td}>
        <div className={styles.dueCell}>
          <div className={styles.dueDate}>{member.due}</div>
          <div className={styles.dueLabel} style={{ color: member.dueCol }}>
            <Icon name="solar:clock-circle-linear" size={11} color={member.dueCol} />
            {member.dueLabel}
          </div>
        </div>
      </td>

      {/* Outreach */}
      <td className={styles.td}>
        <AwvOutreachCell member={member} />
      </td>

      {/* Assignee */}
      <td className={styles.td}>
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
      <td className={styles.td}>{member.npAppt || '—'}</td>

      {/* Last AWV */}
      <td className={styles.td}>{member.lastAwv || '—'}</td>

      {/* AdvIllness */}
      <td className={styles.td} style={{ textAlign: 'center' }}>{member.ad}</td>

      {/* Frailty */}
      <td className={styles.td} style={{ textAlign: 'center' }}>{member.fr}</td>

      {/* Risk IQ — shared Badge with lace-* variant (Low/Medium/High). */}
      <td className={styles.td}>
        <Badge size="M" variant={riskVariant} label={member.ri} />
      </td>

      {/* Decile */}
      <td className={styles.td} style={{ textAlign: 'center' }}>{member.dec}</td>

      {/* Task */}
      <td className={styles.td} style={{ textAlign: 'center' }}>
        {member.task > 0 ? (
          <span className={styles.taskBadge}>{member.task}</span>
        ) : (
          <span className={styles.taskBadgeMuted}>0</span>
        )}
      </td>

      {/* Actions — sticky-right, L-size buttons with dividers, matches TOC */}
      <td className={`${styles.td} ${styles.stickyRight}`}>
        <div className={styles.actionsCell}>
          <ActionButton
            icon="solar:document-text-linear"
            size="L"
            tooltip="View Program"
            onClick={onView}
          />
          <span className={styles.actionDivider} />
          <ActionButton
            icon="solar:phone-linear"
            size="L"
            tooltip="Call"
            onClick={onCall}
          />
          <span className={styles.actionDivider} />
          <ActionButton
            icon="solar:menu-dots-linear"
            size="L"
            tooltip="More"
            onClick={() => showToast(`More actions for ${member.name} — coming soon`)}
          />
        </div>
      </td>
    </tr>
  );
}

// AWV Outreach cell — status icon+label stacked over 3-dot history.
// Ported from TOC's OutreachCell so both worklists render identical UI.
function AwvOutreachCell({ member }) {
  const n = member.outreach || 0;
  const isEngaged = member.progSubStatus === 'Engaged' || member.progSubStatus === 'Engaged - Requires Follow Up';
  const isUnableToReach = member.progSubStatus === 'Unable to Reach';
  const dots = (() => {
    if (n === 0) return ['pending', 'pending', 'pending'];
    if (isEngaged) return ['success', 'success', n >= 3 ? 'success' : 'pending'];
    if (isUnableToReach) return ['failed', 'failed', n >= 3 ? 'failed' : 'pending'];
    return [
      n >= 1 ? 'failed' : 'pending',
      n >= 2 ? 'failed' : 'pending',
      n >= 3 ? 'failed' : 'pending',
    ];
  })();
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
