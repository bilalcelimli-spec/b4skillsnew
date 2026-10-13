# Score reporting API — schema 2.0.0

13 October 2026. Paths and existing JWT/API-key authorization remain unchanged. This is a response contract change; integrations must handle nullable scores before rollout.

## External authenticated reports

Applies to `/api/reports/scores/:sessionId`, candidate history, batch reports and organisation aggregates.

- `meta.schema_version` is `2.0.0`.
- New fields: `product_line` (current display name), `report_status` (evidence-aware report state), `scoring_complete` (eligible final result).
- `status` remains the persisted session lifecycle. A lifecycle of `COMPLETED` alone is insufficient evidence of a final score. Consumers must check `scoring_complete === true`.
- For unresolved, incomplete, held, paused or expired reports, `overall_theta`, `overall_cefr`, `sem`, `ci_95_lo` and `ci_95_hi` are `null`; `skills` is empty. Do not turn nulls into zero, A1 or the overall skill level.
- Eligible results use the authoritative report model, canonical platform CEFR mapping and measured skill estimates. Skill keys are uppercase; `responses` excludes pretest items. Unmeasured or unresolved skills are omitted.
- Theta and SEM are on the platform IRT scale. CI fields are model-based theta bounds (`theta ± 1.96 × SEM`), not BEPS, raw-score percentages or empirically validated CEFR boundaries. Missing SEM yields null CI bounds.
- The endpoints return current evidence. A previously verified record can later become unavailable due to a hold, changed evidence or validity expiry.
- History can include lifecycle-completed records that are no longer eligible; each record carries its current evidence status. Pagination `total` is the lifecycle query count, not the number of valid certified results.

## Organisation aggregate

The latest at most 10,000 lifecycle-completed sessions are examined in completion-date order. `meta.sample_size`, `sample_limit` and `aggregation_scope` state this scope. `data.completed` is the eligible-result count within the examined sample, not the total historical completed population. `total_sessions` is the organisation's full lifecycle count.

Expired, unresolved and incomplete results are excluded from averages and CEFR distributions. Empty theta averages/median are null. The median for even samples averages the two middle values. `skill_averages` contains measured skill theta averages, not 0–100 scores.

Example (unfinished result):

```json
{
  "data": {
    "status": "SCORING",
    "report_status": "Provisional",
    "scoring_complete": false,
    "overall_theta": null,
    "overall_cefr": null,
    "sem": null,
    "ci_95_lo": null,
    "ci_95_hi": null,
    "skills": []
  },
  "meta": {"schema_version": "2.0.0"}
}
```

The example omits unchanged identity, date and link fields.

## Public sharing

- `/api/sessions/:id/share` keeps authenticated ownership checks and only issues/reuses a token for a currently eligible final result.
- `/api/share/:token` revalidates evidence and validity on every read. Pending/held/incomplete results return 409; expired results return 410. Errors contain no candidate summary. Missing tokens return 404; malformed tokens return 400.
- Both paths set `Cache-Control: private, no-store`; a token is not an independent certificate or identity verification.
- Public summaries use the candidate relation and actual completion date. They omit email addresses, response content and scoring metadata.
- Public `score` and numeric skill values are on the stored **0–100 platform scale**, not theta and not percentages correct. Missing/invalid values are null. Zero is valid.
- Public summaries now include product name, status, validity date and grammar/vocabulary alongside the communication skills when measured numeric results are available.
- Existing 32-character hex tokens remain usable when their current result is eligible. No schema migration or token regeneration is required.

## Remaining work

High-volume token/digest lookup indexes, revocation/rotation controls, large-cohort query performance, and live downstream integration validation require separate work. The local regressions demonstrate software behavior with controlled fixtures; they do not establish external recognition or CEFR validity.
