/**
 * Logic tab — the visual workflow / branching builder.
 *
 * A React-Flow node map (one node per field, edges for conditional rules) on the
 * left, and a rule editor on the right. Rules compile to the field's
 * `enableWhen[]` + `enableBehavior` — exactly what the engine evaluates and the
 * renderer now honors (Phase 1). "Show field B when A = Yes" ⇒ B.enableWhen =
 * [{question:'A', operator:'=', answer:'Yes'}], drawn as an edge A → B.
 */
import { useMemo, useState } from 'react';
import { ReactFlow, Background, BackgroundVariant, Controls, Handle, Position, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Icon } from '../../../components/Icon/Icon';
import { Select } from '../../../components/Select/Select';
import { Input } from '../../../components/Input/Input';
import { Button } from '../../../components/Button/Button';
import { Toggle } from '../../../components/Toggle/Toggle';
import { OPERATOR } from '../scoring/types';
import { fieldIcon } from '../analytics/formAnalyticsUi';
import styles from './LogicPanel.module.css';

const OPERATOR_LABELS = {
  [OPERATOR.EQ]: 'is', [OPERATOR.NE]: 'is not',
  [OPERATOR.GT]: 'greater than', [OPERATOR.LT]: 'less than',
  [OPERATOR.GTE]: 'at least', [OPERATOR.LTE]: 'at most',
  [OPERATOR.EXISTS]: 'is answered',
};
// Operators offered per trigger type.
const CHOICE_OPS = [OPERATOR.EQ, OPERATOR.NE, OPERATOR.EXISTS];
const NUM_OPS = [OPERATOR.EQ, OPERATOR.NE, OPERATOR.GT, OPERATOR.LT, OPERATOR.GTE, OPERATOR.LTE, OPERATOR.EXISTS];

/** Ordered, depth-tagged flatten of the field tree (groups + their children). */
function flatten(fields, depth = 0, out = []) {
  (fields || []).forEach((f) => {
    out.push({ field: f, depth });
    if (f.items) flatten(f.items, depth + 1, out);
  });
  return out;
}
function findField(items, id) {
  for (const it of items || []) {
    if (it.linkId === id) return it;
    if (it.items) { const hit = findField(it.items, id); if (hit) return hit; }
  }
  return null;
}
function updateField(items, id, patch) {
  return (items || []).map((it) => {
    if (it.linkId === id) {
      const next = { ...it, ...patch };
      // Drop keys explicitly set to undefined so the schema stays clean.
      Object.keys(patch).forEach((k) => { if (patch[k] === undefined) delete next[k]; });
      return next;
    }
    if (it.items) return { ...it, items: updateField(it.items, id, patch) };
    return it;
  });
}
const isAnswerable = (f) => f.type !== 'display' && f.type !== 'group';
const opsFor = (f) => (f && f.type === 'choice') || (f && f.type === 'boolean') ? CHOICE_OPS
  : (f && (f.type === 'integer' || f.type === 'decimal' || f.type === 'date')) ? NUM_OPS
  : [OPERATOR.EQ, OPERATOR.NE, OPERATOR.EXISTS];

/* ── Custom node ── */
function LogicNode({ data }) {
  const { field, index, hasRules, selected } = data;
  return (
    <div className={`${styles.node} ${selected ? styles.nodeSelected : ''} ${field.type === 'group' ? styles.nodeGroup : ''}`}>
      <Handle type="target" position={Position.Left} className={styles.handle} />
      <span className={styles.nodeNum}>{index}</span>
      <Icon name={fieldIcon(field)} size={15} color={selected ? 'var(--primary-300)' : 'var(--neutral-400)'} />
      <span className={styles.nodeText}>{field.text || field.type}{field.required ? <span className={styles.req}>*</span> : null}</span>
      {hasRules && <span className={styles.nodeRule}><Icon name="solar:branching-paths-down-linear" size={13} color="var(--primary-300)" /></span>}
      <Handle type="source" position={Position.Right} className={styles.handle} />
    </div>
  );
}
const nodeTypes = { logicNode: LogicNode };

