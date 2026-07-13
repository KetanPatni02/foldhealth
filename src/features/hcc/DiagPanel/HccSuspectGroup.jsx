import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../../store/useAppStore';
import { Icon } from '../../../components/Icon/Icon';
import { CheckIcon } from '../../../components/Icon/CheckIcon';
import { Button } from '../../../components/Button/Button';
import { useIcdSearch } from '../../../lib/icd/useIcdSearch';
import { DismissReasonForm } from './DismissReasonForm';
import { reviewedByLabel } from '../reviewedBy';
import styles from './HccSuspectGroup.module.css';

/**
 * SuspectCard — one card per AI suspect / recapture ICD (Paper 1WXT; RA coder
 * workflow §B3; Figma ICD-Import 4278-67296; see docs/features/hcc-coding-
 * workflow.md). Rendered as a flat list under "Suspects and Recaptures" (no
 * per-HCC section header).
 *
 * Flow: the code can be **switched** to a corrected one via an in-dropdown ICD
 * search (WHO ICD-11); a **single DOS** is then chosen (from the document's
 * existing encounters, which supply Rendering Provider + POS); only then — with
 * both an ICD and a DOS selected — can the coder flag **Missed Opportunity** or
 * **Dismiss** it (primary, at the DOS level), or **Accept** / **Defer** from the
 * ⋯ menu. State uses the same per-(code × DOS) store the confirmed ICD card
 * uses, so both behave identically.
 */
