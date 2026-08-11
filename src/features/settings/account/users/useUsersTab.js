import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAppStore } from '../../../../store/useAppStore';
import { FALLBACK_USERS } from '../../fallbackUsers';
import { getInitials } from '../AccountPanel.constants';
import { ROLE_FIELDS } from './UsersTab.utils';

export function useUsersTab() {
  const showToast = useAppStore(s => s.showToast);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchVal, setSearchVal] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [userFilters, setUserFilters] = useState({ status: [], roles: [], location: [] });
  const currentUserIdRef = useRef(null);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsCurrentUserAdmin(true);
        return;
      }
      currentUserIdRef.current = session.user.id;
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
      const { error: fnError } = await supabase.functions.invoke('delete-user', {
        body: { userId: user.id },
      });

      if (!fnError) {
        removeFromUI();
        showToast(`${user.name} deleted`);
        return;
      }

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
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin,
      });
      if (error) showToast(`Error: ${error.message}`);
      else showToast(`Password reset email sent to ${user.email}`);
    } catch {
      showToast('Failed to send password reset email');
    }
  };

  const saveUserProfile = async (userId, updates) => {
    const isSelf = userId === currentUserIdRef.current;

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
    if (userFilters.status.length) {
      const statusSet = new Set(userFilters.status);
      list = list.filter(u => statusSet.has(u.status));
    }
    if (userFilters.roles.length) {
      const rolesSet = new Set(userFilters.roles);
      list = list.filter(u => rolesSet.has(u.role));
    }
    if (userFilters.location.length) {
      const locationSet = new Set(userFilters.location);
      list = list.filter(u => locationSet.has(u.location));
    }
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

  const userFiltersActive =
    userFilters.status.length + userFilters.roles.length + userFilters.location.length;

  return {
    users,
    loading,
    searchVal,
    setSearchVal,
    editingUser,
    setEditingUser,
    viewingUser,
    setViewingUser,
    showInvite,
    setShowInvite,
    filterOpen,
    setFilterOpen,
    userFilters,
    setUserFilters,
    userFiltersActive,
    isCurrentUserAdmin,
    fetchUsers,
    toggleUserStatus,
    deleteUser,
    resetPassword,
    saveUserProfile,
    filteredUsers,
    filterOptions,
  };
}
