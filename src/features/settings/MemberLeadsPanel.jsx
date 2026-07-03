import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/Icon/Icon';
import { Button } from '../../components/Button/Button';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { SearchIconButton } from '../../components/SearchIconButton/SearchIconButton';
import { Avatar } from '../../components/Avatar/Avatar';
import { Badge } from '../../components/Badge/Badge';
import { DestructiveDialog } from '../../components/Modal/DestructiveDialog';
import { useAppStore } from '../../store/useAppStore';
import { ConfigureTeamDrawer } from './ConfigureTeamDrawer';
import { KIND_LABEL, KIND_BADGE_VARIANT } from './teamTypeConfig';
import { HoverCard } from './HoverCard';
import hoverStyles from './HoverCard.module.css';
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

// Create-New menu options — clicking any opens ConfigureTeamDrawer with the
// matching `kind` so the Team Type / Assign-To dimensions adapt.
const CREATE_NEW_OPTIONS = [
  { kind: 'care-program', label: 'Care Program Team' },
  { kind: 'hedis',        label: 'HEDIS Team' },
  { kind: 'hcc',          label: 'HCC Team' },
];

export function MemberLeadsPanel() {
  // Active tab is store-backed so deep links like
  // #/settings/member-leads/care-team survive reloads.
  const activeTab = useAppStore(s => s.memberLeadsTab);
  const setActiveTab = useAppStore(s => s.setMemberLeadsTab);
  const fetchHccCareTeams = useAppStore(s => s.fetchHccCareTeams);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const createBtnRef = useRef(null);
  // drawer state: null when closed; otherwise { kind, editTeam? }
  const [drawer, setDrawer] = useState(null);

  // Load saved teams from Supabase on mount (falls back to seeds if empty).
  useEffect(() => {
    fetchHccCareTeams();
  }, [fetchHccCareTeams]);

  // Close the Create-New popover on outside click.
  useEffect(() => {
    if (!createOpen) return;
    const onDoc = (e) => {
      if (!createBtnRef.current?.contains(e.target)) setCreateOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [createOpen]);

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
          <div className={styles.createWrap} ref={createBtnRef}>
            <Button
              variant="secondary"
              size="L"
              leadingIcon="solar:add-circle-linear"
              onClick={() => setCreateOpen(o => !o)}
            >
              Create New
            </Button>
            {createOpen && (
              <div className={styles.createMenu}>
                <div className={styles.createMenuTitle}>Create New</div>
                {CREATE_NEW_OPTIONS.map(opt => (
                  <button
                    key={opt.kind}
                    type="button"
                    className={styles.createMenuItem}
                    onClick={() => { setCreateOpen(false); setDrawer({ kind: opt.kind }); }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'care-team' ? (
        <div className={agentStyles.tableWrap}>
          <CareTeamTable
            searchVal={searchVal}
            onEdit={(team) => setDrawer({ kind: team.kind, editTeam: team })}
          />
        </div>
      ) : (
        <div className={styles.empty}>
          <Icon name="solar:gallery-edit-linear" size={32} color="var(--neutral-200)" />
          <p>{TABS.find(t => t.key === activeTab)?.label} — coming soon</p>
        </div>
      )}

      {drawer && (
        <ConfigureTeamDrawer
          kind={drawer.kind}
          editTeam={drawer.editTeam || null}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}

// Promote a store-shape team to the row shape the existing table expects
// (precomputed users, capacity totals, etc.) so the renderer below stays
// agnostic of where the data came from.
function teamToRow(t) {
  const sumCap = (t.members || []).reduce((s, m) => s + (Number(m.capacityPct) || 0), 0);
  const sumAssigned = (t.members || []).reduce((s, m) =>
    s + (m.assignTo || []).reduce((a, r) => a + (Number(r.pct) || 0), 0), 0);
  const assignedTone = sumAssigned >= 90 ? 'success' : sumAssigned <= 30 ? 'error' : 'warning';
  const createdFor = KIND_LABEL[t.kind] || t.kind || '';
  return {
    id: t.id,
    kind: t.kind,
    name: t.name,
    teamType: t.teamType,
    createdAt: t.createdAt,
    createdBy: t.createdBy,
    createdFor,
    users: (t.members || []).map(m => ({
      initials: m.initials,
      name: m.name,
      roles: m.roles,
      capacityPct: m.capacityPct,
    })),
    capacity: sumCap,
    assigned: sumAssigned,
    assignedTone,
    lastModifiedAt: t.lastModifiedAt,
    lastModifiedBy: t.lastModifiedBy,
    _editable: true,
    _raw: t,
  };
}

function CareTeamTable({ searchVal = '', onEdit }) {
  const showToast = useAppStore(s => s.showToast);
  const deleteHccCareTeam = useAppStore(s => s.deleteHccCareTeam);
  const addHccCareTeam = useAppStore(s => s.addHccCareTeam);
  const liveTeams = useAppStore(s => s.hccCareTeams);

  // Per-row "more" menu: open state holds {teamId, top, left}; null when closed.
  const [menu, setMenu] = useState(null);
  // Destructive confirm dialog. Holds the team being deleted; null when closed.
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Outside-click + Escape close the row menu.
  useEffect(() => {
    if (!menu) return;
    const onDoc = (e) => {
      if (!e.target.closest?.(`.${styles.rowMenu}`)) setMenu(null);
    };
    const onKey = (e) => { if (e.key === 'Escape') setMenu(null); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  // Deep-clone a team's members so the duplicate doesn't share Assign-To
  // row objects with the source. Returns a brand-new team ready for the
  // store. Keeps members, allocatedTins, teamType, kind, createdFor — just
  // mints a new id/timestamp and appends "(Copy)" to the name.
  const duplicateTeam = (src) => {
    const now = (() => {
      const d = new Date();
      const pad = n => String(n).padStart(2, '0');
      return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
    })();
    addHccCareTeam({
      ...src,
      id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: `${src.name} (Copy)`,
      members: (src.members || []).map(m => ({
        ...m,
        assignTo: (m.assignTo || []).map(r => ({ ...r })),
      })),
      allocatedTins: [...(src.allocatedTins || [])],
      createdAt: now,
      createdBy: 'You',
      lastModifiedAt: now,
      lastModifiedBy: 'You',
    });
    showToast(`Duplicated "${src.name}"`);
  };

  // All teams (including seeded mock data) live in the store, so every row
  // is editable by anyone in the system. No static fallback path.
  const allRows = liveTeams.map(teamToRow);
  const q = searchVal.trim().toLowerCase();
  const rows = q
    ? allRows.filter(t =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.teamType || '').toLowerCase().includes(q) ||
        (t.createdFor || '').toLowerCase().includes(q),
      )
    : allRows;

  return (
    <>
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
          const badge = CREATED_FOR_BADGE[t.createdFor]
            || (t.kind && { variant: KIND_BADGE_VARIANT[t.kind], label: KIND_LABEL[t.kind] })
            || { variant: 'toc-new', label: t.createdFor };
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
                <HoverCard
                  placement="top"
                  content={
                    <>
                      <div className={hoverStyles.cardTitle}>
                        Team Users <strong>({t.name})</strong>
                      </div>
                      {t.users.length === 0 ? (
                        <div className={hoverStyles.userRowRole}>No members yet.</div>
                      ) : t.users.map((u, i) => (
                        // Neutral grey chip — this badge shows capacity USED
                        // on this team, not remaining capacity, so the tone
                        // scale (red/yellow/green) was misleading. Keep it
                        // informational only.
                        <div key={i} className={hoverStyles.userRow}>
                          <Avatar variant="assignee" initials={u.initials} />
                          <div className={hoverStyles.userRowText}>
                            <span className={hoverStyles.userRowName}>{u.name}</span>
                            {u.roles && <span className={hoverStyles.userRowRole}>{u.roles}</span>}
                          </div>
                          <span className={[hoverStyles.capChip, hoverStyles.capNeutral].join(' ')}>
                            Capacity: {u.capacityPct || 0}%
                          </span>
                        </div>
                      ))}
                    </>
                  }
                >
                  <div className={styles.usersCell}>
                    <div className={styles.avatarStack}>
                      {t.users.slice(0, 3).map((u, i) => (
                        <Avatar
                          key={i}
                          variant="assignee"
                          initials={u.initials}
                          className={styles.avatarStackItem}
                        />
                      ))}
                    </div>
                    {t.users.length > 3 && (
                      <span className={styles.userCount}>+{t.users.length - 3}</span>
                    )}
                  </div>
                </HoverCard>
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
                  <ActionButton
                    icon="solar:pen-linear"
                    size="L"
                    tooltip="Edit"
                    onClick={() => onEdit?.(t._raw)}
                  />
                  <span className={agentStyles.actionDivider} />
                  <ActionButton
                    icon="solar:copy-linear"
                    size="L"
                    tooltip="Duplicate"
                    onClick={() => duplicateTeam(t._raw)}
                  />
                  <span className={agentStyles.actionDivider} />
                  <ActionButton
                    icon="solar:menu-dots-bold"
                    size="L"
                    tooltip="More"
                    onClick={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      setMenu({ teamId: t.id, teamName: t.name, top: r.bottom + 4, left: r.right - 160 });
                    }}
                  />
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
    {menu && createPortal(
        <div
          className={styles.rowMenu}
          style={{ top: menu.top, left: menu.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className={[styles.rowMenuItem, styles.rowMenuItemDanger].join(' ')}
            onClick={() => {
              const team = liveTeams.find(t => t.id === menu.teamId);
              setConfirmDelete(team || { id: menu.teamId, name: menu.teamName });
              setMenu(null);
            }}
          >
            <Icon name="solar:trash-bin-trash-linear" size={14} color="var(--status-error)" />
            Delete
          </button>
        </div>,
        document.body,
      )}
      {confirmDelete && (
        <DestructiveDialog
          title={`Delete "${confirmDelete.name}"?`}
          description="This action will permanently delete this team and its assignment rules from the system."
          confirmLabel="Delete Team"
          onConfirm={() => {
            deleteHccCareTeam(confirmDelete.id);
            showToast(`Deleted "${confirmDelete.name}"`);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
}
