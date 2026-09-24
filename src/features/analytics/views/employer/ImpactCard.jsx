import { useRef, useState } from 'react';
import { ActionButton } from '../../../../components/ActionButton/ActionButton';
import { MenuPopover } from '../../../../components/MenuPopover/MenuPopover';
import { Tooltip } from '../../../../components/Tooltip/Tooltip';
import { Icon } from '../../../../components/Icon/Icon';
import { RingEmptyState } from '../../../../components/RingEmptyState/RingEmptyState';
import styles from './EmployerImpactView.module.css';

/**
 * One widget's card: title with its (i) definition, the date range it
 * covers, and its actions: expand, download (CSV), and a menu with the
 * table view and hide. Figma 5618:10554.
 *
 * @param {object}   props
 * @param {string}   props.title
 * @param {string}   [props.info]       – Definition shown on the (i)
 * @param {string}   [props.sub]        – The date range
 * @param {boolean}  props.hasData
 * @param {function} [props.onExpand]   – Omit to drop the expand action
 * @param {function} [props.onDownload]
 * @param {function} [props.onTable]
 * @param {function} [props.onHide]
 * @param {string}   [props.className]
 */
export function ImpactCard({ title, info, sub, hasData, onExpand, onDownload, onTable, onHide, className, children }) {
  const moreRef = useRef(null);
  const [menuRect, setMenuRect] = useState(null);

  const menuItems = [
    onTable && hasData && { key: 'table', label: 'View as table', icon: 'solar:list-linear' },
    onHide && { key: 'hide', label: 'Hide widget', icon: 'solar:eye-closed-linear' },
  ].filter(Boolean);

  return (
    <section className={[styles.card, className].filter(Boolean).join(' ')} aria-label={title}>
      <header className={styles.cardHead}>
        <div className={styles.cardHeadText}>
          <span className={styles.cardTitle}>
            {title}
            {info && (
              <Tooltip label={info}>
                <span className={styles.cardInfo} role="img" aria-label={info}>
                  <Icon name="solar:info-circle-linear" size={14} color="var(--neutral-200)" />
                </span>
              </Tooltip>
            )}
          </span>
          {sub && <span className={styles.cardSub}>{sub}</span>}
        </div>
        <div className={styles.cardActions}>
          {onExpand && <ActionButton icon="solar:maximize-square-linear" size="S" tooltip="Expand" aria-label={`Expand ${title}`} disabled={!hasData} onClick={onExpand} />}
          {onDownload && <ActionButton icon="solar:download-minimalistic-linear" size="S" tooltip="Download CSV" aria-label={`Download ${title}`} disabled={!hasData} onClick={onDownload} />}
          {menuItems.length > 0 && (
            <span ref={moreRef}>
              <ActionButton
                icon="solar:menu-dots-linear"
                size="S"
                tooltip="More"
                aria-label={`More actions for ${title}`}
                onClick={() => setMenuRect(moreRef.current?.getBoundingClientRect() || null)}
              />
            </span>
          )}
        </div>
      </header>
      <div className={styles.cardBody}>
        {hasData ? children : (
          <div className={styles.cardEmpty}>
            <RingEmptyState icon="solar:chart-2-linear" label="No Data to show" iconSize={31} />
          </div>
        )}
      </div>
      {menuRect && (
        <MenuPopover
          anchorRect={menuRect}
          align="right"
          width={180}
          ariaLabel={`${title} actions`}
          items={menuItems}
          onSelect={(key) => {
            setMenuRect(null);
            if (key === 'table') onTable?.();
            if (key === 'hide') onHide?.();
          }}
          onClose={() => setMenuRect(null)}
        />
      )}
    </section>
  );
}
