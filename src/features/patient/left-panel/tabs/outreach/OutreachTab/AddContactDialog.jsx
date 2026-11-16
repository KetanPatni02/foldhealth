import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '../../../../../../components/Dialog/Dialog';
import { Button } from '../../../../../../components/Button/Button';
import { Input } from '../../../../../../components/Input/Input';
import styles from './AddContactDialog.module.css';

/**
 * Add Contact from the outreach form's Actions row: a name and number that
 * join the Called To list for this outreach and become the selected one.
 * Mount it only while open so each opening starts empty.
 *
 * @param {boolean}  props.open
 * @param {(name: string, phone: string) => void} props.onSubmit
 * @param {function} props.onCancel
 */
export function AddContactDialog({ open, onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const canSubmit = name.trim().length > 0;
  const submit = () => { if (canSubmit) onSubmit?.(name.trim(), phone.trim()); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel?.(); }}>
      <DialogContent className={styles.content}>
        <DialogTitle className={styles.title}>Add Contact</DialogTitle>
        <div className={styles.fields}>
          <Input label="Name" required value={name} placeholder="e.g. Dr. Roland Green" onChange={e => setName(e.target.value)} />
          <Input
            label="Phone Number"
            type="tel"
            value={phone}
            placeholder="(555) 000-0000"
            onChange={e => setPhone(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          />
        </div>
        <div className={styles.actions}>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button disabled={!canSubmit} onClick={submit}>Add Contact</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
