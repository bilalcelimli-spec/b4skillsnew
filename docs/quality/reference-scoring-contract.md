# Independent reference scoring contract

The offline evaluator compares already collected AI scores with expert ratings. It makes no database/provider calls, accepts no candidate text/audio, and never grants production approval. Run:

```sh
node --import tsx scripts/evaluation/score-reference-dataset.ts input.json output.json
```

The output must be a new path and is created with mode 0600. Keep datasets and reports in private storage, outside Git. The input schema is `ReferenceDatasetSchema` in `src/lib/scoring/reference-evaluation.ts`.

## Collect reference evidence

1. Select consented, pseudonymised learner responses across both productive skills, task genres, ages and proficiency bands. Record the exact item rubric version. Collect data under the applicable organisation privacy process; this tool does not supply consent or permissions.
2. Train and qualify experts against the agreed rubrics. Two distinct experts score independently, without seeing model scores or each other's rating. Each supplies a normalized score and ordinal band. Declaring `independent`, `blindToAi` and `qualified` in the file is an attestation, not verification of those facts.
3. Use a distinct third expert to adjudicate any band disagreement or score difference greater than 0.15. This disagreement rule is provisional; preserve both original ratings and the adjudication.
4. Separate development and holdout data by both learner and prompt identifiers before tuning. Give all tasks from one learner the same partition; task/prompt families also need independent review for near-duplicate leakage, which identifier matching cannot detect.
5. Freeze model, scoring policy and rubric versions. Predeclare run order and score each holdout response at least five times under the same configuration. Do not replace the first run with the best result. Retain review-required and unavailable results.

## File fields

Top-level fields: `version: 1`, `datasetId`, `modelVersion`, `scoringPolicyVersion`, `expertProtocol`, six strictly increasing `scoreBandCutoffs` inside (0,1), and `responses`.

Each response contains pseudonymous `id`, `learnerId`, `promptId`, `rubricVersion`, `split` (`development` or `holdout`), `skill` (`WRITING` or `SPEAKING`), two `expertRatings`, optional `adjudication`, ordered `runs`, and optional `groups` (for example age band or device category). Do not supply names, email addresses, free-form answers or audio.

Each expert rating contains `raterId`, `score` (0–1) and `band` (integer 0–6). Ordinal bands represent PRE_A1, A1, A2, B1, B2, C1 and C2 respectively. Scores and bands are separately supplied ratings; the evaluator does not invent a CEFR band by rounding a continuous score.

Each run contains unique `runId`, `status` (`scored`, `review_required`, `unavailable`), nullable `score` and nullable `band`. Scored runs require both numeric values; unavailable runs require null values. Review proposals may retain numeric values but are excluded from final-score accuracy metrics.

`scoreBandCutoffs` are explicitly declared research cutoffs used only to identify boundary cases (reference score within 0.02). They are not validated platform placement rules. Scores must use the same frozen normalization as the AI output; a local task-success percentage is not interchangeable with a cross-level proficiency score.

## Interpret the report

Accuracy uses the first predeclared auto-scored holdout run against adjudication, or the mean of the agreeing experts. Reported statistics include MAE, RMSE, signed bias, explicitly rated band QWK, learner-cluster bootstrap 95% MAE interval (1,000 deterministic resamples), over/underplacement, errors of two or more ordinal bands, and boundary-case errors. Original expert band agreement is reported before adjudication.

Constant single-band QWK and insufficient confidence-interval evidence are null, never a manufactured perfect result. Repeatability requires at least five runs and all supplied runs to be auto-scored; the report gives the fraction with score range at most 0.05. Incomplete/review/unavailable cases remain visible through counts and coverage.

Coverage gaps use a provisional target of at least 30 distinct auto-scored learners in each skill/reference-band cell. Small subgroup metrics require at least 30 distinct learners; otherwise only counts are shown. These are initial research targets, not universal certification standards. Learner-only bootstrap does not establish generalizability to new prompt families, and descriptive subgroup comparisons are not a causal fairness test. Review routing creates selection effects; auto-score metrics must always be read with coverage.

