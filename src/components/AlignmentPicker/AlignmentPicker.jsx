import styles from './AlignmentPicker.module.css';

const COLS = ['left', 'center', 'right'];
const ROWS = ['top', 'middle', 'bottom'];

/**
 * AlignmentPicker: a grid of positions (dots), the picked one drawn as
 * alignment bars (Figma Print drawer, 1031:21133). `rows={3}` is a 3 × 3
 * grid with values like 'middle-center'; `rows={1}` is a single row with
 * 'left' | 'center' | 'right'.
 *
 * @param {object}   props
 * @param {string}   props.value
 * @param {function} props.onChange – called with the picked value
 * @param {1|3}      [props.rows=3]
 * @param {string}   [props.ariaLabel]
 */
export function AlignmentPicker({ value, onChange, rows = 3, ariaLabel = 'Alignment' }) {
  const rowKeys = rows === 1 ? [null] : ROWS;
  return (
    <div
      className={styles.grid}
      style={{ gridTemplateRows: `repeat(${rowKeys.length}, minmax(0, 1fr))` }}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {rowKeys.flatMap(r => COLS.map(c => {
        const key = r ? `${r}-${c}` : c;
        const on = key === value;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={key.replace('-', ' ')}
            title={key.replace('-', ' ')}
            className={styles.cell}
            onClick={() => onChange(key)}
          >
            {on ? (
              <span className={styles.bars} aria-hidden="true">
                <span className={styles.bar} />
                <span className={[styles.bar, styles.barTall].join(' ')} />
                <span className={[styles.bar, styles.barShort].join(' ')} />
              </span>
            ) : (
              <span className={styles.dot} aria-hidden="true" />
            )}
          </button>
        );
      }))}
    </div>
  );
}
