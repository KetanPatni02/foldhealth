import { useDiagPanel } from './useDiagPanel';
import { DiagPanelView } from './DiagPanelView';

export function DiagPanel() {
  const panel = useDiagPanel();
  if (!panel.member) return null;
  return <DiagPanelView {...panel} />;
}
