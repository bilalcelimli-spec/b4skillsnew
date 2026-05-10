# CEFR Construct Map — b4skills

> **Standard:** Council of Europe CEFR (2001) + Companion Volume (2020)  
> **Status:** Phase I — receptive skills complete; productive skill rubrics reference cefr-framework.ts  
> **Owner:** Assessment Director  
> **Last updated:** 2026-05  
> **Psychometric reference:** `docs/validity-argument.md` §Inference 3 (Extrapolation)

---

## Purpose

This document maps each b4skills assessment task type to specific CEFR Companion Volume 2020 descriptor families. It is the primary reference for:

1. **Item writers** — what the item must elicit to be construct-valid
2. **Expert reviewers** — which descriptor to check against
3. **Validity argument** — Inference 3 (Extrapolation) evidence
4. **ALTE Code of Practice** — Area 1.2 (construct explicitly defined)

---

## Skill 1 — READING

### Construct Definition

> CEFR CV 2020: "Reading comprehension — Overall reading comprehension" scale (p. 57)  
> Core construct: extracting meaning from written texts matching the candidate's CEFR level in terms of topic, length, and linguistic complexity.

### Level-by-Level Operationalisation

#### PRE_A1
- **CEFR descriptor:** "Can understand very short, simple texts, reading them phrase by phrase, picking out familiar names, words and basic phrases."
- **b4skills item type:** MC (3 options), picture-text matching
- **Passage:** ≤ 30 words, A1 vocabulary only, zero inference required
- **Cognitive level (Bloom):** Remember
- **Konu havuzu:** Numbers, colours, greetings, family members, classroom objects
- **Construct-irrelevant threats:** Reading anxiety, unfamiliar names → mitigate by using common names

#### A1
- **CEFR descriptor:** "Can understand short, simple messages on postcards; can understand simple directions from X to Y, on foot or by public transport."
- **b4skills item type:** MC (4 options), FIB (single word)
- **Passage:** 40–80 words, A1 EVP vocabulary ≥ 88%
- **FK Grade:** ≤ 2
- **Question types:** Direct information retrieval (70%), vocabulary in context (30%)
- **Cognitive level:** Remember + Understand
- **Topics:** Family, home, shopping, weather, basic directions
- **Excluded:** Abstract concepts, cultural knowledge, metaphor

#### A2
- **CEFR descriptor:** "Can understand short, simple texts on familiar matters of a concrete type which consist of high-frequency everyday or job-related language."
- **b4skills item type:** MC (4 options), FIB (1–3 words)
- **Passage:** 80–150 words, A1+A2 EVP vocabulary ≥ 83%
- **FK Grade:** 2–4
- **Question types:** Direct (60%), inference (30%), vocabulary (10%)
- **Cognitive level:** Understand
- **Topics:** Short articles, notices, menus, timetables, simple letters/emails
- **Authenticity:** Adapted from real notices, menus, flyers

#### B1
- **CEFR descriptor:** "Can read straightforward factual texts on subjects related to his/her field and interest with a satisfactory level of comprehension."
- **b4skills item type:** MC (4 options), multiple-answer MC
- **Passage:** 150–300 words, B1 band ≥ 78% cumulative coverage
- **FK Grade:** 5–7
- **Question types:** Inference (45%), direct (40%), discourse (15%)
- **Cognitive level:** Understand + Apply
- **Topics:** News articles, informational texts, personal letters, product descriptions
- **Excluded from items:** Questions that require world knowledge unavailable from text

#### B2
- **CEFR descriptor:** "Can read articles and reports concerned with contemporary problems in which the writers adopt particular stances or viewpoints."
- **b4skills item type:** MC (4/5 options), FIB (phrase level)
- **Passage:** 300–500 words, authentic source preferred
- **FK Grade:** 8–10
- **Question types:** Analytical (50%), inference (35%), vocabulary in context (15%)
- **Cognitive level:** Apply + Analyse
- **Topics:** Opinion articles, reports, academic-adjacent texts
- **Construct note:** Must test *how writer uses language*, not just *what writer says*

#### C1
- **CEFR descriptor:** "Can understand long, complex factual and literary texts, appreciating distinctions of style."
- **b4skills item type:** MC (5 options), sentence completion, paragraph matching
- **Passage:** 500–800 words, authentic source (newspaper/academic journal)
- **FK Grade:** 11–14
- **Question types:** Evaluative (40%), rhetorical analysis (35%), lexical precision (25%)
- **Cognitive level:** Analyse + Evaluate
- **Topics:** Academic articles, quality journalism, professional reports

#### C2
- **CEFR descriptor:** "Can read with ease virtually all forms of the written language, including abstract, structurally or linguistically complex texts."
- **b4skills item type:** MC (5 options), matching headings, summary completion
- **Passage:** 700–1000 words, unmodified authentic text
- **FK Grade:** ≥ 14
- **Question types:** Critical (50%), intertextual inference (30%), stylistic analysis (20%)
- **Cognitive level:** Evaluate + Create

