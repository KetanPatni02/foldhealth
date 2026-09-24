import { useState } from 'react';
import styles from './ColorInput.module.css';

const HEX = /^#[0-9a-fA-F]{6}$/;

/** "8c5ae2", "#8C5AE2" → "#8C5AE2"; anything else → null. */
function normaliseHex(text) {
  const t = String(text || '').trim();
  const withHash = t.startsWith('#') ? t : `#${t}`;
  return HEX.test(withHash) ? withHash.toUpperCase() : null;
}

/**
 * ColorInput: a swatch plus its hex code. The swatch opens the system colour
 * picker; the code can also be typed. Only a complete six-digit hex is ever
 * reported, and a half-typed code snaps back to the last good one on blur.
 *
 * The colour here is data (what the author chose), so it is applied inline;
 * design tokens are for the app's own chrome.
 *
 * @param {object}   props
 * @param {string}   props.value     – "#RRGGBB"
 * @param {function} props.onChange  – Called with a normalised "#RRGGBB"
 * @param {string}   [props.id]      – For an external <label htmlFor>
 * @param {string}   [props.ariaLabel]
 * @param {boolean}  [props.disabled]
 */
export function ColorInput({ value, onChange, id, ariaLabel, disabled = false }) {
  const [text, setText] = useState(value || '');
  // When the value changes from outside (another field, an undo), show it.
  // Adjusted during render rather than in an effect, per React's guidance.
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    setText(value || '');
  }

  const commitText = (next) => {
    setText(next);
    const hex = normaliseHex(next);
    if (hex) onChange?.(hex);
  };

  return (
    <div className={[styles.field, disabled ? styles.disabled : ''].filter(Boolean).join(' ')}>
      <label className={styles.swatch} style={{ background: value }}>
        <input
          type="color"
          className={styles.picker}
          value={normaliseHex(value) || '#000000'}
          disabled={disabled}
          aria-label={ariaLabel ? `${ariaLabel} picker` : 'Colour picker'}
          onChange={(e) => commitText(e.target.value.toUpperCase())}
        />
      </label>
      <input
        id={id}
        className={styles.hex}
        value={text}
        disabled={disabled}
        spellCheck={false}
        autoComplete="off"
        maxLength={7}
        aria-label={ariaLabel}
        onChange={(e) => commitText(e.target.value)}
        onBlur={() => setText(normaliseHex(text) || value || '')}
      />
    </div>
  );
}
