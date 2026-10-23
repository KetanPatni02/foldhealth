import { useState } from 'react';
import { Icon } from '../../../../components/Icon/Icon';
import { Button } from '../../../../components/Button/Button';
import { Checkbox } from '../../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '../../../../components/ShadcnDialog/ShadcnDialog';
import styles from './AccessControl.module.css';

/** Figma "Copy Permissions?": pick the roles that get `from`'s permissions. */
export function CopyPermissionsDialog({ from, roles, onCancel, onConfirm }) {
  const [picked, setPicked] = useState([]);
  const [saving, setSaving] = useState(false);
  const toggle = id => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

  return (
    <Dialog open onOpenChange={open => !open && onCancel()}>
      <DialogContent hideClose className={styles.copyDialog}>
        <DialogHeader className={styles.copyHeader}>
          <Icon name="solar:shield-linear" size={24} color="var(--primary-300)" />
          <DialogTitle>Copy Permissions?</DialogTitle>
          <DialogDescription>
            Choose which other roles should have the same permissions as <strong className={styles.strong}>{from?.name}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className={styles.copyList}>
          {roles.map(role => (
            <label key={role.id} className={styles.copyRow}>
              <Checkbox checked={picked.includes(role.id)} onCheckedChange={() => toggle(role.id)} aria-label={role.name} />
              {role.name}
            </label>
          ))}
        </div>
        <DialogFooter className={styles.copyFooter}>
          <div className={styles.footerBtn}>
            <Button variant="secondary" size="L" fullWidth onClick={onCancel} disabled={saving}>Cancel</Button>
          </div>
          <div className={styles.footerBtn}>
            <Button
              variant="primary"
              size="L"
              fullWidth
              disabled={!picked.length || saving}
              disabledReason={!picked.length ? 'Pick at least one role' : undefined}
              onClick={async () => { setSaving(true); await onConfirm(picked); }}
            >
              {saving ? 'Copying…' : 'Confirm'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
