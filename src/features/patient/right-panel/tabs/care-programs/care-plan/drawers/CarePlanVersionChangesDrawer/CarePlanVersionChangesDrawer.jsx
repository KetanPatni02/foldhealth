import { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer } from '../../../../../../../../components/Drawer/Drawer';
import { Badge } from '../../../../../../../../components/Badge/Badge';
import { Icon } from '../../../../../../../../components/Icon/Icon';
import { Avatar } from '../../../../../../../../components/Avatar/Avatar';
import { ActivityLog, ViewMoreButton } from '../../../../../../../../components/ActivityLog/ActivityLog';
import { historyTimelineStyles as htStyles } from '../../../../../../../../components/HistoryTimeline/HistoryTimeline';
import {
  templateContents,
  templateOwnedTitles,
  templateTitles,
  withLiveLinks,
} from '../../lib/carePlanAuditTemplates';
import { NOTE_ACTIONS, netVersionRows } from '../../lib/carePlanVersions';
import styles from './CarePlanVersionChangesDrawer.module.css';

const ENTITY_NOUN = {
  goal: ['Goal', 'Goals'],
  intervention: ['Intervention', 'Interventions'],
  barrier: ['Barrier', 'Barriers'],
  plan: ['Plan', 'Plans'],
};
const TYPE_LABEL = {
  goal: 'Goal', intervention: 'Intervention', barrier: 'Barrier',
  share: 'Share', plan: 'Plan',
};
const ACTION_LABEL = {
  status_changed: 'Status Updated', progress_changed: 'Progress Updated',
  value_changed: 'Value Updated', priority_changed: 'Priority Updated',
  category_changed: 'Category Updated', measure_changed: 'Measure Updated',
  target_changed: 'Target Updated', target_date_changed: 'Target Date Updated',
  duration_changed: 'Duration Updated', frequency_changed: 'Frequency Updated',
  conditions_changed: 'Conditions Updated', type_changed: 'Type Updated',
  assignee_changed: 'Assignee Updated', goal_link_changed: 'Linked Goal Updated',
  description_changed: 'Description Updated', updated: 'Edited',
  shared: 'Shared', restored: 'Restored',
};
const TONED_ACTIONS = new Set(['status_changed', 'progress_changed']);
const TONE_WORDS = [
  [/completed|high|good|achieved|met|on track/i, 'success'],
  [/moderate|in progress|partial|fair/i, 'warning'],
  [/poor|low|off track|not started|missed/i, 'error'],
];
function toneFor(value) {
  const hit = TONE_WORDS.find(([re]) => re.test(value || ''));
  return hit ? hit[1] : 'grey';
}

// How long the arrived-here highlight stays up.
const HIGHLIGHT_MS = 2000;

// Rail glyph per activity, so a node says what kind of change it is at a
// glance. Entity buckets carry the same icons the plan's own rows use.
const ENTITY_ICON = {
  goal: 'solar:flag-linear',
  // ActivityLog's own task glyph — an intervention is a task on the plan.
  intervention: 'solar:clipboard-check-linear',
  barrier: 'custom:barrier',
  plan: 'custom:care-plan',
};
const TEMPLATE_ICON = 'custom:care-plan';
const NOTE_ICON = 'solar:notes-linear';
const CHANGE_ICON = 'solar:refresh-linear';

function countLabel(type, n) {
  const [one, many] = ENTITY_NOUN[type] || [type, `${type}s`];
  return `${n} ${n === 1 ? one : many}`;
}

