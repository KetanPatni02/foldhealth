import { useEffect, useRef } from 'react';

export function useNativeDialog(active = true) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!active || !dialog) return undefined;

    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [active]);

  return dialogRef;
}
