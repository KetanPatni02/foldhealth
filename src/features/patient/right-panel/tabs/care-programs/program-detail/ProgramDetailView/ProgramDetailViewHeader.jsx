import { Icon } from '../../../../../../../components/Icon/Icon';
import { DownChevronIcon } from '../../../../../../../components/Icon/DownChevronIcon';
import { ActionButton } from '../../../../../../../components/ActionButton/ActionButton';
import { CloseButton } from '../../../../../../../components/CloseButton/CloseButton';
import { BannerExpandIcon } from '../../../../../../../components/Icon/BannerExpandIcon';
import { ProgressRing } from '../../../../../../hcc/DiagPanel/ReviewProgressPopover';
import { ProgramStatusRing } from '../shared/ProgramStatusRing/ProgramStatusRing.jsx';
import { ProgramBadges } from '../shared/ProgramBadges/ProgramBadges.jsx';
import { statusColorFor } from '../../../../../data/programStatus';
import { ProgramDetailExpandPanel } from './ProgramDetailViewParts';
import styles from './ProgramDetailView.module.css';

export function ProgramDetailViewHeader({
  program,
  programProgress,
  status,
  setStatusMenu,
  assigneePicker,
  isSnp,
  prevTrigger,
  nextTrigger,
  triggerNum,
  onSwitchProgram,
  detailsExpanded,
  setDetailsExpanded,
  isCcm,
  otherPrograms,
  progressFor,
  onClose,
}) {
  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <ProgramStatusRing progress={programProgress} size={16} />
          <span className={styles.programTitle}>{program.name}</span>
          <button
            type="button"
            className={styles.statusBadge}
            onClick={e => setStatusMenu({ rect: e.currentTarget.getBoundingClientRect() })}
          >
            <span className={styles.statusBadgeText} style={{ color: statusColorFor(status) }}>{status}</span>
            <DownChevronIcon size={16} color={statusColorFor(status)} />
          </button>
          {assigneePicker}
          {isSnp && (
            <>
              <span className={styles.headerDivider} />
              <div className={styles.breadcrumb}>
                <button type="button" className={styles.breadcrumbArrow} aria-label="Previous trigger"
                  disabled={!prevTrigger} onClick={() => prevTrigger && onSwitchProgram?.(prevTrigger)}>
                  <Icon name="solar:alt-arrow-left-linear" size={16} color={prevTrigger ? 'var(--neutral-300)' : 'var(--neutral-150)'} />
                </button>
                <span className={styles.breadcrumbLabel}>Trigger {triggerNum}</span>
                <button type="button" className={styles.breadcrumbArrow} aria-label="Next trigger"
                  disabled={!nextTrigger} onClick={() => nextTrigger && onSwitchProgram?.(nextTrigger)}>
                  <Icon name="solar:alt-arrow-right-linear" size={16} color={nextTrigger ? 'var(--neutral-300)' : 'var(--neutral-150)'} />
                </button>
              </div>
            </>
          )}
          <button type="button" className={styles.expandBtn}
            aria-label={detailsExpanded ? 'Collapse details' : 'Expand details'}
            aria-expanded={detailsExpanded} onClick={() => setDetailsExpanded(e => !e)}>
            <BannerExpandIcon size={16} className={detailsExpanded ? styles.expandIconRotated : ''} />
          </button>
        </div>
        <div className={styles.headerRight}>
          {isCcm && (
            <>
              <span className={styles.secondaryBadge}><ProgressRing progress={0.5} size={14} stroke={2} />BHI</span>
              <span className={styles.secondaryBadge}><ProgressRing progress={0.75} size={14} stroke={2} />APCM</span>
              <span className={styles.headerDivider} />
            </>
          )}
          {otherPrograms.length > 0 && (
            <>
              <ProgramBadges programs={otherPrograms} progressFor={progressFor} />
              <span className={styles.headerDivider} />
            </>
          )}
          <ActionButton icon="solar:menu-dots-linear" size="S" tooltip="More" />
          <span className={styles.headerDivider} />
          <CloseButton onClick={onClose} size={16} />
        </div>
      </div>

      {isCcm && (
        <div className={styles.ccmInfoBar}>
          <span className={styles.ccmInfoItem}><span className={styles.ccmInfoLabel}>Last Updated:</span> 09/11/2024</span>
          <span className={styles.ccmInfoDivider} />
          <span className={styles.ccmInfoItem}><span className={styles.ccmInfoLabel}>DM Type:</span> CKD</span>
          <span className={styles.ccmInfoDivider} />
          <span className={styles.ccmInfoItem}>
            <span className={styles.ccmInfoLabel}>1st Outreach Due on:</span> 08/22/2024
            <Icon name="solar:check-circle-linear" size={14} color="var(--status-success)" />
          </span>
          <span className={styles.ccmInfoDivider} />
          <span className={styles.ccmInfoItem}>
            <span className={styles.ccmInfoLabel}>Chronic Condition:</span> 3 Active
            <DownChevronIcon size={14} color="var(--neutral-300)" />
          </span>
          <span className={styles.ccmInfoDivider} />
          <span className={styles.ccmInfoItem}><span className={styles.ccmInfoLabel}>Program Due on:</span> 08/22/2024</span>
          <span className={styles.ccmInfoDivider} />
          <span className={styles.ccmInfoItem}>
            <span className={styles.ccmInfoLabel}>Next Cadence:</span> 09/13/2024
            <DownChevronIcon size={14} color="var(--neutral-300)" />
          </span>
        </div>
      )}

      {detailsExpanded && <ProgramDetailExpandPanel program={program} />}
    </>
  );
}
