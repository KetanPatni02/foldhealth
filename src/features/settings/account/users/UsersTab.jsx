import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAppStore } from '../../../../store/useAppStore';
import { Icon } from '../../../../components/Icon/Icon';
import { Avatar } from '../../../../components/Avatar/Avatar';
import { Badge } from '../../../../components/Badge/Badge';
import { SectionTitleBar } from '../../../../components/SectionTitleBar/SectionTitleBar';
import { FilterBar } from '../../../../components/FilterBar/FilterBar';
import { WorklistShell } from '../../../../components/WorklistShell/WorklistShell';
import { useTableSort } from '../../../../components/SortableHeader/useTableSort';
import { FALLBACK_USERS } from '../../fallbackUsers';
import { ViewUserDrawer, EditUserDrawer, InviteUserDrawer, ROLE_COLORS, getInitials } from '../AccountPanel';
import { UserActions } from './UserActions';
import { OverflowBadge } from './OverflowBadge';
import panelStyles from '../AccountPanel.module.css';
import styles from './UserRow.module.css';

// Status → Solar linear badge icon. Kept in one place so the pill vocab
// (Active · Invited · anything else) stays consistent between the row and
// any future summary views.
function statusBadge(status) {
  const isActive = status === 'Active';
  const isInvited = status === 'Invited';
  return {
    variant: isActive ? 'status-completed' : (isInvited ? 'status-queued' : 'status-failed'),
    icon: isActive
      ? 'solar:check-circle-linear'
      : (isInvited ? 'solar:hourglass-linear' : 'solar:close-circle-linear'),
  };
}

// mm/dd/yyyy, or "—" for a null/invalid input. Kept in-file since it's
// only ever used to render the Created At / Last Sign-in At columns.
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}

// FilterBar chip defs — all three primary so they always render.
const USERS_FILTER_DEFS = [
  { key: 'status',   label: 'Status',            primary: true },
  { key: 'roles',    label: 'Roles',             primary: true },
  { key: 'location', label: 'Practice Location', primary: true },
];

const USERS_COLUMNS = [
  { key: 'name',       label: 'User Name',         sortKey: 'name',        sticky: 'left', left: 0,   width: 300 },
  { key: 'status',     label: 'Status',            sortKey: 'status',      width: 140 },
  { key: 'role',       label: 'Roles',             sortKey: 'role',        width: 220 },
  { key: 'location',   label: 'Practice Location', sortKey: 'location',    width: 240 },
  { key: 'createdAt',  label: 'Created At',        sortKey: 'createdAt',   width: 140 },
  { key: 'lastSignIn', label: 'Last Sign-in At',   sortKey: 'lastActiveAt', width: 160 },
  { key: 'actions',    label: 'Action',            sticky: 'right', width: 200 },
];

/**
 * Users tab of Settings → Account. Owns the profiles fetch, filter chips,
 * pagination, sort, and all three user drawers (View / Edit / Invite).
 *
 * Renders inside the shared WorklistShell so the users table reads
 * identically to every other worklist (sticky sort headers, hairline
 * dividers, consistent cell padding, sticky-right actions column).
 *
 * @param {object[]}  tabsForBar   The account tab list — passed by
 *                                 AccountPanel so this tab can render its
 *                                 own SectionTitleBar with the shared tabs.
 * @param {string}    activeTab    Currently-active tab name (always
 *                                 'Users' when this component is mounted;
 *                                 the SectionTitleBar just needs the value
 *                                 to render its selection state).
 * @param {function}  setActiveTab Called when the user picks a different
 *                                 tab in the SectionTitleBar.
 */
