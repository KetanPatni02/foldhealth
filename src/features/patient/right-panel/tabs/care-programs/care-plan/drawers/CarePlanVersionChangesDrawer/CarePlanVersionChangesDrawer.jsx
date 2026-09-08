import { useEffect, useMemo, useRef } from 'react';
import { Drawer } from '../../../../../../../../components/Drawer/Drawer';
import { Badge } from '../../../../../../../../components/Badge/Badge';
import { Icon } from '../../../../../../../../components/Icon/Icon';
import { Avatar } from '../../../../../../../../components/Avatar/Avatar';
import { templateContents, templateOwnedTitles } from '../../lib/carePlanAuditTemplates';
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
  intervention: 'solar:clipboard-list-linear',
  barrier: 'custom:barrier',
  plan: 'custom:care-plan',
};
const TEMPLATE_ICON = 'solar:bookmark-linear';
const NOTE_ICON = 'solar:notes-linear';
const CHANGE_ICON = 'solar:refresh-linear';

function countLabel(type, n) {
  const [one, many] = ENTITY_NOUN[type] || [type, `${type}s`];
  return `${n} ${n === 1 ? one : many}`;
}

// One node per kind of change: additions and removals collapse into a counted
// heading listing what moved, and everything else keeps its own node so the
// before → after stays readable.
function buildNodes(allRows) {
  const nodes = [];
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
    const c = templateContents(t);
    nodes.push({
      id: t.id,
      icon: TEMPLATE_ICON,
      heading: `${t.summary} Template ${t.action === 'created' ? 'Added' : 'Removed'}`,
      groups: Object.keys(ENTITY_NOUN)
        .map(type => ({ type, items: c[`${type}s`] || [] }))
        .filter(g => g.items.length > 0)
        .map(g => ({
          anchor: `${t.id}-${g.type}`,
          heading: countLabel(g.type, g.items.length),
          items: g.items,
        })),
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
    if (r.action === 'note' || r.action === 'note_deleted') {
      nodes.push({
        id: r.id,
        icon: NOTE_ICON,
        heading: r.action === 'note' ? 'Care Plan Note Updated' : 'Care Plan Note Removed',
        items: r.detail ? [r.detail] : [],
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
 */
export function CarePlanVersionChangesDrawer({ rows, signedAt, anchor, onClose }) {
  const nodes = useMemo(() => buildNodes(rows || []), [rows]);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!anchor) return undefined;
    const el = bodyRef.current?.querySelector(`[data-anchor="${anchor}"]`);
    if (!el) return undefined;
    el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    // The badge names a block, but the design flashes the whole entry it sits
    // in, so the highlight climbs to the node.
    const target = el.closest(`.${styles.node}`) || el;
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

  return (
    <Drawer title={title} onClose={onClose}>
      {nodes.length === 0 ? (
        <p className={styles.empty}>No changes recorded in this version.</p>
      ) : (
        <div className={styles.list} ref={bodyRef}>
          {nodes.map((node, i) => (
            <div key={node.id} className={styles.node} data-anchor={node.anchor}>
              <div className={styles.gutter}>
                <div className={`${styles.railTop} ${i === 0 ? styles.railHidden : ''}`} />
                <Avatar
                  type="icon"
                  variant="others"
                  size="XS"
                  iconName={node.icon || ENTITY_ICON.plan}
                />
                <div className={`${styles.railRest} ${i === nodes.length - 1 ? styles.railHidden : ''}`} />
              </div>
              <div className={styles.body}>
                <span className={styles.heading}>{node.heading}</span>
                {node.items?.length > 0 && (
                  <ul className={styles.items}>
                    {node.items.map((item, k) => <li key={k}>{item}</li>)}
                  </ul>
                )}
                {node.groups?.map((group, gi) => (
                  <div key={gi} className={styles.group} data-anchor={group.anchor}>
                    <span className={styles.groupHeading}>{group.heading}</span>
                    <span className={styles.groupRule} />
                    <ul className={styles.items}>
                      {group.items.map((item, k) => <li key={k}>{item}</li>)}
                    </ul>
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
              </div>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}
