// The Supabase projects' URLs and public anon keys (RLS applies), shared by
// the browser client and the API's sign-in check so both fall back to the
// same project when VITE_SUPABASE_* aren't set: dev builds use the dev
// project (Foldhealth Dev) so a fresh checkout can never reach production
// by accident; production builds use production. Plain module: no
// import.meta, safe in Node. See docs/getting-started/dev-database.mdx.
export const SUPABASE_PROJECTS = {
  dev: {
    url: 'https://uwswpbiyhlmpnubxtipc.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3c3dwYml5aGxtcG51Ynh0aXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1NzkxNDYsImV4cCI6MjEwODE1NTE0Nn0.aeDSmCbStTBDWPjP_72Xi8JzpRZpkY5jB9yNQojp4qE',
  },
  prod: {
    url: 'https://osnihfqqrcchsaqhagcx.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zbmloZnFxcmNjaHNhcWhhZ2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNTI0NTksImV4cCI6MjA4OTgyODQ1OX0.ZuJQLMriqBcmf_nqLqcwu05x9BM5G_CAWz4R180xZ-w',
  },
};
