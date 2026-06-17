-- ============================================================
-- population_groups table
-- Stores audience / population groups created from the Population
-- Groups screen (static lists from CSV upload, or dynamic rule-based
-- segments). Each row is one saved group shown in the groups table.
--
-- Run in the Supabase SQL editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS population_groups (
    -- Identity
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    description     TEXT,

    -- Classification
    group_type      TEXT NOT NULL CHECK (group_type IN ('Static', 'Dynamic')) DEFAULT 'Static',
    filter_type     TEXT,                       -- chosen filter / rule source (nullable)
    member_status   TEXT DEFAULT 'All Status',  -- Fold membership status scope

    -- Membership snapshot (matched patient ids from the upload / rule run)
    member_ids      JSONB DEFAULT '[]'::jsonb,
    active_count    INT  DEFAULT 0,
    inactive_count  INT  DEFAULT 0,

    -- Audit
    created_by      UUID,                        -- auth.uid() of creator (nullable for dev/no-JWT)
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common filters / searches
CREATE INDEX IF NOT EXISTS population_groups_name_idx        ON population_groups (name);
CREATE INDEX IF NOT EXISTS population_groups_type_idx        ON population_groups (group_type);
CREATE INDEX IF NOT EXISTS population_groups_created_at_idx  ON population_groups (created_at DESC);
CREATE INDEX IF NOT EXISTS population_groups_member_ids_gin  ON population_groups USING GIN (member_ids);

-- Keep updated_at fresh on every update
CREATE OR REPLACE FUNCTION population_groups_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS population_groups_touch ON population_groups;
CREATE TRIGGER population_groups_touch
    BEFORE UPDATE ON population_groups
    FOR EACH ROW
    EXECUTE FUNCTION population_groups_touch_updated_at();

-- Default created_by to the authenticated user when present
CREATE OR REPLACE FUNCTION population_groups_set_created_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_by = COALESCE(NEW.created_by, auth.uid());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS population_groups_created_by ON population_groups;
CREATE TRIGGER population_groups_created_by
    BEFORE INSERT ON population_groups
    FOR EACH ROW
    EXECUTE FUNCTION population_groups_set_created_by();

-- ============================================================
-- Row Level Security
-- Mirrors the open-access policy used by all_patients / patients.
-- Tighten later if the app grows per-user / per-org scoping.
-- ============================================================
ALTER TABLE population_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "population_groups_read"  ON population_groups;
DROP POLICY IF EXISTS "population_groups_write" ON population_groups;

CREATE POLICY "population_groups_read"
    ON population_groups FOR SELECT
    USING (true);

CREATE POLICY "population_groups_write"
    ON population_groups FOR ALL
    USING (true)
    WITH CHECK (true);
