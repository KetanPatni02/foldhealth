import { useMemo, useState } from 'react';
import { Drawer } from '../../../components/Drawer/Drawer';
import { Button } from '../../../components/Button/Button';
import { Toggle } from '../../../components/Toggle/Toggle';
import { SearchBar } from '../../../components/SearchBar/SearchBar';
import { Checkbox } from '../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { Badge } from '../../../components/Badge/Badge';
import { Link } from '../../../components/Link/Link';
import { PriorityIcon } from '../../../components/PriorityIcon/PriorityIcon';
import { AddIconMinimalist } from '../../../components/Icon/AddIconMinimalist';
import styles from './AddGoalsDrawer.module.css';

const GOAL_CATEGORIES = ['All', 'Vitals', 'Labs', 'Diet', 'Exercise', 'Others'];

// Goal catalogue — `recent` marks the rows shown under "Recently Used", which
// the design separates from the rest with a hairline.
const GOAL_CATALOGUE = [
  { id: 'g-1', title: 'Recognize the signs of a low blood pressure', category: 'Vitals', priority: 'medium', recent: true },
  { id: 'g-2', title: 'Target an average blood pressure', detail: 'Blood pressure < 140/90 mmHg • 3 Months', category: 'Vitals', priority: 'high', recent: true },
  { id: 'g-3', title: 'Target an average blood pressure', detail: 'Blood pressure <120/80 mmHg', category: 'Vitals', priority: 'medium', recent: true },
  { id: 'g-4', title: 'Target an average blood pressure of <130/80', detail: 'Blood pressure <130/80 mmHg', category: 'Vitals', priority: 'low', recent: true },
  { id: 'g-5', title: 'Maintain oxygen saturation (SpO₂) >= 95%', detail: 'Oxygen Saturation >= 95% • 2 Months', category: 'Vitals', priority: 'high', recent: true },
  { id: 'g-6', title: 'Keep resting heart rate', detail: 'Heart rate between 60-100 bpm', category: 'Vitals', priority: 'low' },
  { id: 'g-7', title: 'Maintain HBA1c <= 7.5%', detail: 'HBA1c <= 7.5% • 1 Year', category: 'Labs', priority: 'medium' },
  { id: 'g-8', title: 'Get my hypertension routine lab tests once a year', category: 'Labs', priority: 'high' },
  { id: 'g-9', title: 'Maintain LDL cholesterol', detail: 'LDL cholesterol < 70 mg/dL • 1 Month', category: 'Labs', priority: 'low' },
  { id: 'g-10', title: 'Maintain HBA1c levels', detail: 'HBA1c <= 8.5% • 2 Months', category: 'Labs', priority: 'high' },
  { id: 'g-11', title: 'Maintain blood glucose after meals', detail: 'Blood Glucose After Meals <=120 • 2 Months', category: 'Labs', priority: 'high' },
  { id: 'g-12', title: 'Eat a healthier diet for hypertensive patients', category: 'Diet', priority: 'medium' },
  { id: 'g-13', title: 'Target to maintain normal BMI', detail: 'BMI <25 • 3 Months', category: 'Diet', priority: 'high' },
  { id: 'g-14', title: 'Target to achieve a healthy weight < 160 lbs', detail: 'Weight <160 lbs • 2 Months', category: 'Diet', priority: 'low' },
  { id: 'g-15', title: 'Develop an activity plan with moderate exercise', detail: 'Exercise > 150 Mins/week • 3 Months', category: 'Exercise', priority: 'medium' },
  { id: 'g-16', title: 'Start exercise', detail: 'Exercise > 150 Mins/week • 3 Months', category: 'Exercise', priority: 'high' },
];

/**
 * Add Goals — goal picker for the New Care Plan screen.
 * Figma Care-Plan-Creation 14109:296954.
 */
export function AddGoalsDrawer({ onClose, onAdd }) {
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(() => new Set());

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GOAL_CATALOGUE.filter(g => {
      if (category !== 'All' && g.category !== category) return false;
      if (!q) return true;
      return g.title.toLowerCase().includes(q) || (g.detail || '').toLowerCase().includes(q);
    });
  }, [category, query]);

  // The hairline sits after the last "Recently Used" row, and only while the
  // list is unfiltered — otherwise the grouping is meaningless.
  const showRecentLabel = category === 'All' && !query.trim();
  const lastRecentId = showRecentLabel
    ? [...rows].reverse().find(g => g.recent)?.id
    : null;

  const headerRight = (
    <>
      <Button
        variant="primary"
        size="L"
        disabled={selected.size === 0}
        onClick={() => onAdd?.(GOAL_CATALOGUE.filter(g => selected.has(g.id)))}
      >
        Add
      </Button>
      <span className={styles.headerDivider} />
    </>
  );

  return (
    <Drawer title="Add Goals" onClose={onClose} headerRight={headerRight} noCloseDivider>
      <div className={styles.body}>
        <div className={styles.filterRow}>
          <Toggle size="S" items={GOAL_CATEGORIES} active={category} onChange={setCategory} />
          <Link className={styles.createLink}>
            <AddIconMinimalist size={14} color="currentColor" />
            Create New Goal
          </Link>
        </div>

        <SearchBar
          fullWidth
          autoFocus={false}
          placeholder="Search Goal"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />

        <div className={styles.list}>
          {showRecentLabel && <span className={styles.groupLabel}>Recently Used</span>}
          {rows.length === 0 ? (
            <p className={styles.empty}>No goals match “{query.trim()}”.</p>
          ) : rows.map(g => (
            <div key={g.id} className={styles.rowWrap}>
              <label className={styles.row}>
                <Checkbox
                  checked={selected.has(g.id)}
                  onCheckedChange={() => toggle(g.id)}
                  aria-label={`Select ${g.title}`}
                />
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{g.title}</span>
                  {g.detail && <span className={styles.rowDetail}>{g.detail}</span>}
                </span>
                <span className={styles.rowMeta}>
                  <Badge tone="grey" size="S" label={g.category} />
                  <PriorityIcon priority={g.priority} size={16} />
                </span>
              </label>
              {g.id === lastRecentId && <span className={styles.groupDivider} />}
            </div>
          ))}
        </div>
      </div>
    </Drawer>
  );
}
