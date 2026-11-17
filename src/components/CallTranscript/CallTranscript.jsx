import { useState } from 'react';
import { Avatar } from '../Avatar/Avatar';
import { ActionButton } from '../ActionButton/ActionButton';
import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import { DownChevronIcon } from '../Icon/DownChevronIcon';
import { Input } from '../Input/Input';
import { CollapsibleContent } from '../Collapsible/Collapsible';
import { copyFoldId as copyText } from '../../lib/foldId';
import { formatTranscript, speakerInitials } from './transcript';
import styles from './CallTranscript.module.css';

/**
 * CallTranscript: a collapsible card listing a call turn by turn (Figma
 * V2 HCC DEMO SIDE CAR 2383:121271). Header actions: search the turns, add
 * the transcript to a note, copy it.
 *
 * Props:
 *  - lines          [{ speaker, t, text }]
 *  - isStaff        (speaker) => boolean; staff speakers get the orange avatar
 *  - defaultOpen    start expanded (default false)
 *  - onAddToNote    (lines) => void; hides the action when absent
 *  - emptyContent   shown in the body when there are no lines (e.g. a paste box)
 *  - headerExtra    extra header actions, before the search
 */
export function CallTranscript({ lines = [], isStaff = () => false, defaultOpen = false, onAddToNote, emptyContent, headerExtra }) {
  const [open, setOpen] = useState(defaultOpen);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const has = lines.length > 0;
  const q = query.trim().toLowerCase();
  const shown = q ? lines.filter(l => `${l.speaker} ${l.text}`.toLowerCase().includes(q)) : lines;

  const copy = async () => {
    if (await copyText(formatTranscript(lines))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <button type="button" className={styles.toggle} onClick={() => setOpen(v => !v)} aria-expanded={open}>
          <Icon name="solar:document-text-linear" size={20} color="var(--neutral-300)" />
          <span className={styles.title}>Call Transcript</span>
          <DownChevronIcon size={16} color="var(--neutral-300)" style={open ? { transform: 'rotate(180deg)' } : undefined} />
        </button>
        {open && has && (
          <div className={styles.actions}>
            {headerExtra}
            <ActionButton size="sm" icon="solar:magnifer-linear" tooltip="Search" tooltipBelow active={searching}
              onClick={() => { setSearching(v => !v); setQuery(''); }} />
            {onAddToNote && (
              <>
                <span className={styles.divider} />
                <Button variant="ghost" tone="primary" size="sm" leadingIcon="solar:add-linear" onClick={() => onAddToNote(lines)}>
                  Add to Note
                </Button>
              </>
            )}
            <span className={styles.divider} />
            <ActionButton size="sm" icon={copied ? 'solar:check-read-linear' : 'solar:copy-linear'} tooltip={copied ? 'Copied' : 'Copy'} tooltipBelow tooltipLeft onClick={copy} />
          </div>
        )}
      </div>
      <CollapsibleContent open={open}>
        {has ? (
          <div className={styles.body}>
            {searching && (
              <Input size="sm" autoFocus placeholder="Search transcript" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search transcript" />
            )}
            <div className={styles.turns}>
              {shown.map((l, i) => (
                <div key={i} className={styles.turn}>
                  <div className={styles.rail}>
                    {l.speaker && <Avatar variant={isStaff(l.speaker) ? 'staff' : 'patient'} size="XS" initials={speakerInitials(l.speaker)} />}
                    <span className={styles.railLine} />
                  </div>
                  <div className={styles.turnBody}>
                    <div className={styles.turnHead}>
                      <span className={styles.speaker}>{l.speaker}</span>
                      {l.t && <span className={styles.time}>{l.t}</span>}
                    </div>
                    <p className={styles.text}>{l.text}</p>
                  </div>
                </div>
              ))}
              {q && shown.length === 0 && <p className={styles.text}>No lines match “{query.trim()}”.</p>}
              {!q && <p className={styles.text}>End of Call</p>}
            </div>
          </div>
        ) : (
          <div className={styles.body}>{emptyContent}</div>
        )}
      </CollapsibleContent>
    </div>
  );
}