/* ── Rule editor (right pane) ── */
function RuleEditor({ field, fields, onApply }) {
  const ew = field.enableWhen || [];
  const conditional = ew.length > 0;
  const behavior = field.enableBehavior || 'all';
  const triggers = useMemo(
    () => flatten(fields).map((e) => e.field).filter((f) => isAnswerable(f) && f.linkId !== field.linkId),
    [fields, field.linkId],
  );

  const apply = (nextEw, nextBehavior = behavior) => onApply(field.linkId, {
    enableWhen: nextEw.length ? nextEw : undefined,
    enableBehavior: nextEw.length > 1 ? nextBehavior : undefined,
  });

  const setConditional = (on) => {
    if (on) apply([{ question: triggers[0]?.linkId || '', operator: OPERATOR.EQ, answer: '' }]);
    else apply([]);
  };
  const setCond = (i, patch) => apply(ew.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const addCond = () => apply([...ew, { question: triggers[0]?.linkId || '', operator: OPERATOR.EQ, answer: '' }], behavior);
  const removeCond = (i) => apply(ew.filter((_, idx) => idx !== i));

  return (
    <div className={styles.editor}>
      <div className={styles.editorHead}>
        <Icon name={fieldIcon(field)} size={16} color="var(--primary-300)" />
        <span className={styles.editorTitle}>{field.text || field.type}</span>
      </div>

      <div className={styles.visToggle}>
        <Toggle
          size="S"
          items={[{ key: 'always', label: 'Always show' }, { key: 'cond', label: 'Show when…' }]}
          active={conditional ? 'cond' : 'always'}
          onChange={(k) => setConditional(k === 'cond')}
        />
      </div>

      {!conditional ? (
        <p className={styles.editorHint}>This field is always shown. Switch to “Show when…” to branch on an earlier answer.</p>
      ) : (
        <>
          {ew.length > 1 && (
            <div className={styles.behaviorRow}>
              <span className={styles.behaviorLabel}>Match</span>
              <Toggle size="S" items={[{ key: 'all', label: 'All' }, { key: 'any', label: 'Any' }]} active={behavior} onChange={(k) => apply(ew, k)} />
              <span className={styles.behaviorLabel}>of these conditions</span>
            </div>
          )}

          <div className={styles.condList}>
            {ew.map((c, i) => {
              const trig = findField(fields, c.question);
              const ops = opsFor(trig);
              const showValue = c.operator !== OPERATOR.EXISTS;
              const optionVals = trig?.options?.map((o) => ({ value: String(o.value), label: String(o.value) }));
              return (
                <div key={i} className={styles.cond}>
                  {i > 0 && <span className={styles.condJoin}>{behavior === 'all' ? 'AND' : 'OR'}</span>}
                  <div className={styles.condGrid}>
                    <Select
                      value={c.question}
                      onChange={(v) => setCond(i, { question: v })}
                      placeholder="Question"
                      options={triggers.map((t) => ({ value: t.linkId, label: t.text || t.linkId }))}
                    />
                    <Select
                      value={c.operator}
                      onChange={(v) => setCond(i, { operator: v })}
                      options={ops.map((o) => ({ value: o, label: OPERATOR_LABELS[o] || o }))}
                    />
                    {showValue && (optionVals?.length ? (
                      <Select value={String(c.answer ?? '')} onChange={(v) => setCond(i, { answer: v })} placeholder="Value" options={optionVals} />
                    ) : (
                      <Input value={c.answer ?? ''} placeholder="Value" onChange={(e) => setCond(i, { answer: e.target.value })} />
                    ))}
                  </div>
                  <button className={styles.condRemove} onClick={() => removeCond(i)} aria-label="Remove condition">
                    <Icon name="solar:trash-bin-minimalistic-linear" size={15} color="var(--neutral-300)" />
                  </button>
                </div>
              );
            })}
          </div>

          <Button variant="ghost" size="S" leadingIcon="solar:add-circle-linear" onClick={addCond}>Add condition</Button>
        </>
      )}
    </div>
  );
}

export function LogicPanel({ fields, onChange }) {
  const [selectedId, setSelectedId] = useState(null);
  const entries = useMemo(() => flatten(fields), [fields]);

  const nodes = useMemo(() => entries.map((e, i) => ({
    id: e.field.linkId,
    type: 'logicNode',
    draggable: false,
    position: { x: e.depth * 56, y: i * 84 },
    data: { field: e.field, index: i + 1, hasRules: (e.field.enableWhen || []).length > 0, selected: e.field.linkId === selectedId },
  })), [entries, selectedId]);

  const edges = useMemo(() => {
    const out = [];
    entries.forEach((e) => (e.field.enableWhen || []).forEach((c, ci) => {
      if (!c.question) return;
      out.push({
        id: `${c.question}->${e.field.linkId}:${ci}`,
        source: c.question,
        target: e.field.linkId,
        label: `${OPERATOR_LABELS[c.operator] || c.operator}${c.operator !== OPERATOR.EXISTS && c.answer != null && c.answer !== '' ? ` ${c.answer}` : ''}`,
        animated: true,
        style: { stroke: 'var(--primary-300)', strokeWidth: 1.5 },
        labelStyle: { fontSize: 11, fill: 'var(--neutral-400)', fontFamily: 'Inter, sans-serif' },
        labelBgStyle: { fill: 'var(--neutral-0)' },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--primary-300)' },
      });
    }));
    return out;
  }, [entries]);

  const selected = selectedId ? findField(fields, selectedId) : null;
  const applyRule = (linkId, patch) => onChange(updateField(fields, linkId, patch));

  return (
    <div className={styles.wrap}>
      <div className={styles.canvas}>
        {entries.length === 0 ? (
          <div className={styles.empty}>
            <Icon name="solar:branching-paths-down-linear" size={32} color="var(--neutral-150)" />
            <span className={styles.emptyTitle}>No questions yet</span>
            <span className={styles.emptyDesc}>Add fields in the Edit tab, then wire up conditional logic here.</span>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={(_e, n) => setSelectedId(n.id)}
            onPaneClick={() => setSelectedId(null)}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            fitView
            fitViewOptions={{ padding: 0.25 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--neutral-100)" />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>

      <div className={styles.side}>
        {!selected ? (
          <div className={styles.sideEmpty}>
            <Icon name="solar:cursor-linear" size={26} color="var(--neutral-150)" />
            <span className={styles.emptyTitle}>Select a question</span>
            <span className={styles.emptyDesc}>Click a node to control when it appears, based on earlier answers.</span>
          </div>
        ) : (
          <RuleEditor field={selected} fields={fields} onApply={applyRule} />
        )}
      </div>
    </div>
  );
}

export default LogicPanel;
