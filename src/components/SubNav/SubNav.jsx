import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore } from '../../store/useAppStore';
import { HEDIS_MEMBERS } from '../../features/hedis-worklist/data/mock';
import styles from './SubNav.module.css';

// Define which lists map to which filter criteria
const WORKLISTS = [
  { label: 'SNP', filter: null, view: 'snp' },
  { label: 'Annual Visit', filter: null },
  { label: 'TOC', filter: null },  // default — shows all TOC patients
  { label: 'HCC', filter: null, view: 'hcc' },
  { label: 'HEDIS', filter: null, view: 'hedis' },
  { label: 'CCM', filter: null, view: 'ccm' },
  { label: 'High Utilizers', filter: { readmission: 'Yes' } },
  { label: 'DM', filter: null },
];
const WORKLIST_LABELS = WORKLISTS.map(w => w.label);
const WORKLIST_BY_LABEL = Object.fromEntries(WORKLISTS.map(w => [w.label, w]));

// One draggable worklist row. Drag activates after an 8px pointer move so
// plain clicks still select the list without jitter. registerRef feeds the
// parent's sliding active-indicator measurement alongside dnd-kit's node ref.
function SortableWorklistItem({ item, active, count, onClick, registerRef }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.label });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={(el) => { setNodeRef(el); registerRef(item.label, el); }}
      style={style}
      className={[
        styles.item,
        active ? styles.active : '',
        isDragging ? styles.dragging : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      {item.label}
      <span className={styles.count}>{count}</span>
    </div>
  );
}

