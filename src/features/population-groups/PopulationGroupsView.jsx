/**
 * PopulationGroupsView.jsx — Fold Health · Population Groups panel
 * Ported from the Pop-group-creation-via-file-upload prototype.
 * antd → Fold Input/Textarea · xlsx → built-in CSV parser · solar-icon-set → Fold <Icon>.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from '../../components/Icon/Icon';
import { Input as FoldInput } from '../../components/Input/Input';
import { Textarea } from '../../components/Textarea/Textarea';

import SectionAccordion   from './components/SectionAccordion.jsx';
import FileChipCard        from './components/FileChipCard.jsx';
import { TableIcon, MiniCloseIcon, Spinner, ZapIcon, CollapseIcon, ExpandIcon, ReplaceIcon, FileErrorIllustration, CheckRoundIcon } from './components/icons.jsx';
import PaginationBar       from './components/PaginationBar.jsx';
import { FOLD_DB, FOLD_DB_MAP } from './data/fold-db.js';
import { parseXlsxDate, fmtAge } from './data/formatters.js';
import { parseXlsxArrayBuffer } from './xlsxLite.js';
import { useAppStore } from '../../store/useAppStore';
import './popgroups.css';

/* ── antd shims → Fold components (keeps original <Input>/<Input.TextArea>/<ConfigProvider> call-sites) ── */
const Input = (props) => <FoldInput {...props} />;
Input.TextArea = ({ rows = 3, ...props }) => <Textarea rows={rows} {...props} />;
const ConfigProvider = ({ children }) => <>{children}</>;

/* ── solar-icon-set → Fold <Icon> wrappers (same call signature: size, color, style) ── */
const mkIcon = (name) => ({ size = 16, color = 'currentColor', style }) => (
  <Icon name={name} size={size} color={color} style={style} />
);
const AddSquareLinear            = mkIcon('solar:add-square-linear');
const AltArrowDownLinear         = mkIcon('solar:alt-arrow-down-linear');
const CloseCircleLinear          = mkIcon('solar:close-circle-linear');
const DangerCircleLinear         = mkIcon('solar:danger-circle-linear');
const DocumentTextLinear         = mkIcon('solar:document-text-linear');
const FilterLinear               = mkIcon('solar:filter-linear');
const InfoCircleLinear           = mkIcon('solar:info-circle-linear');
const MagniferLinear             = mkIcon('solar:magnifer-linear');
const MenuDotsLinear             = mkIcon('solar:menu-dots-linear');
const PenLinear                  = mkIcon('solar:pen-linear');
const SidebarMinimalisticLinear  = mkIcon('solar:sidebar-minimalistic-linear');
const TrashBinMinimalisticLinear = mkIcon('solar:trash-bin-minimalistic-linear');
const UsersGroupRoundedLinear    = mkIcon('solar:users-group-rounded-linear');

/* ── CSV parser (replaces xlsx) — handles quoted fields, escaped quotes, CRLF ── */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') { inQuotes = true; }
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(v => v !== '')) rows.push(row);
      row = [];
    } else { field += c; }
  }
  if (field !== '' || row.length) { row.push(field); if (row.some(v => v !== '')) rows.push(row); }
  return rows;
}

/* Parse an HTML-table .xls (the format produced by "Download File with Errors")
   so the download → correct → reupload round-trip works without the xlsx lib. */
function parseHtmlTable(text) {
  const rows = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const tdRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let tr;
  while ((tr = trRe.exec(text))) {
    const cells = [];
    let td;
    while ((td = tdRe.exec(tr[1]))) {
      cells.push(td[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim());
    }
    if (cells.some(c => c !== '')) rows.push(cells);
  }
  return rows;
}

/* Route a file's text to the right parser (HTML-table .xls vs CSV/TSV). */
function parseTable(text) {
  return /<table[\s>]/i.test(text) ? parseHtmlTable(text) : parseCsv(text);
}


/* ─── Population Groups — data ───────────────────────────────────────────── */
const POP_GROUPS = [
  { id:1,  name:'Patients having CAD with LDL > 100 and not seen in the last 3 months',     type:'Dynamic', count:43,   inactive:7,  updated:'01/16/2024 06:30 PM', created:'02/22/2024' },
  { id:2,  name:'45 years or older without screening colonoscopy',                            type:'Dynamic', count:84,   inactive:12, updated:'01/16/2024 06:30 PM', created:'02/22/2024' },
  { id:3,  name:'Diabetic patients with HBA1C Above 9 and are not on Statin',               type:'Dynamic', count:null, inactive:0,  updated:'01/16/2024 06:30 PM', created:'02/22/2024' },
  { id:4,  name:"Active members who haven't interacted in last 6 months",                    type:'Dynamic', count:31,   inactive:3,  updated:'01/16/2024 06:30 PM', created:'02/22/2024' },
  { id:5,  name:'Diabetic Patients with HBA1C between 8 and 9',                              type:'Static',  count:44,   inactive:8,  updated:'01/16/2024 06:30 PM', created:'02/22/2024' },
  { id:6,  name:'Diabetic Complications Blood Glucose Patients',                              type:'Dynamic', count:79,   inactive:21, updated:'01/16/2024 06:30 PM', created:'02/22/2024' },
  { id:7,  name:'Hypertension Patients with prescribed antihypertensive medications',        type:'Static',  count:14,   inactive:2,  updated:'01/16/2024 06:30 PM', created:'02/22/2024' },
  { id:8,  name:'Patients with HBA1C Above 7',                                               type:'Dynamic', count:32,   inactive:5,  updated:'01/16/2024 06:30 PM', created:'02/22/2024' },
  { id:9,  name:'Hypertension Patients with BMI > 25 on last appointment',                   type:'Dynamic', count:48,   inactive:9,  updated:'01/16/2024 06:30 PM', created:'02/22/2024' },
  { id:10, name:'CHF patients with ejection fraction below 40% not on ACE inhibitor',        type:'Dynamic', count:27,   inactive:4,  updated:'03/05/2024 10:15 AM', created:'03/05/2024' },
  { id:11, name:'Patients 65+ with no annual wellness visit in past 12 months',               type:'Dynamic', count:112,  inactive:18, updated:'03/08/2024 02:45 PM', created:'03/08/2024' },
  { id:12, name:'COPD patients with 2+ ED visits in the last 90 days',                       type:'Dynamic', count:19,   inactive:1,  updated:'03/12/2024 09:00 AM', created:'03/12/2024' },
  { id:13, name:'High-risk postpartum patients within 60 days of delivery',                   type:'Static',  count:8,    inactive:0,  updated:'03/15/2024 11:30 AM', created:'03/15/2024' },
  { id:14, name:'SNP members not seen by PCP in last 6 months',                               type:'Dynamic', count:56,   inactive:11, updated:'03/20/2024 03:00 PM', created:'03/20/2024' },
  { id:15, name:'Patients on 5+ chronic medications without a medication reconciliation',     type:'Dynamic', count:73,   inactive:14, updated:'03/22/2024 08:45 AM', created:'03/22/2024' },
  { id:16, name:'Atrial fibrillation patients not on anticoagulation therapy',                type:'Dynamic', count:35,   inactive:6,  updated:'03/25/2024 04:20 PM', created:'03/25/2024' },
  { id:17, name:'Pediatric patients with asthma and 1+ hospitalization this year',            type:'Static',  count:11,   inactive:0,  updated:'04/01/2024 01:10 PM', created:'04/01/2024' },
  { id:18, name:'Patients with depression screening overdue by 6 months',                     type:'Dynamic', count:91,   inactive:22, updated:'04/03/2024 10:00 AM', created:'04/03/2024' },
  { id:19, name:'CKD Stage 3–4 patients not referred to nephrology',                          type:'Dynamic', count:24,   inactive:3,  updated:'04/07/2024 07:30 AM', created:'04/07/2024' },
  { id:20, name:'Members with uncontrolled type 2 diabetes and high BMI',                     type:'Dynamic', count:62,   inactive:9,  updated:'04/10/2024 12:00 PM', created:'04/10/2024' },
  { id:21, name:'Post-discharge patients without follow-up within 7 days',                    type:'Dynamic', count:18,   inactive:2,  updated:'04/14/2024 09:45 AM', created:'04/14/2024' },
  { id:22, name:'Patients with osteoporosis and no DEXA scan in 2 years',                     type:'Static',  count:37,   inactive:5,  updated:'04/16/2024 03:30 PM', created:'04/16/2024' },
  { id:23, name:'High-cost members with 3+ specialist visits and no care coordination',       type:'Dynamic', count:15,   inactive:1,  updated:'04/18/2024 11:00 AM', created:'04/18/2024' },
  { id:24, name:'Patients with tobacco use and no cessation counseling',                       type:'Dynamic', count:88,   inactive:16, updated:'04/22/2024 02:15 PM', created:'04/22/2024' },
  { id:25, name:'Pediatric immunization gap list — missing MMR booster',                       type:'Static',  count:29,   inactive:0,  updated:'04/25/2024 08:00 AM', created:'04/25/2024' },
  { id:26, name:'Patients with BMI ≥ 35 and no referral to weight management program',        type:'Dynamic', count:54,   inactive:7,  updated:'04/28/2024 05:00 PM', created:'04/28/2024' },
  { id:27, name:'Patients awaiting colonoscopy with bowel prep instructions not sent',         type:'Static',  count:6,    inactive:0,  updated:'05/01/2024 10:30 AM', created:'05/01/2024' },
  { id:28, name:'Members with lupus and no rheumatology visit in last 12 months',              type:'Dynamic', count:21,   inactive:4,  updated:'05/05/2024 01:45 PM', created:'05/05/2024' },
  { id:29, name:'Patients with fall risk score ≥ 3 and no PT referral on record',              type:'Dynamic', count:40,   inactive:8,  updated:'05/08/2024 09:20 AM', created:'05/08/2024' },
];

const FILTER_OPTIONS = [
  { value:'static-search', label:'Static (Search & Add Members)' },
  { value:'static-csv',    label:'Static (Upload From CSV File)' },
  { value:'dynamic',       label:'Dynamic (Add By Patient characteristics)' },
];

const MEMBERSHIP_OPTS = ['All Status','Active','Inactive','Churned','Pending'];

const CRIT_ATTRS = [
  { label:'Age',            ops:['=','≠','>','<','≥','≤'],               type:'number' },
  { label:'Gender',         ops:['is','is not'],                          type:'select', opts:['Male','Female','Other'] },
  { label:'Condition',      ops:['includes','excludes'],                  type:'text' },
  { label:'Risk Level',     ops:['is','is not'],                          type:'select', opts:['High Risk','Medium Risk','Low Risk'] },
  { label:'Program Status', ops:['is','is not'],                          type:'select', opts:['Active','Completed','Enrolled','Discharged'] },
  { label:'Language',       ops:['is','is not'],                          type:'select', opts:['English','Spanish','French','Other'] },
  { label:'Lace Score',     ops:['>','<','≥','≤','='],                    type:'number' },
  { label:'HbA1c',          ops:['>','<','≥','≤'],                         type:'number' },
  { label:'Discharge Date', ops:['within last','before','after'],         type:'text' },
  { label:'Admission Type', ops:['is','is not'],                          type:'select', opts:['Inpatient','Outpatient','Emergency'] },
];

/* FOLD_DB and FOLD_DB_MAP are imported from './constants/fold-db.js' */
const PROC_STEPS = [
  'Reading the uploaded file',
  'Extracting values for processing',
  'Matching Patient IDs with Fold Patients',
];

/* ─── DrawerSelect: styled identically to the drawer Input fields ─────────── */
function DrawerSelect({ value, onChange, options, placeholder, disabled = false, hint }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const handler = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  const selectedLabel = options.find(o => o.value === value)?.label;
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div
        onClick={() => !disabled && setOpen(v => !v)}
        style={{
          height:32, padding:'0 8px', boxSizing:'border-box',
          border:`0.5px solid ${open ? 'var(--primary-300)' : 'var(--neutral-200)'}`,
          borderRadius:6,
          background: disabled ? 'var(--neutral-50)' : '#fff',
          display:'flex', alignItems:'center', gap:4,
          fontSize:14, fontFamily:'Inter, sans-serif',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: open ? '0 0 0 3px var(--primary-100)' : 'none',
          transition:'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:400,
          color: disabled ? 'var(--neutral-150)' : selectedLabel ? 'var(--neutral-400)' : 'var(--neutral-200)' }}>
          {selectedLabel || placeholder}
        </span>
        <AltArrowDownLinear size={12} color={disabled ? 'var(--neutral-150)' : 'var(--neutral-200)'} />
      </div>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'#fff',
          border:'0.5px solid var(--neutral-100)', borderRadius:8,
          boxShadow:'0 4px 16px rgba(0,0,0,0.10)', zIndex:2200, padding:'8px' }}>
          {options.map(opt => (
            <div key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{ padding:'7px 10px', fontSize:14, fontFamily:'Inter, sans-serif',
                color:'var(--neutral-400)', cursor:'pointer', borderRadius:4, marginBottom:2,
                background: value === opt.value ? 'var(--primary-50)' : '#fff',
                border: value === opt.value ? '0.5px solid var(--primary-200)' : '0.5px solid transparent',
                transition:'background 0.1s' }}
              onMouseEnter={e => { if (value !== opt.value) e.currentTarget.style.background = 'var(--neutral-50)'; }}
              onMouseLeave={e => { if (value !== opt.value) e.currentTarget.style.background = value === opt.value ? 'var(--primary-50)' : '#fff'; }}>
              {opt.label}
            </div>
          ))}
        </div>
      )}
      {hint && <div style={{ fontSize:12, color:'var(--neutral-200)', marginTop:4 }}>{hint}</div>}
    </div>
  );
}

