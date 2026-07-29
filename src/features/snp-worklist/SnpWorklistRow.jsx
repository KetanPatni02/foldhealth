import { Icon } from '../../components/Icon/Icon';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Avatar } from '../../components/Avatar/Avatar';
import { Checkbox } from '../../components/ShadcnCheckbox/checkbox';
import { useAppStore } from '../../store/useAppStore';
import styles from './SnpWorklistRow.module.css';

const LANG_MAP = { en: 'English', es: 'Spanish', zh: 'Chinese', yue: 'Cantonese', ko: 'Korean', vi: 'Vietnamese', hi: 'Hindi', pa: 'Punjabi' };

const DOT_COLOR = { red: 'var(--status-error)', blue: 'var(--status-info)', grey: 'var(--neutral-200)' };

function OutreachCell({ outreach }) {
  if (!outreach) {
    return (
      <span className={styles.outreachNone}>
        <Icon name="solar:phone-calling-linear" size={16} color="var(--neutral-200)" />
        <span className={styles.mutedDash}>—</span>
      </span>
    );
  }
  const icon = outreach.kind === 'letter' ? 'solar:document-text-linear' : 'solar:phone-calling-linear';
  return (
    <span className={styles.outreachCell}>
      <Icon name={icon} size={16} color="var(--status-error)" />
      <span className={styles.outreachBody}>
        <span className={styles.outreachStatus}>{outreach.status}</span>
        <span className={styles.outreachDate}>{outreach.date}</span>
        {outreach.dots?.length ? (
          <span className={styles.dots}>
            {outreach.dots.map((c, i) => (
              <span key={i} className={styles.dot} style={{ background: DOT_COLOR[c] || DOT_COLOR.grey }} />
            ))}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function TagCell({ tags, tagsMore }) {
  if (!tags?.length) return <span className={styles.mutedDash}>—</span>;
  return (
    <span className={styles.tagCell}>
      {tags.map(t => (
        <span key={t.label} className={`${styles.tag} ${styles[`tag_${t.tone}`] || styles.tag_grey}`}>{t.label}</span>
      ))}
      {tagsMore > 0 ? <span className={styles.tagMore}>+{tagsMore} More</span> : null}
    </span>
  );
}

export function SnpWorklistRow({ member, isSelected, onSelect }) {
  const openQuickView = useAppStore(s => s.openQuickView);
  const navigateToPatient = useAppStore(s => s.navigateToPatient);
  const showToast = useAppStore(s => s.showToast);
  const m = member;

  const handleRowClick = () => {
    if (m.patientId) navigateToPatient(m.patientId);
    else showToast(`${m.name} — no linked patient record yet`);
  };
  const handleNameClick = (e) => {
    e.stopPropagation();
    openQuickView?.({ id: m.patientId || m.id, name: m.name, initials: m.initials, gender: m.gender, age: m.age, memberId: m.memberId, language: m.language });
  };

  return (
    <tr className={styles.row} onClick={handleRowClick}>
      <td className={`${styles.checkTd} ${styles.stickyLeft}`} style={{ left: 0 }} onClick={e => e.stopPropagation()}>
        <Checkbox checked={isSelected} onCheckedChange={() => onSelect(m.id)} aria-label={`Select ${m.name}`} />
      </td>

      <td className={`${styles.membersTd} ${styles.stickyLeft}`} style={{ left: 36 }}>
        <div className={styles.patientCell}>
          <Avatar variant="patient" initials={m.initials} />
          <div>
            <div className={styles.patientName}>
              <button className={styles.patientNameLink} onClick={handleNameClick}>{m.name}</button>
              <span className={styles.patientDemo}>({m.gender}•{m.age})</span>
            </div>
            <div className={styles.patientMeta}>
              {m.memberId} •{' '}
              <button type="button" className={styles.langBadge} onClick={e => e.stopPropagation()}>
                {(m.language || 'en').toUpperCase()}
                <span className={styles.langTooltip}>Preferred Language: {LANG_MAP[m.language] || 'English'}</span>
              </button>
            </div>
          </div>
        </div>
      </td>

      {/* Program Sub Status — editable dropdown affordance */}
      <td className={styles.td} onClick={e => e.stopPropagation()}>
        <button type="button" className={styles.statusDropdown}>
          {m.programSubStatus}
          <Icon name="solar:alt-arrow-down-linear" size={14} color="var(--neutral-300)" />
        </button>
      </td>

      {/* Care Plan Status — editable dropdown affordance */}
      <td className={styles.td} onClick={e => e.stopPropagation()}>
        <button type="button" className={styles.statusDropdown}>
          {m.carePlanStatus}
          <Icon name="solar:alt-arrow-down-linear" size={14} color="var(--neutral-300)" />
        </button>
      </td>

      <td className={styles.td}><span className={styles.dateText}>{m.nextActionDue || '—'}</span></td>

      <td className={styles.td}><OutreachCell outreach={m.outreach} /></td>

      <td className={styles.td} onClick={e => e.stopPropagation()}>
        {m.assigneeName ? (
          <span className={styles.assigneeCell}>
            <Icon name="solar:user-rounded-linear" size={15} color="var(--status-success)" />
            <button type="button" className={styles.assigneeName}>{m.assigneeName}</button>
          </span>
        ) : (
          <button type="button" className={styles.assignBtn}>
            <Icon name="solar:user-rounded-linear" size={15} color="var(--neutral-300)" />
            Assign
            <Icon name="solar:alt-arrow-down-linear" size={14} color="var(--neutral-300)" />
          </button>
        )}
      </td>

      <td className={styles.td}><span className={styles.dateText}>{m.triggerDate || '—'}</span></td>
      <td className={styles.td}><span className={styles.mutedDash}>{m.lastAdmission || '—'}</span></td>
      <td className={styles.td}><span className={styles.triggerText}>{m.trigger || '—'}</span></td>
      <td className={styles.td}><span className={styles.riskText}>{m.riskIq || 'Undetermined'}</span></td>
      <td className={styles.td}><TagCell tags={m.tags} tagsMore={m.tagsMore} /></td>

      <td className={styles.td}>
        {m.taskCount ? <button type="button" className={styles.taskLink} onClick={e => e.stopPropagation()}>{m.taskCount}</button> : <span className={styles.mutedDash}>—</span>}
      </td>

      <td className={`${styles.td} ${styles.stickyRight}`} onClick={e => e.stopPropagation()}>
        <div className={styles.actionsCell}>
          <ActionButton icon="solar:alt-arrow-right-linear" size="S" tooltip="Open" onClick={handleRowClick} />
        </div>
      </td>
    </tr>
  );
}
