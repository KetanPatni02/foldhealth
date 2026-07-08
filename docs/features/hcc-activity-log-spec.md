# HCC Activity Log — Design Spec

Spec for the worklist-level **History** drawer (opened from the HCC worklist toolbar) and how it relates to the existing per-encounter ActivityTab inside DiagPanel. Reuses the timeline primitives from [`ActivityTimeline`](../../src/features/hcc/DiagPanel/ActivityTimeline.jsx) and the entry layout from [`LeftWorkspace.ActivityTab`](../../src/features/hcc/DiagPanel/LeftWorkspace.jsx) — same rail / meta / headline / pill structure, scaled to a system-wide stream.

---

## 1. Activity Log Taxonomy

Events grouped by lifecycle stage. Every event has the same schema:

```
{
  id, ts, category, eventName, actorId, actorName, actorRole,
  source: 'manual' | 'sftp' | 'system' | 'astrana',
  scope: { batchId?, fileId?, encounterId?, patientId?, dosId?, icd?, claimId? },
  payload: { ...event-specific },
  visibility: ['worklist'|'patient'|'encounter'|'batch'|'review-queue']
}
```

### Intake
| Event | Trigger | Actor | Visibility |
|---|---|---|---|
| `file.uploaded` | User drops file in UploadDocumentDrawer | user | worklist · batch |
| `sftp.file.detected` | SFTP watcher picks up new file from Astrana / Support inbox | system | worklist · batch |
| `batch.created` | Intake groups files into a processing batch | system | batch · worklist |
| `file.rejected.non_pdf` | MIME type ≠ application/pdf | system | batch · worklist |
| `file.rejected.invalid_filename` | Filename schema check fails | system | batch · worklist |

### OCR & Extraction
| Event | Trigger | Actor | Visibility |
|---|---|---|---|
| `ocr.started` | Job enqueued | system | batch |
| `ocr.completed` | Extraction returns ≥1 page | system | batch · review-queue |
| `ocr.failed` | OCR error or timeout | system | batch |
| `ocr.low_confidence` | Any field below threshold | system | review-queue |

### Patient Matching
| Event | Trigger | Actor | Visibility |
|---|---|---|---|
| `patient.matched` | Auto-match found ≥0.95 score | system | review-queue · patient |
| `patient.match_failed` | No candidate above threshold | system | review-queue |
| `patient.match_manual` | Reviewer manually links | user | review-queue · patient |
| `patient.identity_changed` | Reviewer reassigns to different patient | user | review-queue · patient · audit |

### Review Queue / Approval
| Event | Trigger | Actor | Visibility |
|---|---|---|---|
| `encounter.approved` | Reviewer clicks Approve | user | review-queue · worklist · patient |
| `encounter.rejected` | Reviewer clicks Reject (with reason) | user | review-queue · worklist · patient |
| `encounter.field_corrected` | Manual field edit in review | user | review-queue · audit |
| `encounter.restored` | Rejected encounter brought back | user | review-queue · audit |
| `encounter.removed` | Reviewer drops encounter entirely | user | review-queue · audit |

### Worklist
| Event | Trigger | Actor | Visibility |
|---|---|---|---|
| `worklist.row_created` | Approved encounter → new HCC row | system | worklist · patient |
| `worklist.row_merged` | Approved encounter folded into existing DOS | system | worklist · patient |
| `assignee.changed` | Role reassigned (bulk or single) | user | worklist · patient · encounter |
| `role.status_changed` | Support / Coder / R1-R3 status transition | user/system | encounter · patient |

### ICD Operations
Mirrors today's DiagPanel ActivityTab events; add `source` so they appear in History too.

| Event | Trigger | Actor |
|---|---|---|
| `icd.accepted` | Reviewer accepts suggested ICD | user |
| `icd.dismissed` | Reviewer dismisses with reason | user |
| `icd.created_manual` | Manually added ICD | user |
| `icd.deleted` | ICD removed | user |
| `icd.overridden` | HCC version overrides another (V24→V28 etc.) | system |
| `icd.merged` | Net-new ICD merged into existing DOS | system |
| `icd.status_changed` | Open / Audited transition | user/system |
| `icd.comment_added` | Comment on ICD | user |
| `document.uploaded_for_icd` | Document attached to ICD evidence | user |

### Deduplication
| Event | Trigger | Actor |
|---|---|---|
| `dedup.dos_match_found` | Incoming encounter matches existing DOS | system |
| `dedup.icd_net_new_merged` | New ICD merged into existing DOS | system |
| `dedup.related_dos_created` | Encounter creates sibling DOS row | system |
| `dedup.duplicate_detected` | Full duplicate — rejected | system |

