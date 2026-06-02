/**
 * Hash-based router for the TOC Worklist prototype.
 * Bidirectional sync between URL hash and Zustand store.
 */

// ── Parse hash into structured route ──
export function parseHash() {
  // Strip any `?query` (e.g. hidden-field params like #/f/12?mrn=A123) before
  // splitting into path segments — the query is read separately by the view.
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  const segments = raw.split('/').filter(Boolean);
  return {
    page: segments[0] || 'population',
    section: segments[1] || null,
    tab: segments[2] || null,
    id: segments[3] || null,
    sub: segments[4] || null,
    extra: segments[5] || null,
  };
}

// ── Build hash from parts ──
export function buildHash(...parts) {
  const clean = parts.filter(p => p != null && p !== '');
  return '#/' + clean.join('/');
}

// ── Derive hash from store state ──
export function stateToHash(state) {
  const { activePage, activeTab, settingsNavItem, settingsTab, messageTab,
    goalDetailId, goalWizardOpen, goalWizardEditId,
    chatGroupDetailId, agentRulesGroupId, businessHoursOpen } = state;

  // Shareable form fill-view wins over everything — it's a focused takeover.
  if (state.formViewId) {
    return buildHash('f', String(state.formViewId));
  }
  if (activePage === 'builder') {
    const agentId = state.builderAgent?.id;
    return agentId ? buildHash('settings', 'agents', 'edit', String(agentId)) : buildHash('builder');
  }
  if (activePage === 'analytics') {
    const view = state.analyticsView || 'executive';
    return view === 'executive' ? buildHash('analytics') : buildHash('analytics', view);
  }
  if (activePage === 'calendar') return buildHash('calendar');
  if (state.editingCampaignId) {
    // Email builder opened from Settings → Content keeps the settings path so
    // the URL is sharable AND the close action falls back to #/settings/content/emails.
    if (state.activePage === 'settings' && state.settingsNavItem === 'content') {
      return buildHash('settings', 'content', 'emails', String(state.editingCampaignId));
    }
    return buildHash('email', String(state.editingCampaignId));
  }
  if (state.editingFormId) {
    // Form builder is always opened from Settings → Content → Forms; keep the
    // settings path so closing falls back to #/settings/content/forms. Each
    // builder tab gets its own path, and Analytics carries its sub-tab too:
    //   …/forms/{id}/{mode}            (edit|score|preview|analytics)
    //   …/forms/{id}/analytics/{tab}   (insight|report|responses)
    const mode = state.formBuilderMode || 'edit';
    const parts = ['settings', 'content', 'forms', String(state.editingFormId), mode];
    if (mode === 'analytics') parts.push(state.formAnalyticsTab || 'insight');
    return buildHash(...parts);
  }
  if (state.campaignBuilderId) {
    return buildHash('campaign', String(state.campaignBuilderId));
  }
  if (activePage === 'campaign') {
    const tab = state.campaignTab || 'active';
    return tab === 'active' ? buildHash('campaign') : buildHash('campaign', tab);
  }
  if (activePage === 'home') return buildHash('home');
  if (activePage === 'messages') return buildHash('messages');
  if (activePage === 'calls') return buildHash('calls');
  if (activePage === 'tasks') return buildHash('tasks');

  if (activePage === 'settings') {
    if (settingsNavItem === 'messages') {
      if (businessHoursOpen) return buildHash('settings', 'messages', 'business-hours');
      if (agentRulesGroupId) return buildHash('settings', 'messages', 'chat-settings', agentRulesGroupId, 'rules');
      if (chatGroupDetailId) return buildHash('settings', 'messages', 'chat-settings', chatGroupDetailId);
      return buildHash('settings', 'messages', messageTab || 'chat-settings');
    }
    if (settingsNavItem === 'embedded-components') {
      const ecTab = state.embeddedComponentsTab || 'domain-registry';
      return buildHash('settings', 'embedded-components', ecTab);
    }
    if (settingsNavItem === 'content') {
      const cTab = state.contentTab || 'emails';
      return buildHash('settings', 'content', cTab);
    }
    if (settingsNavItem === 'account') {
      const acTab = state.accountTab || 'users';
      return buildHash('settings', 'account', acTab);
    }
    if (settingsNavItem === 'billing') {
      return buildHash('settings', 'billing');
    }
    if (settingsNavItem === 'member/leads') {
      return buildHash('settings', 'member-leads');
    }
    // Agents section
    if (goalWizardOpen) return buildHash('settings', 'agents', 'goals', goalWizardEditId ? String(goalWizardEditId) : 'new');
    if (goalDetailId) return buildHash('settings', 'agents', 'goals', String(goalDetailId));
    if (settingsTab && settingsTab !== 'agents') return buildHash('settings', 'agents', settingsTab.replace(/ /g, '-'));
    return buildHash('settings', 'agents');
  }

  // Patient detail view
  if (state.selectedPatientId) {
    return buildHash('population', 'patient', state.selectedPatientId);
  }

  const LIST_TO_URL = {
    'Day Optimizer': 'day-optimizer',
    'Review HRA': 'review-hra',
    'IP Visits': 'ip-visits',
    'High Risk': 'high-risk',
    'High Cost': 'high-cost',
    'SNP': 'snp',
    'AWV': 'awv',
    'HCC': 'hcc',
    'HEDIS': 'hedis',
    'High Utilizers': 'high-utilizers',
    'DM': 'dm',
    'My Patients': 'my-patients',
    'All Patients': 'all-patients'
  };

  if (state.activeSubnavList && state.activeSubnavList !== 'TOC') {
    // HEDIS has its own top-level path
    if (state.activeSubnavList === 'HEDIS') {
      return buildHash('hedis');
    }
    const section = LIST_TO_URL[state.activeSubnavList];
    if (section) {
      return buildHash('population', section);
    }
  }

  return buildHash('population', activeTab || 'toc-worklist');
}

