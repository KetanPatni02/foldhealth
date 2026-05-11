-- ============================================================
-- Campaigns Table: Schema + Seed Data
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.campaigns (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  channel TEXT DEFAULT 'email',
  section TEXT DEFAULT 'scheduled',
  audience INTEGER DEFAULT 0,
  dynamic BOOLEAN DEFAULT false,
  health TEXT,
  delivered NUMERIC,
  opened NUMERIC,
  start_date TEXT,
  duration INTEGER DEFAULT 1,
  progress NUMERIC DEFAULT 0,
  executes_in INTEGER,
  enabled BOOLEAN DEFAULT false,
  email_template JSONB,
  color_variables JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to campaigns"
  ON public.campaigns FOR ALL
  USING (true) WITH CHECK (true);

-- Seed data
INSERT INTO campaigns (id, name, description, channel, section, audience, dynamic, health, delivered, opened, start_date, duration, progress, executes_in, enabled) VALUES
(1,  'Resilient Recoveries',          'A support campaign focused on helping patients recover from injuries or surgeries with personalized care plans.', 'email', 'running',   644, true,  'Good',     32, 18, '09/07/2024', 15, 40, NULL, true),
(2,  'Healthy Moms, Happy Babies',    'A maternal health initiative providing resources and support for expecting and new mothers.',                      'email', 'running',    80, false, 'Moderate', 56, 49, '09/23/2024',  9, 60, NULL, true),
(3,  'Fit for Life',                  'A wellness program promoting fitness, balanced nutrition, and sustainable healthy lifestyle habits.',               'email', 'paused',    916, false, 'Good',     57, 43, '08/29/2024',  1, 60, NULL, false),
(4,  'Skin Care Savvy',              'Educational campaign raising awareness about skincare routines and dermatological health.',                         'email', 'paused',     43, false, 'Good',     64, 59, '09/19/2024',  1, 70, NULL, false),
(5,  'Mind Over Matter',             'A mental wellness campaign offering mindfulness, stress management, and emotional resilience tools.',               'email', 'scheduled', 191, false, NULL,       NULL, NULL, '09/01/2024', 7, 0, 5, false),
(6,  'Resilient Recoveries',         'A pediatric health campaign encouraging healthy eating, physical activity, and overall child wellness.',            'email', 'scheduled', 830, true,  NULL,       NULL, NULL, '09/05/2024', 11, 0, 5, false),
(7,  'Healthy Habits for Kids',      'A support network campaign providing guidance and emotional support to cancer patients and families.',              'sms',   'scheduled', 433, false, NULL,       NULL, NULL, '09/11/2024', 12, 0, 5, false),
(8,  'Cancer Companions',            'A long-term initiative focused on managing chronic illnesses with proactive care and patient education.',           'email', 'scheduled', 529, false, NULL,       NULL, NULL, '09/16/2024', 20, 0, 5, false),
(9,  'Chronic Care Campaign',        'A location-specific campaign targeting patient engagement for the Rosewood clinic region.',                         'email', 'scheduled', 396, false, NULL,       NULL, NULL, '09/26/2024', 21, 0, 5, false),
(10, 'Rome Office Patients',         'An annual seminar covering the latest advancements in health and wellness practices.',                             'voice', 'scheduled',   7, false, NULL,       NULL, NULL, '09/27/2024',  7, 0, 5, false),
(11, 'Health & Wellness Seminar 2025','Helping patients recover from injuries or surgeries with personalized care plans.',                               'email', 'scheduled', 795, false, NULL,       NULL, NULL, '08/28/2024', 19, 0, 5, false),
(20, 'Q3 Diabetic Outreach',         'Reaching out to patients with HbA1c > 9 over the past 90 days with targeted education resources.',                'email', 'draft',     312, false, NULL,       NULL, NULL, NULL, NULL, 0, NULL, false),
(21, 'Flu Season 2025 Reminder',     'Automated voice + SMS reminders for annual flu vaccination targeting patients over 65.',                           'voice', 'draft',     188, false, NULL,       NULL, NULL, NULL, NULL, 0, NULL, false),
(22, 'New Patient Onboarding',       'Welcome series for newly registered patients with clinic info, portal setup, and first-visit prep.',               'email', 'draft',      47, false, NULL,       NULL, NULL, NULL, NULL, 0, NULL, false);

-- Reset sequence to avoid conflicts
SELECT setval('campaigns_id_seq', (SELECT MAX(id) FROM campaigns));