`releaseApproved` is always false. A psychometric/assessment review must set task-specific acceptance criteria, examine the human baseline, confidence intervals, exclusions and subgroup evidence, then independently authorize any production use. Synthetic fixtures validate software behavior only.

## Compare a candidate model or policy version

```sh
node --import tsx scripts/evaluation/compare-scoring-models.ts baseline.json candidate.json comparison.json
```

Both files must use the same dataset ID, cutoffs, reference responses, partitions, pseudonymous learner/prompt identifiers, rubric versions, expert ratings, adjudications and subgroup labels. Responses and expert-rating entries may appear in a different order. At least the model or scoring policy version must differ. Preserve original files; do not update the reference labels after seeing a model comparison.

Accuracy differences use only the first run of cases auto-scored by both versions. The report also tracks gained auto-scored cases and previously auto-scored cases lost to review/failure; equal net coverage does not conceal changes in which cases were graded. Paired absolute-error differences have learner-cluster bootstrap intervals. Writing/speaking regressions and repeatability are checked separately so improvement in one skill cannot conceal deterioration in the other.

The frozen provisional policy is reported in every result: MAE increase margin 0.01, candidate MAE at most 0.08, candidate ordinal QWK at least 0.80, severe band-error increase at most 0.01, coverage drop and previously-auto lost-case rate at most 0.02, auto coverage at least 0.90, repeatability within five points at least 0.95 with decline at most 0.02, 30 paired learners per skill and existing 30-learner skill/band coverage. A one-sided interpretation of the reported paired 95% interval's upper endpoint is used conservatively to check the MAE margin; unresolved intervals generate an evidence gap. These limits are unvalidated internal research choices, not CEFR certification rules. Observed regressions are descriptive; the tool makes no significance or multiple-comparison-adjusted claims.

`observed_regression` means at least one observed limit was exceeded, even if other evidence is sparse. `insufficient_evidence` means gaps remain without an observed limit violation. `within_provisional_limits` means these checks found neither; it still does not authorize release. Append `--check` for diagnostic exit code 2 on regressions/gaps (0 within provisional limits, 1 invalid input/output error). The output is always created privately as a new file and always states `releaseApproved: false`.

This comparison does not prove fairness, expert qualification, prompt-family independence or validity for a new population. The earlier per-model subgroup reports and independent assessment review remain necessary. No live model calls, database writes or deployment changes occur.

## Legacy scheduled anchor drift job

The existing `scripts/anchor-calibration-runner.ts` is a separate recurring diagnostic. It now requires valid target CEFR, rubric, finite normalized expert score, declared rater count at least two, and declared expert QWK at least 0.80 before scoring. These metadata declarations are not verified expert independence. Speaking requires base64 recording data and a supported audio MIME type; transcript-only fallback is disabled. Format checks do not verify audio container integrity, consent or acoustic quality; the multimodal scorer still must return a finalized score.

Only finalized `ai_auto` grades in [0,1] without human-review holds are eligible. Rejected, held, unavailable, invalid and duplicate-ID references are reported as excluded, with no zero-score substitution. Undefined MAE/RMSE/correlation is null. The job requires complete scoring, at least 30 anchors in each productive skill, nonconstant score/reference variation, and per-skill MAE/RMSE/correlation limits; pooled results cannot conceal a failed skill. This legacy corpus counts anchors, not independently sampled learners, so it cannot replace the separate learner/prompt-isolated reference evaluation.

Runner exits: 0 means provisional diagnostic drift limits met; 1 means observed drift, scoring/numerical failure or runtime error; 2 means missing/incomplete reference evidence. An empty corpus now fails the scheduled job with exit 2. No success flag can override incomplete counts or invalid metrics. Results record exclusions, evidence gaps, model/policy versions and `releaseApproved: false`. The retained `validateModelVersion().passed` field is a legacy diagnostic outcome, never deployment approval.
