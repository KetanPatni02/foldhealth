import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ShadcnDialog/ShadcnDialog';
import { ActionButton } from '../ActionButton/ActionButton';
import { Icon } from '../Icon/Icon';
import styles from './SlideshowDialog.module.css';

const prefersReducedMotion = () => typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * SlideshowDialog: a two-pane walkthrough. The left pane lists the steps
 * (icon tile, title, one-line summary) with the current one marked by an
 * accent bar; the right pane shows that step's slide: a preview area, a
 * heading and a description. Steps advance on their own every `autoplayMs`
 * (the accent bar fills as the timer runs, and pauses while the pointer is
 * over the dialog) until the reader picks a step or uses Previous / Next.
 * No autoplay under prefers-reduced-motion.
 *
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.subtitle]
 * @param {React.ReactNode} [props.leading] – above the title (a logo, an avatar)
 * @param {Array<{ key: string, icon: string, iconColor?: string, title: string, summary?: React.ReactNode,
 *   heading?: React.ReactNode, description?: React.ReactNode, preview?: React.ReactNode,
 *   primary?: React.ReactNode }>} props.steps
 * @param {React.ReactNode} [props.footerStart] – left pane footer (secondary links)
 * @param {number} [props.autoplayMs=7000] – 0 turns autoplay off
 */
export function SlideshowDialog({
  open, onOpenChange, title, subtitle, leading, steps, footerStart, autoplayMs = 7000,
}) {
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);
  const [paused, setPaused] = useState(false);
  const count = steps.length;
  const current = Math.min(index, Math.max(0, count - 1));
  const step = steps[current];
  const playing = open && auto && autoplayMs > 0 && current < count - 1 && !prefersReducedMotion();

  // Each opening starts from the first step with autoplay on.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setIndex(0);
      setAuto(true);
    }
  }

  const go = (i) => {
    setAuto(false);
    setIndex(Math.max(0, Math.min(count - 1, i)));
  };

  const onKeyDown = (e) => {
    if (e.target.closest?.('input, textarea, [contenteditable]')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={styles.dialog}
        onKeyDown={onKeyDown}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
      >
        <div className={styles.panes}>
          <div className={styles.left}>
            <div className={styles.head}>
              {leading && <div className={styles.leading}>{leading}</div>}
              <DialogTitle className={styles.title}>{title}</DialogTitle>
              {subtitle && <DialogDescription className={styles.subtitle}>{subtitle}</DialogDescription>}
            </div>
            <ol className={styles.steps}>
              {steps.map((s, i) => {
                const active = i === current;
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      className={`${styles.step} ${active ? styles.stepActive : ''}`}
                      aria-current={active ? 'step' : undefined}
                      onClick={() => go(i)}
                    >
                      <span className={styles.bar} aria-hidden="true">
                        {active && (
                          <span
                            // Remount per step so the fill restarts.
                            key={`${s.key}-${playing}`}
                            className={`${styles.barFill} ${playing ? styles.barPlaying : ''}`}
                            style={{
                              animationDuration: `${autoplayMs}ms`,
                              animationPlayState: paused ? 'paused' : 'running',
                            }}
                            onAnimationEnd={() => setIndex(v => Math.min(count - 1, v + 1))}
                          />
                        )}
                      </span>
                      <span className={styles.tile}>
                        <Icon name={s.icon} size={16} color={s.iconColor || 'var(--neutral-400)'} />
                      </span>
                      <span className={styles.stepText}>
                        <span className={styles.stepTitle}>{s.title}</span>
                        {s.summary && <span className={styles.stepSummary}>{s.summary}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {footerStart && <div className={`${styles.footer} ${styles.footerStart}`}>{footerStart}</div>}
          </div>

          <div className={styles.right}>
            {step && (
              <div key={step.key} className={styles.slide}>
                <div className={styles.preview}>{step.preview}</div>
                <div className={styles.copy}>
                  <h3 className={styles.heading}>{step.heading ?? step.title}</h3>
                  {step.description && <p className={styles.description}>{step.description}</p>}
                </div>
              </div>
            )}
            <div className={`${styles.footer} ${styles.footerEnd}`}>
              <span className={styles.position}>{count ? `${current + 1} of ${count}` : ''}</span>
              <ActionButton icon="solar:alt-arrow-left-linear" size="S" tooltip="Previous" disabled={current === 0} onClick={() => go(current - 1)} />
              <ActionButton icon="solar:alt-arrow-right-linear" size="S" tooltip="Next" disabled={current >= count - 1} onClick={() => go(current + 1)} />
              {step?.primary && <span className={styles.primary}>{step.primary}</span>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
