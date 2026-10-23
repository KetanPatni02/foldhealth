// Overview cards backed by the patient's p360_profiles row: risk, contact
// and reachability, care team, caregivers, consent, medications, diagnoses.
import { lazy, Suspense, useEffect, useState } from 'react';
import { DashboardCard, DashboardCardBody, DashboardCardSkeleton } from '../../../../../../components/DashboardCard/DashboardCard';
import { PanelSectionItem } from '../../../../../../components/PanelSection/PanelSection';
import { CappedRows } from './CappedRows';
import { MedChangesSection } from './MedChangesSection';
import { Badge } from '../../../../../../components/Badge/Badge';
import { Avatar } from '../../../../../../components/Avatar/Avatar';
import { Icon } from '../../../../../../components/Icon/Icon';
import { useAppStore } from '../../../../../../store/useAppStore';
import { findWorklistMember, icdFromText } from './overviewItemActions';
import { useP360Profile } from './useP360Profile';
import styles from './overviewCards.module.css';

const AddMedicationsDrawer = lazy(() => import('../../../../left-panel/tabs/pami-hx/AddMedicationsDrawer/AddMedicationsDrawer').then(m => ({ default: m.AddMedicationsDrawer })));
const AddProblemsDrawer = lazy(() => import('../../../../left-panel/tabs/pami-hx/AddProblemsDrawer/AddProblemsDrawer').then(m => ({ default: m.AddProblemsDrawer })));

const list = v => (Array.isArray(v) ? v.filter(Boolean) : []);

// Shared frame: skeleton while the profile loads, one empty line without one.
function ProfileCard({ patientId, icon, title, count, bodyClassName, children }) {
  const profile = useP360Profile(patientId);
  if (profile === undefined) return <DashboardCardSkeleton icon={icon} title={title} rows={2} />;
  return (
    <DashboardCard icon={icon} title={title} count={profile ? count?.(profile) : null}>
      <DashboardCardBody className={bodyClassName}>
        {profile ? children(profile) : <p className={styles.empty}>No profile data for this patient yet.</p>}
      </DashboardCardBody>
    </DashboardCard>
  );
}

function acuityTone(acuity) {
  if (/high/i.test(acuity || '')) return 'error';
  if (/rising|medium/i.test(acuity || '')) return 'warning';
  if (/low/i.test(acuity || '')) return 'success';
  return 'grey';
}

export function RiskAcuityCard({ patientId }) {
  return (
    <ProfileCard patientId={patientId} icon="solar:graph-up-linear" title="Risk & Acuity">
      {(p) => {
        const change = Number(p.raf_change) || 0;
        return (
          <div className={`${styles.stats} ${styles.statsTwo}`}>
            <div className={styles.stat}>
              <span className={styles.muted}>RAF score</span>
              <span className={styles.statValue}>
                <span className={styles.statNumber}>{p.raf_score ?? '–'}</span>
                {change !== 0 && (
                  <span className={`${styles.muted} ${change > 0 ? styles.textError : styles.textSuccess}`}>
                    {change > 0 ? '▲' : '▼'} {Math.abs(change)} since last
                  </span>
                )}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.muted}>Acuity</span>
              <span className={styles.statValue}>
                {p.acuity ? <Badge tone={acuityTone(p.acuity)} size="S" label={p.acuity} /> : <span className={styles.muted}>Not set</span>}
              </span>
            </div>
          </div>
        );
      }}
    </ProfileCard>
  );
}

function lastContactLabel(type, days) {
  if (!type) return null;
  const label = type === 'UTR' ? 'Unable to reach' : type === 'Attended' ? 'Attended visit' : type;
  if (days == null) return label;
  const when = Number(days) === 0 ? 'today' : `${days} day${Number(days) === 1 ? '' : 's'} ago`;
  return `${label}, ${when}`;
}

export function ContactCard({ patientId }) {
  return (
    <ProfileCard patientId={patientId} icon="solar:phone-linear" title="Contact & Reachability" bodyClassName={styles.listBody}>
      {(p) => {
        const optedOut = list(p.opted_out_comms).filter(o => o !== 'None');
        const languages = list(p.languages).filter(l => l !== p.language_preference);
        const last = lastContactLabel(p.last_contact_type, p.last_contact_days);
        return (
          <>
            <PanelSectionItem
              inset
              leading={<span className={`${styles.tile} ${p.last_contact_type === 'UTR' ? styles.error : ''}`}><Icon name="solar:chat-round-dots-linear" size={16} /></span>}
              title="Last contact"
              meta={last || 'No contact recorded'}
            />
            <PanelSectionItem
              inset
              leading={<span className={styles.tile}><Icon name="solar:global-linear" size={16} /></span>}
              title="Preferred language"
              meta={[p.language_preference || 'Not set', languages.length ? `Also ${languages.join(', ')}` : null]}
            />
            <PanelSectionItem
              inset
              leading={<span className={`${styles.tile} ${optedOut.length ? styles.warning : styles.success}`}><Icon name="solar:shield-check-linear" size={16} /></span>}
              title={optedOut.length ? `Opted out of ${optedOut.length} channel${optedOut.length === 1 ? '' : 's'}` : 'Reachable on all channels'}
              meta={optedOut.length ? optedOut.join(' • ') : 'No opt-outs on file'}
              wrapTitle
            />
          </>
        );
      }}
    </ProfileCard>
  );
}

