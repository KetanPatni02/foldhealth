import { lazy, Suspense, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { SubNav } from '../components/SubNav/SubNav';
import { TopBar } from '../components/TopBar/TopBar';
import { TabBar } from '../components/TabBar/TabBar';
import { FilterBar } from '../components/FilterBar/FilterBar';
import { Pagination } from '../components/Pagination/Pagination';
import { ActiveCallCard } from '../components/ActiveCallCard/ActiveCallCard';
import { InvokeAgentModal } from '../components/InvokeAgentModal/InvokeAgentModal';
import { DegradedBanner } from '../components/DegradedBanner/DegradedBanner';
import { WorklistTable } from '../features/toc-worklist/WorklistTable';
import { QueueTable } from '../features/toc-queue/QueueTable';
import { QueueSummaryBar } from '../features/toc-queue/QueueSummaryBar';
import { HccWorklistTable } from '../features/hcc/HccWorklistTable';
import { HedisWorklistTable } from '../features/hedis-worklist/HedisWorklistTable';
import { AllPatientsTable } from '../features/all-patients/AllPatientsTable';
import { SchedulingListTable } from '../features/scheduling-list/SchedulingListTable';
import { Icon } from '../components/Icon/Icon';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';
import styles from './AppLayout.module.css';

// Lazy-loaded features. These pull in heavy deps (recharts, @xyflow, @schedule-x,
// @usewaypoint/email-builder, react-grid-layout) and are not used on the default
// landing view, so they should not be in the entry chunk.
const lz = (importer, name) => lazy(() => importer().then(m => ({ default: m[name] })));

const PatientDetailView = lz(() => import('../features/patient/PatientDetailView'), 'PatientDetailView');
const CalendarPageView  = lz(() => import('../features/calendar/CalendarView'),     'CalendarView');
const HomeView          = lz(() => import('../features/home/HomeView'),             'HomeView');
const MessagesView      = lz(() => import('../features/messages/MessagesView'),     'MessagesView');
const CallsView         = lz(() => import('../features/calls/CallsView'),           'CallsView');
const TasksView         = lz(() => import('../features/tasks/TasksView'),           'TasksView');
const CampaignView      = lz(() => import('../features/campaign/CampaignView'),     'CampaignView');
const AnalyticsLayout   = lz(() => import('../features/analytics/AnalyticsLayout'), 'AnalyticsLayout');
const SettingsLayout    = lz(() => import('../features/settings/SettingsLayout'),   'SettingsLayout');
const AgentCanvas       = lz(() => import('../features/agent-builder/AgentCanvas'), 'AgentCanvas');
const EmailBuilder      = lz(() => import('../features/email-builder/EmailBuilder'), 'EmailBuilder');
const CampaignBuilder   = lz(() => import('../features/campaign/CampaignBuilder'),  'CampaignBuilder');
const FormBuilder       = lz(() => import('../features/forms/builder/FormBuilder'), 'FormBuilder');

// Drawers and overlays — only mounted when their state is truthy, so lazy here
// keeps them out of the entry chunk entirely.
const WorkflowPanel        = lz(() => import('../components/WorkflowPanel/WorkflowPanel'),                 'WorkflowPanel');
const CallPopover          = lz(() => import('../components/CallPopover/CallPopover'),                     'CallPopover');
const DetailDrawer         = lz(() => import('../components/DetailDrawer/DetailDrawer'),                   'DetailDrawer');
const LiveDrawer           = lz(() => import('../components/LiveDrawer/LiveDrawer'),                       'LiveDrawer');
const QuickViewDrawer      = lz(() => import('../components/QuickViewDrawer/QuickViewDrawer'),             'QuickViewDrawer');
const CreateAgentDrawer    = lz(() => import('../features/settings/CreateAgentDrawer'),                    'CreateAgentDrawer');
const GoalDetailDrawer     = lz(() => import('../features/settings/panels/GoalDetailDrawer'),              'GoalDetailDrawer');
const GoalWizardDrawer     = lz(() => import('../features/settings/panels/GoalWizardDrawer'),              'GoalWizardDrawer');
const GroupDetailDrawer    = lz(() => import('../features/settings/panels/GroupDetailDrawer'),             'GroupDetailDrawer');
const AgentRulesDrawer     = lz(() => import('../features/settings/panels/AgentRulesDrawer'),              'AgentRulesDrawer');
const BusinessHoursDrawer  = lz(() => import('../features/settings/panels/BusinessHoursDrawer'),           'BusinessHoursDrawer');
const ComponentWizardDrawer= lz(() => import('../features/settings/panels/ComponentWizardDrawer'),         'ComponentWizardDrawer');
const DiagPanel            = lz(() => import('../features/hcc/DiagPanel/DiagPanel'),                       'DiagPanel');
const UploadChartDrawer    = lz(() => import('../features/hcc/UploadChartDrawer'),                         'UploadChartDrawer');
const ClaimPreviewDrawer   = lz(() => import('../features/hcc/ClaimPreviewDrawer'),                        'ClaimPreviewDrawer');

// Placeholder while a lazy chunk is in flight. Empty div keeps layout stable.
const LazyFallback = () => <div style={{ flex: 1 }} />;

function ComingSoonState({ listName }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '64px 24px', gap: 12,
    }}>
      <Icon name="solar:hourglass-line-linear" size={44} color="var(--neutral-200)" />
      <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--neutral-400)', margin: 0 }}>
        {listName}
      </p>
      <p style={{ fontSize: 14, margin: 0, textAlign: 'center', maxWidth: 320, color: 'var(--neutral-300)' }}>
        This worklist is coming soon. Check back for updates.
      </p>
    </div>
  );
}

