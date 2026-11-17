import { useEffect, useRef, useState } from 'react';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { EmptyState } from '../../../components/EmptyState/EmptyState';
import { Icon } from '../../../components/Icon/Icon';
import { RenamePopover } from '../../../components/RenamePopover/RenamePopover';
import { SimpleTableSkeleton } from '../../../components/SimpleTableSkeleton/SimpleTableSkeleton';
import { Switch } from '../../../components/Switch/Switch';
import { toast } from '../../../components/Toast/sonnerToast';
import { supabase } from '../../../lib/supabase';
import { useCan } from '../../../lib/useCan';
import { useAppStore } from '../../../store/useAppStore';
import { formatPhone } from '../../messages/comms/commsUtils';
import { LINE_LABEL_MAX, validateLineLabel } from '../../messages/comms/practiceLine';
import efax from '../messages/efax/EfaxSettings.module.css';
import styles from './PhoneNumbersPanel.module.css';

/**
 * Settings > Calls > Phone Number: the practice's SMS numbers (the SMS
 * inboxes in Settings > Messages > Inboxes) with the display label staff see
 * beside each number in SMS threads, and whether threads always show the
 * number a patient texted. Labels are edited by users allowed to Manage Phone
 * Numbers; everyone else sees them read-only.
 */
export function PhoneNumbersPanel() {
  const inboxes = useAppStore(s => s.commsInboxes);
  const loaded = useAppStore(s => s.commsInboxesLoaded);
  const fetchCommsInboxes = useAppStore(s => s.fetchCommsInboxes);
  const updateCommsInbox = useAppStore(s => s.updateCommsInbox);
  const currentActorName = useAppStore(s => s.currentActorName);
  const alwaysShow = useAppStore(s => s.alwaysShowSmsLine);
  const fetchOrgFeatures = useAppStore(s => s.fetchOrgFeatures);
  const canManage = useCan()('phone_numbers:manage');
  const [editing, setEditing] = useState(null); // { inbox, el }
  const [saving, setSaving] = useState(false);
  const anchorRef = useRef(null);

  useEffect(() => { fetchCommsInboxes(); fetchOrgFeatures(); }, [fetchCommsInboxes, fetchOrgFeatures]);

  const lines = inboxes.filter(i => i.channel === 'sms').toSorted((a, b) => a.name.localeCompare(b.name));
  const multi = lines.length > 1;

  // Saved when toggled, like the other behavior settings in org_settings.
  const toggleAlwaysShow = async (on) => {
    setSaving(true);
    useAppStore.setState({ alwaysShowSmsLine: on });
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = session
      ? await supabase.from('org_settings').update({ always_show_sms_line: on, updated_at: new Date().toISOString() }).eq('user_id', session.user.id).select('id')
      : { data: null, error: { message: 'Not authenticated' } };
    setSaving(false);
    if (error || !data?.length) {
      useAppStore.setState({ alwaysShowSmsLine: !on });
      toast.error(error ? 'Could not save the setting' : 'Save the organization details first');
      return;
    }
    toast.success(on ? 'SMS threads will show the number the patient texted' : 'SMS threads will hide the number the patient texted');
  };

  const saveLabel = (value) => {
    // The popover's maxLength already stops a longer label; this is the backstop.
    const problem = validateLineLabel(value);
    if (problem) { toast.error(problem); return; }
    updateCommsInbox(editing.inbox.id, { label: value, updatedBy: currentActorName() });
    toast.success(value ? 'Label Updated' : 'Label Cleared');
  };

  if (!loaded) return <SimpleTableSkeleton rows={3} cols={3} />;

  return (
    <div className={styles.panel}>
      <div className={styles.setting}>
        <Switch
          checked={multi || alwaysShow}
          disabled={multi || saving}
          onChange={toggleAlwaysShow}
          label="Always display incoming number in SMS threads"
        />
        <p className={styles.hint}>
          {multi
            ? 'Your practice has more than one SMS number, so threads always show which one the patient texted.'
            : 'Shows the Fold number a patient texted in the thread header and under each message.'}
        </p>
      </div>

      {lines.length === 0 ? (
        <div className={efax.empty}>
          <EmptyState icon="solar:phone-linear" title="No SMS numbers yet" description="Add an SMS inbox in Settings > Messages > Inboxes." />
        </div>
      ) : (
        <table className={efax.table}>
          <thead>
            <tr>
              <th>Phone Number</th>
              <th>Display Label</th>
              <th>Inbox</th>
              <th className={efax.colActions}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(line => (
              <tr key={line.id}>
                <td>
                  <span className={styles.number}>
                    <Icon name="solar:buildings-2-linear" size={16} color="var(--neutral-300)" />
                    {formatPhone(line.address)}
                  </span>
                </td>
                <td>{line.label || <span className={efax.muted}>Not set (shows {line.name})</span>}</td>
                <td>{line.name}</td>
                <td>
                  <div className={efax.actions}>
                    <ActionButton
                      icon="solar:pen-linear"
                      tooltip={canManage ? 'Edit Label' : 'You need Manage Phone Numbers to edit labels'}
                      tooltipLeft
                      disabled={!canManage}
                      onClick={(e) => { anchorRef.current = e.currentTarget; setEditing({ inbox: line }); }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <RenamePopover
          anchorRef={anchorRef}
          label="Display label"
          value={editing.inbox.label || ''}
          placeholder="e.g. AWV Line, Main Clinic, Location A"
          maxLength={LINE_LABEL_MAX}
          onSave={saveLabel}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
