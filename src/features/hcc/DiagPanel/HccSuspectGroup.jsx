import { useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Icon } from '../../../components/Icon/Icon';
import { Button } from '../../../components/Button/Button';
import { Select } from '../../../components/Select/Select';
import styles from './HccSuspectGroup.module.css';

/**
 * HccSuspectGroup — collapsible per-HCC section for AI suspects/recaptures
 * (Paper 1WXT "HCC Expand Collapse"; RA coder workflow plan §B3; see
 * docs/features/hcc-coding-workflow.md).
 *
 * Suspect/recapture rows deliberately differ from standard ICD rows:
 *  - The ICD code arrives directly from Astrana's API (no HCC→ICD mapping
 *    step); the code dropdown exists only for override/correction.
 *  - Primary actions are **Missed** (accept-equivalent: sends the entry to
 *    the ASM file as an "Added" record and flags the physician) and
 *    **Dismiss** (decline-equivalent) — visible by default, never buried in
 *    an overflow menu.
 *  - Selecting a DOS (single-select, tied to the existing document — no
 *    custom dates) auto-populates Rendering Provider and POS.
 */
export function HccSuspectGroup({ hcc, icds, dosList = [], member, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const acceptHccGap = useAppStore(s => s.acceptHccGap);
  const dismissHccGap = useAppStore(s => s.dismissHccGap);
  const openIcdPanel = useAppStore(s => s.openIcdPanel);
  const openIcdActivityLog = useAppStore(s => s.openIcdActivityLog);
  const showToast = useAppStore(s => s.showToast);

  const openIcds = icds.filter(i => !['Accepted', 'Dismissed'].includes(i.status));
  const isOpen = openIcds.length > 0;
  const rafSum = icds.reduce((sum, i) => sum + (Number(i.raf) || 0), 0);
  const hasOverrides = icds.some(i => i.dismissReason);

  return (
    <section className={styles.group}>
      <button type="button" className={styles.header} onClick={() => setOpen(o => !o)}>
        <span className={styles.title}>{hcc}</span>
        <span className={styles.meta}>
          <span className={isOpen ? styles.openChip : styles.closedChip}>
            {isOpen ? 'Open' : 'Closed'}
          </span>
          {rafSum > 0 && (
            <span className={styles.rafChip}>
              RAF: {rafSum.toFixed(3)}
              <Icon name="solar:arrow-up-linear" size={11} color="var(--status-success)" />
            </span>
          )}
          {hasOverrides && (
            <span className={styles.overridesChip}>
              <Icon name="solar:refresh-linear" size={11} />
              Overrides
            </span>
          )}
        </span>
        <Icon
          name={open ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
          size={14}
          color="var(--neutral-300)"
        />
      </button>

      {open && (
        <div className={styles.body}>
          {icds.map((icd, i) => (
            <SuspectRow
              key={`${icd.code}-${i}`}
              icd={icd}
              dosList={dosList}
              member={member}
              onMissed={(dos) => {
                acceptHccGap(icd.code);
                showToast?.(`${icd.code} sent to ASM file as "Added"${dos ? ` for DOS ${dos}` : ''} — physician flagged`);
              }}
              onDismiss={() => dismissHccGap(icd.code, 'Dismissed suspect')}
              openIcdPanel={openIcdPanel}
              openIcdActivityLog={openIcdActivityLog}
              showToast={showToast}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SuspectRow({ icd, dosList, member, onMissed, onDismiss, openIcdPanel, openIcdActivityLog, showToast }) {
  const [dos, setDos] = useState('');
  const resolved = ['Accepted', 'Dismissed'].includes(icd.status);

  // DOS selection is single-select, restricted to the document's existing
  // DOSs; picking one auto-populates Rendering Provider + POS from it.
  const dosEntry = dos ? dosList.find(d => d.date === dos) : null;
  const provider = dosEntry?.provider || member?.rp || '';
  const pos = dosEntry?.posDesc || dosEntry?.pos || member?.posDesc || member?.pos || '';

  return (
    <div className={styles.suspectRow}>
      <div className={styles.rowTop}>
        <button
          type="button"
          className={styles.icdSelect}
          title="Override with a corrected code — coming soon"
          onClick={() => showToast?.('Code override — coming soon')}
        >
          <span className={styles.icdSelectText}>{icd.code} {icd.desc}</span>
          <Icon name="solar:alt-arrow-down-linear" size={13} color="var(--neutral-300)" />
        </button>
        <span className={styles.rowCounters}>
          <button type="button" className={styles.counter} title="Documents" onClick={() => openIcdPanel('documents', icd.code)}>
            <Icon name="solar:file-text-linear" size={13} />
            {icd.docs ?? 0}
          </button>
          <button type="button" className={styles.counter} title="Comments" onClick={() => openIcdPanel('comments', icd.code)}>
            <Icon name="solar:chat-round-line-linear" size={13} />
            {icd.cmts ?? 0}
          </button>
          <button type="button" className={styles.counter} title="Activity" onClick={() => openIcdActivityLog(icd.code)}>
            <Icon name="solar:notes-linear" size={13} />
            {icd.notes ?? 0}
          </button>
        </span>
      </div>

      <div className={styles.rowChips}>
        <span className={styles.hccChip}>{(icd.hcc || '').split(' - ')[0] || 'No HCC'}</span>
        {icd.type && <span className={styles.suspectChip}>{icd.type}</span>}
      </div>

      {!resolved && (
        <div className={styles.dosPickRow}>
          <div className={styles.dosPick}>
            <Select
              options={dosList.map(d => ({ value: d.date, label: d.date }))}
              value={dos}
              placeholder="Select DOS"
              onChange={setDos}
            />
          </div>
          {dos && (
            <span className={styles.autoFields}>
              <span className={styles.autoField}>
                <span className={styles.autoFieldLabel}>Provider</span>
                {provider || '—'}
              </span>
              <span className={styles.autoField}>
                <span className={styles.autoFieldLabel}>POS</span>
                {pos || '—'}
              </span>
            </span>
          )}
        </div>
      )}

      <div className={styles.rowConfirm}>
        {resolved ? (
          <span className={icd.status === 'Accepted' ? styles.resolvedAccepted : styles.resolvedDeclined}>
            <Icon
              name={icd.status === 'Accepted' ? 'solar:check-circle-linear' : 'solar:close-circle-linear'}
              size={13}
            />
            {icd.status === 'Accepted' ? 'Sent to ASM as "Added"' : 'Dismissed'}
          </span>
        ) : (
          <>
            <span className={styles.confirmPrompt}>Are you sure this ICD is correctly coded?</span>
            <span className={styles.confirmActions}>
              <Button
                variant="secondary"
                size="S"
                leadingIcon="solar:flag-linear"
                onClick={() => onMissed(dos)}
              >
                Missed
              </Button>
              <Button variant="ghost" size="S" onClick={onDismiss}>Dismiss</Button>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