// ── Map parsed route → store state updates ──
export function hashToState(route) {
  // Always clear all drawer/overlay states on any navigation
  const updates = {
    goalDetailId: null, goalWizardOpen: false, goalWizardEditId: null,
    chatGroupDetailId: null, agentRulesGroupId: null, businessHoursOpen: false,
    formViewId: null,
  };

  // Shareable form fill-view: #/f/{id}
  if (route.page === 'f' && route.section) {
    const numId = isNaN(Number(route.section)) ? route.section : Number(route.section);
    updates.formViewId = numId;
    return updates;
  }
  if (route.page === 'builder') { updates.activePage = 'builder'; return updates; }
  if (route.page === 'analytics') {
    updates.activePage = 'analytics';
    updates.analyticsView = route.section || 'executive';
    return updates;
  }
  if (route.page === 'calendar') { updates.activePage = 'calendar'; return updates; }
  if (route.page === 'home') { updates.activePage = 'home'; return updates; }
  if (route.page === 'messages') { updates.activePage = 'messages'; return updates; }
  if (route.page === 'calls') { updates.activePage = 'calls'; return updates; }
  if (route.page === 'tasks') { updates.activePage = 'tasks'; return updates; }
  if (route.page === 'hedis') {
    updates.activePage = 'population';
    updates.activeSubnavList = 'HEDIS';
    updates.activeTab = 'toc-worklist';
    return updates;
  }
  if (route.page === 'email' && route.section) {
    updates.activePage = 'campaign';
    const numId = isNaN(Number(route.section)) ? route.section : Number(route.section);
    updates.editingCampaignId = numId;
    updates._pendingEmailEditId = route.section;
    return updates;
  }
  if (route.page === 'campaign') {
    updates.activePage = 'campaign';
    if (route.section === 'edit' && route.tab) {
      const numId = isNaN(Number(route.tab)) ? route.tab : Number(route.tab);
      updates.editingCampaignId = numId;
      updates._pendingEmailEditId = route.tab;
      return updates;
    }
    if (route.section && !['active', 'drafts', 'ended'].includes(route.section)) {
      const numId = isNaN(Number(route.section)) ? route.section : Number(route.section);
      updates.campaignBuilderId = numId;
      updates._pendingCampaignBuilderId = route.section;
      return updates;
    }
    const tab = route.section || 'active';
    updates.campaignTab = ['active', 'drafts', 'ended'].includes(tab) ? tab : 'active';
    return updates;
  }

  if (route.page === 'settings') {
    updates.activePage = 'settings';
    if (route.section === 'messages') {
      updates.settingsNavItem = 'messages';
      if (route.tab === 'business-hours') {
        updates.businessHoursOpen = true; updates.chatGroupDetailId = null; updates.agentRulesGroupId = null;
      } else if (route.tab === 'chat-settings' && route.id) {
        if (route.sub === 'rules') {
          updates.agentRulesGroupId = isNaN(route.id) ? route.id : Number(route.id);
          updates.chatGroupDetailId = null; updates.businessHoursOpen = false;
        } else {
          updates.chatGroupDetailId = route.id === 'new' ? 'new' : (isNaN(route.id) ? route.id : Number(route.id));
          updates.agentRulesGroupId = null; updates.businessHoursOpen = false;
        }
      } else {
        updates.messageTab = route.tab || 'chat-settings';
        updates.chatGroupDetailId = null; updates.agentRulesGroupId = null; updates.businessHoursOpen = false;
      }
      return updates;
    }
    // Embedded Components section
    if (route.section === 'embedded-components') {
      updates.settingsNavItem = 'embedded-components';
      updates.embeddedComponentsTab = route.tab || 'domain-registry';
      return updates;
    }
    // Content section
    if (route.section === 'content') {
      updates.settingsNavItem = 'content';
      updates.contentTab = route.tab || 'emails';
      // Per-email edit: #/settings/content/emails/{id} re-opens the email
      // builder on top of the listing page (AppLayout hydration uses
      // _pendingEmailEditId to call openEmailBuilder after the campaign loads).
      if (route.tab === 'emails' && route.id) {
        updates._pendingEmailEditId = route.id;
      }
      // Per-form edit: #/settings/content/forms/{id}/{mode}[/{analyticsTab}]
      // re-opens the form builder on top of the listing page (AppLayout
      // hydration uses _pendingFormEditId; openFormBuilder applies the mode).
      if (route.tab === 'forms' && route.id) {
        updates._pendingFormEditId = route.id;
        const mode = ['edit', 'logic', 'score', 'preview', 'analytics'].includes(route.sub) ? route.sub : 'edit';
        updates._pendingFormMode = mode;
        updates._pendingFormAnalyticsTab = mode === 'analytics' && ['insight', 'report', 'responses'].includes(route.extra)
          ? route.extra : 'insight';
      }
      return updates;
    }
    // Account / IAM section
    if (route.section === 'account') {
      updates.settingsNavItem = 'account';
      updates.accountTab = route.tab || 'users';
      return updates;
    }
    // APCM Billing section
    if (route.section === 'billing') {
      updates.settingsNavItem = 'billing';
      return updates;
    }
    // Member/Leads section (settings → automation → member/leads)
    if (route.section === 'member-leads') {
      updates.settingsNavItem = 'member/leads';
      return updates;
    }
    // Agent edit (builder) route: #/settings/agents/edit/{id}
    if (route.section === 'agents' && route.tab === 'edit' && route.id) {
      updates.activePage = 'builder';
      updates._pendingAgentId = route.id;
      return updates;
    }
    // Agents section
    updates.settingsNavItem = 'agents';
    if (route.section === 'agents' && route.tab === 'goals') {
      if (route.id === 'new') {
        updates.goalWizardOpen = true; updates.goalWizardEditId = null; updates.goalDetailId = null;
      } else if (route.id) {
        updates.goalDetailId = isNaN(Number(route.id)) ? route.id : Number(route.id);
        updates.goalWizardOpen = false;
      } else {
        updates.settingsTab = 'goals'; updates.goalDetailId = null; updates.goalWizardOpen = false;
      }
    } else if (route.section === 'agents' && route.tab) {
      updates.settingsTab = route.tab.replace(/-/g, ' ');
    } else {
      updates.settingsTab = 'agents';
    }
    return updates;
  }

  // Population — patient detail or worklist/queue/hcc
  updates.activePage = 'population';
  if (route.section === 'patient' && route.tab) {
    updates.selectedPatientId = route.tab;
    return updates;
  }
  updates.selectedPatientId = null;

  const URL_TO_LIST = {
    'day-optimizer': 'Day Optimizer',
    'review-hra': 'Review HRA',
    'ip-visits': 'IP Visits',
    'high-risk': 'High Risk',
    'high-cost': 'High Cost',
    'snp': 'SNP',
    'awv': 'AWV',
    'hcc': 'HCC',
    'hedis': 'HEDIS',
    'high-utilizers': 'High Utilizers',
    'dm': 'DM',
    'my-patients': 'My Patients',
    'all-patients': 'All Patients'
  };

  if (route.section && URL_TO_LIST[route.section]) {
    updates.activeSubnavList = URL_TO_LIST[route.section];
    updates.activeTab = 'toc-worklist'; // Default to worklist view within lists
    return updates;
  }

  // Default TOC routes: toc-worklist or toc-queue
  updates.activeSubnavList = 'TOC';
  updates.activeTab = route.section === 'toc-queue' ? 'toc-queue' : 'toc-worklist';
  return updates;
}

