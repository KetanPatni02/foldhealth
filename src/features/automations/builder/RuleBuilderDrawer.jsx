import { useState } from 'react';
import { Drawer } from '../../../components/Drawer/Drawer';
import { Button } from '../../../components/Button/Button';
import { RuleGroupBuilder } from '../../../components/RuleGroupBuilder/RuleGroupBuilder';
import { emptyRuleGroup } from '../../../components/RuleGroupBuilder/ruleGroup';
import { isFilled, ruleTree } from '../lib/conditionFields';

// Older saves stored rules without ids; the builder addresses rows by id.
let seq = 0;
const withIds = (node) => ({
  ...node,
  id: node.id || `rb-${seq++}`,
  rules: node.rules.map(c => (Array.isArray(c?.rules) ? withIds(c) : { ...c, id: c.id || `rb-${seq++}` })),
});

/**
 * "<field> Filter": the rule builder for one rules field (Lab Result,
 * Coverage, Care Plan…), opened from its "+ Add rule". Edits a draft; Save
 * hands back the tree (or '' when no rule has a value), close discards it.
 */
export function RuleBuilderDrawer({ field: f, value, dyn, onSave, onClose }) {
  const fields = f.ruleFields.map(rf => ({
    value: rf.key,
    label: rf.label,
    ops: rf.ops,
    input: rf.input || 'select',
    options: rf.options || dyn[rf.optionsFrom] || [],
  }));
  const [draft, setDraft] = useState(() => {
    const tree = ruleTree(value);
    return tree?.rules.length ? withIds(tree) : emptyRuleGroup(fields, { withRule: true });
  });

  return (
    <Drawer
      title={`${f.label} Filter`}
      onClose={onClose}
      primaryAction={<Button onClick={() => onSave(isFilled({ value: draft }) ? draft : '')}>Save</Button>}
    >
      <RuleGroupBuilder fields={fields} value={draft} onValueChange={setDraft} />
    </Drawer>
  );
}
