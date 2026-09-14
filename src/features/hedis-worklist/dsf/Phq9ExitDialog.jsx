// PHQ-9 not complete — surfaced when the Coordinator tries to leave a
// DSF-B note with unanswered PHQ-9 items. Copy is verbatim per user
// story Section 5 (exact strings, actual calendar due date).
import { ConfirmDialog } from '../../../components/ConfirmDialog/ConfirmDialog';

function fmtLongDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function Phq9ExitDialog({ answered, total = 9, dueDateISO, onCompleteNow, onSaveExit }) {
  const dueDate = fmtLongDate(dueDateISO);
  const description = dueDate
    ? `You haven't finished the PHQ-9 assessment (${answered}/${total} answered). Complete it now, or you have until ${dueDate} to finish the DSF-B screening if you save and exit.`
    : `You haven't finished the PHQ-9 assessment (${answered}/${total} answered). Complete it now, or save and exit to finish the DSF-B screening later.`;
  return (
    <ConfirmDialog
      variant="warning"
      icon="solar:clock-circle-linear"
      title="PHQ-9 not complete"
      description={description}
      confirmLabel="Complete now"
      cancelLabel="Save & exit"
      // Complete now returns the user to the form (dismisses the modal
      // AND keeps the drawer open). Save & exit persists the draft and
      // closes. Because the shared ConfirmDialog treats "confirm" as the
      // primary/right button, we map that to Complete now, and the
      // secondary/left "Cancel" button to Save & exit.
      onConfirm={onCompleteNow}
      onCancel={onSaveExit}
    />
  );
}
