import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
} from './AlertDialogPrimitives';
import { Icon } from '../Icon/Icon';
import { Button } from '../Button/Button';
import { Checkbox } from '../ShadcnCheckbox/ShadcnCheckbox';

const VARIANT_DEFAULTS = {
  warning: { icon: 'solar:danger-triangle-linear', iconColor: 'var(--status-error)', button: 'danger' },
  destructive: { icon: 'solar:danger-circle-bold', iconColor: 'var(--status-error)', button: 'danger' },
  primary: { icon: 'solar:info-circle-linear', iconColor: 'var(--primary-300)', button: 'primary' },
  // `error` retained as an alias for existing callers — same look as `warning`.
  error: { icon: 'solar:danger-triangle-linear', iconColor: 'var(--status-error)', button: 'danger' },
};

/**
 * Reusable confirmation dialog — matches Fold Health design system.
 *
 * Pick a `variant` for the canonical look, or override individual props
 * (icon, iconColor, confirmLabel) when a specific caller needs it.
 *
 * @param {object}   props
 * @param {'warning'|'destructive'|'primary'} props.variant – Preset look.
 *   'warning' (default) = triangle-linear icon + danger button.
 *   'destructive' = filled danger-circle icon + danger button (delete/discard).
 *   'primary' = info icon + primary button.
 * @param {string}   props.icon        – Override the variant's default Iconify name.
 * @param {string}   props.iconColor   – Override icon color.
 * @param {string}   props.title       – Dialog heading.
 * @param {string}   props.description – Supporting text.
 * @param {string}   props.confirmLabel – Label for the primary action button.
 * @param {string}   props.cancelLabel  – Label for the cancel button.
 * @param {function} props.onConfirm   – Called when user clicks the primary action.
 * @param {function} props.onCancel    – Called when user clicks cancel or overlay.
 * @param {boolean}  props.loading     – If true, disable buttons and show loading text.
 * @param {string}   [props.overlayClassName] – Override the scrim utility class
 *   (defaults to the shared `bg-black/40`), e.g. `bg-black/25` for a lighter
 *   backdrop.
 * @param {boolean}  [props.inline=false] – Render the same dialog in place,
 *   with no scrim and without taking focus, for a question that mustn't block
 *   the page (e.g. the CCM timer's inactivity reminder). The caller positions
 *   it.
 * @param {{label: string, checked: boolean, onChange: function}} [props.checkbox] –
 *   An option that rides along with either answer ("Don't show this message
 *   again"), shown above the buttons. The caller holds its state.
 * @param {'center'|'start'} [props.align='center'] – 'start' lays it out
 *   left-aligned: the icon inline with the title, the description under them,
 *   then the checkbox and the buttons (Figma Dialog Box 2, 2810:68907).
 * @param {'S'|'L'|'XL'} [props.buttonSize='L']
 * @param {string}   [props.className] – Extra class on the dialog box.
 */
export function ConfirmDialog({
  variant = 'warning',
  icon,
  iconColor,
  title = 'Are you sure?',
  description = '',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  overlayClassName,
  inline = false,
  checkbox,
  align = 'center',
  buttonSize = 'L',
  className,
}) {
  const preset = VARIANT_DEFAULTS[variant] ?? VARIANT_DEFAULTS.warning;
  const resolvedIcon = icon ?? preset.icon;
  const resolvedIconColor = iconColor ?? preset.iconColor;

  // Inline, the Radix title/description (which need the dialog root) give
  // way to plain elements with the same look.
  const Title = inline ? 'h2' : AlertDialogTitle;
  const Description = inline ? 'p' : AlertDialogDescription;
  const start = align === 'start';
  const boxClass = [
    start ? 'flex flex-col items-stretch gap-6 p-5 max-w-[400px]' : 'flex flex-col items-center gap-4 p-5 max-w-[340px]',
    className,
  ].filter(Boolean).join(' ');

  const iconEl = <Icon name={resolvedIcon} size={24} color={resolvedIconColor} />;
  const titleEl = (
    <Title className="m-0 text-base font-medium text-[var(--neutral-400)] leading-tight">
      {title}
    </Title>
  );
  const descriptionEl = description && (
    <Description className="m-0 text-sm font-normal text-[var(--neutral-200)] leading-snug">
      {description}
    </Description>
  );
  const checkboxEl = checkbox && (
    <label className="flex items-center gap-2 self-start text-sm text-[var(--neutral-300)] cursor-pointer select-none">
      <Checkbox checked={!!checkbox.checked} onCheckedChange={(c) => checkbox.onChange(!!c)} />
      {checkbox.label}
    </label>
  );
  const footerEl = (
    <AlertDialogFooter className="flex-row justify-center w-full gap-2 mt-0">
      <Button variant="secondary" size={buttonSize} onClick={onCancel} disabled={loading} className="flex-1">
        {cancelLabel}
      </Button>
      <Button variant={preset.button} size={buttonSize} onClick={onConfirm} disabled={loading} className="flex-1">
        {loading ? 'Processing…' : confirmLabel}
      </Button>
    </AlertDialogFooter>
  );

  const content = start ? (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          {iconEl}
          {titleEl}
        </div>
        {descriptionEl}
      </div>
      <div className="flex flex-col gap-3">
        {checkboxEl}
        {footerEl}
      </div>
    </>
  ) : (
    <>
      <div className="flex items-center justify-center w-6 h-6 shrink-0">{iconEl}</div>
      <AlertDialogHeader className="items-center text-center sm:text-center gap-1">
        {titleEl}
        {descriptionEl}
      </AlertDialogHeader>
      {checkboxEl}
      {footerEl}
    </>
  );

  if (inline) {
    return (
      <div
        role="alertdialog"
        aria-label={title}
        className={`${boxClass} w-full rounded-xl bg-popover border border-border`}
      >
        {content}
      </div>
    );
  }

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onCancel?.(); }}>
      <AlertDialogContent className={boxClass} overlayClassName={overlayClassName}>
        {content}
      </AlertDialogContent>
    </AlertDialog>
  );
}