// One node per kind of change: additions and removals collapse into a counted
// heading listing what moved, and everything else keeps its own node so the
// before → after stays readable.
function buildNodes(rawRows, plan) {
  const nodes = [];
  // Only the net difference between this signature and the previous one.
  const allRows = netVersionRows(rawRows);
  const templates = allRows.filter(r => r.entityType === 'template');
  // What a template brought in is listed under that template, not again as a
  // loose addition.
  const owned = templateOwnedTitles(templates);
  // Sharing only happens as part of signing, so it is folded into the version
  // rather than listed as a change of its own.
  const rows = allRows.filter(r => r.entityType !== 'template'
    && r.action !== 'shared'
    && !((r.action === 'created' || r.action === 'deleted')
      && owned.has((r.summary || '').trim().toLowerCase())));

  for (const t of templates) {
    const c = withLiveLinks(templateContents(t), plan);
    const counts = templateTitles(t);
    const groups = [];
    if (c.goals.length) {
      groups.push({
        anchor: `${t.id}-goal`,
        heading: countLabel('goal', c.goals.length),
        // Each goal carries what the template linked to it, so the tree shows
        // the linkage instead of three unrelated lists.
        tree: c.goals.map(g => ({
          title: g.title,
          icon: ENTITY_ICON.goal,
          children: [
            ...g.interventions.map(title => ({ title, icon: ENTITY_ICON.intervention })),
            ...g.barriers.map(title => ({ title, icon: ENTITY_ICON.barrier })),
          ],
        })),
      });
    }
    // Anything the template brought that hangs off no goal of its own.
    for (const type of ['intervention', 'barrier']) {
      const loose = c[`${type}s`];
      if (!loose.length) continue;
      groups.push({
        anchor: `${t.id}-${type}`,
        heading: countLabel(type, loose.length),
        tree: loose.map(title => ({ title, icon: ENTITY_ICON[type] })),
      });
    }
    nodes.push({
      id: t.id,
      anchor: t.id,
      icon: TEMPLATE_ICON,
      heading: `${t.summary} Template ${t.action === 'created' ? 'Added' : 'Removed'}`,
      counts,
      groups,
    });
  }

  const bucket = (action, verb) => {
    const matching = rows.filter(r => r.action === action);
    for (const type of Object.keys(ENTITY_NOUN)) {
      const ofType = matching.filter(r => r.entityType === type);
      if (ofType.length === 0) continue;
      nodes.push({
        id: `${action}-${type}`,
        anchor: `${action}-${type}`,
        icon: ENTITY_ICON[type] || ENTITY_ICON.plan,
        heading: `${countLabel(type, ofType.length)} ${verb}`,
        items: ofType.map(r => r.summary).filter(Boolean),
      });
    }
  };
  bucket('created', 'added');
  bucket('deleted', 'removed');

  for (const r of rows) {
    if (r.action === 'created' || r.action === 'deleted') continue;
    if (NOTE_ACTIONS.has(r.action)) {
      const removed = r.action !== 'note';
      nodes.push({
        id: r.id,
        anchor: r.id,
        icon: NOTE_ICON,
        heading: removed ? 'Care Plan Note Removed' : 'Care Plan Note Updated',
        items: removed || !r.detail ? [] : [r.detail],
      });
      continue;
    }
    const type = TYPE_LABEL[r.entityType] || r.entityType;
    const heading = r.entityType === 'plan'
      ? `${r.summary} Updated`
      : `${type} - ${r.summary} Updated`;
    const arrow = (r.detail || '').split('→');
    if (arrow.length === 2) {
      let [from, to] = arrow.map(v => v.trim());
      let label = ACTION_LABEL[r.action] || r.action;
      const labelled = /^([A-Za-z][^:]{0,39}): (.*)$/.exec(from);
      if (labelled) {
        label = labelled[1];
        from = labelled[2].trim();
      }
      const toned = TONED_ACTIONS.has(r.action);
      nodes.push({
        id: r.id,
        anchor: r.id,
        icon: CHANGE_ICON,
        heading,
        change: {
          label,
          from,
          to,
          fromTone: toned ? toneFor(from) : 'grey',
          toTone: toned ? toneFor(to) : 'grey',
        },
      });
      continue;
    }
    nodes.push({
      id: r.id,
      anchor: r.id,
      icon: ENTITY_ICON[r.entityType] || CHANGE_ICON,
      heading,
      items: r.detail ? [r.detail] : [ACTION_LABEL[r.action] || r.action],
    });
  }
  return nodes;
}

