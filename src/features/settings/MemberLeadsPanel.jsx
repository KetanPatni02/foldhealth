import { useState } from 'react';
import { Icon } from '../../components/Icon/Icon';
import { Button } from '../../components/Button/Button';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { SearchIconButton } from '../../components/SearchIconButton/SearchIconButton';
import { Avatar } from '../../components/Avatar/Avatar';
import { Badge } from '../../components/Badge/Badge';
import { useAppStore } from '../../store/useAppStore';
// Reuse the AgentsTable shell (wrapper / tabBar / tabs / table / etc.) so the
// Member/Leads Care Team view picks up the same Fold table primitives the
// rest of Settings uses — only the per-cell visuals are unique here.
import agentStyles from './AgentsTable.module.css';
import styles from './MemberLeadsPanel.module.css';

const TABS = [
  { key: 'tags',           label: 'Tags' },
  { key: 'custom-type',    label: 'Custom Contact Type' },
  { key: 'custom-fields',  label: 'Custom Contact Fields' },
  { key: 'code-groups',    label: 'Code Groups' },
  { key: 'worklist',       label: 'Worklist' },
  { key: 'care-team',      label: 'Care Team' },
];

const CARE_TEAMS = [
  { id: 'rt1', name: 'Reviewer 1 Team', createdAt: '02/21/2026', createdBy: 'Dina Morries', createdFor: 'HCC',          teamType: 'Reviewer 1', users: [{ initials: 'LJ' }],                                  userCount: 20, capacity: 80,  assigned: 50,  assignedTone: 'warning', lastModifiedAt: '08/30/2024', lastModifiedBy: 'Richard Willson' },
  { id: 'rt2', name: 'Coder Team',      createdAt: '02/21/2026', createdBy: 'Dina Morries', createdFor: 'HCC',          teamType: 'Coder',      users: [{ initials: 'SM' }, { initials: 'JL' }],              userCount: 3,  capacity: 100, assigned: 90,  assignedTone: 'success', lastModifiedAt: '08/30/2024', lastModifiedBy: 'Richard Willson' },
  { id: 'rt3', name: 'SNP Team',        createdAt: '02/21/2026', createdBy: 'Dina Morries', createdFor: 'Care Program', teamType: 'SNP',        users: [{ initials: 'NP' }, { initials: 'AR' }],              userCount: 2,  capacity: 120, assigned: 30,  assignedTone: 'error',   lastModifiedAt: '08/30/2024', lastModifiedBy: 'Richard Willson' },
  { id: 'rt4', name: 'TOC Team',        createdAt: '02/21/2026', createdBy: 'Dina Morries', createdFor: 'Care Program', teamType: 'TOC',        users: [{ initials: 'ET' }],                                  userCount: 1,  capacity: 150, assigned: 80,  assignedTone: 'success', lastModifiedAt: '08/30/2024', lastModifiedBy: 'Richard Willson' },
  { id: 'rt5', name: 'Care Gap Team',   createdAt: '02/21/2026', createdBy: 'Dina Morries', createdFor: 'HEDIS',        teamType: 'Assignee',   users: [{ initials: 'AW' }, { initials: 'BC' }, { initials: 'DE' }], userCount: 20, capacity: 60,  assigned: 60,  assignedTone: 'warning', lastModifiedAt: '08/30/2024', lastModifiedBy: 'Richard Willson' },
];

const CREATED_FOR_BADGE = {
  HCC:            { variant: 'toc-oncall',       label: 'HCC' },
  'Care Program': { variant: 'status-scheduled', label: 'Care Program' },
  HEDIS:          { variant: 'status-review',    label: 'HEDIS' },
};

const ASSIGNED_BAR_COLOR = {
  success: 'var(--status-success)',
  warning: 'var(--status-warning)',
  error:   'var(--status-error)',
};

