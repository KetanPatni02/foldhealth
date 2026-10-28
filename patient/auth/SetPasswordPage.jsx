import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/Input/Input';
import { Button } from '@/components/Button/Button';
import { Icon } from '@/components/Icon/Icon';
import { FoldHealthLogo } from '@/components/FoldHealthLogo/FoldHealthLogo';
import styles from './LoginPage.module.css';

const MIN_LENGTH = 8;

export function SetPasswordPage() {
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
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) setError(updateError.message);
    setLoading(false);
  };

  return (
    <main className={styles.page}>
      <div className={styles.side} style={{ gridColumn: '1 / -1' }}>
        <form className={styles.card} onSubmit={handleSubmit} noValidate>
          <div className={styles.brand}>
            <FoldHealthLogo size={44} color="var(--primary-400)" />
            <span className={styles.brandName}>Foldhealth</span>
          </div>
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
