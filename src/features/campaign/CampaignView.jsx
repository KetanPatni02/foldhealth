import { useState, useMemo } from 'react';
import { Icon } from '../../components/Icon/Icon';
import { Button } from '../../components/Button/Button';
import { Badge } from '../../components/Badge/Badge';
import { Switch } from '../../components/Switch/Switch';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { useAppStore } from '../../store/useAppStore';
import styles from './CampaignView.module.css';

const CAMPAIGNS = [
  {
    id: 1, section: 'running', status: 'running',
    channel: 'email', name: 'Resilient Recoveries',
    description: 'A support campaign focused on helping patients recover from injuries or surgeries with personalized care plans.',
    audience: 644, automations: true,
    health: 'Good', delivered: 32, opened: 18,
    startDate: '09/07/2024', duration: 15, progress: 40, enabled: true,
  },
  {
    id: 2, section: 'running', status: 'running',
    channel: 'email', name: 'Healthy Moms, Happy Babies',
    description: 'A maternal health initiative providing resources and support for expecting and new mothers.',
    audience: 80, automations: true,
    health: 'Moderate', delivered: 56, opened: 49,
    startDate: '09/23/2024', duration: 9, progress: 60, enabled: true,
  },
  {
    id: 3, section: 'paused', status: 'paused',
    channel: 'email', name: 'Fit for Life',
    description: 'A wellness program promoting fitness, balanced nutrition, and sustainable healthy lifestyle habits.',
    audience: 916, automations: false,
    health: 'Good', delivered: 57, opened: 43,
    startDate: '08/29/2024', duration: 1, progress: 60, enabled: false,
  },
  {
    id: 4, section: 'paused', status: 'paused',
    channel: 'email', name: 'Skin Care Savvy',
    description: 'Educational campaign raising awareness about skincare routines and dermatological health.',
    audience: 43, automations: false,
    health: 'Good', delivered: 64, opened: 59,
    startDate: '09/19/2024', duration: 1, progress: 70, enabled: false,
  },
  {
    id: 5, section: 'scheduled', status: 'scheduled',
    channel: 'email', name: 'Mind Over Matter',
    description: 'A mental wellness campaign offering mindfulness, stress management, and emotional resilience tools.',
    audience: 191, automations: false,
    health: null, delivered: null, opened: null,
    startDate: '09/01/2024', duration: 7, progress: 0, executesIn: 5, enabled: false,
  },
  {
    id: 6, section: 'scheduled', status: 'scheduled',
    channel: 'email', name: 'Resilient Recoveries',
    description: 'A pediatric health campaign encouraging healthy eating, physical activity, and overall child wellness.',
    audience: 830, automations: true,
    health: null, delivered: null, opened: null,
    startDate: '09/05/2024', duration: 11, progress: 0, executesIn: 5, enabled: false,
  },
  {
    id: 7, section: 'scheduled', status: 'scheduled',
    channel: 'sms', name: 'Healthy Habits for Kids',
    description: 'A support network campaign providing guidance and emotional support to cancer patients and families.',
    audience: 433, automations: false,
    health: null, delivered: null, opened: null,
    startDate: '09/11/2024', duration: 12, progress: 0, executesIn: 5, enabled: false,
  },
  {
    id: 8, section: 'scheduled', status: 'scheduled',
    channel: 'email', name: 'Cancer Companions',
    description: 'A long-term initiative focused on managing chronic illnesses with proactive care and patient education.',
    audience: 529, automations: false,
    health: null, delivered: null, opened: null,
    startDate: '09/16/2024', duration: 20, progress: 0, executesIn: 5, enabled: false,
  },
  {
    id: 9, section: 'scheduled', status: 'scheduled',
    channel: 'email', name: 'Chronic Care Campaign',
    description: 'A location-specific campaign targeting patient engagement and outreach for the Rosewood clinic region.',
    audience: 396, automations: false,
    health: null, delivered: null, opened: null,
    startDate: '09/26/2024', duration: 21, progress: 0, executesIn: 5, enabled: false,
  },
  {
    id: 10, section: 'scheduled', status: 'scheduled',
    channel: 'voice', name: 'Rome Office Patients',
    description: 'An annual seminar covering the latest advancements in health and wellness practices for community members.',
    audience: 7, automations: false,
    health: null, delivered: null, opened: null,
    startDate: '09/27/2024', duration: 7, progress: 0, executesIn: 5, enabled: false,
  },
  {
    id: 11, section: 'scheduled', status: 'scheduled',
    channel: 'email', name: 'Health & Wellness Seminar 2025',
    description: 'A support campaign focused on helping patients recover from injuries or surgeries with personalized care plans.',
    audience: 795, automations: false,
    health: null, delivered: null, opened: null,
    startDate: '08/28/2024', duration: 19, progress: 0, executesIn: 5, enabled: false,
  },
];