export function CareTeamCard({ patientId }) {
  const programs = useAppStore(s => s.careProgramsByPatient[patientId]);
  const fetchCareProgramsForPatient = useAppStore(s => s.fetchCareProgramsForPatient);
  // Program owners come from care programs, which the programs card may not have loaded.
  useEffect(() => { if (patientId) fetchCareProgramsForPatient(patientId); }, [patientId, fetchCareProgramsForPatient]);
  return (
    <ProfileCard patientId={patientId} icon="solar:users-group-rounded-linear" title="Care Team" count={p => list(p.care_team).length || null} bodyClassName={styles.listBody}>
      {(p) => {
        const active = (programs || []).filter(pr => pr.status !== 'Closed');
        const owned = {};
        active.forEach((pr) => {
          if (pr.assignee && pr.assignee !== 'Unassigned') (owned[pr.assignee] ||= []).push(pr.code);
        });
        const team = list(p.care_team);
        const teamNames = new Set(team.map(m => m.name));
        // Program owners who are not on the profile's roster still belong here.
        const owners = Object.keys(owned).filter(n => !teamNames.has(n)).map(name => ({
          name, title: 'Program owner', initials: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        }));
        const unassigned = active.filter(pr => !pr.assignee || pr.assignee === 'Unassigned').length;
        const members = [...team, ...owners];
        if (members.length === 0) return <p className={styles.empty}>No care team assigned.</p>;
        return (
          <>
            <CappedRows
              items={members}
              render={m => (
                <PanelSectionItem
                  key={m.name}
                  inset
                  leading={<Avatar variant="assignee" initials={m.initials} />}
                  title={m.name}
                  meta={[m.title, owned[m.name] && `Owns ${owned[m.name].join(', ')}`]}
                  trailing={m.role ? <span className={styles.statusSlotWide}><Badge tone="grey" size="S" label={m.role} /></span> : null}
                />
              )}
            />
            {unassigned > 0 && (
              <p className={`${styles.muted} ${styles.listNote}`}>{unassigned} active program{unassigned === 1 ? ' has' : 's have'} no owner.</p>
            )}
          </>
        );
      }}
    </ProfileCard>
  );
}

export function CaregiversCard({ patientId }) {
  return (
    <ProfileCard patientId={patientId} icon="solar:users-group-two-rounded-linear" title="Caregiver & Family" count={p => list(p.family_members).length || null} bodyClassName={styles.listBody}>
      {(p) => {
        const family = list(p.family_members);
        if (family.length === 0) return <p className={styles.empty}>No caregivers or family on file.</p>;
        return (
          <CappedRows
            items={family}
            render={m => {
              const role = m.role || '';
              const relation = String(m.relation || '');
              const authority = /caregiver|poa|power of attorney/i.test(`${role} ${relation}`);
              const alreadyNamed = role && relation.toLowerCase().includes(role.toLowerCase());
              return (
                <PanelSectionItem
                  key={`${m.name}-${m.relation}`}
                  inset
                  leading={<Avatar variant="assignee" initials={m.initials} />}
                  title={m.name}
                  meta={[m.relation, m.phone, m.phone_hours]}
                  trailing={authority && role && !alreadyNamed
                    ? <span className={styles.statusSlotWide}><Badge tone="info" size="S" label={role} /></span>
                    : null}
                />
              );
            }}
          />
        );
      }}
    </ProfileCard>
  );
}

export function ConsentCard({ patientId }) {
  return (
    <ProfileCard patientId={patientId} icon="solar:shield-check-linear" title="Consent" bodyClassName={styles.listBody}>
      {(p) => {
        const given = Number(p.consent_given) || 0;
        const total = Number(p.consent_total) || 0;
        if (!total) return <p className={styles.empty}>No consents required on file.</p>;
        const missing = Math.max(0, total - given);
        const pct = Math.round((given / total) * 100);
        return (
          <>
            <div className={styles.consentBlock}>
              <div className={styles.progressRow}>
                <span className={styles.muted}>{given} of {total} on file</span>
                <span className={styles.bar} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Consents on file">
                  <span className={styles.barFill} style={{ width: `${pct}%` }} />
                </span>
              </div>
              <p className={missing ? `${styles.muted} ${styles.textWarning}` : styles.muted}>
                {missing
                  ? `${missing} consent${missing === 1 ? ' is' : 's are'} missing. Billable work for that program stays blocked until it's captured.`
                  : 'All required consents are on file.'}
              </p>
            </div>
            {list(p.programs).length > 0 && (
              <PanelSectionItem inset title="Enrolled programs" meta={list(p.programs).join(' • ')} />
            )}
          </>
        );
      }}
    </ProfileCard>
  );
}

