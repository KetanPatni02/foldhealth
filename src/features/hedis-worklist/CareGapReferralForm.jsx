import { useState } from 'react';
import { Icon } from '../../components/Icon/Icon';
import { RadioButton } from '../../components/RadioButton/RadioButton';
import { Select } from '../../components/Select/Select';
import { Input } from '../../components/Input/Input';
import { Textarea } from '../../components/Textarea/Textarea';
import { Dropzone } from '../../components/Dropzone/Dropzone';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { ProviderSelect } from '../../components/ProviderSelect/ProviderSelect';
import { DocumentPickerDrawer } from '../../components/DocumentPickerDrawer/DocumentPickerDrawer';
import { REFERRAL_CHANNELS, MEDICAL_SPECIALTIES, CUSTOM_SENDER, isEmail, providerContact } from './useCareGapReferralForm';
import styles from './CareGapReferralForm.module.css';

const SENDER_LABEL = {
  efax: 'Select Your eFax Number',
  email: 'Send From (Email)',
  sms: 'Send From (SMS Number)',
};

// Contact line label per channel (Figma: "eFax : (619) 555-4321"), and the
// reason shown on a user who can't receive on that channel.
const CONTACT_LABEL = { efax: 'eFax', email: 'Email', sms: 'SMS', chat: 'Chat' };
const NO_CONTACT_REASON = {
  efax: 'No eFax number on profile',
  email: 'No email address on profile',
  sms: 'No mobile number on profile',
  chat: 'Not available on chat',
};

const formatBytes = (n) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / (1024 * 1024)).toFixed(1)} MB`);

/**
 * Care Gap drawer — "Send Referral" pane (Figma 19:57416), extended from
 * eFax-only to eFax / Email / SMS / Chat. Only the sender field and the
 * provider's contact point change per channel.
 */
export function CareGapReferralForm({ form, providers = [], senderLines = [], patientDocuments = [], docTypes = [], onUploadDocument }) {
  const { values, set, setChannel, addFiles, removeFile, addDocs, removeDoc } = form;
  const [pickerOpen, setPickerOpen] = useState(false);
  const channelSenders = senderLines.filter(l => l.channel === values.channel);
  const selected = providers.find(p => p.id === values.providerId);
  // Every system user is listed; one without a contact point for the chosen
  // channel is shown but can't be picked.
  const providerRows = providers.map(p => {
    const c = providerContact(p, values.channel);
    return {
      id: p.id,
      name: p.name,
      subtitle: [p.specialty, p.address].filter(Boolean).join(' • '),
      source: 'fold',
      network: p.network || 'In-Network',
      specialties: p.specialties || [],
      zip: p.zip || '',
      contactLabel: CONTACT_LABEL[values.channel],
      contactValue: values.channel === 'chat' ? '' : c,
      disabled: !c,
      disabledReason: c ? '' : NO_CONTACT_REASON[values.channel],
    };
  });
  const contact = providerContact(selected, values.channel);

  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <span className={styles.label}>Send via</span>
        <div className={styles.radioRow} role="radiogroup" aria-label="Send via">
          {REFERRAL_CHANNELS.map(c => (
            <RadioButton
              key={c.key}
              name="referral-channel"
              value={c.key}
              label={c.label}
              checked={values.channel === c.key}
              onChange={() => setChannel(c.key)}
            />
          ))}
        </div>
      </div>

      {values.channel !== 'chat' && (
        <Select
          label={SENDER_LABEL[values.channel]}
          required
          options={[
            ...channelSenders.map(l => ({
              value: l.id,
              label: `${l.value} - ${l.label}${l.isDefault ? ' (Default)' : ''}`,
            })),
            ...(values.channel === 'email' ? [{ value: CUSTOM_SENDER, label: '+ Custom Email' }] : []),
          ]}
          value={values.senderId}
          onChange={set('senderId')}
          placeholder="Select"
        />
      )}
      {values.channel === 'email' && values.senderId === CUSTOM_SENDER && (
        <Input
          label="Custom Email"
          required
          type="email"
          value={values.customSender}
          onChange={e => set('customSender')(e.target.value)}
          placeholder="name@example.com"
          errorText={values.customSender.trim() && !isEmail(values.customSender) ? 'Enter a valid email address' : undefined}
          autoFocus
        />
      )}

      <div className={styles.field}>
        <ProviderSelect
          label="Refer to"
          required
          providers={providerRows}
          value={contact ? values.providerId : ''}
          onChange={set('providerId')}
          placeholder="Select Provider"
          emptyText="No users found."
          advancedSearch
          specialtyOptions={MEDICAL_SPECIALTIES}
        />
        {selected && contact && (
          <span className={styles.hint}>
            {selected.practice ? `${selected.practice} • ` : ''}Sends to {contact}
          </span>
        )}
      </div>

      <div className={styles.field}>
        <div className={styles.labelRow}>
          <span className={styles.label}>
            Attachments
            <span className={styles.required} aria-hidden="true" />
          </span>
          <button type="button" className={styles.inlineAction} onClick={() => setPickerOpen(true)}>
            <Icon name="solar:folder-linear" size={14} color="currentColor" />
            Select from Documents
          </button>
        </div>
        {(values.files.length > 0 || values.docs.length > 0) && (
          <ul className={styles.files}>
            {values.docs.map(d => (
              <li key={d.id} className={styles.file}>
                <Icon name="solar:file-linear" size={18} color="var(--neutral-400)" />
                <span className={styles.fileName}>{d.name}</span>
                <span className={styles.fileSize}>From Documents</span>
                <ActionButton icon="solar:trash-bin-2-linear" size="S" tooltip="Remove" onClick={() => removeDoc(d.id)} />
              </li>
            ))}
            {values.files.map((f, i) => (
              <li key={`${f.name}-${f.size}`} className={styles.file}>
                <Icon name="custom:pdf-file" size={18} color="var(--neutral-400)" />
                <span className={styles.fileName}>{f.name}</span>
                <span className={styles.fileSize}>{formatBytes(f.size)}</span>
                <ActionButton icon="solar:trash-bin-2-linear" size="S" tooltip="Remove" onClick={() => removeFile(i)} />
              </li>
            ))}
          </ul>
        )}
        {/* Attached files first, then the drop zone for more. */}
        <Dropzone
          multiple
          accept=".pdf,.csv,.xls,.xlsx"
          helperText="Supported formats: PDF, CSV, XLS, XLSX"
          secondaryText="Max size: 5 MB"
          onPick={addFiles}
        />
      </div>

      <Textarea
        title="Reason for Referral"
        mandatory
        rows={3}
        value={values.reason}
        onChange={e => set('reason')(e.target.value)}
        placeholder="Enter Reason"
      />

      {values.noteOpen ? (
        <Textarea
          title="Note"
          rows={3}
          value={values.note}
          onChange={e => set('note')(e.target.value)}
          placeholder="Add a note for the provider"
        />
      ) : (
        <button type="button" className={styles.addNote} onClick={() => set('noteOpen')(true)}>
          <Icon name="solar:add-circle-linear" size={14} color="currentColor" />
          Add a Note
        </button>
      )}

      {pickerOpen && (
        <DocumentPickerDrawer
          documents={patientDocuments}
          alreadyAdded={values.docs.map(d => d.id)}
          onAdd={addDocs}
          onUpload={onUploadDocument}
          docTypes={docTypes}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
