import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '../../../components/Input/Input';
import { Link } from '../../../components/Link/Link';
import { Switch } from '../../../components/Switch/Switch';
import { FilterChip } from '../../../components/FilterChip/FilterChip';
import { Badge } from '../../../components/Badge/Badge';
import { CollapsibleSection } from '../../../components/CollapsibleSection/CollapsibleSection';
import { useAppStore } from '../../../store/useAppStore';
import { evaluateRules, filledRules, isFilled } from '../lib/conditionFields';
import { RuleRow } from './RuleRow';
import { MatchingMembersDrawer } from './MatchingMembersDrawer';
import styles from './AutomationBuilder.module.css';

const norm = (s) => String(s || '').trim().toLowerCase();


/**
 * "Member is matching selected conditions": every filter, grouped in
 * collapsible sections. Search narrows to matching filters (and opens their
 * sections), "Hide empty fields" hides the empty ones, and the count above the
 * sections says how many members the filters keep, as they change.
 */
export function MatchingRules({ groups, rules, onChange, dyn }) {
  const members = useAppStore(s => s.automationMembers);
  const sample = useAppStore(s => s.automationMembersSample);
  const [query, setQuery] = useState('');
  const [selectedOnly, setSelectedOnly] = useState(false);
  // Every section starts open; each header folds its own section away.
  const [open, setOpen] = useState(() => new Set(groups.map(g => g.group)));

  const appliedCount = filledRules(rules).length;
  const matchedMembers = useMemo(
    () => (appliedCount ? members.filter(p => evaluateRules(rules, p).matched) : members),
    [members, rules, appliedCount],
  );
  const [showMembers, setShowMembers] = useState(false);
  // "Jump to section" scrolls to a section and follows the scroll, so it
  // also shows where you are.
  const [activeSection, setActiveSection] = useState(groups[0]?.group);
  const sectionRefs = useRef({});
  const toolbarRef = useRef(null);

  const q = norm(query);
  const visible = groups.map(g => {
    const groupHit = q && norm(g.group).includes(q);
    const fields = g.fields.filter(f => (
      (!selectedOnly || isFilled(rules[f.key])) && (!q || groupHit || norm(f.label).includes(q))
    ));
    return { ...g, fields, applied: g.fields.filter(f => isFilled(rules[f.key])).length };
  }).filter(g => g.fields.length);

  // While searching or filtering to selected, every section shown is open:
  // the point is to see the matches, not to click into each section.
  const narrowing = !!q || selectedOnly;
  // The picker follows whichever section heading is nearest the top.
  const visibleKey = visible.map(g => g.group).join('|');
  useEffect(() => {
    const els = Object.values(sectionRefs.current).filter(Boolean);
    if (!els.length || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => {
      const inView = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (inView[0]) setActiveSection(inView[0].target.dataset.section);
    }, { rootMargin: '0px 0px -70% 0px' });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [visibleKey]);

  const jumpTo = (group) => {
    setActiveSection(group);
    if (!narrowing) toggle(group, true);
    const el = sectionRefs.current[group];
    if (!el) return;
    // Land below the sticky header bands, not under them.
    el.style.scrollMarginTop = `${(toolbarRef.current?.offsetHeight || 0) + 16}px`;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggle = (group, next) => setOpen(prev => {
    const s = new Set(prev);
    if (next) s.add(group); else s.delete(group);
    return s;
  });

  return (
    <div className={styles.matchRules}>
      <div className={styles.matchToolbar} ref={toolbarRef}>
        <div className={styles.matchSearchRow}>
          <Input
            type="search"
            leadingIcon="solar:magnifer-linear"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search filters"
            aria-label="Search filters"
            wrapperClassName={styles.matchSearch}
          />
          <span className={styles.jumpChip}>
            <FilterChip
              size="S"
              singleSelect
              noClear
              label="Jump to"
              options={visible.map(g => g.group)}
              selected={visible.some(g => g.group === activeSection) ? [activeSection] : []}
              onChange={next => { if (next[0]) jumpTo(next[0]); }}
            />
          </span>
        </div>
        <div className={styles.matchToolbarRow}>
          <Switch
            checked={selectedOnly}
            onChange={setSelectedOnly}
            disabled={!appliedCount && !selectedOnly}
            label="Hide empty fields"
          />
          <span className={styles.matchCount}>
            <Link size="sm" onClick={() => setShowMembers(true)} role="button" tabIndex={0} aria-label="See matching members"
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowMembers(true); } }}>
              {matchedMembers.length.toLocaleString()}
            </Link>
            {` of ${members.length.toLocaleString()} members match`}
            {sample && <span className={styles.matchSample}> (sample data)</span>}
          </span>
        </div>
      </div>

      {visible.map(g => (
        <div
          key={g.group}
          ref={el => { if (el) sectionRefs.current[g.group] = el; else delete sectionRefs.current[g.group]; }}
          data-section={g.group}
        >
          <CollapsibleSection
            title={g.group}
            subtitle={[...new Set(g.fields.map(f => f.label))].join(', ')}
            flush
            open={narrowing || open.has(g.group)}
            onOpenChange={next => { if (!narrowing) toggle(g.group, next); }}
            meta={g.applied ? <Badge tone="neutral" size="sm" label={`${g.applied} applied`} /> : null}
          >
            <div className={styles.matchRows}>
              {g.fields.map(f => <RuleRow key={f.key} field={f} rules={rules} onChange={onChange} dyn={dyn} />)}
            </div>
          </CollapsibleSection>
        </div>
      ))}

      {showMembers && (
        <MatchingMembersDrawer members={matchedMembers} total={members.length} sample={sample} onClose={() => setShowMembers(false)} />
      )}

      {!visible.length && (
        <p className={styles.panelHint}>
          {q ? `No filters match “${query.trim()}”.` : 'No filters selected yet.'}
        </p>
      )}
    </div>
  );
}
