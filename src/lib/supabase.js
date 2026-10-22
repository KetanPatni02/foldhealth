import { createClient } from '@supabase/supabase-js';
import { SUPABASE_PROJECTS } from './supabaseConfig';

// Env vars win; the fallback is the dev project in dev builds, production in
// production builds (see supabaseConfig.js).
const FALLBACK = import.meta.env.DEV ? SUPABASE_PROJECTS.dev : SUPABASE_PROJECTS.prod;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK.url;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK.anonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
});
