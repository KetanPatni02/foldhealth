import { useEffect, useMemo } from 'react';
import { Drawer } from '../../../components/Drawer/Drawer';
import { Icon } from '../../../components/Icon/Icon';
import { FilePreview } from '../../../components/FilePreview/FilePreview';
import styles from './LetterPreviewDrawer.module.css';

// Decode a stored base64 PDF into an object URL the iframe can load.
function base64ToBlobUrl(base64) {
  if (!base64) return null;
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
}

/**
 * LetterPreviewDrawer — read-only preview of a letter's actual PDF. Mirrors the
 * HCC DocPreviewDrawer shell (right-side Drawer, full-bleed FilePreview) but is
 * titled "Preview Letter" with the letter name beneath and carries no status.
 */
export function LetterPreviewDrawer({ letter, onClose }) {
  const src = useMemo(() => base64ToBlobUrl(letter?.contentBase64), [letter?.contentBase64]);
  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);

  if (!letter) return null;

  return (
    <Drawer
      title={
        <span className={styles.titleWrap}>
          <span className={styles.titleMain}>Preview Letter</span>
          <span className={styles.titleSub}>Name: {letter.fileName}</span>
        </span>
      }
      onClose={onClose}
      bodyClassName={styles.pdfBody}
    >
      {src ? (
        <FilePreview className={styles.pdf} src={src} name={letter.sourceFile || letter.fileName} ext="pdf" />
      ) : (
        <div className={styles.empty}>
          <Icon name="solar:document-text-linear" size={40} color="var(--neutral-200)" />
          <span>No PDF available for this letter.</span>
        </div>
      )}
    </Drawer>
  );
}