export function UsersTab({ tabsForBar, activeTab, setActiveTab }) {
  const showToast = useAppStore(s => s.showToast);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchVal, setSearchVal] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [showInvite, setShowInvite] = useState(false);

  const [filterOpen, setFilterOpen] = useState(false);
  const [userFilters, setUserFilters] = useState({ status: [], roles: [], location: [] });
  const userFiltersActive =
    userFilters.status.length + userFilters.roles.length + userFilters.location.length;

  const [currentUserId, setCurrentUserId] = useState(null);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);

  // Resolve current user + admin status once on mount. Used synchronously
  // by the actions column (hide buttons for non-admins) and by handlers
  // (guard actions).
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Local/dev bypass — no session means running without auth
        setIsCurrentUserAdmin(true);
        return;
      }
      setCurrentUserId(session.user.id);
      const { data } = await supabase
        .from('profiles')
        .select('role, clinical_roles, admin_role')
        .eq('id', session.user.id)
        .maybeSingle();
      if (!data) { setIsCurrentUserAdmin(false); return; }
      const isClinAdmin = data.role === 'Admin/Practice Manager'
        || data.clinical_roles?.includes('Admin/Practice Manager');
      const isSystemAdmin = data.admin_role === 'Business/Practice Owner';
      setIsCurrentUserAdmin(isClinAdmin || isSystemAdmin);
    })();
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data?.length > 0) {
        setUsers(data.map(u => ({
          id: u.id,
          name: u.full_name?.trim() || u.email?.split('@')[0] || 'Unknown',
          email: u.email || '',
          initials: getInitials(u.full_name?.trim() || u.email?.split('@')[0] || '').toUpperCase(),
          status: u.status || 'Active',
          role: u.clinical_roles?.length > 0 ? u.clinical_roles[0] : (u.role || 'Viewer'),
          clinicalRoles: u.clinical_roles || [],
          extraRoles: u.clinical_roles?.length > 1 ? u.clinical_roles.length - 1 : (u.extra_roles || 0),
          location: u.locations?.length > 0 ? u.locations[0] : (u.practice_location || ''),
          locations: u.locations || [],
          extraLocations: u.locations?.length > 1 ? u.locations.length - 1 : (u.extra_locations || 0),
          department: u.department || '',
          phone: u.phone || u.mobile || '',
          avatarUrl: u.avatar_url || '',
          lastActiveAt: u.last_active_at,
          createdAt: u.created_at,
          _raw: u,
        })));
      } else {
        setUsers(FALLBACK_USERS);
      }
    } catch {
      setUsers(FALLBACK_USERS);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleUserStatus = async (user) => {
    if (!isCurrentUserAdmin) {
      showToast('Only Admin/Practice Manager can change user status');
      return;
    }
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    const { data, error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', user.id)
      .select();

    if (!error && data && data.length > 0) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      showToast(`${user.name} ${newStatus === 'Active' ? 'enabled' : 'disabled'}`);
    } else {
      showToast(error?.message || 'Failed to update user status (Check permissions)');
    }
  };

  const deleteUser = async (user) => {
    if (!isCurrentUserAdmin) {
      showToast('Only Admin/Practice Manager can delete users');
      return;
    }
    if (!confirm(`Delete ${user.name}? This will permanently remove them from the platform.`)) return;

    const removeFromUI = () => setUsers(prev => prev.filter(u => u.id !== user.id));
    const fail = (msg) => { showToast(msg); fetchUsers(); };

    try {
      // Try Edge Function first (deletes from both auth + profiles)
      const { error: fnError } = await supabase.functions.invoke('delete-user', {
        body: { userId: user.id },
      });

      if (!fnError) {
        removeFromUI();
        showToast(`${user.name} deleted`);
        return;
      }

      // Fallback: delete from profiles — verify rows were actually removed.
      // `.select()` returns the deleted rows; empty array means RLS blocked it.
      const { data, error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id)
        .select();

      if (error || !data || data.length === 0) {
        fail(error?.message || 'Failed to delete user (Check permissions)');
        return;
      }

      removeFromUI();
      showToast(`${user.name} deleted`);
    } catch (err) {
      fail(err?.message || 'Failed to delete user');
    }
  };

  const resetPassword = async (user) => {
    if (!isCurrentUserAdmin) {
      showToast('Only Admin/Practice Manager can reset passwords');
      return;
    }
    if (!user.email) { showToast('No email address for this user'); return; }
    try {
      // Bare-origin redirect — Supabase appends its own `#access_token=…`
      // hash, and stacking our SPA route on top produces a double-hash URL
      // supabase-js can't parse. App.jsx catches `type=recovery` in the
      // fragment and routes to ResetPasswordPage.
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin,
      });
      if (error) showToast(`Error: ${error.message}`);
      else showToast(`Password reset email sent to ${user.email}`);
    } catch {
      showToast('Failed to send password reset email');
    }
  };

  // Role-controlling columns — only admins may change these on any profile.
  const ROLE_FIELDS = ['admin_role', 'role', 'clinical_roles'];

  const saveUserProfile = async (userId, updates) => {
    const isSelf = userId === currentUserId;

    if (!isCurrentUserAdmin) {
      if (!isSelf) {
        showToast('Only Admin/Practice Manager can edit other users');
        return;
      }
      const stripped = { ...updates };
      for (const f of ROLE_FIELDS) delete stripped[f];
      updates = stripped;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select();

    if (error || !data || data.length === 0) {
      showToast(`Error: ${error?.message || 'Permission denied'}`);
      return;
    }

    await fetchUsers();
    showToast('Profile updated');
    setEditingUser(null);
  };

  const filteredUsers = useMemo(() => {
    let list = users;
    if (userFilters.status.length) list = list.filter(u => userFilters.status.includes(u.status));
    if (userFilters.roles.length)  list = list.filter(u => userFilters.roles.includes(u.role));
    if (userFilters.location.length) list = list.filter(u => userFilters.location.includes(u.location));
    if (!searchVal.trim()) return list;
    const q = searchVal.toLowerCase();
    return list.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      u.location.toLowerCase().includes(q));
  }, [users, searchVal, userFilters]);

  const filterOptions = useMemo(() => {
    const roles = new Set();
    const locations = new Set();
    for (const u of users) {
      if (u.role) roles.add(u.role);
      if (u.location) locations.add(u.location);
    }
    return {
      status: ['Active', 'Invited', 'Inactive', 'Suspended'],
      roles: [...roles].sort(),
      location: [...locations].sort(),
    };
  }, [users]);

  const { sorted: sortedUsers, sortKey, sortDir, requestSort } = useTableSort(filteredUsers, 'name');

  const [userPage, setUserPage] = useState(1);
  const [userPerPage, setUserPerPage] = useState(10);
  useEffect(() => { setUserPage(1); }, [searchVal, userFilters, sortKey, sortDir]);

  const paginatedUsers = useMemo(
    () => sortedUsers.slice((userPage - 1) * userPerPage, userPage * userPerPage),
    [sortedUsers, userPage, userPerPage],
  );

  const renderRow = (user) => {
    const sb = statusBadge(user.status);
    return (
      <tr key={user.id} className={styles.row}>
        <td className={`${styles.membersTd} ${styles.stickyLeft}`} style={{ left: 0 }}>
          <div className={styles.userCell} onClick={() => setViewingUser(user)}>
            <Avatar variant="assignee" size="M" initials={user.initials} />
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userEmail}>{user.email}</span>
            </div>
          </div>
        </td>
        <td className={styles.td}>
          <Badge variant={sb.variant} icon={sb.icon} label={user.status} />
        </td>
        <td className={styles.td}>
          <div className={styles.rolesCell}>
            <Badge variant={ROLE_COLORS[user.role] || 'ai-neutral'} label={user.role} />
            {user.extraRoles > 0 && (
              <OverflowBadge count={user.extraRoles} items={user.clinicalRoles?.slice(1) || []} />
            )}
          </div>
        </td>
        <td className={styles.td}>
          <div className={styles.locationCell}>
            <span>{user.location}</span>
            {user.extraLocations > 0 && (
              <OverflowBadge count={user.extraLocations} items={user.locations?.slice(1) || []} />
            )}
          </div>
        </td>
        <td className={styles.td}>{formatDate(user.createdAt)}</td>
        <td className={styles.td}>{formatDate(user.lastActiveAt)}</td>
        <td className={`${styles.td} ${styles.stickyRight}`}>
          <UserActions
            user={user}
            isAdmin={isCurrentUserAdmin}
            onResetPassword={() => resetPassword(user)}
            onToggleStatus={() => toggleUserStatus(user)}
            onEdit={() => setEditingUser(user)}
            onDelete={() => deleteUser(user)}
          />
        </td>
      </tr>
    );
  };

  const header = (
    <SectionTitleBar
      tabs={tabsForBar}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      showSearch
      searchPlaceholder="Search users…"
      searchValue={searchVal}
      onSearchChange={setSearchVal}
      showFilter
      filterActive={filterOpen}
      filterBadgeCount={userFiltersActive}
      onFilter={() => setFilterOpen(v => !v)}
      primaryActionLabel="Invite User"
      onPrimaryAction={() => setShowInvite(true)}
    />
  );

  const filterNode = (
    <FilterBar
      multiSelect
      leading={null}
      filterDefs={USERS_FILTER_DEFS}
      filters={userFilters}
      onFilterChange={(k, vals) => setUserFilters(f => ({ ...f, [k]: vals }))}
      onClearAll={() => setUserFilters({ status: [], roles: [], location: [] })}
      getOptions={(def) => filterOptions[def.key] || []}
      showMoreFilters={false}
      showSaveFilter={false}
    />
  );

  return (
    <>
      <WorklistShell
        header={header}
        showFilters={filterOpen}
        filters={filterNode}
        columns={USERS_COLUMNS}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={requestSort}
        rows={paginatedUsers}
        renderRow={renderRow}
        loading={loading && paginatedUsers.length === 0}
        emptyState={
          <div className={panelStyles.emptyState}>
            <Icon name="solar:magnifer-linear" size={40} color="var(--neutral-150)" />
            <p className={panelStyles.emptyTitle}>No users found</p>
          </div>
        }
        page={userPage}
        perPage={userPerPage}
        totalItems={filteredUsers.length}
        onPageChange={setUserPage}
        onPageSizeChange={(pp) => { setUserPerPage(pp); setUserPage(1); }}
        minTableWidth={1400}
      />

      {viewingUser && (
        <ViewUserDrawer
          user={viewingUser}
          onClose={() => setViewingUser(null)}
          onEdit={() => { setEditingUser(viewingUser); setViewingUser(null); }}
        />
      )}
      {editingUser && (
        <EditUserDrawer
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={(updates) => saveUserProfile(editingUser.id, updates)}
        />
      )}
      {showInvite && (
        <InviteUserDrawer
          onClose={() => setShowInvite(false)}
          onInvited={() => { setShowInvite(false); fetchUsers(); }}
        />
      )}
    </>
  );
}
