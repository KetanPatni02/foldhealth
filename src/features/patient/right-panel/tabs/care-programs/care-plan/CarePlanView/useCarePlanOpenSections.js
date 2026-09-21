import { useEffect, useState } from 'react';

const STORAGE_KEY = 'carePlanOpenSections';
const FALLBACK = { goals: true, interventions: true, barriers: true, careNote: true };

export function useCarePlanOpenSections() {
  const [openSections, setOpenSections] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return saved && typeof saved === 'object' ? { ...FALLBACK, ...saved } : FALLBACK;
    } catch {
      return FALLBACK;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(openSections)); } catch { /* storage unavailable */ }
  }, [openSections]);

  const toggleSection = (name) => setOpenSections(s => ({ ...s, [name]: !s[name] }));

  return { openSections, toggleSection };
}
