import { useEffect, useMemo, useState } from 'react';
import { Drawer } from '../../../../../../../../components/Drawer/Drawer';
import { Timeline } from '../../../../../../../../components/Timeline/Timeline';
import { AuditDetailCard } from '../../../../../../../../components/AuditDetailCard/AuditDetailCard';
import { CarePlanVersionChangesDrawer } from '../CarePlanVersionChangesDrawer/CarePlanVersionChangesDrawer';
import { Link } from '../../../../../../../../components/Link/Link';
import { Avatar } from '../../../../../../../../components/Avatar/Avatar';
import { DownChevronIcon } from '../../../../../../../../components/Icon/DownChevronIcon';
import { useAppStore } from '../../../../../../../../store/useAppStore';
import { templateContents, templateOwnedTitles } from '../../lib/carePlanAuditTemplates';
import styles from './CarePlanHistoryDrawer.module.css';

const TYPE_LABEL = { goal: 'Goal', intervention: 'Intervention', barrier: 'Barrier', share: 'Share', plan: 'Plan' };
const ACTION_LABEL = {
  created: 'Added to Care Plan', updated: 'Edited', status_changed: 'Status Updated',
  progress_changed: 'Progress Updated', value_changed: 'Value Updated',
  deleted: 'Removed from Care Plan', shared: 'Shared', signed: 'Signed',
  note: 'Note', note_deleted: 'Note Removed', restored: 'Restored',
  priority_changed: 'Priority Updated', category_changed: 'Category Updated',
  measure_changed: 'Measure Updated', target_changed: 'Target Updated',
  target_date_changed: 'Target Date Updated', duration_changed: 'Duration Updated',
  frequency_changed: 'Frequency Updated', conditions_changed: 'Conditions Updated',
  type_changed: 'Type Updated', assignee_changed: 'Assignee Updated',
  goal_link_changed: 'Linked Goal Updated', description_changed: 'Description Updated',
};
// Only status and progress carry health; a priority of "High" is not a good
// outcome, so every other change renders its pills in grey.
const TONED_ACTIONS = new Set(['status_changed', 'progress_changed']);
// Long values read better as prose than as a pair of pills.
const PILL_MAX = 32;
// Every entry is a care plan event, so the rail carries the care plan glyph
// throughout rather than branching per action.
const CARE_PLAN_ICON = 'custom:care-plan';
// A change's own wording carries its health, so the from → to pills are toned
// off the value rather than off a status enum we don't have here.
const TONE_WORDS = [
  [/completed|high|good|achieved|met|on track/i, 'success'],
  [/moderate|in progress|partial|fair/i, 'warning'],
  [/poor|low|off track|not started|missed/i, 'error'],
];
function toneFor(value) {
  const hit = TONE_WORDS.find(([re]) => re.test(value || ''));
  return hit ? hit[1] : 'grey';
}

const MM_DD_YYYY = { month: '2-digit', day: '2-digit', year: 'numeric' };
const HH_MM = { hour: 'numeric', minute: '2-digit' };

// One timeline node per signed version. Signing is what cuts a version, so
// every audit row written since the previous signature belongs to the version
// that signature closes. Rows after the newest signature belong to no version
// yet and are deliberately dropped — history records signed plans only.
function groupByVersion(entries) {
  const oldestFirst = [...entries].reverse();
  const groups = [];
  let rows = [];
  for (const e of oldestFirst) {
    if (e.action === 'signed') {
      groups.push({ id: e.id, signed: e, createdAt: e.createdAt, actor: e.actor, rows });
      rows = [];
    } else {
      rows.push(e);
    }
  }
  return groups.reverse();
}

// signCarePlan writes its summary as "Signed (v3)".
function versionLabel(signed) {
  const match = /\(v(\d+)\)/.exec(signed?.summary || '');
  return match ? `v${match[1]}` : null;
}

// Additions and removals are summarised by count, matching the design's
// "Added to Care Plan: 2 Goals · 3 Interventions · 1 Barrier" row, so a
// version that added a dozen items stays one line instead of a dozen.
const ENTITY_NOUN = {
  goal: ['Goal', 'Goals'],
  intervention: ['Intervention', 'Interventions'],
  barrier: ['Barrier', 'Barriers'],
};
const ENTITY_ICON = {
  goal: 'solar:heart-pulse-linear',
  intervention: 'solar:checklist-minimalistic-linear',
  barrier: 'custom:barrier',
};
function countBadges(rows) {
  return Object.keys(ENTITY_NOUN).map(type => {
    const n = rows.filter(r => r.entityType === type).length;
    if (!n) return null;
    const [one, many] = ENTITY_NOUN[type];
    return { label: `${n} ${n === 1 ? one : many}`, icon: ENTITY_ICON[type] };
  }).filter(Boolean);
}

function sectionFor(e) {
  const type = TYPE_LABEL[e.entityType] || e.entityType;
  const action = ACTION_LABEL[e.action] || e.action;
  const title = e.entityType === 'plan' ? e.summary : `${type} : ${e.summary}`;
  // A note reads as a care plan note whatever it hangs off, so the section is
  // titled by the event and the note itself is the body.
  if (e.action === 'note' || e.action === 'note_deleted') {
    return {
      id: e.id,
      title: e.action === 'note' ? 'Care Plan Note Updated' : 'Care Plan Note Removed',
      body: e.detail,
    };
  }
  // "90% - High → 85% - High" and friends become a from → to pill pair; any
  // other detail stays as prose. A config change names its own field, as
  // "Repeat: Off → On", and that label wins over the action's.
  const arrow = (e.detail || '').split('→');
  if (arrow.length === 2) {
    let [from, to] = arrow.map(s => s.trim());
    let label = action;
    const labelled = /^([A-Za-z][^:]{0,39}): (.*)$/.exec(from);
    if (labelled) {
      label = labelled[1];
      from = labelled[2].trim();
    }
    if (from.length <= PILL_MAX && to.length <= PILL_MAX) {
      const toned = TONED_ACTIONS.has(e.action);
      return {
        id: e.id,
        title,
        caption: `${label}:`,
        change: {
          from,
          to,
          fromTone: toned ? toneFor(from) : 'grey',
          toTone: toned ? toneFor(to) : 'grey',
        },
      };
    }
    return { id: e.id, title, caption: `${label}: ${from} → ${to}` };
  }
  return { id: e.id, title, caption: e.detail ? `${action}: ${e.detail}` : action };
}

