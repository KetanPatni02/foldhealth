import { useChartDetailDrawer } from './useChartDetailDrawer';
import { ChartDetailDrawerView } from './ChartDetailDrawerView';

export function ChartDetailDrawer({ charts, initialId, member, onClose }) {
  const panel = useChartDetailDrawer({ charts, initialId, member, onClose });
  return <ChartDetailDrawerView {...panel} />;
}
