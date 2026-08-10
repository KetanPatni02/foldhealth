import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../../../../../store/useAppStore';
import { Icon } from '../../../../../../components/Icon/Icon';
import { ActionButton } from '../../../../../../components/ActionButton/ActionButton';
import { Badge } from '../../../../../../components/Badge/Badge';
import { CardSkeleton } from '../../../../../../components/CardSkeleton/CardSkeleton';
import { EditPatientDrawer } from '../EditPatientDrawer/EditPatientDrawer';
import styles from './ProfileTab.module.css';

/** Compact "y m" age from a MM/DD/YYYY string; blank if it can't parse. */
function ageFromDob(dob) {
  if (!dob) return '';
  const [m, d, y] = dob.split('/').map(Number);
  if (!m || !d || !y) return '';
  const now = new Date();
  let years = now.getFullYear() - y;
  let months = now.getMonth() + 1 - m;
  if (now.getDate() < d) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  return years >= 0 ? `${years}y ${months}m` : '';
}

/** Collapsible section wrapper — matches the Figma section pattern:
 * title + optional edit button on the right, and a grid of label/value
 * cells below that flow into 2 columns on wider layouts. */
function Section({ title, actionIcon = 'solar:pen-linear', onEdit, children }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <button
          type="button"
          className={styles.sectionTitleBtn}
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
        >
          <span className={styles.sectionTitle}>{title}</span>
          <Icon
            name={collapsed ? 'solar:alt-arrow-right-linear' : 'solar:alt-arrow-down-linear'}
            size={12}
            color="var(--neutral-300)"
          />
        </button>
        {onEdit && (
          <ActionButton icon={actionIcon} size="S" tooltip={`Edit ${title.toLowerCase()}`} onClick={onEdit} />
        )}
      </div>
      {!collapsed && <div className={styles.grid}>{children}</div>}
    </div>
  );
}

/** Two-line label/value cell used across every section. */
function Field({ label, value }) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldLabel}>{label}</div>
      <div className={styles.fieldValue}>{value || '-'}</div>
    </div>
  );
}

/** Contact card for family/caregiver — first line is name + relation +
 * optional Primary/Caregiver badge, second line is phone + hours. */
function ContactField({ contact }) {
  return (
    <div className={styles.field}>
      <div className={styles.contactHead}>
        <span className={styles.fieldLabel}>
          {contact.name}{contact.relation ? ` (${contact.relation})` : ''}
        </span>
        {contact.role && <Badge tone="grey" label={contact.role} size="S" />}
      </div>
      <div className={styles.fieldValue}>
        {contact.phone}
        {contact.phone_hours && <span className={styles.hours}> ({contact.phone_hours})</span>}
      </div>
    </div>
  );
}

/**
 * Profile tab — the demographic / contact / address panel behind the
 * left-panel's "Profile" sub-tab in PatientDetailView. Reads from the
 * p360_profiles Supabase table via the store's fetchP360Profile action,
 * falls back to whatever slim identity fields already live on the
 * patient object (from the worklist row) so the tab is never blank.
 *
 * Figma: Fold-Pixel 1.0 node 6820:269258.
 */
export function ProfileTab({ patient }) {
  const patientId = patient?.id;
  const p360Profile = useAppStore((s) => s.p360Profile);
  const p360Loading = useAppStore((s) => s.p360Loading);
  const fetchP360Profile = useAppStore((s) => s.fetchP360Profile);
  const editSection = useAppStore((s) => s.patientEditSection);
  const openEdit = useAppStore((s) => s.openPatientEdit);
  const closeEdit = useAppStore((s) => s.closePatientEdit);

  useEffect(() => {
    if (patientId) fetchP360Profile(patientId);
  }, [patientId, fetchP360Profile]);

  // Profile row we're rendering — the fetched p360 row wins on every field
  // it defines, but fall through to the worklist row so a patient without
  // an extended profile still shows something usable.
  const p = p360Profile && p360Profile.patient_id === patientId ? p360Profile : null;

  const email       = p?.emails?.[0] || patient?.email || '';
  const primaryPhone = p?.plan_numbers_primary?.[0] || patient?.phone || '';
  const contacts    = Array.isArray(p?.family_members) ? p.family_members : [];

  const basic = useMemo(() => ({
    Name:              patient?.name || '',
    'Chosen Name':     p?.chosen_name,
    'Date of Birth':   p?.date_of_birth || patient?.dob,
    Age:               p?.date_of_birth ? ageFromDob(p.date_of_birth) : (patient?.age || ''),
    Gender:            p?.gender_identity || patient?.gender,
    Pronoun:           p?.pronoun,
    'Sex at Birth':    p?.sex_at_birth,
    'Sexual Orientation': p?.sexual_orientation,
    'Primary Language':   p?.primary_language || p?.language_preference || patient?.language,
    'Secondary Language': p?.secondary_language,
    'Blood Group':     p?.blood_group,
    'Marital Status':  p?.marital_status,
    Race:              p?.race,
    Ethnicity:         p?.ethnicity,
    IPA:               p?.ipa || patient?.ipa,
  }), [p, patient]);

  const address = useMemo(() => ({
    'Address Line 1': p?.address_line1,
    'Address Line 2': p?.address_line2,
    State:            p?.state || patient?.state,
    City:             p?.city  || patient?.city,
    Zipcode:          p?.zipcode,
    Location:         p?.location_landmark || p?.location,
  }), [p, patient]);

  const other = useMemo(() => ({
    Source:      p?.profile_source || patient?.source,
    'Created on': p?.profile_created_on,
    Employer:    p?.employer,
  }), [p, patient]);

  if (p360Loading && !p) {
    return <div className={styles.wrapper}><CardSkeleton /></div>;
  }

  return (
    <div className={styles.wrapper}>
      <Section title="Contact Info" onEdit={() => openEdit('contact')}>
        <Field label="Email"        value={email} />
        <Field label="Phone Number" value={primaryPhone} />
        {contacts.map((c) => (
          <ContactField key={`${c.name}-${c.relation}`} contact={c} />
        ))}
      </Section>

      <Section title="Basic Info" onEdit={() => openEdit('basic')}>
        {Object.entries(basic).map(([label, value]) => (
          <Field key={label} label={label} value={value} />
        ))}
      </Section>

      <Section title="Address" onEdit={() => openEdit('address')}>
        {Object.entries(address).map(([label, value]) => (
          <Field key={label} label={label} value={value} />
        ))}
      </Section>

      <Section title="Other Info" onEdit={() => openEdit('other')}>
        {Object.entries(other).map(([label, value]) => (
          <Field key={label} label={label} value={value} />
        ))}
      </Section>

      {editSection && (
        <EditPatientDrawer
          patient={patient}
          initialSection={editSection}
          onClose={closeEdit}
        />
      )}
    </div>
  );
}
