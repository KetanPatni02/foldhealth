import { useEffect, useMemo, useState } from 'react';
import { Drawer } from '../../../../../../../../components/Drawer/Drawer';
import { Button } from '../../../../../../../../components/Button/Button';
import { Input } from '../../../../../../../../components/Input/Input';
import { Badge } from '../../../../../../../../components/Badge/Badge';
import { BadgeRow } from '../../../../../../../../components/BadgeRow/BadgeRow';
import { Checkbox } from '../../../../../../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { useAppStore } from '../../../../../../../../store/useAppStore';
import { templateGoalCount } from '../../lib/carePlanTemplateApply';
import styles from './ApplyTemplatesDrawer.module.css';

/**
 * Pick Care Plan Library templates to apply to a patient plan.
 * Figma SNP-Story — templates picker from the problems bar.
 */
export function ApplyTemplatesDrawer({ onClose, appliedTemplateIds = [], onApply }) {
  const templates = useAppStore(s => s.carePlanTemplates);
  const libraryDidFetch = useAppStore(s => s.carePlanLibraryDidFetch);
  const libraryLoading = useAppStore(s => s.carePlanLibraryLoading);
  const fetchCarePlanLibrary = useAppStore(s => s.fetchCarePlanLibrary);

  useEffect(() => {
    if (!libraryDidFetch) fetchCarePlanLibrary();
  }, [libraryDidFetch, fetchCarePlanLibrary]);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(() => new Set(appliedTemplateIds));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates
      .map(t => ({ ...t, goalCount: templateGoalCount(t) }))
      .filter(t => {
        if (!q) return true;
        return t.name.toLowerCase().includes(q)
          || (t.conditions || []).some(c => c.toLowerCase().includes(q));
      });
  }, [templates, query]);

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const headerRight = (
    <>
      <Button
        variant="primary"
        size="L"
        onClick={() => onApply?.([...selected])}
      >
        Apply
      </Button>
      <span className={styles.headerDivider} />
    </>
  );

  return (
    <Drawer title="Care Plan Templates" onClose={onClose} headerRight={headerRight} noCloseDivider>
      <div className={styles.body}>
        <Input
          type="search"
          aria-label="Search templates"
          placeholder="Search templates"
          leadingIcon="solar:magnifer-linear"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />

        <div className={styles.list}>
          {libraryLoading && templates.length === 0 ? (
            <p className={styles.empty}>Loading templates…</p>
          ) : rows.length === 0 ? (
            <p className={styles.empty}>
              {templates.length === 0
                ? 'No templates in the library yet. Create one in Settings → Care Plan Library.'
                : `No templates match “${query.trim()}”.`}
            </p>
          ) : rows.map(t => (
            <div key={t.id} className={styles.rowWrap}>
              <label className={styles.row}>
                <Checkbox
                  checked={selected.has(t.id)}
                  onCheckedChange={() => toggle(t.id)}
                  aria-label={`Select ${t.name}`}
                />
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{t.name}</span>
                  {(t.conditions || []).length > 0 ? (
                    <BadgeRow items={t.conditions} maxLines={1} className={styles.rowConditions} />
                  ) : null}
                </span>
                <Badge tone="grey" size="S" label={String(t.goalCount)} />
              </label>
            </div>
          ))}
        </div>
      </div>
    </Drawer>
  );
}
