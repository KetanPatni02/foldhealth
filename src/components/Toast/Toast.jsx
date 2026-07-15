import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';
import styles from './Toast.module.css';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      closeButton
      toastOptions={{
        className: styles.toast,
        classNames: {
          toast: styles.toast,
          default: styles.default,
          success: styles.success,
          error: styles.error,
          warning: styles.warning,
          info: styles.default,
          description: styles.description,
          title: styles.title,
          closeButton: styles.closeButton,
        },
      }}
    />
  );
}

export const toast = sonnerToast;
