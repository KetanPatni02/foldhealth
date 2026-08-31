import { Drawer } from '../../components/Drawer/Drawer';
import { Icon } from '../../components/Icon/Icon';
import { PatientBanner } from '../../components/PatientBanner/PatientBanner';
import { useAppStore } from '../../store/useAppStore';
import { useClinicalNotePanel } from './useClinicalNotePanel';
import {
  HeaderActions,
  TitleBlock,
  NoteContextPane,
  GapEvidencePane,
  ConsolidatedNoteBody,
} from './ClinicalNotePanelParts';
import { ReviewerPickerPopover } from './ReviewerPickerPopover';
import styles from './ClinicalNotePanel.module.css';

export function ClinicalNotePanel({ member, gapCode, year, onClose, editingTaskId = null }) {
  const v = useClinicalNotePanel({ member, gapCode, onClose, editingTaskId });
  // A sign-off review lands here with a consolidated note that already
  // covers every gap the author submitted — the reviewer's job is to
  // read and revise every section top-to-bottom, not to pick one gap out
  // of a list. Render the same stacked layout the CareGap drawer uses
  // for its consolidated authoring surface (Date of Service on top, one
  // section per gap below it), instead of the split two-pane layout the
  // single-gap "Add Note" flow uses. `editingTaskId` is the review-flow
  // marker — set only when the panel opens from a sign-off task.
  const isReviewFlow = !!editingTaskId;
  // Resolve the linked note for this task so the drawer title can carry
  // the current DB status (Draft / Pending Review / Signed) underneath a
  // proper note title — "Consolidated Clinical Note" for a multi-gap
  // review, "${code} Visit Note" when only one gap is under review.
  const linkedNote = useAppStore(s => {
    if (!isReviewFlow) return null;
    const list = s.clinicalNotesByMember?.[member.id] || [];
    return list.find(n => String(n.reviewTaskId) === String(editingTaskId)) || null;
  });
  const reviewCodes = linkedNote?.gapCodes || [];
  const reviewTitle = reviewCodes.length > 1
    ? 'Consolidated Clinical Note'
    : reviewCodes[0]
      ? `${reviewCodes[0]} Visit Note`
      : 'Consolidated Clinical Note';

  return (
    <>
      <Drawer
        title={
          isReviewFlow
            ? <TitleBlock title={reviewTitle} stacked status={linkedNote?.status} />
            : <TitleBlock title={v.drawerTitle} />
        }
        onClose={onClose}
        width={isReviewFlow ? 700 : 1280}
        bodyClassName={styles.body}
        banner={isReviewFlow ? (
          <PatientBanner
            initials={member.in}
            name={member.name}
            gender={member.gender}
            age={member.age}
            dob={member.dob}
            memberId={member.memberId}
            hidePatientLabel
            onCall={() => v.showToast('Call — coming soon')}
          />
        ) : undefined}
        headerRight={
          <HeaderActions
            onSaveDraft={v.handleSaveDraft}
            onSubmitForReview={v.handleSubmitForReview}
            onSaveAndSign={v.handleSaveAndSign}
            onSignAndPrint={v.handleSignAndPrint}
            primaryLabel={isReviewFlow ? 'Update Note' : 'Sign & Save'}
            canSaveDraft={v.hasChanges}
            canSign={isReviewFlow ? v.anyReadyForReview : v.activeMandatoryComplete}
          />
        }
      >
        {isReviewFlow ? (
          <>
            {/* Pinned above the scroll region — same EHR-sync note the
                two-pane authoring surface pins above its own scroll. */}
            <div className={styles.infoBanner}>
              <Icon name="solar:info-circle-linear" size={14} color="var(--status-info)" />
              <span>All signed notes sync to the patient&apos;s EHR.</span>
            </div>
            <ConsolidatedNoteBody v={v} />
          </>
        ) : (
          <div className={styles.twoPane}>
            <NoteContextPane v={v} member={member} year={year} />
            <GapEvidencePane v={v} />
          </div>
        )}
      </Drawer>
      <ReviewerPickerPopover
        open={v.reviewerPickerOpen}
        onClose={() => v.setReviewerPickerOpen(false)}
        onConfirm={(reviewer) => v.handleConfirmSubmitForReview(reviewer)}
      />
    </>
  );
}