export function MemberLeadsPanel() {
  const [activeTab, setActiveTab] = useState('care-team');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const showToast = useAppStore(s => s.showToast);

  return (
    <div className={agentStyles.wrapper}>
      {/* Top tab strip + actions — mirrors the AgentsTable header. */}
      <div className={agentStyles.tabBar}>
        <div className={agentStyles.tabs}>
          {TABS.map(tab => (
            <div
              key={tab.key}
              className={[agentStyles.tab, activeTab === tab.key ? agentStyles.tabActive : ''].filter(Boolean).join(' ')}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </div>
          ))}
        </div>
        <div className={agentStyles.tabActions}>
          <div className={agentStyles.searchWrap}>
            {searchOpen ? (
              <div className={agentStyles.searchInput}>
                <Icon name="solar:magnifer-linear" size={15} color="var(--neutral-300)" />
                <input autoFocus type="text" placeholder="Search teams…" value={searchVal} onChange={e => setSearchVal(e.target.value)} />
                <button className={agentStyles.searchClose} onClick={() => { setSearchOpen(false); setSearchVal(''); }}>✕</button>
              </div>
            ) : (
              <SearchIconButton title="Search" onClick={() => setSearchOpen(true)} />
            )}
          </div>
          <span className={agentStyles.tabDivider} />
          <Button
            variant="secondary"
            size="L"
            leadingIcon="solar:add-circle-linear"
            onClick={() => showToast('Create New — coming soon')}
          >
            Create New
          </Button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'care-team' ? (
        <div className={agentStyles.tableWrap}>
          <CareTeamTable searchVal={searchVal} />
        </div>
      ) : (
        <div className={styles.empty}>
          <Icon name="solar:gallery-edit-linear" size={32} color="var(--neutral-200)" />
          <p>{TABS.find(t => t.key === activeTab)?.label} — coming soon</p>
        </div>
      )}
    </div>
  );
}

function CareTeamTable({ searchVal = '' }) {
  const showToast = useAppStore(s => s.showToast);
  const q = searchVal.trim().toLowerCase();
  const rows = q
    ? CARE_TEAMS.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.teamType.toLowerCase().includes(q) ||
        t.createdFor.toLowerCase().includes(q),
      )
    : CARE_TEAMS;

  return (
    <table className={agentStyles.table}>
      <thead>
        <tr>
          <th className={[agentStyles.stickyLeft, agentStyles.colName].filter(Boolean).join(' ')}>Team Name</th>
          <th>Created For</th>
          <th>Team Type</th>
          <th>Team Users</th>
          <th>Total Capacity</th>
          <th>Total Assigned</th>
          <th>Last Modified</th>
          <th className={[agentStyles.stickyRight, agentStyles.colActions].filter(Boolean).join(' ')}>Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(t => {
          const badge = CREATED_FOR_BADGE[t.createdFor] || { variant: 'toc-new', label: t.createdFor };
          return (
            <tr key={t.id}>
              <td className={[agentStyles.stickyLeft, agentStyles.colName].filter(Boolean).join(' ')}>
                <div className={styles.nameCell}>
                  <div className={styles.nameTitle}>{t.name}</div>
                  <div className={styles.nameMeta}>Created on {t.createdAt} by {t.createdBy}</div>
                </div>
              </td>
              <td><Badge variant={badge.variant} label={badge.label} /></td>
              <td>{t.teamType}</td>
              <td>
                <div className={styles.usersCell}>
                  <div className={styles.avatarStack}>
                    {t.users.slice(0, 3).map((u, i) => (
                      <Avatar
                        key={i}
                        variant="generic"
                        size={20}
                        initials={u.initials}
                        backgroundColor="var(--primary-50)"
                        borderColor="var(--primary-200)"
                        color="var(--primary-300)"
                        className={styles.avatarStackItem}
                      />
                    ))}
                  </div>
                  <span className={styles.userCount}>+{t.userCount}</span>
                </div>
              </td>
              <td>{t.capacity}%</td>
              <td>
                <div className={styles.assignedCell}>
                  <div className={styles.assignedTrack}>
                    <div
                      className={styles.assignedBar}
                      style={{
                        width: `${Math.min(t.assigned, 100)}%`,
                        background: ASSIGNED_BAR_COLOR[t.assignedTone] || 'var(--neutral-300)',
                      }}
                    />
                  </div>
                  <span className={styles.assignedPct}>{t.assigned}%</span>
                </div>
              </td>
              <td>
                <div className={styles.nameCell}>
                  <div className={styles.nameTitle}>{t.lastModifiedAt}</div>
                  <div className={styles.nameMeta}>by {t.lastModifiedBy}</div>
                </div>
              </td>
              <td className={[agentStyles.stickyRight, agentStyles.colActions].filter(Boolean).join(' ')}>
                <div className={agentStyles.actions}>
                  <ActionButton icon="solar:pen-linear"       size="L" tooltip="Edit"      onClick={() => showToast('Edit team — coming soon')} />
                  <span className={agentStyles.actionDivider} />
                  <ActionButton icon="solar:copy-linear"      size="L" tooltip="Duplicate" onClick={() => showToast('Duplicate team — coming soon')} />
                  <span className={agentStyles.actionDivider} />
                  <ActionButton icon="solar:menu-dots-bold"   size="L" tooltip="More"      onClick={() => showToast('More actions — coming soon')} />
                </div>
              </td>
            </tr>
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={8}>
              <div className={styles.empty}>
                <Icon name="solar:magnifer-linear" size={32} color="var(--neutral-150)" />
                <p>No teams match "{searchVal}"</p>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
