# Store layout

`useAppStore.js` is the composed Zustand store. New code should not add large blocks here without a slice home.

## Current modules

| Path | Role |
|------|------|
| `lib/reportPersistFailure.js` | Shared toast + tracking for failed Supabase writes |
| `lib/carePlanStoreLib.js` | Care-plan row mappers, audit diff helpers, template apply |
| `lib/worklistPersist.js` | HCC gap/member persist, HEDIS/SNP worklist writes, DiagPanel tab inserts (callers pass member/gap snapshots; no `useAppStore` import) |
| `lib/notificationStoreLib.js` | Bell notification row mapping and merge |
| `lib/documentUploadPersist.js` | HCC chart + program document Storage upload and DB insert |
| `lib/taskDateUtils.js` | Task due-date parsing and call duration formatting |
| `lib/campaignStoreMappers.js` | Campaign + campaign_sends row ⇄ JS mappers |
| `lib/contentStoreMappers.js` | Forms + clinical note row mappers |
| `lib/worklistListFilters.js` | Saved worklist filters (localStorage hydrate) |
| `lib/sessionJson.js` | sessionStorage JSON reads for HCC UI prefs |
| `lib/careTeamMappers.js` | care_teams row ⇄ JS mappers |
| `lib/contentStoreCache.js` | Content emails/forms SWR caches, campaign save debounce, HCC extract toast batching |
| `lib/analyticsTableBatcher.js` | Batched analytics_tables reads for dashboard views |
| `slices/shellSlice.js` | Theme, nav chrome, Featurebase JWT, changelog |
| `shellInitial.js` | One-time shell hydration (theme, contrast, font scale) |

## Next slices (planned)

Extract in this order to limit merge risk: HCC worklist **state/actions** (in-store slice), patient/care-program navigation, tasks, settings/content.

HCC seed data for the activity feed lives in `src/features/hcc/seed/buildSeedHccActivityFeed.js`; transition labels in `src/features/hcc/hccTransitionLabels.js`.

Care Plan view orchestration is split under `CarePlanView/` (`useCarePlanViewData`, filters, bulk selection, picker handlers, GBI actions).

Feature code should expose narrow facades under `features/*/store/` or `lib/services/`; the store slice should call those, not import deep feature internals when avoidable.

**React Doctor RLS (2026-09):** Historical `supabase/*_migration.sql` policies that used bare `USING (true)` were tightened to `TO authenticated` + `(select auth.uid()) is not null` where flagged by `supabase-rls-policy-risk`. Ask **Alok Kumar** to apply any new forward migrations on the Supabase project before relying on prod behavior.
