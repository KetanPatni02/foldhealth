import { Icon } from '../../../components/Icon/Icon';
import { Button } from '../../../components/Button/Button';
import { Drawer } from '../../../components/Drawer/Drawer';
import { Input } from '../../../components/Input/Input';
import { Select } from '../../../components/Select/Select';
import { RadioButton } from '../../../components/RadioButton/RadioButton';
import {
  isCapitalizedName,
  ADMIN_ROLES,
  GENDER_OPTIONS,
  LANGUAGE_OPTIONS,
  MOCK_ROLES,
} from './InviteUserDrawer.utils';
import { useLocationNames, TagInput, MultiSelectField } from './AccountPanelParts';
import styles from './AccountPanel.module.css';

export function InviteUserFormStep({ onClose, form, set, showAdditional, setShowAdditional, sending, onSendInvite }) {
  const locationNames = useLocationNames();

  return (
    <Drawer title="Invite User" onClose={onClose} bodyClassName={styles.inviteDrawerBody} headerRight={
      <Button variant="primary" size="L" onClick={onSendInvite} disabled={sending}>{sending ? 'Sending...' : 'Send Invite'}</Button>
    }>
      <div className={styles.inviteFormScroll}>
        <h4 className={styles.formSectionTitle} style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>Basic Info</h4>
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>First Name <span className={styles.required}>*</span></label>
            <Input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First Name" variant={form.first_name && !isCapitalizedName(form.first_name) ? 'error' : 'default'} />
            {form.first_name && !isCapitalizedName(form.first_name) && <span className={styles.fieldError}>Must start with a capital letter</span>}
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Middle Name</label>
            <Input value={form.middle_name} onChange={e => set('middle_name', e.target.value)} placeholder="Middle Name" />
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Last Name <span className={styles.required}>*</span></label>
            <Input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last Name" variant={form.last_name && !isCapitalizedName(form.last_name) ? 'error' : 'default'} />
            {form.last_name && !isCapitalizedName(form.last_name) && <span className={styles.fieldError}>Must start with a capital letter</span>}
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Email <span className={styles.required}>*</span></label>
            <Input value={form.email} onChange={e => set('email', e.target.value)} placeholder="Enter email" type="email" />
          </div>
        </div>

        <div className={styles.formSection}>
          <label className={styles.formLabel}>Administrative Roles <span className={styles.required}>*</span></label>
          <div className={styles.radioGroup} role="radiogroup">
            {ADMIN_ROLES.map(role => (
              <RadioButton key={role} label={role} checked={form.admin_role === role} onChange={() => set('admin_role', role)} />
            ))}
          </div>
        </div>

        <div className={styles.formSection}>
          <label className={styles.formLabel}>Clinical & Operational Roles <span className={styles.required}>*</span></label>
          <p className={styles.formHint}>Select at least one role if the user interacts with patients or schedules appointments.</p>
          <MultiSelectField label="" options={MOCK_ROLES} value={form.clinical_roles} onChange={v => set('clinical_roles', v)} />
        </div>

        <button className={styles.additionalToggle} onClick={() => setShowAdditional(v => !v)}>
          Additional Fields <Icon name={showAdditional ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'} size={14} color="var(--neutral-400)" />
        </button>

        {showAdditional && (
          <>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Credentials <span className={styles.required}>*</span></label>
                <TagInput value={form.credentials} onChange={v => set('credentials', v)} placeholder="e.g. Dr, NP" />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Gender <span className={styles.required}>*</span></label>
                <Select options={GENDER_OPTIONS.map(g => ({ value: g, label: g }))} value={form.gender || undefined} onChange={v => set('gender', v)} placeholder="Select gender" />
              </div>
            </div>

            <div className={styles.formSection}>
              <label className={styles.formLabel}>Profile</label>
              <textarea className={styles.formTextarea} rows={4} value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Brief bio..." />
            </div>

            <MultiSelectField label="Licence State" required options={['Nevada', 'New York', 'California', 'Texas', 'Florida']} value={form.licence_states} onChange={v => set('licence_states', v)} />
            <MultiSelectField label="Location" required options={locationNames} value={form.locations} onChange={v => set('locations', v)} />
            <MultiSelectField label="Languages" required options={LANGUAGE_OPTIONS} value={form.languages} onChange={v => set('languages', v)} />

            <h4 className={styles.formSectionTitle}>Contact Info</h4>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Mobile Number <span className={styles.required}>*</span></label>
                <Input value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="+1 234 567 890" />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Email <span className={styles.required}>*</span></label>
                <Input value={form.email} disabled />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Fax Number <span className={styles.required}>*</span></label>
                <Input value={form.fax} onChange={e => set('fax', e.target.value)} placeholder="+1 234 567 890" />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Zip Code <span className={styles.required}>*</span></label>
                <Input value={form.zip_code} onChange={e => set('zip_code', e.target.value)} placeholder="12345" />
              </div>
            </div>

            <h4 className={styles.formSectionTitle}>Additional Info</h4>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Address Line 1 <span className={styles.required}>*</span></label>
                <Input value={form.address_line1} onChange={e => set('address_line1', e.target.value)} placeholder="Street address" />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Address Line 2 <span className={styles.required}>*</span></label>
                <Input value={form.address_line2} onChange={e => set('address_line2', e.target.value)} placeholder="Apt, suite" />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>State <span className={styles.required}>*</span></label>
                <Input value={form.state} onChange={e => set('state', e.target.value)} placeholder="State" />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>City <span className={styles.required}>*</span></label>
                <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" />
              </div>
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}
