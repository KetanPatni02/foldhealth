import { Input as FoldInput } from '../../components/Input/Input';
import { Button } from '../../components/Button/Button';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { SearchIconButton } from '../../components/SearchIconButton/SearchIconButton';
import { Checkbox } from '../../components/ShadcnCheckbox/ShadcnCheckbox';
import { HeaderCell } from '../../components/HeaderCell/HeaderCell';
import { Avatar } from '../../components/Avatar/Avatar';
import PaginationBar from './components/PaginationBar.jsx';
import { GroupName, BulkSelectIcon, UsersGroupRoundedLinear, TABLE_TH_STYLE, TABLE_TD_STYLE } from './PopulationGroupsViewPanels.jsx';

const Input = (props) => <FoldInput {...props} />;

export function PopulationGroupsViewTable({ vm, onToggleSidebar }) {
  const {
    searchQuery, setSearchQuery, searchOpen, setSearchOpen,
    checkedRows, setCheckedRows, hoveredRow, setHoveredRow,
    popPage, setPopPage, popPageSize, setPopPageSize, popGoToInput, setPopGoToInput,
    pgSortKey, pgSortDir, pgRequestSort,
    popTotalPages, safePg, pagedGroups, buildPopPages,
    openEditModal, openNewModal,
  } = vm;

  return (
    <>
      {/* ── Sub-header ── (left padding tuned so the collapse icon's left edge aligns with the table checkbox) */}
      <div style={{ padding:'10px 20px 10px 6px', borderBottom:'0.5px solid var(--neutral-150)', display:'flex', alignItems:'center', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <ActionButton icon="solar:sidebar-minimalistic-linear" size="L" tooltip="Collapse sidebar" iconColor="var(--neutral-300)" onClick={onToggleSidebar} />
          <span style={{ fontSize:16, fontWeight:600, color:'var(--neutral-400)' }}>Population Groups</span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0, marginLeft:'auto' }}>
          {/* ── Search groups — icon expands to a text field on click (same as app-wide search) ── */}
          {searchOpen ? (
            <Input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onBlur={() => { if (!searchQuery.trim()) setSearchOpen(false); }}
              placeholder="Search groups..."
              style={{ width: 220 }}
            />
          ) : (
            <SearchIconButton title="Search groups" onClick={() => setSearchOpen(true)} />
          )}

          <span style={{ width: 1, height: 16, background: 'var(--neutral-150)', flexShrink: 0 }} />

          {/* ── Dev-mode toggle (experimental flows) — disabled for now ──
          <button
            onClick={() => setShowDevButtons(v => !v)}
            title={showDevButtons ? 'Hide experimental flows' : 'Show experimental flows'}
            style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', border:`0.5px solid ${showDevButtons ? 'var(--primary-200)' : 'var(--neutral-150)'}`, borderRadius:6, background: showDevButtons ? 'var(--primary-50)' : 'var(--neutral-0)', cursor:'pointer', transition:'all 0.15s', flexShrink:0 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 1h4M5 1v5L2 12h10L9 6V1" stroke={showDevButtons ? 'var(--primary-300)' : 'var(--neutral-200)'} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="5.5" cy="9.5" r="0.8" fill={showDevButtons ? 'var(--primary-300)' : 'var(--neutral-200)'}/>
              <circle cx="8" cy="10.5" r="0.6" fill={showDevButtons ? 'var(--primary-300)' : 'var(--neutral-200)'}/>
            </svg>
          </button>
          */}

          {/* ── Create Group — opens the file-upload workflow (error card / all-matched review) ── */}
          <Button variant="secondary" size="L" leadingIcon="solar:add-circle-linear" onClick={openNewModal}>Create Group</Button>

          <span style={{ width: 1, height: 16, background: 'var(--neutral-150)', flexShrink: 0 }} />

          {/* Import Rule — neutral button, no icon */}
          <Button variant="secondary" size="L">Import Rule</Button>

          <span style={{ width: 1, height: 16, background: 'var(--neutral-150)', flexShrink: 0 }} />

          {/* Bulk actions icon — matches Settings → Content bulk-select icon (neutral-300) */}
          <ActionButton size="L" tooltip="Bulk actions" style={{ color: 'var(--neutral-300)' }}><BulkSelectIcon /></ActionButton>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="thin-scroll" style={{ flex:1, overflowY:'auto', overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'Inter, sans-serif', minWidth:900 }}>
          <thead>
            <tr>
              <th style={{ ...TABLE_TH_STYLE, width:36, padding:'8px 10px' }}>
                <Checkbox checked={false} aria-label="Select all" />
              </th>
              {[
                { label:'Group Name' },
                { label:'Active Members', sortKey:'count' },
                { label:'Inactive Members', sortKey:'inactive' },
                { label:'Type' },
                { label:'Created Date', sortKey:'_createdTs', w:160 },
                { label:'Updated Date', sortKey:'_updatedTs', w:160 },
                { label:'Action' },
              ].map(col => (
                <HeaderCell
                  key={col.label}
                  label={col.label}
                  sortKey={col.sortKey}
                  activeKey={pgSortKey}
                  activeDir={pgSortDir}
                  onSort={pgRequestSort}
                  style={{ ...TABLE_TH_STYLE, width: col.w ? col.w : undefined }}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedGroups.map((g, idx) => {
              const isChecked = checkedRows.has(g.id);
              const isHov    = hoveredRow === g.id;
              return (
                <tr key={g.id}
                  onMouseEnter={() => setHoveredRow(g.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{ borderBottom:'0.5px solid var(--neutral-100)', background: isHov ? 'var(--primary-25)' : 'var(--neutral-0)', transition:'background 0.1s', cursor:'pointer' }}>

                  {/* checkbox */}
                  <td style={{ padding:'12px 10px', verticalAlign:'middle' }} onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => setCheckedRows(prev => { const n=new Set(prev); n.has(g.id)?n.delete(g.id):n.add(g.id); return n; })}
                      aria-label={`Select ${g.name}`}
                    />
                  </td>

                  {/* name + avatar */}
                  <td style={TABLE_TD_STYLE}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                      <Avatar variant="patient" initials={<UsersGroupRoundedLinear size={16} color="var(--primary-300)" />} />
                      <GroupName name={g.name} />
                    </div>
                  </td>

                  {/* active members */}
                  <td style={TABLE_TD_STYLE}>{g.count != null ? g.count : '–'}</td>

                  {/* inactive members */}
                  <td style={TABLE_TD_STYLE}>{g.inactive != null ? g.inactive : '–'}</td>

                  {/* type */}
                  <td style={TABLE_TD_STYLE}>{g.type}</td>

                  {/* created date */}
                  <td style={{ ...TABLE_TD_STYLE, whiteSpace:'nowrap', width:160 }}>{g.created}</td>

                  {/* updated date */}
                  <td style={{ ...TABLE_TD_STYLE, whiteSpace:'nowrap', width:160 }}>{g.updated}</td>

                  {/* actions */}
                  <td style={{ padding:'0 12px', verticalAlign:'middle' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:0 }}>
                      {/* Run */}
                      <ActionButton icon="solar:bolt-linear" size="L" tooltip="Run Automation" iconColor="var(--neutral-300)" />
                      <div style={{ width:1, height:16, background:'var(--neutral-150)', margin:'0 4px', flexShrink:0 }} />
                      {/* Edit */}
                      <ActionButton icon="solar:pen-linear" size="L" tooltip="Edit Group" iconColor="var(--neutral-300)" onClick={() => openEditModal(g)} />
                      <div style={{ width:1, height:16, background:'var(--neutral-150)', margin:'0 4px', flexShrink:0 }} />
                      {/* Delete */}
                      <ActionButton icon="solar:trash-bin-minimalistic-linear" size="L" tooltip="Delete Group" iconColor="var(--neutral-300)" />
                      <div style={{ width:1, height:16, background:'var(--neutral-150)', margin:'0 4px', flexShrink:0 }} />
                      {/* More */}
                      <ActionButton icon="solar:menu-dots-linear" size="L" tooltip="More Options" iconColor="var(--neutral-300)" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <PaginationBar
        currentPage={popPage}
        totalPages={popTotalPages}
        safePage={safePg}
        onPageChange={setPopPage}
        pageSize={popPageSize}
        onPageSizeChange={n => { setPopPageSize(n); setPopPage(1); }}
        goToInput={popGoToInput}
        onGoToInputChange={setPopGoToInput}
        onGoToPage={() => {
          const n = parseInt(popGoToInput);
          if (!isNaN(n) && n >= 1 && n <= popTotalPages) { setPopPage(n); setPopGoToInput(''); }
        }}
        buildPages={buildPopPages}
      />
    </>
  );
}