function Toast() {
  const toast = useAppStore(s => s.toast);
  const closeToast = useAppStore(s => s.closeToast);
  if (!toast) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--neutral-500)', color: 'var(--neutral-0)', padding: '12px 20px', borderRadius: 8,
      fontSize: 14, fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,.2)', zIndex: 10001,
      whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 12
    }}>
      {toast}
      <button onClick={closeToast} style={{
        background: 'none', border: 'none', color: 'var(--neutral-0)', cursor: 'pointer',
        fontSize: 16, padding: 0, display: 'flex', opacity: 0.8, lineHeight: 1,
      }}>✕</button>
    </div>
  );
}

function ToastSuccess() {
  const toastSuccess = useAppStore(s => s.toastSuccess);
  const closeToastSuccess = useAppStore(s => s.closeToastSuccess);
  if (!toastSuccess) return null;
  return (
    <div style={{
      position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--status-success)', color: '#fff', padding: '12px 20px', borderRadius: 8,
      fontSize: 14, fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,.2)', zIndex: 600,
      display: 'flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap'
    }}>
      TOC Agent Invoked Successfully
      <button onClick={closeToastSuccess} style={{
        background: 'none', border: 'none', color: '#fff', cursor: 'pointer',
        fontSize: 16, padding: 0, display: 'flex', opacity: 0.8, lineHeight: 1,
      }}>✕</button>
    </div>
  );
}

function PopulationView() {
  const subnavCollapsed = useAppStore(s => s.subnavCollapsed);
  const activeTab = useAppStore(s => s.activeTab);
  const showFilterBar = useAppStore(s => s.showFilterBar);
  const activeSubnavList = useAppStore(s => s.activeSubnavList);

  const selectedPatientId = useAppStore(s => s.selectedPatientId);

  // Patient detail view — full-page, no subnav
  if (selectedPatientId) {
    return (
      <div className={styles.main}>
        <TopBar />
        <div className={styles.content}>
          <Suspense fallback={<LazyFallback />}>
            <PatientDetailView />
          </Suspense>
        </div>
      </div>
    );
  }

  const isHcc = activeSubnavList === 'HCC';
  const isHedis = activeSubnavList === 'HEDIS';
  const isAllPatients = activeSubnavList === 'All Patients';
  const isSchedulingList = activeSubnavList === 'Scheduling List';
  const TOC_LISTS = ['TOC'];
  const isToc = TOC_LISTS.includes(activeSubnavList) || (!isHcc && !isHedis && !isAllPatients && !isSchedulingList && activeSubnavList !== 'My Patients' && !['Day Optimizer', 'Review HRA', 'IP Visits', 'High Risk', 'High Cost', 'SNP', 'AWV', 'High Utilizers', 'DM', 'My Patients'].includes(activeSubnavList));
  const isComingSoon = ['Day Optimizer', 'Review HRA', 'IP Visits', 'High Risk', 'High Cost', 'SNP', 'AWV', 'High Utilizers', 'DM', 'My Patients'].includes(activeSubnavList);

  return (
    <div className={styles.main}>
      <TopBar />
      <DegradedBanner />
      <div className={styles.bodyRow}>
        <SubNav collapsed={subnavCollapsed} />
        <div className={styles.content}>
          {!isHcc && !isHedis && !isComingSoon && !isSchedulingList && <TabBar />}
          {!isHcc && !isHedis && !isComingSoon && !isSchedulingList && showFilterBar && <FilterBar />}
          {!isHcc && !isHedis && !isAllPatients && !isComingSoon && !isSchedulingList && activeTab === 'toc-queue' && <QueueSummaryBar />}
          {isSchedulingList
            ? <SchedulingListTable />
            : isHcc
              ? <HccWorklistTable />
              : isHedis
                ? <HedisWorklistTable />
                : isAllPatients
                  ? <AllPatientsTable />
                  : isComingSoon
                    ? <ComingSoonState listName={activeSubnavList} />
                    : (activeTab === 'toc-worklist' ? <WorklistTable /> : <QueueTable />)}
          {!isHcc && !isHedis && !isComingSoon && !isSchedulingList && <Pagination />}
        </div>
      </div>
    </div>
  );
}

