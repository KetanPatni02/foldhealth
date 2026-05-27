import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { track } from '../../lib/tracking';
import { Input } from '../../components/Input/Input';
import { Button } from '../../components/Button/Button';
import { Icon } from '../../components/Icon/Icon';
import { FoldhealthLogo } from '../../components/FoldhealthLogo/FoldhealthLogo';
import loginHero from '../../assets/login-hero.png';
import styles from './LoginPage.module.css';

// Cooldown between transactional email sends (reset password / resend
// verification). Supabase's own rate limit is similar, but we surface
// this in the UI so users get a visible countdown rather than a silent
// failure.
const RESEND_COOLDOWN_SECONDS = 30;

export function LoginPage({ onBypass }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Tracks which email address has been confirmed-as-unverified by the
  // server. Set when signInWithPassword returns "Email not confirmed";
  // surfacing it lets us show an inline "Resend verification" action.
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  // Cooldown shared by reset-password + resend-verification sends.
  const [cooldown, setCooldown] = useState(0);

  // Tick the countdown timer once per second while a cooldown is active.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError('Please enter email and password'); return; }
    setLoading(true);
    setError('');
    setUnverifiedEmail('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      track('auth.login_failed', { method: 'password', reason: authError.message || 'unknown' });
      // Supabase returns "Email not confirmed" when the account exists but
      // the user hasn't clicked their verification link yet. Surface a
      // dedicated "Resend verification email" affordance instead of the
      // generic error so they can recover without contacting support.
      const isUnverified = /email not confirmed/i.test(authError.message || '');
      if (isUnverified) {
        setUnverifiedEmail(email.trim());
        setError('');
      } else {
        setError(authError.message === 'Invalid login credentials' ? 'Invalid email or password' : authError.message);
      }
    } else {
      track('auth.login_succeeded', { method: 'password' });
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e?.preventDefault?.();
    if (!email.trim()) { setError('Please enter your email'); return; }
    setLoading(true);
    setError('');
    setSuccess('');
    // No hash in redirectTo. Supabase appends its own #access_token=...
    // hash to whatever URL we give it — stacking that on top of our SPA's
    // hash route (#/reset-password#access_token=...) prevents supabase-js
    // from detecting the tokens, so the recovery session is never set.
    // We land on the bare origin; App.jsx's PASSWORD_RECOVERY listener
    // routes the user to ResetPasswordPage once supabase-js processes
    // the URL.
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    if (authError) {
      track('auth.password_reset_failed', { reason: authError.message || 'unknown' });
      setError(authError.message);
    } else {
      track('auth.password_reset_email_sent');
      setSuccess(`Reset link sent to ${email.trim()}. Check your inbox.`);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    }
    setLoading(false);
  };

  const handleResendVerification = async () => {
    const target = (unverifiedEmail || email).trim();
    if (!target) return;
    setLoading(true);
    setError('');
    setSuccess('');
    const { error: authError } = await supabase.auth.resend({ type: 'signup', email: target });
    if (authError) {
      track('auth.verification_email_failed', { reason: authError.message || 'unknown' });
      setError(authError.message);
    } else {
      track('auth.verification_email_sent');
      setSuccess(`Verification email sent to ${target}. Check your inbox.`);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    }
    setLoading(false);
  };

  const enterForgotMode = () => {
    setForgotMode(true);
    setError('');
    setSuccess('');
    setUnverifiedEmail('');
    setCooldown(0);
  };
  const exitForgotMode = () => {
    setForgotMode(false);
    setError('');
    setSuccess('');
    setCooldown(0);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) { setError('First name and last name are required'); return; }
    if (!email.trim() || !password.trim()) { setError('Please enter email and password'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    setSuccess('');
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { first_name: firstName.trim(), last_name: lastName.trim(), full_name: `${firstName.trim()} ${lastName.trim()}` },
      },
    });
    if (authError) {
      track('auth.signup_failed', { reason: authError.message || 'unknown' });
      setError(authError.message);
    } else {
      track('auth.signup_succeeded');
      setSuccess('Account created! Check your email to confirm, or sign in directly.');
      setIsSignUp(false);
      setConfirmPassword('');
    }
    setLoading(false);
  };

  const handleOAuthLogin = async (provider) => {
    setLoading(true);
    setError('');
    track('auth.oauth_initiated', { provider });
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (authError) {
      track('auth.login_failed', { method: provider, reason: authError.message || 'unknown' });
      setError(authError.message);
    }
    setLoading(false);
  };

  const handleSubmit = forgotMode ? handleForgotPassword : isSignUp ? handleSignUp : handleLogin;

  return (
    <div className={styles.page}>
      {/* Left panel — illustration */}
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

      {/* Right panel — login/signup form */}
      <div className={styles.rightPanel}>
        <div className={styles.formContainer}>
          {/* Logo */}
          <div className={styles.logo}>
            <FoldhealthLogo size={32} />
            <span className={styles.logoText}>Foldhealth</span>
          </div>

          {/* Welcome text */}
          <div className={styles.welcome}>
            <h1 className={styles.welcomeTitle}>
              {forgotMode ? (
                <>
                  <span className={styles.welcomePurple}>Reset </span>
                  <span className={styles.welcomeDark}>Password</span>
                </>
              ) : isSignUp ? (
                <>
                  <span className={styles.welcomePurple}>Create </span>
                  <span className={styles.welcomeDark}>Account</span>
                </>
              ) : (
                <>
                  <span className={styles.welcomePurple}>Welcome </span>
                  <span className={styles.welcomeDark}>Back!</span>
                </>
              )}
            </h1>
            <p className={styles.welcomeSub}>
              {forgotMode
                ? "Enter your email and we'll send you a reset link."
                : isSignUp
                  ? 'Sign up to get started with Fold Portal'
                  : 'Sign in to access your Fold Portal'}
            </p>
          </div>

          {/* Login/Signup form */}
          <form className={styles.form} onSubmit={handleSubmit}>
            {isSignUp && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className={styles.field}>
                  <label className={styles.label}>First Name <span style={{ color: 'var(--status-error)' }}>*</span></label>
                  <Input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="First name"
                    autoComplete="given-name"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Last Name <span style={{ color: 'var(--status-error)' }}>*</span></label>
                  <Input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Last name"
                    autoComplete="family-name"
                  />
                </div>
              </div>
            )}
            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@fold.health"
                autoComplete="email"
              />
            </div>

            {!forgotMode && (
              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label className={styles.label}>Password</label>
                  {!isSignUp && (
                    <button type="button" className={styles.forgotLink} onClick={enterForgotMode}>
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className={styles.passwordWrap}>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={isSignUp ? 'Min 6 characters' : 'Enter your password'}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
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
            )}

            {!forgotMode && isSignUp && (
              <div className={styles.field}>
                <label className={styles.label}>Confirm Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                />
              </div>
            )}

            {/* Unverified-email recovery — surfaced when login fails with
                Supabase's "Email not confirmed" error. */}
            {unverifiedEmail && !forgotMode && (
              <div className={styles.unverifiedNotice}>
                <Icon name="solar:letter-linear" size={14} color="var(--status-warning)" />
                <div className={styles.unverifiedBody}>
                  <strong>Verify your email to continue.</strong>{' '}
                  We sent a verification link to <strong>{unverifiedEmail}</strong>.
                  <button
                    type="button"
                    className={styles.unverifiedAction}
                    onClick={handleResendVerification}
                    disabled={loading || cooldown > 0}
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
                  </button>
                </div>
              </div>
            )}

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

            <Button
              variant="primary"
              size="L"
              fullWidth
              disabled={loading || (forgotMode && cooldown > 0)}
              type="submit"
            >
              {forgotMode
                ? (loading
                    ? 'Sending reset link...'
                    : cooldown > 0 ? `Resend in ${cooldown}s` : success ? 'Resend Reset Link' : 'Send Reset Link')
                : loading
                  ? (isSignUp ? 'Creating account...' : 'Signing in...')
                  : (isSignUp ? 'Create Account' : 'Login')}
            </Button>
          </form>

          {/* Mode-toggle row — Forgot returns a "Back to login" link;
              login/signup keep the original switch. */}
          {forgotMode ? (
            <div className={styles.toggleAuth}>
              <button
                type="button"
                className={styles.toggleLink}
                onClick={exitForgotMode}
              >
                <Icon name="solar:alt-arrow-left-linear" size={14} color="currentColor" />
                Back to login
              </button>
            </div>
          ) : (
            <div className={styles.toggleAuth}>
              <span className={styles.toggleText}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </span>
              <button
                type="button"
                className={styles.toggleLink}
                onClick={() => { setIsSignUp(v => !v); setError(''); setSuccess(''); setUnverifiedEmail(''); }}
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </div>
          )}

          {/* Divider */}
          <div className={styles.divider}>
            <span className={styles.dividerLine} />
            <span className={styles.dividerText}>or continue with</span>
            <span className={styles.dividerLine} />
          </div>

          {/* OAuth buttons */}
          <div className={styles.oauthRow}>
            <button className={styles.oauthBtn} onClick={() => handleOAuthLogin('google')} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.26c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
              Google
            </button>
            <div title="Coming Soon" style={{ flex: 1, display: 'flex' }}>
              <button className={styles.oauthBtn} disabled={true} style={{ cursor: 'not-allowed', width: '100%' }}>
                <svg width="18" height="18" viewBox="0 0 23 23"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
                Microsoft
              </button>
            </div>
          </div>

          {/* Dev bypass */}
          {onBypass && window.location.hostname === 'localhost' && (
            <button className={styles.bypassLink} onClick={onBypass}>
              Continue without login (dev mode)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