export function SuspectCard({ icd, dosList = [], member }) {
  const openIcdPanel = useAppStore(s => s.openIcdPanel);
  const openIcdActivityLog = useAppStore(s => s.openIcdActivityLog);
  const dosActions = useAppStore(s => s.hccGapDosActions);
  const dosMeta = useAppStore(s => s.hccGapDosMeta);
  const setDosAction = useAppStore(s => s.setHccGapDosAction);
  const dismissDos = useAppStore(s => s.dismissHccGapDos);

  // ICD switch — the displayed code can be corrected via the in-dropdown search.
  const [override, setOverride] = useState(null); // { code, desc }
  const code = override?.code || icd.code;
  const desc = override?.desc || icd.desc;

  // Single DOS selection (from the document's existing encounters). When the
  // document has exactly one encounter, pre-select it so the coder can act
  // immediately (Accept / Reject / Defer / Missed) without opening the picker.
  // Multiple DOS → the user must pick one via the dropdown.
  const [dos, setDos] = useState(() => (dosList.length === 1 ? dosList[0]?.date || '' : ''));
  const [dosOpen, setDosOpen] = useState(false);
  const dosBtnRef = useRef(null);
  const singleDos = dosList.length === 1;
  useEffect(() => {
    // Keep pre-selection in sync if dosList later resolves to a single entry.
    if (!dos && dosList.length === 1) setDos(dosList[0]?.date || '');
  }, [dosList, dos]);

  // Per-(code × DOS) action state — same store the confirmed ICD card uses.
  const key = dos ? `${icd.code}|${dos}` : null;
  const action = key ? (dosActions[key] || null) : null;
  const meta = key ? (dosMeta[key] || null) : null;

  const [dismissOpen, setDismissOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const moreRef = useRef(null);

  // Actions unlock only once an ICD *and* a DOS are chosen.
  const canAct = !!code && !!dos && !action;

  useEffect(() => {
    if (!menuPos) return undefined;
    const onDoc = (e) => {
      if (!moreRef.current?.contains(e.target) && !e.target.closest?.('[data-suspect-menu]')) setMenuPos(null);
    };
    const onKey = (e) => { if (e.key === 'Escape') setMenuPos(null); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [menuPos]);

  const openMenu = () => {
    const r = moreRef.current?.getBoundingClientRect();
    if (r) setMenuPos({ top: r.bottom + 4, left: Math.max(8, r.right - 180) });
  };

  const missed = () => setDosAction(icd.code, dos, 'missed');
  const accept = () => { setDosAction(icd.code, dos, 'accepted'); setMenuPos(null); };
  const defer = () => { setDosAction(icd.code, dos, 'deferred'); setMenuPos(null); };
  const undo = () => setDosAction(icd.code, dos, action);
  const confirmDismiss = (reason, note) => { dismissDos(icd.code, dos, reason, note); setDismissOpen(false); };

  const isRejected = action === 'rejected';

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div className={styles.headMain}>
          <IcdCombobox
            code={code}
            desc={desc}
            onSelect={(picked) => setOverride({ code: picked.code, desc: picked.title || picked.desc || '' })}
          />
          {reviewedByLabel(icd.by) && (
            <div className={styles.lastLine}>Last Reviewed by {reviewedByLabel(icd.by)} • {icd.last}</div>
          )}
        </div>
        <span className={styles.counters}>
          <button type="button" className={styles.counter} title="Comments" onClick={() => openIcdPanel('comments', code)}>
            <Icon name="solar:chat-round-line-linear" size={13} />
            {icd.cmts ?? 0}
          </button>
          <span className={styles.counterDivider} />
          <button type="button" className={styles.counter} title="Activity" onClick={() => openIcdActivityLog(code)}>
            <Icon name="solar:history-linear" size={13} />
            {(icd.docs ?? 0) + (icd.notes ?? 0)}
          </button>
        </span>
      </div>

      <div className={styles.chips}>
        <span className={styles.hccChip}>{(icd.hcc || '').split(' - ')[0] || 'No HCC'}</span>
        {icd.type && <span className={styles.suspectChip}>{icd.type}</span>}
      </div>

      <div className={styles.dosRow}>
        <button
          ref={dosBtnRef}
          type="button"
          className={[styles.dosButton, dos ? styles.dosButtonActive : ''].filter(Boolean).join(' ')}
          disabled={!!action || singleDos}
          onClick={() => (singleDos ? null : setDosOpen(o => !o))}
          title={singleDos ? 'Only encounter available' : 'Select a DOS'}
        >
          <span>{dos || 'Select DOS'}</span>
          {!singleDos && (
            <Icon name="solar:alt-arrow-down-linear" size={13} color={dos ? 'var(--primary-300)' : 'var(--neutral-300)'} />
          )}
        </button>
        <div className={styles.dosActions}>
          {action ? (
            <>
              <ResolvedPill action={action} />
              {isRejected && (
                <button type="button" className={styles.dismissReasonLink} title={meta?.reason || 'View dismiss reason'} onClick={() => setDismissOpen(true)}>
                  Dismiss Reason
                  <Icon name="solar:info-circle-linear" size={12} />
                </button>
              )}
              <button type="button" className={styles.undoBtn} title="Undo" aria-label="Undo" onClick={undo}>
                <Icon name="solar:undo-left-round-linear" size={15} />
              </button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="S" leadingIcon="solar:flag-linear" disabled={!canAct} onClick={missed}>
                Missed Opportunity
              </Button>
              <Button
                variant="ghost" size="S"
                disabled={!canAct}
                className={dismissOpen ? styles.dismissBtnActive : ''}
                onClick={() => setDismissOpen(v => !v)}
              >
                Dismiss
              </Button>
              <button
                ref={moreRef}
                type="button"
                className={styles.moreBtn}
                aria-label="More actions" title={canAct ? 'More actions' : 'Select an ICD and DOS first'}
                disabled={!canAct}
                onClick={() => (menuPos ? setMenuPos(null) : openMenu())}
              >
                <Icon name="solar:menu-dots-linear" size={15} />
              </button>
            </>
          )}
        </div>

        {dosOpen && (
          <DosDropdown
            anchorRef={dosBtnRef}
            dosList={dosList}
            member={member}
            selected={dos}
            onSelect={(d) => { setDos(d); setDosOpen(false); }}
            onClose={() => setDosOpen(false)}
          />
        )}
      </div>

      {dismissOpen && (
        <DismissReasonForm
          initialReason={meta?.reason || ''}
          initialNote={meta?.note || ''}
          onCancel={() => setDismissOpen(false)}
          onConfirm={confirmDismiss}
        />
      )}

      {menuPos && createPortal(
        <div data-suspect-menu className={styles.moreMenu} style={{ top: menuPos.top, left: menuPos.left }}>
          <button type="button" className={styles.moreItem} onClick={accept}>
            <Icon name="solar:check-circle-linear" size={14} color="var(--neutral-400)" />
            Accept
          </button>
          <button type="button" className={styles.moreItem} onClick={defer}>
            <Icon name="solar:alarm-linear" size={14} color="var(--neutral-400)" />
            Defer
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}

// Terminal-state pill + icon.
function ResolvedPill({ action }) {
  if (action === 'accepted') {
    return <span className={styles.acceptedPill}><CheckIcon size={13} color="currentColor" /> Accepted</span>;
  }
  if (action === 'rejected') {
    return <span className={styles.dismissedPill}><Icon name="solar:close-circle-linear" size={13} color="currentColor" /> Dismissed</span>;
  }
  if (action === 'missed') {
    return <span className={styles.warnPill}><CheckIcon size={13} color="currentColor" /> Missed Opportunity</span>;
  }
  return <span className={styles.warnPill}><Icon name="solar:alarm-linear" size={13} color="currentColor" /> Deferred</span>;
}

// ── ICD combobox — button opens a dropdown with an in-dropdown search field.
// The current code is pre-selected; typing searches the live WHO ICD-11 API.
function IcdCombobox({ code, desc, onSelect }) {
  const btnRef = useRef(null);
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.icdComboWrap}>
      <button
        ref={btnRef}
        type="button"
        className={styles.icdSelect}
        title="Switch to a corrected ICD code"
        onClick={() => setOpen(o => !o)}
      >
        <span className={styles.icdSelectText}>{code} {desc}</span>
        <Icon name="solar:alt-arrow-down-linear" size={13} color="var(--neutral-300)" />
      </button>
      {open && (
        <IcdComboPopover
          anchorRef={btnRef}
          currentCode={code}
          currentDesc={desc}
          onSelect={(picked) => { onSelect(picked); setOpen(false); }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function IcdComboPopover({ anchorRef, currentCode, currentDesc, onSelect, onClose }) {
  const { query, setQuery, results, loading } = useIcdSearch({ minChars: 2 });
  const [pos, setPos] = useState(null);

  useEffect(() => {
    const r = anchorRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 340) });
  }, [anchorRef]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!pos) return null;

  const searching = query.trim().length >= 2;
  // Empty query → show the current code (pre-selected). Typing → live results.
  const list = searching ? results.filter(r => r.code) : [{ code: currentCode, title: currentDesc }];

  return createPortal(
    <>
      <div className={styles.comboOverlay} onClick={onClose} />
      <div className={styles.comboMenu} style={{ top: pos.top, left: pos.left, width: pos.width }}>
        <div className={styles.comboSearch}>
          <Icon name="solar:magnifer-linear" size={14} color="var(--neutral-300)" />
          <input
            autoFocus
            type="text"
            placeholder="Search ICD code or description…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className={styles.comboList}>
          {list.map((r) => {
            const isCurrent = r.code === currentCode;
            return (
              <button
                key={r.code}
                type="button"
                className={[styles.comboOption, isCurrent ? styles.comboOptionActive : ''].filter(Boolean).join(' ')}
                onClick={() => onSelect(r)}
              >
                <span className={styles.comboCode}>{r.code}</span>
                <span className={styles.comboTitle}>{r.title}</span>
                {isCurrent && (
                  <span className={styles.comboCheck}><CheckIcon size={14} color="var(--primary-300)" /></span>
                )}
              </button>
            );
          })}
          {searching && !list.length && (
            <div className={styles.comboStatus}>{loading ? 'Searching…' : 'No matching ICD codes'}</div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

// Portaled DOS picker — one radio per document encounter, showing the date with
// its Rendering Provider + POS (Figma 4278-67296 "Select DOS" dropdown).
function DosDropdown({ anchorRef, dosList, member, selected, onSelect, onClose }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    const r = anchorRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 280) });
  }, [anchorRef]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!pos) return null;

  return createPortal(
    <>
      <div className={styles.dosOverlay} onClick={onClose} />
      <div className={styles.dosMenu} style={{ top: pos.top, left: pos.left, width: pos.width }}>
        <div className={styles.dosMenuHead}>Select DOS</div>
        {dosList.length === 0 && <div className={styles.dosEmpty}>No encounters available</div>}
        {dosList.map((d) => {
          const provider = d.provider || member?.rp || '—';
          const posCode = d.pos || d.posDesc || member?.pos || member?.posDesc || '—';
          const active = selected === d.date;
          return (
            <button
              key={d.date}
              type="button"
              className={styles.dosOption}
              onClick={() => onSelect(d.date)}
            >
              <span className={[styles.dosRadio, active ? styles.dosRadioActive : ''].filter(Boolean).join(' ')}>
                {active && <span className={styles.dosRadioDot} />}
              </span>
              <span className={styles.dosOptionText}>
                <span className={styles.dosOptionDate}>{d.date}</span>
                <span className={styles.dosOptionMeta}>Provider: {provider} · POS: {posCode}</span>
              </span>
            </button>
          );
        })}
      </div>
    </>,
    document.body,
  );
}