function SettingsView() {
  return (
    <div className={styles.main}>
      <TopBar />
      <div className={styles.content}>
        <Suspense fallback={<LazyFallback />}>
          <SettingsLayout />
        </Suspense>
      </div>
    </div>
  );
}

function AnalyticsView() {
  return (
    <div className={styles.main}>
      <TopBar />
      <div className={styles.content}>
        <Suspense fallback={<LazyFallback />}>
          <AnalyticsLayout />
        </Suspense>
      </div>
    </div>
  );
}

function CalendarViewPage() {
  return (
    <div className={styles.main}>
      <TopBar />
      <div className={styles.content}>
        <Suspense fallback={<LazyFallback />}>
          <CalendarPageView />
        </Suspense>
      </div>
    </div>
  );
}

export function AppLayout() {
  const activePage = useAppStore(s => s.activePage);
  const builderAgent = useAppStore(s => s.builderAgent);

  // Keep profiles in sync with auth.users. Self-signups and OAuth logins don't
  // go through the Invite flow, so profiles would otherwise stay empty for them.
  // First login inserts with safe defaults; later logins only refresh identity
  // fields so admin-set role/status aren't clobbered.
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data?.user;
      if (!user) return;
      const meta = user.user_metadata || {};
      const firstName = meta.first_name || null;
      const lastName  = meta.last_name  || null;
      const fullName  = meta.full_name  || [firstName, lastName].filter(Boolean).join(' ') || null;

      const identity = {
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        email: user.email,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase.from('profiles').update(identity).eq('id', user.id);
      } else {
        await supabase.from('profiles').insert({
          ...identity,
          status: 'Active',
          role: 'Viewer',
          clinical_roles: [],
          admin_role: 'Employer',
        });
      }
    });
  }, []);

  // Re-open agent builder on page refresh when URL has agent edit path
  useEffect(() => {
    const pendingId = useAppStore.getState()._pendingAgentId;
    if (pendingId && !builderAgent) {
      // Try to find the agent in the already-loaded agents list
      const agents = useAppStore.getState().agents || [];
      const agent = agents.find(a => String(a.id) === String(pendingId));
      if (agent) {
        useAppStore.getState().openBuilder(agent);
      } else {
        // Agent list may not be loaded yet — wait for it
        const unsub = useAppStore.subscribe((state) => {
          if (state.agents?.length && state._pendingAgentId) {
            const a = state.agents.find(ag => String(ag.id) === String(state._pendingAgentId));
            if (a) {
              useAppStore.getState().openBuilder(a);
              useAppStore.setState({ _pendingAgentId: null });
            }
            unsub();
          }
        });
        // Clear after 5s timeout to avoid lingering
        setTimeout(() => { unsub(); useAppStore.setState({ _pendingAgentId: null }); }, 5000);
      }
    }
  }, []);

  // Re-open campaign builder or email builder on page refresh
  useEffect(() => {
    const state = useAppStore.getState();
    const pendingEmail = state._pendingEmailEditId;
    const pendingCampaign = state._pendingCampaignBuilderId;
    if (!pendingEmail && !pendingCampaign) return;

    const targetId = pendingEmail || pendingCampaign;

    (async () => {
      // Try bulk fetch first, then fall back to single-row fetch
      await useAppStore.getState().fetchCampaigns();
      let c = (useAppStore.getState().campaigns || []).find(
        camp => String(camp.id) === String(targetId)
      );
      if (!c) {
        const numId = isNaN(Number(targetId)) ? targetId : Number(targetId);
        c = await useAppStore.getState().fetchCampaignById(numId);
      }
      if (!c) {
        useAppStore.setState({
          _pendingEmailEditId: null, _pendingCampaignBuilderId: null,
          editingCampaignId: null, campaignBuilderId: null,
        });
        return;
      }
      if (pendingEmail) {
        useAppStore.getState().openEmailBuilder(c);
      } else {
        useAppStore.getState().openCampaignBuilder(c);
      }
      useAppStore.setState({ _pendingEmailEditId: null, _pendingCampaignBuilderId: null });
    })();
  }, []);

  // Re-open the form builder on page refresh of #/settings/content/forms/{id}.
  useEffect(() => {
    const pendingForm = useAppStore.getState()._pendingFormEditId;
    if (!pendingForm) return;
    (async () => {
      const full = await useAppStore.getState().fetchFormById(
        isNaN(Number(pendingForm)) ? pendingForm : Number(pendingForm),
      );
      if (full) {
        await useAppStore.getState().openFormBuilder(full);
      } else {
        useAppStore.setState({ editingFormId: null, formBuilderForm: null });
      }
      useAppStore.setState({ _pendingFormEditId: null });
    })();
  }, []);

  const showCreateAgent = useAppStore(s => s.showCreateAgent);
  const workflowPatient = useAppStore(s => s.workflowPatient);
  const callPopoverPatient = useAppStore(s => s.callPopoverPatient);
  const detailPatient = useAppStore(s => s.detailPatient);
  const liveDrawerPatient = useAppStore(s => s.liveDrawerPatient);
  const goalDetailId = useAppStore(s => s.goalDetailId);
  const goalWizardOpen = useAppStore(s => s.goalWizardOpen);
  const chatGroupDetailId = useAppStore(s => s.chatGroupDetailId);
  const agentRulesGroupId = useAppStore(s => s.agentRulesGroupId);
  const businessHoursOpen = useAppStore(s => s.businessHoursOpen);
  const componentWizardOpen = useAppStore(s => s.componentWizardOpen);
  const diagPanelOpen = useAppStore(s => s.diagPanelOpen);
  const quickViewPatient = useAppStore(s => s.quickViewPatient);
  const editingCampaignId = useAppStore(s => s.editingCampaignId);
  const campaignBuilderId = useAppStore(s => s.campaignBuilderId);
  const editingFormId = useAppStore(s => s.editingFormId);

  // Email Builder is a full-screen takeover when editing a campaign. Wins over
  // the CampaignBuilder so "Edit Template" from inside the campaign builder
  // pushes the email builder on top — closing it falls back to the campaign
  // builder (campaignBuilderId stays set).
  if (editingCampaignId) {
    return (
      <div className={styles.app}>
        <Sidebar />
        <Suspense fallback={<LazyFallback />}>
          <EmailBuilder />
        </Suspense>
        <Toast />
      </div>
    );
  }

  // Campaign Builder is a full-screen takeover for creating/editing the
  // metadata, scheduling, audience, and channel of a campaign.
  if (campaignBuilderId) {
    return (
      <div className={styles.app}>
        <Sidebar />
        <Suspense fallback={<LazyFallback />}>
          <CampaignBuilder />
        </Suspense>
        <Toast />
      </div>
    );
  }

  // Form Builder is a focused full-screen takeover (no app sidebar — it has its
  // own header + close action that returns to #/settings/content/forms).
  if (editingFormId) {
    return (
      <div className={styles.app}>
        <Suspense fallback={<LazyFallback />}>
          <FormBuilder />
        </Suspense>
        <Toast />
      </div>
    );
  }

  // Agent Builder is a full-screen takeover
  if (activePage === 'builder') {
    return (
      <div className={styles.app}>
        <Sidebar />
        <Suspense fallback={<LazyFallback />}>
          <AgentCanvas />
        </Suspense>
        <Toast />
      </div>
    );
  }

  // Wraps the active page in a single Suspense boundary so chart/grid/canvas
  // chunks load without dropping the whole shell. PopulationView is eager
  // (default landing area) so its fallback is a no-op.
  const activeView = activePage === 'home' ? <HomeView />
    : activePage === 'messages' ? <MessagesView />
    : activePage === 'calls' ? <CallsView />
    : activePage === 'tasks' ? <TasksView />
    : activePage === 'analytics' ? <AnalyticsView />
    : activePage === 'settings' ? <SettingsView />
    : activePage === 'calendar' ? <CalendarViewPage />
    : activePage === 'campaign' ? <CampaignView />
    : <PopulationView />;

  return (
    <div className={styles.app}>
      <Sidebar />
      <Suspense fallback={<LazyFallback />}>
        {activeView}
      </Suspense>

      <Suspense fallback={null}>
        {showCreateAgent && <CreateAgentDrawer />}
        {workflowPatient && <WorkflowPanel />}
        {callPopoverPatient && <CallPopover />}
        <ActiveCallCard />
        <InvokeAgentModal />
        {detailPatient && <DetailDrawer />}
        {liveDrawerPatient && <LiveDrawer />}
        {goalDetailId && <GoalDetailDrawer />}
        {goalWizardOpen && <GoalWizardDrawer />}
        {componentWizardOpen && <ComponentWizardDrawer />}
        {chatGroupDetailId && <GroupDetailDrawer />}
        {agentRulesGroupId && <AgentRulesDrawer />}
        {businessHoursOpen && <BusinessHoursDrawer />}
        {diagPanelOpen && <DiagPanel />}
        <UploadChartDrawer />{/* mounts itself only when hccUploadMember is set */}
        <ClaimPreviewDrawer />{/* mounts itself only when hccClaimPreview.open is true */}
        {quickViewPatient && <QuickViewDrawer />}
      </Suspense>
      <Toast />
      <ToastSuccess />
    </div>
  );
}
