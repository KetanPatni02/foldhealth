import { useState } from 'react';
import { Button } from '../Button/Button';
import styles from './CommentComposer.module.css';

/**
 * CommentComposer — shared textarea + Comment/Cancel actions used by the
 * TaskDetailDrawer and the DiagPanel Comments tab. Starts as a single-line
 * placeholder and expands to a 3-row textarea on focus with primary /
 * secondary action buttons.
 *
 * Props:
 *  - onSubmit(text)         Fires when the user clicks Comment. Trimmed body
 *                           is passed; parent clears its own state via return.
 *  - placeholder            Overrides the default placeholder.
 *  - autoFocus              Focus the textarea on mount.
 */
export function CommentComposer({
  onSubmit,
  placeholder = 'Add a comment, use @ to mention someone',
  autoFocus = false,
}) {
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(autoFocus);

  const submit = () => {
    const body = text.trim();
    if (!body) return;
    onSubmit?.(body);
    setText('');
    setExpanded(false);
  };
  const cancel = () => {
    setText('');
    setExpanded(false);
  };

  return (
    <div className={styles.wrap}>
      <textarea
        placeholder={placeholder}
        rows={expanded ? 3 : 1}
        className={styles.textarea}
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setExpanded(true)}
      />
      {expanded && (
        <div className={styles.actions}>
          <Button variant="primary" size="S" disabled={!text.trim()} onClick={submit}>
            Comment
          </Button>
          <Button variant="secondary" size="S" onClick={cancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
