import { useState } from 'react';
import { Button } from '../Button/Button';
import { ActionButton } from '../ActionButton/ActionButton';
import { SearchBar } from '../SearchBar/SearchBar';
import { SearchIconButton } from '../SearchIconButton/SearchIconButton';
import { Toggle } from '../Toggle/Toggle';
import { FilterChip } from '../FilterChip/FilterChip';
import styles from './SectionTitleBar.module.css';

/**
 * Fold Health SectionTitleBar — shared header bar sitting between SubNav and
 * page content across the demo platform.
 *
 * Three left-side variants:
 *   • variant="tabs"              — Tab strip (default; TOC pattern).
 *   • variant="titleWithDropdown" — Static title + attached dropdown chip
 *                                    (e.g. `HCC List  Due Date ⌄`).
 *   • variant="titleWithToggle"   — Static title + segmented toggle
 *                                    (e.g. `SNP List  Enrolled | Eligible`).
 *
 * Right-side actions are opt-in via `show*` flags so each page picks the
 * exact icon set it needs (Search, Filter, History, Upload, Download,
 * Saved Filters). `rightExtras` renders custom content before the icon
 * cluster for page-specific controls.
 */
export function SectionTitleBar({
  variant = 'tabs',

  // Tabs variant
  tabs = [],
  activeTab,
  onTabChange,

  // TitleWithDropdown variant — uses shared FilterChip (see CLAUDE.md).
  // `dropdownValue` accepts either a single string or a string[] to stay
  // aligned with FilterChip's array-shaped onChange contract.
  title,
  dropdownLabel = 'Filter',
  dropdownValue,
  dropdownOptions = [],
  onDropdownChange,

  // TitleWithToggle variant
  toggleItems = [],
  toggleActive,
  onToggleChange,

  // Right side action flags
  showSearch = false,
  showFilter = false,
  showHistory = false,
  showUpload = false,
  showDownload = false,
  showSavedFilters = false,

  // Right side handlers
  onSearch,
  onFilter,
  onHistory,
  onUpload,
  onDownload,
  onSavedFilters,

  // Optional customisation
  searchPlaceholder = 'Search…',
  searchValue = '',
  onSearchChange,
  filterActive = false,
  filterBadgeCount,
  savedFiltersLabel = 'Saved Filters',
  savedFiltersActive = false,
  uploadLabel = 'Upload Record',
  uploadHasDropdown = false,
  rightExtras,
  leftExtras,
  className,
}) {
  const [searchOpen, setSearchOpen] = useState(false);

  const cls = [styles.tabBar, className || ''].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      <div className={styles.left}>
        {variant === 'tabs' && (
          <TabsSection tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
        )}
        {variant === 'titleWithDropdown' && (
          <TitleDropdownSection
            title={title}
            label={dropdownLabel}
            value={dropdownValue}
            options={dropdownOptions}
            onChange={onDropdownChange}
          />
        )}
        {variant === 'titleWithToggle' && (
          <TitleToggleSection
            title={title}
            items={toggleItems}
            active={toggleActive}
            onChange={onToggleChange}
          />
        )}
        {leftExtras}
      </div>

      <div className={styles.right}>
        {rightExtras}

        {showSavedFilters && (
          <>
            <Button
              variant="secondary"
              size="L"
              trailingIcon="solar:alt-arrow-down-linear"
              onClick={onSavedFilters}
              className={savedFiltersActive ? styles.savedFiltersActive : ''}
            >
              {savedFiltersLabel}
            </Button>
            <span className={styles.iconDivider} />
          </>
        )}

        {showSearch && (
          <>
            <div className={styles.searchWrap}>
              {searchOpen ? (
                <SearchBar
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={e => onSearchChange && onSearchChange(e.target.value)}
                  onClose={() => {
                    setSearchOpen(false);
                    if (onSearchChange) onSearchChange('');
                  }}
                />
              ) : (
                <SearchIconButton
                  title="Search"
                  tooltipBelow
                  onClick={() => {
                    setSearchOpen(true);
                    if (onSearch) onSearch();
                  }}
                />
              )}
            </div>
            <span className={styles.iconDivider} />
          </>
        )}

        {showFilter && (
          <>
            <ActionButton
              icon="custom:filter"
              size="L"
              tooltip="Filter"
              tooltipBelow
              notification={typeof filterBadgeCount === 'number' && filterBadgeCount > 0}
              count={typeof filterBadgeCount === 'number' && filterBadgeCount > 0 ? String(filterBadgeCount) : undefined}
              className={filterActive ? styles.iconActive : ''}
              onClick={onFilter}
            />
            <span className={styles.iconDivider} />
          </>
        )}

        {showDownload && (
          <>
            <ActionButton
              icon="solar:download-minimalistic-linear"
              size="L"
              tooltip="Download"
              tooltipBelow
              onClick={onDownload}
            />
            <span className={styles.iconDivider} />
          </>
        )}

        {showUpload && (
          <>
            <Button
              variant="primary"
              size="L"
              leadingIcon="solar:upload-minimalistic-linear"
              trailingIcon={uploadHasDropdown ? 'solar:alt-arrow-down-linear' : undefined}
              onClick={onUpload}
            >
              {uploadLabel}
            </Button>
            <span className={styles.iconDivider} />
          </>
        )}

        {showHistory && (
          <ActionButton
            icon="solar:history-linear"
            size="L"
            tooltip="History"
            tooltipBelow
            onClick={onHistory}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── Left-side sections ────────────────────────────

function TabsSection({ tabs, activeTab, onTabChange }) {
  return (
    <div className={styles.tabsRow}>
      {tabs.map(tab => (
        <div
          key={tab.key}
          className={[styles.tabItem, activeTab === tab.key ? styles.active : ''].filter(Boolean).join(' ')}
          onClick={() => onTabChange && onTabChange(tab.key)}
        >
          {tab.label}
          {tab.notif && <span className={styles.notifDot} title="New activity" />}
        </div>
      ))}
    </div>
  );
}

function TitleDropdownSection({ title, label, value, options, onChange }) {
  // Normalize `value` (string | string[] | null) → array shape FilterChip wants.
  const selected = Array.isArray(value) ? value : value == null || value === '' ? [] : [value];

  return (
    <div className={styles.titleRow}>
      <span className={styles.title}>{title}</span>
      <FilterChip
        label={label}
        options={options}
        selected={selected}
        singleSelect
        size="S"
        onChange={(next) => onChange && onChange(next[0] ?? null)}
      />
    </div>
  );
}

function TitleToggleSection({ title, items, active, onChange }) {
  // With 0 or 1 items the segmented control has no meaningful switch — render
  // just the title so single-list surfaces (All Patients, HCC, CCM) can share
  // this variant without a lopsided one-button pill.
  const hasToggle = Array.isArray(items) && items.length > 1;
  return (
    <div className={styles.titleRow}>
      <span className={styles.title}>{title}</span>
      {hasToggle && (
        <Toggle items={items} active={active} onChange={onChange} size="S" />
      )}
    </div>
  );
}