// ── Push current store state to hash (called from store setters) ──
let _syncing = false;

export function updateHash(getState) {
  if (_syncing) return;
  _syncing = true;
  try {
    const state = typeof getState === 'function' ? getState() : getState;
    const hash = stateToHash(state);
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
  } finally {
    _syncing = false;
  }
}

// ── Sync hash → store (on hashchange or initial load) ──
export function syncFromHash(setState, getState) {
  if (_syncing) return;
  _syncing = true;
  try {
    const route = parseHash();
    const updates = hashToState(route);
    if (Object.keys(updates).length > 0) {
      if (updates.activePage) sessionStorage.setItem('activePage', updates.activePage);
      if (updates.activeTab) sessionStorage.setItem('activeTab', updates.activeTab);
      if (updates.settingsTab) sessionStorage.setItem('settingsTab', updates.settingsTab);
      if (updates.settingsNavItem) sessionStorage.setItem('settingsNavItem', updates.settingsNavItem);
      setState(updates);
    }
  } finally {
    _syncing = false;
  }
}

// ── Initialize: hashchange listener + initial sync ──
export function initRouter(store) {
  // On initial load
  if (window.location.hash && window.location.hash !== '#/' && window.location.hash !== '#') {
    syncFromHash(store.setState.bind(store), store.getState.bind(store));
  } else {
    updateHash(store.getState.bind(store));
  }

  // Browser back/forward
  window.addEventListener('hashchange', () => {
    syncFromHash(store.setState.bind(store), store.getState.bind(store));
  });
}