### Claim Reconciliation
| Event | Trigger | Actor |
|---|---|---|
| `claim.attached` | Claim ID linked to encounter | system/user |
| `claim.matched` | Claim auto-matches via member+DOS+ICD | system |
| `claim.not_found` | Encounter has no matching claim | system |
| `asm.reevaluated` | ASM logic re-runs for member/DOS | system |
| `asm.file_generated` | ASM output queued | system |
| `asm.delete_entry_created` | ASM delete record created | system |

### Audit / Edits
| Event | Trigger | Actor |
|---|---|---|
| `patient.dos_changed` | Reviewer corrects DOS date | user |
| `patient.identity_changed` | (also in matching) | user |
| `patient.field_edited` | Provider / POS / etc. corrected | user |

---

## 2. Activity Log UX Structure

### Placement & scope

| Surface | Scope | Default filter |
|---|---|---|
| Worklist History (this spec) | All events across all batches, all patients | Last 30 days, all categories |
| DiagPanel → Activity tab | Single member + selected DOS (already exists) | DOS-level |
| Patient Single View → History | Single patient (all DOS + intake history) | All-time |
| Batch Processing Dashboard | Single batch (file-level intake + OCR + queue) | This batch |
| Review Queue → encounter detail | Single encounter | This encounter |

### Hierarchy

- **Worklist History** = system stream. Grouped: Month → Day. Each entry shows actor + scope chips so the reader can trace which patient/DOS/batch it touched without leaving the drawer.
- **Per-encounter / per-patient** views filter the same stream down — they aren't separate tables.

### Grouping & collapse

Same as the existing ActivityTab — collapsible month headers (`JAN 2026 ▾`). Default: current month expanded, older months collapsed. State persists per user via localStorage.

### Filtering

Chip row at the top (matches DiagPanel filter row pattern):
- **Date range** — preset (Today / 7d / 30d / Custom)
- **Category** — multi: Intake · OCR · Review · Worklist · ICD · Dedup · Claim · Audit
- **Source** — Manual / SFTP / System / Astrana
- **Actor type** — User / System / Automation
- **Patient** — typeahead (chip)
- **DOS** — date or range
- **Severity** — Info / Warning / Error (for failures)

Filters AND together; chips show active state with a count badge.

### Search

Top-bar free-text search over `headline + actorName + payload values`. Debounced 200ms. Highlights match in the entry.

### Rationale

The worklist History is **batch + file + worklist-row** level by default — operators care about "what came in, what got approved, what's now on the worklist." Encounter-level detail lives one layer deeper (clicking an entry expands to show the encounter and links into DiagPanel). Patient-level rollup lives on the patient page. One canonical event store, four filtered views.

---

## 3. Activity Log Entry Design

Layout (matches `_tlRow` from `ActivityTimeline.module.css`):

```
[icon]  01/24/2026 • 12:30 PM • A. Beauchamp (Support) • Batch #B-2024-091
        Document Uploaded for HCC18 (E11.21) and HCC111 (J44.0)
        [📄 Progress Note.pdf · Visit Note]    Details ▾
```

Standard fields per entry:
- **Icon** — semantic color (success / warning / error / info / neutral)
- **Meta line** — `date • time • actor (role) • scope`
- **Headline** — short imperative sentence
- **Body** (optional) — pills for transitions (`Open → Audited`), attached file chips, link to source
- **Details** (collapsible) — full metadata dump (key/value list)
- **Actions** (optional) — `Undo`, `Open in Review Queue`, `Open Encounter`

### Per-event spec (key examples)

**`worklist.row_created`**
- **Title:** Worklist Row Created
- **Description:** `Approved encounter created a new HCC worklist row for {patientName}.`
- **Metadata:** patientName, patientId, dos, provider, pos, icds[], approvedBy, ts, sourceFileId, sourceFileName, batchId
- **Actions:** Open Patient · Open Source File

**`encounter.approved`**
- **Title:** Encounter Approved
- **Description:** `{actor} approved encounter for {patientName} (DOS {dos}).`
- **Metadata:** encounterId, patientName, patientId, dos, icds[], approvedBy, ts, sourceFileId

**`assignee.changed`**
- **Title:** {Role} Changed
- **Description:** `{role} reassigned from {fromName} to {toName}.`
- **Metadata:** memberId, patientName, dos, role, fromUserId, fromName, toUserId, toName, reason, actor, ts
- **Visual:** pill transition `[DH D. Hintz] → [NR N. Richards]` (matches current DiagPanel rendering)

