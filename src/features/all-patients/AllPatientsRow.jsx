import { useState, useRef } from 'react';
import { Icon } from '../../components/Icon/Icon';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Avatar } from '../../components/Avatar/Avatar';
import { Badge } from '../../components/Badge/Badge';
import { Checkbox } from '../../components/ShadcnCheckbox/checkbox';
import { MenuPopover } from '../../components/Popover/MenuPopover';
import { buildPatientRowMenuItems } from '../../components/Popover/patientRowMenuItems';
import { useAppStore } from '../../store/useAppStore';
import rowStyles from '../toc-worklist/WorklistRow.module.css';
import styles from './AllPatientsRow.module.css';

const LANG_MAP = { en: 'English', es: 'Spanish', zh: 'Chinese', yue: 'Cantonese', ko: 'Korean', vi: 'Vietnamese', hi: 'Hindi', pa: 'Punjabi' };

function TagList({ tags, max = 2 }) {
  if (!tags?.length) return <span className={styles.dash}>—</span>;
  const shown = tags.slice(0, max);
  const overflow = tags.length - max;
  return (
    <div className={styles.tagList}>
      {shown.map((t, i) => (
        <Badge key={i} variant="ai-care" label={t} />
      ))}
      {overflow > 0 && <Badge variant="overflow" label={`+${overflow}`} />}
    </div>
  );
}

function ConditionList({ conditions, max = 2 }) {
  if (!conditions?.length) return <span className={styles.dash}>—</span>;
  const shown = conditions.slice(0, max);
  const overflow = conditions.length - max;
  return (
    <div className={styles.tagList}>
      {shown.map((c, i) => (
        <Badge key={i} variant="ai-risk" label={c} />
      ))}
      {overflow > 0 && <Badge variant="overflow" label={`+${overflow}`} />}
    </div>
  );
}

function AttributesCell({ row }) {
  const pairs = [
    row.groupNumber && ['Grp', row.groupNumber],
    row.planCode && ['Plan', row.planCode],
    row.coverageType && ['Cov', row.coverageType],
    row.tpa && ['TPA', row.tpa],
  ].filter(Boolean);

  if (!pairs.length) return <span className={styles.dash}>—</span>;

  return (
    <div className={styles.attrCell}>
      {pairs.slice(0, 2).map(([k, v]) => (
        <span key={k} className={styles.attrRow}>
          <span className={styles.attrKey}>{k}:</span>
          <span className={styles.attrVal}>{v}</span>
        </span>
      ))}
      {pairs.length > 2 && (
        <span className={styles.attrMore}>+{pairs.length - 2} more</span>
      )}
    </div>
  );
}

