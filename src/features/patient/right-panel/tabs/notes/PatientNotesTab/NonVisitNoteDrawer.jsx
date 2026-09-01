import { useState } from 'react';
import { useAppStore } from '../../../../../../store/useAppStore';
import { Drawer } from '../../../../../../components/Drawer/Drawer';
import { Button } from '../../../../../../components/Button/Button';
import { Input } from '../../../../../../components/Input/Input';
import { Badge } from '../../../../../../components/Badge/Badge';
import { Icon } from '../../../../../../components/Icon/Icon';
import styles from './NonVisitNoteDrawer.module.css';

/**
 * NonVisitNoteDrawer — P2-1 companion, P2-2 authoring surface.
 *
 * A Clinical Note that isn't tied to an in-person visit. Fields are
 * intentionally minimal (title + body + optional gap association) —
 * unlike Visit Notes, Non-Visit Notes don't render a per-gap evidence
 * form. Written straight to `public.clinical_notes` with
 * `form_type = 'non_visit_note'` and `origin_kind = 'patient'` so the
 * P360 Notes tab (and any future origin surface) can list them
 * alongside Visit Notes.
 *
 * Lifecycle: Draft / Signed. Non-Visit Notes skip the Reviewer/Send-
 * for-Review path — a nurse can save a Draft or sign directly. This
 * matches the spec §9: same underlying entity, simpler flow.
 */
export function NonVisitNoteDrawer({ patient, onClose }) {
  const upsertClinicalNote = useAppStore(s => s.upsertClinicalNote);
  const showToast = useAppStore(s => s.showToast);
  const hedisMembers = useAppStore(s => s.hedisMembers);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedGaps, setSelectedGaps] = useState([]);
  const [saving, setSaving] = useState(false);

  // Best-effort HEDIS id for the write. If the patient has a matching
  // HEDIS worklist row, use its id so the note lives in the same slice
  // the Care Gap flow reads. Otherwise we still write with the patient
  // id twice so the store finds it under `clinicalNotesByPatient` and
  // Care-Gap-Detail-Drawer-oblivious surfaces still get a hit.
  const memberIdStr = patient?.memberId != null ? String(patient.memberId) : null;
  const hedisMember = hedisMembers?.find(m => (
    m.id === patient?.id
    || (memberIdStr && String(m.memberId) === memberIdStr)
  ));
  const hedisMemberId = hedisMember?.id || patient?.id;

  // Gap chips the author can attach to the note. Uses whatever the
  // HEDIS row exposes; falls back to no options when the patient
  // isn't a HEDIS member.
  const availableGaps = (hedisMember?.gaps || [])
    .filter(g => g.code && g.status !== 'Completed')
    .map(g => g.code);

  const toggleGap = (code) => {
    setSelectedGaps(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const buildPayload = () => ({
    title: title.trim(),
    body: body.trim(),
    dateOfService: new Date().toISOString().slice(0, 10),
  });

  const save = async (status) => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle) {
      showToast?.('Title is required');
      return;
    }
    if (!trimmedBody) {
      showToast?.('Note body is required');
      return;
    }
    setSaving(true);
    const saved = await upsertClinicalNote({
      hedisMemberId,
      patientId: patient?.id,
      gapCodes: selectedGaps,
      formType: 'non_visit_note',
      status,
      payload: buildPayload(),
      originKind: 'patient',
      originRef: patient?.id ? String(patient.id) : null,
    });
    setSaving(false);
    if (saved) {
      showToast?.(status === 'signed' ? 'Note signed' : 'Draft saved');
      onClose?.();
    } else {
      showToast?.('Save failed — check console');
    }
  };

  const canSave = !!title.trim() && !!body.trim() && !saving;

  return (
    <Drawer
      title="New Non-Visit Note"
      onClose={onClose}
      width={640}
      primaryAction={
        <Button variant="primary" size="L" onClick={() => save('signed')} disabled={!canSave}>
          Sign &amp; Save
        </Button>
      }
      secondaryAction={
        <Button variant="secondary" size="L" onClick={() => save('draft')} disabled={!canSave}>
          Save as Draft
        </Button>
      }
    >
      <div className={styles.body}>
        <div className={styles.infoBanner}>
          <Icon name="solar:info-circle-linear" size={14} color="var(--status-info)" />
          <span>Non-Visit Notes skip the Reviewer flow. Sign to lock, or save a Draft to keep editing.</span>
        </div>

        <div className={styles.field}>
          <Input
            label="Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short summary of the note"
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <label className={styles.textareaLabel}>
            Note<span className={styles.required}> •</span>
          </label>
          <textarea
            className={styles.textarea}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write the clinical note…"
            rows={10}
          />
        </div>

        {availableGaps.length > 0 && (
          <div className={styles.field}>
            <label className={styles.groupLabel}>Related Care Gaps (optional)</label>
            <div className={styles.chipRow}>
              {availableGaps.map(code => {
                const active = selectedGaps.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    className={active ? styles.chipActive : styles.chip}
                    onClick={() => toggleGap(code)}
                  >
                    {active && <Icon name="solar:check-circle-linear" size={12} color="var(--primary-300)" />}
                    <Badge tone={active ? 'primary' : 'grey'} size="S" label={code} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
