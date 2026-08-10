import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon/Icon';
import { Button } from '../Button/Button';
import { Drawer } from '../Drawer/Drawer';
import { Avatar } from '../Avatar/Avatar';
import { ActionButton } from '../ActionButton/ActionButton';
import { Switch } from '../Switch/Switch';
import { Select } from '../Select/Select';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';
import styles from './ScheduleDrawer.module.css';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const EMPTY_PROFILE_USERS = [];

export const FALLBACK_APPOINTMENT_TYPES = [
  { name: 'Annual Wellness Visit', code: 'AWV', mode: 'In-person', duration: '60 min', color: '#D9A50B' },
  // Program-related appointment types — one per care program. When booked for
  // a patient they surface under "Program related appointments" in that
  // program's Appointment step (matched by `programCode`).
  { name: 'SNP Care Program Visit', code: 'SNP', mode: 'In-person', duration: '45 min', color: 'var(--primary-300)' },
  { name: 'TOC Inpatient Visit', code: 'TOC IP', mode: 'In-person', duration: '45 min', color: 'var(--status-info)' },
  { name: 'TOC Emergency Dept. Visit', code: 'TOC ED', mode: 'In-person', duration: '45 min', color: 'var(--status-error)' },
  { name: 'High Utilizers Visit', code: 'HIU', mode: 'In-person/Virtual', duration: '30 min', color: 'var(--secondary-300)' },
  { name: 'Disease Management Visit', code: 'DM', mode: 'In-person/Virtual', duration: '30 min', color: 'var(--status-success)' },
  { name: 'Chronic Care Management Visit', code: 'CCM', mode: 'Virtual', duration: '20 min', color: 'var(--status-warning)' },
  { name: 'Transitional Care Visit', code: 'TCM', mode: 'In-person', duration: '30 min', color: 'var(--accent-cyan)' },
  { name: 'Follow-up Appointment', code: 'Routine', mode: 'In-person/Virtual', duration: '15-30 min', color: '#8C5AE2' },
  { name: 'Specialty Consultation', code: 'Routine', mode: 'In-person', duration: '45 min', color: '#009B53' },
  { name: 'Telehealth Consultation', code: 'Routine', mode: 'Virtual', duration: '30 min', color: '#145ECC' },
  { name: 'Lab Results Discussion', code: 'Routine', mode: 'Virtual', duration: '15 min', color: '#009B53' },
];

const MODE_OPTIONS = [
  { label: 'At Clinic', icon: 'solar:buildings-linear' },
  { label: 'Virtual/Telehealth', icon: 'solar:monitor-linear' },
];
const LOCATION_OPTIONS = ['Fold Health, New York', '7 Hills Department', '68th Street, New York', '168th Street, New York'];
const PROVIDER_OPTIONS = [
  { name: 'Ralph Kessler', gender: 'Male', dob: '03-29-1992', age: 31, slots: '6 Slots Available' },
  { name: 'Robert Langdon', gender: 'Male', dob: '11-20-1986', age: 30, slots: '3 Slots Available' },
  { name: 'Cameron Haley', gender: 'Male', dob: '11-23-1986', age: 35, slots: '1 Slots Available' },
  { name: 'Mrs. Andrew Mayer IV', gender: 'Male', dob: '11-25-1986', age: 30, slots: 'Not Available' },
  { name: 'Gayle Jacobs', gender: 'Male', dob: '12-02-1986', age: 31, slots: '4 Slots Available' },
];
// Generate 30-min time slots from 6:00 AM to 7:30 PM
const TIME_SLOTS = (() => {
  const slots = [];
  for (let h = 6; h < 20; h++) {
    for (const m of [0, 30]) {
      const ampm = h >= 12 ? 'pm' : 'am';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      slots.push(`${h12}:${String(m).padStart(2, '0')} ${ampm}`);
    }
  }
  return slots;
})();

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '');
}

