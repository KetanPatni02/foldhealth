import { useState } from 'react';
import { Drawer } from '../../components/Drawer/Drawer';
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
  EED:      'Prenatal and Postpartum Care',
  GSD3:     'Glycemic Status Assessment',
};

const GENDER_LABEL = { M: 'Male', F: 'Female', O: 'Other' };

const STATUSES = ['Open', 'Closed', 'Excluded', 'Completed', 'Submitted', 'Closed-Data'];

const STATUS_COLOR = {
  Open:         styles.statusOpen,
  Completed:    styles.statusCompleted,
  Submitted:    styles.statusCompleted,
  Closed:       styles.statusExcluded,
  Excluded:     styles.statusExcluded,
  'Closed-Data': styles.statusExcluded,
};

const TABS = ['Activity Log', 'Outreach', 'Clinical Note', 'Tasks', 'Referrals'];

// Map a raw caregapActivity entry into the shape the shared Timeline
// component expects. The Timeline handles month grouping internally.
function toTimelineEntry(e, i) {
  const d = new Date(e.when);
  const valid = !Number.isNaN(d.getTime());
  const mm = valid ? String(d.getMonth() + 1).padStart(2, '0') : '';
  const dd = valid ? String(d.getDate()).padStart(2, '0') : '';
  const yyyy = valid ? d.getFullYear() : '';
  let hh = valid ? d.getHours() : 0;
  const min = valid ? String(d.getMinutes()).padStart(2, '0') : '';
  const ampm = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12 || 12;
  return {
    id: e.id ?? `${e.when}-${i}`,
    createdAt: e.when,
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
  const activityEntries = useAppStore(s => s.caregapActivity[member?.id]);

  const gap = member?.gaps.find(g => g.code === gapCode) ?? member?.gaps[0];
  const status = gap?.status ?? 'Open';
  const [statusOpen, setStatusOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Activity Log');
  const [showClinicalNote, setShowClinicalNote] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);

  if (!member || !gap) return null;

  const measureName = MEASURE_NAMES[gap.code] ?? gap.code;
  // Adapt raw caregapActivity entries to Timeline's entry shape. The
  // Timeline component groups by month internally.
  const timelineEntries = (activityEntries || []).map(toTimelineEntry);
  const statusLocked = status === 'Completed';

  // Parse age as "40Y" from "40y 4m"
  const ageShort = member.age ? member.age.split('y')[0] + 'Y' : '';

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
    <Drawer title="Care Gap Details" onClose={onClose}>
      {/* ── Patient banner (shared component, same as HCC drawer) ── */}
      <div className={styles.patientBannerWrap}>
        <PatientBanner
          initials={member.in}
          name={member.name}
          gender={GENDER_LABEL[member.gender] ?? member.gender}
          age={ageShort + (member.dob ? ` (${member.dob})` : '')}
          memberId={member.memberId}
          onCall={() => showToast('Call — coming soon')}
        />
      </div>

      {/* ── Gap card ── */}
      <div className={styles.gapCard}>
        <div className={styles.gapCardHeader}>
          <span className={styles.gapName}>{measureName}</span>
          <div className={styles.gapActions}>
            {/* Status dropdown — disabled when Completed (AC-4 lockout) */}
            <div style={{ position: 'relative' }}>
              <button
                className={`${styles.statusBtn} ${STATUS_COLOR[status] ?? ''}`}
                onClick={() => { if (!statusLocked) setStatusOpen(v => !v); }}
                disabled={statusLocked}
                title={statusLocked ? 'Completed gaps are locked' : ''}
                style={statusLocked ? { cursor: 'not-allowed', opacity: 0.75 } : undefined}
              >
                {status}
                {statusLocked ? (
                  <Icon name="solar:lock-keyhole-minimalistic-linear" size={12} />
                ) : (
                  <Icon name="solar:alt-arrow-down-linear" size={12} />
                )}
              </button>
              {statusOpen && !statusLocked && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
                  background: 'var(--neutral-0)', border: '0.5px solid var(--neutral-150)',
                  borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,.1)', padding: 4, minWidth: 130,
                }}>
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        updateGapStatus(member.id, gap.code, s);
                        setStatusOpen(false);
                      }}
                      style={{
                        display: 'block', width: '100%', padding: '7px 12px', background: 'none',
                        border: 'none', textAlign: 'left', fontSize: 13, fontWeight: s === status ? 500 : 400,
                        color: s === status ? 'var(--primary-300)' : 'var(--neutral-400)',
                        cursor: 'pointer', borderRadius: 5, fontFamily: "'Inter', sans-serif",
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Assignee */}
            {member.assignee && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--primary-300)', fontWeight: 500 }}>
                <Icon name="solar:user-circle-linear" size={15} color="var(--primary-300)" />
                {member.assignee}
              </div>
            )}
            <ActionButton icon="solar:menu-dots-bold" size="L" tooltip="More" onClick={() => showToast('More — coming soon')} />
          </div>
        </div>

        {/* Measure year */}
        <div className={styles.measureYearRow}>
          <span className={styles.measureYearLabel}>Measure Year:</span>
          <span className={styles.measureYearValue}>{year}</span>
        </div>

        {/* Info banner */}
        <div style={{ padding: '0 16px 14px' }}>
          <div className={styles.infoBanner}>
            <span className={styles.infoBannerIcon}>
              <Icon name="solar:info-circle-linear" size={15} color="var(--status-info, #1D4ED8)" />
            </span>
            <span>
              Evidence uploaded will be recorded for measurement year {year}. The measurement year filter is displayed above for your reference.
            </span>
          </div>
        </div>
      </div>

      {/* ── Accordion sections ── */}
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

      {/* ── Suggested actions ── */}
      <div className={styles.suggestedActions}>
        <span className={styles.suggestStar}>✦</span>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--neutral-400)', fontFamily: "'Inter', sans-serif", padding: 0 }}
          onClick={() => showToast('Suggested Actions — coming soon')}
        >
          Suggested Actions
        </button>
      </div>

      {/* ── Action buttons ── */}
      <div className={styles.actionBtns}>
        {[
          { label: 'Clinical Note', icon: 'solar:document-add-linear', action: () => setShowClinicalNote(true) },
          { label: 'Referral', icon: 'solar:share-linear', action: () => showToast('Referral — coming soon') },
          { label: 'Task', icon: 'solar:checklist-minimalistic-linear', action: () => showToast('Task — coming soon') },
        ].map(({ label, icon, action }) => (
          <button key={label} className={styles.actionBtn} onClick={action}>
            <Icon name={icon} size={14} color="var(--neutral-300)" />
            + {label}
          </button>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
        <button className={styles.tabMore}>
          <Icon name="solar:alt-arrow-down-linear" size={13} />
        </button>
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'Activity Log' ? (
        <div className={styles.activityLog}>
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
    </Drawer>
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
