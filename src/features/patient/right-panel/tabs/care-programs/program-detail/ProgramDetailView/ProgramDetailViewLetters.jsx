import { Icon } from '../../../../../../../components/Icon/Icon';
import { ActionButton } from '../../../../../../../components/ActionButton/ActionButton';
import { Button } from '../../../../../../../components/Button/Button';
import { SearchBar } from '../../../../../../../components/SearchBar/SearchBar';
import { FilterChip } from '../../../../../../../components/FilterChip/FilterChip';
import { Checkbox } from '../../../../../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { RingEmptyState } from '../../../../../../../components/RingEmptyState/RingEmptyState';
import { LETTER_SUB_TABS } from './ProgramDetailView.utils';
import styles from './ProgramDetailView.module.css';

export function ProgramDetailViewLetters({
  letterSearchOpen,
  setLetterSearchOpen,
  letterSearchText,
  setLetterSearchText,
  activeLetterTab,
  setActiveLetterTab,
  setAddLetterOpen,
  letterFiltersOpen,
  setLetterFiltersOpen,
  letterFilterMeta,
  letterFilters,
  setLetterFilter,
  letterFiltersActive,
  clearLetterFilters,
  allLettersSelected,
  someLettersSelected,
  toggleAllLetters,
  shownLetters,
  selectedLetters,
  toggleLetter,
  setSendTarget,
  setRowMenu,
  setHistoryOpen,
  isLettersPane,
  downloadSelectedLetters,
  letters,
  setSelectedLetters,
}) {
  return (
    <>
      <div className={styles.contentInner}>
        <div className={styles.contentSubTabs}>
          {letterSearchOpen ? (
            <div className={styles.letterSearchWrap}>
              <SearchBar fullWidth placeholder="Search letters" value={letterSearchText}
                onChange={e => setLetterSearchText(e.target.value)}
                onClose={() => { setLetterSearchOpen(false); setLetterSearchText(''); }} />
            </div>
          ) : (
            <>
              <ActionButton icon="solar:magnifer-linear" size="S" tooltip="Search" onClick={() => setLetterSearchOpen(true)} />
              <span className={styles.tabDivider} />
              {LETTER_SUB_TABS.map(tab => (
                <button key={tab}
                  className={`${styles.contentTab} ${activeLetterTab === tab ? styles.contentTabActive : ''}`}
                  onClick={() => setActiveLetterTab(tab)}>{tab}</button>
              ))}
              <div style={{ flex: 1 }} />
            </>
          )}
          <ActionButton icon="solar:add-circle-linear" size="S" tooltip="Add" onClick={() => setAddLetterOpen(true)} />
          <ActionButton icon="solar:filter-linear" size="S" tooltip="Filter" active={letterFiltersOpen}
            iconColor={letterFiltersOpen ? 'var(--primary-300)' : undefined}
            onClick={() => setLetterFiltersOpen(v => !v)} />
          <ActionButton icon="solar:history-linear" size="S" tooltip="History" onClick={() => setHistoryOpen(true)} />
        </div>

        {letterFiltersOpen && (
          <div className={styles.letterFilterBar}>
            {letterFilterMeta.map(f => (
              <FilterChip key={f.key} label={f.label} options={f.options}
                selected={letterFilters[f.key]} onChange={vals => setLetterFilter(f.key, vals)} />
            ))}
            {letterFiltersActive && (
              <button className={styles.letterClearAll} onClick={clearLetterFilters}>
                <Icon name="solar:backspace-linear" size={16} color="var(--primary-300)" />
                Clear All
              </button>
            )}
          </div>
        )}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkCell}>
                  <Checkbox checked={someLettersSelected ? 'indeterminate' : allLettersSelected}
                    onCheckedChange={toggleAllLetters} aria-label="Select all letters" />
                </th>
                <th>File Name</th>
                <th>File Type</th>
                <th>Sent Via</th>
                <th>Last Sent</th>
                <th>Sent By</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {shownLetters.length === 0 && (
                <tr>
                  <td colSpan={7} className={styles.lettersEmptyCell}>
                    <RingEmptyState icon="solar:letter-linear" label="No Letters" />
                  </td>
                </tr>
              )}
              {shownLetters.map(letter => (
                <tr key={letter.id} className={selectedLetters.has(letter.id) ? styles.rowSelected : undefined}>
                  <td className={styles.checkCell}>
                    <Checkbox checked={selectedLetters.has(letter.id)}
                      onCheckedChange={() => toggleLetter(letter.id)}
                      aria-label={`Select ${letter.fileName}`} />
                  </td>
                  <td className={styles.fileNameCell}>{letter.fileName}</td>
                  <td className={styles.colMuted}>{letter.fileType}</td>
                  <td>
                    <span className={styles.viaChips}>
                      {letter.sentVia.map(v => <span key={v} className={styles.viaChip}>{v}</span>)}
                    </span>
                  </td>
                  <td>{letter.lastSent}</td>
                  <td>{letter.sentBy}</td>
                  <td className={styles.rowActionsCell}>
                    {selectedLetters.size === 0 && (
                      <div className={styles.rowActions}>
                        <ActionButton icon="solar:plain-linear" size="S" tooltip="Send letter"
                          onClick={() => setSendTarget({ letterName: letter.fileName, clearOnSent: false })} />
                        <ActionButton icon="solar:menu-dots-linear" size="S" tooltip="More actions"
                          onClick={(e) => setRowMenu({ id: letter.id, rect: e.currentTarget.getBoundingClientRect() })} />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isLettersPane && selectedLetters.size > 0 && (
        <div className={styles.bulkBar} role="toolbar" aria-label="Letter bulk actions">
          <div className={styles.bulkSelect}>
            <Checkbox checked={someLettersSelected ? 'indeterminate' : allLettersSelected}
              onCheckedChange={toggleAllLetters} aria-label="Select all letters" />
            <span className={styles.bulkCount}>{selectedLetters.size} Selected</span>
          </div>
          <span className={styles.bulkDivider} />
          <Button variant="secondary" size="L" leadingIcon="solar:download-minimalistic-linear" onClick={downloadSelectedLetters}>
            Download Files
          </Button>
          <Button variant="primary" size="L" leadingIcon="solar:plain-linear"
            onClick={() => setSendTarget({
              letterName: selectedLetters.size === 1
                ? letters.find(l => selectedLetters.has(l.id))?.fileName || 'Letter'
                : 'Letters',
              clearOnSent: true,
            })}>
            Send Files
          </Button>
          <span className={styles.bulkDivider} />
          <ActionButton icon="solar:close-square-linear" size="S" tooltip="Clear selection"
            onClick={() => setSelectedLetters(new Set())} />
        </div>
      )}
    </>
  );
}
