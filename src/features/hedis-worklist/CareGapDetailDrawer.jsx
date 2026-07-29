import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Drawer } from '../../components/Drawer/Drawer';
import { Button } from '../../components/Button/Button';
import { Input } from '../../components/Input/Input';
import { ClinicalNotePanel } from './ClinicalNotePanel';
import { PatientBanner } from '../../components/PatientBanner/PatientBanner';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Icon } from '../../components/Icon/Icon';
import { PdfPreviewOverlay } from '../../components/PdfPreviewOverlay/PdfPreviewOverlay';
import { Timeline } from '../../components/Timeline/Timeline';
import { useAppStore } from '../../store/useAppStore';
import styles from './CareGapDetailDrawer.module.css';

const MEASURE_NAMES = {
  CBP:      'Controlling Blood Pressure',
  COL:      'Colorectal Cancer Screening',
  'COA-FS': 'Care for Older Adults: Functional Status',
  'COA-M':  'Care for Older Adults: Medication Review',
  BCS:      'Breast Cancer Screening',
  DM:       'Diabetes HbA1c Control',
  ABA:      'Adult BMI Assessment',
  FUH:      'Follow-Up After Hospitalization',
  AMR:      'Asthma Medication Ratio',
  OMW:      'Osteoporosis Management in Women',
  KED:      'Kidney Health Evaluation',
  EED:      'Eye Exam for Patients With Diabetes',
  GSD3:     'Glycemic Status Assessment',
};

const STATUSES = ['Open', 'Closed', 'Excluded', 'Completed', 'Submitted', 'Closed-Data'];

// Per-status color triple (color/bg/border) applied inline on the status
// button so it matches the HCC ChartDetailDrawer's `.actionNeeded` pill
// pattern. Keys map 1:1 to the STATUSES list.
const STATUS_STYLE = {
  Open:          { color: 'var(--status-warning)',  bg: 'var(--status-warning-light)', border: 'color-mix(in srgb, var(--status-warning) 24%, transparent)' },
  Completed:     { color: 'var(--status-success)',  bg: 'var(--status-success-light)', border: 'color-mix(in srgb, var(--status-success) 24%, transparent)' },
  Submitted:     { color: 'var(--status-success)',  bg: 'var(--status-success-light)', border: 'color-mix(in srgb, var(--status-success) 24%, transparent)' },
  Closed:        { color: 'var(--neutral-300)',     bg: 'var(--neutral-50)',           border: 'color-mix(in srgb, var(--neutral-300) 10%, transparent)' },
  Excluded:      { color: 'var(--neutral-300)',     bg: 'var(--neutral-50)',           border: 'color-mix(in srgb, var(--neutral-300) 10%, transparent)' },
  'Closed-Data': { color: 'var(--neutral-300)',     bg: 'var(--neutral-50)',           border: 'color-mix(in srgb, var(--neutral-300) 10%, transparent)' },
};

// Kebab menu actions — matches the design's "More actions" panel (Figma
// New-Care-Gap-Workflow node 1178:58434). `handler` receives the drawer's
// helper bag so items that need to open a subpanel (e.g. Add Clinical Note)
// can hook in without duplicating callback wiring.
const MORE_ACTIONS = [
  { key: 'outreach',    label: 'Add Outreach',       icon: 'solar:phone-calling-linear' },
  { key: 'lab',         label: 'Add Lab Order',      icon: 'solar:test-tube-linear' },
  { key: 'imaging',     label: 'Add Imaging Order',  icon: 'solar:medical-kit-linear' },
  { key: 'referral',    label: 'Send Referral',      icon: 'solar:arrow-right-up-linear' },
  { key: 'appointment', label: 'Schedule Appointment', icon: 'solar:calendar-linear' },
  { key: 'document',    label: 'Add Document',       icon: 'solar:upload-minimalistic-linear' },
  { key: 'reminder',    label: 'Set Reminder',       icon: 'solar:bell-linear' },
  { key: 'task',        label: 'Add Task',           icon: 'solar:clipboard-check-linear' },
  { key: 'clinical-note', label: 'Add Clinical Note', icon: 'solar:notes-linear', openClinicalNote: true },
];


