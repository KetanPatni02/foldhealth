import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/Input/Input';
import { Button } from '@/components/Button/Button';
import { Icon } from '@/components/Icon/Icon';
import { FoldHealthLogo } from '@/components/FoldHealthLogo/FoldHealthLogo';
import styles from './LoginPage.module.css';

const MIN_LENGTH = 8;

// `token` comes from an invite or reset email (lib/inviteToken.js). It is
// redeemed only on submit, so a mail scanner opening the link can't spend it.
export function SetPasswordPage({ token, onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < MIN_LENGTH) { setError(`Use at least ${MIN_LENGTH} characters.`); return; }
    if (password !== confirm) { setError('The two passwords do not match.'); return; }
    setLoading(true);
    setError('');
    if (token) {
      const { error: otpError } = await supabase.auth.verifyOtp({ type: token.type, token_hash: token.tokenHash });
      // A failed submit after a successful verify leaves a session; carry on with it.
      const { data } = await supabase.auth.getSession();
      if (otpError && !data.session) {
        setError('This link has expired or was already used. Ask your care team to send a new invite.');
        setLoading(false);
        return;
      }
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) setError(updateError.message);
    else onDone?.();
  };

  return (
    <main className={styles.page}>
      <div className={styles.side} style={{ gridColumn: '1 / -1' }}>
        <form className={styles.card} onSubmit={handleSubmit} noValidate>
          <div className={styles.brand}>
            <FoldHealthLogo size={44} color="var(--primary-400)" />
            <span className={styles.brandName}>Foldhealth</span>
          </div>
          {token && <p className={styles.info}>Choose a password for your Fold Health patient portal.</p>}
          {error && (
            <p className={styles.error} role="alert">
              <Icon name="solar:danger-triangle-linear" size={14} color="var(--status-error)" />
              {error}
            </p>
          )}
          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            showPasswordToggle
          />
          <Input
            label="Confirm new password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          <Button variant="primary" size="L" fullWidth type="submit" disabled={loading || !password || !confirm}>
            {loading ? 'Saving…' : 'Set password'}
          </Button>
        </form>
      </div>
    </main>
  );
}
