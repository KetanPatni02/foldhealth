import { useState } from 'react';
import { Switch } from '../Switch/Switch';
import { SortableItem, SortableList } from '../SortableList/SortableList';
import styles from './SectionCustomizer.module.css';

/**
 * SectionCustomizer: switch sections and the items inside them on or off and
 * drag either into a new order, as in the analytics Print / Export Report
 * drawer. Used by the patient panel's Customize drawer (sections are tabs,
 * items are widgets). A section with no items is a single row.
 *
 * Section cards drag from anywhere except their controls; items drag by the
 * grip. While a section is dragged every card shrinks to its title row, so a
 * card never travels far.
 *
 * @param {Array<{ key: string, label: string, on: boolean, items: Array<{ key: string, label: string, on: boolean }> }>} props.sections
 * @param {(keys: string[]) => void} props.onReorderSections
 * @param {(key: string, on: boolean) => void} props.onToggleSection
 * @param {(sectionKey: string, keys: string[]) => void} props.onReorderItems
 * @param {(sectionKey: string, itemKey: string, on: boolean) => void} props.onToggleItem
 * @param {string} [props.itemNoun='item'] – used in the "3 of 4 items" count
 */
export function SectionCustomizer({ sections, onReorderSections, onToggleSection, onReorderItems, onToggleItem, itemNoun = 'item' }) {
  const [reordering, setReordering] = useState(false);

  return (
    <div className={[styles.cards, reordering ? styles.reordering : ''].filter(Boolean).join(' ')}>
      <SortableList
        ids={sections.map(s => s.key)}
        onReorder={onReorderSections}
        onDragStart={() => setReordering(true)}
        onDragFinish={() => setReordering(false)}
      >
        {sections.map((section) => {
          const onCount = section.items.filter(i => i.on).length;
          const collapsed = !section.on || reordering || section.items.length === 0;
          return (
            <SortableItem key={section.key} id={section.key} label={section.label} className={styles.card} dragOnItem>
              {handle => (
                <>
                  <div className={styles.cardHead}>
                    {handle}
                    <span className={styles.cardText}>
                      <span className={styles.cardTitle}>{section.label}</span>
                      {section.items.length > 0 && (
                        <span className={styles.cardMeta}>
                          {section.on ? `${onCount} of ${section.items.length} ${itemNoun}s shown` : 'Hidden'}
                        </span>
                      )}
                    </span>
                    <Switch
                      checked={section.on}
                      onChange={on => onToggleSection(section.key, on)}
                      ariaLabel={`Show ${section.label}`}
                    />
                  </div>
                  <div className={[styles.collapse, collapsed ? styles.collapsed : ''].join(' ')} inert={collapsed}>
                    <div className={styles.collapseInner}>
                      <div className={styles.list} data-no-drag>
                        <SortableList ids={section.items.map(i => i.key)} onReorder={keys => onReorderItems(section.key, keys)}>
                          {section.items.map(item => (
                            <SortableItem key={item.key} id={item.key} label={item.label} className={styles.row}>
                              {rowHandle => (
                                <>
                                  {rowHandle}
                                  <span className={[styles.rowText, item.on ? '' : styles.off].join(' ')}>{item.label}</span>
                                  <Switch
                                    checked={item.on}
                                    onChange={on => onToggleItem(section.key, item.key, on)}
                                    ariaLabel={`Show ${item.label}`}
                                  />
                                </>
                              )}
                            </SortableItem>
                          ))}
                        </SortableList>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </SortableItem>
          );
        })}
      </SortableList>
    </div>
  );
}
