import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { Avatar } from '../../../components/Avatar/Avatar';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Icon } from '../../../components/Icon/Icon';
import { PhoneVerifiedIcon } from '../../../components/Icon/PhoneVerifiedIcon';
import { ConsentPopover } from '../../../components/ConsentPopover/ConsentPopover';
import { ScheduleDrawer } from '../../../components/ScheduleDrawer/ScheduleDrawer';
import { MenuPopover } from '../../../components/MenuPopover/MenuPopover';
import { useAppStore } from '../../../store/useAppStore';
import { formatDobDisplay } from '../../../lib/patientDob';
import { FALLBACK_P360 } from '../data/p360Mock';
import styles from './PatientP360Banner.module.css';

/* ── Expanded sub-panels ── */
function ExpandedDemographics({ p, className }) {
  return (
    <div className={className ?? styles.expandCol}>
      <h4 className={styles.expandTitle}>Patient Demographic Details</h4>
      <div className={styles.expandRows}>
        <div className={styles.expandRow}><Icon name="solar:map-point-linear" size={14} color="var(--neutral-200)" /><span>{p.location || '—'}{p.location_count > 0 && <span className={styles.moreCount}> +{p.location_count}</span>}</span></div>
        <div className={styles.expandRow}><Icon name="solar:translation-2-linear" size={14} color="var(--neutral-200)" /><span>{(p.languages || []).join(' • ')}</span></div>
        <div className={styles.expandRow}><Icon name="solar:letter-linear" size={14} color="var(--neutral-200)" /><span>{(p.emails || []).join(' • ')}</span></div>
        <div className={styles.expandItem}><span className={styles.expandLabel}>Plan Numbers (Primary):</span><span>{(p.plan_numbers_primary || []).join(' • ')}</span></div>
        <div className={styles.expandItem}><span className={styles.expandLabel}>Secondary Numbers:</span><span>{(p.plan_numbers_secondary || []).join(' • ')}</span></div>
      </div>
    </div>
  );
}

function ExpandedHealthStatus({ p, className, movedMetrics = false }) {
  const v = p.recent_vitals || {};
  return (
    <div className={className ?? styles.expandCol}>
      <h4 className={styles.expandTitle}>Health Status</h4>
      <div className={styles.expandRows}>
        {/* Responsive: Programs + Last Contact relocate here from the banner
            row once it's too narrow to hold them. */}
        {movedMetrics && (
          <>
            <div className={styles.expandItem}>
              <span className={styles.expandLabel}>Programs:</span>
              <div className={styles.conditionBadges}>
                {(p.programs || []).map(pr => <span key={pr} className={styles.conditionBadge}>{pr}</span>)}
                <span className={styles.conditionBadgeGrey}>+2</span>
              </div>
            </div>
            <div className={styles.expandItem}>
              <span className={styles.expandLabel}>Last Contact:</span>
              <div className={styles.lastContactBtn}>
                <Icon name="solar:phone-calling-linear" size={16} color="var(--status-error)" />
                <span className={styles.lastContactText}>{p.last_contact_type}({p.last_contact_days}d)</span>
              </div>
            </div>
          </>
        )}
        <div className={styles.expandItem}>
          <span className={styles.expandLabel}>Chronic Condition:</span>
          <div className={styles.conditionBadges}>{(p.chronic_conditions || []).map(c => <span key={c} className={styles.conditionBadge}>{c}</span>)}</div>
        </div>
        <div className={styles.expandItem}>
          <span className={styles.expandLabel}>Recent Vitals ({v.date || '—'}):</span>
          <div className={styles.vitalsGrid}><span>BP: {v.bp || '—'}</span><span>Weight: {v.weight || '—'}</span><span>Pulse: {v.pulse || '—'}</span><span>HbA1c: {v.hba1c || '—'}</span></div>
        </div>
        <div className={styles.expandItem}>
          <span className={styles.expandLabel}>Opted out of (Communication):</span>
          <span>{(p.opted_out_comms || []).join(' • ')}</span>
        </div>
      </div>
    </div>
  );
}