---

## Skill 2 — LISTENING

### Construct Definition

> CEFR CV 2020: "Listening comprehension — Overall listening comprehension" (p. 49)  
> Core construct: extracting meaning from spoken language at a speed and complexity appropriate to the target CEFR level.

### Level-by-Level Operationalisation

| Level | Text type | Duration | Speed (wpm) | Accent | Question types |
|-------|-----------|----------|-------------|--------|----------------|
| PRE_A1 | Simple commands, object names | 15–30 s | ≤ 100 | RP/GenAm only | Picture matching |
| A1 | Short dialogues, directions | 30–60 s | ≤ 110 | Standard | Direct information |
| A2 | Everyday conversations, short announcements | 60–90 s | 110–130 | Near-standard | Direct + simple inference |
| B1 | Radio news, short interviews, dialogues | 90–150 s | 120–150 | Light accent | Inference + gist |
| B2 | Lectures, debates, radio documentaries | 150–240 s | 130–160 | Various accents | Analytical + evaluative |
| C1 | Academic lectures, complex debates | 240–360 s | 150–180 | Natural speed + accents | Rhetorical intent + inference |
| C2 | Unscripted authentic recordings | 300–480 s | Natural | Authentic diversity | As C1 + implicit meaning |

**Critical construct threats for LISTENING:**
- Background noise → standardise audio quality
- Unfamiliar proper nouns → avoid in A1/A2
- Cultural reference → provide glossary or avoid pre-B2

---

## Skill 3 — GRAMMAR

### Construct Definition

> CEFR CV 2020: "Grammatical accuracy" scale (p. 131)  
> Core construct: receptive and productive mastery of grammatical structures at the target level, tested in meaningful communicative context (not isolated drill).

### Grammar Inventory by Level (summary — full in `cefr-knowledge-base.ts`)

| Level | Productive structures | Receptive only |
|-------|----------------------|----------------|
| A1 | Present simple, be-sentences, basic plurals, demonstratives | Modal can |
| A2 | Past simple, present continuous, comparative, going to future | Present perfect (recognition) |
| B1 | Present perfect, past continuous, first conditional, passive (simple) | Reported speech, second conditional |
| B2 | All conditionals, passive all tenses, gerund/infinitive distinctions, relative clauses | Subjunctive (recognition), inversion |
| C1 | Inversion, cleft sentences, stance adverbials, complex noun phrases | All structures |
| C2 | All structures productively; idiomatic and stylistic grammar use | — |

**Item design rule:** Grammar items must embed the target structure in a contextualised sentence relevant to a real communicative situation. "The cat is ___ on the mat" is not a construct-valid item for B1+.

**Item formats:** FIB (preferred — eliminates guessing) > MC (4 options) > drag-and-drop

---

## Skill 4 — VOCABULARY

### Construct Definition

> CEFR CV 2020: "Vocabulary range" + "Vocabulary control" scales (p. 130–131)  
> Core construct: recognition and use of vocabulary at the target EVP band, in context.

### Vocabulary Bands (key thresholds)

| Level | EVP Band | NGSL coverage | Word families known |
|-------|----------|---------------|---------------------|
| A1 | Top 500 | 65% | ~500 |
| A2 | Top 1 000 | 80% | ~1 000 |
| B1 | Top 2 000 | 90% | ~2 000 (NGSL) |
| B2 | Top 3 000 | 93% | ~3 000 |
| C1 | Top 5 000 + AWL | 96% | ~5 000 + 570 AWL |
| C2 | Top 8 000+ | 98% | ~8 000+ |

**Item design rules:**
1. Target word must be in the target band (EVP data via `vocabulary-profiler.ts`)
2. Distractors must be plausible (same POS, near-frequency), not obscure
3. Context sentence must support inferencing without giving away the answer
4. FIB preferred; no isolated word→definition matching for B1+

---

## Skill 5 — WRITING

### Construct Definition

> CEFR CV 2020: "Written production — Overall written production" (p. 73) + "Written interaction" (p. 80)  
> Core construct: producing coherent, lexically appropriate, grammatically controlled written text for a specified communicative purpose.

### Task Types by Level

| Level | Task type | Word count | Rubric focus |
|-------|-----------|------------|--------------|
| A1 | Filling in a form, labelling, short list | 10–30 | Task completion, basic spelling |
| A2 | Short personal message/postcard, simple email | 30–80 | Task, coherence basics |
| B1 | Informal email, short essay, blog entry | 100–150 | Task, coherence, grammar, vocabulary |
| B2 | Formal email, report, essay (opinion) | 150–250 | All 4 rubric dimensions equally |
| C1 | Argumentative essay, complex report, review | 250–350 | Range + accuracy + coherent argument |
| C2 | Academic essay, critical review | 300–400+ | Rhetorical control, sophisticated lexis |

