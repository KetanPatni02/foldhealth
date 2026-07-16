-- ============================================================
-- profiles: admins can update any profile
--
-- The Users table in Settings → Users lets Admin/Practice Manager
-- (and Business/Practice Owner) edit anyone's profile — including
-- assigning Coder / QA / Compliance clinical roles. But the existing
-- RLS policy on `profiles` restricts authenticated UPDATE to
-- `auth.uid() = id` (self-only). That's why writes against another
-- user's row return 0 rows and the UI falls back to
-- "Permission denied".
--
-- This migration adds a second UPDATE policy that lets an admin —
-- identified by their own profile's `admin_role` or `clinical_roles`
-- — update any row. Admins are: 'Admin/Practice Manager' and
-- 'Business/Practice Owner' in admin_role, or 'Admin/Practice
-- Manager' in clinical_roles (matches the client-side isAdmin check
-- in AccountPanel.jsx around line 292–295).
-- ============================================================

DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_p
      WHERE admin_p.id = auth.uid()
        AND (
          admin_p.admin_role IN ('Admin/Practice Manager', 'Business/Practice Owner')
          OR 'Admin/Practice Manager' = ANY(admin_p.clinical_roles)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles admin_p
      WHERE admin_p.id = auth.uid()
        AND (
          admin_p.admin_role IN ('Admin/Practice Manager', 'Business/Practice Owner')
          OR 'Admin/Practice Manager' = ANY(admin_p.clinical_roles)
        )
    )
  );

-- Verify:
--   SELECT policyname, cmd, roles FROM pg_policies
--    WHERE tablename = 'profiles' AND cmd = 'UPDATE';
--   -- Expected: BOTH "Users can update own profile" AND "Admins can
--   -- update any profile" — Postgres OR's policies of the same command,
--   -- so admins get both, non-admins get only self-edit.