const DRAFTS = [
  {
    id: 20, section: 'draft', status: 'draft',
    channel: 'email', name: 'Q3 Diabetic Outreach',
    description: 'Reaching out to patients with HbA1c > 9 over the past 90 days with targeted education resources.',
    audience: 312, automations: false,
    health: null, delivered: null, opened: null,
    startDate: null, duration: null, progress: 0, enabled: false,
  },
  {
    id: 21, section: 'draft', status: 'draft',
    channel: 'sms', name: 'Fall Prevention Program',
    description: 'A preventive campaign for elderly patients focused on balance training and home safety modifications.',
    audience: 158, automations: false,
    health: null, delivered: null, opened: null,
    startDate: null, duration: null, progress: 0, enabled: false,
  },
];

const ENDED = [
  {
    id: 30, section: 'ended', status: 'ended',
    channel: 'email', name: 'Annual Flu Vaccine Drive',
    description: 'Annual influenza vaccination outreach targeting all eligible patients in the practice.',
    audience: 1402, automations: false,
    health: 'Good', delivered: 78, opened: 61,
    startDate: '10/01/2023', duration: 30, progress: 100, enabled: false,
  },
  {
    id: 31, section: 'ended', status: 'ended',
    channel: 'email', name: 'COVID-19 Booster Reminder',
    description: 'Reminder campaign for eligible patients to schedule their COVID-19 booster shots.',
    audience: 892, automations: false,
    health: 'Moderate', delivered: 54, opened: 38,
    startDate: '11/15/2023', duration: 14, progress: 100, enabled: false,
  },
];

const SECTIONS = {
  running: { label: 'Currently Running', icon: null, color: 'var(--status-success)' },
  paused:  { label: 'Paused',            icon: 'solar:pause-circle-linear', color: 'var(--neutral-300)' },
  scheduled: { label: 'Scheduled',       icon: 'solar:clock-circle-linear', color: 'var(--neutral-200)' },
  draft:   { label: 'Drafts',            icon: 'solar:document-linear', color: 'var(--neutral-300)' },
  ended:   { label: 'Ended',             icon: 'solar:check-circle-linear', color: 'var(--neutral-300)' },
};

const CHANNEL_ICONS = {
  email: 'solar:letter-linear',
  sms:   'solar:chat-round-line-linear',
  voice: 'solar:phone-linear',
};

const HEALTH_VARIANT = {
  Good:     'health-ok',
  Moderate: 'health-degraded',
  Poor:     'status-review',
};

