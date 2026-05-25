import { forwardRef } from 'react';
import styles from './Textarea.module.css';

/**
 * Fold Health Textarea — multiline counterpart to <Input>. Same border,
 * radius, font, colors; auto-growable via the rows prop.
 *
 * @param {object}   props
 * @param {string}   [props.variant='default']     – 'default' | 'error'
 * @param {string}   [props.className]
 * @param {number}   [props.rows=3]
 * @param {boolean}  [props.disabled]
 */
export const Textarea = forwardRef(function Textarea(
  { variant = 'default', className, rows = 3, ...props },
  ref
) {
  const cls = [
    styles.textarea,
    variant === 'error' ? styles.textareaError : '',
    className || '',
  ].filter(Boolean).join(' ');
  return <textarea ref={ref} rows={rows} className={cls} {...props} />;
});