### Analytic Rubric (4 dimensions, 0–5 scale)

Each dimension scored independently and stored as `metadata.rubricScores.{dimension}`.  
This enables polytomous IRT (GRM) scoring.

**Dimension 1: Task Achievement**
- 5: All communicative goals fully met; appropriate register; no irrelevant content
- 3: Most goals met; minor lapses in register; some irrelevant content
- 1: Task partially met; register inappropriate; significant irrelevant content

**Dimension 2: Coherence & Cohesion**
- 5: Logically sequenced; varied and appropriate cohesive devices; clear paragraphing
- 3: Generally coherent; some repetitive or mechanical connectors; adequate paragraphing
- 1: Limited sequencing; few connectors; poor paragraph organisation

**Dimension 3: Lexical Resource**
- 5: Wide range; precise and idiomatic; very few spelling errors
- 3: Adequate range for task; some imprecision; occasional spelling errors
- 1: Very limited range; frequent inaccuracies; many errors

**Dimension 4: Grammatical Range & Accuracy**
- 5: Wide range; very few errors; structural variety
- 3: Mix of simple/complex structures; some errors but communication maintained
- 1: Limited structures; frequent errors; communication often impaired

### Writing Task Authenticity Requirement

> Every writing task must simulate a real-world communicative situation:  
> ✅ "Write an email to your professor explaining why you missed a class"  
> ✅ "Write a short report for your manager summarising customer feedback"  
> ❌ "Write a paragraph about your hobbies" (insufficient context, not authentic)

---

## Skill 6 — SPEAKING

### Construct Definition

> CEFR CV 2020: "Spoken production — Overall spoken production" (p. 57) + "Spoken interaction — Overall spoken interaction" (p. 66)  
> Core construct: producing fluent, coherent, accurate speech for communicative purposes; interacting in spoken contexts.

### Task Types by Level

| Level | Task type | Duration | Rubric focus |
|-------|-----------|----------|--------------|
| A1 | Name objects, describe pictures, answer simple Qs | 30–60 s | Task completion, intelligibility |
| A2 | Describe routine, simple opinion, picture description | 60–90 s | Fluency basics, range |
| B1 | Monologue on familiar topic, simple discussion | 90–150 s | All 4 dimensions |
| B2 | Topic card monologue, structured discussion | 2–3 min | Range + accuracy + coherence |
| C1 | Extended monologue, abstract topic | 3–4 min | All dimensions at high level |
| C2 | Spontaneous discussion, nuanced argument | 4–5 min | Precision, idiomatic fluency |

### Analytic Rubric (4 dimensions, 0–5 scale)

Same 0–5 scale as Writing — enables cross-skill polytomous IRT.

**Dimension 1: Fluency & Coherence** — flow, hesitation, logical sequencing  
**Dimension 2: Lexical Resource** — range, precision, paraphrase ability  
**Dimension 3: Grammatical Range & Accuracy** — structural variety, error frequency  
**Dimension 4: Pronunciation** — intelligibility, phonemic accuracy, prosody

### Task Design Rules

1. **No display questions:** "Tell me what colour this is" → not construct-valid above A1
2. **Information gap** for interaction tasks: each participant has unique information
3. **Processing time:** B1+ tasks include 30 s preparation time before speaking
4. **Scoring window:** AI scoring uses the first 90 s of each response; beyond that → skip

---

## Construct Coverage Gaps (Known)

| Gap | Severity | Planned Address |
|-----|---------|-----------------|
| Mediation tasks (CEFR CV 2020) | Medium | Phase III |
| Online interaction & digital literacy | Medium | Phase III |
| Plurilingual competence | Low | Research phase |
| Pragmatic competence (implied meaning) | High | Phase II (FIB in context) |
| Spoken interaction (real-time) vs. Speaking (monologue) | High | Phase II (interview format) |
| Reading-into-writing integrated tasks | Medium | Phase II (Academia profile) |

---

## Authenticity Checklist (per item)

Before any item is moved to `status: EXPERT_APPROVED`:

```
□ Is this a real-world communicative situation?
□ Is the language use motivated by communicative purpose, not test purpose?
□ Is the text/audio from a real or realistically simulated source?
□ Are proper nouns and cultural references appropriate for the target audience?
□ Has a representative from the target L1 group reviewed for bias?
□ Does the item avoid construct-irrelevant variance (test anxiety, cultural knowledge)?
□ Is the distractor design based on known learner errors at this level?
```

---

## Revision History

| Version | Date | Change |
|---------|------|--------|
| 0.1 | 2026-05 | Initial draft — receptive skills complete |
| — | Q3 2026 | Productive skill rubrics expanded (planned) |
| — | Q4 2026 | First expert panel review (planned) |