// Tab labels with the static counts shown in the design reference. Only
// Activity Log has live content; the rest are stubbed (coming soon).
const TABS = [
  { key: 'Activity Log', label: 'Activity Log' },
  { key: 'Outreaches', label: 'Outreaches', count: 1 },
  { key: 'Referrals', label: 'Referrals', count: 2 },
  { key: 'Tasks', label: 'Tasks', count: 8 },
  { key: 'Appt/Reminders', label: 'Appt/Reminders', count: 5 },
  { key: 'Clinical Notes', label: 'Clinical Notes' },
  { key: 'Orders', label: 'Orders' },
];

// First-letter initials from a full name (max 2 chars). "Donna Harold" → "DH";
// single-word names fall back to the first character. Powers the assignee
// avatar chip next to the gap status.
function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

// "Nd ago" for the gap-start subtitle. Accepts MM/DD/YYYY (the shape carried
// on the mock gap objects) or any Date-parseable string. Returns '' when the
// date is missing/unparseable so callers can drop the parenthetical.
function daysAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
  return `${days}d ago`;
}

// Map a raw caregapActivity entry into the shape the shared Timeline
// component expects. The Timeline handles month grouping internally.
function toTimelineEntry(e, i) {
  const d = new Date(e.when ?? e.at);
  const valid = !Number.isNaN(d.getTime());
  const mm = valid ? String(d.getMonth() + 1).padStart(2, '0') : '';
  const dd = valid ? String(d.getDate()).padStart(2, '0') : '';
  const yyyy = valid ? d.getFullYear() : '';
  let hh = valid ? d.getHours() : 0;
  const min = valid ? String(d.getMinutes()).padStart(2, '0') : '';
  const ampm = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12 || 12;
  return {
    id: e.id ?? `${e.when ?? e.at}-${i}`,
    createdAt: e.when ?? e.at,
    date: valid ? `${mm}/${dd}/${yyyy}` : '',
    time: valid ? `${hh}:${min} ${ampm}` : '',
    user: e.actor || e.user || 'System',
    icon: e.icon || 'solar:shield-check-linear',
    iconBg: 'var(--neutral-50)',
    iconBorder: 'color-mix(in srgb, var(--neutral-300) 12%, transparent)',
    iconColor: 'var(--neutral-300)',
    details: e.title,
    category: e.detail,
    attachment: e.attachment,
  };
}