export function AllPatientsRow({ row, isSelected, onSelect }) {
  const showToast = useAppStore(s => s.showToast);
  const startHccUpload = useAppStore(s => s.startHccUpload);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropBtnRef = useRef(null);

  const handleDropdownToggle = (e) => {
    e.stopPropagation();
    setShowDropdown(v => !v);
  };

  const menuItems = buildPatientRowMenuItems([
    { key: 'Open Workflow', icon: 'solar:clipboard-list-linear', label: 'Open Workflow' },
  ]);

  const handleMenuSelect = (key) => {
    if (key === 'Upload File') {
      // Pre-seed the upload session with this patient so ambiguous OCR
      // matches auto-link to them in the review panel (AC-1 + AC-9 helper).
      startHccUpload(row?.id || null);
      return;
    }
    showToast(`${key} – coming soon`);
  };

  const handleRowClick = () => {
    showToast(`${row.name} — details coming soon`);
  };

  const location = row.city && row.state ? `${row.city}, ${row.state}` : (row.location || '—');
  const ccm = row.ccmConsent;
  const apcm = row.apcmConsent;

  return (
    <tr className={rowStyles.row} onClick={handleRowClick}>
      <td className={`${rowStyles.checkTd} ${rowStyles.stickyLeft}`} style={{ left: 0 }} onClick={e => e.stopPropagation()}>
        <Checkbox checked={isSelected} onCheckedChange={() => onSelect(row.id)} />
      </td>
      <td className={`${rowStyles.membersTd} ${rowStyles.stickyLeft}`} style={{ left: 36 }}>
        <div className={rowStyles.patientCell}>
          <Avatar variant="patient" initials={row.initials} />
          <div>
            <div className={rowStyles.patientName}>
              {row.name}
              {row.gender && row.age != null && (
                <span className={rowStyles.patientDemo}> ({row.gender}•{row.age})</span>
              )}
            </div>
            <div className={rowStyles.patientMeta}>
              {row.memberId} •{' '}
              <button
                type="button"
                className={rowStyles.langBadge}
                onClick={(e) => e.stopPropagation()}
              >
                {(row.language || 'en').toUpperCase()}
                <span className={rowStyles.langTooltip}>Preferred Language: {LANG_MAP[row.language] || 'English'}</span>
              </button>
            </div>
          </div>
        </div>
      </td>
      <td className={rowStyles.td}>
        <div className={styles.contactCell}>
          <span className={styles.contactLine}>
            <Icon name="solar:letter-linear" size={13} color="var(--neutral-300)" />
            {row.email || <span className={styles.dash}>—</span>}
          </span>
          <span className={styles.contactLine}>
            <Icon name="solar:phone-linear" size={13} color="var(--neutral-300)" />
            {row.phone || <span className={styles.dash}>—</span>}
          </span>
        </div>
      </td>
      <td className={rowStyles.td}>
        <span className={rowStyles.dateText}>{location}</span>
      </td>
      <td className={rowStyles.td}>
        <TagList tags={row.tags} />
      </td>
      <td className={rowStyles.td}>
        <AttributesCell row={row} />
      </td>
      <td className={rowStyles.td}>
        <ConditionList conditions={row.chronicConditions} />
      </td>
      <td className={rowStyles.td}>
        {row.pcp ? (
          <div className={rowStyles.assigneeCell}>
            <Avatar variant="provider" initials={row.pcpInitials || row.pcp.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()} />
            <span style={{ fontSize: 13 }}>{row.pcp}</span>
          </div>
        ) : (
          <span className={styles.dash}>—</span>
        )}
      </td>
      <td className={rowStyles.td}>
        <span className={rowStyles.dateText}>{row.lastVisit || '—'}</span>
      </td>
      <td className={rowStyles.td}>
        {row.activeCareProgram
          ? <Badge variant="toc-engaged" label={row.activeCareProgram} />
          : <span className={styles.dash}>—</span>}
      </td>
      <td className={rowStyles.td}>
        <Badge
          variant={ccm === true ? 'compliance-pass' : ccm === false ? 'compliance-fail' : 'compliance-na'}
          label={ccm === true ? 'Yes' : ccm === false ? 'No' : 'N/A'}
        />
      </td>
      <td className={rowStyles.td}>
        <Badge
          variant={apcm === true ? 'compliance-pass' : apcm === false ? 'compliance-fail' : 'compliance-na'}
          label={apcm === true ? 'Yes' : apcm === false ? 'No' : 'N/A'}
        />
      </td>
      <td className={`${rowStyles.td} ${rowStyles.stickyRight}`} onClick={e => e.stopPropagation()}>
        <div className={rowStyles.actionsCell}>
          <ActionButton
            icon="solar:letter-linear"
            size="L"
            tooltip="Email"
            onClick={() => showToast(`Email ${row.name} — coming soon`)}
          />
          <span className={rowStyles.actionDivider} />
          <ActionButton
            icon="solar:chat-dots-linear"
            size="L"
            tooltip="Chat"
            onClick={() => showToast(`Chat with ${row.name} — coming soon`)}
          />
          <span className={rowStyles.actionDivider} />
          <div style={{ position: 'relative' }}>
            <ActionButton
              ref={dropBtnRef}
              icon="solar:menu-dots-linear"
              size="L"
              tooltip="More options"
              onClick={handleDropdownToggle}
            />
            {showDropdown && (
              <MenuPopover
                anchorRef={dropBtnRef}
                items={menuItems}
                onSelect={handleMenuSelect}
                onClose={() => setShowDropdown(false)}
                width={220}
                ariaLabel="Row actions"
              />
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