function templateBadges(row) {
  const c = templateContents(row);
  return Object.keys(ENTITY_NOUN).map(type => {
    const n = (c[`${type}s`] || []).length;
    if (!n) return null;
    const [one, many] = ENTITY_NOUN[type];
    return { label: `${n} ${n === 1 ? one : many}`, icon: ENTITY_ICON[type] };
  }).filter(Boolean);
}

function sectionsFor(group) {
  const templates = group.rows.filter(r => r.entityType === 'template');
  // Items a template brought in are reported under that template, so they do
  // not also swell the loose "Added to Care Plan" count.
  const owned = templateOwnedTitles(templates);
  const isOwned = r => owned.has((r.summary || '').trim().toLowerCase());
  const plain = group.rows.filter(r => r.entityType !== 'template');
  const added = plain.filter(r => r.action === 'created' && !isOwned(r));
  const removed = plain.filter(r => r.action === 'deleted' && !isOwned(r));
  const rest = plain.filter(r => r.action !== 'created' && r.action !== 'deleted');
  const sections = [];
  for (const t of templates) {
    sections.push({
      id: t.id,
      title: `${t.summary} Template ${t.action === 'created' ? 'Added' : 'Removed'}`,
      caption: t.action === 'created' ? 'Added to Care Plan:' : 'Removed from Care Plan:',
      badges: t.action === 'created' ? templateBadges(t) : [],
    });
  }
  if (added.length) {
    sections.push({ id: `${group.id}-added`, title: 'Added to Care Plan', badges: countBadges(added) });
  }
  if (removed.length) {
    sections.push({ id: `${group.id}-removed`, title: 'Removed from Care Plan', badges: countBadges(removed) });
  }
  sections.push(...rest.map(sectionFor));
  if (group.signed.detail) {
    sections.push({ id: `${group.signed.id}-note`, title: 'Sign-off Note', body: group.signed.detail });
  }
  if (sections.length === 0) {
    sections.push({ id: group.id, title: 'No changes recorded in this version' });
  }
  return sections;
}

// Read-only history of everything that happened to this program's care plan —
// edits, status changes, removals and shares (roadmap #9).
export function CarePlanHistoryDrawer({ patientId, program, onClose }) {
  const fetchCarePlanAudit = useAppStore(s => s.fetchCarePlanAudit);
  const key = `${patientId}::${program.id}`;
  const entries = useAppStore(s => s.patientCarePlanAudit[key]);
  const loading = useAppStore(s => s.patientCarePlanAuditLoading[key]);
  const currentUserName = useAppStore(s => s.currentUserProfile?.name);
  const [expanded, setExpanded] = useState(() => new Set());
  const [openVersion, setOpenVersion] = useState(null);

  useEffect(() => {
    if (entries === undefined) fetchCarePlanAudit(patientId, program.id);
  }, [entries, patientId, program.id, fetchCarePlanAudit]);

  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const timelineEntries = useMemo(() => groupByVersion(entries || []).map(g => {
    const at = g.createdAt ? new Date(g.createdAt) : null;
    const isOpen = expanded.has(g.id);
    const version = versionLabel(g.signed);
    return {
      id: g.id,
      createdAt: g.createdAt,
      date: at ? at.toLocaleDateString('en-US', MM_DD_YYYY) : '',
      time: at ? at.toLocaleTimeString('en-US', HH_MM) : '',
      user: g.actor,
      avatar: <Avatar type="icon" variant="others" size="XS" iconName={CARE_PLAN_ICON} />,
      details: (
        <span className={styles.titleRow}>
          <span className={styles.title}>Care Plan Updated</span>
          <span className={styles.dot}>•</span>
          <Link className={styles.detailsLink} onClick={() => toggle(g.id)}>
            View Details
            <DownChevronIcon size={14} className={isOpen ? styles.chevronOpen : undefined} />
          </Link>
        </span>
      ),
      // The open arrow hands the whole version to the itemised view.
      version: g,
      header: [
        `Signed by: ${g.actor || 'Unknown'}`,
        version,
        ...g.rows.filter(r => r.action === 'shared').map(r => `Shared: ${r.summary}`),
      ].filter(Boolean),
      sections: isOpen ? sectionsFor(g) : null,
    };
  }), [entries, expanded]);

  return (
    <Drawer title="Care Plan History" onClose={onClose}>
      <Timeline
        entries={timelineEntries}
        currentUserName={currentUserName}
        renderExtra={entry => (entry.sections
          ? (
            <div className={styles.detailsWrap}>
              <AuditDetailCard
                header={entry.header}
                sections={entry.sections}
                onOpen={() => setOpenVersion(entry.version)}
                openTooltip="View changes"
              />
            </div>
          )
          : null)}
        emptyLabel={loading ? 'Loading history…' : 'No signed care plan versions yet.'}
      />
      {openVersion && (
        <CarePlanVersionChangesDrawer
          rows={openVersion.rows}
          signedAt={openVersion.createdAt}
          onClose={() => setOpenVersion(null)}
        />
      )}
    </Drawer>
  );
}