export function MedicationsCard({ patientId }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ProfileCard patientId={patientId} icon="solar:pill-linear" title="Medications" count={p => list(p.medication_orders).length || null} bodyClassName={styles.listBody}>
        {(p) => {
          const meds = list(p.medication_orders);
          if (meds.length === 0) {
            return (
              <>
                <p className={styles.empty}>No active medications on file.</p>
                <MedChangesSection patientId={patientId} />
              </>
            );
          }
          return (
            <>
            <CappedRows
              items={meds}
              render={m => (
                <div key={m} className={styles.clickRow}>
                  <PanelSectionItem
                    inset
                    leading={<span className={`${styles.tile} ${styles.info}`}><Icon name="solar:pill-linear" size={16} /></span>}
                    title={(
                      <button type="button" className={`${styles.titleButton} ${styles.stretch}`} onClick={() => setOpen(true)}>
                        {m}
                      </button>
                    )}
                  />
                </div>
              )}
            />
            <MedChangesSection patientId={patientId} />
            </>
          );
        }}
      </ProfileCard>
      {open && (
        <Suspense fallback={null}>
          <AddMedicationsDrawer patientId={patientId} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}

export function ConditionsCard({ patientId, patient }) {
  const hccMembers = useAppStore(s => s.hccMembers);
  const fetchHccMembers = useAppStore(s => s.fetchHccMembers);
  const openDiagPanel = useAppStore(s => s.openDiagPanel);
  const [problemsOpen, setProblemsOpen] = useState(false);
  const who = patient || { id: patientId };

  useEffect(() => { fetchHccMembers?.(); }, [fetchHccMembers]);

  const openDiagnosis = (text, code) => {
    const icd = (code && /^[A-Z]\d/.test(code) ? code : null) || icdFromText(text);
    const member = findWorklistMember(hccMembers, who);
    if (member && icd) {
      openDiagPanel(member.id, { highlightCode: icd });
      return;
    }
    setProblemsOpen(true);
  };

  return (
    <>
      <ProfileCard patientId={patientId} icon="solar:stethoscope-linear" title="Diagnoses & Problems" count={p => list(p.diagnoses).length || null} bodyClassName={styles.listBody}>
        {(p) => {
          const diagnoses = list(p.diagnoses);
          const chronic = list(p.chronic_conditions);
          const chronicSet = new Set(chronic);
          const problems = list(p.problems).filter(x => !chronicSet.has(x));
          const named = new Set(diagnoses.map((d) => {
            const [code, ...rest] = String(d).split(' ');
            return (/^[A-Z]\d/.test(code) ? rest.join(' ') : String(d)).toLowerCase();
          }));
          const extraChronic = chronic.filter(c => !named.has(String(c).toLowerCase()));
          const extraProblems = problems.filter(c => !named.has(String(c).toLowerCase()));
          if (!diagnoses.length && !extraChronic.length && !extraProblems.length) return <p className={styles.empty}>No diagnoses or problems on file.</p>;
          return (
            <>
              <CappedRows
                items={diagnoses}
                render={(d) => {
                  const [code, ...rest] = String(d).split(' ');
                  const isCode = /^[A-Z]\d/.test(code);
                  const title = isCode ? rest.join(' ') : d;
                  return (
                    <div key={d} className={styles.clickRow}>
                      <PanelSectionItem
                        inset
                        leading={isCode ? <span className={styles.codeChip}>{code}</span> : null}
                        title={(
                          <button type="button" className={`${styles.titleButton} ${styles.stretch}`} onClick={() => openDiagnosis(title, isCode ? code : null)}>
                            {title}
                          </button>
                        )}
                      />
                    </div>
                  );
                }}
              />
              {(extraChronic.length > 0 || extraProblems.length > 0) && (
                <div className={styles.chips}>
                  {extraChronic.map(c => (
                    <button key={c} type="button" className={styles.chipButton} onClick={() => openDiagnosis(c)}>
                      <Badge tone="warning" size="S" label={c} />
                    </button>
                  ))}
                  {extraProblems.map(c => (
                    <button key={c} type="button" className={styles.chipButton} onClick={() => openDiagnosis(c)}>
                      <Badge tone="grey" size="S" label={c} />
                    </button>
                  ))}
                </div>
              )}
            </>
          );
        }}
      </ProfileCard>
      {problemsOpen && (
        <Suspense fallback={null}>
          <AddProblemsDrawer patientId={patientId} onClose={() => setProblemsOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
