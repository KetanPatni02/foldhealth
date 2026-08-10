import { ActionButton } from '../../../../../../components/ActionButton/ActionButton';
import { SearchBar } from '../../../../../../components/SearchBar/SearchBar';
import { MenuPopover } from '../../../../../../components/MenuPopover/MenuPopover';
import { LogGroup } from './OutreachTabLog';
import { ACTIVITY_FILTERS } from './OutreachTab.utils';
import styles from './OutreachTab.module.css';

export function OutreachTabActivity({
  activityFilter,
  setActivityFilter,
  activitySearchOpen,
  setActivitySearchOpen,
  activitySearchText,
  setActivitySearchText,
  outreachScope,
  setOutreachScope,
  filterMenu,
  setFilterMenu,
  logGroups,
  filteredLogGroups,
  onEdit,
  onDelete,
}) {
  return (
    <>
      <div className={styles.activityHeader}>
        <span className={styles.activityLabel}>Outreach Activity</span>
      </div>

      <div className={styles.activityFilterBar}>
        <div className={styles.activityFilterTabs}>
          {ACTIVITY_FILTERS.map(({ key, dot }) => (
            <button
              key={key}
              type="button"
              className={`${styles.activityFilterTab} ${activityFilter === key ? styles.activityFilterTabActive : ''}`}
              onClick={() => setActivityFilter(key)}
            >
              {dot && <span className={styles.activityFilterDot} style={{ background: dot }} />}
              {key}
            </button>
          ))}
        </div>
        <div className={styles.activityFilterActions}>
          {activitySearchOpen ? (
            <SearchBar
              className={styles.activitySearchBar}
              placeholder="Search activity"
              value={activitySearchText}
              onChange={e => setActivitySearchText(e.target.value)}
              onClose={() => { setActivitySearchOpen(false); setActivitySearchText(''); }}
            />
          ) : (
            <ActionButton size="S" icon="solar:magnifer-linear" tooltip="Search" onClick={() => setActivitySearchOpen(true)} />
          )}
          <span className={styles.activityFilterDivider} />
          <ActionButton
            size="S"
            icon="custom:filter"
            tooltip="Filter"
            iconColor={outreachScope !== 'All' ? 'var(--primary-300)' : undefined}
            onClick={e => setFilterMenu({ rect: e.currentTarget.getBoundingClientRect() })}
          />
        </div>
      </div>

      {filteredLogGroups.map(group => (
        <LogGroup
          key={group.id}
          label={group.label}
          logs={group.logs}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}

      {filterMenu && (() => {
        const codes = [...new Set(logGroups.flatMap(g => g.logs.flatMap(l => l.programs || [])))];
        const opt = (key, text) => ({
          key,
          label: <span style={{ color: outreachScope === key ? 'var(--primary-300)' : undefined }}>{text}</span>,
        });
        return (
          <MenuPopover
            anchorRect={filterMenu.rect}
            align="right"
            width={200}
            ariaLabel="Filter outreach by"
            items={[
              opt('All', 'All Outreach'),
              ...codes.map(c => opt(c, c)),
              opt('Care Gaps', 'Care Gaps'),
              opt('HCC Gaps', 'HCC Gaps'),
            ]}
            onSelect={key => setOutreachScope(key)}
            onClose={() => setFilterMenu(null)}
          />
        );
      })()}
    </>
  );
}
