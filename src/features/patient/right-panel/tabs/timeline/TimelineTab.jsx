import { useMemo, useState } from 'react';
import { ActivityLog } from '../../../../../components/ActivityLog/ActivityLog';
import { Avatar } from '../../../../../components/Avatar/Avatar';
import { FilterChip } from '../../../../../components/FilterChip/FilterChip';
import { Icon } from '../../../../../components/Icon/Icon';
import { TimelineSkeleton } from '../../../../../components/TimelineSkeleton/TimelineSkeleton';
import { useAppStore } from '../../../../../store/useAppStore';
import { usePatientStream } from '../../../hooks/usePatientStream';
import { STREAM_CATEGORIES, filterStream } from '../../../data/patientStream';
import { TONE_COLOR, kindMeta } from './streamKinds';
import styles from './TimelineTab.module.css';

const CATEGORY_LABEL = Object.fromEntries(STREAM_CATEGORIES.map(c => [c.value, c.label]));
const CATEGORY_VALUE = Object.fromEntries(STREAM_CATEGORIES.map(c => [c.label, c.value]));
const pad = n => String(n).padStart(2, '0');
const monthLabel = d => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
const duration = s => (s >= 60 ? `${Math.floor(s / 60)}m ${pad(s % 60)}s` : `${s}s`);

function KindTile({ kind }) {
  const k = kindMeta(kind);
  return (
    <Avatar
      variant="icon"
      size={24}
      backgroundColor={k.tint}
      borderColor={k.color}
      icon={<Icon name={k.icon} size={14} color={k.color} />}
    />
  );
}

// What "View details" lists: the event's kind and attribution, then its own fields.
function detailsOf(e) {
  return [
    { label: 'Type', value: kindMeta(e.kind).label },
    { label: 'Category', value: CATEGORY_LABEL[e.category] },
    { label: 'Recorded by', value: e.actor ? `${e.actor}${e.actorRole ? ` (${e.actorRole})` : ''}` : null },
    { label: 'Program', value: e.program },
    { label: 'Bills to', value: e.billingProgram && e.billingProgram !== e.program ? e.billingProgram : null },
    { label: 'Duration', value: e.durationSeconds ? duration(e.durationSeconds) : null },
    { label: 'Vendor', value: e.vendor },
    { label: 'Source', value: e.source },
    ...(e.facts || []),
  ];
}

/** Stream events -> ActivityLog entries, newest first, with a header per month. */
function toEntries(events) {
  const out = [];
  let month = null;
  events.forEach((e) => {
    const d = new Date(e.at);
    const label = monthLabel(d);
    if (label !== month) { out.push({ t: 'group', label }); month = label; }
    const hasTime = d.getHours() || d.getMinutes();
    out.push({
      t: 'outreach',
      avatar: <KindTile kind={e.kind} />,
      date: `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`,
      time: hasTime ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null,
      by: e.actor,
      role: e.actorRole,
      context: [e.vendor && `via ${e.vendor}`, e.durationSeconds && duration(e.durationSeconds)].filter(Boolean).join(' · ') || null,
      title: e.title,
      badges: [e.program, e.billingProgram && e.billingProgram !== e.program ? `Bills to ${e.billingProgram}` : null].filter(Boolean),
      outcome: e.outcome || undefined,
      outcomeColor: TONE_COLOR[e.tone],
      details: detailsOf(e),
      note: e.detail || '',
    });
  });
  return out;
}

/**
 * The patient's full timeline: clinical events (labs, ADT, visits,
 * diagnoses, devices, medications, notes, assessments) and touchpoints
 * (calls, messages, visits, appointments) and program updates, newest first,
 * filterable by category, type and program. The Program Activity Log in Care
 * Management stays the per-program timeline.
 */
export function TimelineTab() {
  const patientId = useAppStore(s => s.selectedPatientId);
  const { events, loading } = usePatientStream(patientId);
  const [categories, setCategories] = useState([]);
  const [kinds, setKinds] = useState([]);
  const [programs, setPrograms] = useState([]);

  // Options come from what this patient's stream actually has.
  const kindOptions = useMemo(() => [...new Set(events.map(e => kindMeta(e.kind).label))].sort(), [events]);
  const programOptions = useMemo(() => [...new Set(events.flatMap(e => [e.program, e.billingProgram]).filter(Boolean))].sort(), [events]);
  const labelToKinds = useMemo(() => {
    const m = new Map();
    events.forEach(e => m.set(kindMeta(e.kind).label, [...new Set([...(m.get(kindMeta(e.kind).label) || []), e.kind])]));
    return m;
  }, [events]);

  const shown = useMemo(() => filterStream(events, {
    categories: categories.map(l => CATEGORY_VALUE[l]),
    kinds: kinds.flatMap(l => labelToKinds.get(l) || []),
    programs,
  }), [events, categories, kinds, programs, labelToKinds]);
  const entries = useMemo(() => toEntries(shown), [shown]);
  const filtered = categories.length || kinds.length || programs.length;

  return (
    <div className={styles.wrapper}>
      <div className={styles.inner}>
      <div className={styles.toolbar}>
        <span className={styles.title}>Timeline</span>
        <div className={styles.filters}>
          <FilterChip size="S" label="Category" options={STREAM_CATEGORIES.map(c => CATEGORY_LABEL[c.value])} selected={categories} onChange={setCategories} />
          <FilterChip size="S" label="Type" options={kindOptions} selected={kinds} onChange={setKinds} searchable />
          {programOptions.length > 0 && (
            <FilterChip size="S" label="Program" options={programOptions} selected={programs} onChange={setPrograms} />
          )}
        </div>
      </div>
      {loading
        ? <TimelineSkeleton rows={6} />
        : (
          <ActivityLog
            entries={entries}
            emptyLabel={filtered ? 'Nothing matches these filters.' : 'Nothing recorded for this patient yet.'}
          />
        )}
      </div>
    </div>
  );
}
