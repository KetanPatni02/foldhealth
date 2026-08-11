import { Icon } from '../../components/Icon/Icon';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Button } from '../../components/Button/Button';
import { MEASURE_NAMES, STATUS_STYLE, STATUSES, daysAgo, initialsOf } from './CareGapDetailDrawer.utils';
import styles from './CareGapDetailDrawer.module.css';

export function CareGapDetailDrawerHeader({
  gap,
  member,
  selectedYear,
  setSelectedYear,
  yearOpen,
  setYearOpen,
  yearOptions,
  moreOpen,
  setMoreOpen,
  status,
  statusLocked,
  statusOpen,
  setStatusOpen,
  updateGapStatus,
  assigneeBtnRef,
  assigneePos,
  openAssignee,
  closeAssignee,
  showToast,
  setShowClinicalNote,
  moreBtnRef,
  moreMenuRect,
  openMoreMenu,
  closeMoreMenu,
  goPrev,
  goNext,
  canPrev,
  canNext,
}) {
  const measureName = MEASURE_NAMES[gap.code] ?? gap.code;

  return (
    <>
      <div className={styles.gapHeader}>
        <div className={styles.gapToolbar}>
          <div className={styles.yearWrap}>
            <button type="button" className={styles.yearChip} onClick={() => setYearOpen(v => !v)} aria-haspopup="listbox" aria-expanded={yearOpen}>
              <span className={styles.yearChipLabel}>Measurement Year</span>
              <span className={styles.yearChipSep}>:</span>
              <span className={styles.yearChipValue}>{selectedYear}</span>
              <Icon name="solar:alt-arrow-down-linear" size={11} color="var(--neutral-300)" />
            </button>
            {yearOpen && (
              <>
                <div className={styles.yearMenuOverlay} onClick={() => setYearOpen(false)} />
                <div className={styles.yearMenu} role="listbox">
                  {yearOptions.map(y => (
                    <button key={y} type="button" role="option" aria-selected={y === selectedYear}
                      className={`${styles.yearMenuItem} ${y === selectedYear ? styles.yearMenuItemActive : ''}`}
                      onClick={() => { setSelectedYear(y); setYearOpen(false); }}>{y}</button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className={styles.gapToolbarRight}>
            <ActionButton icon="solar:clipboard-add-linear" size="L" tooltip="Add Task" tooltipBelow onClick={() => showToast('Add Task — coming soon')} />
            <span className={styles.headerDivider} />
            <ActionButton icon="solar:notes-linear" size="L" tooltip="Add Clinical Note" tooltipBelow onClick={() => setShowClinicalNote(true)} />
            <span className={styles.headerDivider} />
            <ActionButton ref={moreBtnRef} icon="solar:menu-dots-linear" size="L" tooltip="More" tooltipBelow tooltipLeft
              onClick={moreMenuRect ? closeMoreMenu : openMoreMenu} />
          </div>
        </div>

        <div className={styles.gapTitleWrap}>
          <div className={styles.gapTitleRow}>
            <div className={styles.gapTitleCol}>
              <div className={styles.gapTitle}>{gap.code} - {measureName}</div>
              <div className={styles.gapSubRow}>
                {gap.startDate && (
                  <>
                    <span>{gap.startDate}{daysAgo(gap.startDate) ? ` (${daysAgo(gap.startDate)})` : ''}</span>
                    <span className={styles.gapSubDot}>&bull;</span>
                  </>
                )}
                <button className={styles.moreDetailsBtn} onClick={() => setMoreOpen(v => !v)}>
                  More Details
                  <Icon name="solar:alt-arrow-down-linear" size={13} color="currentColor"
                    className={`${styles.moreChevron} ${moreOpen ? styles.moreChevronOpen : ''}`} />
                </button>
              </div>
            </div>
            <div className={styles.gapTitleActions}>
              {gap.assignee ? (
                <button ref={assigneeBtnRef} type="button" className={styles.assigneeChip}
                  onClick={() => (assigneePos ? closeAssignee() : openAssignee())} title={`Assigned to ${gap.assignee}`} aria-label={gap.assignee}>
                  <span className={styles.assigneeAvatar}>{initialsOf(gap.assignee)}</span>
                  <Icon name="solar:alt-arrow-down-linear" size={11} color="var(--secondary-300)" />
                </button>
              ) : (
                <button ref={assigneeBtnRef} type="button" className={styles.assigneeChipEmpty}
                  onClick={() => (assigneePos ? closeAssignee() : openAssignee())} title="Assign" aria-label="Assign">
                  <Icon name="solar:user-plus-linear" size={14} color="var(--neutral-300)" />
                  <Icon name="solar:alt-arrow-down-linear" size={11} color="var(--neutral-300)" />
                </button>
              )}
              <div className={styles.statusWrap}>
                <button className={styles.statusBtn} onClick={() => { if (!statusLocked) setStatusOpen(v => !v); }}
                  disabled={statusLocked} title={statusLocked ? 'Completed gaps are locked' : ''}
                  style={{ color: STATUS_STYLE[status]?.color, background: STATUS_STYLE[status]?.bg, borderColor: STATUS_STYLE[status]?.border }}>
                  {status}
                  {!statusLocked && <Icon name="solar:alt-arrow-down-linear" size={12} color="currentColor" />}
                </button>
                {statusOpen && !statusLocked && (
                  <>
                    <div className={styles.statusMenuOverlay} onClick={() => setStatusOpen(false)} />
                    <div className={styles.statusMenu} role="menu">
                      <div className={styles.statusMenuHeader}>Change Status</div>
                      <div className={styles.statusMenuItems}>
                        {STATUSES.map(s => (
                          <button key={s} type="button" role="menuitemradio" aria-checked={s === status}
                            className={`${styles.statusMenuItem} ${s === status ? styles.statusMenuItemActive : ''}`}
                            onClick={() => { updateGapStatus(member.id, gap.code, s); setStatusOpen(false); }}>
                            <span className={styles.statusMenuItemLabel}>{s}</span>
                            {s === status && <Icon name="solar:check-read-linear" size={12} color="var(--primary-300)" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={`${styles.moreDetails} ${moreOpen ? styles.moreDetailsOpen : ''}`} style={{ padding: '0 16px' }}>
          <div className={styles.moreDetailsInner}>
            <div className={styles.moreDetailsBody}>
              <div className={styles.infoBanner}>
                <span className={styles.infoBannerIcon}>
                  <Icon name="solar:info-circle-linear" size={15} color="var(--status-info, #145ECC)" />
                </span>
                <span>Evidence uploaded will be recorded for measurement year {selectedYear}. The measurement year filter is displayed above for your reference.</span>
              </div>
              <div className={styles.accordionSection}>
                <button className={styles.accordionBtn} onClick={() => showToast('Measure Requirements — coming soon')}>
                  <Icon name="solar:alt-arrow-down-linear" size={13} /> Measure Requirements
                </button>
              </div>
              <div className={styles.accordionSection}>
                <button className={styles.accordionBtn} onClick={() => showToast('Measure Instructions — coming soon')}>
                  <Icon name="solar:alt-arrow-down-linear" size={13} /> Measure Instructions
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.suggestSection}>
        <div className={styles.suggestRow}>
          <Icon name="solar:magic-stick-3-bold" size={14} color="var(--primary-300)" /> Suggested Actions
        </div>
        <div className={styles.suggestActions}>
          <Button variant="primary" size="L" onClick={() => showToast('Schedule with Specialist — coming soon')}>Schedule with Specialist</Button>
          <Button variant="tertiary" size="L" onClick={() => showToast('Add MRC Task — coming soon')}>Add MRC Task</Button>
          <Button variant="secondary" size="L" onClick={() => showToast('Add Outreach — coming soon')}>Add Outreach</Button>
          <Button variant="secondary" size="L" onClick={() => showToast('Set Reminder — coming soon')}>Set Reminder</Button>
        </div>
      </div>
    </>
  );
}
