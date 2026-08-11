import { DownChevronIcon } from '../Icon/DownChevronIcon';
import styles from './FilterBar.module.css';

export function FilterBarTail({
  tailRef,
  moreBtnRef,
  actions = [],
  moreRect,
  onOpenMore,
  onCloseMore,
  hasActive,
  onClearAll,
  onSaveFilter,
  onOpenSaveDialog,
}) {
  const hasAction = (key) => actions.includes(key);

  return (
    <div className={styles.tail} ref={tailRef}>
      {hasAction('moreFilters') && (
        <button
          ref={moreBtnRef}
          type="button"
          className={[styles.moreBtn, moreRect ? styles.moreBtnActive : ''].join(' ')}
          onClick={moreRect ? onCloseMore : onOpenMore}
        >
          More Filters
          <DownChevronIcon color={moreRect ? 'var(--primary-300)' : 'var(--neutral-300)'} />
        </button>
      )}

      {hasActive && (
        <>
          {hasAction('moreFilters') && <span className={styles.vDivider} />}
          <button className={styles.clearAll} onClick={onClearAll}>
            Clear All
          </button>
          {(hasAction('saveFilter') || hasAction('saveFilterDialog')) && (
            <>
              <span className={styles.vDivider} />
              <button
                className={styles.saveFilter}
                onClick={() => {
                  if (hasAction('saveFilterDialog')) onOpenSaveDialog();
                  else onSaveFilter();
                }}
              >
                Save Filter
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
