import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { track } from '../../lib/tracking';
import { Input } from '../../components/Input/Input';
import { Button } from '../../components/Button/Button';
import { Icon } from '../../components/Icon/Icon';
import loginHero from '../../assets/login-hero.png';
import styles from './LoginPage.module.css';

/**
 * ResetPasswordPage — shown when the user arrives via a Supabase
 * password-recovery email link.
 *
 * App.jsx routes to this page when:
 *   1. supabase.auth.onAuthStateChange fires PASSWORD_RECOVERY, or
 *   2. the URL hash is #/reset-password (covers manual navigation).
 *
 * Supabase has already exchanged the recovery token for a session by
 * the time we render. We DO NOT sign the user in — we hold them on
 * this page until they submit a new password, then sign them out and
 * send them back to login.
 */
export function ResetPasswordPage({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.updateUser({ password });
    if (authError) {
      track('auth.password_reset_failed', { reason: authError.message || 'unknown', stage: 'update' });
      setError(authError.message);
      setLoading(false);
      return;
    }
    track('auth.password_reset_completed');
    setSuccess('Password updated. Redirecting to login...');
    // Sign out so the user re-authenticates with the new password.
    await supabase.auth.signOut();
    setTimeout(() => { onDone?.(); }, 1200);
  };

  return (
    <div className={styles.page}>
      <div className={styles.leftPanel}>
        <div className={styles.heroWrap}>
          <div className={styles.gridBg} />
          <img src={loginHero} alt="Healthcare illustration" className={styles.heroImg} />
        </div>
        <div className={styles.dots}>
          <span className={styles.dotActive} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.formContainer}>
          <div className={styles.logo}>
            <svg width="32" height="32" viewBox="0 0 290 290" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M290 145C290 159.088 284.404 172.599 274.442 182.561C264.48 192.522 250.969 198.119 236.881 198.119H145C137.334 198.119 129.839 200.392 123.465 204.651C117.09 208.911 112.122 214.965 109.188 222.047C106.254 229.13 105.487 236.924 106.982 244.443C108.478 251.962 112.17 258.869 117.591 264.29C123.012 269.711 129.919 273.403 137.438 274.899C144.957 276.394 152.751 275.627 159.834 272.693C166.917 269.759 172.97 264.791 177.23 258.416C181.489 252.042 183.762 244.548 183.762 236.881V212.475C183.762 210.571 184.519 208.746 185.865 207.399C187.211 206.053 189.037 205.297 190.941 205.297C192.844 205.297 194.67 206.053 196.016 207.399C197.363 208.746 198.119 210.571 198.119 212.475V236.881C198.119 247.387 195.003 257.657 189.167 266.392C183.33 275.128 175.034 281.936 165.328 285.957C155.622 289.977 144.941 291.029 134.637 288.979C124.333 286.93 114.868 281.871 107.439 274.442C100.011 267.013 94.9515 257.548 92.9019 247.244C90.8523 236.94 91.9042 226.26 95.9246 216.553C99.9451 206.847 106.753 198.551 115.489 192.714C124.224 186.878 134.494 183.762 145 183.762H236.881C247.162 183.762 257.021 179.678 264.29 172.409C271.56 165.14 275.644 155.28 275.644 145C275.644 134.72 271.56 124.86 264.29 117.591C257.021 110.321 247.162 106.238 236.881 106.238H212.475C210.571 106.238 208.746 105.481 207.4 104.135C206.053 102.789 205.297 100.963 205.297 99.0594C205.297 97.1556 206.053 95.3298 207.4 93.9836C208.746 92.6375 210.571 91.8812 212.475 91.8812H236.881C250.969 91.8812 264.48 97.4776 274.442 107.439C284.404 117.401 290 130.912 290 145Z" fill="#8C5AE2" />
            </svg>
            <span className={styles.logoText}>Foldhealth</span>
          </div>

          <div className={styles.welcome}>
            <h1 className={styles.welcomeTitle}>
              <span className={styles.welcomePurple}>Set a </span>
              <span className={styles.welcomeDark}>New Password</span>
            </h1>
            <p className={styles.welcomeSub}>
              Choose a new password to finish recovering your account.
            </p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.label}>New Password</label>
              <div className={styles.passwordWrap}>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  <Icon name={showPassword ? 'solar:eye-linear' : 'solar:eye-closed-linear'} size={16} color="#8A94A8" />
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Confirm New Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className={styles.error}>
                <Icon name="solar:danger-triangle-linear" size={14} color="var(--status-error)" />
                {error}
              </div>
            )}
            {success && (
              <div className={styles.success}>
                <Icon name="solar:check-circle-linear" size={14} color="var(--status-success)" />
                {success}
              </div>
            )}

            <Button variant="primary" size="L" fullWidth disabled={loading} type="submit">
              {loading ? 'Updating password...' : 'Update Password'}
            </Button>
          </form>

          <div className={styles.toggleAuth}>
            <button
              type="button"
              className={styles.toggleLink}
              onClick={() => onDone?.()}
            >
              <Icon name="solar:alt-arrow-left-linear" size={14} color="currentColor" />
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
