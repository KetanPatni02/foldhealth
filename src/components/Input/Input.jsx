import { forwardRef, isValidElement, useCallback, useId, useState } from 'react';
import { Icon } from '../Icon/Icon';
import { DownChevronIcon } from '../Icon/DownChevronIcon';
import { Button } from '../Button/Button';
import styles from './Input.module.css';

// Sensible inputMode + autoComplete defaults per type. Callers can override
// by passing `inputMode` / `autoComplete` explicitly — they win.
const TYPE_DEFAULTS = {
  email:    { inputMode: 'email',    autoComplete: 'email' },
  password: { inputMode: 'text',     autoComplete: 'current-password' },
  number:   { inputMode: 'decimal',  autoComplete: 'off' },
  tel:      { inputMode: 'tel',      autoComplete: 'tel' },
  url:      { inputMode: 'url',      autoComplete: 'url' },
  search:   { inputMode: 'search',   autoComplete: 'off' },
  text:     { inputMode: undefined,  autoComplete: undefined },
};

/**
 * Fold Health Input — single source-of-truth text input control.
 *
 * Matches Figma Fold-Pixel design node 25:21239 across every state
 * (Placeholder, Filled, Hover, Focus, Disable, Error, Error Hover) and
 * every optional slot the design exposes as a boolean flag.
 *
 * Wrapper props (all optional — when NONE are set the component renders a
 * bare `<input>` so the many callers of `<Input placeholder="…" />` keep
 * working unchanged):
 *
 *   Label row
 *     - label          Text above the input.
 *     - required       Adds the red 4×4 mandatory dot next to the label.
 *     - showInfo       Adds an info icon next to the label; `infoText`
 *                      sets its native tooltip.
 *
 *   Field slots (all render inside the field shell around the <input>)
 *     - leadingIcon    Solar icon name (string) or a React node.
 *     - showPriority   Adds a leading priority flag icon.
 *     - trailingText   Static text on the right (e.g. "Days").
 *     - chevron        `true`/"down"/"up" adds a small trailing chevron.
 *     - trailingAction Boolean or Solar icon name for a small right-aligned
 *                      icon-only action button; wire via `onTrailingAction`.
 *     - trailingButton String label or `{ label, onClick }` for the small
 *                      purple pill button on the right.
 *     - characterLimit Number cap; shows "N/limit". Uses `value.length`
 *                      when controlled, otherwise tracks length internally.
 *
 *   Below the field
 *     - helperText     Muted text below the input, hidden while an error shows.
 *     - errorText      Explicit error message. Forces the error state.
 *
 * Password support
 *     - showPasswordToggle  Toggle-visibility eye button for `type="password"`.
 *
 * Native types accepted via `type` — text | email | password | number |
 * tel | url | search. Each type wires sensible `inputMode` +
 * `autoComplete` defaults.
 *
 * Validation
 *   - Pass `validate={(value) => string | null}` for a custom rule, OR
 *     lean on native constraints (`type`, `required`, `pattern`, `min`,
 *     `max`, `minLength`, `maxLength`, `step`) and Input will read
 *     `input.checkValidity()` / `validationMessage`.
 *   - `validateOn` — 'blur' (default), 'change', or 'none'.
 *   - The internal error clears the moment the user edits after a
 *     failed validation, so the message never nags.
 */
