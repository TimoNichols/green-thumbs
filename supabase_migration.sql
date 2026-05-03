-- Green Thumbs — Supabase migration
-- Run this in the Supabase SQL editor.
-- Before running: create a Storage bucket named "plant-photos" (public) in the Supabase dashboard.

-- ─── Tables ───────────────────────────────────────────────────

CREATE TABLE plants (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status              TEXT        NOT NULL DEFAULT 'owned',      -- 'owned' | 'wishlist'
  species             TEXT,
  common_name         TEXT,
  photo_url           TEXT,
  confidence          FLOAT       DEFAULT 1.0,
  source              TEXT        DEFAULT 'manual',
  water               TEXT,
  sunlight            TEXT,
  soil                TEXT,
  humidity            TEXT,
  placement           TEXT,
  health_tips         JSONB       DEFAULT '[]'::jsonb,
  difficulty          TEXT        DEFAULT 'moderate',
  current_symptom     TEXT,
  symptom_source      TEXT,
  auto_symptom_detail JSONB,
  text_diagnosis      JSONB,
  schedule            JSONB       DEFAULT '{}'::jsonb,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE care_activity (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plant_id  UUID,
  care_type TEXT        NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE home_environment (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  humidity    TEXT,
  light       TEXT,
  temperature TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ─── Row Level Security ────────────────────────────────────────

ALTER TABLE plants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_activity   ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_environment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own plants" ON plants
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own activity" ON care_activity
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own environment" ON home_environment
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── Storage RLS (run after creating bucket in dashboard) ─────

CREATE POLICY "Users upload own photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'plant-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users read own photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'plant-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'plant-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── Auto-update updated_at ────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER plants_updated_at
  BEFORE UPDATE ON plants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER home_environment_updated_at
  BEFORE UPDATE ON home_environment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
