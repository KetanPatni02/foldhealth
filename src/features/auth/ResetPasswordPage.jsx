import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { track } from '../../lib/tracking';
import { Input } from '../../components/Input/Input';
import { Button } from '../../components/Button/Button';
import { Icon } from '../../components/Icon/Icon';
import { FoldhealthLogo } from '../../components/FoldhealthLogo/FoldhealthLogo';
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
  // null = still checking; true/false once known.
  const [hasSession, setHasSession] = useState(null);
  // Invited-user flow lands here for their first password — treat it as a
  // "Set Password" welcome rather than a recovery, and drop them straight
  // into the app on success instead of sending them back to login.
  const [isInvited, setIsInvited] = useState(false);

  // Detect whether Supabase managed to establish a recovery session from
  // the email link. If not, the recovery token is expired or the user
  // navigated here directly without a token — show a dead-end state with
  // a path back to login instead of letting them submit into a failure.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setIsInvited(session?.user?.user_metadata?.invited === 'true');
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    // Update the password and, for invited users, flip the metadata flag
    // in the same call so App.jsx doesn't loop them back here on refresh.
    const updates = isInvited
      ? { password, data: { invited: 'false' } }
      : { password };
    const { error: authError } = await supabase.auth.updateUser(updates);
    if (authError) {
      track('auth.password_reset_failed', { reason: authError.message || 'unknown', stage: 'update' });
      const friendly = /Auth session missing/i.test(authError.message || '')
        ? 'Your link has expired. Ask your admin to resend the invite or use "Forgot password" from the login page.'
        : authError.message;
      setError(friendly);
      setLoading(false);
      return;
    }
    track(isInvited ? 'auth.invite_accepted' : 'auth.password_reset_completed');
    if (isInvited) {
      // Session is already valid — send them into the app.
      setSuccess('Password set. Welcome to Foldhealth!');
      setTimeout(() => { onDone?.({ enterApp: true }); }, 900);
    } else {
      setSuccess('Password updated. Redirecting to login...');
      await supabase.auth.signOut();
      setTimeout(() => { onDone?.(); }, 1200);
    }
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
            <FoldhealthLogo size={32} />
            <span className={styles.logoText}>Foldhealth</span>
          </div>

          <div className={styles.welcome}>
            <h1 className={styles.welcomeTitle}>
              {hasSession === false ? (
                <>
                  <span className={styles.welcomePurple}>Link </span>
                  <span className={styles.welcomeDark}>Expired</span>
                </>
              ) : isInvited ? (
                <>
                  <span className={styles.welcomePurple}>Set your </span>
                  <span className={styles.welcomeDark}>Password</span>
                </>
              ) : (
                <>
                  <span className={styles.welcomePurple}>Set a </span>
                  <span className={styles.welcomeDark}>New Password</span>
                </>
              )}
            </h1>
            <p className={styles.welcomeSub}>
              {hasSession === false
                ? 'This link is no longer valid. Ask your admin to resend the invite or request a new reset link from the login page.'
                : isInvited
                ? 'Welcome! Choose a password to finish setting up your account.'
                : 'Choose a new password to finish recovering your account.'}
            </p>
          </div>

          {hasSession === false ? (
            <div className={styles.form}>
              <div className={styles.error}>
                <Icon name="solar:danger-triangle-linear" size={14} color="var(--status-error)" />
                Reset links expire shortly after they're sent and can only be used once.
              </div>
              <Button variant="primary" size="L" fullWidth onClick={() => onDone?.()}>
                Back to Login
              </Button>
            </div>
          ) : (
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
              {loading
                ? (isInvited ? 'Setting password...' : 'Updating password...')
                : (isInvited ? 'Set Password' : 'Update Password')}
            </Button>
          </form>
          )}

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
