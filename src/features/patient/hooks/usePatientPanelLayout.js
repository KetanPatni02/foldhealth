import { useCallback, useEffect, useMemo } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { PANEL_LAYOUT_KEY, normalizeLayout } from '../left-panel/patientPanelLayout';

/** The signed-in user's left-panel layout (More > Customize) and a saver for it. */
export function usePatientPanelLayout() {
  const raw = useAppStore(s => s.panelLayouts[PANEL_LAYOUT_KEY]);
  const fetchPanelLayouts = useAppStore(s => s.fetchPanelLayouts);
  const savePanelLayout = useAppStore(s => s.savePanelLayout);

  useEffect(() => { fetchPanelLayouts(); }, [fetchPanelLayouts]);

  const layout = useMemo(() => normalizeLayout(raw), [raw]);
  const saveLayout = useCallback(next => savePanelLayout(PANEL_LAYOUT_KEY, next), [savePanelLayout]);
  return { layout, saveLayout };
}
