import { useEffect, useRef, useState, lazy, Suspense } from 'react';
const Analytics = lazy(() => import('@vercel/analytics/react').then(m => ({ default: m.Analytics })).catch(() => ({ default: () => null })));
const SpeedInsights = lazy(() => import('@vercel/speed-insights/react').then(m => ({ default: m.SpeedInsights })).catch(() => ({ default: () => null })));
import { AppLayout } from './layouts/AppLayout';
import { UpdateAvailableBanner } from './components/UpdateAvailableBanner/UpdateAvailableBanner';
import { LoginPage } from './features/auth/LoginPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { useAppStore } from './store/useAppStore';
import { supabase } from './lib/supabase';
import { initRouter } from './lib/router';
import { track, trackPageview } from './lib/tracking';

// Public, shareable form fill-view (#/f/{id}) — rendered without auth so a
// link can be opened by anyone. RLS on forms/form_responses ('Allow all')
// permits anonymous read + submit.
const PublicFormView = lazy(() => import('./features/forms/view/FormView').then(m => ({ default: m.FormView })));

function App() {
  const routerInit = useRef(false);
  const [session, setSession] = useState(undefined); // undefined = loading, null = unauthenticated
  const [bypassed, setBypassed] = useState(() => sessionStorage.getItem('__auth_bypass') === 'true');
  // Set when Supabase fires PASSWORD_RECOVERY OR when the URL hash carries
  // the recovery tokens directly (e.g. before supabase-js has processed
  // them). Initial check handles the brief window between mount and the
  // PASSWORD_RECOVERY event firing. `type=signup` covers invited users
  // arriving via the confirmation email — we route them to the same page
  // to set an initial password (see `invited` metadata check below).
  const [recoveryMode, setRecoveryMode] = useState(() => {
    const h = window.location.hash || '';
    return /type=recovery/.test(h) || /type=signup/.test(h) || h.startsWith('#/reset-password');
  });
  // Track the hash so the public-form route reacts to navigation.
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHash = () => {
      const newHash = window.location.hash;
      setHash(newHash);
      const path = newHash.replace(/^#/, '') || '/';
      trackPageview(path);
    };
    window.addEventListener('hashchange', onHash);
    
    // Also track the initial page view since Vercel's default page view 
    // will just be for '/' and won't include the initial hash path.
    const initialPath = window.location.hash.replace(/^#/, '') || '/';
    trackPageview(initialPath);
    
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    // Subscribe FIRST so we never miss PASSWORD_RECOVERY, which can fire
    // synchronously from inside the first getSession() call when there
    // are recovery tokens in the URL.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      // Sentry/Vercel events for major auth transitions. Supabase emits
      // SIGNED_IN once after a successful login (covers password, OAuth
      // callback, and magic-link), and SIGNED_OUT on logout. PASSWORD_RECOVERY
      // fires when the user lands here via a password-reset email link;
      // hold them on ResetPasswordPage instead of dropping into the app.
      if (event === 'SIGNED_OUT') {
        track('auth.logout');
        setRecoveryMode(false);
      } else if (event === 'SIGNED_IN') {
        track('auth.session_established');
        // Invited users arrive here via the confirmation email with a
        // placeholder password. Keep them on ResetPasswordPage so they
        // can set a real one before dropping into the app.
        if (s?.user?.user_metadata?.invited === 'true') {
          setRecoveryMode(true);
        }
      } else if (event === 'PASSWORD_RECOVERY') {
        track('auth.password_recovery_started');
        setRecoveryMode(true);
      }
      setSession(s);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s?.user?.user_metadata?.invited === 'true') {
        setRecoveryMode(true);
      }
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initialize hash router (once)
  useEffect(() => {
    if (!routerInit.current) {
      routerInit.current = true;
      initRouter(useAppStore);
      // Smoke test — confirms the analytics + Sentry breadcrumb pipeline is
      // live on app boot. Remove once full coverage is in place.
      track('app.booted');
    }
  }, []);

  const isAuthenticated = session || bypassed;

  // Password recovery — must short-circuit before the regular auth
  // branches. The recovery email gives the user a temporary session, so
  // we'd otherwise drop them straight into the app with no way to set
  // a new password. onDone signs them out and clears the flag.
  if (recoveryMode) {
    return (
      <ResetPasswordPage
        onDone={(opts) => {
          setRecoveryMode(false);
          if (opts?.enterApp) {
            // Invited user just set their first password — session is
            // valid, drop them straight into the app.
            window.location.hash = '#/home';
          } else {
            window.location.hash = '#/login';
          }
        }}
      />
    );
  }

  // Loading state while checking auth
  if (session === undefined && !bypassed) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontFamily: "'Inter', sans-serif", color: 'var(--neutral-200)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <svg width="40" height="40" viewBox="0 0 290 290" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M290 145C290 159.088 284.404 172.599 274.442 182.561C264.48 192.522 250.969 198.119 236.881 198.119H145C137.334 198.119 129.839 200.392 123.465 204.651C117.09 208.911 112.122 214.965 109.188 222.047C106.254 229.13 105.487 236.924 106.982 244.443C108.478 251.962 112.17 258.869 117.591 264.29C123.012 269.711 129.919 273.403 137.438 274.899C144.957 276.394 152.751 275.627 159.834 272.693C166.917 269.759 172.97 264.791 177.23 258.416C181.489 252.042 183.762 244.548 183.762 236.881V212.475C183.762 210.571 184.519 208.746 185.865 207.399C187.211 206.053 189.037 205.297 190.941 205.297C192.844 205.297 194.67 206.053 196.016 207.399C197.363 208.746 198.119 210.571 198.119 212.475V236.881C198.119 247.387 195.003 257.657 189.167 266.392C183.33 275.128 175.034 281.936 165.328 285.957C155.622 289.977 144.941 291.029 134.637 288.979C124.333 286.93 114.868 281.871 107.439 274.442C100.011 267.013 94.9515 257.548 92.9019 247.244C90.8523 236.94 91.9042 226.26 95.9246 216.553C99.9451 206.847 106.753 198.551 115.489 192.714C124.224 186.878 134.494 183.762 145 183.762H236.881C247.162 183.762 257.021 179.678 264.29 172.409C271.56 165.14 275.644 155.28 275.644 145C275.644 134.72 271.56 124.86 264.29 117.591C257.021 110.321 247.162 106.238 236.881 106.238H212.475C210.571 106.238 208.746 105.481 207.4 104.135C206.053 102.789 205.297 100.963 205.297 99.0594C205.297 97.1556 206.053 95.3298 207.4 93.9836C208.746 92.6375 210.571 91.8812 212.475 91.8812H236.881C250.969 91.8812 264.48 97.4776 274.442 107.439C284.404 117.401 290 130.912 290 145Z" fill="var(--primary-300)" opacity="0.3"/>
          </svg>
          <div style={{ marginTop: 12, fontSize: 14 }}>Loading...</div>
        </div>
      </div>
    );
  }

  // Public shareable form link — render the fill-view without auth so anyone
  // with the link can fill + submit. Authenticated users fall through to the
  // in-app takeover (AppLayout) which adds the close-to-chat affordance.
  const publicFormMatch = hash.match(/^#\/f\/([^/?#]+)/);
  if (publicFormMatch && !isAuthenticated) {
    const fid = isNaN(Number(publicFormMatch[1])) ? publicFormMatch[1] : Number(publicFormMatch[1]);
    return (
      <Suspense fallback={<div style={{ height: '100vh' }} />}>
        <PublicFormView id={fid} isPublic />
      </Suspense>
    );
  }

  // Not authenticated — show login
  if (!isAuthenticated) {
    if (window.location.hash !== '#/login') window.location.hash = '#/login';
    return <LoginPage onBypass={() => { track('auth.bypass_used'); sessionStorage.setItem('__auth_bypass', 'true'); setBypassed(true); window.location.hash = '#/home'; }} />;
  }

  // Authenticated — clear login hash if present
  if (window.location.hash === '#/login' || window.location.hash === '') {
    window.location.hash = '#/home';
  }

  // Authenticated — show app
  return (
    <Suspense fallback={null}>
      <UpdateAvailableBanner />
      <AppLayout />
      <Analytics />
      <SpeedInsights />
    </Suspense>
  );
}

export default App;
