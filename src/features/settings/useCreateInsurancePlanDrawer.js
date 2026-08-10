import { useState, useRef, useEffect } from 'react';
import { AVERGENT_THEME, PROMINENCE_THEME, NO_THEME } from './CardThemePicker.constants';
import avergentLogoUrl from './assets/avergent-logo.png';
import prominenceLogoUrl from './assets/prominence-logo.svg?url';
import {
  readImagePreviewUrl, formatPhone, emptyTier, EMPTY_FORM, REQUIRED_FIELDS,
} from './CreateInsurancePlanDrawer.utils';

export function initLogoChoice(initialPlan) {
  if (!initialPlan) return 'avergent';
  if (initialPlan.logoChoice) return initialPlan.logoChoice;
  if (initialPlan.logoPreviewUrl === avergentLogoUrl) return 'avergent';
  if (initialPlan.logoPreviewUrl === prominenceLogoUrl) return 'prominence';
  if (initialPlan.logoPreviewUrl) return 'custom';
  return 'avergent';
}

export function initTheme(initialPlan) {
  if (initialPlan?.cardTheme) return initialPlan.cardTheme;
  return AVERGENT_THEME;
}

export function useCreateInsurancePlanDrawer({ initialPlan, mode, onClose, onSave }) {
  const isEdit = mode === 'edit';
  const isDirty = useRef(false);
  const fileInputRef = useRef(null);
  const tpaFileInputRef = useRef(null);
  const tierIdRef = useRef((initialPlan?.tiers?.length || 1) + 1);
  const tierRefs = useRef({});
  const pendingScrollTierRef = useRef(null);

  const [step, setStep] = useState(1);
  const [showPreview, setShowPreview] = useState(true);
  const [logoChoice, setLogoChoice] = useState(() => initLogoChoice(initialPlan));
  const [cardTheme, setCardTheme] = useState(() => initTheme(initialPlan));
  const [tpaLogoPreviewUrl, setTpaLogoPreviewUrl] = useState(initialPlan?.tpaLogoPreviewUrl || null);
  const [customLogoUrl, setCustomLogoUrl] = useState(
    initialPlan?.logoPreviewUrl && initLogoChoice(initialPlan) === 'custom' ? initialPlan.logoPreviewUrl : null,
  );
  const [tiers, setTiers] = useState(() => initialPlan?.tiers?.length ? initialPlan.tiers : [emptyTier(1)]);
  const [expandedTiers, setExpandedTiers] = useState(() => new Set([tiers[0]?.id ?? 1]));
  const [activeTierId, setActiveTierId] = useState(() => tiers[0]?.id ?? 1);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [zipInvalid, setZipInvalid] = useState(false);
  const [form, setForm] = useState(initialPlan ? { ...EMPTY_FORM, ...initialPlan } : EMPTY_FORM);

  useEffect(() => {
    const id = pendingScrollTierRef.current;
    if (id == null) return;
    pendingScrollTierRef.current = null;
    tierRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [tiers]);

  useEffect(() => () => {
    if (customLogoUrl?.startsWith('blob:')) URL.revokeObjectURL(customLogoUrl);
  }, [customLogoUrl]);

  useEffect(() => () => {
    if (tpaLogoPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(tpaLogoPreviewUrl);
  }, [tpaLogoPreviewUrl]);

  const set = (key) => (e) => {
    isDirty.current = true;
    setForm(f => ({ ...f, [key]: e.target.value }));
  };
  const setVal = (key) => (val) => {
    isDirty.current = true;
    setForm(f => ({ ...f, [key]: val }));
  };
  const setPhone = (key) => (e) => {
    isDirty.current = true;
    setForm(f => ({ ...f, [key]: formatPhone(e.target.value) }));
  };

  const handleZipChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 5);
    isDirty.current = true;
    if (val.length === 5) {
      setForm(f => ({ ...f, zipcode: val }));
      fetch(`https://api.zippopotam.us/us/${val}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.places?.[0]) {
            const p = data.places[0];
            setZipInvalid(false);
            setForm(f => ({
              ...f,
              city: p['place name'] || '',
              state: p['state abbreviation'] || '',
            }));
          } else {
            setZipInvalid(true);
            setForm(f => ({ ...f, city: '', state: '' }));
          }
        })
        .catch(() => { setZipInvalid(true); setForm(f => ({ ...f, city: '', state: '' })); });
    } else {
      setZipInvalid(false);
      setForm(f => ({ ...f, zipcode: val, city: '', state: '' }));
    }
  };

  const handleLogoChoice = (choice) => {
    isDirty.current = true;
    setLogoChoice(choice);
    if (choice === 'avergent') setCardTheme(AVERGENT_THEME);
    else if (choice === 'prominence') setCardTheme(PROMINENCE_THEME);
    else setCardTheme(NO_THEME);
  };

  const activeLogoUrl = logoChoice === 'avergent'
    ? avergentLogoUrl
    : logoChoice === 'prominence'
    ? prominenceLogoUrl
    : customLogoUrl;

  const handleCustomLogoDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      isDirty.current = true;
      readImagePreviewUrl(file, (dataUrl) => {
        setCustomLogoUrl(prev => {
          if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
          return dataUrl;
        });
      });
    }
  };

  const handleCustomLogoPick = (e) => {
    const file = e.target.files[0];
    if (file) {
      isDirty.current = true;
      readImagePreviewUrl(file, (dataUrl) => {
        setCustomLogoUrl(prev => {
          if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
          return dataUrl;
        });
      });
    }
  };

  const updateTier = (id, key, value) => {
    isDirty.current = true;
    setTiers(ts => ts.map(t => t.id === id ? { ...t, [key]: value } : t));
  };
  const addTier = () => {
    const newId = ++tierIdRef.current;
    const newTier = emptyTier(newId);
    setTiers(ts => [...ts, newTier]);
    setExpandedTiers(prev => new Set([...prev, newId]));
    setActiveTierId(newId);
    pendingScrollTierRef.current = newId;
    isDirty.current = true;
  };
  const deleteTier = (id) => {
    const next = tiers.filter(t => t.id !== id);
    if (id === activeTierId) setActiveTierId(next[next.length - 1]?.id ?? null);
    setTiers(next);
    setExpandedTiers(prev => { const s = new Set(prev); s.delete(id); return s; });
    isDirty.current = true;
  };
  const toggleTier = (id) => {
    setActiveTierId(id);
    setExpandedTiers(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const hasLogo = logoChoice === 'avergent' || logoChoice === 'prominence' || (logoChoice === 'custom' && !!customLogoUrl);
  const missingFields = REQUIRED_FIELDS.filter(f => !String(form[f.key] ?? '').trim());
  const canSave = missingFields.length === 0 && hasLogo;
  const err = (key) => showErrors && !String(form[key] ?? '').trim();

  const goToStep2 = () => {
    if (!canSave) { setShowErrors(true); return; }
    setShowErrors(false);
    setStep(2);
  };

  const buildPlanData = () => ({
    ...(isEdit && initialPlan?.id ? { id: initialPlan.id } : {}),
    ...form,
    logoPreviewUrl: activeLogoUrl,
    logoChoice,
    tpaLogoPreviewUrl,
    cardTheme,
    tiers,
  });

  const handleSave = () => {
    if (!canSave) { setShowErrors(true); setStep(1); return; }
    onSave(buildPlanData());
    onClose();
  };

  const handleClose = () => {
    if (!isDirty.current) { onClose(); return; }
    if (isEdit) setShowSaveDialog(true);
    else setShowDiscardDialog(true);
  };

  const firstTier = tiers[0] ?? {};
  const previewData = {
    ...form,
    ...firstTier,
    coverageType: firstTier.coverageType || (firstTier.coverageFamily ? 'Family' : 'Individual'),
  };

  const setTpaLogo = (dataUrl) => {
    isDirty.current = true;
    setTpaLogoPreviewUrl(prev => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return dataUrl;
    });
  };

  const clearCustomLogo = () => {
    setCustomLogoUrl(prev => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
    isDirty.current = true;
  };

  const clearTpaLogo = () => {
    setTpaLogoPreviewUrl(prev => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
    isDirty.current = true;
  };

  const markDirty = () => { isDirty.current = true; };

  return {
    isEdit,
    setForm,
    markDirty,
    step, setStep,
    showPreview, setShowPreview,
    logoChoice, handleLogoChoice,
    cardTheme, setCardTheme,
    tpaLogoPreviewUrl, setTpaLogo, clearTpaLogo,
    customLogoUrl, clearCustomLogo,
    activeLogoUrl,
    tiers, expandedTiers, activeTierId, tierRefs,
    updateTier, addTier, deleteTier, toggleTier,
    showDiscardDialog, setShowDiscardDialog,
    showSaveDialog, setShowSaveDialog,
    showErrors, zipInvalid,
    form, set, setVal, setPhone, handleZipChange,
    fileInputRef, tpaFileInputRef,
    handleCustomLogoDrop, handleCustomLogoPick,
    hasLogo, canSave, err, goToStep2,
    handleSave, handleClose,
    previewData, firstTier,
  };
}