function ProgressBar({ progress, status }) {
  const color = status === 'running' ? 'var(--status-success)' : status === 'paused' ? 'var(--neutral-200)' : 'var(--neutral-150)';
  return (
    <div className={styles.progressWrap}>
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${progress}%`, background: color }} />
      </div>
      <span className={styles.progressPct}>{progress}%</span>
    </div>
  );
}

function ExecutionLabel({ campaign }) {
  if (campaign.status === 'running') return <span className={styles.execRunning}>In Progress</span>;
  if (campaign.status === 'paused')  return <span className={styles.execPaused}>Paused</span>;
  if (campaign.status === 'scheduled') return <span className={styles.execScheduled}>Executes in {campaign.executesIn} Days</span>;
  if (campaign.status === 'ended')   return <span className={styles.execEnded}>Completed</span>;
  return null;
}

function StatusDot({ status }) {
  if (status === 'running') {
    return <span className={styles.dotRunning} />;
  }
  if (status === 'paused') {
    return <Icon name="solar:pause-circle-linear" size={14} color="var(--neutral-200)" />;
  }
  if (status === 'scheduled') {
    return <Icon name="solar:clock-circle-linear" size={14} color="var(--neutral-200)" />;
  }
  if (status === 'draft') {
    return <Icon name="solar:document-text-linear" size={14} color="var(--neutral-200)" />;
  }
  return <Icon name="solar:check-circle-linear" size={14} color="var(--neutral-200)" />;
}

function SectionHeader({ sectionKey, count }) {
  const s = SECTIONS[sectionKey];
  return (
    <tr className={styles.sectionRow}>
      <td colSpan={9} className={styles.sectionCell}>
        <div className={styles.sectionInner}>
          {sectionKey === 'running' ? (
            <span className={styles.sectionDot} style={{ background: s.color }} />
          ) : (
            <Icon name={s.icon} size={14} color={s.color} />
          )}
          <span className={styles.sectionLabel} style={{ color: s.color }}>{s.label}</span>
          <span className={styles.sectionCount}>{count}</span>
        </div>
      </td>
    </tr>
  );
}

function CampaignRow({ campaign, onToggle }) {
  const showToast = useAppStore(s => s.showToast);

  return (
    <tr className={styles.row}>
      {/* Status */}
      <td className={styles.tdStatus}>
        <StatusDot status={campaign.status} />
      </td>

      {/* Campaign Name */}
      <td className={styles.tdName}>
        <div className={styles.nameCell}>
          <div className={styles.nameLine}>
            <Icon name={CHANNEL_ICONS[campaign.channel] || 'solar:letter-linear'} size={16} color="var(--neutral-300)" />
            <span className={styles.nameText}>{campaign.name}</span>
          </div>
          <p className={styles.descText}>{campaign.description}</p>
        </div>
      </td>

      {/* Audience */}
      <td className={styles.tdAudience}>
        <div className={styles.audienceCell}>
          <Icon name="solar:users-group-two-rounded-linear" size={15} color="var(--neutral-200)" />
          <span className={styles.audienceCount}>{campaign.audience.toLocaleString()}</span>
          {campaign.automations && (
            <Icon name="solar:bolt-linear" size={14} color="var(--neutral-200)" />
          )}
        </div>
      </td>

      {/* Health */}
      <td className={styles.tdHealth}>
        {campaign.health ? (
          <Badge variant={HEALTH_VARIANT[campaign.health]} label={campaign.health} />
        ) : (
          <span className={styles.dash}>—</span>
        )}
      </td>

      {/* Performance */}
      <td className={styles.tdPerf}>
        {campaign.delivered != null ? (
          <div className={styles.perfCell}>
            <div className={styles.perfStat}>
              <span className={styles.perfNum}>{campaign.delivered}%</span>
              <span className={styles.perfLabel}>Delivered</span>
            </div>
            <div className={styles.perfDivider} />
            <div className={styles.perfStat}>
              <span className={styles.perfNum}>{campaign.opened}%</span>
              <span className={styles.perfLabel}>Opened</span>
            </div>
          </div>
        ) : (
          <div className={styles.perfCell}>
            <div className={styles.perfStat}>
              <span className={styles.dash}>—</span>
              <span className={styles.perfLabel}>Delivered</span>
            </div>
            <div className={styles.perfDivider} />
            <div className={styles.perfStat}>
              <span className={styles.dash}>—</span>
              <span className={styles.perfLabel}>Opened</span>
            </div>
          </div>
        )}
      </td>

      {/* Start Date */}
      <td className={styles.tdDate}>
        <span className={styles.dateText}>{campaign.startDate || '—'}</span>
      </td>

      {/* Duration */}
      <td className={styles.tdDuration}>
        <span className={styles.dateText}>{campaign.duration != null ? `${campaign.duration} Days` : '—'}</span>
      </td>

      {/* Execution Progress */}
      <td className={styles.tdProgress}>
        <div className={styles.progressCell}>
          <ExecutionLabel campaign={campaign} />
          {campaign.status !== 'draft' && (
            <ProgressBar progress={campaign.progress} status={campaign.status} />
          )}
        </div>
      </td>

      {/* Actions */}
      <td className={styles.tdAction}>
        <div className={styles.actionCell}>
          {campaign.status !== 'draft' && campaign.status !== 'ended' && (
            <>
              <Switch
                checked={campaign.enabled}
                onChange={() => onToggle(campaign.id)}
                ariaLabel="Enable campaign"
              />
              <div className={styles.actionDivider} />
            </>
          )}
          <ActionButton
            icon="solar:pen-linear"
            size="S"
            tooltip="Edit"
            onClick={() => showToast('Edit – coming soon')}
          />
          <ActionButton
            icon="solar:share-linear"
            size="S"
            tooltip="Share"
            onClick={() => showToast('Share – coming soon')}
          />
          <ActionButton
            icon="solar:menu-dots-linear"
            size="S"
            tooltip="More actions"
            onClick={() => showToast('More actions – coming soon')}
          />
        </div>
      </td>
    </tr>
  );
}

export function CampaignView() {
  const showToast = useAppStore(s => s.showToast);
  const [activeTab, setActiveTab] = useState('active');
  const [campaignData, setCampaignData] = useState(CAMPAIGNS);
  const [drafts] = useState(DRAFTS);
  const [ended] = useState(ENDED);

  const handleToggle = (id) => {
    setCampaignData(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  const tableData = useMemo(() => {
    if (activeTab === 'drafts') return drafts;
    if (activeTab === 'ended')  return ended;
    return campaignData;
  }, [activeTab, campaignData, drafts, ended]);

  const sections = useMemo(() => {
    if (activeTab === 'drafts') return [{ key: 'draft', rows: drafts }];
    if (activeTab === 'ended')  return [{ key: 'ended', rows: ended }];
    const running   = campaignData.filter(c => c.section === 'running');
    const paused    = campaignData.filter(c => c.section === 'paused');
    const scheduled = campaignData.filter(c => c.section === 'scheduled');
    return [
      ...(running.length   ? [{ key: 'running',   rows: running }]   : []),
      ...(paused.length    ? [{ key: 'paused',     rows: paused }]    : []),
      ...(scheduled.length ? [{ key: 'scheduled',  rows: scheduled }] : []),
    ];
  }, [activeTab, campaignData, drafts, ended]);

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Campaign</h1>
      </div>

      {/* Sub-nav: tabs + actions */}
      <div className={styles.subNav}>
        <div className={styles.tabs}>
          {[
            { key: 'active', label: 'Active' },
            { key: 'drafts', label: 'Drafts' },
            { key: 'ended',  label: 'Ended' },
          ].map(t => (
            <button
              key={t.key}
              className={[styles.tab, activeTab === t.key ? styles.tabActive : ''].join(' ')}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className={styles.subNavActions}>
          <ActionButton
            icon="solar:filter-linear"
            size="L"
            tooltip="Filter"
            onClick={() => showToast('Filter – coming soon')}
          />
          <Button
            variant="secondary"
            size="L"
            leadingIcon="solar:add-circle-linear"
            onClick={() => showToast('New Campaign – coming soon')}
          >
            New Campaign
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.headerRow}>
              <th className={styles.thStatus}>S</th>
              <th className={styles.thName}>Campaign Name</th>
              <th className={styles.thAudience}>Audience</th>
              <th className={styles.thHealth}>Health</th>
              <th className={styles.thPerf}>Performance</th>
              <th className={styles.thDate}>Start Date</th>
              <th className={styles.thDuration}>Duration</th>
              <th className={styles.thProgress}>Execution Progress</th>
              <th className={styles.thAction}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sections.map(({ key, rows }) => (
              <>
                <SectionHeader key={`sec-${key}`} sectionKey={key} count={rows.length} />
                {rows.map(campaign => (
                  <CampaignRow
                    key={campaign.id}
                    campaign={campaign}
                    onToggle={handleToggle}
                  />
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className={styles.footer}>
        <div className={styles.paginationRow}>
          <button className={styles.pageBtn} disabled>
            <Icon name="solar:alt-arrow-left-linear" size={16} color="var(--neutral-200)" />
          </button>
          <button className={[styles.pageBtn, styles.pageBtnActive].join(' ')}>1</button>
          <button className={styles.pageBtn}>2</button>
          <span className={styles.pageDots}>…</span>
          <button className={styles.pageBtn}>10</button>
          <button className={styles.pageBtn}>
            <Icon name="solar:alt-arrow-right-linear" size={16} color="var(--neutral-300)" />
          </button>
          <div className={styles.perPageWrap}>
            <span className={styles.perPageLabel}>10 / Page</span>
            <Icon name="solar:alt-arrow-down-linear" size={12} color="var(--neutral-300)" />
          </div>
          <span className={styles.goToLabel}>Go to Page</span>
        </div>
      </div>
    </div>
  );
}