function ExpandedAppointments({ p, className }) {
  return (
    <div className={className ?? styles.expandCol}>
      <h4 className={styles.expandTitle}>Upcoming Appointments</h4>
      <div className={styles.expandRows}>
        {(p.upcoming_appointments || []).map((a, i) => (
          <div key={i} className={styles.apptRow}>
            <Icon name={i === 0 ? 'solar:clipboard-text-linear' : 'solar:calendar-linear'} size={14} color="var(--primary-300)" />
            <div className={styles.apptInfo}><span className={styles.apptType}>{a.type}</span><span className={styles.apptMeta}>{a.date}{a.time ? `, ${a.time}` : ''} • {a.program} • & {a.provider}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpandedFamily({ p, className }) {
  return (
    <div className={className ?? styles.expandCol}>
      <h4 className={styles.expandTitle}>Family and Caregiver</h4>
      {p.family_caregiver_count > 0 && <div className={styles.familyNotice}><Icon name="solar:check-circle-linear" size={14} color="var(--status-success)" />Member is identified as family & caregiver for {p.family_caregiver_count} Members</div>}
      <div className={styles.expandRows}>
        {(p.family_members || []).map((m, i) => <div key={i} className={styles.personRow}><Avatar variant="assignee" initials={m.initials} /><div><span className={styles.personName}>{m.name}</span><span className={styles.personRole}>{m.relation}</span></div></div>)}
        {(p.family_members || []).length > 0 && <button className={styles.viewAllBtn}>View All &gt;</button>}
      </div>
      <div className={styles.careTeamSection}>
        <div className={styles.careTeamHeader}><span className={styles.expandLabel}>Care Team</span><Icon name="solar:pen-2-linear" size={12} color="var(--neutral-200)" /><div style={{ flex: 1 }} /><span className={styles.profileTypeLabel}>{p.care_team_profile_type} <Icon name="solar:alt-arrow-down-linear" size={10} color="var(--neutral-200)" /></span></div>
        {(p.care_team || []).map((m, i) => <div key={i} className={styles.personRow}><Avatar variant="assignee" initials={m.initials} /><div><span className={styles.personName}>{m.name} {m.role && <span className={styles.roleTag}>{m.role}</span>}</span><span className={styles.personRole}>{m.title}</span></div></div>)}
        {(p.care_team || []).length > 0 && <button className={styles.viewAllBtn}>View All &gt;</button>}
      </div>
    </div>
  );
}

/* Quick-view-style expanded panel — a metrics strip over a 2-column layout.
   Shared by the drawer variant AND the full banner's responsive expansion so
   both surface the same detail view. */
function QuickViewExpanded({ p }) {
  return (
    <div className={styles.drawerExpandedPanel}>
      <div className={styles.drawerMetricsStrip}>
        <div className={styles.drawerMetricItem}>
          <span className={styles.drawerMetricLabel}>Acuity</span>
          <span className={`${styles.badge} ${styles.badgeError}`}>{p.acuity}</span>
        </div>
        <span className={styles.drawerMetricDivider} />
        <div className={styles.drawerMetricItem}>
          <span className={styles.drawerMetricLabel}>RAF</span>
          <div className={styles.metricValueRow}>
            <span className={styles.rafValue}>{p.raf_score}</span>
            {p.raf_change > 0 && <span className={styles.rafChangeBadge}>+{p.raf_change} <Icon name="solar:arrow-up-linear" size={12} color="var(--status-error)" /></span>}
          </div>
        </div>
        <span className={styles.drawerMetricDivider} />
        <div className={styles.drawerMetricItem}>
          <span className={styles.drawerMetricLabel}>Next Appt.</span>
          <span className={styles.nextApptValue}>{p.next_appointment_date || '—'}</span>
        </div>
        <span className={styles.drawerMetricDivider} />
        <div className={styles.drawerMetricItem}>
          <span className={styles.drawerMetricLabel}>Last Contact</span>
          <div className={styles.lastContactBtn}>
            <Icon name="solar:phone-calling-linear" size={16} color="var(--status-error)" />
            <span className={styles.lastContactText}>{p.last_contact_type}({p.last_contact_days}d)</span>
          </div>
        </div>
        <span className={styles.drawerMetricDivider} />
        <div className={styles.drawerMetricItem}>
          <span className={styles.drawerMetricLabel}>Programs</span>
          <div className={styles.programBadges}>
            {(p.programs || []).map(pr => <span key={pr} className={`${styles.badge} ${styles.badgeInfo}`}>{pr}</span>)}
            <span className={`${styles.badge} ${styles.badgeGrey}`}>+2</span>
          </div>
        </div>
      </div>
      <div className={styles.drawerExpandedCols}>
        <div className={styles.drawerExpandedCol}>
          <ExpandedDemographics p={p} className={styles.drawerExpandedSection} />
          <ExpandedFamily p={p} className={styles.drawerExpandedSection} />
        </div>
        <span className={styles.drawerExpandedColDivider} />
        <div className={styles.drawerExpandedCol}>
          <ExpandedHealthStatus p={p} className={styles.drawerExpandedSection} />
          <ExpandedAppointments p={p} className={styles.drawerExpandedSection} />
        </div>
      </div>
    </div>
  );
}

const DRAWER_ACTIONS = [
  { icon: 'solar:arrow-right-up-linear', label: 'Elation' },
  { icon: 'solar:phone-linear', label: 'Call' },
  { icon: 'solar:calendar-add-linear', label: 'Schedule' },
  { icon: 'solar:chat-round-linear', label: 'Chat' },
  { icon: 'solar:notes-linear', label: 'Charts' },
];


/* ── Main Banner ── */
export function PatientP360Banner({ patient, variant = 'full' }) {
  const [expanded, setExpanded] = useState(false);
  const [tags, setTags] = useState([]);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState('central');
  // Drawer variant state
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const [consentPos, setConsentPos] = useState(null);
  const consentBadgeRef = useRef(null);
  const [drawerDropdownStyle, setDrawerDropdownStyle] = useState(null);
  const profileCardRef = useRef(null);

  const [showScheduleDrawer, setShowScheduleDrawer] = useState(false);
  const callBtnRef = useRef(null);
  const [moreMenuRect, setMoreMenuRect] = useState(null);
  const updatePatient = useAppStore(s => s.updatePatient);

  // Responsive behavior keys off a fixed 1200px banner-width breakpoint:
  //   wide (≥1200)  → Consent/Acuity/RAF/Next Appt stay inline in row 1; only
  //                   Programs + Last Contact move into the horizontal
  //                   (4-column) expansion.
  //   narrow (<1200) → every metric column moves into the quick-view
  //                    expansion; row 1 keeps just profile + actions and shows
  //                    Consent inline in the patient meta row (like Quick View).
  const bannerRef = useRef(null);
  const [bannerSize, setBannerSize] = useState('wide');

  const measureBanner = useCallback(() => {
    const el = bannerRef.current;
    if (!el) return;
    const w = el.getBoundingClientRect().width;
    setBannerSize(w < 1200 ? 'narrow' : 'wide');
  }, []);

  useLayoutEffect(() => {
    const el = bannerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => measureBanner());
    ro.observe(el);
    measureBanner();
    return () => ro.disconnect();
  }, [measureBanner]);

  const p360Profile = useAppStore(s => s.p360Profile);
  const fetchP360Profile = useAppStore(s => s.fetchP360Profile);
  const showToast = useAppStore(s => s.showToast);
  const openCallPopover = useAppStore(s => s.openCallPopover);

  useEffect(() => { if (patient?.id) fetchP360Profile(patient.id); }, [patient?.id]);

  const p = p360Profile || FALLBACK_P360;

  useEffect(() => { setTags(p.condition_tags || FALLBACK_P360.condition_tags); }, [p.condition_tags]);

  if (!patient) return null;

  /* ── Drawer variant ── */
  if (variant === 'drawer') {
    const noop = (label) => () => showToast(`${label} — coming soon`);
    const activeProfileName = (p.insurance_profiles || FALLBACK_P360.insurance_profiles).find(pr => pr.id === selectedProfileId)?.name || p.profile_type;

    const handleConsentClick = () => {
      if (consentPos) { setConsentPos(null); return; }
      const rect = consentBadgeRef.current?.getBoundingClientRect();
      if (!rect) return;
      const popW = 320;
      let left = rect.left;
      if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
      setConsentPos({ top: rect.bottom + 4, left });
    };

    const handleProfileClick = () => {
      if (showProfileDropdown) { setShowProfileDropdown(false); setDrawerDropdownStyle(null); return; }
      const rect = profileCardRef.current?.getBoundingClientRect();
      if (!rect) return;
      const popH = 480;
      const top = rect.bottom + 4 + popH > window.innerHeight
        ? Math.max(8, rect.top - popH - 4)
        : rect.bottom + 4;
      const left = Math.min(rect.left, window.innerWidth - 348);
      setDrawerDropdownStyle({ position: 'fixed', top, left, zIndex: 9999 });
      setShowProfileDropdown(true);
    };

    const drawerLayout = (
      <>
        {/* Row 1: Compact banner */}
        <div className={styles.drawerPatientBanner}>
          <div className={styles.drawerBannerLeft}>
            <div className={styles.drawerAvatar}>{patient.initials}</div>
            <div className={styles.drawerPatientInfo}>
              <div className={styles.drawerNameRow}>
                <span className={styles.drawerPatientName}>{patient.name}</span>
                <PhoneVerifiedIcon size={16} />
              </div>
              <div className={styles.drawerMetaRow}>
                <span className={styles.drawerMetaText}>{patient.gender} • {patient.age}</span>
                <span className={styles.drawerMetaDot}>•</span>
                <button ref={consentBadgeRef} className={styles.drawerConsentBadge} onClick={handleConsentClick}>
                  Consent: 2/4
                  <Icon name="solar:alt-arrow-down-linear" size={12} color="var(--status-warning)" />
                </button>
              </div>
            </div>
          </div>
          <span className={styles.drawerBannerDivider} />
          <div ref={profileCardRef} className={styles.drawerProfileCard} onClick={handleProfileClick} style={{ cursor: 'pointer' }}>
            <div className={styles.drawerProfileRow}>
              <Icon name="solar:hospital-linear" size={14} color="var(--neutral-300)" />
              <button className={styles.drawerProfileSelector} tabIndex={-1}>
                {activeProfileName}
                <Icon name="solar:alt-arrow-down-linear" size={14} color="var(--neutral-300)" />
              </button>
            </div>
            <div className={styles.drawerProfileIdRow}>
              <span className={styles.drawerProfileOrg}>{selectedProfileId === 'central' ? p.health_plan_name : activeProfileName}</span>
              <span className={styles.drawerProfileIdText}>(#{p.health_plan_id || patient.memberId})</span>
              <span className={styles.drawerPlusBadge}>+{(p.insurance_profiles || FALLBACK_P360.insurance_profiles).length - 1}</span>
            </div>
          </div>
        </div>

        {/* Row 2: Tags */}
        <div className={styles.drawerTagsRow}>
          <span className={styles.drawerTagBadge}>
            New Patient
            <Icon name="solar:alt-arrow-down-linear" size={12} color="var(--neutral-300)" />
          </span>
          <span className={styles.drawerTagDivider} />
          <span className={styles.drawerCondBadge}>Diabetes</span>
          <span className={styles.drawerCondBadge}>Hypertension</span>
          <span className={styles.drawerMoreBadge}>+2</span>
          <button className={styles.drawerAddTagBtn} aria-label="Add tag">
            <Icon name="solar:add-circle-linear" size={12} color="var(--neutral-300)" />
          </button>
          <button
            className={styles.drawerExpandIcon}
            onClick={() => setDrawerExpanded(v => !v)}
            aria-label={drawerExpanded ? 'Collapse details' : 'Expand details'}
            aria-expanded={drawerExpanded}
          >
            <span className={`${styles.drawerExpandIconInner} ${drawerExpanded ? styles.drawerExpandIconRotated : ''}`}>
              <Icon name="custom:expand-drawer" size={16} />
            </span>
          </button>
        </div>

        {/* Expanded panel: metrics strip + 2-col content */}
        {drawerExpanded && <QuickViewExpanded p={p} />}

        {/* Row 3: Actions */}
        <div className={styles.drawerActionsRow}>
          <div className={styles.drawerActionsList}>
            {DRAWER_ACTIONS.flatMap(({ icon, label }, i) => {
              const handleAction = () => {
                if (label === 'Schedule') { setShowScheduleDrawer(true); return; }
                if (label === 'Call') { openCallPopover(patient.id, callBtnRef); return; }
                noop(label)();
              };
              const isCall = label === 'Call';
              const cell = (
                <div key={label} className={styles.drawerActionCell}>
                  <button
                    ref={isCall ? callBtnRef : undefined}
                    className={styles.drawerActionBtn}
                    onClick={handleAction}
                  >
                    <Icon name={icon} size={16} color="var(--neutral-300)" />
                    <span className={styles.drawerActionLabel}>{label}</span>
                  </button>
                </div>
              );
              return i === 0 ? [cell] : [<span key={`d${i}`} className={styles.drawerActionDivider} />, cell];
            })}
            <span className={styles.drawerActionDivider} />
            <div className={styles.drawerActionCell}>
              <button className={styles.drawerActionBtn} onClick={noop('SMS')}>
                <div className={styles.drawerSmsWrap}>
                  <Icon name="solar:chat-line-linear" size={16} color="var(--neutral-300)" />
                  <span className={styles.drawerSmsBadge}>
                    <Icon name="solar:verified-check-bold" size={10} color="var(--status-success)" />
                  </span>
                </div>
                <span className={styles.drawerActionLabel}>SMS</span>
              </button>
            </div>
          </div>
          <span className={styles.drawerActionDivider} />
          <ActionButton
            icon="solar:menu-dots-linear"
            size="L"
            tooltip="More"
            onClick={(e) => setMoreMenuRect(e.currentTarget.getBoundingClientRect())}
          />
        </div>

        {moreMenuRect && (
          <MenuPopover
            anchorRect={moreMenuRect}
            width={220}
            align="right"
            items={[
              { key: 'assessment',   icon: 'solar:clipboard-check-linear', label: 'Assessment' },
              { key: 'education',    icon: 'solar:book-linear',            label: 'Education' },
              { key: 'add-task',     icon: 'solar:checklist-linear',       label: 'Add Task' },
              { key: 'referral',     icon: 'solar:arrow-right-up-linear',  label: 'Create Referral' },
              { key: 'automation',   icon: 'solar:bolt-linear',            label: 'Run Automation' },
              { key: 'relatives',    icon: 'solar:users-group-two-rounded-linear', label: 'Add Relatives' },
              { key: 'print',        icon: 'solar:printer-linear',         label: 'Print Clinical Profile' },
              { key: 'edit',         icon: 'solar:pen-linear',             label: 'Edit Details' },
              { key: 'reset-pw',     icon: 'solar:refresh-linear',         label: 'Reset Password' },
              { key: 'inactive',     icon: 'solar:user-cross-linear',      label: patient.status === 'inactive' ? 'Set Active' : 'Set Inactive' },
              { divider: true },
              { key: 'block',        icon: 'solar:forbidden-circle-linear', label: 'Block Number', danger: true },
            ]}
            onClose={() => setMoreMenuRect(null)}
            onSelect={(key) => {
              setMoreMenuRect(null);
              if (key === 'print') {
                showToast('Printing clinical profile…');
                window.print();
                return;
              }
              if (key === 'edit') {
                setDrawerExpanded(true);
                showToast('Expanded details for editing');
                return;
              }
              if (key === 'inactive') {
                const nextStatus = patient.status === 'inactive' ? 'active' : 'inactive';
                updatePatient(patient.id, { status: nextStatus });
                showToast(nextStatus === 'inactive'
                  ? `${patient.name} set to Inactive`
                  : `${patient.name} set to Active`);
                return;
              }
              if (key === 'block') {
                const existing = Array.isArray(p.opted_out_comms) ? p.opted_out_comms : [];
                const primary = patient.phone || p.plan_numbers_primary?.[0] || '';
                const label = primary ? `${primary} (Call, SMS)` : 'Primary phone (Call, SMS)';
                if (existing.some(e => e.includes(primary))) {
                  showToast('Number is already blocked');
                  return;
                }
                updatePatient(patient.id, { opted_out_comms: [...existing, label] });
                showToast(`Blocked ${primary || 'primary number'} for calls and SMS`);
                return;
              }
              const LABELS = {
                assessment: 'Assessment',
                education: 'Education',
                'add-task': 'Add Task',
                referral: 'Create Referral',
                automation: 'Run Automation',
                relatives: 'Add Relatives',
                'reset-pw': 'Reset Password',
              };
              noop(LABELS[key] || 'Action')();
            }}
          />
        )}

        {showScheduleDrawer && (
          <ScheduleDrawer
            initialPatientId={patient.id}
            onClose={() => setShowScheduleDrawer(false)}
          />
        )}
        {consentPos && (
          <ConsentPopover pos={consentPos} onClose={() => setConsentPos(null)} />
        )}
        {showProfileDropdown && drawerDropdownStyle && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => { setShowProfileDropdown(false); setDrawerDropdownStyle(null); }} />
            <div className={styles.profileDropdown} style={drawerDropdownStyle}>
              <div className={styles.profileDropdownTitle}>Member Insurance Profiles</div>
              {(p.insurance_profiles || FALLBACK_P360.insurance_profiles).map(prof => (
                <div
                  key={prof.id}
                  className={`${styles.profileOption} ${selectedProfileId === prof.id ? styles.profileOptionSelected : ''}`}
                  onClick={() => { setSelectedProfileId(prof.id); setShowProfileDropdown(false); setDrawerDropdownStyle(null); }}
                >
                  <div className={styles.profileOptionHeader}>
                    <div>
                      <div className={styles.profileOptionName}>{prof.name}</div>
                      <div className={styles.profileOptionSub}>{prof.subtitle}</div>
                    </div>
                    {selectedProfileId === prof.id
                      ? <Icon name="solar:check-circle-bold" size={20} color="var(--status-success)" />
                      : <span className={styles.profileOptionRadio} />}
                  </div>
                  {prof.enrolledOn && (
                    <div className={styles.profileOptionDetails}>
                      <div className={styles.profileOptionDetail}><span className={styles.profileOptionDetailLabel}>Enrolled On</span><span className={styles.profileOptionDetailValue}>{prof.enrolledOn}</span></div>
                      <div className={styles.profileOptionDetail}><span className={styles.profileOptionDetailLabel}>Insurance</span><span className={styles.profileOptionDetailValue}>{prof.insurance}</span></div>
                      <div className={styles.profileOptionDetail}><span className={styles.profileOptionDetailLabel}>HP Code</span><span className={styles.profileOptionDetailValue}>{prof.hpCode}</span></div>
                    </div>
                  )}
                  {prof.hpDesc && (
                    <div className={styles.profileOptionDesc}><span className={styles.profileOptionDetailLabel}>HP Description</span><span className={styles.profileOptionDetailValue}>{prof.hpDesc}</span></div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </>
    );
    // Real drawer usage returns the layout directly; the compact fallback of
    // the full banner keeps the measuring container so it can restore as it
    // widens back out.
    return variant === 'drawer'
      ? drawerLayout
      : <div className={styles.banner} ref={bannerRef}>{drawerLayout}</div>;
  }

  return (
    <div className={styles.banner} ref={bannerRef}>
      {/* ── ROW 1: Profile strip ── */}
      <div className={styles.row1}>
        {/* User info */}
        <div className={styles.userInfo}>
          <Avatar variant="patient" initials={patient.initials || '??'} />
          <div className={styles.nameBlock}>
            <div className={styles.nameRow}>
              <span className={styles.name}>{patient.name}</span>
              <Icon name="solar:pen-2-linear" size={16} color="var(--neutral-200)" />
            </div>
            <div className={styles.meta}>
              {patient.gender} • {formatDobDisplay(patient.dob) || '9/14/1968'} ({patient.age})
              {bannerSize !== 'wide' && (
                <>
                  <span className={styles.metaDot}>•</span>
                  <button type="button" className={styles.metaConsent}>
                    Consent: {p.consent_given}/{p.consent_total}
                    <Icon name="solar:alt-arrow-down-linear" size={12} color="var(--status-warning)" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <span className={styles.vDivider} />

        {/* Main info strip */}
        <div className={styles.mainInfo}>
          {/* Profile card with dropdown */}
          <div style={{ position: 'relative' }}>
            <div className={styles.profileCard} onClick={() => setShowProfileDropdown(v => !v)} style={{ cursor: 'pointer' }}>
              <div className={styles.profileCardTop}>
                <Icon name="solar:hospital-linear" size={14} color="var(--neutral-300)" />
                <span className={styles.profileLink}>{(p.insurance_profiles || FALLBACK_P360.insurance_profiles).find(pr => pr.id === selectedProfileId)?.name || p.profile_type} <Icon name="solar:alt-arrow-down-linear" size={12} color="var(--neutral-300)" /></span>
              </div>
              <div className={styles.profileCardBottom}>
                <strong>{selectedProfileId === 'central' ? p.health_plan_name : (p.insurance_profiles || FALLBACK_P360.insurance_profiles).find(pr => pr.id === selectedProfileId)?.name}</strong> <span>({p.health_plan_id})</span>
                <span className={`${styles.badge} ${styles.badgeGrey}`} style={{ height: 18, fontSize: 12, padding: '0 4px', marginLeft: 4 }}>+{((p.insurance_profiles || FALLBACK_P360.insurance_profiles).length - 1)}</span>
              </div>
            </div>
            {showProfileDropdown && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setShowProfileDropdown(false)} />
                <div className={styles.profileDropdown}>
                  <div className={styles.profileDropdownTitle}>Member Insurance Profiles</div>
                  {(p.insurance_profiles || FALLBACK_P360.insurance_profiles).map(prof => (
                    <div key={prof.id} className={`${styles.profileOption} ${selectedProfileId === prof.id ? styles.profileOptionSelected : ''}`} onClick={() => { setSelectedProfileId(prof.id); setShowProfileDropdown(false); }}>
                      <div className={styles.profileOptionHeader}>
                        <div>
                          <div className={styles.profileOptionName}>{prof.name}</div>
                          <div className={styles.profileOptionSub}>{prof.subtitle}</div>
                        </div>
                        {selectedProfileId === prof.id ? (
                          <Icon name="solar:check-circle-bold" size={20} color="var(--status-success)" />
                        ) : (
                          <span className={styles.profileOptionRadio} />
                        )}
                      </div>
                      {prof.enrolledOn && (
                        <div className={styles.profileOptionDetails}>
                          <div className={styles.profileOptionDetail}><span className={styles.profileOptionDetailLabel}>Enrolled On</span><span className={styles.profileOptionDetailValue}>{prof.enrolledOn}</span></div>
                          <div className={styles.profileOptionDetail}><span className={styles.profileOptionDetailLabel}>Insurance</span><span className={styles.profileOptionDetailValue}>{prof.insurance}</span></div>
                          <div className={styles.profileOptionDetail}><span className={styles.profileOptionDetailLabel}>HP Code</span><span className={styles.profileOptionDetailValue}>{prof.hpCode}</span></div>
                        </div>
                      )}
                      {prof.hpDesc && (
                        <div className={styles.profileOptionDesc}><span className={styles.profileOptionDetailLabel}>HP Description</span><span className={styles.profileOptionDetailValue}>{prof.hpDesc}</span></div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* At ≥1200 (wide) Consent/Acuity/RAF/Next Appt stay inline; Programs
              + Last Contact live only in the horizontal expansion. Under 1200
              (narrow) every column moves into the quick-view expansion and
              Consent shows inline in the meta row above. */}
          {bannerSize === 'wide' && (
          <div className={styles.metricCol}>
            <span className={styles.metricLabel}>Consent</span>
            <div className={styles.metricValueRow}>
              <span className={`${styles.badge} ${styles.badgeWarning}`}>{p.consent_given}/{p.consent_total} <Icon name="solar:alt-arrow-down-linear" size={10} color="var(--status-warning)" /></span>
            </div>
          </div>
          )}

          {bannerSize === 'wide' && (
          <div className={styles.metricCol}>
            <span className={styles.metricLabel}>Acuity</span>
            <div className={styles.metricValueRow}>
              <span className={`${styles.badge} ${styles.badgeError}`}>{p.acuity}</span>
            </div>
          </div>
          )}

          {bannerSize === 'wide' && (
          <div className={styles.metricCol}>
            <span className={styles.metricLabel}>RAF</span>
            <div className={styles.metricValueRow}>
              <span className={styles.rafValue}>{p.raf_score}</span>
              {p.raf_change > 0 && <span className={styles.rafChangeBadge}>+{p.raf_change} <Icon name="solar:arrow-up-linear" size={12} color="var(--status-error)" /></span>}
            </div>
          </div>
          )}

          {bannerSize === 'wide' && (
            <div className={styles.metricCol}>
              <span className={styles.metricLabel}>Next Appt.</span>
              <div className={styles.metricValueRow}><span className={styles.nextApptValue}>{p.next_appointment_date || '—'}</span></div>
            </div>
          )}

          {/* Expand arrow */}
          <button
            className={styles.expandArrow}
            onClick={() => setExpanded(v => !v)}
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
            aria-expanded={expanded}
          >
            <span className={`${styles.drawerExpandIconInner} ${expanded ? styles.drawerExpandIconRotated : ''}`}>
              <Icon name="custom:expand-drawer" size={16} />
            </span>
          </button>
        </div>

        {/* Actions: EHR | Call | Email | ... */}
        <div className={styles.actionsGroup}>
          <div className={styles.actionCol}><ActionButton icon="solar:square-top-down-linear" size="L" tooltip="EHR" /><span className={styles.actionLabel}>EHR</span></div>
          <span className={styles.hDivider} />
          <div className={styles.actionCol}><ActionButton icon="solar:phone-linear" size="L" tooltip="Call" /><span className={styles.actionLabel}>Call</span></div>
          <span className={styles.hDivider} />
          <div className={styles.actionCol}><ActionButton icon="solar:letter-linear" size="L" tooltip="Email" /><span className={styles.actionLabel}>Email</span></div>
          <span className={styles.hDivider} />
          <ActionButton icon="solar:menu-dots-bold" size="L" tooltip="More" />
        </div>
      </div>

      {/* ── ROW 2: Tags ── */}
      <div className={styles.row2}>
        <button className={styles.patientTypeBadge}>
          {p.patient_type} <Icon name="solar:alt-arrow-down-linear" size={12} color="var(--neutral-300)" />
        </button>
        <span className={styles.tagDivider} />
        {tags.map((tag, i) => (
          <span key={i} className={tag === 'Needs Transportation' ? styles.tagBlue : styles.tagCyan}>
            {tag}
            <button
              className={styles.tagClose}
              onClick={() => setTags(prev => prev.filter((_, j) => j !== i))}
              aria-label={`Remove ${tag} tag`}
            >
              <Icon name="solar:close-linear" size={12} color={tag === 'Needs Transportation' ? 'var(--status-info)' : 'var(--accent-cyan)'} />
            </button>
          </span>
        ))}
        <button className={styles.addTagBtn} aria-label="Add tag"><Icon name="solar:add-circle-linear" size={12} color="var(--neutral-300)" /></button>
      </div>

      {/* Expanded details. At wide (≥1200) the horizontal 4-column grid, with
          Programs + Last Contact moved into its Health Status column. Under
          1200 the expansion switches to the quick-view layout — a metrics strip
          over 2 columns — housing all the moved-out metrics. */}
      {expanded && (
        bannerSize === 'wide' ? (
          <div className={styles.expandedGrid}>
            <ExpandedDemographics p={p} />
            <ExpandedHealthStatus p={p} movedMetrics />
            <ExpandedAppointments p={p} />
            <ExpandedFamily p={p} />
          </div>
        ) : (
          <QuickViewExpanded p={p} />
        )
      )}
    </div>
  );
}
