# Printable score report and certificate

Two A4 documents in the design language of the schools brochure (plum hero, coral CEFR tile,
amber accents, soft pink cards, Plus Jakarta Sans):

| Document | Route | Format |
|---|---|---|
| Score report | `/print/report/:sessionId?lang=tr\|en` | 3 × A4 portrait |
| Certificate | `/print/certificate/:sessionId?lang=tr\|en` | 1 × A4 landscape |

Data: `GET /api/sessions/:id/report-document?lang=` → `buildReportDocument()`
(`src/lib/reporting/report-document.ts`), which wraps `buildAssessmentReport()` so status,
provisional and certificate rules match the existing PDF and share link. The certificate is only
offered when `certificateAvailable()` is true (final, verified, certificate id present).
Design preview with fictional data: `npx vite` then open
`/test/e2e/fixtures/report-documents.html?sample=adult|junior|primary|provisional&kind=report|certificate&lang=tr|en`.

## External alignments (single source: `src/lib/reporting/external-equivalences.ts`)

The table maps the **reported CEFR level** to the range that each test owner itself places at that
level. It is not a b4skills concordance study and never uses θ directly.

| CEFR | IELTS (band) | TOEFL iBT 2026 (1–6) | TOEFL iBT legacy (0–120) | PTE Academic | Young learners (Cambridge) |
|---|---|---|---|---|---|
| Pre-A1 | — | — | — | — | Pre A1 Starters |
| A1 | — | 1–1.5 | 0–23 | 10–29 | A1 Movers |
| A2 | — | 2–2.5 | 24–43 | 30–42 | A2 Flyers · A2 Key for Schools |
| B1 | 4.0–5.0 | 3–3.5 | 44–71 | 43–58 | B1 Preliminary for Schools |
| B2 | 5.5–6.5 | 4–4.5 | 72–94 | 59–75 | B2 First for Schools |
| C1 | 7.0–8.0 | 5–5.5 | 95–113 | 76–84 | C1 Advanced |
| C2 | 8.5–9.0 | 6 | 114–120 | 85–90 | C2 Proficiency |

Sources (all checked 2026-11-17):

- **IELTS**: "IELTS and the CEFR", ielts.org,
  <https://ielts.org/organisations/ielts-for-organisations/compare-ielts/ielts-and-the-cefr>.
  The chart on that page puts bands 4–5 at B1, 5.5–6.5 at B2, 7–8 at C1 and 8.5–9 at C2; the page
  marks 8.0 as borderline C1/C2 and 5.0 as borderline B1/B2. IELTS shows no alignment below band 4,
  so A2 and below are left empty.
- **TOEFL iBT**: Papageorgiou, Li, Gu & Barton, *A banded score scale for the TOEFL iBT test:
  Rationale, development, and score linking*, ETS, April 2026,
  <https://www.ets.org/content/dam/ets-org/pdfs/toefl/score-scale-update-2026.pdf>.
  Table 7 gives the 1–6 band for each CEFR level. The legacy 0–120 ranges are taken from Table 6
  (total-score minimum for each band: 1.5 = 12, 2 = 24, 3 = 44, 4 = 72, 5 = 95, 6 = 114), grouped by
  the CEFR level of the band.
- **PTE Academic**: Pearson, *PTE Academic Institution Score Guide*, July 2025, Appendix
  (10–29 "A1 or below", 30–42 A2, 43–58 B1, 59–75 B2, 76–84 C1, 85–90 C2),
  <https://www.pearsonpte.com/ctf-assets/yqwtwibiobs4/5DRw75hgULAIPO8L65PBE9/0fc1aff4b40d058de93511fed70ee26c/pte-academic-institution-score-guide-nov-2024-v2.pdf>.
  Pearson's score-setting page says the 2025 update did not change the CEFR table.
- **Cambridge English Qualifications** (young learners and *for Schools*): the CEFR level is part of
  each qualification's name, <https://www.cambridgeenglish.org/exams-and-tests/qualifications/>.

`test/external-equivalences.test.ts` locks every value above.

## Assumptions and limits

1. **Indicative only.** Every rendering says "not an official score", names the sources, and states
   that b4skills has not run a concordance study. Receiving institutions set their own requirements.
2. **Final results only.** Alignments and the certificate are hidden while a result is provisional,
   under review or expired.
3. **Young learners** (Primary 7–10, Junior 11–14, detected by `reportTemplate` `yle` /
   `toefl_junior` or an age range ending at 14 or below): IELTS, TOEFL iBT and PTE are hidden and
   replaced by the Cambridge qualification at the same CEFR level. TOEFL Primary / TOEFL Junior are
   not shown: ETS's CEFR mapping for those scales was not verified for this change.
4. **Pre-A1** has no IELTS, TOEFL iBT or PTE alignment (the owners publish none); TOEFL band 1 is A1.
5. **CEFR cut scores** are the platform's provisional thresholds (unchanged; locked by
   `test/irt-cefr-critical.test.ts`). Both documents say so.
6. **Can-do statements** are short platform paraphrases of the CEFR Companion Volume (2020), one per
   skill and level, in English and Turkish (`report-copy.ts`). They describe what is typical at a
   level, not abilities observed item by item.
7. **Rubric profile** is the mean of `Response.metadata.rubricScores` (0–10) over scored,
   non-pretest writing/speaking responses (`shouldExcludeResponseFromAbility` filters pretest,
   pending and review-held answers). Dimensions: task achievement, coherence, grammar, vocabulary,
   and fluency for speaking.
8. **Measurement precision**: skill and overall intervals are θ ± 1.96 × SEM shown on the BEPS
   0–1000 axis (BEPS = 125 × (θ + 4)), with the CEFR cuts drawn on the same axis.
9. **Duration** is `completedAt − startedAt`; it is omitted when either is missing.
10. **Issuer**: the session's organisation name; an organisation logo is used only from an
    `http(s)` or same-origin URL in `Organization.branding.logoUrl`. No signature is printed.
11. The existing pdfkit PDF (`/api/sessions/:id/report.pdf`) and `CertificateView` are unchanged;
    the new documents print to PDF from the browser (`Print / PDF`).
