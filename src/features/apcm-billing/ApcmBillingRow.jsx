import { useState } from 'react';
import { Icon } from '../../components/Icon/Icon';
import { Avatar } from '../../components/Avatar/Avatar';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Checkbox } from '../../components/ui/checkbox';
import { LANG_MAP } from './data/mock';
import styles from './ApcmBillingRow.module.css';

const CPT_CLASS = { G0556: styles.cptG0556, G0557: styles.cptG0557, G0558: styles.cptG0558 };

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function extractReasonTitle(reason) {
  const dash = reason.indexOf(' —');
  return dash > -1 ? reason.slice(0, dash) : reason;
}
function extractReasonBody(reason) {
  const dash = reason.indexOf(' —');
  return dash > -1 ? reason.slice(dash + 2).trim() : '';
}

function IcdCell({ icdCodes }) {
  const [expanded, setExpanded] = useState(false);
  if (!icdCodes?.length) return <span className={styles.emDash}>—</span>;

  const visible = expanded ? icdCodes : icdCodes.slice(0, 2);
  const remaining = icdCodes.length - 2;

  return (
    <div className={styles.icdList}>
      {visible.map((icd, i) => (
        <div key={i} className={styles.icdItem}>
          <span className={styles.icdBullet}>•</span>
          <span>
            <span className={styles.icdCode}>{icd.code}</span>
            {' '}
            <span className={styles.icdDesc}>{icd.description}</span>
          </span>
        </div>
      ))}
      {!expanded && remaining > 0 && (
        <button className={styles.icdMoreBtn} onClick={e => { e.stopPropagation(); setExpanded(true); }}>
          +{remaining} more
          <Icon name="solar:alt-arrow-down-linear" size={10} />
        </button>
      )}
      {expanded && icdCodes.length > 2 && (
        <button className={styles.icdMoreBtn} onClick={e => { e.stopPropagation(); setExpanded(false); }}>
          Show less
          <Icon name="solar:alt-arrow-up-linear" size={10} />
        </button>
      )}
    </div>
  );
}

function ReasonsCell({ reasons }) {
  if (!reasons?.length) {
    return <span className={styles.noReason}>—</span>;
  }
  return (
    <div className={styles.reasonsList}>
      {reasons.map((r, i) => {
        const title = extractReasonTitle(r);
        const desc = extractReasonBody(r);
        const isChronic = title.startsWith('Chronic Condition');
        return (
          <div key={i} className={styles.reasonItem}>
            <span className={styles.reasonIcon}>
              <Icon
                name={isChronic ? 'solar:checklist-minimalistic-linear' : 'solar:info-circle-linear'}
                size={13}
                color={isChronic ? 'var(--primary-300)' : 'var(--status-warning)'}
              />
            </span>
            <span className={styles.reasonTitleWrap}>
              <span className={isChronic ? styles.reasonTitleChronic : styles.reasonTitle}>
                {title}
              </span>
              {desc && <span className={styles.reasonTooltip}>{desc}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ApcmBillingRow({ patient, isSelected, isActive, onSelect, onTriggerBill, onCommentChange }) {
  const langCode = (patient.language || 'en').toUpperCase();
  const langFull = LANG_MAP[patient.language] || patient.language;
  const patientInitials = getInitials(patient.name);
  const providerInitials = getInitials(patient.renderingProvider);

  return (
    <tr className={[
      styles.row,
      isSelected ? styles.rowChecked : '',
      isActive ? styles.rowActive : '',
    ].filter(Boolean).join(' ')}>

      {/* Checkbox */}
      <td className={`${styles.stickyLeft} ${styles.stickyCheck} ${styles.checkTd} ${isActive ? styles.checkTdActive : ''}`}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(patient.id)}
          aria-label={`Select ${patient.name}`}
        />
      </td>

      {/* Member */}
      <td className={`${styles.stickyLeft} ${styles.stickyMember} ${styles.memberTd}`}>
        <div className={styles.patientCell}>
          <Avatar variant="patient" initials={patientInitials} />
          <div className={styles.patientInfo}>
            <span className={styles.patientName}>{patient.name}</span>
            <span className={styles.patientId}>{patient.memberId}</span>
            <button className={styles.langBadge} title={langFull}>
              {langCode}
              <span className={styles.langTooltip}>{langFull}</span>
            </button>
          </div>
        </div>
      </td>

      {/* EHR ID */}
      <td className={styles.td}>
        <a
          className={styles.ehrLink}
          href={`https://athena.example.com/patient/${patient.ehrId}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          title="Open in Athena EHR"
        >
          {patient.ehrId}
          <Icon name="solar:arrow-right-up-linear" size={12} color="var(--primary-300)" />
        </a>
      </td>

      {/* Month */}
      <td className={styles.td}>{patient.billingMonth}</td>

      {/* Date of Service */}
      <td className={styles.td}>{patient.dateOfService}</td>

      {/* CPT Code */}
      <td className={styles.td}>
        <span className={styles.emDash}>—</span>
      </td>

      {/* ICD Codes */}
      <td className={styles.tdWrap}>
        <IcdCell icdCodes={patient.icdCodes} />
      </td>

      {/* Last Encounter */}
      <td className={styles.td}>
        {patient.lastEncounterDate || <span className={styles.emDash}>—</span>}
      </td>

      {/* Reasons */}
      <td className={styles.tdWrap}>
        <ReasonsCell reasons={patient.reasons} />
      </td>

      {/* Rendering Provider */}
      <td className={styles.td}>
        <div className={styles.providerCell}>
          <Avatar variant="assignee" initials={providerInitials} />
          <span className={styles.providerName}>{patient.renderingProvider}</span>
        </div>
      </td>

      {/* Comment */}
      <td className={styles.commentTd}>
        <textarea
          className={styles.commentTextarea}
          placeholder="Add comment…"
          value={patient.comment}
          rows={1}
          onClick={e => e.stopPropagation()}
          onChange={e => onCommentChange(patient.id, e.target.value)}
        />
      </td>

      {/* Actions */}
      <td className={`${styles.stickyRight} ${styles.actionsTd}`}>
        <div className={styles.actionsBtns}>
          <ActionButton
            icon="solar:bill-list-linear"
            size="L"
            tooltip="Trigger Bill"
            onClick={e => { e.stopPropagation(); onTriggerBill([patient.id]); }}
          />
          <span className={styles.actionDivider} />
          <ActionButton
            icon="solar:menu-dots-linear"
            size="L"
            tooltip="More options"
            onClick={e => { e.stopPropagation(); }}
          />
        </div>
      </td>

    </tr>
  );
}