**`ocr.completed`**
- **Title:** OCR Completed
- **Description:** `Extracted {pageCount} pages from {fileName} ({encounterCount} encounters detected).`
- **Metadata:** fileId, fileName, pageCount, encounterCount, confidence, durationMs, ts

**`dedup.icd_net_new_merged`**
- **Title:** Net-New ICD Merged
- **Description:** `{icd} added to existing DOS {dos} for {patientName} (other ICDs already on file).`
- **Metadata:** patientId, dos, icd, existingDosId, sourceFileId, ts

**`claim.matched`**
- **Title:** Claim Matched
- **Description:** `Claim {claimId} matched to {patientName} DOS {dos}.`
- **Metadata:** claimId, patientId, dos, matchScore, matchedFields[], ts

---

## 4. Activity Log Screens — placement matrix

| Event family | Review Queue | Batch Dashboard | Worklist Row (DiagPanel) | Patient View | Worklist History |
|---|:-:|:-:|:-:|:-:|:-:|
| Intake (upload, SFTP) | — | ✓ | — | (if patient-linked) | ✓ |
| OCR | ✓ (per file) | ✓ | — | — | ✓ |
| Patient Matching | ✓ | — | — | ✓ | ✓ |
| Review (approve/reject) | ✓ | ✓ | — | ✓ | ✓ |
| Worklist (row created, assignee) | — | — | ✓ | ✓ | ✓ |
| ICD ops | — | — | ✓ (DiagPanel ActivityTab) | ✓ | ✓ |
| Dedup | ✓ | ✓ | ✓ | ✓ | ✓ |
| Claim / ASM | — | — | ✓ | ✓ | ✓ |
| Audit / Field edits | ✓ | — | ✓ | ✓ | ✓ |

**Rule:** every event lands in **Worklist History** (the unfiltered firehose). Other surfaces are filtered views — never duplicate writes, just queries.

---

## 5. Bulk Upload Events — exact copy

| Event | Title | Description (template) |
|---|---|---|
| `batch.created` | Batch Created | `Batch {batchId} created — {fileCount} files queued.` |
| `batch.processing_started` | Batch Processing Started | `Started processing batch {batchId} ({fileCount} files).` |
| `batch.processing_completed` | Batch Processing Completed | `Batch {batchId} complete — {approvedCount} approved, {rejectedCount} rejected, {pendingCount} in review.` |
| `batch.processing_partial_failure` | Batch Partially Failed | `Batch {batchId} finished with errors — {failedCount} of {fileCount} files failed.` |
| `file.rejected.non_pdf` | File Rejected — Not a PDF | `{fileName} skipped — only PDF files are accepted.` |
| `file.rejected.invalid_filename` | File Rejected — Invalid Filename | `{fileName} skipped — filename does not match expected pattern.` |
| `ocr.failed` | OCR Failed | `OCR failed for {fileName} — {errorReason}. File moved to retry queue.` |
| `ocr.completed` | OCR Completed | `{fileName} processed — {encounterCount} encounters detected across {pageCount} pages.` |
| `encounter.field_corrected` | Field Corrected | `{actor} corrected {fieldName} from "{oldValue}" to "{newValue}" on encounter for {patientName}.` |
| `encounter.approved` | Encounter Approved | `{actor} approved encounter for {patientName} (DOS {dos}).` |
| `encounter.rejected` | Encounter Rejected | `{actor} rejected encounter for {patientName} (DOS {dos}) — reason: {reason}.` |

---

## 6. Deduplication Events — exact copy

| Event | Title | Description |
|---|---|---|
| `dedup.dos_match_found` | Existing DOS Found | `DOS {dos} already exists for {patientName} — encounter routed to merge path.` |
| `dedup.icd_net_new_merged` | Net-New ICD Merged | `{icd} added to existing DOS {dos} — other ICDs on this DOS unchanged.` |
| `dedup.related_dos_created` | Related DOS Created | `New DOS {dos} created for {patientName} ({reason}: existing DOS within encounter window).` |
| `dedup.duplicate_detected` | Duplicate Encounter Detected | `Encounter from {fileName} is an exact duplicate of {existingEncounterId} — rejected automatically.` |

---

## 7. Claim Reconciliation Events — exact copy