/* ─── Figma-aligned summary components (grey-button / default Create Group flow) ── */

/* CellOuter at module level — MUST be outside FigmaIncorrectRow so React doesn't remount on every render, which would lose cursor focus */
function CellOuter({ err, children }) {
  return (
    <div style={{
      border: `0.5px solid ${err ? '#d72825' : 'var(--neutral-200)'}`,
      borderRadius: 4,
      background: err ? '#fff5f5' : '#fff',
      display: 'flex', alignItems: 'center', overflow: 'hidden',
    }}>
      {children}
    </div>
  );
}

/* fmtAge — imported from ./utils/formatters.js */

function FigmaMatchedSection({ patients, expanded, onToggle, allDone }) {
  const title        = allDone ? 'Review Pop Group' : 'Matched Members';
  const gradientFrom = allDone ? '#f0fdf4' : '#f5fffa';
  return (
    /* SectionAccordion handles header, badge, chevron, and collapse logic.
       Pass onToggle=undefined when allDone so the header is non-collapsible. */
    <SectionAccordion
      title={title}
      count={patients.length}
      badgeColor="#009b53"
      gradientFrom={gradientFrom}
      expanded={allDone || expanded}
      onToggle={allDone ? undefined : onToggle}
    >
      <div className="thin-scroll" style={{ overflowY:'visible' }}>
        {patients.map((p, i) => {
          const nameParts = (p.name || '').split(' ');
          const initials  = ((nameParts[0]?.[0] || '') + (nameParts[1]?.[0] || '')).toUpperCase();
          return (
            <div key={p.id || i} style={{ padding:'8px 12px', borderBottom:'0.5px solid var(--neutral-100)', display:'flex', alignItems:'center', gap:10, fontFamily:'Inter,sans-serif' }}>
              <div style={{ width:28, height:28, borderRadius:4, background:'var(--primary-100)', border:'0.5px solid var(--primary-200)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:400, color:'var(--primary-300)', flexShrink:0 }}>
                {initials}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:500, color:'var(--neutral-400)' }}>{p.name}</div>
                <div style={{ fontSize:14, fontWeight:400, color:'var(--neutral-200)' }}>{p.id} · {fmtAge(p.dob)}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0 }}>
                <circle cx="8" cy="8" r="8" fill="#009b53"/>
                <path d="M4.5 8.5l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          );
        })}
      </div>
    </SectionAccordion>
  );
}

