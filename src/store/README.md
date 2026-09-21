# Store layout

`useAppStore.js` is the composed Zustand store. New code should not add large blocks here without a slice home.

## Current modules

| Path | Role |
|------|------|
| `lib/reportPersistFailure.js` | Shared toast + tracking for failed Supabase writes |
| `lib/carePlanStoreLib.js` | Care-plan row mappers, audit diff helpers, template apply |
| `slices/shellSlice.js` | Theme, nav chrome, Featurebase JWT, changelog |
| `shellInitial.js` | One-time shell hydration (theme, contrast, font scale) |

## Next slices (planned)

Extract in this order to limit merge risk: HCC worklist + persist helpers, patient/care-program navigation, tasks, settings/content.

Feature code should expose narrow facades under `features/*/store/` or `lib/services/`; the store slice should call those, not import deep feature internals when avoidable.