export const Input = forwardRef(function Input(
  {
    variant,
    type = 'text',
    // Label row
    label,
    required,
    showInfo = false,
    infoText,
    // Field slots
    leadingIcon,
    showPriority = false,
    trailingText,
    chevron = false,
    trailingAction = false,
    trailingActionLabel = 'Voice input',
    onTrailingAction,
    trailingButton = false,   // boolean toggle — mirrors Figma "Trailing Button" flag
    trailingButtonText = 'Button Text',
    onTrailingButtonClick,
    characterLimit,           // number
    // Below the field
    helperText,
    errorText,
    // Password
    showPasswordToggle = false,
    // Validation
    validate,
    validateOn = 'blur',
    // Layout escape hatches
    className,
    wrapperClassName,
    // Native pass-through
    inputMode: inputModeProp,
    autoComplete: autoCompleteProp,
    value,
    defaultValue,
    onBlur,
    onChange,
    id,
    ...props
  },
  ref,
) {
  const [internalError, setInternalError] = useState(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  // Fallback char count for uncontrolled inputs when characterLimit is set.
  const [uncontrolledLen, setUncontrolledLen] = useState(
    typeof defaultValue === 'string' ? defaultValue.length : 0,
  );
  // Guarantee a stable label↔input association even when the caller
  // doesn't pass `id`. Only used when a label is actually rendered.
  const autoId = useId();
  const inputId = id || (label ? autoId : undefined);

  // Explicit errorText (or legacy variant='error') wins over internal
  // validation output. Internal state only kicks in when the caller
  // hasn't spoken.
  const activeError = errorText != null ? errorText : internalError;
  const isError = variant === 'error' || Boolean(activeError);

  const runValidate = useCallback((el) => {
    if (!el) return;
    if (validate) {
      const msg = validate(el.value);
      setInternalError(msg || null);
      return;
    }
    if (!el.checkValidity()) {
      setInternalError(el.validationMessage || 'Invalid input');
    } else {
      setInternalError(null);
    }
  }, [validate]);

  const handleBlur = useCallback((e) => {
    if (validateOn === 'blur') runValidate(e.currentTarget);
    onBlur?.(e);
  }, [validateOn, runValidate, onBlur]);

  const handleChange = useCallback((e) => {
    if (validateOn === 'change') {
      runValidate(e.currentTarget);
    } else if (internalError) {
      // Clear stale error the moment the user edits.
      setInternalError(null);
    }
    if (characterLimit != null && value === undefined) {
      setUncontrolledLen(e.currentTarget.value.length);
    }
    onChange?.(e);
  }, [validateOn, runValidate, internalError, onChange, characterLimit, value]);

  const typeDefaults = TYPE_DEFAULTS[type] || TYPE_DEFAULTS.text;
  const inputMode = inputModeProp ?? typeDefaults.inputMode;
  const autoComplete = autoCompleteProp ?? typeDefaults.autoComplete;
  const effectiveType = type === 'password' && passwordVisible ? 'text' : type;

  // Normalise slot booleans into a single "any slot?" gate; slot booleans
  // also drive whether we render inside the shell (any slot ⇒ shell path).
  const hasLeading = Boolean(leadingIcon) || showPriority;
  const chevronDir = chevron === 'up' ? 'up' : (chevron ? 'down' : null);
  const trailingActionActive = Boolean(trailingAction);
  const showTrailingButton = Boolean(trailingButton);
  const hasTrailing = Boolean(trailingText) || chevronDir || trailingActionActive
    || showTrailingButton || characterLimit != null
    || (type === 'password' && showPasswordToggle);
  const usesShell = hasLeading || hasTrailing;

  // Bare-input fast path — no wrapper markup for the many callers that
  // don't use the structural extras. Keeps flex/grid parents happy.
  const needsWrapper = label || helperText || activeError || usesShell;

  if (!needsWrapper) {
    const inputCls = [
      styles.input,
      isError ? styles.inputError : '',
      className || '',
    ].filter(Boolean).join(' ');
    return (
      <input
        ref={ref}
        id={inputId}
        type={effectiveType}
        inputMode={inputMode}
        autoComplete={autoComplete}
        required={required}
        className={inputCls}
        value={value}
        defaultValue={defaultValue}
        onBlur={handleBlur}
        onChange={handleChange}
        aria-invalid={isError || undefined}
        {...props}
      />
    );
  }

  // Shell path — the input sits inside a styled row that owns the border,
  // padding, focus ring, and every optional slot the Figma component
  // exposes. The <input> itself becomes borderless.
  const bareInput = (
    <input
      ref={ref}
      id={inputId}
      type={effectiveType}
      inputMode={inputMode}
      autoComplete={autoComplete}
      required={required}
      className={[styles.inputBorderless, className || ''].filter(Boolean).join(' ')}
      value={value}
      defaultValue={defaultValue}
      onBlur={handleBlur}
      onChange={handleChange}
      aria-invalid={isError || undefined}
      {...props}
    />
  );

  const leading = hasLeading ? (
    <>
      {leadingIcon && (
        typeof leadingIcon === 'string'
          ? <Icon name={leadingIcon} size={16} color="var(--neutral-300)" className={styles.slotIcon} />
          : (isValidElement(leadingIcon) ? leadingIcon : null)
      )}
      {showPriority && (
        <Icon name="solar:flag-linear" size={16} color="var(--neutral-300)" className={styles.slotIcon} />
      )}
    </>
  ) : null;

  const currentLen = typeof value === 'string' ? value.length : uncontrolledLen;

  const trailing = hasTrailing ? (
    <>
      {type === 'password' && showPasswordToggle && (
        <button
          type="button"
          className={styles.trailingAction}
          onClick={() => setPasswordVisible((v) => !v)}
          tabIndex={-1}
          aria-label={passwordVisible ? 'Hide password' : 'Show password'}
        >
          <Icon name={passwordVisible ? 'solar:eye-closed-linear' : 'solar:eye-linear'} size={16} />
        </button>
      )}
      {trailingActionActive && (
        <button
          type="button"
          className={styles.trailingAction}
          onClick={onTrailingAction}
          aria-label={trailingActionLabel}
        >
          <Icon
            name={typeof trailingAction === 'string' ? trailingAction : 'solar:microphone-3-linear'}
            size={16}
            color="var(--neutral-300)"
          />
        </button>
      )}
      {trailingText && <span className={styles.trailingText}>{trailingText}</span>}
      {chevronDir && (
        <DownChevronIcon
          size={14}
          color="var(--neutral-300)"
          className={chevronDir === 'up' ? styles.chevronUp : styles.chevronDown}
        />
      )}
      {showTrailingButton && (
        <Button
          variant="tertiary"
          size="S"
          onClick={onTrailingButtonClick}
          className={styles.trailingButtonSlot}
        >
          {trailingButtonText}
        </Button>
      )}
      {characterLimit != null && (
        <span className={styles.characterLimit}>
          {currentLen}/{characterLimit}
        </span>
      )}
    </>
  ) : null;

  const shellCls = [
    styles.shell,
    isError ? styles.shellError : '',
    props.disabled ? styles.shellDisabled : '',
    props.readOnly ? styles.shellReadonly : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={[styles.field, wrapperClassName || ''].filter(Boolean).join(' ')}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          <span className={styles.labelText}>{label}</span>
          {showInfo && (
            <Icon
              name="solar:info-circle-linear"
              size={12}
              color="var(--neutral-300)"
              className={styles.labelInfo}
              title={infoText}
            />
          )}
          {required && <span className={styles.required} aria-hidden="true" />}
        </label>
      )}
      <div className={shellCls}>
        {leading}
        {bareInput}
        {trailing}
      </div>
      {typeof activeError === 'string' && activeError && (
        <span className={styles.errorText}>{activeError}</span>
      )}
      {!activeError && helperText && (
        <span className={styles.helperText}>{helperText}</span>
      )}
    </div>
  );
});