| Event | Title | Description |
|---|---|---|
| `claim.attached` | Claim Attached | `Claim {claimId} attached to {patientName} DOS {dos}.` |
| `claim.matched` | Claim Matched | `Claim {claimId} auto-matched to encounter — {matchedFieldCount} fields aligned ({matchScorePct}%).` |
| `claim.not_found` | Claim Not Found | `No claim found for {patientName} DOS {dos} after {searchWindowDays}-day search. Will retry.` |
| `asm.reevaluated` | ASM Reevaluation Triggered | `ASM reevaluation queued for {patientName} DOS {dos} — trigger: {reason}.` |
| `asm.file_generated` | ASM File Generated | `ASM output {asmFileId} generated — {addCount} adds, {deleteCount} deletes.` |
| `asm.delete_entry_created` | ASM Delete Entry Created | `ASM delete entry created for ICD {icd} on DOS {dos} (reason: {reason}).` |

---

## 8. Audit & HIPAA Compliance

Activity log entries are **append-only**. Once written, no field is editable from the UI. Compliance fields that must be captured on every entry and never mutated:

- `id` — uuid, immutable
- `ts` — server-side timestamp, never client-supplied
- `actorId` — links to `auth.users.id` (or `'system'`)
- `actorName` — snapshot of display name at time of action
- `actorRole` — snapshot of role at time of action
- `source` — `manual` | `sftp` | `system` | `astrana`
- `sourceFileId` + `sourceFileName` — when applicable
- `originalValues` — for any edit event, the pre-edit values
- `modifiedValues` — post-edit values
- `ipAddress` — captured server-side from auth context
- `userAgent` — captured server-side

DB-level: `hcc_activity_log` table with `REVOKE UPDATE, DELETE` from app roles; only the service-role write path can insert. Export bundle for HIPAA disclosure requests = `SELECT * WHERE patientId = ? ORDER BY ts`.

### Edit events — required diff shape

```json
{
  "eventName": "encounter.field_corrected",
  "payload": {
    "fieldName": "provider",
    "originalValues": { "provider": "Dr. Smith" },
    "modifiedValues": { "provider": "Dr. J. Smith" },
    "ocrConfidence": 0.62
  }
}
```

OCR confidence is always logged on field corrections so QA can spot the OCR threshold's accuracy.

---

## 9. Edge Cases — log copy

| Scenario | Event(s) emitted |
|---|---|
| Reviewer changes patient identity | `patient.identity_changed` — `{actor} reassigned encounter from {fromPatientName} (ID {fromId}) to {toPatientName} (ID {toId}). Reason: {reason}.` Triggers `worklist.row_created` on new patient and `worklist.row_removed` on old patient. |
| Reviewer changes ICDs | `icd.created_manual` / `icd.deleted` per ICD, plus a wrapper `encounter.field_corrected` for the diff. Each ICD event carries `ocrConfidence` if it was originally OCR'd. |
| Reviewer changes DOS | `patient.dos_changed` — `{actor} corrected DOS from {oldDos} to {newDos} on encounter for {patientName}.` If the new DOS matches an existing one, also emit `dedup.dos_match_found`. |
| Reviewer removes encounter | `encounter.removed` — `{actor} removed encounter for {patientName} (DOS {dos}). Source file remains: {fileName}.` Does NOT delete the encounter — soft-delete with `removed_at` so the entry can be restored. |
| OCR confidence below threshold | `ocr.low_confidence` — `Encounter for {patientName} (DOS {dos}) flagged — confidence {confidencePct}% below {thresholdPct}% threshold. Routed to manual review.` |
| Patient mismatch unresolved | `patient.match_failed` — `No matching patient for encounter on {dos} (provider {provider}). Awaiting reviewer.` Stays in Review Queue indefinitely until acted on. |
| Rejected encounter later restored | `encounter.restored` — `{actor} restored encounter for {patientName} (DOS {dos}), previously rejected by {originalActor} on {originalTs}. Reason for restore: {reason}.` |

---

## Implementation notes (out of scope for this spec, but worth flagging)

- **Schema**: new `hcc_activity_log` Supabase table, indexed on `(patient_id, ts DESC)`, `(batch_id, ts DESC)`, `(event_name, ts DESC)`.
- **Backend writer**: every store action that mutates HCC state calls a single `logActivity(event)` helper. Same fire-and-forget pattern used by [`persistHccMemberRoleStatus`](../../src/store/useAppStore.js) — never block the optimistic UI on the log write.
- **UI**: extend the existing [`ActivityTimeline`](../../src/features/hcc/DiagPanel/ActivityTimeline.jsx) component with a `mode` prop (`encounter` | `patient` | `worklist`) that swaps the data source and the default filter chip set — keeps one timeline component in the codebase.
- **History drawer**: opened by the History button at [`HccWorklistTable.jsx:272`](../../src/features/hcc/HccWorklistTable.jsx#L272) (currently `'History — coming soon'`). Same shared `Drawer` (700 wide, 8px inset, 16px radius) per CLAUDE.md guidance.
