-- Care Plan Library template for the Pharmacy (Med Adherence) program —
-- MAD (diabetes), MAH (RAS antagonists) and MAC (statins). Applied from the
-- Apply Templates picker like the other library templates.
--
-- Every goal / intervention / barrier is an existing Care Plan Library row
-- (same ids and text as src/features/settings/care-plan-library/data/
-- carePlanTemplateLibrarySeed.js) — nothing clinical is invented here.
-- Run after care_plan_library_migration.sql. Idempotent (upsert on id).

INSERT INTO public.care_plan_templates
  (id, name, conditions, goals, interventions, barriers, created_by, updated_by)
VALUES (
  '6f1d2a8e-4b7c-5e93-a0d1-3c8b9e2f7a41',
  'Medication Adherence (MAD / MAH / MAC) Care Plan',
  ARRAY['Diabetes', 'Hypertension', 'Hyperlipidemia', 'Medication adherence'],
  '[
  {
    "id": "2c7eda0c-baad-45d1-8a75-e2a466057e4f",
    "title": "Improve diabetes medication adherence",
    "subtitle": "Take diabetes medications according to the treatment plan.",
    "category": "Other",
    "priority": "medium"
  },
  {
    "id": "853630db-0268-438e-8e5a-46e7d47d8531",
    "title": "Improve medication adherence for hypertension",
    "subtitle": "Take prescribed antihypertensive medications as directed.",
    "category": "Other",
    "priority": "medium"
  },
  {
    "id": "011015d6-afbd-4f73-80d6-eed0918e9b24",
    "title": "Improve lipid management",
    "subtitle": "Maintain lipid levels within the individualized treatment target.",
    "category": "Other",
    "priority": "medium"
  },
  {
    "id": "82f770fe-a6cc-4e73-894c-fb30d5bd8c68",
    "title": "Improve refill continuity",
    "subtitle": "Avoid missed medication doses caused by refill gaps.",
    "category": "Other",
    "priority": "medium"
  },
  {
    "id": "741e6cd2-603f-467e-84ed-f75662658607",
    "title": "Simplify medication routine",
    "subtitle": "Work with the care team to simplify the medication routine when clinically appropriate.",
    "category": "Other",
    "priority": "medium"
  }
]'::jsonb,
  '[
  {
    "id": "4581bbd7-73bd-417c-897f-ec84181a2f83",
    "kind": "patient-education",
    "title": "Medication adherence education",
    "config": {
      "priority": "medium"
    }
  },
  {
    "id": "21d3e05e-a446-43df-8cdf-91a2930559dd",
    "kind": "internal-task",
    "title": "Refill coordination",
    "config": {
      "priority": "medium"
    }
  },
  {
    "id": "9346036c-2112-42a6-8771-cfc9d5045fa7",
    "kind": "internal-task",
    "title": "Medication reminders",
    "config": {
      "priority": "medium"
    }
  },
  {
    "id": "e941a09a-f890-4b02-8f2c-ce83434e1694",
    "kind": "internal-task",
    "title": "Medication review",
    "config": {
      "priority": "medium"
    }
  },
  {
    "id": "b2227fea-9124-40c6-8739-4d3e47707d13",
    "kind": "internal-task",
    "title": "Medication issue escalation",
    "config": {
      "priority": "high"
    }
  },
  {
    "id": "899de6a5-19d8-4cdf-8fa0-74648758f5ec",
    "kind": "internal-task",
    "title": "Transportation coordination",
    "config": {
      "priority": "medium"
    }
  }
]'::jsonb,
  '[
  {
    "id": "07b79155-98fd-48aa-8c84-be68681070fc",
    "title": "Medication adherence difficulty",
    "description": "",
    "priority": "medium"
  },
  {
    "id": "e1a53048-2e0e-443a-8991-28c0bc5cc0b6",
    "title": "Forgetfulness",
    "description": "",
    "priority": "medium"
  },
  {
    "id": "6fa3d039-02cb-41f0-8268-15140866fef7",
    "title": "Medication side effects",
    "description": "",
    "priority": "medium"
  },
  {
    "id": "4bb5c8a0-0b9e-4efe-8fbe-692d3c3ad380",
    "title": "Transportation barrier",
    "description": "",
    "priority": "medium"
  },
  {
    "id": "3aa23632-0920-4c3a-87aa-737ea7f17b9d",
    "title": "Refill gap risk",
    "description": "",
    "priority": "medium"
  },
  {
    "id": "7684a8a9-60f9-4e75-8e1c-4dc442a8392c",
    "title": "Pharmacy access issue",
    "description": "",
    "priority": "medium"
  },
  {
    "id": "6d1ed546-4d23-42ed-8545-f2038bbffdc0",
    "title": "Complex medication schedule",
    "description": "",
    "priority": "medium"
  }
]'::jsonb,
  'Alok Kumar',
  'Alok Kumar'
)
ON CONFLICT (id) DO UPDATE SET
  name          = EXCLUDED.name,
  conditions    = EXCLUDED.conditions,
  goals         = EXCLUDED.goals,
  interventions = EXCLUDED.interventions,
  barriers      = EXCLUDED.barriers,
  updated_by    = EXCLUDED.updated_by,
  updated_at    = now();

-- ── Rollback ────────────────────────────────────────────────────────────────
--   DELETE FROM public.care_plan_templates WHERE id = '6f1d2a8e-4b7c-5e93-a0d1-3c8b9e2f7a41';
