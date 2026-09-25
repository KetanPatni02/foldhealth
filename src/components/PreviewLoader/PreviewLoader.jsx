import ringOuterUrl from './ring-outer.svg';
import ringInnerUrl from './ring-inner.svg';
import reportLoaderGif from './report-loader.gif';
import styles from './PreviewLoader.module.css';

/**
 * Fold Health PreviewLoader: the "generating a preview" state. An animated
 * report illustration inside two dashed rings, an indeterminate progress
 * bar, and a label. Figma Mar–Present 2026, 3868:37292.
 *
 * @param {object} props
 * @param {string} [props.label='Generating report preview']
 * @param {string} [props.illustration] – Image (GIF) shown in the rings; the
 *                                        animated report by default.
 */
export function PreviewLoader({ label = 'Generating report preview', illustration = reportLoaderGif }) {
  return (
    <div className={styles.root} role="status" aria-live="polite">
      <div className={styles.art} aria-hidden="true">
        <img className={styles.ringOuter} src={ringOuterUrl} alt="" />
        <img className={styles.ringInner} src={ringInnerUrl} alt="" />
        <div className={styles.disc}>
          <img className={styles.illustration} src={illustration} alt="" />
        </div>
      </div>
      <div className={styles.bar} aria-hidden="true">
        <span className={styles.barGlow} />
      </div>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
