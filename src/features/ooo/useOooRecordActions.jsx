import { useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { useAppStore } from '../../store/useAppStore';
import { toast } from '../../components/Toast/sonnerToast';
import { OooRecordDrawer } from './OooRecordDrawer';

/**
 * New / Edit / Delete for Out of Office records, shared by every list of
 * them. Render `elements` somewhere in the caller's tree.
 *
 * @param {object}   [opts]
 * @param {object}   [opts.user]  – Who a new record is for; omit to pick in the form
 * @param {object[]} [opts.users] – Who can be picked when `user` is omitted
 */
export function useOooRecordActions({ user, users } = {}) {
  const deleteOooRecord = useAppStore(s => s.deleteOooRecord);
  const [form, setForm] = useState(null); // { record? }
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const elements = (
    <>
      {form && (
        <OooRecordDrawer
          record={form.record}
          user={form.record ? undefined : user}
          users={users}
          onClose={() => setForm(null)}
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
            const ok = await deleteOooRecord(toDelete.id);
            setDeleting(false);
            if (ok) toast.success('Out of Office Record Deleted Successfully');
            setToDelete(null);
          }}
        />
      )}
    </>
  );

  return {
    openNew: () => setForm({}),
    openEdit: (record) => setForm({ record }),
    askDelete: setToDelete,
    elements,
  };
}
