import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const CcmTimerDockContext = createContext(null);

export function CcmTimerDockProvider({ children }) {
  const [dockEl, setDockEl] = useState(null);
  const [isDocked, setIsDocked] = useState(true);
  const [floatPos, setFloatPos] = useState({ right: 16, bottom: 16 });

  const dockRef = useCallback((node) => {
    setDockEl(node);
  }, []);

  const value = useMemo(() => ({
    dockEl,
    dockRef,
    isDocked,
    setIsDocked,
    floatPos,
    setFloatPos,
  }), [dockEl, dockRef, isDocked, floatPos]);

  return (
    <CcmTimerDockContext.Provider value={value}>
      {children}
    </CcmTimerDockContext.Provider>
  );
}

export function useCcmTimerDock() {
  const ctx = useContext(CcmTimerDockContext);
  if (!ctx) throw new Error('useCcmTimerDock must be used within CcmTimerDockProvider');
  return ctx;
}
