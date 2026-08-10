import { Avatar } from '../../../../components/Avatar/Avatar';
import { Icon } from '../../../../components/Icon/Icon';
import styles from './PatientP360Banner.module.css';

export function ExpandedDemographics({ p, className }) {
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

export function ExpandedHealthStatus({ p, className, movedMetrics = false }) {
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

export function ExpandedAppointments({ p, className }) {
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

export function ExpandedFamily({ p, className }) {
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
export function QuickViewExpanded({ p }) {
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