export function CareGapDetailDrawer({ member, gapCode, year, onClose }) {
  const showToast = useAppStore(s => s.showToast);
  const updateGapStatus = useAppStore(s => s.updateGapStatus);
  const logCareGapActivity = useAppStore(s => s.logCareGapActivity);
  const activityEntries = useAppStore(s => s.caregapActivity[member?.id]);

  // Internal gap selection so the header prev/next arrows can cycle through
  // the member's care gaps without re-opening the drawer.
  const gaps = member?.gaps ?? [];
  const [currentCode, setCurrentCode] = useState(gapCode);
  useEffect(() => { setCurrentCode(gapCode); }, [gapCode, member?.id]);

  const [statusOpen, setStatusOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  // Kebab menu (More actions) — anchored to the button's rect so it can
  // escape the drawer body's scroll container.
  const moreBtnRef = useRef(null);
  const [moreMenuRect, setMoreMenuRect] = useState(null);
  const openMoreMenu = () => {
    const r = moreBtnRef.current?.getBoundingClientRect();
    if (r) setMoreMenuRect(r);
  };
  const closeMoreMenu = () => setMoreMenuRect(null);
  const runMoreAction = (a) => {
    closeMoreMenu();
    if (a.openClinicalNote) setShowClinicalNote(true);
    else showToast(`${a.label} — coming soon`);
  };
  const [activeTab, setActiveTab] = useState('Activity Log');
  const [showClinicalNote, setShowClinicalNote] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [commentExpanded, setCommentExpanded] = useState(false);

  if (!member || gaps.length === 0) return null;

  const idx = Math.max(0, gaps.findIndex(g => g.code === currentCode));
  const gap = gaps[idx] ?? gaps[0];
  const canPrev = idx > 0;
  const canNext = idx < gaps.length - 1;

  const status = gap?.status ?? 'Open';
  const measureName = MEASURE_NAMES[gap.code] ?? gap.code;
  const statusLocked = status === 'Completed';

  // Adapt raw caregapActivity entries to Timeline's entry shape.
  const timelineEntries = (activityEntries || []).map(toTimelineEntry);

  const goPrev = () => { if (canPrev) { setCurrentCode(gaps[idx - 1].code); setStatusOpen(false); } };
  const goNext = () => { if (canNext) { setCurrentCode(gaps[idx + 1].code); setStatusOpen(false); } };

  const handleAddComment = () => {
    const text = commentText.trim();
    if (!text) return;
    logCareGapActivity(member.id, {
      when: new Date().toISOString(),
      actor: 'Alok Kumar',
      icon: 'solar:chat-round-linear',
      iconBg: 'var(--primary-100)',
      iconBorder: 'color-mix(in srgb, var(--primary-300) 20%, transparent)',
      iconColor: 'var(--primary-300)',
      title: text,
      detail: 'Comment',
    });
    setCommentText('');
    setCommentExpanded(false);
  };

  return (
    <>
    {showClinicalNote && (
      <ClinicalNotePanel
        member={member}
        gapCode={gap.code}
        year={year}
        onClose={() => setShowClinicalNote(false)}
      />
    )}
    <Drawer
      title="Care Gap Details"
      onClose={onClose}
      noCloseDivider
      bodyClassName={styles.drawerBody}
      headerRight={
        <div className={styles.headerNav}>
          <ActionButton
            icon="solar:alt-arrow-left-linear"
            size="L"
            tooltip="Previous gap"
            state={canPrev ? 'active' : 'disabled'}
            onClick={goPrev}
          />
          <ActionButton
            icon="solar:alt-arrow-right-linear"
            size="L"
            tooltip="Next gap"
            state={canNext ? 'active' : 'disabled'}
            onClick={goNext}
          />
          <span className={styles.headerDivider} />
        </div>
      }
      // Banner slot sits between the drawer header and its scrolling body
      // (flex-shrink:0), so the patient banner stays pinned in place while
      // the gap header + activity log scroll under it.
      banner={
        <div className={styles.patientBannerWrap}>
          <PatientBanner
            initials={member.in}
            name={member.name}
            gender={member.gender}
            age={member.age}
            memberId={member.memberId}
            hidePatientLabel
            onCall={() => showToast('Call — coming soon')}
          />
        </div>
      }
    >
      <div className={styles.contentBody}>
      {/* ── Gap header ── */}
      <div className={styles.gapHeader}>
        {/* Row 1: Measurement Year scope chip on the left, quick actions on
            the right. Status + assignee no longer live here — they moved
            down to the title row where the gap's identity lives. */}
        <div className={styles.gapToolbar}>
          <div className={styles.yearChip}>
            <span className={styles.yearChipLabel}>Measurement Year</span>
            <span className={styles.yearChipSep}>:</span>
            <span className={styles.yearChipValue}>{year}</span>
            <Icon name="solar:alt-arrow-down-linear" size={11} color="var(--neutral-300)" />
          </div>

          <div className={styles.gapToolbarRight}>
            {/* tooltipBelow: the toolbar sits at the top of the scrolling body,
                so upward-opening tooltips get clipped by the drawer edge. */}
            <ActionButton icon="solar:clipboard-add-linear" size="L" tooltip="Add Task" tooltipBelow onClick={() => showToast('Add Task — coming soon')} />
            <span className={styles.headerDivider} />
            <ActionButton icon="solar:notes-linear" size="L" tooltip="Add Clinical Note" tooltipBelow onClick={() => setShowClinicalNote(true)} />
            <span className={styles.headerDivider} />
            <ActionButton
              ref={moreBtnRef}
              icon="solar:menu-dots-linear"
              size="L"
              tooltip="More"
              tooltipBelow
              tooltipLeft
              onClick={moreMenuRect ? closeMoreMenu : openMoreMenu}
            />
          </div>
        </div>

        {/* Row 2: title/subtitle on the left, assignee + status on the right.
            Wrapped in .gapTitleWrap to give it side-padding while the toolbar
            above stays edge-to-edge. */}
        <div className={styles.gapTitleWrap}>
        <div className={styles.gapTitleRow}>
          <div className={styles.gapTitleCol}>
            <div className={styles.gapTitle}>
              {gap.code} - {measureName}
            </div>
            <div className={styles.gapSubRow}>
              {gap.startDate && (
                <>
                  <span>{gap.startDate}{daysAgo(gap.startDate) ? ` (${daysAgo(gap.startDate)})` : ''}</span>
                  <span className={styles.gapSubDot}>&bull;</span>
                </>
              )}
              <button className={styles.moreDetailsBtn} onClick={() => setMoreOpen(v => !v)}>
                More Details
                <Icon
                  name="solar:alt-arrow-down-linear"
                  size={13}
                  color="currentColor"
                  className={`${styles.moreChevron} ${moreOpen ? styles.moreChevronOpen : ''}`}
                />
              </button>
            </div>
          </div>

          <div className={styles.gapTitleActions}>
            {gap.assignee ? (
              <button
                type="button"
                className={styles.assigneeChip}
                onClick={() => showToast('Assign — coming soon')}
                title={`Assigned to ${gap.assignee}`}
                aria-label={gap.assignee}
              >
                <span className={styles.assigneeAvatar}>{initialsOf(gap.assignee)}</span>
                <Icon name="solar:alt-arrow-down-linear" size={11} color="var(--secondary-300)" />
              </button>
            ) : (
              <button
                type="button"
                className={styles.assigneeChipEmpty}
                onClick={() => showToast('Assign — coming soon')}
                title="Assign"
                aria-label="Assign"
              >
                <Icon name="solar:user-plus-linear" size={14} color="var(--neutral-300)" />
                <Icon name="solar:alt-arrow-down-linear" size={11} color="var(--neutral-300)" />
              </button>
            )}
            <div className={styles.statusWrap}>
              <button
                className={styles.statusBtn}
                onClick={() => { if (!statusLocked) setStatusOpen(v => !v); }}
                disabled={statusLocked}
                title={statusLocked ? 'Completed gaps are locked' : ''}
                style={{
                  color: STATUS_STYLE[status]?.color,
                  background: STATUS_STYLE[status]?.bg,
                  borderColor: STATUS_STYLE[status]?.border,
                }}
              >
                {status}
                {!statusLocked && (
                  <Icon name="solar:alt-arrow-down-linear" size={12} color="currentColor" />
                )}
              </button>
              {statusOpen && !statusLocked && (
                <div className={styles.statusMenu}>
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      className={`${styles.statusMenuItem} ${s === status ? styles.statusMenuItemActive : ''}`}
                      onClick={() => { updateGapStatus(member.id, gap.code, s); setStatusOpen(false); }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        </div>
        {/* More Details expansion — Measure Requirements + Instructions live here */}
        <div className={`${styles.moreDetails} ${moreOpen ? styles.moreDetailsOpen : ''}`} style={{ padding: '0 16px' }}>
          <div className={styles.moreDetailsInner}>
            <div className={styles.moreDetailsBody}>
              <div className={styles.infoBanner}>
                <span className={styles.infoBannerIcon}>
                  <Icon name="solar:info-circle-linear" size={15} color="var(--status-info, #145ECC)" />
                </span>
                <span>
                  Evidence uploaded will be recorded for measurement year {year}. The measurement year filter is displayed above for your reference.
                </span>
              </div>

              <div className={styles.accordionSection}>
                <button className={styles.accordionBtn} onClick={() => showToast('Measure Requirements — coming soon')}>
                  <Icon name="solar:alt-arrow-down-linear" size={13} />
                  Measure Requirements
                </button>
              </div>
              <div className={styles.accordionSection}>
                <button className={styles.accordionBtn} onClick={() => showToast('Measure Instructions — coming soon')}>
                  <Icon name="solar:alt-arrow-down-linear" size={13} />
                  Measure Instructions
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Suggested actions ── */}
      <div className={styles.suggestSection}>
      <div className={styles.suggestRow}>
        <Icon name="solar:magic-stick-3-bold" size={14} color="var(--primary-300)" />
        Suggested Actions
      </div>
      <div className={styles.suggestActions}>
        <Button variant="primary" size="L" onClick={() => showToast('Schedule with Specialist — coming soon')}>
          Schedule with Specialist
        </Button>
        <Button variant="tertiary" size="L" onClick={() => showToast('Add MRC Task — coming soon')}>
          Add MRC Task
        </Button>
        <Button variant="secondary" size="L" onClick={() => showToast('Add Outreach — coming soon')}>
          Add Outreach
        </Button>
        <Button variant="secondary" size="L" onClick={() => showToast('Set Reminder — coming soon')}>
          Set Reminder
        </Button>
      </div>
      </div>

      {/* ── Tabs ── Full-bleed row so its bottom border spans edge-to-edge;
          horizontal padding on the row itself indents the tab labels. */}
      <div className={styles.tabBar}>
        <div className={styles.tabsScroll}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tab.count != null && <span className={styles.tabCount}>({tab.count})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className={styles.tabContentWrap}>
      {activeTab === 'Activity Log' ? (
        <div className={styles.activityLog}>
          <div className={styles.commentInput}>
            {commentExpanded ? (
              <textarea
                autoFocus
                className={styles.commentTextarea}
                placeholder="Add a comment, use @ to mention someone"
                rows={3}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setCommentExpanded(false); setCommentText(''); } }}
              />
            ) : (
              <Input
                placeholder="Add a comment"
                onFocus={() => setCommentExpanded(true)}
                style={{ cursor: 'text', width: '100%' }}
              />
            )}
            {commentExpanded && (
              <div className={styles.commentActions}>
                <Button variant="primary" size="S" disabled={!commentText.trim()} onClick={handleAddComment}>Comment</Button>
                <Button variant="secondary" size="S" onClick={() => { setCommentExpanded(false); setCommentText(''); }}>Cancel</Button>
              </div>
            )}
          </div>
          <Timeline
            entries={timelineEntries}
            emptyLabel="No activity yet for this care gap."
            renderExtra={(entry) =>
              entry.attachment?.blob ? (
                <button
                  type="button"
                  className={styles.activityAttachment}
                  onClick={(e) => { e.stopPropagation(); setPdfPreview(entry.attachment); }}
                >
                  <Icon name="solar:paperclip-linear" size={13} color="var(--primary-300)" />
                  {entry.attachment.filename || 'Consolidated note.pdf'}
                </button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className={styles.emptyTab}>
          <Icon name="solar:hourglass-line-linear" size={36} color="var(--neutral-200)" />
          <p className={styles.emptyTabTitle}>{activeTab} — coming soon</p>
        </div>
      )}
      </div>
      </div>
    </Drawer>
    {moreMenuRect && createPortal(
      <>
        <div className={styles.moreMenuOverlay} onClick={closeMoreMenu} />
        <div
          className={styles.moreMenu}
          style={{
            top: moreMenuRect.bottom + 6,
            left: Math.min(moreMenuRect.right - 220, window.innerWidth - 220 - 8),
          }}
        >
          {MORE_ACTIONS.map(a => (
            <button
              key={a.key}
              type="button"
              className={styles.moreMenuItem}
              onClick={() => runMoreAction(a)}
            >
              <Icon name={a.icon} size={16} color="var(--neutral-300)" />
              {a.label}
            </button>
          ))}
        </div>
      </>,
      document.body,
    )}
    {pdfPreview && (
      <PdfPreviewOverlay
        blob={pdfPreview.blob}
        filename={pdfPreview.filename}
        onClose={() => setPdfPreview(null)}
      />
    )}
    </>
  );
}
