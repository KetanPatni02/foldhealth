import { useEffect, useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { useAppStore } from '../../store/useAppStore';
import { toast } from '../../components/Toast/sonnerToast';
import { OooRecordDrawer } from './OooRecordDrawer';
import { ReassignAppointmentsDrawer } from './ReassignAppointmentsDrawer';

/**
 * New / Edit / Delete for Out of Office records, and Reassign Appointments,
 * shared by every list of them. Saving a new record (or new dates) opens
 * Reassign Appointments with that provider and record filled in, each still
 * changeable. Render `elements` somewhere in the caller's tree.
 *
 * @param {object}   [opts]
 * @param {object}   [opts.user]  – Who a new record is for; omit to pick in the form
 * @param {object[]} [opts.users] – Who can be picked when `user` is omitted
 */
export function useOooRecordActions({ user, users } = {}) {
  const deleteOooRecord = useAppStore(s => s.deleteOooRecord);
  const [form, setForm] = useState(null); // { record?, user? }
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reassign, setReassign] = useState(null); // { userName?, recordId? }
  // Reassign From lists the caller's users, else everyone on the platform.
  const platformUsers = useAppStore(s => s.platformUsers);
  const fetchPlatformUsers = useAppStore(s => s.fetchPlatformUsers);
  // Callers without their own list (e.g. Preferences) rely on everyone being loaded.
  useEffect(() => { if (!users?.length) fetchPlatformUsers?.(); }, [users, fetchPlatformUsers]);
  const pickUsers = users?.length ? users : (platformUsers || []);

  const elements = (
    <>
      {form && (
        <OooRecordDrawer
          record={form.record}
          user={form.record ? undefined : (form.user || user)}
          users={users}
          onClose={() => setForm(null)}
          onSaved={(saved, { reassign: next } = {}) => {
            if (next) setReassign({ userName: saved.userName, recordId: saved.id });
          }}
        />
      )}
      {reassign && (
        <ReassignAppointmentsDrawer
          users={pickUsers}
          initialUser={reassign.userName}
          initialRecordId={reassign.recordId}
          onNewOoo={(name) => {
            setReassign(null);
            const u = pickUsers.find(x => x.name === name);
            setForm({ user: u ? { id: u.id, name: u.name, email: u.email, role: u.role } : undefined });
          }}
          onClose={() => setReassign(null)}
        />
      )}
      {toDelete && (
        // Figma Eventus 17507:107690.
        <ConfirmDialog
          variant="destructive"
          title="Delete OOO Record?"
          description="The Out of Office Record will be deleted and reassigned appointments for these dates will return to original user's calendar."
          confirmLabel="Delete Record"
          cancelLabel="Cancel"
          loading={deleting}
          onCancel={() => setToDelete(null)}
          onConfirm={async () => {
            setDeleting(true);
            try {
              const ok = await deleteOooRecord(toDelete.id);
              if (ok) toast.success('Out of Office Record Deleted Successfully');
              setToDelete(null);
            } finally {
              setDeleting(false);
            }
          }}
        />
      )}
    </>
  );

  return {
    // `forUser` fixes who a new record is for (else `user`, else picked).
    openNew: (forUser) => setForm({ user: forUser }),
    openEdit: (record) => setForm({ record }),
    askDelete: setToDelete,
    // Reassign Appointments on its own, optionally for a provider (and one of their records).
    openReassign: (userName, recordId) => setReassign({ userName, recordId }),
    elements,
  };
}
