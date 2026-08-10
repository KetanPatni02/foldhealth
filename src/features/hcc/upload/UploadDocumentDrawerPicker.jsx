import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { documentToRecord } from './UploadDocumentDrawer.helpers';
import {
  ACCEPT_EXT,
  ACCEPT_MIME,
  EXTRACT_BUCKETS,
  isAcceptedFile,
  shortDate,
} from './UploadDocumentDrawerPicker.utils';
import { UploadDocumentDrawerPickerBody } from './UploadDocumentDrawerPickerBody';

export function PickerPhase(props) {
  return <UploadDocumentDrawerPickerBody {...usePickerPhase(props)} />;
}

function usePickerPhase({ showToast, cancel }) {
  const queueHccDocumentForOcr = useAppStore(s => s.queueHccDocumentForOcr);
  const createFromEncounter = useAppStore(s => s.hccCreateOrMergeFromEncounter);
  const openReviewForBatches = useAppStore(s => s.openHccReviewForBatches);
  const removeHccSftpBatch = useAppStore(s => s.removeHccSftpBatch);
  const fetchHccDocuments = useAppStore(s => s.fetchHccDocuments);
  const sftpBatches = useAppStore(s => s.hccSftpBatches) || [];
  const [staged, setStaged] = useState([]);
  const [activeBucket, setActiveBucket] = useState('review');
  const startedRef = useRef(new Set());
  const didFetchRef = useRef(false);

  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    if ((useAppStore.getState().hccSftpBatches || []).length === 0) fetchHccDocuments?.();
  }, [fetchHccDocuments]);

  const records = useMemo(() => {
    const out = [];
    for (const b of sftpBatches) {
      if (b.status === 'done') out.push(documentToRecord(b));
    }
    return out;
  }, [sftpBatches]);

  useEffect(() => {
    const uploading = staged.filter(s => s.status === 'uploading' && s.progress < 100);
    if (uploading.length === 0) return;
    const t = setTimeout(() => {
      setStaged(prev => prev.map(s => {
        if (s.status !== 'uploading') return s;
        const next = Math.min(100, s.progress + (10 + Math.random() * 15));
        return { ...s, progress: next, status: next >= 100 ? 'extracting' : 'uploading' };
      }));
    }, 120);
    return () => clearTimeout(t);
  }, [staged]);

  const extractOne = async (row) => {
    const name = row.name;
    try {
      const batchId = await queueHccDocumentForOcr?.(row.file, { autoApply: false });
      const batch = useAppStore.getState().hccSftpBatches.find(b => b.id === batchId);
      if (documentToRecord(batch).bucket === 'added') {
        (batch?.encounters || []).forEach((enc) => {
          try { createFromEncounter?.({ ...enc, _docName: name, _batchId: batchId }); }
          catch (err) { console.error('Auto-add failed for extracted record', err); }
        });
      }
    } finally {
      setStaged(prev => prev.filter(s => s.id !== row.id));
    }
  };

  useEffect(() => {
    const ready = staged.filter(s => s.status === 'extracting' && !startedRef.current.has(s.id));
    ready.forEach((row) => {
      startedRef.current.add(row.id);
      void extractOne(row);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staged]);

  useEffect(() => {
    const count = (k) => records.filter(r => r.bucket === k).length;
    if (records.length && count(activeBucket) === 0) {
      const next = EXTRACT_BUCKETS.find(b => count(b.key) > 0);
      if (next) setActiveBucket(next.key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records]);

  const MAX_FILES = 15;
  const MAX_BATCH_BYTES = 100 * 1024 * 1024;
  const handlePick = (filesOrFile, opts = {}) => {
    const arr = Array.isArray(filesOrFile) ? filesOrFile : [filesOrFile];
    const accepted = arr.filter(Boolean).filter(isAcceptedFile);
    if (accepted.length === 0) {
      showToast?.('Please upload a PDF, DOC, JPG, PNG, or TIFF file');
      return;
    }
    const capFiles = opts.bypassLimit ? Infinity : MAX_FILES;
    const capBytes = opts.bypassLimit ? Infinity : MAX_BATCH_BYTES;
    setStaged(prev => {
      const currentBytes = prev.reduce((s, x) => s + (x.size || 0), 0);
      const candidateRows = accepted.map((file) => ({
        id: `stg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        name: file.name,
        size: file.size && file.size > 1024 ? file.size : (2.5 * 1024 * 1024),
        progress: 0,
        status: 'uploading',
      }));
      const accepted2 = [];
      let runningCount = prev.length;
      let runningBytes = currentBytes;
      let droppedForCount = 0;
      let droppedForBytes = 0;
      for (const row of candidateRows) {
        if (runningCount >= capFiles) { droppedForCount += 1; continue; }
        if (runningBytes + row.size > capBytes) { droppedForBytes += 1; continue; }
        accepted2.push(row);
        runningCount += 1;
        runningBytes += row.size;
      }
      if (droppedForCount > 0 || droppedForBytes > 0) {
        showToast?.('You can upload up to 15 files or 100 MB at a time via the app. For larger batches, please use SFTP.');
      }
      return [...prev, ...accepted2];
    });
  };

  const removeStaged = (id) => setStaged(prev => prev.filter(s => s.id !== id));
  const removeRecord = (rec) => removeHccSftpBatch?.(rec.batchId || rec.id);
  const reviewRecord = (rec) => {
    const batchIds = [...new Set(records.flatMap(r => r.batchId ? [r.batchId] : []))];
    cancel?.();
    openReviewForBatches?.(batchIds, rec?.batchId);
  };

  const [activeTab, setActiveTab] = useState('upload');
  const reviewCount = records.filter(r => r.bucket === 'review' || r.bucket === 'unreadable').length;
  const addedCount = records.filter(r => r.bucket === 'added').length;
  const tabItems = [
    { key: 'upload', label: 'Upload' },
    { key: 'review', label: `Review (${reviewCount})` },
    { key: 'added', label: `Added (${addedCount})` },
    { key: 'deleted', label: 'Deleted (0)' },
  ];

  const [filterOpen, setFilterOpen] = useState(false);
  const [recordFilters, setRecordFilters] = useState({ by: [], date: [] });
  const uploaderOptions = useMemo(() => (
    [...new Set(records.map(r => r.actorName || 'You'))].toSorted()
  ), [records]);
  const dateOptions = useMemo(() => (
    [...new Set(records.flatMap(r => {
      const d = shortDate(r.dateISO);
      return d ? [d] : [];
    }))].toSorted((a, b) => new Date(b).getTime() - new Date(a).getTime())
  ), [records]);
  const filterActive = (recordFilters.by?.length || 0) + (recordFilters.date?.length || 0) > 0;
  const applyRecordFilters = (list) => {
    const bySet = recordFilters.by?.length ? new Set(recordFilters.by) : null;
    const dateSet = recordFilters.date?.length ? new Set(recordFilters.date) : null;
    return list.filter((r) => {
      if (bySet) {
        const who = r.actorName || 'You';
        if (!bySet.has(who)) return false;
      }
      if (dateSet) {
        const stamp = shortDate(r.dateISO);
        if (!stamp || !dateSet.has(stamp)) return false;
      }
      return true;
    });
  };
  const clearAllFilters = () => setRecordFilters({ by: [], date: [] });

  const lastSync = useAppStore.getState().hccLastCronSync || null;
  const [cronDismissed, setCronDismissed] = useState(false);
  const cronMsg = lastSync
    ? `Last sync ${lastSync.agoLabel} • ${lastSync.imported} Imported • ${lastSync.added} Added • ${lastSync.pending} Pending Review`
    : `Last sync 9h ago • ${records.length} Imported • ${addedCount} Added • ${reviewCount} Pending Review`;

  return {
    showToast,
    ACCEPT_EXT,
    ACCEPT_MIME,
    tabItems,
    activeTab,
    setActiveTab,
    filterOpen,
    setFilterOpen,
    filterActive,
    cronDismissed,
    setCronDismissed,
    cronMsg,
    recordFilters,
    setRecordFilters,
    uploaderOptions,
    dateOptions,
    clearAllFilters,
    staged,
    handlePick,
    removeStaged,
    records,
    activeBucket,
    setActiveBucket,
    applyRecordFilters,
    reviewRecord,
    removeRecord,
  };
}