function FigmaIncorrectRow({ row, onAdd, onRemove, isLast, onToast, matchedIds }) {
  const [foldId,    setFoldId]    = React.useState(row.rawId    || '');
  const [firstName, setFirstName] = React.useState(row.rawFn   || '');
  const [lastName,  setLastName]  = React.useState(row.rawLn   || '');
  const [dob,       setDob]       = React.useState(row.rawDob  || '');
  const [loading,   setLoading]   = React.useState(false);
  const [resolved,  setResolved]  = React.useState(null);
  const timerRef = React.useRef(null);

  const handleFoldIdChange = val => {
    setFoldId(val);
    setResolved(null);
    clearTimeout(timerRef.current);
    if (!val.trim()) { setLoading(false); return; }
    setLoading(true);
    timerRef.current = setTimeout(() => {
      const found = FOLD_DB_MAP[val.trim().toUpperCase()] || null;
      setResolved(found);
      setLoading(false);
    }, 480);
  };

  React.useEffect(() => {
    if (foldId) handleFoldIdChange(foldId);
    return () => clearTimeout(timerRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasError = !loading && !resolved && foldId.length > 0;

  /*
  const nameDobSuggestions = React.useMemo(() => {
    const fn = firstName.trim().toLowerCase();
    const ln = lastName.trim().toLowerCase();
    const d  = dob.trim();
    if (!fn || !ln || !d) return [];
    return FOLD_DB.filter(p => {
      const parts = p.name.toLowerCase().split(' ');
      return parts[0] === fn && parts.slice(1).join(' ') === ln && p.dob === d;
    }).slice(0, 1);
  }, [firstName, lastName, dob]);

  const incorrectOtherField = React.useMemo(() => {
    if (!hasError || nameDobSuggestions.length > 0) return null;
    const fn = firstName.trim().toLowerCase();
    const ln = lastName.trim().toLowerCase();
    const d  = dob.trim();
    if (!fn && !ln && !d) return null;
    const fnHit = fn && FOLD_DB.some(p => p.name.toLowerCase().split(' ')[0] === fn);
    const lnHit = ln && FOLD_DB.some(p => p.name.toLowerCase().split(' ').slice(1).join(' ') === ln);
    if (fnHit && lnHit) return 'Date of Birth';
    if (fnHit && !lnHit) return 'Last Name';
    if (!fnHit && lnHit) return 'First Name';
    return 'First Name';
  }, [firstName, lastName, dob, hasError, nameDobSuggestions.length]);
  */

  /* Only show match when Patient ID resolves — no name/DOB fallback */
  const matchLabel = resolved ? 'Patient ID match Found :' : null;
  const matchPat   = resolved || null;

  /* Check if this resolved patient is already in matched list */
  const alreadyMatched = matchPat && matchedIds && matchedIds.has(matchPat.id);
  const displayLabel = alreadyMatched ? 'Patient ID already matched' : matchLabel;

  /* When Patient ID resolves, flag any CSV fields that don't match the DB record */
  const mismatch = React.useMemo(() => {
    if (!resolved) return { firstName: false, lastName: false, dob: false };
    const dbParts = (resolved.name || '').toLowerCase().split(' ');
    const dbFn = dbParts[0] || '';
    const dbLn = dbParts.slice(1).join(' ');
    return {
      firstName: firstName.trim().toLowerCase() !== dbFn,
      lastName:  lastName.trim().toLowerCase()  !== dbLn,
      dob:       dob.trim() !== resolved.dob,
    };
  }, [resolved, firstName, lastName, dob]);

  /* CellOuter is defined at module level above to prevent remounting on re-render (which would lose cursor focus) */

  const inputSt = {
    flex: 1, height: 32, border: 'none', background: 'transparent',
    padding: '0 8px', fontSize: 14, outline: 'none',
    fontFamily: 'Inter,sans-serif', color: 'var(--neutral-400)', boxSizing: 'border-box',
    minWidth: 0,
  };

  const HDR_COLS = ['Patient ID', 'First Name', 'Last Name', 'Date of Birth', 'Actions'];
  const [isRemoving, setIsRemoving] = React.useState(false);

  const handleRemoveWithAnim = () => {
    setIsRemoving(true);
    setTimeout(() => onRemove(row.entryId), 270);
  };

  return (
    <div className={isRemoving ? 'row-removing' : ''} style={{ borderBottom: isLast ? 'none' : '0.5px solid #8a94a8', paddingTop: 8, fontFamily: 'Inter,sans-serif' }}>
      {/* Column headers — inside each card per Figma */}
      <div style={{ display: 'flex', paddingRight: 12 }}>
        {HDR_COLS.map((h, hi) => (
          <div key={h} style={{
            ...(hi < 4 ? { flex: 1, minWidth: 0 } : { width: 130, flexShrink: 0 }),
            padding: '4px 12px',
            display: 'flex', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-300)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h}</span>
          </div>
        ))}
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', paddingRight: 12 }}>
        <div style={{ flex: 1, minWidth: 0, padding: '2px 12px 8px' }}>
          <CellOuter err={hasError}>
            <input value={foldId} onChange={e => handleFoldIdChange(e.target.value)} style={inputSt} />
          </CellOuter>
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: '2px 12px 8px' }}>
          <CellOuter err={mismatch.firstName}>
            <input disabled value={firstName} style={{ ...inputSt, background:'var(--neutral-50)', color:'var(--neutral-150)', cursor:'not-allowed' }} />
          </CellOuter>
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: '2px 12px 8px' }}>
          <CellOuter err={mismatch.lastName}>
            <input disabled value={lastName} style={{ ...inputSt, background:'var(--neutral-50)', color:'var(--neutral-150)', cursor:'not-allowed' }} />
          </CellOuter>
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: '2px 12px 8px' }}>
          <CellOuter err={mismatch.dob}>
            <input disabled value={dob} style={{ ...inputSt, background:'var(--neutral-50)', color:'var(--neutral-150)', cursor:'not-allowed' }} />
          </CellOuter>
        </div>
        <div style={{ width: 130, flexShrink: 0, padding: '2px 12px 8px 12px', display: 'flex', alignItems: 'center' }}>
          <button
            onClick={handleRemoveWithAnim}
            style={{ height: 30, padding: '0 10px', border: '0.5px solid var(--neutral-200)', borderRadius: 4, background: '#fff', color: 'var(--neutral-300)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--neutral-50)'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            Remove Entry
          </button>
        </div>
      </div>

      {/* Match suggestion */}
      {displayLabel && matchPat && (
        <div style={{ padding: '4px 15px 12px' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: alreadyMatched ? 'var(--neutral-200)' : 'var(--neutral-400)', marginBottom: 6 }}>{displayLabel}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, background: 'var(--primary-25)', border: '0.5px solid var(--primary-200)', borderRadius: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 4, background: 'var(--primary-100)', border: '0.5px solid var(--primary-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 400, color: 'var(--primary-300)', flexShrink: 0 }}>
              {matchPat.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--neutral-400)' }}>{matchPat.name}</div>
              <div style={{ display: 'flex', gap: 2, alignItems: 'center', fontSize: 14, color: 'var(--neutral-200)' }}>
                <span>{matchPat.id}</span>
                <span>•</span>
                <span>{fmtAge(matchPat.dob)}</span>
              </div>
            </div>
            {!alreadyMatched && (
              <button
                onClick={() => {
                  onAdd(row.entryId, matchPat);
                  /* Show top-centre toast via DOM — bypasses React prop chain */
                  const _t = document.createElement('div');
                  _t.textContent = 'Member added to Matched Members successfully';
                  Object.assign(_t.style, { position:'fixed', top:'12px', left:'50%', transform:'translateX(-50%)', background:'#009B53', color:'#fff', padding:'8px 20px', borderRadius:'8px', fontSize:'14px', fontWeight:'500', zIndex:'99999', pointerEvents:'none', boxShadow:'0 4px 20px rgba(0,0,0,0.18)', fontFamily:'Inter,sans-serif', display:'flex', alignItems:'center', gap:'8px', whiteSpace:'nowrap' });
                  document.body.appendChild(_t);
                  setTimeout(() => { _t.style.opacity = '0'; _t.style.transition = 'opacity 0.3s'; setTimeout(() => _t.remove(), 350); }, 2500);
                }}
                style={{ height: 32, padding: '0 14px', border: '0.5px solid var(--primary-200)', borderRadius: 6, background: 'var(--primary-100)', color: 'var(--primary-300)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap', flexShrink: 0, transition: 'background 0.15s, border-color 0.15s, color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-300)'; e.currentTarget.style.borderColor = 'var(--primary-300)'; e.currentTarget.style.color = 'var(--neutral-0)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--primary-100)'; e.currentTarget.style.borderColor = 'var(--primary-200)'; e.currentTarget.style.color = 'var(--primary-300)'; }}
              >
                Add to Matched Members
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && !matchPat && (
        <div style={{ padding: '4px 15px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Spinner size={13} color="#8c5ae2" />
          <span style={{ fontSize: 12, color: 'var(--neutral-200)' }}>Looking up…</span>
        </div>
      )}

      {/* No match found — Patient ID entered but not in DB */}
      {hasError && !loading && foldId.length > 4 && (
        <div style={{ padding: '0 15px 10px', fontSize: 13, fontWeight: 500, color: '#b91c1c' }}>
          No match found.
        </div>
      )}

      {/* Error banner — shown when Fold ID is wrong AND no name+DOB match found */}
      {/* {!loading && incorrectOtherField && (
        <div style={{ padding: '0 15px 12px' }}>
          <div style={{ background:'#fff5f5', border:'0.5px solid rgba(215,40,37,0.1)', borderRadius:4, padding:'4px 6px', display:'flex', alignItems:'center', gap:4 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0 }}>
              <circle cx="8" cy="8" r="7" stroke="#D72825" strokeWidth="1.2"/>
              <path d="M8 5v3.5" stroke="#D72825" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="8" cy="11" r="0.7" fill="#D72825"/>
            </svg>
            <span style={{ fontSize:12, fontWeight:400, color:'var(--neutral-400)', lineHeight:1.2 }}>
              Enter Correct Fold ID and {incorrectOtherField} to see matches.
            </span>
          </div>
        </div>
      )} */}
    </div>
  );
}

function FigmaIncorrectSection({ entries, expanded, onToggle, onAdd, onRemove, onToast, matchedIds }) {
  return (
    <SectionAccordion
      title="Members With Incorrect Details"
      count={entries.length}
      badgeColor="#d72825"
      gradientFrom="#fff5f5"
      expanded={expanded}
      onToggle={onToggle}
    >
      {/* Each FigmaIncorrectRow includes its own column headers per Figma spec */}
      <div>
        {entries.map((entry, i) => (
          <FigmaIncorrectRow
            key={entry.entryId || i}
            row={entry}
            onAdd={onAdd}
            onRemove={onRemove}
            isLast={i === entries.length - 1}
            onToast={onToast}
            matchedIds={matchedIds}
          />
        ))}
      </div>
    </SectionAccordion>
  );
}

function FigmaDuplicateSection({ entries, matched, expanded, onToggle, onRemove }) {
  const colHdr = { fontSize:12, fontWeight:500, color:'var(--neutral-300)', fontFamily:'Inter,sans-serif' };

  /* Group entries by rawId — each key is a duplicate group */
  const groups = React.useMemo(() => {
    const g = {};
    entries.forEach(e => { (g[e.rawId] = g[e.rawId] || []).push(e); });
    return g;
  }, [entries]);

  /* selectedToRemove[rawId] = entryId of the row currently selected for removal.
     Defaults to the LAST entry (the duplicate), keyed as 'dup:<entryId>' or 'orig:<rawId>' */
  const [selectedToRemove, setSelectedToRemove] = React.useState(() => {
    const init = {};
    Object.entries(groups).forEach(([rawId, dupes]) => {
      init[rawId] = 'dup:' + dupes[dupes.length - 1].entryId; // select last dup by default
    });
    return init;
  });
  const [removing, setRemoving] = React.useState(new Set());

  const handleRemove = (rawId, key, entryId) => {
    // Animate out then call actual removal
    setRemoving(prev => new Set([...prev, key]));
    setTimeout(() => {
      onRemove(entryId);
      setRemoving(prev => { const n = new Set(prev); n.delete(key); return n; });
    }, 270);
  };

  return (
    <SectionAccordion
      title="Duplicate Entries"
      count={entries.length}
      badgeColor="#d9a50b"
      gradientFrom="#fffcf5"
      expanded={expanded}
      onToggle={onToggle}
    >
      <div>
          {/* Column headers — shared once at the top */}
          <div style={{ display:'flex', padding:'4px 0', borderBottom:'0.5px solid #d0d6e1', fontFamily:'Inter,sans-serif' }}>
            <div style={{ flex:1, minWidth:0, padding:'0 12px 0 24px', ...colHdr }}>Patient ID</div>
            <div style={{ flex:1, minWidth:0, padding:'0 12px', ...colHdr }}>First Name</div>
            <div style={{ flex:1, minWidth:0, padding:'0 12px', ...colHdr }}>Last Name</div>
            <div style={{ flex:1, minWidth:0, padding:'0 12px', ...colHdr }}>Date of Birth</div>
            <div style={{ width:130, flexShrink:0, padding:'0 12px', ...colHdr }}>Actions</div>
          </div>

          {Object.entries(groups).map(([rawId, dupes], gi) => {
            /* Find the original matched patient for this rawId */
            const origPat = matched?.find(m => (m.id || m.mrn || '').toUpperCase() === rawId.toUpperCase());
            const origKey = 'orig:' + rawId;
            const selKey  = selectedToRemove[rawId];

            /* Build rows: original (from matched) + all duplicates */
            const rows = [];
            if (origPat) {
              rows.push({ key: origKey, entryId: null, isOrig: true, rawId, rawFn: origPat.name?.split(' ')[0] || '', rawLn: origPat.name?.split(' ').slice(1).join(' ') || '', rawDob: origPat.dob || '' });
            }
            dupes.forEach(d => rows.push({ key:'dup:'+d.entryId, entryId: d.entryId, isOrig:false, rawId: d.rawId, rawFn: d.rawFn || '', rawLn: d.rawLn || '', rawDob: d.rawDob || '' }));

            return (
              <div key={rawId} style={{ borderBottom: gi < Object.keys(groups).length - 1 ? '0.5px solid #d0d6e1' : 'none' }}>
                {rows.map((row, ri) => {
                  const isSelected = selKey === row.key;
                  const isRemoving = removing.has(row.key);
                  return (
                    <div
                      key={row.key}
                      className={isRemoving ? 'row-removing' : ''}
                      onClick={() => setSelectedToRemove(p => ({ ...p, [rawId]: row.key }))}
                      style={{
                        display:'flex', alignItems:'center',
                        height: 44, /* Fixed height — no layout shift on selection */
                        borderLeft: isSelected ? '3px solid #D9A50B' : '3px solid transparent',
                        background: isSelected ? '#FFFCF5' : '#fff',
                        cursor:'pointer', fontFamily:'Inter,sans-serif',
                        /* No inner-pair border — only show separator after last row of a group (handled by parent) */
                        transition:'background 0.15s, border-color 0.15s',
                        overflow:'hidden',
                      }}
                    >
                      <div style={{ flex:1, minWidth:0, padding:'0 12px 0 21px', fontSize:14, color:'var(--neutral-400)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.rawId}</div>
                      <div style={{ flex:1, minWidth:0, padding:'0 12px', fontSize:14, color:'var(--neutral-400)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.rawFn}</div>
                      <div style={{ flex:1, minWidth:0, padding:'0 12px', fontSize:14, color:'var(--neutral-400)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.rawLn}</div>
                      <div style={{ flex:1, minWidth:0, padding:'0 12px', fontSize:14, color:'var(--neutral-400)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.rawDob}</div>
                      <div style={{ width:130, flexShrink:0, padding:'0 12px', display:'flex', alignItems:'center' }}>
                        {/* Remove Entry always in DOM but invisible when not selected — preserves height */}
                        <button
                          onClick={e => { e.stopPropagation(); if (isSelected) handleRemove(rawId, row.key, row.entryId); }}
                          style={{ height:30, padding:'0 10px', border:'0.5px solid var(--neutral-200)', borderRadius:4, background:'#fff', color:'var(--neutral-300)', fontSize:12, fontWeight:500, cursor: isSelected ? 'pointer' : 'default', fontFamily:'Inter,sans-serif', whiteSpace:'nowrap', transition:'background 0.15s', opacity: isSelected ? 1 : 0, pointerEvents: isSelected ? 'auto' : 'none' }}
                          onMouseEnter={e => { if (isSelected) e.currentTarget.style.background='var(--neutral-50)'; }}
                          onMouseLeave={e => e.currentTarget.style.background='#fff'}
                        >
                          Remove Entry
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
    </SectionAccordion>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

function PreviewPanel({ patients, onBack }) {
  const GRID = '28px 1fr 140px 140px 140px';
  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, border:'0.5px solid var(--primary-200)', borderRadius:8, overflow:'hidden', margin:'16px' }}>
      {/* Header */}
      <div style={{ padding:'10px 14px', background:'var(--primary-50)', borderBottom:'0.5px solid var(--primary-100)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--neutral-400)', display:'flex', alignItems:'center', gap:7 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--primary-300)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Population Group Preview
          </div>
          <div style={{ fontSize:13, color:'var(--neutral-300)', marginTop:2 }}>
            <span style={{ color:'var(--primary-300)', fontWeight:500 }}>{patients.length}</span> patients will be added to this group
          </div>
        </div>
        <button onClick={onBack} style={{ fontSize:13, color:'var(--neutral-300)', background:'none', border:'0.5px solid var(--neutral-150)', borderRadius:5, cursor:'pointer', padding:'4px 9px', fontFamily:'Inter, sans-serif', display:'flex', alignItems:'center', gap:4 }}>
          ← Back
        </button>
      </div>
      {/* Column headers */}
      <div style={{ display:'grid', gridTemplateColumns:GRID, padding:'5px 14px', background:'var(--neutral-50)', borderBottom:'0.5px solid var(--neutral-150)', gap:8, flexShrink:0 }}>
        {['#','Patient','DOB','MRN','Source'].map((h,hi) => (
          <div key={hi} style={{ fontSize:12, fontWeight:500, color:'var(--neutral-300)' }}>{h}</div>
        ))}
      </div>
      {/* Patient rows */}
      <div className="thin-scroll" style={{ flex:1, overflowY:'auto' }}>
        {patients.map((p, i) => (
          <div key={p.id || i}
            style={{ display:'grid', gridTemplateColumns:GRID, padding:'7px 14px', borderBottom: i < patients.length-1 ? '0.5px solid var(--neutral-100)' : 'none', background:'#fff', alignItems:'center', gap:8, transition:'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background='var(--primary-25)'}
            onMouseLeave={e => e.currentTarget.style.background='#fff'}>
            <div style={{ fontSize:13, color:'var(--neutral-200)', fontWeight:400 }}>{i+1}</div>
            <div style={{ display:'flex', alignItems:'center', gap:7, minWidth:0 }}>
              <div style={{ width:28, height:28, borderRadius:4, background:'var(--primary-100)', border:'0.5px solid var(--primary-200)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:400, color:'var(--primary-300)', flexShrink:0 }}>
                {p.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
              </div>
              <span style={{ fontSize:13, color:'var(--neutral-400)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</span>
            </div>
            <div style={{ fontSize:13, color:'var(--neutral-300)' }}>{p.dob || '—'}</div>
            <div style={{ fontSize:13, color:'var(--neutral-300)' }}>{p.mrn || '—'}</div>
            <div>
              <span style={{ fontSize:12, fontWeight:500, padding:'2px 6px', borderRadius:4,
                color: p.source==='Matched' ? '#16a34a' : 'var(--primary-300)',
                background: p.source==='Matched' ? '#f0fdf4' : 'var(--primary-100)',
                border:`0.5px solid ${p.source==='Matched'?'#bbf7d0':'var(--primary-200)'}`,
              }}>{p.source}</span>
            </div>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div style={{ padding:'8px 14px', borderTop:'0.5px solid var(--primary-100)', background:'var(--primary-25)', display:'flex', alignItems:'center', flexShrink:0 }}>
        <span style={{ fontSize:13, color:'var(--neutral-300)' }}>
          <span style={{ color:'var(--primary-300)', fontWeight:500 }}>{patients.length}</span> patients ready — click <strong>Create</strong> in the header to save.
        </span>
      </div>
    </div>
  );
}

/* ─── NewModePanel — "Download Errors" Create Group flow ─────────────────── */
/* Reusable uploaded-file preview row — table-icon avatar + name/size + replace action.
   Shared by the processing view and the all-members-matched summary (Figma 2023:9490). */
function FilePreviewCard({ fileName, sizeMB, onReplace }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:16, padding:12, border:'0.5px solid var(--neutral-150)', borderRadius:8, background:'#fff', width:'100%', boxSizing:'border-box', flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, flex:'1 0 0', minWidth:0 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:'var(--neutral-50)', border:'0.5px solid var(--neutral-200)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <TableIcon color="var(--neutral-300)" size={18} />
        </div>
        <div style={{ flex:'1 0 0', minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:500, color:'var(--neutral-400)', lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fileName}</div>
          <div style={{ fontSize:14, fontWeight:400, color:'var(--neutral-200)', lineHeight:1.2, marginTop:2 }}>{sizeMB} MB</div>
        </div>
      </div>
      {onReplace && (
        <button onClick={onReplace} title="Replace file"
          style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, border:'none', background:'none', cursor:'pointer', borderRadius:4, transition:'background 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.background='var(--neutral-75)'}
          onMouseLeave={e => e.currentTarget.style.background='none'}>
          <ReplaceIcon size={16} color="var(--neutral-300)" />
        </button>
      )}
    </div>
  );
}

/* All-members-matched review state (Figma 2023:9479) — file preview + collapsible matched list. */
function AllMatchedPanel({ matched, uploadFile, onReupload }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, fontFamily:'Inter, sans-serif', width:'100%', height:'100%', minHeight:0, boxSizing:'border-box', paddingTop:4 }}>
      <p style={{ margin:0, fontSize:16, fontWeight:500, lineHeight:1.2, color:'#16181d', flexShrink:0 }}>File Processing Summary</p>

      {uploadFile && (
        <FilePreviewCard fileName={uploadFile.name} sizeMB={(uploadFile.size/1048576).toFixed(1)} onReplace={onReupload} />
      )}

      {/* Review pop group — fixed header + internally-scrolling patient list */}
      <div style={{ border:'0.5px solid var(--neutral-150)', borderRadius:8, background:'#fff', overflow:'hidden', width:'100%', flex:'1 1 0', minHeight:0, display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', alignItems:'center', padding:'8px 12px', borderBottom:'0.5px solid var(--neutral-150)', background:'linear-gradient(90deg, #f5fffa 0%, #ffffff 100%)', flexShrink:0 }}>
          <span style={{ fontSize:14, fontWeight:500, color:'var(--neutral-400)', lineHeight:1.2 }}>All Members Matched; Review Pop Group</span>
        </div>

        {/* Matched member rows — scrolls within this section only */}
        <div className="thin-scroll" style={{ flex:'1 1 0', minHeight:0, overflowY:'auto' }}>
          {matched.map((p, i) => {
            const initials = (p.name || '').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
            return (
              <div key={p.id || i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderBottom:'0.5px solid var(--neutral-100)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flex:'1 0 0', minWidth:0 }}>
                  <div style={{ width:40, height:40, borderRadius:8, background:'var(--primary-50)', border:'0.5px solid var(--primary-200)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:16, fontWeight:400, color:'var(--primary-300)' }}>
                    {initials}
                  </div>
                  <div style={{ flex:'1 0 0', minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:500, color:'var(--neutral-400)', lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:2, fontSize:14, fontWeight:400, color:'var(--neutral-200)', lineHeight:1.2, marginTop:4, whiteSpace:'nowrap', overflow:'hidden' }}>
                      <span style={{ overflow:'hidden', textOverflow:'ellipsis' }}>{p.id}</span>
                      <span>•</span>
                      <span>{fmtAge(p.dob)}</span>
                    </div>
                  </div>
                </div>
                <CheckRoundIcon size={24} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NewModePanel({ matchSummary, uploadFile, csvAllClear, onReupload }) {
  // All entries matched — show review state
  if (csvAllClear && matchSummary.matched.length > 0) {
    return <AllMatchedPanel matched={matchSummary.matched} uploadFile={uploadFile} onReupload={onReupload} />;
  }

  // Has errors — show download panel
  const hasIssues = matchSummary.notFound.length > 0 || matchSummary.duplicates.length > 0;
  if (!uploadFile) return null;

  // File present but nothing parsed (empty / unreadable / wrong columns) — never render blank.
  if (!hasIssues && matchSummary.matched.length === 0) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:8, padding:'12px 0', fontFamily:'Inter, sans-serif', width:'100%', boxSizing:'border-box' }}>
        <p style={{ margin:0, fontSize:16, fontWeight:500, lineHeight:1.2, color:'#16181d' }}>File Processing Summary</p>
        <FilePreviewCard fileName={uploadFile.name} sizeMB={(uploadFile.size/1048576).toFixed(1)} onReplace={onReupload} />
        <div style={{ border:'0.5px solid rgba(215,40,37,0.4)', borderRadius:12, padding:48, display:'flex', flexDirection:'column', gap:16, alignItems:'center', background:'linear-gradient(162.29deg, #FFF5F5 1.82%, #FFFFFF 61.18%)' }}>
          <FileErrorIllustration />
          <p style={{ margin:0, fontSize:14, lineHeight:1.4, color:'#3a485f', textAlign:'center' }}>
            We couldn't read any patient records from this file. Ensure it's a <strong>CSV</strong> with
            {' '}<strong>Patient ID, First Name, Last Name, DOB</strong> columns, then reupload.
          </p>
          <button
            onClick={onReupload}
            style={{ height:36, padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'center', gap:7, border:'0.5px solid var(--neutral-150)', borderRadius:6, background:'#fff', color:'var(--neutral-300)', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'Inter, sans-serif' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Reupload File
          </button>
        </div>
      </div>
    );
  }

  const downloadErrorFile = () => {
    // Build HTML-based Excel with colored rows
    const allRows = [
      ['Patient ID', 'First Name', 'Last Name', 'Date of Birth', 'Status'],
      ...matchSummary.matched.map(p => [p.id, p.name?.split(' ')[0]||'', p.name?.split(' ').slice(1).join(' ')||'', p.dob, 'Matched']),
      ...matchSummary.notFound.map(e => [e.rawId, e.rawFn, e.rawLn, e.rawDob, 'Incorrect']),
      ...matchSummary.duplicates.map(e => [e.rawId, e.rawFn, e.rawLn, e.rawDob, 'Duplicate']),
    ];

    const notFoundIds = new Set(matchSummary.notFound.map(e => e.rawId));
    const dupIds      = new Set(matchSummary.duplicates.map(e => e.rawId));

    const headerStyle = 'background:#3a485f;color:#fff;font-weight:600;padding:6px 10px;border:1px solid #ccc;';
    const matchStyle  = 'background:#fff;padding:6px 10px;border:1px solid #e0e0e0;';
    const errorStyle  = 'background:#fff5f5;padding:6px 10px;border:1px solid #fca5a5;';
    const errorIdStyle= 'background:#991b1b;color:#fff;font-weight:600;padding:6px 10px;border:1px solid #991b1b;';
    const dupStyle    = 'background:#fefce8;padding:6px 10px;border:1px solid #fde68a;';

    const colHeaders = ['Patient ID','First Name','Last Name','Date of Birth','Status'];
    let html = '<table border="1" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;">';
    html += '<tr>' + colHeaders.map(h => `<td style="${headerStyle}">${h}</td>`).join('') + '</tr>';

    for (const row of allRows.slice(1)) {
      const rawId = row[0];
      const isError = notFoundIds.has(rawId);
      const isDup   = dupIds.has(rawId);
      if (isError) {
        html += '<tr>';
        html += `<td style="${errorIdStyle}">${row[0]}</td>`;
        html += `<td style="${errorStyle}">${row[1]}</td>`;
        html += `<td style="${errorStyle}">${row[2]}</td>`;
        html += `<td style="${errorStyle}">${row[3]}</td>`;
        html += `<td style="${errorStyle}">${row[4]}</td>`;
        html += '</tr>';
      } else if (isDup) {
        html += '<tr>' + row.map(c=>`<td style="${dupStyle}">${c||''}</td>`).join('') + '</tr>';
      } else {
        html += '<tr>' + row.map(c=>`<td style="${matchStyle}">${c||''}</td>`).join('') + '</tr>';
      }
    }
    html += '</table>';

    const blob = new Blob([`<html><body>${html}</body></html>`], { type:'application/vnd.ms-excel' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'patient-list-errors.xls';
    a.click();
    URL.revokeObjectURL(url);
  };

  /* Reset back to the freshly-selected CSV-upload state (filter stays selected,
     drawer collapses to single column, upload dropzone reappears under the field). */
  const reuploadFile = () => { onReupload?.(); };

  return (
    /* Frame 1433:10239 — py-12, gap-8, column, items-start */
    <div style={{ display:'flex', flexDirection:'column', gap:8, padding:'12px 0', fontFamily:'Inter, sans-serif', width:'100%', boxSizing:'border-box' }}>

      {/* Heading 1433:10241 — Inter Medium 16 / #16181d / lh 1.2 */}
      <div style={{ display:'flex', alignItems:'center', width:'100%' }}>
        <p style={{ margin:0, flex:'1 0 0', minWidth:0, fontSize:16, fontWeight:500, lineHeight:1.2, color:'#16181d', wordBreak:'break-word' }}>
          File Processing Summary
        </p>
      </div>

      {/* Card 1433:10244 — 0.5px red-40% border, p-64, rounded-12, gap-16, centered, red→white gradient */}
      <div style={{
        width:'100%', boxSizing:'border-box',
        border:'0.5px solid rgba(215,40,37,0.4)', borderRadius:12, padding:64,
        display:'flex', flexDirection:'column', gap:16, alignItems:'center',
        background:'linear-gradient(162.29deg, #FFF5F5 1.82%, #FFFFFF 61.18%)',
      }}>

        {/* Illustration 1433:10245 — 80px */}
        <FileErrorIllustration />

        {/* Body 1433:10246 — 14 / #3a485f / lh 1.2 / center */}
        <p style={{ margin:0, width:'100%', fontSize:14, lineHeight:1.2, color:'#3a485f', textAlign:'center', wordBreak:'break-word' }}>
          Your file has entries with{' '}
          <span style={{ color:'#d72825', fontWeight:500 }}>incorrect</span>{' '}
          <span style={{ color:'#d72825', fontWeight:500 }}>details</span>{' '}
          or{' '}
          <span style={{ color:'#d9a50b', fontWeight:500 }}>duplicate</span>{' '}
          <span style={{ color:'#d9a50b', fontWeight:500 }}>entries</span>.
          {' '}These are flagged in red and yellow respectively in a file ready to download below. Please download, correct entries, and re-upload here to create a population group.
        </p>

        {/* Buttons row 1433:10247 — gap-12, justify-center, full width */}
        <div style={{ display:'flex', gap:12, justifyContent:'center', alignItems:'flex-start', width:'100%' }}>
          {/* Primary — same style as drawer "Create" button (enabled) */}
          <button
            onClick={downloadErrorFile}
            style={{ height:36, padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'center', gap:7, border:'none', borderRadius:6, background:'var(--primary-300)', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'Inter, sans-serif', transition:'background 0.15s', whiteSpace:'nowrap' }}
            onMouseEnter={e => e.currentTarget.style.background='var(--primary-400)'}
            onMouseLeave={e => e.currentTarget.style.background='var(--primary-300)'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download File with Errors
          </button>

          {/* Secondary — Reupload */}
          <button
            onClick={reuploadFile}
            style={{ height:36, padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'center', gap:7, border:'0.5px solid var(--neutral-150)', borderRadius:6, background:'#fff', color:'var(--neutral-300)', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'Inter, sans-serif', transition:'background 0.15s', whiteSpace:'nowrap' }}
            onMouseEnter={e => e.currentTarget.style.background='var(--neutral-50)'}
            onMouseLeave={e => e.currentTarget.style.background='#fff'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Reupload File
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Population Groups — view ───────────────────────────────────────────── */
/**
 * reclassifyDuplicate — called when a user removes one entry from a duplicate pair.
 * If the sibling (other entry with same rawId) is now alone, it moves it to
 * `matched` (if the Patient ID is valid + fields correct) or `notFound` (otherwise).
 */
function reclassifyDuplicate(prev, removedEntryId) {
  const removed   = prev.duplicates.find(d => d.entryId === removedEntryId);
  const remaining = prev.duplicates.filter(d => d.entryId !== removedEntryId);
  const sibling   = removed ? remaining.find(d => d.rawId === removed.rawId) : null;

  if (!sibling) return { ...prev, duplicates: remaining };

  // Sibling is now alone — reclassify
  const newDups = remaining.filter(d => d.rawId !== sibling.rawId);
  const dbPat   = FOLD_DB_MAP[(sibling.rawId || '').toUpperCase()];

  if (!dbPat) {
    return { ...prev, duplicates: newDups, notFound: [...prev.notFound, { ...sibling, entryId: 'nf_' + sibling.entryId }] };
  }
  const [dbFn, ...rest] = (dbPat.name || '').toLowerCase().split(' ');
  const dbLn = rest.join(' ');
  const fnOk = sibling.rawFn?.trim().toLowerCase() === dbFn;
  const lnOk = sibling.rawLn?.trim().toLowerCase() === dbLn;
  const dobOk = sibling.rawDob === dbPat.dob;

  if (fnOk && lnOk && dobOk) {
    return { ...prev, duplicates: newDups, matched: [...prev.matched, { id: dbPat.id, name: dbPat.name, dob: dbPat.dob, mrn: dbPat.id, pcp: dbPat.pcp }] };
  }
  return { ...prev, duplicates: newDups, notFound: [...prev.notFound, { ...sibling, entryId: 'nf_' + sibling.entryId }] };
}

function PopulationGroupsView({ activeFilter, onToggleSidebar, onMiniBarOpen, miniBarExpandRef, miniBarCloseRef, onModalClose, onBackdropChange, onGroupCreated, onUploadError, onMemberAdded }) {
  /* ── table state ── */
  const [searchQuery,   setSearchQuery]   = useState('');
  const [extraGroups,   setExtraGroups]   = useState([]);
  const [checkedRows,   setCheckedRows]   = useState(new Set());
  const [hoveredRow,    setHoveredRow]    = useState(null);
  const [popPage,       setPopPage]       = useState(1);
  const [popPageSize,   setPopPageSize]   = useState(10);
  const [popGoToInput,  setPopGoToInput]  = useState('');

  /* ── modal state ── */
  const [modalOpen,     setModalOpen]     = useState(false);
  const [segmentName,   setSegmentName]   = useState('');
  const [description,   setDescription]   = useState('');
  const [chosenFilter,  setChosenFilter]  = useState('');
  const [filterDDOpen,  setFilterDDOpen]  = useState(false);
  const [memberStatus,  setMemberStatus]  = useState('All Status');
  const [memDDOpen,     setMemDDOpen]     = useState(false);

  /* ── CSV upload state ── */
  const [dragOver,           setDragOver]           = useState(false);
  const [uploadFile,         setUploadFile]         = useState(null);
  const [showCloseConfirm,   setShowCloseConfirm]   = useState(false);
  const [uploadState,   setUploadState]   = useState('idle'); // idle|uploading|loading|complete
  const [uploadPct,     setUploadPct]     = useState(0);
  const [procStep,      setProcStep]      = useState(0);       // 0-3 steps completed

  /* ── summary / resolution ── */
  const [matchSummary,  setMatchSummary]  = useState({ matched:[], notFound:[], duplicates:[] });
  const [matchedExp,    setMatchedExp]    = useState(false);
  const [notFoundExp,   setNotFoundExp]   = useState(true);
  const [dupExp,        setDupExp]        = useState(true);
  const [manualSel,     setManualSel]     = useState({});

  /* Auto-expand Matched Members once all incorrect/duplicate entries are resolved */
  useEffect(() => {
    if (matchSummary.notFound.length === 0 && matchSummary.duplicates.length === 0 && matchSummary.matched.length > 0) {
      setMatchedExp(true);
    }
  }, [matchSummary.notFound.length, matchSummary.duplicates.length, matchSummary.matched.length]);
  const [patDDOpen,     setPatDDOpen]     = useState(null);
  const [patDDRect,     setPatDDRect]     = useState(null); // position for fixed portal dropdown
  const [showPreview,   setShowPreview]   = useState(false); // final preview before save
  const [patSearch,     setPatSearch]     = useState('');

  /* ── dynamic criteria ── */
  const [criteria,      setCriteria]      = useState([{ attr:'Age', op:'≥', val:'' }]);

  /* ── collapsed mini-bar (now owned by the persistent store/host) ── */
  const [drawerClosing, setDrawerClosing] = useState(false);

  const startPgSession  = useAppStore(s => s.startPgSession);
  const expandPgSession = useAppStore(s => s.expandPgSession);
  const closePgSession  = useAppStore(s => s.closePgSession);
  const pgSession       = useAppStore(s => s.pgSession);
  const pgReopenToken   = useAppStore(s => s.pgReopenToken);
  const showToast       = useAppStore(s => s.showToast);

  /* ── dev toggle ── */
  const [showDevButtons, setShowDevButtons] = useState(false);
  /* tableMode / smartMode / enhancedMode / tableRows / tableRowsRef removed (dead code) */

  /* ── new "Download Errors" Create Group flow ── */
  const [newMode,      setNewMode]      = useState(false);

  const fileInputRef  = useRef(null);
  const filterDDRef   = useRef(null);
  const memDDRef      = useRef(null);
  const parsedRef        = useRef(null); // stores parsed match results while loading timer runs
  const loadingStartRef  = useRef(null); // timestamp when loading began (for mini-bar hand-off)

  /* ── close dropdowns on outside click ── */
  useEffect(() => {
    const handler = e => {
      if (filterDDRef.current && !filterDDRef.current.contains(e.target)) setFilterDDOpen(false);
      if (memDDRef.current   && !memDDRef.current.contains(e.target))    setMemDDOpen(false);
      if (!e.target.closest?.('[data-patdd]')) setPatDDOpen(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── loading → sequential steps → complete ── */
  useEffect(() => {
    if (uploadState !== 'loading') { setProcStep(0); return; }
    loadingStartRef.current = Date.now();
    setProcStep(0);
    if (parsedRef.current) {
      setMatchSummary(parsedRef.current);
      parsedRef.current = null;
    }
    /* tableRowsRef removed */
    // Advance each step sequentially; complete after 30 s
    const t1 = setTimeout(() => setProcStep(1),  8000);
    const t2 = setTimeout(() => setProcStep(2), 18000);
    const t3 = setTimeout(() => setProcStep(3), 28000);
    const t4 = setTimeout(() => setUploadState('complete'), 30000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [uploadState]);

  /* ── tell App when the drawer backdrop should show (for off-screen rendering) ── */
  useEffect(() => {
    onBackdropChange?.(modalOpen);
  }, [modalOpen]);

  /* ── reopen the drawer at the completed summary when the mini-bar is expanded ── */
  useEffect(() => {
    if (!pgReopenToken) return;
    const s = useAppStore.getState().pgSession;
    if (!s) return;
    resetModalState();
    setNewMode(true);
    setChosenFilter('static-csv');
    setSegmentName(s.segName || '');
    setUploadFile({ name: s.fileName, size: s.fileSize });
    setMatchSummary(s.result || { matched: [], notFound: [], duplicates: [] });
    setUploadState('complete');
    setModalOpen(true);
    closePgSession();
  }, [pgReopenToken]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── helpers ── */
  const resetModalState = () => {
    /* tableMode / smartMode / enhancedMode / tableRows cleared here — state removed */
    setNewMode(false);
    setSegmentName(''); setDescription(''); setChosenFilter('');
    setMemberStatus('All Status'); setUploadFile(null);
    setUploadState('idle'); setUploadPct(0); setDragOver(false);
    setCriteria([{ attr:'Age', op:'≥', val:'' }]);
    setDrawerClosing(false); setMatchedExp(false);
    setNotFoundExp(true); setDupExp(true);
    setManualSel({}); setPatDDOpen(null); setShowPreview(false);
    setMatchSummary({ matched:[], notFound:[], duplicates:[] }); setPatSearch('');
    parsedRef.current = null;
  };
  const openModal = () => { resetModalState(); setModalOpen(true); };
  const openNewModal = () => { resetModalState(); setNewMode(true); setModalOpen(true); };
  /* openTableModal / openSmartModal / openEnhancedModal removed */
  const closeModal = () => {
    setDrawerClosing(true);
    setTimeout(() => { setModalOpen(false); setUploadState('idle'); setDrawerClosing(false); onModalClose?.(); }, 340);
  };

  const handleFile = file => {
    if (!file) return;
    /* ── Validate file size (max 5 MB) ── */
    if (file.size > 5 * 1024 * 1024) {
      onUploadError?.('Error! File Size Too Large');
      return;
    }
    setUploadFile(file); setUploadState('uploading'); setUploadPct(0);
    setMatchSummary({ matched:[], notFound:[], duplicates:[] });
    setManualSel({}); setShowPreview(false); parsedRef.current = null;

    /* ── Animate progress over ~5 s (≈2–4 % per 200 ms tick) ── */
    const startTime = Date.now();
    let pct = 0;
    const iv = setInterval(() => {
      pct += Math.random() * 3 + 1;
      if (pct >= 100) { clearInterval(iv); setUploadPct(100); }
      else setUploadPct(Math.round(pct));
    }, 200);

    const isXlsx = /\.xlsx$/i.test(file.name || '');
    const reader = new FileReader();
    reader.onload = async e => {
      /* ── Parse immediately; store in ref. .xlsx → unzip+inflate reader, else CSV/HTML-table text ── */
      try {
        const rows = isXlsx ? await parseXlsxArrayBuffer(e.target.result) : parseTable(e.target.result);
        if (rows.length) {
          const headers   = rows[0].map(h => String(h).toLowerCase());
          const idColIdx  = headers.findIndex(h => h.includes('patient') || h.includes('id'));
          const nameColIdx= headers.findIndex(h => h.includes('name') && !h.includes('first') && !h.includes('last'));
          const fnColIdx  = headers.findIndex(h => h.includes('first'));
          const lnColIdx  = headers.findIndex(h => h.includes('last'));
          const dobColIdx = headers.findIndex(h => h.includes('dob') || h.includes('birth') || h.includes('date'));
          const col       = idColIdx >= 0 ? idColIdx : 0;
          const nameCol   = nameColIdx >= 0 ? nameColIdx : -1;
          const fnCol     = fnColIdx  >= 0 ? fnColIdx  : -1;
          const lnCol     = lnColIdx  >= 0 ? lnColIdx  : -1;
          const dobCol    = dobColIdx >= 0 ? dobColIdx : -1;

          /* Pre-scan: count occurrences per rawId so we know which are duplicates */
          const idCount = new Map();
          rows.slice(1).forEach(row => {
            const rawId = String(row[col] || '').trim();
            if (rawId) idCount.set(rawId, (idCount.get(rawId) || 0) + 1);
          });

          /* Classify rows: IDs with count > 1 ALL go to duplicates (even if invalid).
             After one duplicate is removed, the remaining entry is reclassified.         */
          const seen = new Map();
          const matched = [], notFound = [], duplicates = [];
          let nfIdx = 0, dupIdx = 0;
          rows.slice(1).forEach(row => {
            const rawId  = String(row[col] || '').trim();
            let rawFn    = fnCol   >= 0 ? String(row[fnCol]   || '').trim() : '';
            let rawLn    = lnCol   >= 0 ? String(row[lnCol]   || '').trim() : '';
            let rawName  = nameCol >= 0 ? String(row[nameCol] || '').trim() : '';
            if (!rawFn && !rawLn && rawName) { const p = rawName.split(' '); rawFn = p[0]||''; rawLn = p.slice(1).join(' '); }
            if (!rawName) rawName = [rawFn, rawLn].filter(Boolean).join(' ');
            const rawDob = dobCol >= 0 ? parseXlsxDate(row[dobCol]) : '';
            if (!rawId) return;
            const occ = seen.get(rawId) || 0;
            seen.set(rawId, occ + 1);
            const dbPat = FOLD_DB_MAP[rawId.toUpperCase()];
            const isDup = (idCount.get(rawId) || 0) > 1;

            if (isDup) {
              /* All occurrences of a duplicated ID go to duplicates section */
              duplicates.push({ entryId:`dup${++dupIdx}`, rawId, rawName: rawName || rawId, rawFn, rawLn, rawDob, dbPat });
            } else if (!dbPat) {
              notFound.push({ entryId:`nf${++nfIdx}`, rawId, rawName: rawName || rawId, rawFn, rawLn, rawDob });
            } else {
              const dbParts = (dbPat.name || '').toLowerCase().split(' ');
              const dbFn = dbParts[0] || '';
              const dbLn = dbParts.slice(1).join(' ');
              const fnOk  = rawFn.trim().toLowerCase() === dbFn;
              const lnOk  = rawLn.trim().toLowerCase() === dbLn;
              const dobOk = rawDob === dbPat.dob;
              if (fnOk && lnOk && dobOk) {
                matched.push({ id: dbPat.id, name: dbPat.name, dob: dbPat.dob, mrn: dbPat.id, pcp: dbPat.pcp });
              } else {
                notFound.push({ entryId:`nf${++nfIdx}`, rawId, rawName: rawName || rawId, rawFn, rawLn, rawDob });
              }
            }
          });
          parsedRef.current = { matched, notFound, duplicates };

          // Parse into table rows (serial order from Excel)
          const headerRow = rows[0].map(h => String(h).toLowerCase());
          const idIdx    = headerRow.findIndex(h => h.includes('fold') || h.includes('patient') || h.includes('id'));
          const fnIdx    = headerRow.findIndex(h => h.includes('first'));
          const lnIdx    = headerRow.findIndex(h => h.includes('last'));
          const nameIdx  = headerRow.findIndex(h => h.includes('name') && !h.includes('first') && !h.includes('last'));
          const dobIdx   = headerRow.findIndex(h => h.includes('dob') || h.includes('birth') || h.includes('date'));
          const idC  = idIdx  >= 0 ? idIdx  : 0;
          const dobC = dobIdx >= 0 ? dobIdx : -1;

          /* tableRowsRef population removed (tableMode dead code) */
        }
      } catch(err) { console.error('Parse error', err); onUploadError?.('Error! Unable to Upload File'); }

      /* ── Wait until ≥5 s have elapsed, then transition to loading ── */
      clearInterval(iv);
      const elapsed = Date.now() - startTime;
      const delay   = Math.max(0, 5000 - elapsed);
      setTimeout(() => {
        setUploadPct(100);
        setTimeout(() => setUploadState('loading'), 500);
      }, delay);
    };
    if (isXlsx) reader.readAsArrayBuffer(file); else reader.readAsText(file);
  };

  /* Close patient dropdown on outside click */
  useEffect(() => {
    if (!patDDOpen) return;
    const handler = e => {
      if (!e.target.closest('[data-patdd]') && !e.target.closest('[data-patdd-portal]')) {
        setPatDDOpen(null); setPatSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [patDDOpen]);

  const addCriterion    = ()        => setCriteria(p => [...p, { attr:'Age', op:'≥', val:'' }]);
  const removeCriterion = idx       => setCriteria(p => p.filter((_,i) => i !== idx));
  const updateCriterion = (i,k,v)   => setCriteria(p => p.map((c,ci) => ci===i ? { ...c,[k]:v } : c));

  /* ── filtered list ── */
  const activeType = activeFilter === 'Static' || activeFilter === 'Dynamic' ? activeFilter : null;
  const displayedGroups = [...extraGroups, ...POP_GROUPS].filter(g => {
    if (activeType && g.type !== activeType) return false;
    if (searchQuery && !g.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  /* ── pagination ── */
  const totalGroups  = displayedGroups.length;
  const popTotalPages = Math.max(1, Math.ceil(totalGroups / popPageSize));
  const safePg       = Math.min(popPage, popTotalPages);
  const pagedGroups  = displayedGroups.slice((safePg - 1) * popPageSize, safePg * popPageSize);

  /* reset to page 1 whenever filter/search changes */
  useEffect(() => { setPopPage(1); }, [activeFilter, searchQuery]);

  const buildPopPages = () => {
    if (popTotalPages <= 7) return Array.from({ length: popTotalPages }, (_, i) => i + 1);
    if (safePg <= 4)        return [1, 2, 3, 4, 5, '...', popTotalPages];
    if (safePg >= popTotalPages - 3) return [1, '...', popTotalPages-4, popTotalPages-3, popTotalPages-2, popTotalPages-1, popTotalPages];
    return [1, '...', safePg - 1, safePg, safePg + 1, '...', popTotalPages];
  };

  const isCsvMode    = chosenFilter === 'static-csv';
  const drawerWidth  = (isCsvMode && (uploadState === 'loading' || uploadState === 'complete'))
                     ? 'min(70vw, 1400px)' : 'min(35vw, 720px)';
  const canCreate    = segmentName.trim() && chosenFilter && (chosenFilter !== 'static-csv' || uploadState === 'complete');
  const unmatchedAll     = [...matchSummary.notFound]; /* duplicates don't block preview */
  const allResolved      = unmatchedAll.length > 0 && unmatchedAll.every(e => manualSel[e.entryId]);
  /* For the grey default CSV flow: Create is only enabled once all incorrect + duplicate entries are dealt with */
  const csvAllClear  = matchSummary.notFound.length === 0 && matchSummary.duplicates.length === 0;
  const canCreatePrimary = canCreate && (
    chosenFilter !== 'static-csv' ||
    (uploadState === 'complete' && csvAllClear) ||  // default CSV flow: all errors cleared
    allResolved ||
    showPreview
  );
  const previewPatients = [
    ...matchSummary.matched.map(p  => ({ ...p, source:'Matched' })),
    ...Object.values(manualSel).map(p => ({ ...p, mrn: p.id || '—', source:'Manual' })),
  ];

  /* ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--neutral-0)', minWidth:0, position:'relative' }}>

      {/* ── Sub-header ── */}
      <div style={{ padding:'10px 20px', borderBottom:'0.5px solid var(--neutral-150)', display:'flex', alignItems:'center', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <button onClick={onToggleSidebar} style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', border:'none', borderRadius:6, background:'none', cursor:'pointer', transition:'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background='var(--neutral-75)'}
            onMouseLeave={e => e.currentTarget.style.background='none'}>
            <SidebarMinimalisticLinear size={14} color="var(--neutral-300)" />
          </button>
          <span style={{ fontSize:16, fontWeight:600, color:'var(--neutral-400)' }}>Population Groups</span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0, marginLeft:'auto' }}>
          {/* ── Inline search bar ── */}
          <div style={{ display:'flex', alignItems:'center', gap:6, height:32, padding:'0 10px', border:'0.5px solid var(--neutral-150)', borderRadius:6, background:'var(--neutral-0)', width:220 }}>
            <MagniferLinear size={14} color="var(--neutral-200)" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search groups..."
              style={{ border:'none', outline:'none', fontSize:13, color:'var(--neutral-400)', background:'transparent', flex:1, fontFamily:'Inter, sans-serif' }} />
            {searchQuery && <div onClick={() => setSearchQuery('')} style={{ cursor:'pointer', display:'flex' }}><CloseCircleLinear size={13} color="var(--neutral-200)" /></div>}
          </div>
          {/* ── Dev-mode toggle (shows/hides experimental buttons) ── */}
          <button
            onClick={() => setShowDevButtons(v => !v)}
            title={showDevButtons ? 'Hide experimental flows' : 'Show experimental flows'}
            style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', border:`0.5px solid ${showDevButtons ? 'var(--primary-200)' : 'var(--neutral-150)'}`, borderRadius:6, background: showDevButtons ? 'var(--primary-50)' : '#fff', cursor:'pointer', transition:'all 0.15s', flexShrink:0 }}>
            {/* Flask / beaker icon */}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 1h4M5 1v5L2 12h10L9 6V1" stroke={showDevButtons ? 'var(--primary-300)' : 'var(--neutral-200)'} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="5.5" cy="9.5" r="0.8" fill={showDevButtons ? 'var(--primary-300)' : 'var(--neutral-200)'}/>
              <circle cx="8" cy="10.5" r="0.6" fill={showDevButtons ? 'var(--primary-300)' : 'var(--neutral-200)'}/>
            </svg>
          </button>

          {/* ── Create Group — opens the file-upload workflow (error card / all-matched review) ── */}
          <button onClick={openNewModal}
            style={{ height:32, padding:'0 12px', background:'var(--neutral-0)', color:'var(--neutral-300)', border:'0.5px solid var(--neutral-150)', borderRadius:6, fontSize:13, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontFamily:'Inter, sans-serif', transition:'background 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background='var(--neutral-50)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='var(--neutral-0)'; }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--neutral-300)" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Group
          </button>

          {/* ── Secondary Create Group — grey/neutral, opens standard CSV flow — commented out for now ──
          <button onClick={openModal}
            style={{ height:32, padding:'0 12px', background:'#fff', color:'var(--neutral-300)', border:'0.5px solid var(--neutral-150)', borderRadius:6, fontSize:13, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontFamily:'Inter, sans-serif', transition:'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background='var(--neutral-50)'}
            onMouseLeave={e => e.currentTarget.style.background='#fff'}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
              <circle cx="5" cy="4" r="2.5"/>
              <path d="M1 11c0-2.21 1.79-4 4-4s4 1.79 4 4"/>
              <path d="M10 6v4M8 8h4"/>
            </svg>
            Create Group
          </button>
          */}

          {/* Import Rule — neutral button, no icon */}
          <button style={{ height:32, padding:'0 12px', border:'0.5px solid var(--neutral-150)', borderRadius:6, background:'#fff', color:'var(--neutral-300)', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'Inter, sans-serif', transition:'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background='var(--neutral-50)'}
            onMouseLeave={e => e.currentTarget.style.background='#fff'}>
            Import Rule
          </button>
          {/* save icon */}
          <button style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', border:'0.5px solid var(--neutral-150)', borderRadius:6, background:'#fff', cursor:'pointer' }}>
            <DocumentTextLinear size={15} color="var(--neutral-300)" />
          </button>
          {/* filter icon with red dot */}
          <div style={{ position:'relative' }}>
            <button style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', border:'0.5px solid var(--neutral-150)', borderRadius:6, background:'#fff', cursor:'pointer' }}>
              <FilterLinear size={15} color="var(--neutral-300)" />
            </button>
            <div style={{ position:'absolute', top:4, right:4, width:7, height:7, borderRadius:'50%', background:'#EF4444', border:'1.5px solid #fff' }} />
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="thin-scroll" style={{ flex:1, overflowY:'auto', overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'Inter, sans-serif', minWidth:900 }}>
          <thead>
            <tr style={{ borderBottom:'0.5px solid var(--neutral-150)', background:'var(--neutral-0)', position:'sticky', top:0, zIndex:2 }}>
              <th style={{ width:40, padding:'10px 12px 10px 20px' }}>
                <div style={{ width:15, height:15, border:'1.5px solid var(--neutral-150)', borderRadius:4 }} />
              </th>
              {[
                { label:'Group Name', flex:true },
                { label:'Active Members' },
                { label:'Inactive Members' },
                { label:'Type' },
                { label:'Created Date', w:160 },
                { label:'Updated Date', w:160 },
                { label:'Action' },
              ].map(col => (
                <th key={col.label} style={{ padding:'0 16px', height:36, textAlign:'left', fontSize:12, fontWeight:500, color:'var(--neutral-300)', whiteSpace:'nowrap', background:'var(--neutral-0)', width: col.w ? col.w : undefined, borderBottom:'0.5px solid var(--neutral-150)' }}>
                  {col.label}
                  {col.flex && <span style={{ marginLeft:4, color:'var(--neutral-150)' }}>↕</span>}
                </th>
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
                  style={{ borderBottom:'0.5px solid var(--neutral-150)', background: isHov ? 'var(--primary-25)' : '#fff', transition:'background 0.1s', cursor:'pointer' }}>

                  {/* checkbox */}
                  <td style={{ padding:'12px 12px 12px 20px', verticalAlign:'middle' }}>
                    <div onClick={() => setCheckedRows(prev => { const n=new Set(prev); n.has(g.id)?n.delete(g.id):n.add(g.id); return n; })}
                      style={{ width:15, height:15, borderRadius:4, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:isChecked?'var(--primary-300)':'transparent', border:`1.5px solid ${isChecked?'var(--primary-300)':'var(--neutral-150)'}`, cursor:'pointer', transition:'all 0.15s' }}>
                      {isChecked && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </td>

                  {/* name + avatar — 0.5px border */}
                  <td style={{ padding:'12px 16px', verticalAlign:'middle' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:6, background:'var(--primary-100)', border:'0.5px solid var(--primary-200)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <UsersGroupRoundedLinear size={16} color="var(--primary-300)" />
                      </div>
                      <div style={{ fontSize:13, fontWeight:400, color:'var(--neutral-400)', lineHeight:1.4 }}>{g.name}</div>
                    </div>
                  </td>

                  {/* active members */}
                  <td style={{ padding:'12px 16px', fontSize:13, color:'var(--neutral-400)', verticalAlign:'middle' }}>
                    {g.count != null ? g.count : '–'}
                  </td>

                  {/* inactive members */}
                  <td style={{ padding:'12px 16px', fontSize:13, color:'var(--neutral-400)', verticalAlign:'middle' }}>
                    {g.inactive != null ? g.inactive : '–'}
                  </td>

                  {/* type */}
                  <td style={{ padding:'12px 16px', verticalAlign:'middle' }}>
                    <span style={{ fontSize:13, fontWeight:400, color:'var(--neutral-300)' }}>
                      {g.type}
                    </span>
                  </td>

                  {/* created date */}
                  <td style={{ padding:'12px 16px', fontSize:13, color:'var(--neutral-300)', whiteSpace:'nowrap', verticalAlign:'middle', width:160 }}>
                    {g.created}
                  </td>

                  {/* updated date */}
                  <td style={{ padding:'12px 16px', fontSize:13, color:'var(--neutral-300)', whiteSpace:'nowrap', verticalAlign:'middle', width:160 }}>
                    {g.updated}
                  </td>

                  {/* actions */}
                  <td style={{ padding:'0 12px', verticalAlign:'middle' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:0 }}>
                      {/* Zap */}
                      <button data-tip="Run Group" style={{ width:24, height:24, borderRadius:4, border:'none', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}
                        onMouseEnter={e => e.currentTarget.style.background='var(--neutral-75)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <ZapIcon size={16} color="var(--neutral-300)" />
                      </button>
                      <div style={{ width:1, height:16, background:'var(--neutral-150)', margin:'0 4px', flexShrink:0 }} />
                      {/* Edit */}
                      <button data-tip="Edit Group" style={{ width:28, height:28, borderRadius:4, border:'none', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}
                        onMouseEnter={e => e.currentTarget.style.background='var(--neutral-75)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <PenLinear size={18} color="var(--neutral-300)" />
                      </button>
                      <div style={{ width:1, height:16, background:'var(--neutral-150)', margin:'0 4px', flexShrink:0 }} />
                      {/* Delete */}
                      <button data-tip="Delete Group" style={{ width:28, height:28, borderRadius:4, border:'none', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}
                        onMouseEnter={e => e.currentTarget.style.background='var(--neutral-75)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <TrashBinMinimalisticLinear size={18} color="var(--neutral-300)" />
                      </button>
                      <div style={{ width:1, height:16, background:'var(--neutral-150)', margin:'0 4px', flexShrink:0 }} />
                      {/* More */}
                      <button data-tip="More Options" style={{ width:28, height:28, borderRadius:4, border:'none', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}
                        onMouseEnter={e => e.currentTarget.style.background='var(--neutral-75)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <MenuDotsLinear size={18} color="var(--neutral-300)" />
                      </button>
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

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── Create Audience Group modal ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {modalOpen && (
        <>
          <div style={{ position:'fixed', inset:0, background:'rgba(22,24,29,0.25)', zIndex:2000 }} onClick={() => {
            if (isCsvMode && (uploadState === 'loading' || uploadState === 'complete')) {
              setShowCloseConfirm(true);
            } else {
              closeModal();
            }
          }} />
          <div onClick={e => e.stopPropagation()}
            className={drawerClosing ? 'drawer-exit' : 'drawer-enter'}
            style={{ position:'fixed', top:8, right:8, bottom:8, width:drawerWidth, minWidth: (isCsvMode && (uploadState === 'loading' || uploadState === 'complete')) ? 800 : 360, background:'#fff', borderRadius:12, boxShadow:'-4px 0 32px rgba(0,0,0,0.14)', zIndex:2001, display:'flex', flexDirection:'column', overflow:'hidden', transition:'width 0.35s cubic-bezier(0.32,0,0.15,1)' }}>

            {/* ── Drawer Header ── */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:48, padding:'0 16px', borderBottom:'0.5px solid var(--neutral-100)', flexShrink:0 }}>
              <span style={{ fontSize:16, fontWeight:500, color:'var(--neutral-500)', fontFamily:'Inter, sans-serif' }}>Create Audience Group</span>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <button
                  disabled={!canCreate}
                  onClick={() => {
                    if (!canCreate) return;
                    const now = new Date();
                    const dateStr = now.toLocaleDateString('en-US', { month:'2-digit', day:'2-digit', year:'numeric' });
                    const dtStr   = now.toLocaleString('en-US',     { month:'2-digit', day:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true });
                    const groupType = chosenFilter === 'dynamic' ? 'Dynamic' : 'Static';
                    const newName = segmentName.trim();
                    setExtraGroups(g => [{
                      id: Date.now(), name: newName, type: groupType,
                      count: previewPatients.length || matchSummary.matched.length,
                      inactive: 0, created: dateStr, updated: dtStr,
                    }, ...g]);
                    onGroupCreated?.(newName);
                    showToast('Population Group Added Successfully');
                    closeModal();
                  }}
                  style={{ height:30, padding:'0 16px', borderRadius:6, fontSize:14, fontWeight:500, fontFamily:'Inter, sans-serif', cursor: canCreate ? 'pointer' : 'default', transition:'background 0.15s, color 0.15s',
                    background: canCreatePrimary ? 'var(--primary-300)' : 'var(--neutral-50)',
                    color:      canCreatePrimary ? '#fff' : canCreate ? 'var(--neutral-300)' : 'var(--neutral-150)',
                    border:     canCreatePrimary ? 'none' : '0.5px solid var(--neutral-150)',
                  }}>
                  Create
                </button>
                <div style={{ width:'0.5px', height:18, background:'var(--neutral-150)' }} />
                <button
                  onClick={() => {
                    if (isCsvMode && (uploadState === 'loading' || uploadState === 'complete')) {
                      setShowCloseConfirm(true);
                    } else {
                      closeModal();
                    }
                  }}
                  style={{ width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', border:'none', background:'none', cursor:'pointer', fontSize:20, color:'var(--neutral-300)', fontWeight:300, lineHeight:1, borderRadius:4, transition:'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--neutral-75)'}
                  onMouseLeave={e => e.currentTarget.style.background='none'}>×</button>
              </div>
            </div>

            {/* ── Drawer Body: two-column when CSV + loading/complete, else single col ── */}
            <ConfigProvider theme={{ token: { fontFamily: 'Inter, sans-serif' } }}>
            {/* ConfigProvider end tag is below at the closing of drawer body */}
            {isCsvMode && (uploadState === 'loading' || uploadState === 'complete') ? (
              <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
                {/* LEFT: locked form */}
                <div className="thin-scroll" style={{ width:'clamp(300px, 38%, 460px)', flexShrink:0, overflowY:'auto', padding:'16px', borderRight:'0.5px solid var(--neutral-100)' }}>
                  <div style={{ marginBottom:16 }}>
                    <label style={{ display:'block', fontSize:14, fontWeight:400, color:'var(--neutral-200)', marginBottom:5 }}>Create Segment Name <span style={{ color:'#EF4444' }}>•</span></label>
                    <Input
                      value={segmentName}
                      onChange={e => setSegmentName(e.target.value)}
                      placeholder="Enter Name"
                      style={{ fontSize:14, color:'var(--neutral-400)', fontFamily:'Inter, sans-serif', width:'100%', border:'0.5px solid var(--neutral-200)' }}
                    />
                  </div>
                  <div style={{ marginBottom:16 }}>
                    <label style={{ display:'block', fontSize:14, fontWeight:400, color:'var(--neutral-200)', marginBottom:5 }}>Description</label>
                    <Input.TextArea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Enter Description"
                      style={{ fontSize:14, color:'var(--neutral-400)', fontFamily:'Inter, sans-serif', resize:'none', border:'0.5px solid var(--neutral-200)' }}
                    />
                  </div>
                  <div style={{ marginBottom:16 }}>
                    <label style={{ display:'block', fontSize:14, fontWeight:400, color:'var(--neutral-200)', marginBottom:5 }}>Choose Filter <span style={{ color:'#EF4444' }}>•</span></label>
                    <DrawerSelect
                      value={chosenFilter}
                      onChange={val => { setChosenFilter(val); setUploadFile(null); setUploadState('idle'); setCriteria([{ attr:'Age', op:'≥', val:'' }]); }}
                      placeholder="Choose Filter"
                      options={FILTER_OPTIONS}
                    />
                  </div>
                  <div style={{ marginBottom:16 }}>
                    <label style={{ display:'block', fontSize:14, fontWeight:400, color:'var(--neutral-200)', marginBottom:5 }}>Frequency <span style={{ color:'#EF4444' }}>•</span></label>
                    <DrawerSelect
                      value="one-time"
                      onChange={() => {}}
                      disabled
                      options={[{ value:'one-time', label:'One Time' }]}
                      hint="Preset & fixed for Static CSV filter."
                    />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:14, fontWeight:400, color:'var(--neutral-200)', marginBottom:5 }}>Current Membership Status</label>
                    <DrawerSelect
                      value={memberStatus}
                      onChange={val => setMemberStatus(val)}
                      placeholder="Select Current Membership Status"
                      options={MEMBERSHIP_OPTS.map(o => ({ value:o, label:o }))}
                    />
                  </div>
                </div>

                {/* RIGHT: loading animation OR summary */}
                {uploadState === 'loading' ? (
                  /* Loading animation panel */
                  <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', padding:'16px', overflow:'hidden' }}>
                    {uploadFile && (
                      <div style={{ marginBottom:16 }}>
                        <FilePreviewCard
                          fileName={uploadFile.name}
                          sizeMB={(uploadFile.size/1048576).toFixed(1)}
                          onReplace={() => { setUploadFile(null); setUploadState('idle'); setUploadPct(0); setMatchSummary({ matched:[], notFound:[], duplicates:[] }); setManualSel({}); parsedRef.current = null; }}
                        />
                      </div>
                    )}
                    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20 }}>
                      <div style={{ position:'relative', width:80, height:80 }}>
                        <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'3px solid var(--primary-100)', borderTopColor:'var(--primary-300)', borderRightColor:'var(--primary-200)', animation:'pg-spin 1s linear infinite' }} />
                        <div style={{ position:'absolute', inset:11, borderRadius:'50%', border:'2px solid transparent', borderBottomColor:'var(--primary-200)', animation:'pg-spin-rev 1.5s linear infinite' }} />
                        <div style={{ position:'absolute', inset:22, borderRadius:'50%', background:'var(--primary-100)', display:'flex', alignItems:'center', justifyContent:'center', animation:'pg-pulse 2s ease-in-out infinite' }}>
                          <TableIcon color="var(--primary-300)" size={16} />
                        </div>
                      </div>
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontSize:14, fontWeight:600, color:'var(--neutral-400)', marginBottom:4 }}>Processing your file…</div>
                        <div style={{ fontSize:14, color:'var(--neutral-300)', lineHeight:1.6 }}>Uploading and validating your patient list</div>
                      </div>
                      <div style={{ width:220, height:4, background:'var(--primary-100)', borderRadius:2, overflow:'hidden', position:'relative' }}>
                        <div style={{ position:'absolute', height:'100%', width:'45%', background:'linear-gradient(90deg, transparent, var(--primary-300), var(--primary-200), transparent)', borderRadius:2, animation:'pg-progress 1.8s ease-in-out infinite' }} />
                      </div>
                      <div style={{ fontSize:14, color:'var(--neutral-200)', textAlign:'center', lineHeight:1.6 }}>You can minimize this window and<br/>continue working while it processes.</div>
                      <button
                        onClick={() => {
                          startPgSession({
                            fileName: uploadFile?.name || '',
                            fileSize: uploadFile?.size || 0,
                            segName: segmentName,
                            status: 'loading',
                            procStep,
                            startedAt: loadingStartRef.current || Date.now(),
                            result: parsedRef.current || matchSummary,
                          });
                          resetModalState();
                          setModalOpen(false);
                        }}
                        style={{ height:32, padding:'0 14px', border:'0.5px solid var(--neutral-150)', borderRadius:6, background:'#fff', color:'var(--neutral-300)', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'Inter, sans-serif', display:'flex', alignItems:'center', gap:6, transition:'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background='var(--neutral-50)'}
                        onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                        <CollapseIcon size={16} color="var(--neutral-300)" />
                        Minimize
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Summary panel — default flow */
                  <div className="thin-scroll" style={{ flex:1, minWidth:0, overflowY:'auto', padding:'16px' }}>
                    {newMode ? (
                      <NewModePanel
                        matchSummary={matchSummary}
                        uploadFile={uploadFile}
                        csvAllClear={csvAllClear}
                        onReupload={() => { setUploadFile(null); setUploadState('idle'); setUploadPct(0); setMatchSummary({ matched:[], notFound:[], duplicates:[] }); setManualSel({}); parsedRef.current = null; }}
                      />
                    ) : (
                      <>
                        {/* ── File Processing Summary heading ── */}
                        {!showPreview && (
                          <div style={{ fontSize:14, fontWeight:500, color:'var(--neutral-400)', marginBottom:10 }}>File Processing Summary</div>
                        )}

                        {/* ── Info banner (Figma 1921-9782) — above file chip, hidden on Review Pop Group ── */}
                        {!showPreview && uploadFile && !csvAllClear && (
                          <div style={{ background:'#f4f8fe', border:'0.5px solid rgba(20,94,204,0.2)', borderRadius:4, padding:6, marginBottom:8, display:'flex', alignItems:'flex-start', gap:4 }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0, marginTop:1 }}>
                              <circle cx="8" cy="8" r="7" stroke="#145ECC" strokeWidth="1.2"/>
                              <path d="M8 7v4" stroke="#145ECC" strokeWidth="1.4" strokeLinecap="round"/>
                              <circle cx="8" cy="5.5" r="0.7" fill="#145ECC"/>
                            </svg>
                            <span style={{ fontSize:12, fontWeight:400, color:'var(--neutral-400)', lineHeight:1.4 }}>
                              Enter correct values for fold ID &amp; match to recommended entries OR Reupload excel with correct data.
                            </span>
                          </div>
                        )}

                        {/* ── File chip (Figma 1921-9783) ── */}
                        {!showPreview && (
                          <FileChipCard
                            uploadFile={uploadFile}
                            onReupload={() => { setUploadFile(null); setUploadState('idle'); setUploadPct(0); setMatchSummary({ matched:[], notFound:[], duplicates:[] }); setManualSel({}); parsedRef.current = null; }}
                          />
                        )}

                        {/* Info banner moved above file chip */}

                        {/* ── Matched Members / Review Pop Group ── */}
                        {!showPreview && (
                          <FigmaMatchedSection
                            patients={matchSummary.matched}
                            expanded={matchedExp}
                            onToggle={() => setMatchedExp(v => !v)}
                            allDone={matchSummary.notFound.length === 0 && matchSummary.duplicates.length === 0 && matchSummary.matched.length > 0}
                          />
                        )}

                        {/* ── Members With Incorrect Details ── */}
                        {matchSummary.notFound.length > 0 && !showPreview && (
                          <FigmaIncorrectSection
                            entries={matchSummary.notFound}
                            expanded={notFoundExp}
                            onToggle={() => setNotFoundExp(v => !v)}
                            onAdd={(entryId, patient) => {
                              setMatchSummary(prev => ({
                                ...prev,
                                matched: [...prev.matched, patient],
                                notFound: prev.notFound.filter(e => e.entryId !== entryId),
                              }));
                              onMemberAdded?.('Member added to Matched Members successfully');
                            }}
                            onRemove={entryId => setMatchSummary(prev => ({
                              ...prev,
                              notFound: prev.notFound.filter(e => e.entryId !== entryId),
                            }))}
                            matchedIds={new Set(matchSummary.matched.map(p => p.id))}
                          />
                        )}

                        {/* ── Duplicate Entries ── */}
                        {matchSummary.duplicates.length > 0 && !showPreview && (
                          <FigmaDuplicateSection
                            entries={matchSummary.duplicates}
                            matched={matchSummary.matched}
                            expanded={dupExp}
                            onToggle={() => setDupExp(v => !v)}
                            onRemove={entryId => setMatchSummary(prev => reclassifyDuplicate(prev, entryId))}
                          />
                        )}

                        {/* ── Action row: Reupload + Preview Pop Group ── */}
                        {/* {!showPreview && (
                          <div style={{ display:'flex', gap:8 }}>
                            <button
                              onClick={() => {
                                setUploadFile(null); setUploadState('idle'); setUploadPct(0);
                                setMatchSummary({ matched:[], notFound:[], duplicates:[] });
                                setManualSel({}); setShowPreview(false); parsedRef.current = null;
                              }}
                              style={{ flex:1, height:34, background:'#fff', color:'var(--neutral-300)', border:'0.5px solid var(--neutral-150)', borderRadius:6, fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'Inter, sans-serif', transition:'background 0.15s', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}
                              onMouseEnter={e => e.currentTarget.style.background='var(--neutral-50)'}
                              onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>
                              Reupload Document
                            </button>
                            <button
                              disabled={unmatchedAll.length > 0 && !allResolved}
                              onClick={() => setShowPreview(true)}
                              style={{ flex:1, height:34, borderRadius:6, fontSize:14, fontWeight:500, fontFamily:'Inter, sans-serif', transition:'background 0.15s', display:'flex', alignItems:'center', justifyContent:'center', gap:6, border:'none',
                                background: (unmatchedAll.length === 0 || allResolved) ? 'var(--primary-300)' : 'var(--neutral-100)',
                                color:      (unmatchedAll.length === 0 || allResolved) ? '#fff' : 'var(--neutral-200)',
                                cursor:     (unmatchedAll.length === 0 || allResolved) ? 'pointer' : 'not-allowed',
                              }}
                              onMouseEnter={e => { if (unmatchedAll.length === 0 || allResolved) e.currentTarget.style.background='var(--primary-400)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = (unmatchedAll.length === 0 || allResolved) ? 'var(--primary-300)' : 'var(--neutral-100)'; }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                              Preview Pop Group
                            </button>
                          </div>
                        )} */}

                        {/* ══ PREVIEW + SAVE PANEL ══ */}
                        {/* {showPreview && (
                          <PreviewPanel
                            patients={previewPatients}
                            onBack={() => setShowPreview(false)}
                          />
                        )} */}
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* ── Single-column drawer body ── */
              <div className="thin-scroll" style={{ flex:1, overflowY:'auto', padding:'16px' }}>

                  {/* Segment Name */}
                  <div style={{ marginBottom:16 }}>
                    <label style={{ display:'block', fontSize:14, fontWeight:400, color:'var(--neutral-200)', marginBottom:6 }}>
                      Create Segment Name <span style={{ color:'#EF4444' }}>•</span>
                    </label>
                    <Input
                      value={segmentName}
                      onChange={e => setSegmentName(e.target.value)}
                      placeholder="Enter Name"
                      style={{ width:'100%', fontSize:14, color:'var(--neutral-400)', fontFamily:'Inter, sans-serif', border:'0.5px solid var(--neutral-200)' }}
                    />
                  </div>

                  {/* Description */}
                  <div style={{ marginBottom:16 }}>
                    <label style={{ display:'block', fontSize:14, fontWeight:400, color:'var(--neutral-200)', marginBottom:6 }}>Description</label>
                    <Input.TextArea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Enter Description"
                      style={{ fontSize:14, color:'var(--neutral-400)', fontFamily:'Inter, sans-serif', resize:'none', border:'0.5px solid var(--neutral-200)' }}
                    />
                  </div>

                  {/* Choose Filter dropdown */}
                  <div style={{ marginBottom:8 }}>
                    <label style={{ display:'block', fontSize:14, fontWeight:400, color:'var(--neutral-200)', marginBottom:6 }}>
                      Choose Filter <span style={{ color:'#EF4444' }}>•</span>
                    </label>
                    <DrawerSelect
                      value={chosenFilter}
                      onChange={val => { setChosenFilter(val); setUploadFile(null); setUploadState('idle'); setCriteria([{ attr:'Age', op:'≥', val:'' }]); }}
                      placeholder="Choose Filter"
                      options={FILTER_OPTIONS}
                    />
                  </div>

                  {/* ── Static CSV: Upload Patient List ── */}
                  {chosenFilter === 'static-csv' && (
                    <div style={{ marginBottom:16 }}>
                      <div style={{ border:'0.5px solid var(--neutral-150)', borderRadius:8, overflow:'hidden', background:'var(--neutral-50)' }}>
                        {/* Section header */}
                        <div style={{ padding:'10px 14px', borderBottom:'0.5px solid var(--neutral-100)' }}>
                          <span style={{ fontSize:14, fontWeight:500, color:'var(--neutral-400)' }}>Upload Patient List</span>
                        </div>
                        <div style={{ padding:'12px 14px' }}>
                          {/* Info box */}
                          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'#EFF6FF', border:'0.5px solid #BFDBFE', borderRadius:6, marginBottom:12 }}>
                            <InfoCircleLinear size={14} color="#3B82F6" style={{ flexShrink:0 }} />
                            <span style={{ fontSize:12, color:'#1D4ED8', lineHeight:1.5 }}>
                              Ensure column names match your ID type — use "EHR ID" for EHR IDs or "Fold Contact ID" for Fold Contact IDs.
                            </span>
                          </div>

                          {/* Upload area or uploaded file */}
                          {uploadFile && uploadState === 'uploading' ? (
                            /* File selected — show progress */
                            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', border:'0.5px solid var(--primary-200)', borderRadius:8, background:'var(--primary-50)', marginBottom:10 }}>
                              <div style={{ width:28, height:28, borderRadius:4, background:'var(--primary-100)', border:'0.5px solid var(--primary-200)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                <TableIcon color="var(--primary-300)" size={16} />
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:14, fontWeight:500, color:'var(--neutral-400)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{uploadFile.name}</div>
                                <div style={{ marginTop:6, height:4, background:'var(--neutral-100)', borderRadius:2, overflow:'hidden' }}>
                                  <div style={{ height:'100%', width:`${uploadPct}%`, background: uploadPct < 40 ? '#D97706' : '#15803D', borderRadius:2, transition:'width 0.3s ease, background 0.4s ease' }} />
                                </div>
                                <div style={{ fontSize:12, color:'var(--neutral-200)', marginTop:3 }}>{uploadPct}%</div>
                              </div>
                              <button onClick={() => { setUploadFile(null); setUploadState('idle'); setUploadPct(0); }}
                                style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', padding:4, borderRadius:4, transition:'background 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.background='var(--neutral-75)'}
                                onMouseLeave={e => e.currentTarget.style.background='none'}>
                                <MiniCloseIcon />
                              </button>
                            </div>
                          ) : (
                            /* Drop zone */
                            <div
                              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                              onDragLeave={() => setDragOver(false)}
                              onDrop={e => { e.preventDefault(); setDragOver(false); const f=e.dataTransfer.files[0]; if(f) handleFile(f); }}
                              onClick={() => fileInputRef.current?.click()}
                              style={{ border:`1.5px dashed ${dragOver ? 'var(--primary-300)' : 'var(--neutral-150)'}`, borderRadius:8, padding:'28px 16px', textAlign:'center', cursor:'pointer', background: dragOver ? 'var(--primary-50)' : '#fff', transition:'all 0.2s', marginBottom:8 }}>
                              <input ref={fileInputRef} type="file" accept=".csv,.xls,.xlsx" style={{ display:'none' }} onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f); }} />
                              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ display:'block', margin:'0 auto' }}>
                                <path d="M3 15c0 2.828 0 4.243.879 5.121C4.757 21 6.172 21 9 21h6c2.828 0 4.243 0 5.121-.879C21 19.243 21 17.828 21 15M12 16V3m0 0 4 4.375M12 3 8 7.375" stroke={dragOver ? 'var(--primary-300)' : 'var(--neutral-300)'} strokeWidth="1"/>
                              </svg>
                              <div style={{ fontSize:14, color:'var(--neutral-300)', marginTop:10 }}>
                                Drag & drop file here or <span style={{ color:'var(--primary-300)', fontWeight:500, cursor:'pointer' }}>Choose file</span>
                              </div>
                            </div>
                          )}
                          {/* format info + template */}
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <span style={{ fontSize:12, color:'var(--neutral-200)' }}>Supported formats: CSV, XLS, XLSX &nbsp;•&nbsp; Max size: 5 MB</span>
                            <span style={{ fontSize:12, color:'var(--primary-300)', fontWeight:500, cursor:'pointer' }}>Download Template</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Dynamic: criteria builder ── */}
                  {chosenFilter === 'dynamic' && (
                    <div style={{ marginBottom:14 }}>
                      <div style={{ border:'0.5px solid var(--neutral-150)', borderRadius:8, padding:'12px 14px' }}>
                        <div style={{ fontSize:14, fontWeight:600, color:'var(--neutral-400)', marginBottom:10 }}>Patient Characteristics</div>
                        <div style={{ fontSize:14, color:'var(--neutral-200)', marginBottom:10 }}>Patients matching <strong style={{ color:'var(--neutral-400)' }}>all</strong> conditions below will be included.</div>
                        {criteria.map((c, idx) => {
                          const attrDef = CRIT_ATTRS.find(a => a.label===c.attr) || CRIT_ATTRS[0];
                          return (
                            <div key={idx} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                              <span style={{ fontSize:14, fontWeight:500, color:'var(--neutral-300)', width:24, textAlign:'center', flexShrink:0 }}>{idx===0?'IF':'AND'}</span>
                              <select className="pg-crit-select" value={c.attr} onChange={e => updateCriterion(idx,'attr',e.target.value)}
                                style={{ flex:2, padding:'7px 8px', border:'0.5px solid var(--neutral-150)', borderRadius:6, fontSize:14, color:'var(--neutral-400)', fontFamily:'Inter, sans-serif', background:'#fff', outline:'none' }}>
                                {CRIT_ATTRS.map(a => <option key={a.label} value={a.label}>{a.label}</option>)}
                              </select>
                              <select className="pg-crit-select" value={c.op} onChange={e => updateCriterion(idx,'op',e.target.value)}
                                style={{ flex:1.4, padding:'7px 6px', border:'0.5px solid var(--neutral-150)', borderRadius:6, fontSize:14, color:'var(--neutral-400)', fontFamily:'Inter, sans-serif', background:'#fff', outline:'none' }}>
                                {attrDef.ops.map(op => <option key={op} value={op}>{op}</option>)}
                              </select>
                              {attrDef.type==='select' ? (
                                <select className="pg-crit-select" value={c.val} onChange={e => updateCriterion(idx,'val',e.target.value)}
                                  style={{ flex:2, padding:'7px 6px', border:'0.5px solid var(--neutral-150)', borderRadius:6, fontSize:14, color:'var(--neutral-400)', fontFamily:'Inter, sans-serif', background:'#fff', outline:'none' }}>
                                  <option value="">Select…</option>
                                  {attrDef.opts.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              ) : (
                                <input className="pg-input" value={c.val} onChange={e => updateCriterion(idx,'val',e.target.value)}
                                  placeholder="Value"
                                  style={{ flex:2, padding:'7px 8px', border:'0.5px solid var(--neutral-150)', borderRadius:6, fontSize:14, color:'var(--neutral-400)', fontFamily:'Inter, sans-serif', outline:'none' }} />
                              )}
                              {criteria.length > 1 && (
                                <button onClick={() => removeCriterion(idx)}
                                  style={{ width:24, height:24, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                  <CloseCircleLinear size={14} color="var(--neutral-200)" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                        <button onClick={addCriterion}
                          style={{ fontSize:14, color:'var(--primary-300)', background:'none', border:'none', cursor:'pointer', padding:'4px 0', display:'flex', alignItems:'center', gap:4, fontFamily:'Inter, sans-serif', fontWeight:500, marginTop:2 }}>
                          <AddSquareLinear size={13} color="var(--primary-300)" /> Add Filter
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Frequency (static-csv only, fixed/disabled) */}
                  {chosenFilter === 'static-csv' && (
                    <div style={{ marginBottom:16 }}>
                      <label style={{ display:'block', fontSize:14, fontWeight:400, color:'var(--neutral-200)', marginBottom:6 }}>
                        Frequency <span style={{ color:'#EF4444' }}>•</span>
                      </label>
                      <DrawerSelect
                        value="one-time"
                        onChange={() => {}}
                        disabled
                        options={[{ value:'one-time', label:'One Time' }]}
                        hint="Frequency is preset & fixed for Static (upload from CSV file) Filter."
                      />
                    </div>
                  )}

                  {/* Fold Membership Status — always visible */}
                  <div style={{ marginBottom:16 }}>
                    <label style={{ display:'block', fontSize:14, fontWeight:400, color:'var(--neutral-200)', marginBottom:6 }}>Fold Membership Status</label>
                    <DrawerSelect
                      value={memberStatus}
                      onChange={val => setMemberStatus(val)}
                      placeholder="Select Current Membership Status"
                      options={MEMBERSHIP_OPTS.map(o => ({ value:o, label:o }))}
                    />
                  </div>
            </div>
            )}
            </ConfigProvider>
          </div>

          {/* ── Destructive close confirmation dialog ── */}
          {/* ── Close-while-uploading confirmation — reuses DeleteConfirmModal visual pattern ── */}
          {showCloseConfirm && (
            <>
              <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.25)', zIndex:10000 }} onClick={() => setShowCloseConfirm(false)} />
              <div
                onClick={e => e.stopPropagation()}
                style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:340, background:'#fff', borderRadius:12, border:'0.5px solid var(--neutral-100)', padding:20, boxShadow:'0 4px 20px rgba(0,0,0,0.14)', zIndex:10001, display:'flex', flexDirection:'column', alignItems:'center', gap:16, fontFamily:'Inter,sans-serif' }}
              >
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, width:'100%' }}>
                  <DangerCircleLinear size={18} color="#CF1322" strokeWidth={1} />
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, width:'100%' }}>
                    <span style={{ fontSize:16, fontWeight:500, color:'var(--neutral-400)', textAlign:'center' }}>Quit without saving?</span>
                    <p style={{ fontSize:14, color:'var(--neutral-200)', textAlign:'center', lineHeight:1.5, margin:0 }}>
                      You will need to reupload the file if you quit now. Any progress will be lost.
                    </p>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, width:'100%' }}>
                  <button
                    onClick={() => setShowCloseConfirm(false)}
                    style={{ flex:1, height:32, borderRadius:4, border:'0.5px solid var(--neutral-200)', background:'#fff', color:'var(--neutral-300)', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'Inter, sans-serif', transition:'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--neutral-50)'}
                    onMouseLeave={e => e.currentTarget.style.background='#fff'}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { setShowCloseConfirm(false); closeModal(); }}
                    style={{ flex:1, height:32, borderRadius:4, border:'0.5px solid rgba(217,45,32,0.5)', background:'#FFF1F0', color:'#CF1322', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'Inter, sans-serif' }}
                    onMouseEnter={e => e.currentTarget.style.background='#FFE4E0'}
                    onMouseLeave={e => e.currentTarget.style.background='#FFF1F0'}
                  >
                    Quit Anyway
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

    </div>
  );
}

export { PopulationGroupsView };