export function SubNav({ collapsed }) {
  const activeSubnavList = useAppStore(s => s.activeSubnavList);
  const setActiveSubnavList = useAppStore(s => s.setActiveSubnavList);
  const setActiveFilters = useAppStore(s => s.setActiveFilters);
  const patients = useAppStore(s => s.patients);
  const hccMembers = useAppStore(s => s.hccMembers);
  const awvMembers = useAppStore(s => s.awvMembers || []);
  const ccmWorklistMembers = useAppStore(s => s.ccmWorklistMembers || []);
  const snpWorklistMembers = useAppStore(s => s.snpWorklistMembers || []);
  const fetchHccMembers = useAppStore(s => s.fetchHccMembers);
  const fetchAwvMembers = useAppStore(s => s.fetchAwvMembers);
  const fetchCcmWorklistMembers = useAppStore(s => s.fetchCcmWorklistMembers);
  const fetchSnpWorklistMembers = useAppStore(s => s.fetchSnpWorklistMembers);
  const fetchWorklistOrder = useAppStore(s => s.fetchWorklistOrder);
  const saveWorklistOrder = useAppStore(s => s.saveWorklistOrder);
  const worklistOrder = useAppStore(s => s.worklistOrder);
  const clearSelected = useAppStore(s => s.clearSelected);
  const clearHccSelected = useAppStore(s => s.clearHccSelected);

  // Require an 8px pointer move before a drag starts so ordinary clicks
  // still select the worklist.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Sliding active indicator — one highlight element translated to the
  // active row so switching lists reads as motion, not a hard swap.
  // `ready` gates the first paint so it doesn't fly in from the top.
  const itemRefs = useRef(new Map());
  const registerRef = (key, el) => {
    if (el) itemRefs.current.set(key, el);
    else itemRefs.current.delete(key);
  };
  const [indicator, setIndicator] = useState({ top: 0, height: 0, ready: false });
  // Transitions switch on one frame after the first placement so the
  // indicator appears in position instead of sliding in from the top.
  const [animated, setAnimated] = useState(false);

  // Prefetch HCC, AWV, CCM, and SNP worklists on mount so counts show up
  // right away; the order fetch also lands the user on their top worklist.
  useEffect(() => {
    fetchHccMembers();
    fetchAwvMembers();
    fetchCcmWorklistMembers();
    fetchSnpWorklistMembers();
    fetchWorklistOrder(WORKLIST_LABELS);
  }, []);

  // User-ordered worklists — store order or the default until the fetch
  // resolves. Reconciled here as well (not just in the store) because the
  // localStorage-cached order may predate a newly added worklist.
  const orderedWorklists = useMemo(() => {
    const saved = (worklistOrder || []).filter(l => WORKLIST_BY_LABEL[l]);
    const order = saved.length > 0
      ? [...saved, ...WORKLIST_LABELS.filter(l => !saved.includes(l))]
      : WORKLIST_LABELS;
    return order.map(l => WORKLIST_BY_LABEL[l]);
  }, [worklistOrder]);

  // Move the indicator to the active row after layout, before paint. Re-runs
  // when the order changes so a drop re-anchors the highlight.
  useLayoutEffect(() => {
    const el = itemRefs.current.get(activeSubnavList);
    if (!el) {
      setIndicator(i => ({ ...i, ready: false }));
      return;
    }
    setIndicator({ top: el.offsetTop, height: el.offsetHeight, ready: true });
    if (!animated) requestAnimationFrame(() => setAnimated(true));
  }, [activeSubnavList, orderedWorklists]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lists with a backing worklist (TOC, HCC, HEDIS, CCM, SNP, Annual Visit)
  // show real row counts; the rest have no data source yet and show 0.
  const getCounts = useMemo(() => {
    const counts = {};
    for (const list of WORKLISTS) {
      if (list.view === 'hcc') counts[list.label] = hccMembers.length;
      else if (list.view === 'hedis') counts[list.label] = HEDIS_MEMBERS.length;
      else if (list.view === 'ccm') counts[list.label] = ccmWorklistMembers.length;
      else if (list.view === 'snp') counts[list.label] = snpWorklistMembers.length;
      else if (list.label === 'Annual Visit') counts[list.label] = awvMembers.length;
      else if (list.label === 'TOC') counts[list.label] = patients.length;
      else counts[list.label] = 0;
    }
    return counts;
  }, [patients, hccMembers, awvMembers, ccmWorklistMembers, snpWorklistMembers]);

  // Unique patient count across every worklist. Different worklists use
  // different id spaces (p1, hcc-42, ccmw-001), so we key the union on a
  // normalized memberId (# stripped, trimmed, lowercased) — that's the one
  // field every worklist shares. Patients missing a memberId fall back to
  // their row id so they still count once.
  const allPatientsCount = useMemo(() => {
    const seen = new Set();
    const collect = (rows) => rows.forEach(r => {
      const key = (r?.memberId || r?.id || '').toString().replace(/^#/, '').trim().toLowerCase();
      if (key) seen.add(key);
    });
    collect(patients);
    collect(hccMembers);
    collect(awvMembers);
    collect(HEDIS_MEMBERS);
    collect(ccmWorklistMembers);
    collect(snpWorklistMembers);
    return seen.size;
  }, [patients, hccMembers, awvMembers, ccmWorklistMembers, snpWorklistMembers]);

  const handleListClick = (list) => {
    setActiveSubnavList(list.label);
    // Clear selection from both worklists so selection doesn't bleed across lists
    clearSelected();
    clearHccSelected();
    // Apply the list's filter to the active filters
    if (list.filter) {
      setActiveFilters(list.filter);
    } else {
      setActiveFilters({});
    }
  };

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const labels = orderedWorklists.map(w => w.label);
    const next = arrayMove(labels, labels.indexOf(active.id), labels.indexOf(over.id));
    saveWorklistOrder(next);
  };

  return (
    <aside className={[styles.subnav, collapsed ? styles.collapsed : ''].filter(Boolean).join(' ')}>
      {/* Sliding highlight — one element translated to the active row so
          switching lists animates instead of hard-swapping backgrounds. */}
      <span
        className={[styles.activeIndicator, animated ? styles.activeIndicatorAnimated : ''].filter(Boolean).join(' ')}
        aria-hidden
        style={{
          transform: `translateY(${indicator.top}px)`,
          height: indicator.height,
          opacity: indicator.ready ? 1 : 0,
        }}
      />
      <div className={styles.sectionLabel}>Worklists</div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedWorklists.map(w => w.label)} strategy={verticalListSortingStrategy}>
          {orderedWorklists.map(item => (
            <SortableWorklistItem
              key={item.label}
              item={item}
              active={activeSubnavList === item.label}
              count={getCounts[item.label] || 0}
              onClick={() => handleListClick(item)}
              registerRef={registerRef}
            />
          ))}
        </SortableContext>
      </DndContext>
      <div className={styles.sectionLabel} style={{ marginTop: 8 }}>Patients</div>
      <div
        ref={(el) => registerRef('My Patients', el)}
        className={[styles.item, activeSubnavList === 'My Patients' ? styles.active : ''].filter(Boolean).join(' ')}
        onClick={() => { setActiveSubnavList('My Patients'); clearSelected(); clearHccSelected(); setActiveFilters({}); }}
      >
        My Patients
        <span className={styles.count}>0</span>
      </div>
      <div
        ref={(el) => registerRef('All Patients', el)}
        className={[styles.item, activeSubnavList === 'All Patients' ? styles.active : ''].filter(Boolean).join(' ')}
        onClick={() => { setActiveSubnavList('All Patients'); clearSelected(); clearHccSelected(); setActiveFilters({}); }}
      >
        All Patients
        <span className={styles.count}>{allPatientsCount || 0}</span>
      </div>
      <div
        ref={(el) => registerRef('Scheduling List', el)}
        className={[styles.item, activeSubnavList === 'Scheduling List' ? styles.active : ''].filter(Boolean).join(' ')}
        onClick={() => { setActiveSubnavList('Scheduling List'); clearSelected(); clearHccSelected(); setActiveFilters({}); }}
      >
        Scheduling List
        <span className={styles.count}>{patients.length || 0}</span>
      </div>
      <div className={styles.sectionLabel} style={{ marginTop: 8 }}>Population Groups</div>
      {[
        { label: 'All', value: 'pg:All' },
        { label: 'Static', value: 'pg:Static' },
        { label: 'Dynamic', value: 'pg:Dynamic' },
      ].map(item => (
        <div
          key={item.value}
          ref={(el) => registerRef(item.value, el)}
          className={[styles.item, activeSubnavList === item.value ? styles.active : ''].filter(Boolean).join(' ')}
          onClick={() => { setActiveSubnavList(item.value); clearSelected(); clearHccSelected(); setActiveFilters({}); }}
        >
          {item.label}
        </div>
      ))}
      <div className={styles.sectionLabel} style={{ marginTop: 8 }}>Leads &amp; Contacts</div>

      {/* Archived Worklist — frozen snapshots of worklists, isolated from
          the live versions so upstream changes never alter them. */}
      <div className={styles.sectionLabel} style={{ marginTop: 8 }}>Archived Worklist</div>
      <div
        ref={(el) => registerRef('HCC (Archived)', el)}
        className={[styles.item, activeSubnavList === 'HCC (Archived)' ? styles.active : ''].filter(Boolean).join(' ')}
        onClick={() => { setActiveSubnavList('HCC (Archived)'); clearSelected(); clearHccSelected(); setActiveFilters({}); }}
      >
        HCC
        <span className={styles.count}>{hccMembers.length || 0}</span>
      </div>
    </aside>
  );
}