/**
 * Care Plan version changes — the itemised view behind a History entry's
 * open arrow. Where the History card counts what moved, this names it.
 *
 * @param {Array}  props.rows      Audit rows belonging to one signed version.
 * @param {string} props.signedAt  ISO timestamp of that version's signature.
 * @param {string} [props.anchor]  Block to scroll to on open, set when the
 *   caller arrives from a count badge.
 * @param {object} [props.plan]    Current plan slice, used to infer template
 *   linkage for rows signed before it was recorded.
 */
export function CarePlanVersionChangesDrawer({ rows, signedAt, anchor, plan, onClose }) {
  const nodes = useMemo(() => buildNodes(rows || [], plan), [rows, plan]);
  const bodyRef = useRef(null);
  // Entries open by default; the toggle is there to fold long ones away.
  const [collapsed, setCollapsed] = useState(() => new Set());
  const toggle = (id) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  useEffect(() => {
    if (!anchor) return undefined;
    const el = bodyRef.current?.querySelector(`[data-anchor="${anchor}"]`);
    if (!el) return undefined;
    el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    // The anchor names a block, but the design flashes the whole entry it sits
    // in, so the highlight climbs to the row.
    const target = el.closest(`.${htStyles.row}`) || el;
    target.classList.add(styles.highlight);
    const timer = setTimeout(() => target.classList.remove(styles.highlight), HIGHLIGHT_MS);
    return () => {
      clearTimeout(timer);
      target.classList.remove(styles.highlight);
    };
  }, [anchor, nodes]);

  const at = signedAt ? new Date(signedAt) : null;
  const stamp = at && !Number.isNaN(at.getTime())
    ? `${at.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} ${at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : '';

  const title = (
    <span className={styles.titleWrap}>
      <span>Care Plan</span>
      {stamp && <span className={styles.subtitle}>Version Dated {stamp}</span>}
    </span>
  );

  // The version is one moment in time, so entries carry no timestamps of their
  // own — the drawer's subtitle already dates them.
  const logEntries = nodes.map(node => ({
    t: 'care_plan_change',
    id: node.id,
    avatar: <Avatar type="icon" variant="others" size="XS" iconName={node.icon || ENTITY_ICON.plan} />,
    render: () => {
      const open = !collapsed.has(node.id);
      return (
        <div data-anchor={node.anchor}>
          <div className={htStyles.headlineRow}>
            <span className={htStyles.headline}>{node.heading}</span>
            <ViewMoreButton expanded={open} onToggle={() => toggle(node.id)} />
          </div>
          {open && (
            <>
              {node.items?.length > 0 && (
                <ul className={styles.items}>
                  {node.items.map((item, k) => <li key={k}>{item}</li>)}
                </ul>
              )}
              {node.groups?.map((group, gi) => (
                <div key={gi} className={styles.group} data-anchor={group.anchor}>
                  <span className={styles.groupHeading}>{group.heading}</span>
                  <span className={styles.groupRule} />
                  {group.tree.map((item, k) => (
                    <div key={k}>
                      <div className={styles.treeRow}>
                        <Avatar type="icon" variant="others" size="XS" iconName={item.icon} />
                        <span className={styles.treeTitle}>{item.title}</span>
                      </div>
                      {item.children?.map((child, ci) => (
                        <div key={ci} className={styles.treeChild}>
                          <div className={styles.treeRow}>
                            <Avatar type="icon" variant="others" size="XS" iconName={child.icon} />
                            <span className={styles.treeTitle}>{child.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
              {node.change && (
                <div className={styles.change}>
                  <span>{node.change.label}:</span>
                  <Badge tone={node.change.fromTone} size="S" label={node.change.from} />
                  <Icon name="solar:arrow-right-linear" size={16} color="var(--neutral-200)" />
                  <Badge tone={node.change.toTone} size="S" label={node.change.to} />
                </div>
              )}
            </>
          )}
        </div>
      );
    },
  }));

  return (
    <Drawer title={title} onClose={onClose}>
      <div ref={bodyRef}>
        <ActivityLog entries={logEntries} emptyLabel="No changes recorded in this version." />
      </div>
    </Drawer>
  );
}
