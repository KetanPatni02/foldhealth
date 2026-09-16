import { Suspense, lazy } from 'react';
import { useAppStore } from '../../store/useAppStore';

const CallPopover = lazy(() => import('./CallPopover').then((m) => ({ default: m.CallPopover })));

export function CallPopoverHost() {
  const callPopoverPatient = useAppStore((s) => s.callPopoverPatient);
  if (!callPopoverPatient) return null;
  return (
    <Suspense fallback={null}>
      <CallPopover />
    </Suspense>
  );
}
