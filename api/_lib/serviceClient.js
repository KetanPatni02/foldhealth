import { createClient } from '@supabase/supabase-js';
import { SUPABASE_PROJECTS } from '../../src/lib/supabaseConfig.js';

/**
 * Service-role Supabase client for server routes that must act past RLS
 * (account lockout, password reset). Null when the server env is missing
 * SUPABASE_SERVICE_ROLE_KEY; callers answer 500 then.
 */
const configuredUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const url = process.env.VERCEL_ENV === 'preview' && (!configuredUrl || configuredUrl.includes('osnihfqqrcchsaqhagcx'))
  ? SUPABASE_PROJECTS.dev.url
  : configuredUrl;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const serviceClient = url && key
  ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  : null;

const ADMIN_ROLES = ['Admin/Practice Manager', 'Business/Practice Owner'];

/** Same rule as public.is_profile_admin: an active practice admin. */
export function isPracticeAdmin(profile) {
  if (!profile || profile.status !== 'Active') return false;
  return ADMIN_ROLES.includes(profile.admin_role)
    || (profile.clinical_roles || []).includes('Admin/Practice Manager');
}