/* ── Patient Search Dropdown ── */
function PatientSearch({ patients, onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return patients.slice(0, 8);
    const q = query.toLowerCase();
    return patients.filter(p => p.name?.toLowerCase().includes(q)).slice(0, 8);
  }, [patients, query]);

  return (
    <div ref={ref} className={styles.patientSearch}>
      <div className={styles.searchInputWrap}>
        <Icon name="solar:magnifer-linear" size={16} color="var(--neutral-200)" />
        <input
          className={styles.searchInput}
          placeholder="Search patient or prospect"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
        />
      </div>
      {open && (
        <div className={styles.searchDropdown}>
          {filtered.length > 0 ? filtered.map(p => (
            <button key={p.id} className={styles.searchItem} onClick={() => { onSelect(p); setOpen(false); setQuery(''); }}>
              <Avatar variant="patient" initials={getInitials(p.name).toUpperCase()} />
              <div>
                <div className={styles.searchItemName}>{p.name}</div>
                <div className={styles.searchItemMeta}>{p.gender?.[0] || 'M'} &bull; {p.dob || '03-29-1992'} ({p.age || '31'}Y)</div>
              </div>
            </button>
          )) : (
            <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--neutral-200)', textAlign: 'center' }}>No patients found</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Appointment Type Picker ── */
function AppointmentTypePicker({ value, onSelect, appointmentTypes }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const btnRef = useRef(null);

  const filtered = appointmentTypes.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ position: 'relative' }}>
      {value ? (
        <button ref={btnRef} className={styles.detailValue} onClick={() => setOpen(v => !v)} style={{ cursor: 'pointer' }}>
          <span className={styles.apptDot} style={{ background: value.color }} />
          {value.name}
        </button>
      ) : (
        <button ref={btnRef} className={styles.detailValuePlaceholder} onClick={() => setOpen(v => !v)}>
          <Icon name="solar:calendar-mark-linear" size={16} color="var(--neutral-200)" />
          Select Appointment Type
        </button>
      )}
      {open && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)}>
          <div className={styles.apptDropdown} style={{ position: 'fixed', top: btnRef.current?.getBoundingClientRect().bottom + 4, left: btnRef.current?.getBoundingClientRect().left, zIndex: 9999 }} onClick={e => e.stopPropagation()}>
            <div className={styles.apptSearchWrap}>
              <Icon name="solar:magnifer-linear" size={14} color="var(--neutral-200)" />
              <input className={styles.apptSearchInput} placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
            </div>
            {filtered.map(t => (
              <button key={t.name} className={styles.apptItem} onClick={() => { onSelect(t); setOpen(false); }}>
                <span className={styles.apptDot} style={{ background: t.color }} />
                <div style={{ flex: 1 }}>
                  <div className={styles.apptItemName}>{t.name}</div>
                  <div className={styles.apptItemMeta}>{t.code} &bull; {t.mode}</div>
                </div>
                <div className={styles.apptItemDuration}>
                  <Icon name="solar:clock-circle-linear" size={12} color="var(--neutral-200)" />
                  {t.duration}
                </div>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── Generic Detail Dropdown ── */
function DetailDropdown({ value, placeholder, icon, options, onSelect, renderItem }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  // Resolve the icon based on the selected value's option (for mode icons, etc.)
  const resolvedIcon = (() => {
    if (!value) return icon;
    const match = options.find(o => o.label === value);
    return match?.icon || icon;
  })();

  if (value) {
    return (
      <div style={{ position: 'relative' }}>
        <button ref={btnRef} className={styles.detailValue} onClick={() => setOpen(v => !v)} style={{ cursor: 'pointer' }}>
          <Icon name={resolvedIcon} size={16} color="var(--neutral-300)" /> {value}
        </button>
        {open && createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)}>
            <div className={styles.simpleDropdown} style={{ position: 'fixed', top: btnRef.current?.getBoundingClientRect().bottom + 4, left: btnRef.current?.getBoundingClientRect().left, zIndex: 9999 }} onClick={e => e.stopPropagation()}>
              {options.map(opt => (
                <button key={opt.label} className={styles.simpleDropItem} onClick={() => { onSelect(opt.label); setOpen(false); }}>
                  {renderItem ? renderItem(opt) : opt.label}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }
  return (
    <div style={{ position: 'relative' }}>
      <button ref={btnRef} className={styles.detailValuePlaceholder} onClick={() => setOpen(v => !v)}><Icon name={icon} size={16} color="var(--neutral-200)" /> {placeholder}</button>
      {open && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)}>
          <div className={styles.simpleDropdown} style={{ position: 'fixed', top: btnRef.current?.getBoundingClientRect().bottom + 4, left: btnRef.current?.getBoundingClientRect().left, zIndex: 9999 }} onClick={e => e.stopPropagation()}>
            {options.map(opt => (
              <button key={opt.label} className={styles.simpleDropItem} onClick={() => { onSelect(opt.label); setOpen(false); }}>
                {renderItem ? renderItem(opt) : opt.label}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── Provider Picker (searchable with avatar + slots) ── */
function ProviderPicker({ value, onSelect, profileUsers = EMPTY_PROFILE_USERS, onAddSecondary }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const btnRef = useRef(null);

  // Merge DB users with fallback providers
  const allProviders = useMemo(() => {
    const dbUsers = profileUsers.map(u => ({ name: u.name, gender: 'Staff', dob: '', age: '', slots: 'Available' }));
    return dbUsers.length > 0 ? dbUsers : PROVIDER_OPTIONS;
  }, [profileUsers]);

  const filtered = allProviders.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          <button ref={btnRef} className={styles.detailValue} onClick={() => setOpen(v => !v)} style={{ cursor: 'pointer', flex: 1 }}>
            <Avatar variant="assignee" initials={getInitials(value).toUpperCase()} /> {value}
          </button>
          <button className={styles.addSecondaryBtn} onClick={onAddSecondary}><Icon name="solar:user-plus-linear" size={14} color="var(--primary-300)" /> Add Secondary</button>
        </div>
      ) : (
        <button ref={btnRef} className={styles.detailValuePlaceholder} onClick={() => setOpen(v => !v)}><Icon name="solar:user-linear" size={16} color="var(--neutral-200)" /> Select Provider</button>
      )}
      {open && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)}>
          <div className={styles.providerDropdown} style={{ position: 'fixed', top: btnRef.current?.getBoundingClientRect().bottom + 4, left: btnRef.current?.getBoundingClientRect().left, zIndex: 9999 }} onClick={e => e.stopPropagation()}>
            <div className={styles.apptSearchWrap}><Icon name="solar:magnifer-linear" size={14} color="var(--neutral-200)" /><input className={styles.apptSearchInput} placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} autoFocus /></div>
            {filtered.map(p => (
              <button key={p.name} className={styles.providerItem} onClick={() => { onSelect(p.name); setOpen(false); }}>
                <Avatar variant="assignee" initials={getInitials(p.name).toUpperCase()} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--neutral-400)' }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--neutral-200)' }}>{p.gender}</div>
                </div>
                <span style={{ fontSize: 12, color: p.slots === 'Not Available' ? 'var(--neutral-200)' : 'var(--primary-300)' }}>{p.slots || ''}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── Secondary User Multi-Picker ── */
function SecondaryUserPicker({ selected, onChange, profileUsers, primary }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const btnRef = useRef(null);

  const allProviders = useMemo(() => {
    const dbUsers = profileUsers.map(u => u.name);
    const fallback = PROVIDER_OPTIONS.map(p => p.name);
    return (dbUsers.length > 0 ? dbUsers : fallback).filter(n => n !== primary);
  }, [profileUsers, primary]);

  const filtered = allProviders.filter(n => !search || n.toLowerCase().includes(search.toLowerCase()));
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const toggle = (name) => onChange(selectedSet.has(name) ? selected.filter(n => n !== name) : [...selected, name]);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, flex: 1 }}>
      {selected.map(name => (
        <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--neutral-400)', background: 'var(--neutral-50)', padding: '2px 8px', borderRadius: 4, border: '0.5px solid var(--neutral-100)' }}>
          <Avatar variant="assignee" initials={getInitials(name).toUpperCase()} /> {name}
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => toggle(name)}>
            <Icon name="solar:close-linear" size={10} color="var(--neutral-300)" />
          </button>
        </span>
      ))}
      <div style={{ position: 'relative' }}>
        <button ref={btnRef} className={styles.detailValuePlaceholder} onClick={() => setOpen(v => !v)} style={{ fontSize: 13 }}>
          <Icon name="solar:add-circle-linear" size={14} color="var(--primary-300)" /> {selected.length === 0 ? 'Select Secondary Users' : 'Add More'}
        </button>
        {open && createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)}>
            <div className={styles.providerDropdown} style={{ position: 'fixed', top: btnRef.current?.getBoundingClientRect().bottom + 4, left: btnRef.current?.getBoundingClientRect().left, zIndex: 9999 }} onClick={e => e.stopPropagation()}>
              <div className={styles.apptSearchWrap}><Icon name="solar:magnifer-linear" size={14} color="var(--neutral-200)" /><input className={styles.apptSearchInput} placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} autoFocus /></div>
              {filtered.map(name => (
                <button key={name} className={styles.providerItem} onClick={() => toggle(name)} style={{ background: selectedSet.has(name) ? 'var(--primary-25)' : undefined }}>
                  <input type="checkbox" checked={selectedSet.has(name)} readOnly style={{ accentColor: 'var(--primary-300)', width: 15, height: 15 }} />
                  <Avatar variant="assignee" initials={getInitials(name).toUpperCase()} />
                  <span style={{ fontSize: 14, color: 'var(--neutral-400)' }}>{name}</span>
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}

/* ── Date Picker (simple calendar) ── */
function DatePicker({ value, onSelect }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const btnRef = useRef(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div style={{ position: 'relative' }}>
      {value ? (
        <button ref={btnRef} className={styles.detailValue} onClick={() => setOpen(v => !v)} style={{ cursor: 'pointer' }}><Icon name="solar:calendar-linear" size={16} color="var(--neutral-300)" /> {value}</button>
      ) : (
        <button ref={btnRef} className={styles.detailValuePlaceholder} onClick={() => setOpen(v => !v)}><Icon name="solar:calendar-linear" size={16} color="var(--neutral-200)" /> Select Date</button>
      )}
      {open && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)}>
          <div className={styles.calendarDropdown} style={{ position: 'fixed', top: btnRef.current?.getBoundingClientRect().bottom + 4, left: btnRef.current?.getBoundingClientRect().left, zIndex: 9999 }} onClick={e => e.stopPropagation()}>
            <div className={styles.calendarHeader}>
              <ActionButton icon="solar:alt-arrow-left-linear" size="S" onClick={() => setViewDate(new Date(year, month - 1, 1))} />
              <span className={styles.calendarTitle}>{MONTH_NAMES[month]} {year}</span>
              <ActionButton icon="solar:alt-arrow-right-linear" size="S" onClick={() => setViewDate(new Date(year, month + 1, 1))} />
            </div>
            <div className={styles.calendarGrid}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className={styles.calendarDayLabel}>{d}</div>)}
              {days.map((d, i) => d ? (
                <button key={i} className={styles.calendarDay} onClick={() => { onSelect(`${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}-${year}`); setOpen(false); }}>{d}</button>
              ) : <div key={i} />)}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

const APPOINTMENT_STATUSES = ['Booked', 'Cancelled', 'No Show', 'Checked In'];

/* ── Main Drawer ── */
// Inline SVG for the Add Staff Instruction icon
const StaffInstructionIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.83 3.38L12.49 3.75L12.83 3.38ZM16.13 6.35L15.79 6.72L16.13 6.35ZM18.05 8.46L17.59 8.66L18.05 8.46ZM2.64 17.36L3 17L2.64 17.36ZM17.36 17.36L17 17L17.36 17.36ZM4.58 13.25C4.31 13.25 4.08 13.47 4.08 13.75C4.08 14.03 4.31 14.25 4.58 14.25V13.25ZM7.92 14.25C8.19 14.25 8.42 14.03 8.42 13.75C8.42 13.47 8.19 13.25 7.92 13.25V14.25ZM5.75 15.416C5.75 15.69 5.97 15.916 6.25 15.916C6.53 15.916 6.75 15.69 6.75 15.416H5.75ZM6.75 12.08C6.75 11.81 6.53 11.58 6.25 11.58C5.97 11.58 5.75 11.81 5.75 12.08H6.75ZM11.667 18.33V17.83H8.33V18.83H11.667V18.33ZM1.67 11.666H2.17V8.33H1.17V11.666H1.67ZM18.33 11.3H17.83V11.666H18.83V11.3H18.33ZM12.49 3.75L15.79 6.72L16.46 5.97L13.16 3.01L12.49 3.75ZM18.83 11.3C18.83 9.88 18.84 9.02 18.5 8.26L17.59 8.66C17.82 9.19 17.83 9.8 17.83 11.3H18.83ZM15.79 6.72C16.91 7.73 17.35 8.14 17.59 8.66L18.5 8.26C18.16 7.49 17.52 6.92 16.46 5.97L15.79 6.72ZM8.36 2.17C9.67 2.17 10.19 2.17 10.66 2.35L11.02 1.42C10.34 1.16 9.59 1.17 8.36 1.17V2.17ZM13.16 3.01C12.25 2.18 11.7 1.68 11.02 1.42L10.66 2.35C11.13 2.53 11.53 2.88 12.49 3.75L13.16 3.01ZM8.33 17.83C6.75 17.83 5.61 17.83 4.74 17.72C3.89 17.6 3.38 17.38 3 17L2.29 17.71C2.89 18.31 3.65 18.58 4.61 18.71C5.56 18.83 6.78 18.83 8.33 18.83V17.83ZM1.17 11.666C1.17 13.22 1.17 14.44 1.29 15.39C1.42 16.35 1.69 17.11 2.29 17.71L3 17C2.62 16.623 2.4 16.11 2.28 15.257C2.17 14.39 2.17 13.25 2.17 11.666H1.17ZM11.667 18.83C13.22 18.83 14.44 18.83 15.39 18.71C16.35 18.58 17.11 18.31 17.71 17.71L17 17C16.624 17.38 16.11 17.6 15.26 17.72C14.39 17.83 13.25 17.83 11.667 17.83V18.83ZM18.83 11.666C18.83 13.25 18.83 14.39 17.72 15.257C17.6 16.11 17.38 16.623 17 17L17.71 17.71C18.31 17.11 18.58 16.35 18.71 15.39C18.83 14.44 18.83 13.22 18.83 11.666H18.83ZM2.17 8.33C2.17 6.75 2.17 5.61 2.28 4.74C2.4 3.89 2.62 3.38 3 3L2.29 2.29C1.69 2.89 1.42 3.65 1.29 4.61C1.17 5.56 1.17 6.78 1.17 8.33H2.17ZM8.36 1.17C6.79 1.17 5.57 1.16 4.62 1.29C3.65 1.42 2.89 1.69 2.29 2.29L3 3C3.38 2.62 3.89 2.4 4.75 2.28C5.62 2.17 6.76 2.17 8.36 2.17V1.17ZM10.33 2.08V4.17H11.33V2.08H10.33ZM15 8.83H17.98V7.83H15V8.83ZM10.33 4.17C10.33 5.13 10.33 5.91 10.41 6.52C10.5 7.14 10.68 7.66 11.09 8.08L11.8 7.37C11.6 7.17 11.47 6.9 11.41 6.39C11.33 5.86 11.33 5.16 11.33 4.17H10.33ZM15 7.83C14 7.83 13.31 7.83 12.781 7.76C12.27 7.69 11.99 7.57 11.8 7.37L11.09 8.08C11.5 8.49 12.025 8.67 12.65 8.75C13.26 8.83 14.03 8.83 15 8.83V7.83ZM4.58 14.25H7.92V13.25H4.58V14.25ZM6.75 15.416V13.75H5.75V15.416H6.75ZM6.75 13.75V12.08H5.75V13.75H6.75Z" fill="currentColor"/>
  </svg>
);

export function ScheduleDrawer({ onClose, selectedSlot, onSave, existingAppointment, timezoneLabel = 'GMT', initialPatientId }) {
  const isViewMode = !!existingAppointment;
  const patients = useAppStore(s => s.patients);
  const fetchPatients = useAppStore(s => s.fetchPatients);
  const showToast = useAppStore(s => s.showToast);
  const createAppointment = useAppStore(s => s.createAppointment);
  const updateAppointment = useAppStore(s => s.updateAppointment);
  const storeApptTypes = useAppStore(s => s.appointmentTypes);
  const fetchAppointmentTypes = useAppStore(s => s.fetchAppointmentTypes);

  // Use DB types, fall back to hardcoded
  const appointmentTypes = storeApptTypes.length > 0 ? storeApptTypes : FALLBACK_APPOINTMENT_TYPES;

  // Ensure patients and appointment types are loaded — only fetch when
  // empty. Unconditionally calling fetchPatients() flips patientsLoading
  // true in the store, which unmounts the worklist behind the drawer and
  // shows its skeleton (looks like the worklist "reloads" every time the
  // Schedule button is clicked). Skip when we already have the data.
  useEffect(() => {
    if (fetchPatients && patients.length === 0) fetchPatients();
    if (fetchAppointmentTypes && storeApptTypes.length === 0) fetchAppointmentTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-fill patient when initialPatientId is provided
  useEffect(() => {
    if (!initialPatientId || !patients.length) return;
    const match = patients.find(p => p.id === initialPatientId);
    if (match) setSelectedPatient(match);
  }, [initialPatientId, patients]);

  // Derive initial date/time from selectedSlot (Temporal.ZonedDateTime)
  const initialDate = (() => {
    if (!selectedSlot?.month) return '';
    const m = String(selectedSlot.month).padStart(2, '0');
    const d = String(selectedSlot.day).padStart(2, '0');
    return `${m}-${d}-${selectedSlot.year}`;
  })();

  const initialTime = (() => {
    if (!selectedSlot?.hour && selectedSlot?.hour !== 0) return '';
    const h = selectedSlot.hour;
    const min = String(selectedSlot.minute || 0).padStart(2, '0');
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${min} ${ampm}`;
  })();

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [appointmentType, setAppointmentType] = useState(null);
  const [mode, setMode] = useState('');
  const [location, setLocation] = useState('');
  const [provider, setProvider] = useState('');
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [recurring, setRecurring] = useState(false);
  const [recurFrequency, setRecurFrequency] = useState(1);
  const [recurUnit, setRecurUnit] = useState('Week(s)');
  const [recurDays, setRecurDays] = useState([]);
  const [recurEndDate, setRecurEndDate] = useState('');
  const [recurConfirmed, setRecurConfirmed] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPickTime, setShowPickTime] = useState(false);
  const [customTime, setCustomTime] = useState('');
  const timeBtnRef = useRef(null);
  const [requireRsvp, setRequireRsvp] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);
  const [secondaryUsers, setSecondaryUsers] = useState([]);
  const [profileUsers, setProfileUsers] = useState([]);
  const memberInstructionRef = useRef('');
  const [showStaffInstructions, setShowStaffInstructions] = useState(false);
  const staffInstructionRef = useRef('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const rawStatus = existingAppointment?.status;
  const [apptStatus, setApptStatus] = useState(rawStatus === 'Scheduled' ? 'Booked' : (rawStatus || 'Booked'));
  const [editingInstruction, setEditingInstruction] = useState(false);
  const [instructionDraft, setInstructionDraft] = useState(existingAppointment?.member_instruction || '');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef(null);
  const deleteAppointment = useAppStore(s => s.deleteAppointment);
  const [showViewStaffInstructions, setShowViewStaffInstructions] = useState(!!existingAppointment?.staff_instruction);
  const [editingStaffInstruction, setEditingStaffInstruction] = useState(false);
  const [staffInstructionDraft, setStaffInstructionDraft] = useState(existingAppointment?.staff_instruction || '');

  // Fetch staff users from profiles DB
  useEffect(() => {
    supabase.from('profiles').select('id, full_name, first_name, last_name, email, status').order('full_name').then(({ data }) => {
      if (!data) return;
      const users = [];
      for (const u of data) {
        if (u.status !== 'Active') continue;
        users.push({
          name: u.full_name?.trim() || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
          email: u.email,
        });
      }
      setProfileUsers(users);
    });
  }, []);

  // Auto-fill mode and location when appointment type is selected
  useEffect(() => {
    if (appointmentType) {
      setMode(appointmentType.mode === 'Virtual' ? 'Virtual' : 'At Clinic');
      setLocation(LOCATION_OPTIONS[0]);
    }
  }, [appointmentType]);

  const canSchedule = selectedPatient && appointmentType;

  const handleSchedule = async () => {
    // Compute end time (+30 min)
    const computeEndTime = (t) => {
      const match = t.match(/(\d+):(\d+)\s*(am|pm)/i);
      if (!match) return t;
      const [, h, m, p] = match;
      const mins = (parseInt(m) || 0) + 30;
      return mins >= 60
        ? `${(parseInt(h) || 0) + 1}:${String(mins - 60).padStart(2, '0')} ${p}`
        : `${h}:${String(mins).padStart(2, '0')} ${p}`;
    };

    // Derive calendar_id from appointment type color
    const colorToCalId = { '#D9A50B': 'awv', '#8C5AE2': 'followup', '#009B53': 'specialty', '#145ECC': 'telehealth' };
    const calId = appointmentType ? (colorToCalId[appointmentType.color] || 'followup') : 'followup';

    const row = {
      patient_id: selectedPatient?.id || null,
      patient_name: selectedPatient?.name || '',
      appointment_type_id: appointmentType?.id ?? null,
      appointment_type_name: appointmentType?.name || '',
      mode,
      location,
      primary_user: provider,
      secondary_users: secondaryUsers,
      date,
      time_start: time,
      time_end: time ? computeEndTime(time) : '',
      reason_for_visit: reasonForVisit,
      member_instruction: memberInstructionRef.current,
      staff_instruction: staffInstructionRef.current,
      require_rsvp: requireRsvp,
      recurring,
      recurring_config: recurring ? JSON.stringify({ frequency: recurFrequency, unit: recurUnit, days: recurDays, endDate: recurEndDate }) : null,
      status: 'Scheduled',
      calendar_id: calId,
    };

    const result = await createAppointment(row);
    if (result) {
      // Pass the created row so non-store surfaces (e.g. a program's
      // appointments list) can mirror it into their own view.
      if (onSave) onSave(row);
      setBookingSuccess(true);
      setTimeout(() => onClose(), 2000);
    } else {
      showToast('Failed to save appointment');
    }
  };

  const handleStatusChange = async (newStatus) => {
    setApptStatus(newStatus);
    if (existingAppointment?.id) {
      await updateAppointment(existingAppointment.id, { status: newStatus });
      if (onSave) onSave();
    }
  };

  const handleSaveInstruction = async () => {
    if (existingAppointment?.id) {
      await updateAppointment(existingAppointment.id, { member_instruction: instructionDraft });
      if (onSave) onSave();
    }
    setEditingInstruction(false);
  };

  const handleSaveStaffInstruction = async () => {
    if (existingAppointment?.id) {
      await updateAppointment(existingAppointment.id, { staff_instruction: staffInstructionDraft });
      if (onSave) onSave();
    }
    setEditingStaffInstruction(false);
  };

  const handleDeleteAppointment = async () => {
    if (existingAppointment?.id) {
      await deleteAppointment(existingAppointment.id);
      if (onSave) onSave();
      showToast('Appointment deleted');
      onClose();
    }
  };

  // Determine if appointment is in the past (read-only)
  const isPastAppointment = (() => {
    if (!existingAppointment?.date) return false;
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const [mo, dd, yyyy] = existingAppointment.date.split('-');
    const apptDate = `${yyyy}-${mo}-${dd}`;
    return apptDate < today;
  })();


  // ── View Mode: Appointment Details ──
  if (isViewMode) {
    const ea = existingAppointment;
    // Resolve appointment type color from DB types
    const matchedType = appointmentTypes.find(t => t.name === ea.appointment_type_name);
    const apptTypeColor = matchedType?.color || ea.appointment_type_name?.includes('Wellness') ? '#D9A50B' : '#8C5AE2';
    const apptTypeForPicker = appointmentType || (ea.appointment_type_name ? { name: ea.appointment_type_name, color: matchedType?.color || apptTypeColor, id: matchedType?.id } : null);

    return (
      <Drawer title="Appointment Details" onClose={onClose} bodyClassName={styles.drawerBody}>
        <div className={styles.content} style={{ gap: 16 }}>
          {/* Status bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--neutral-50)', borderRadius: 8, padding: 8 }}>
            <div style={{ flex: 1 }}>
              <Select
                style={{ width: 120 }}
                options={APPOINTMENT_STATUSES.map(s => ({ value: s, label: s }))}
                value={apptStatus}
                onChange={handleStatusChange}
                disabled={isPastAppointment}
              />
            </div>
            <ActionButton icon="solar:paperclip-linear" size="L" tooltip="Attach" />
            <span style={{ width: 0.5, height: 16, background: 'var(--neutral-150)', flexShrink: 0 }} />
            {!showViewStaffInstructions && (
              <ActionButton size="L" tooltip="Add Staff Instructions" onClick={() => setShowViewStaffInstructions(true)}>
                <StaffInstructionIcon />
              </ActionButton>
            )}
            {!showViewStaffInstructions && <span style={{ width: 0.5, height: 16, background: 'var(--neutral-150)', flexShrink: 0 }} />}
            <div style={{ position: 'relative' }} ref={moreMenuRef}>
              <ActionButton icon="solar:menu-dots-bold" size="L" tooltip="More" onClick={() => setShowMoreMenu(v => !v)} />
              {showMoreMenu && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setShowMoreMenu(false)} />
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 9999, background: 'var(--neutral-0)', border: '0.5px solid var(--neutral-100)', borderRadius: 8, boxShadow: '0 4px 24px -4px rgba(0,0,0,0.12)', padding: 8, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button onClick={() => { showToast('Booking link copied!'); setShowMoreMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--neutral-400)', fontFamily: 'Inter, sans-serif', width: '100%', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--neutral-50)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <Icon name="solar:link-linear" size={16} color="var(--neutral-300)" /> Send Booking Link
                    </button>
                    <button onClick={() => { setShowMoreMenu(false); handleDeleteAppointment(); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--status-error, #D72825)', fontFamily: 'Inter, sans-serif', width: '100%', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--neutral-50)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <Icon name="solar:trash-bin-minimalistic-linear" size={16} color="var(--status-error, #D72825)" /> Delete Appointment
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Patient Details */}
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Patient Details</label>
            <div className={styles.patientCard}>
              <div className={styles.patientCardHeader}>
                <Avatar variant="patient" initials={getInitials(ea.patient_name).toUpperCase()} />
                <div className={styles.patientCardInfo}>
                  <div className={styles.patientCardName}>{ea.patient_name || 'Unknown'}</div>
                  <div className={styles.patientCardMeta}>
                    <span style={{ color: '#D72825', fontWeight: 500 }}>RAF Score: 3.5</span>{' '}
                    <span style={{ color: '#009B53', display: 'inline-flex', alignItems: 'center', gap: 2 }}>+0.5 <Icon name="solar:arrow-up-linear" size={10} color="#009B53" /></span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <ActionButton icon="solar:phone-linear" size="L" tooltip="Call" />
                  <span style={{ width: 0.5, height: 16, background: 'var(--neutral-150)', flexShrink: 0 }} />
                  <ActionButton icon="solar:chat-round-line-linear" size="L" tooltip="Chat" />
                  <span style={{ width: 0.5, height: 16, background: 'var(--neutral-150)', flexShrink: 0 }} />
                  <ActionButton icon="solar:menu-dots-bold" size="L" tooltip="More" />
                </div>
              </div>
              {ea.reason_for_visit && (
                <div className={styles.reasonField} style={{ pointerEvents: 'none' }}>
                  <label className={styles.reasonLabel}>Reason for Visit</label>
                  <div className={styles.reasonInput} style={{ background: 'var(--neutral-50)', minHeight: 32 }}>{ea.reason_for_visit}</div>
                </div>
              )}
              <div className={styles.patientInfoGrid}>
                <div className={styles.patientInfoRow}>
                  <span className={styles.patientInfoLabel} style={{ fontSize: 14, fontWeight: 500 }}>Patient Location</span>
                  <span className={styles.patientInfoValue} style={{ fontSize: 14 }}>{ea.location || 'New York'}</span>
                </div>
                <div className={styles.patientInfoRow}>
                  <span className={styles.patientInfoLabel} style={{ fontSize: 14, fontWeight: 500 }}>Last Appointment</span>
                  <span className={styles.patientInfoValue} style={{ fontSize: 14 }}>07-26-2023 with Katherine Moss <button className={styles.viewDetailsLink}>View Details</button></span>
                </div>
              </div>
            </div>
          </div>

          {/* Appointment Details — editable pickers (except patient); read-only for past */}
          <div className={styles.section} style={isPastAppointment ? { pointerEvents: 'none', opacity: 0.7 } : undefined}>
            <label className={styles.sectionLabel}>Appointment Details {isPastAppointment && <span style={{ fontSize: 11, color: 'var(--neutral-200)', fontWeight: 400 }}>(Past — read only)</span>}</label>
            <div className={styles.detailsCard}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Appointment Type</span>
                <AppointmentTypePicker value={apptTypeForPicker} onSelect={(v) => { setAppointmentType(v); if (v && ea.id) updateAppointment(ea.id, { appointment_type_name: v.name, appointment_type_id: v.id || null }); }} appointmentTypes={appointmentTypes} />
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Mode of Appointment</span>
                <DetailDropdown value={mode || ea.mode} placeholder="Select Mode" icon={mode === 'Virtual' || ea.mode === 'Virtual' ? 'solar:monitor-linear' : 'solar:buildings-linear'} options={MODE_OPTIONS.map(m => ({ label: m.label, icon: m.icon }))} onSelect={v => { setMode(v); if (ea.id) updateAppointment(ea.id, { mode: v }); }} renderItem={(opt) => <><Icon name={opt.icon} size={16} color="var(--neutral-300)" /> {opt.label}</>} />
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Location</span>
                <DetailDropdown value={location || ea.location} placeholder="Select Location" icon="solar:map-point-linear" options={LOCATION_OPTIONS.map(l => ({ label: l }))} onSelect={v => { setLocation(v); if (ea.id) updateAppointment(ea.id, { location: v }); }} />
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Primary User</span>
                <ProviderPicker value={provider || ea.primary_user} onSelect={v => { setProvider(v); if (ea.id) updateAppointment(ea.id, { primary_user: v }); }} profileUsers={profileUsers} onAddSecondary={() => setShowSecondary(true)} />
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Date</span>
                <DatePicker value={date || ea.date} onSelect={v => { setDate(v); if (ea.id) updateAppointment(ea.id, { date: v }); }} />
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Time</span>
                <span className={styles.detailValue}><Icon name="solar:clock-circle-linear" size={16} color="var(--neutral-300)" /> {ea.time_start || '—'} - {ea.time_end || '—'} ({timezoneLabel})</span>
              </div>
            </div>
          </div>

          {/* Member Instruction — rich text editor with save/discard */}
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Member Instruction</label>
            {editingInstruction ? (
              <div className={styles.instructionEditor}>
                <div
                  className={styles.instructionEditable}
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: instructionDraft }}
                  onInput={e => setInstructionDraft(e.currentTarget.innerHTML)}
                />
                <div className={styles.instructionToolbar}>
                  <ActionButton icon="solar:paperclip-linear" size="S" tooltip="Attach" />
                  <span className={styles.toolbarDivider} />
                  <ActionButton icon="solar:text-bold-linear" size="S" tooltip="Bold" onClick={() => document.execCommand('bold')} />
                  <ActionButton icon="solar:text-italic-linear" size="S" tooltip="Italic" onClick={() => document.execCommand('italic')} />
                  <ActionButton icon="solar:text-underline-linear" size="S" tooltip="Underline" onClick={() => document.execCommand('underline')} />
                  <span className={styles.toolbarDivider} />
                  <ActionButton icon="solar:text-field-linear" size="S" tooltip="Heading" onClick={() => document.execCommand('formatBlock', false, 'h3')} />
                  <ActionButton icon="solar:list-linear" size="S" tooltip="List" onClick={() => document.execCommand('insertUnorderedList')} />
                  <div style={{ flex: 1 }} />
                  <ActionButton icon="solar:close-linear" size="S" tooltip="Discard" state="error" onClick={() => { setInstructionDraft(ea.member_instruction || ''); setEditingInstruction(false); }} />
                  <ActionButton icon="solar:check-read-linear" size="S" tooltip="Save" onClick={handleSaveInstruction} />
                </div>
              </div>
            ) : (
              <div
                onClick={() => setEditingInstruction(true)}
                style={{ border: '0.5px solid var(--neutral-150)', borderRadius: 4, padding: 8, fontSize: 14, color: ea.member_instruction ? 'var(--neutral-400)' : 'var(--neutral-200)', fontFamily: 'Inter, sans-serif', lineHeight: 1.4, background: 'var(--neutral-50)', cursor: 'pointer', minHeight: 36 }}
              >
                {ea.member_instruction || 'Click to add instructions...'}
              </div>
            )}
          </div>

          {/* Staff Instructions — only shown when action button is clicked */}
          {showViewStaffInstructions && (
            <div className={styles.section}>
              <label className={styles.sectionLabel}>Staff Instructions</label>
              {editingStaffInstruction ? (
                <div className={styles.instructionEditor}>
                  <div
                    className={styles.instructionEditable}
                    contentEditable
                    suppressContentEditableWarning
                    dangerouslySetInnerHTML={{ __html: staffInstructionDraft }}
                    onInput={e => setStaffInstructionDraft(e.currentTarget.innerHTML)}
                  />
                  <div className={styles.instructionToolbar}>
                    <ActionButton icon="solar:paperclip-linear" size="S" tooltip="Attach" />
                    <span className={styles.toolbarDivider} />
                    <ActionButton icon="solar:text-bold-linear" size="S" tooltip="Bold" onClick={() => document.execCommand('bold')} />
                    <ActionButton icon="solar:text-italic-linear" size="S" tooltip="Italic" onClick={() => document.execCommand('italic')} />
                    <ActionButton icon="solar:text-underline-linear" size="S" tooltip="Underline" onClick={() => document.execCommand('underline')} />
                    <span className={styles.toolbarDivider} />
                    <ActionButton icon="solar:text-field-linear" size="S" tooltip="Heading" onClick={() => document.execCommand('formatBlock', false, 'h3')} />
                    <ActionButton icon="solar:list-linear" size="S" tooltip="List" onClick={() => document.execCommand('insertUnorderedList')} />
                    <div style={{ flex: 1 }} />
                    <ActionButton icon="solar:trash-bin-minimalistic-linear" size="S" tooltip="Remove" state="error" onClick={() => { setShowViewStaffInstructions(false); setStaffInstructionDraft(''); if (ea.id) updateAppointment(ea.id, { staff_instruction: '' }); }} />
                    <ActionButton icon="solar:close-linear" size="S" tooltip="Discard" state="error" onClick={() => { setStaffInstructionDraft(ea.staff_instruction || ''); setEditingStaffInstruction(false); }} />
                    <ActionButton icon="solar:check-read-linear" size="S" tooltip="Save" onClick={handleSaveStaffInstruction} />
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setEditingStaffInstruction(true)}
                  style={{ border: '0.5px solid var(--neutral-150)', borderRadius: 4, padding: 8, fontSize: 14, color: ea.staff_instruction ? 'var(--neutral-400)' : 'var(--neutral-200)', fontFamily: 'Inter, sans-serif', lineHeight: 1.4, background: 'var(--neutral-50)', cursor: 'pointer', minHeight: 36 }}
                >
                  {ea.staff_instruction || 'Click to add staff instructions...'}
                </div>
              )}
            </div>
          )}
        </div>
      </Drawer>
    );
  }

  // ── Booking Success Screen ──
  if (bookingSuccess) {
    return (
      <Drawer title="Schedule Appointment" onClose={onClose} bodyClassName={styles.drawerBody}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 24, padding: '120px 0' }}>
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="36" stroke="#009B53" strokeWidth="4" fill="none" />
            <path d="M24 40L36 52L56 28" stroke="#009B53" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <span style={{ fontSize: 24, fontWeight: 500, color: 'var(--neutral-400)', fontFamily: 'Inter, sans-serif' }}>Appointment Booked Successfully</span>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer title="Schedule Appointment" onClose={onClose} noCloseDivider headerRight={
      <>
        <Button variant="primary" size="L" disabled={!canSchedule} onClick={handleSchedule}>Schedule</Button>
        <span className={styles.headerDivider} />
      </>
    } bodyClassName={styles.drawerBody}>
      <div className={styles.content}>
        {/* Patient Selection */}
        {!selectedPatient ? (
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Patient/Prospect <span className={styles.required}>*</span></label>
            <PatientSearch patients={patients} onSelect={setSelectedPatient} />
          </div>
        ) : (
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Patient Details</label>
            <div className={styles.patientCard}>
              <div className={styles.patientCardHeader}>
                <Avatar variant="patient" initials={getInitials(selectedPatient.name).toUpperCase()} />
                <div className={styles.patientCardInfo}>
                  <div className={styles.patientCardName}>{selectedPatient.name}</div>
                  <div className={styles.patientCardMeta}>
                    {selectedPatient.gender?.[0] || 'M'} &bull; {selectedPatient.age || '62'}Y ({selectedPatient.dob || '03/29/1961'}) &bull;{' '}
                    <span style={{ color: '#D72825', fontWeight: 500 }}>RAF Score: {selectedPatient.laceScore || '3.5'}</span>{' '}
                    <span style={{ color: '#009B53', display: 'inline-flex', alignItems: 'center', gap: 2 }}>+0.5 <Icon name="solar:arrow-up-linear" size={10} color="#009B53" /></span>
                  </div>
                </div>
                <ActionButton icon="solar:close-linear" size="S" tooltip="Remove" onClick={() => setSelectedPatient(null)} />
              </div>

              {/* Reason for Visit — always editable */}
              <div className={styles.reasonField}>
                <label className={styles.reasonLabel}>Reason for Visit</label>
                <input
                  className={styles.reasonInput}
                  placeholder="Enter Reason for Visit"
                  value={reasonForVisit}
                  onChange={e => setReasonForVisit(e.target.value)}
                />
              </div>

              {/* Patient Info */}
              <div className={styles.patientInfoGrid}>
                <div className={styles.patientInfoRow}>
                  <span className={styles.patientInfoLabel}>Patient Location</span>
                  <span className={styles.patientInfoValue}>{selectedPatient.facility || 'New York'}</span>
                </div>
                <div className={styles.patientInfoRow}>
                  <span className={styles.patientInfoLabel}>Last Appointment</span>
                  <span className={styles.patientInfoValue}>
                    07-26-2023 with Katherine Moss{' '}
                    <button className={styles.viewDetailsLink}>View Details</button>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Appointment Details */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>Appointment Details</label>
          <div className={styles.detailsCard}>
            {/* Appointment Type */}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Appointment Type</span>
              <AppointmentTypePicker value={appointmentType} onSelect={setAppointmentType} appointmentTypes={appointmentTypes} />
            </div>

            {/* Mode of Appointment — dropdown */}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Mode of Appointment</span>
              <DetailDropdown
                value={mode}
                placeholder="Select Mode of Appointment"
                icon="solar:monitor-linear"
                options={MODE_OPTIONS.map(m => ({ label: m.label, icon: m.icon }))}
                onSelect={v => setMode(v)}
                renderItem={(opt) => <><Icon name={opt.icon} size={16} color="var(--neutral-300)" /> {opt.label}</>}
              />
            </div>

            {/* Location — dropdown */}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Location</span>
              <DetailDropdown
                value={location}
                placeholder="Select Location"
                icon="solar:map-point-linear"
                options={LOCATION_OPTIONS.map(l => ({ label: l }))}
                onSelect={v => setLocation(v)}
              />
            </div>

            {/* Primary User — dropdown with search, avatar, slots */}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Primary User</span>
              <ProviderPicker value={provider} onSelect={setProvider} profileUsers={profileUsers} onAddSecondary={() => setShowSecondary(true)} />
            </div>

            {/* Secondary Users */}
            {showSecondary && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Secondary User</span>
                <SecondaryUserPicker selected={secondaryUsers} onChange={setSecondaryUsers} profileUsers={profileUsers} primary={provider} />
              </div>
            )}

            {/* Date — calendar picker */}
            <div className={styles.detailRowTop}>
              <span className={styles.detailLabel}>Date</span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <DatePicker value={date} onSelect={setDate} />
                  {date && (
                    <div className={styles.recurringToggle}>
                      <Switch checked={recurring} onChange={v => { setRecurring(v); setRecurConfirmed(false); }} label="Set Recurring" />
                    </div>
                  )}
                </div>
                {/* Recurring configuration */}
                {date && recurring && !recurConfirmed && (
                  <div style={{ border: '0.5px solid var(--neutral-150)', borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, color: 'var(--neutral-300)' }}>Repeats every</span>
                      <input type="number" min={1} max={30} value={recurFrequency} onChange={e => setRecurFrequency(parseInt(e.target.value) || 1)} style={{ width: 50, height: 28, border: '0.5px solid var(--neutral-200)', borderRadius: 4, textAlign: 'center', fontSize: 14, fontFamily: 'Inter, sans-serif', color: 'var(--neutral-400)', padding: '0 8px' }} />
                      <select value={recurUnit} onChange={e => { setRecurUnit(e.target.value); if (e.target.value === 'Day(s)') setRecurDays([]); }} style={{ height: 28, border: '0.5px solid var(--neutral-200)', borderRadius: 4, fontSize: 14, fontFamily: 'Inter, sans-serif', color: 'var(--neutral-400)', padding: '0 8px', background: 'var(--neutral-0)' }}>
                        <option value="Day(s)">Day/s</option>
                        <option value="Week(s)">Week/s</option>
                      </select>
                      {recurUnit === 'Week(s)' && <span style={{ fontSize: 14, color: 'var(--neutral-300)' }}>on</span>}
                      {recurUnit === 'Week(s)' && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[{ key: 'Sun', label: 'S' }, { key: 'Mon', label: 'M' }, { key: 'Tue', label: 'T' }, { key: 'Wed', label: 'W' }, { key: 'Thu', label: 'T' }, { key: 'Fri', label: 'F' }, { key: 'Sat', label: 'S' }].map(d => (
                            <button key={d.key} onClick={() => setRecurDays(prev => prev.includes(d.key) ? prev.filter(x => x !== d.key) : [...prev, d.key])} style={{ width: 24, height: 24, border: 'none', borderRadius: 4, fontSize: 12, fontFamily: 'Inter, sans-serif', color: recurDays.includes(d.key) ? 'var(--neutral-0)' : 'var(--neutral-300)', background: recurDays.includes(d.key) ? 'var(--primary-300)' : 'var(--neutral-0)', cursor: 'pointer', fontWeight: 500, boxShadow: recurDays.includes(d.key) ? 'none' : 'inset 0 0 0 0.5px var(--neutral-200)' }}>
                              {d.label}
                            </button>
                          ))}
                        </div>
                      )}
                      <span style={{ fontSize: 14, color: 'var(--neutral-300)' }}>Until</span>
                      <input type="date" value={recurEndDate} onChange={e => setRecurEndDate(e.target.value)} style={{ height: 28, border: '0.5px solid var(--neutral-200)', borderRadius: 4, fontSize: 14, fontFamily: 'Inter, sans-serif', color: 'var(--neutral-400)', padding: '0 8px', width: 120 }} />
                    </div>
                    <button onClick={() => setRecurConfirmed(true)} style={{ alignSelf: 'flex-start', fontSize: 12, color: 'var(--primary-300)', background: 'var(--primary-50)', border: '0.5px solid var(--primary-200)', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>Confirm</button>
                  </div>
                )}
                {/* Recurring confirmed summary */}
                {date && recurring && recurConfirmed && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, color: 'var(--neutral-300)', fontFamily: 'Inter, sans-serif' }}>
                      Repeats every {recurFrequency} {recurUnit.toLowerCase()}{recurUnit === 'Week(s)' && recurDays.length > 0 ? ` on ${recurDays.join(' and ')}` : ''}{recurEndDate ? ` until ${recurEndDate}` : ''}
                    </span>
                    <button onClick={() => setRecurConfirmed(false)} style={{ fontSize: 11, color: 'var(--primary-300)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', textDecoration: 'underline' }}>Edit</button>
                  </div>
                )}
              </div>
            </div>

            {/* Time — inline after selection, slot picker when choosing */}
            {date && (
              <div className={styles.detailRowTop}>
                <span className={styles.detailLabel}>Time</span>
                <div style={{ flex: 1 }}>
                  <button ref={timeBtnRef} className={time ? styles.detailValue : styles.detailValuePlaceholder} onClick={() => setShowTimePicker(v => !v)} style={{ cursor: 'pointer' }}>
                    <Icon name="solar:clock-circle-linear" size={16} color={time ? 'var(--neutral-300)' : 'var(--neutral-200)'} />
                    {time ? (
                      <>{time} - {(() => { const [h, m, p] = time.match(/(\d+):(\d+)\s*(am|pm)/i)?.slice(1) || []; const mins = (parseInt(m) || 0) + 30; return mins >= 60 ? `${(parseInt(h) || 0) + 1}:${String(mins - 60).padStart(2, '0')} ${p}` : `${h}:${String(mins).padStart(2, '0')} ${p}`; })()} ({timezoneLabel})</>
                    ) : 'Select Time'}
                  </button>
                  {showTimePicker && (
                    <div className={styles.timeSlotDropdown} style={{ position: 'relative', marginTop: 8 }}>
                      <div className={styles.timeSlotHeader}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-200)' }}>Available Slots (30 mins)</span>
                        <div style={{ flex: 1 }} />
                        <button onClick={() => setShowPickTime(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--primary-300)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                          <Icon name="solar:clock-circle-linear" size={12} color="var(--primary-300)" /> Pick Time
                        </button>
                        <span style={{ width: 0.5, height: 16, background: 'var(--neutral-150)', flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: 'var(--neutral-300)', background: 'var(--neutral-50)', padding: '2px 8px', borderRadius: 4, border: '0.5px solid var(--neutral-100)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Icon name="solar:global-linear" size={10} color="var(--neutral-300)" />
                          {timezoneLabel}
                        </span>
                      </div>
                      {showPickTime ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="time" value={customTime} onChange={e => setCustomTime(e.target.value)} style={{ height: 32, border: '0.5px solid var(--neutral-200)', borderRadius: 4, fontSize: 14, fontFamily: 'Inter, sans-serif', color: 'var(--neutral-400)', padding: '0 8px' }} autoFocus />
                          <button onClick={() => { if (customTime) { const [hh, mm] = customTime.split(':').map(Number); const ampm = hh >= 12 ? 'pm' : 'am'; const h12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh; setTime(`${h12}:${String(mm).padStart(2, '0')} ${ampm}`); setShowTimePicker(false); setShowPickTime(false); } }} style={{ fontSize: 12, color: 'var(--primary-300)', background: 'var(--primary-50)', border: '0.5px solid var(--primary-200)', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>Set</button>
                          <button onClick={() => setShowPickTime(false)} style={{ fontSize: 12, color: 'var(--neutral-300)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Cancel</button>
                        </div>
                      ) : (
                        <div className={styles.timeSlots}>
                          {TIME_SLOTS.map(t => (
                            <button key={t} className={`${styles.timeSlot} ${time === t ? styles.timeSlotActive : ''}`} onClick={() => { setTime(t); setShowTimePicker(false); }}>
                              {t}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RSVP */}
        <label className={styles.rsvpRow}>
          <input type="checkbox" checked={requireRsvp} onChange={() => setRequireRsvp(v => !v)} className={styles.checkbox} />
          <span>Require RSVP</span>
          <Icon name="solar:info-circle-linear" size={14} color="var(--neutral-200)" />
        </label>

        {/* Member Instruction */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>Member Instruction</label>
          <div className={styles.instructionEditor}>
            <div
              className={styles.instructionEditable}
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Add Instructions for Member"
              onInput={e => { memberInstructionRef.current = e.currentTarget.innerHTML; }}
            />
            <div className={styles.instructionToolbar}>
              <ActionButton icon="solar:paperclip-linear" size="S" tooltip="Attach" />
              <span className={styles.toolbarDivider} />
              <ActionButton icon="solar:text-bold-linear" size="S" tooltip="Bold" onClick={() => document.execCommand('bold')} />
              <ActionButton icon="solar:text-italic-linear" size="S" tooltip="Italic" onClick={() => document.execCommand('italic')} />
              <ActionButton icon="solar:text-underline-linear" size="S" tooltip="Underline" onClick={() => document.execCommand('underline')} />
              <span className={styles.toolbarDivider} />
              <ActionButton icon="solar:text-field-linear" size="S" tooltip="Heading" onClick={() => document.execCommand('formatBlock', false, 'h3')} />
              <ActionButton icon="solar:list-linear" size="S" tooltip="List" onClick={() => document.execCommand('insertUnorderedList')} />
            </div>
          </div>
        </div>

        {/* Staff Instructions */}
        {!showStaffInstructions ? (
          <button className={styles.addStaffBtn} onClick={() => setShowStaffInstructions(true)}>
            <Icon name="solar:document-add-linear" size={16} color="var(--primary-300)" />
            Add Staff Instructions
          </button>
        ) : (
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Staff Instructions</label>
            <div className={styles.instructionEditor}>
              <div
                className={styles.instructionEditable}
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Add Instructions for Staff"
                onInput={e => { staffInstructionRef.current = e.currentTarget.innerHTML; }}
              />
              <div className={styles.instructionToolbar}>
                <ActionButton icon="solar:paperclip-linear" size="S" tooltip="Attach" />
                <span className={styles.toolbarDivider} />
                <ActionButton icon="solar:text-bold-linear" size="S" tooltip="Bold" onClick={() => document.execCommand('bold')} />
                <ActionButton icon="solar:text-italic-linear" size="S" tooltip="Italic" onClick={() => document.execCommand('italic')} />
                <ActionButton icon="solar:text-underline-linear" size="S" tooltip="Underline" onClick={() => document.execCommand('underline')} />
                <span className={styles.toolbarDivider} />
                <ActionButton icon="solar:text-field-linear" size="S" tooltip="Heading" onClick={() => document.execCommand('formatBlock', false, 'h3')} />
                <ActionButton icon="solar:list-linear" size="S" tooltip="List" onClick={() => document.execCommand('insertUnorderedList')} />
                <div style={{ flex: 1 }} />
                <ActionButton icon="solar:trash-bin-minimalistic-linear" size="S" tooltip="Remove" state="error" onClick={() => { setShowStaffInstructions(false); staffInstructionRef.current = ''; }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
