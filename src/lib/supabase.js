import { createClient } from '@supabase/supabase-js';

// Env vars win; the fallbacks cover a checkout with no env file. Dev builds
// fall back to the dev project (Foldhealth Dev) so a fresh checkout or
// worktree can never reach production by accident; production builds fall
// back to production. See docs/getting-started/dev-database.mdx.
// Anon keys are public client-side keys behind RLS, safe to embed.
const FALLBACK = import.meta.env.DEV
  ? {
    url: 'https://uwswpbiyhlmpnubxtipc.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3c3dwYml5aGxtcG51Ynh0aXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1NzkxNDYsImV4cCI6MjEwODE1NTE0Nn0.aeDSmCbStTBDWPjP_72Xi8JzpRZpkY5jB9yNQojp4qE',
  }
  : {
    url: 'https://osnihfqqrcchsaqhagcx.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zbmloZnFxcmNjaHNhcWhhZ2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNTI0NTksImV4cCI6MjA4OTgyODQ1OX0.ZuJQLMriqBcmf_nqLqcwu05x9BM5G_CAWz4R180xZ-w',
  };

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK.url;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK.anonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
});
