import { useState } from 'react';
import { Button } from '../Button/Button';
import { ActionButton } from '../ActionButton/ActionButton';
import { Select } from '../Select/Select';
import { Input } from '../Input/Input';
import { SegmentedControl } from '../SegmentedControl/SegmentedControl';
import { AddIconMinimalist } from '../Icon/AddIconMinimalist';
import { DragHandleIcon } from '../Icon/DragHandleIcon';
import { blankRule, emptyRuleGroup, nextId } from './ruleGroup';
import styles from './RuleGroupBuilder.module.css';

const isGroup = (node) => Array.isArray(node?.rules);
const COMBINATORS = [{ key: 'and', label: 'All' }, { key: 'or', label: 'Any' }];

/**
 * RuleGroupBuilder: "If below condition matches", then rows of
 * field · operator · value that can be reordered by dragging, nested into
 * groups, and removed. Each group matches when All (or Any) of its rows do.
 *
 * Generic: the fields come in as props and the tree goes out through
 * `onValueChange`, so it can back any filter.
 *
 * @param {object}   props
 * @param {Array<{ value: string, label: string, ops: string[], options?: Array, input?: 'select'|'number'|'text' }>} props.fields
 *        What a rule can check. `input` defaults to 'select' over `options`.
 * @param {{ combinator: 'and'|'or', rules: Array }} props.value
 *        The tree. A rule is `{ id, field, op, value }`; a group is `{ id, combinator, rules }`.
 * @param {(next: object) => void} props.onValueChange
 * @param {string}   [props.title='If below condition matches']
 */
export function RuleGroupBuilder({ fields, value, onValueChange, title = 'If below condition matches' }) {
  const root = value && isGroup(value) ? value : emptyRuleGroup(fields);
  const [drag, setDrag] = useState(null); // { groupId, index }

  const update = (node, groupId, fn) => {
    if (node.id === groupId) return fn(node);
    return { ...node, rules: node.rules.map(c => (isGroup(c) ? update(c, groupId, fn) : c)) };
  };
  const change = (groupId, fn) => onValueChange(update(root, groupId, fn));

  const addRule = (groupId) => change(groupId, g => ({ ...g, rules: [...g.rules, blankRule(fields)] }));
  const addGroup = (groupId) => change(groupId, g => ({
    ...g,
    rules: [...g.rules, { id: nextId(), combinator: 'or', rules: [blankRule(fields)] }],
  }));
  // Removing a group's last row removes the (now empty) group too.
  const prune = (node) => ({
    ...node,
    rules: node.rules.map(c => (isGroup(c) ? prune(c) : c)).filter(c => !isGroup(c) || c.rules.length),
  });
  const remove = (groupId, id) => onValueChange(prune(update(root, groupId, g => ({ ...g, rules: g.rules.filter(c => c.id !== id) }))));
  const patchRule = (groupId, id, patch) => change(groupId, g => ({
    ...g,
    rules: g.rules.map(c => (c.id === id ? { ...c, ...patch } : c)),
  }));
  const move = (groupId, from, to) => change(groupId, g => {
    const rules = [...g.rules];
    const [item] = rules.splice(from, 1);
    rules.splice(to, 0, item);
    return { ...g, rules };
  });

  const renderRule = (group, rule, index) => {
    const f = fields.find(x => x.value === rule.field) || fields[0];
    const input = f.input || 'select';
    const dragging = drag?.groupId === group.id && drag.index === index;
    return (
      <div
        key={rule.id}
        className={`${styles.rule} ${dragging ? styles.dragging : ''}`}
        onDragOver={e => { if (drag?.groupId === group.id) e.preventDefault(); }}
        onDrop={e => {
          e.preventDefault();
          if (drag?.groupId === group.id && drag.index !== index) move(group.id, drag.index, index);
          setDrag(null);
        }}
      >
        <span
          className={styles.grip}
          draggable
          onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDrag({ groupId: group.id, index }); }}
          onDragEnd={() => setDrag(null)}
          aria-label="Drag to reorder"
          role="img"
        >
          <DragHandleIcon size={16} />
        </span>
        <Select
          portal
          className={styles.field}
          options={fields.map(x => ({ value: x.value, label: x.label }))}
          value={f.value}
          onValueChange={v => {
            const next = fields.find(x => x.value === v);
            patchRule(group.id, rule.id, { field: v, op: next.ops[0], value: '' });
          }}
          searchable={fields.length > 8}
          aria-label="Field"
        />
        <Select
          portal
          className={styles.op}
          options={f.ops.map(o => ({ value: o, label: o }))}
          value={rule.op || f.ops[0]}
          onValueChange={v => patchRule(group.id, rule.id, { op: v })}
          aria-label="Operator"
        />
        {input === 'select' ? (
          <Select
            portal
            className={styles.value}
            options={f.options || []}
            value={rule.value ?? ''}
            onValueChange={v => patchRule(group.id, rule.id, { value: v })}
            searchable={(f.options || []).length > 8}
            placeholder="Select"
            emptyText="No values available"
            aria-label="Value"
          />
        ) : (
          <Input
            type={input}
            className={styles.value}
            value={rule.value ?? ''}
            onChange={e => patchRule(group.id, rule.id, {
              value: input === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value,
            })}
            placeholder="Value"
            aria-label="Value"
          />
        )}
        <ActionButton
          size="sm"
          tone="danger"
          icon="solar:trash-bin-trash-linear"
          tooltip="Remove rule"
          onClick={() => remove(group.id, rule.id)}
        />
      </div>
    );
  };

  const renderGroup = (group, nested) => (
    <div key={group.id} className={nested ? styles.nested : styles.box}>
      {(nested || group.rules.length > 1) && (
        <div className={styles.groupHead}>
          <span className={styles.groupLabel}>Match</span>
          <SegmentedControl
            size="sm"
            items={COMBINATORS}
            value={group.combinator === 'or' ? 'or' : 'and'}
            onValueChange={k => change(group.id, g => ({ ...g, combinator: k }))}
            aria-label="Match all or any"
          />
          <span className={styles.groupLabel}>of these</span>
          {nested && (
            <ActionButton
              size="sm"
              tone="danger"
              icon="solar:trash-bin-trash-linear"
              tooltip="Remove group"
              className={styles.groupRemove}
              onClick={() => onValueChange(prune(update(root, root.id, g => removeDeep(g, group.id))))}
            />
          )}
        </div>
      )}
      {group.rules.map((child, i) => (isGroup(child) ? renderGroup(child, true) : renderRule(group, child, i)))}
      <button type="button" className={styles.addCircle} aria-label="Add rule" title="Add rule" onClick={() => addRule(group.id)}>
        <AddIconMinimalist size={16} color="currentColor" />
      </button>
    </div>
  );

  return (
    <div className={styles.builder}>
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
        <span className={styles.actions}>
          <Button variant="outline" tone="primary" leadingIconElement={<AddIconMinimalist size={14} />} onClick={() => addRule(root.id)}>
            Add rule
          </Button>
          <Button variant="outline" tone="primary" onClick={() => addGroup(root.id)}>Add group</Button>
        </span>
      </div>
      {renderGroup(root, false)}
    </div>
  );
}

function removeDeep(node, id) {
  return {
    ...node,
    rules: node.rules.filter(c => c.id !== id).map(c => (isGroup(c) ? removeDeep(c, id) : c)),
  };
}
