import { useDiagPanel } from './useDiagPanel';
import { DiagPanelView } from './DiagPanelView';

export function DiagPanel() {
  const panel = useDiagPanel();
  return <DiagPanelView {...panel} />;
}
