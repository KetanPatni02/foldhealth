import { Icon } from '../../components/Icon/Icon';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { AssigneeChange } from '../../components/AssigneeChange/AssigneeChange';
import { Badge } from '../../components/Badge/Badge';
import { Button } from '../../components/Button/Button';
import { FilterChip } from '../../components/FilterChip/FilterChip';
import { MEASURE_NAMES, STATUSES, daysAgo, initialsOf } from './CareGapDetailDrawer.utils';
import styles from './CareGapDetailDrawer.module.css';

// Status → shared Badge tone. Aligns with STATUS_STYLE's colour intent
// but routes through the design-system palette so the trigger reads
// identically to every other status pill in the app.
const STATUS_TONE = {
  'Open':                        'primary',
  'Engaged':                     'warning',
  'Engaged Requires Follow-Up':  'warning',
  'Submitted':                   'warning',
  'Completed':                   'success',
  'Closed - Do not call':        'grey',
  'Closed - UTR':                'grey',
  'Closed - Other':              'grey',
};

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
            {/* Shared FilterChip in single-select mode — same "Label ⌄" idle
                → "Label : value ✕" active behaviour every other filter chip
                in the app uses. Emits a 1-element array so the local state
                stays a plain number. */}
            <FilterChip
              label="Measurement Year"
              size="S"
              options={yearOptions.map(String)}
              selected={selectedYear ? [String(selectedYear)] : []}
              onChange={(vals) => {
                const next = vals?.[0];
                if (next) setSelectedYear(Number(next));
                setYearOpen(false);
              }}
              singleSelect
              noClear
            />
          </div>
          <div className={styles.gapToolbarRight}>
            {/* Assignee + Status promoted from the title row into the toolbar —
                primary actions live in Suggested Actions below, so the toolbar
                is reserved for the gap's identity chips (who owns it, what
                state it's in) plus the More menu that catches everything else
                (Add Task, Add Clinical Note, orders, referrals, …). */}
            {(() => {
              const effectiveAssignee = gap.assignee ?? member?.assignee ?? null;
              return (
                <AssigneeChange
                  ref={assigneeBtnRef}
                  avatarOnly
                  unassigned={!effectiveAssignee}
                  name={effectiveAssignee || undefined}
                  initials={effectiveAssignee ? initialsOf(effectiveAssignee) : undefined}
                  ariaLabel={effectiveAssignee || 'Assign'}
                  onClick={() => (assigneePos ? closeAssignee() : openAssignee())}
                />
              );
            })()}

            <div className={styles.statusWrap}>
              <button
                type="button"
                className={styles.statusBtnReset}
                onClick={() => { if (!statusLocked) setStatusOpen(v => !v); }}
                disabled={statusLocked}
                title={statusLocked ? 'Completed gaps are locked' : ''}
                aria-haspopup="menu"
                aria-expanded={statusOpen}
              >
                <Badge
                  size="M"
                  tone={statusLocked ? 'disabled' : (STATUS_TONE[status] || 'grey')}
                  label={status}
                  chevron={!statusLocked}
                  style={{ height: 28 }}
                />
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
          <Button variant="tertiary" size="L" onClick={() => setShowClinicalNote(true)}>Add Note</Button>
          <Button variant="tertiary" size="L" onClick={() => showToast('Add MRC Task — coming soon')}>Add MRC Task</Button>
          <Button variant="secondary" size="L" onClick={() => showToast('Add Outreach — coming soon')}>Add Outreach</Button>
        </div>
      </div>
    </>
  );
}
