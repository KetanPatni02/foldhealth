import { useEffect, useMemo, useState } from 'react';
import { Drawer } from '../../../../../../../../components/Drawer/Drawer';
import { Button } from '../../../../../../../../components/Button/Button';
import { Input } from '../../../../../../../../components/Input/Input';
import { Icon } from '../../../../../../../../components/Icon/Icon';
import { Link } from '../../../../../../../../components/Link/Link';
import { Checkbox } from '../../../../../../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { PriorityIcon } from '../../../../../../../../components/PriorityIcon/PriorityIcon';
import { useAppStore } from '../../../../../../../../store/useAppStore';
import styles from './ApplyTemplatesDrawer.module.css';

// Figma 2349:336796 — the picker lists PROBLEMS with the parent template as
// the subtitle line and a three-button priority selector on the right. The
// existing apply flow still keys off templateIds, so we pass just those to
// onApply; the priority selection is UI-only for now (a later change can
// carry it through to `applyPatientCarePlanTemplates`).
const PRIORITIES = ['low', 'medium', 'high'];

/**
 * Pick Care Plan Library templates to add to a patient plan.
 *
 * Row = a problem (template.conditions[0] or the template name when the
 * template has no explicit conditions), with the template listed underneath.
 * Each row carries a Low / Medium / High priority picker built from the
 * shared PriorityIcon component so priority reads the same wherever it
 * appears in the app.
 */
export function ApplyTemplatesDrawer({ onClose, appliedTemplateIds = [], appliedTemplatePriorities = {}, onApply }) {
  const templates = useAppStore(s => s.carePlanTemplates);
  const libraryDidFetch = useAppStore(s => s.carePlanLibraryDidFetch);
  const libraryLoading = useAppStore(s => s.carePlanLibraryLoading);
  const fetchCarePlanLibrary = useAppStore(s => s.fetchCarePlanLibrary);
  const favorites = useAppStore(s => s.carePlanFavorites);
  const carePlanFavoritesLoaded = useAppStore(s => s.carePlanFavoritesLoaded);
  const fetchCarePlanFavorites = useAppStore(s => s.fetchCarePlanFavorites);

  useEffect(() => {
    if (!libraryDidFetch) fetchCarePlanLibrary();
    if (!carePlanFavoritesLoaded) fetchCarePlanFavorites();
  }, [libraryDidFetch, carePlanFavoritesLoaded, fetchCarePlanLibrary, fetchCarePlanFavorites]);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(() => new Set(appliedTemplateIds));
  // Seed from the plan's persisted priorities so re-opening the drawer
  // shows what the user picked last time; the user then edits from there.
  const [priorities, setPriorities] = useState(() => ({ ...appliedTemplatePriorities }));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter(t => {
      if (!q) return true;
      const inName = (t.name || '').toLowerCase().includes(q);
      const inCond = (t.conditions || []).some(c => (c || '').toLowerCase().includes(q));
      return inName || inCond;
    });
  }, [templates, query]);

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const setPriority = (id, p) => setPriorities(prev => ({
    ...prev,
    [id]: prev[id] === p ? null : p,
  }));

  const templateNameOf = (t) => t.name;
  // A template can cover several problems (chronic conditions). The row's
  // secondary line lists them so the picker matches how templates are
  // authored in Settings → Care Plan Library → Plan template.
  const problemsLineOf = (t) => {
    const items = (Array.isArray(t.conditions) ? t.conditions : []).filter(Boolean);
    if (items.length === 0) return '';
    return `Problem${items.length > 1 ? 's' : ''}: ${items.join(', ')}`;
  };

  const headerRight = (
    <>
      <Link
        onClick={() => { /* future: open Create New template flow */ }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}
      >
        <Icon name="solar:add-linear" size={14} color="var(--primary-300)" />
        Create New
      </Link>
      <span className={styles.headerDivider} aria-hidden />
      <Button
        variant="primary"
        size="M"
        disabled={selected.size === 0}
        onClick={() => onApply?.([...selected], priorities)}
      >
        Add
      </Button>
      <span className={styles.headerDivider} aria-hidden />
    </>
  );

  return (
    <Drawer title="Add Care Plan Templates" onClose={onClose} headerRight={headerRight} noCloseDivider>
      <div className={styles.body}>
        <Input
          type="search"
          aria-label="Search templates or problems"
          placeholder="Search Templates or Problems"
          leadingIcon="solar:magnifer-linear"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />

        <div className={styles.list}>
          <div className={styles.tableHead} role="row">
            <span className={styles.tableHeadName}>Problems Name</span>
            <span className={styles.tableHeadPriority}>Priority</span>
          </div>
          {libraryLoading && templates.length === 0 ? (
            <p className={styles.empty}>Loading templates…</p>
          ) : rows.length === 0 ? (
            <p className={styles.empty}>
              {templates.length === 0
                ? 'No templates in the library yet. Create one in Settings → Care Plan Library.'
                : `No templates match "${query.trim()}".`}
            </p>
          ) : (
            rows.map(t => {
              const isChecked = selected.has(t.id);
              const activePriority = priorities[t.id] || null;
              return (
                <div key={t.id} className={styles.row}>
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggle(t.id)}
                    aria-label={`Select ${templateNameOf(t)}`}
                  />
                  <span className={styles.rowText}>
                    <span className={styles.rowTitle}>{templateNameOf(t)}</span>
                    {problemsLineOf(t) && (
                      <span className={styles.rowSubtitle}>{problemsLineOf(t)}</span>
                    )}
                  </span>
                  <div
                    className={styles.priorityGroup}
                    role="radiogroup"
                    aria-label={`Priority for ${templateNameOf(t)}`}
                  >
                    {PRIORITIES.map(p => {
                      const isActive = activePriority === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          aria-label={`${p} priority`}
                          data-priority={p}
                          className={`${styles.priorityBtn} ${isActive ? styles.priorityBtnActive : ''}`}
                          onClick={() => setPriority(t.id, p)}
                        >
                          <PriorityIcon priority={p} size={14} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Drawer>
  );
}
