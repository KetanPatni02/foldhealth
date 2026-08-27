import { Drawer } from '../../components/Drawer/Drawer';
import { useClinicalNotePanel } from './useClinicalNotePanel';
import {
  HeaderActions,
  TitleBlock,
  NoteContextPane,
  GapEvidencePane,
} from './ClinicalNotePanelParts';
import { ReviewerPickerPopover } from './ReviewerPickerPopover';
import styles from './ClinicalNotePanel.module.css';

export function ClinicalNotePanel({ member, gapCode, year, onClose, editingTaskId = null }) {
  const v = useClinicalNotePanel({ member, gapCode, onClose, editingTaskId });

  return (
    <>
      <Drawer
        title={<TitleBlock title={v.drawerTitle} />}
        onClose={onClose}
        width={1260}
        bodyClassName={styles.body}
        headerRight={
          <HeaderActions
            onSaveDraft={v.handleSaveDraft}
            onSubmitForReview={v.handleSubmitForReview}
            onSaveAndSign={v.handleSaveAndSign}
            onSignAndPrint={v.handleSignAndPrint}
            primaryLabel={editingTaskId ? 'Update Note' : 'Sign & Save'}
            canSaveDraft={v.hasChanges}
            canSign={v.activeMandatoryComplete}
          />
        }
      >
        <div className={styles.twoPane}>
          <NoteContextPane v={v} member={member} year={year} />
          <GapEvidencePane v={v} />
        </div>
      </Drawer>
      <ReviewerPickerPopover
        open={v.reviewerPickerOpen}
        onClose={() => v.setReviewerPickerOpen(false)}
        onConfirm={(reviewer) => v.handleConfirmSubmitForReview(reviewer)}
      />
    </>
  );
}
