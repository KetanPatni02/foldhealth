import { useState, useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { parseBulkCsv, sendSingleInvite, importBulkUsers } from './InviteUserDrawer.utils';
import { InviteUserChooseStep } from './InviteUserChooseStep';
import { InviteUserBulkUploadStep } from './InviteUserBulkUploadStep';
import { InviteUserBulkReviewStep } from './InviteUserBulkReviewStep';
import { InviteUserFormStep } from './InviteUserFormStep';

export function InviteUserDrawer({ onClose, onInvited }) {
  const [step, setStep] = useState('choose');
  const [showAdditional, setShowAdditional] = useState(false);
  const showToast = useAppStore(s => s.showToast);
  const logAudit = useAppStore(s => s.logAudit);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkColumns, setBulkColumns] = useState(['first_name', 'middle_name', 'last_name', 'email', 'admin_role']);
  const [addColOpen, setAddColOpen] = useState(false);
  const [highlightId, setHighlightId] = useState(null);
  const [highlightCol, setHighlightCol] = useState(null);
  const fileInputRef = useRef(null);
  const tableRef = useRef(null);
  const [form, setForm] = useState({
    first_name: '', middle_name: '', last_name: '', email: '',
    admin_role: 'Business/Practice Owner', clinical_roles: [],
    gender: '', bio: '', mobile: '', fax: '', zip_code: '',
    address_line1: '', address_line2: '', state: '', city: '',
    credentials: [], licence_states: [], locations: [], languages: [],
  });
  const [sending, setSending] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSendInvite = async () => {
    setSending(true);
    try {
      await sendSingleInvite({ form, showToast, logAudit, onInvited });
    } catch (e) {
      showToast(`Error: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    setBulkFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseBulkCsv(e.target.result);
      if (!parsed) { showToast('CSV must have a header row and at least one data row'); return; }
      setBulkRows(parsed.rows);
      setBulkColumns(parsed.columns);
    };
    reader.readAsText(file);
  };

  const addRow = () => {
    const newId = Date.now();
    setBulkRows(prev => [...prev, { _id: newId, first_name: '', middle_name: '', last_name: '', email: '', admin_role: '' }]);
    setHighlightId(newId);
    setTimeout(() => { setHighlightId(null); tableRef.current?.querySelector('tbody tr:last-child')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100);
    setTimeout(() => setHighlightId(null), 1500);
  };

  const addColumns = (cols) => {
    setBulkColumns(prev => {
      const prevSet = new Set(prev);
      const next = cols.filter(c => !prevSet.has(c));
      return next.length ? [...prev, ...next] : prev;
    });
    setAddColOpen(false);
    if (cols.length > 0) {
      setHighlightCol(cols[0]);
      setTimeout(() => setHighlightCol(null), 1500);
      setTimeout(() => { const scrollArea = tableRef.current?.parentElement; if (scrollArea) scrollArea.scrollLeft = scrollArea.scrollWidth; }, 100);
    }
  };

  const handleBulkImport = async () => {
    setSending(true);
    try {
      await importBulkUsers({ bulkRows, showToast, logAudit, onInvited });
    } finally {
      setSending(false);
    }
  };

  if (step === 'choose') {
    return (
      <InviteUserChooseStep
        onClose={onClose}
        onChooseSingle={() => setStep('form')}
        onChooseBulk={() => setStep('bulk-upload')}
      />
    );
  }

  if (step === 'bulk-upload') {
    return (
      <InviteUserBulkUploadStep
        onClose={onClose}
        bulkFile={bulkFile}
        fileInputRef={fileInputRef}
        onFileSelect={handleFileSelect}
        onClearFile={() => { setBulkFile(null); setBulkRows([]); }}
        onNext={() => setStep('bulk-review')}
      />
    );
  }

  if (step === 'bulk-review') {
    return (
      <InviteUserBulkReviewStep
        onClose={onClose}
        onPrevious={() => setStep('bulk-upload')}
        onImport={handleBulkImport}
        sending={sending}
        bulkRows={bulkRows}
        bulkColumns={bulkColumns}
        tableRef={tableRef}
        highlightId={highlightId}
        highlightCol={highlightCol}
        addColOpen={addColOpen}
        setAddColOpen={setAddColOpen}
        onAddRow={addRow}
        onAddColumns={addColumns}
        onUpdateRow={(id, field, value) => setBulkRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r))}
        onDuplicateRow={(row) => {
          const newId = Date.now();
          setBulkRows(prev => [...prev, { ...row, _id: newId, email: '' }]);
          setHighlightId(newId);
          setTimeout(() => setHighlightId(null), 1500);
        }}
        onDeleteRow={(id) => setBulkRows(prev => prev.filter(r => r._id !== id))}
      />
    );
  }

  return (
    <InviteUserFormStep
      onClose={onClose}
      form={form}
      set={set}
      showAdditional={showAdditional}
      setShowAdditional={setShowAdditional}
      sending={sending}
      onSendInvite={handleSendInvite}
    />
  );
}
