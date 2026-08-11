import { Icon } from '../../../../../../../components/Icon/Icon';
import { DownChevronIcon } from '../../../../../../../components/Icon/DownChevronIcon';
import { ActionButton } from '../../../../../../../components/ActionButton/ActionButton';
import { Button } from '../../../../../../../components/Button/Button';
import { SearchBar } from '../../../../../../../components/SearchBar/SearchBar';
import { FilterChip } from '../../../../../../../components/FilterChip/FilterChip';
import { EMPTY_TASK_FILTERS } from './ProgramDetailView.utils';
import styles from './ProgramDetailView.module.css';

export function ProgramDetailViewContentHeader({
  stepFlags,
  assessmentCfg,
  stepName,
  isMandatoryStep,
  assigneePicker,
  taskSearchOpen,
  setTaskSearchOpen,
  taskSearchText,
  setTaskSearchText,
  setAddTaskOpen,
  taskFiltersOpen,
  setTaskFiltersOpen,
  taskFilterMeta,
  taskFilters,
  setTaskFilter,
  taskFiltersActive,
  goNextStep,
  nextStep,
}) {
  const {
    isBillingStep, isOutreachStep, isPreVisitStep, isCarePlanStep,
    isAppointmentStep, isOpenCareGapsStep, isMedReconStep,
    isProgramTasksStep, isProgramFilesStep, isReferralStep, isLettersStep,
  } = stepFlags;

  if (isBillingStep) return null;

  return (
    <div className={styles.contentHeader}>
      <div className={styles.contentHeaderRow}>
        {assessmentCfg ? (
          <div className={styles.assessmentHeader}>
            <div className={styles.assessmentHeaderText}>
              <span className={styles.assessmentTitle}>{assessmentCfg.title}</span>
              <span className={styles.assessmentMeta}>
                Filled by {assessmentCfg.filledBy} on {assessmentCfg.filledDate} • Reviewed by {assessmentCfg.reviewedBy} on {assessmentCfg.reviewedDate}
              </span>
            </div>
          </div>
        ) : isMedReconStep ? (
          <div className={styles.assessmentHeader}>
            <div className={styles.assessmentHeaderText}>
              <span className={styles.assessmentTitle}>Medication Reconciliation</span>
              <span className={styles.assessmentMeta}>Last Reviewed by Robert Fox on 11/10/24</span>
            </div>
          </div>
        ) : isReferralStep ? (
          <div className={styles.assessmentHeader}>
            <div className={styles.assessmentHeaderText}>
              <span className={styles.assessmentTitle}>Referral Review</span>
              <span className={styles.assessmentMeta}>Reviewed by Jonathan Bush (NP) on 05/01/25</span>
            </div>
          </div>
        ) : isCarePlanStep ? (
          <div className={styles.assessmentHeader}>
            <div className={styles.assessmentHeaderText}>
              <span className={styles.assessmentTitle}>Care Plan</span>
              <span className={styles.assessmentMeta}>Created by Ivy Ralph on 09/11/24</span>
            </div>
          </div>
        ) : (
          <span className={styles.contentTitle}>
            {isOutreachStep ? 'Outreach'
              : isPreVisitStep ? 'Pre-visit'
              : isAppointmentStep ? 'Follow Up Appointments'
              : isOpenCareGapsStep ? 'Open Care Gaps'
              : isProgramTasksStep ? 'Program Related Tasks'
              : isProgramFilesStep ? 'Program Related Files'
              : isLettersStep ? 'Program Related Letters'
              : stepName}
          </span>
        )}
        <div className={styles.contentActions}>
          {isCarePlanStep ? (
            <>
              <ActionButton icon="solar:magnifer-linear" size="S" tooltip="Search" />
              <ActionButton icon="solar:download-minimalistic-linear" size="S" tooltip="Download" />
              <Button variant="ghost" size="S" leadingIcon="solar:add-circle-linear" className={styles.actionBtn}>Add Care Plan</Button>
              <Button variant="ghost" size="S"
                leadingIconElement={<Icon name="solar:pen-2-linear" size={14} color="var(--primary-300)" />}
                className={styles.reviewedBtn}>Sign &amp; Share</Button>
              <ActionButton icon="solar:menu-dots-linear" size="S" tooltip="More" />
            </>
          ) : isMedReconStep ? (
            <>
              {assigneePicker}
              {!isMandatoryStep && <Button variant="ghost" size="S" className={styles.actionBtn}>Skip</Button>}
              <Button variant="ghost" size="S" trailingIconElement={<DownChevronIcon size={14} color="var(--primary-300)" />} className={styles.reviewedBtn}>Sign</Button>
              <ActionButton icon="solar:menu-dots-linear" size="S" tooltip="More" />
            </>
          ) : isProgramTasksStep ? (
            <>
              {taskSearchOpen ? (
                <SearchBar className={styles.taskSearch} placeholder="Search tasks" value={taskSearchText}
                  onChange={e => setTaskSearchText(e.target.value)}
                  onClose={() => { setTaskSearchOpen(false); setTaskSearchText(''); }} />
              ) : (
                <ActionButton icon="solar:magnifer-linear" size="S" tooltip="Search" onClick={() => setTaskSearchOpen(true)} />
              )}
              <span className={styles.headerDivider} />
              <Button variant="tertiary" size="L" leadingIcon="solar:add-circle-linear" onClick={() => setAddTaskOpen(true)}>Add Task</Button>
              <span className={styles.headerDivider} />
              <ActionButton icon="solar:filter-linear" size="S" tooltip="Filter" active={taskFiltersOpen}
                iconColor={taskFiltersOpen ? 'var(--primary-300)' : undefined}
                onClick={() => setTaskFiltersOpen(v => !v)} />
            </>
          ) : isOutreachStep ? (
            <>
              {assigneePicker}
              <span className={styles.headerDivider} />
              <Button variant="tertiary" size="L" onClick={goNextStep} disabled={!nextStep}>Next</Button>
            </>
          ) : isProgramFilesStep ? (
            <>
              {!isMandatoryStep && <Button variant="ghost" size="S" className={styles.actionBtn}>Skip</Button>}
              <ActionButton icon="solar:menu-dots-linear" size="S" tooltip="More" />
            </>
          ) : (
            <>
              {assigneePicker}
              {!isMandatoryStep && <Button variant="ghost" size="S" className={styles.actionBtn}>Skip</Button>}
              <Button variant="tertiary" size="L" leadingIcon="solar:check-circle-linear">Reviewed</Button>
              <ActionButton icon="solar:menu-dots-linear" size="S" tooltip="More" />
            </>
          )}
        </div>
      </div>
      {isProgramTasksStep && taskFiltersOpen && (
        <div className={styles.headerFilterBar}>
          {taskFilterMeta.map(f => (
            <FilterChip key={f.key} label={f.label} options={f.options}
              selected={taskFilters[f.key]} onChange={vals => setTaskFilter(f.key, vals)} />
          ))}
          {taskFiltersActive && (
            <button className={styles.headerClearAll} onClick={() => Object.keys(EMPTY_TASK_FILTERS).forEach(k => setTaskFilter(k, []))}>
              <Icon name="solar:backspace-linear" size={16} color="var(--primary-300)" />
              Clear All
            </button>
          )}
        </div>
      )}
    </div>
  );
}
