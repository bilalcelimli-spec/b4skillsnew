/** Read-only first-phase checks. No automatic approval or empirical validity claims. */
import { speakerLabels } from '../audio/speaker-labels.js';
export type Severity = 'BLOCKER' | 'REVIEW' | 'EVIDENCE_GAP';
export interface AuditFinding {
  rule: string;
  severity: Severity;
  evidence: string;
  action: string;
}
export interface AuditItem {
  id: string;
  itemCode?: string | null;
  type: string;
  skill: string;
  cefrLevel: string;
  status: string;
  version: number;
  content: unknown;
  metadata?: unknown;
  construct?: string | null;
  subskill?: string | null;
  descriptorRef?: string | null;
  evidenceStatement?: string | null;
  estimatedResponseTimeSec?: number | null;
  itemReviews?: { reviewerId: string; verdict: string }[];
  _count?: { responses: number; calibrationRuns: number };
}
export function record(value: unknown): Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function firstText(...values: unknown[]): string { return values.map(text).find(Boolean) || ''; }
function populated(value: unknown): boolean {
  if (typeof value === 'string') return Boolean(value.trim());
  if (Array.isArray(value)) return value.length > 0;
  return Object.keys(record(value)).length > 0;
}
function labels(value: string): number {
  return speakerLabels(value).length;
}
export function auditItemEvidence(item: AuditItem): AuditFinding[] {
  const c = record(item.content), m = record(item.metadata);
  const findings: AuditFinding[] = [];
  const add = (rule: string, severity: Severity, evidence: string, action: string) => findings.push({ rule, severity, evidence, action });
  const prompt = firstText(c.prompt, c.question, c.stem, c.task);
  if (!prompt) add('PROMPT_MISSING', 'BLOCKER', 'No non-empty prompt/question/stem/task.', 'Supply candidate-facing instructions.');
  const options = Array.isArray(c.options) ? c.options : [];
  if (item.type === 'MULTIPLE_CHOICE') {
    if (options.length < 2) add('OPTIONS_MISSING', 'BLOCKER', `Found ${options.length} options.`, 'Supply selectable alternatives.');
    const texts = options.map(o => firstText(typeof o === 'string' ? o : record(o).text));
    if (texts.some(t => !t)) add('OPTION_TEXT_MISSING', 'BLOCKER', 'At least one alternative has no text.', 'Repair the alternative.');
    if (new Set(texts.map(t => t.toLowerCase().replace(/\s+/g, ' '))).size !== texts.length)
      add('DUPLICATE_OPTIONS', 'BLOCKER', 'Alternative texts repeat after whitespace/case normalization.', 'Rewrite duplicate alternatives and check the key.');
    const flagged = options.flatMap((o, i) => record(o).isCorrect === true ? [i] : []);
    const index = c.correctIndex;
    const answer = text(c.correctAnswer);
    const answerIndex = answer ? options.findIndex((o, i) => answer === text(record(o).id) || answer.toUpperCase() === String.fromCharCode(65 + i)) : -1;
    const explicitIndex = Number.isInteger(index) && index >= 0 && index < options.length ? index : undefined;
    if (index !== undefined && explicitIndex === undefined) add('KEY_INDEX_INVALID', 'BLOCKER', 'correctIndex is outside the available alternatives.', 'Repair the scoring key.');
    if (answer && answerIndex < 0) add('KEY_UNRESOLVED', 'REVIEW', 'correctAnswer does not resolve to an option ID or position letter.', 'Check actual delivery/scoring format before changing the key.');
    if (flagged.length > 1) add('MULTIPLE_KEYS', 'BLOCKER', `Found ${flagged.length} marked alternatives in the single-choice type.`, 'Confirm task semantics and repair the key or supported response type.');
    if (!flagged.length && explicitIndex === undefined && !answer) add('KEY_MISSING', 'BLOCKER', 'No marked option, correctIndex or correctAnswer.', 'Supply a scoring key.');
    const keys = [...flagged, ...(explicitIndex === undefined ? [] : [explicitIndex]), ...(answerIndex < 0 ? [] : [answerIndex])];
    if (new Set(keys).size > 1) add('KEY_CONFLICT', 'BLOCKER', 'Stored answer representations point to different options.', 'Reconcile all scoring representations.');
    if (options.some(o => !text(record(o).rationale))) add('OPTION_RATIONALES_MISSING', 'EVIDENCE_GAP', 'One or more alternatives lack a recorded rationale.', 'Document correct and incorrect alternative rationales.');
  }
  if (item.type === 'FILL_IN_BLANKS' && !options.length) {
    const blanks = Array.isArray(c.blanks) ? c.blanks : [];
    const hasAnswers = (v: unknown) => Array.isArray(v) && v.some(a => text(a));
    if (blanks.length ? blanks.some(b => !hasAnswers(record(b).acceptableAnswers)) : !hasAnswers(c.acceptableAnswers) && !firstText(c.correctAnswer, c.answer))
      add('GAP_ANSWERS_MISSING', 'BLOCKER', 'An open gap lacks accepted answer variants.', 'Define accepted answers for every gap.');
  }
  if (item.skill === 'READING' && !firstText(c.passage, c.text, c.readingText))
    add('READING_SOURCE_MISSING', 'REVIEW', 'No passage/text/readingText field.', 'Verify the shared stimulus and that the answer is supported by it.');
  if (item.skill === 'LISTENING') {
    if (!text(c.audioUrl)) add('AUDIO_MISSING', 'BLOCKER', 'No audioUrl.', 'Provide playable audio.');
    const source = firstText(c.transcript, c.passage, c.script);
    if (!source) add('TRANSCRIPT_MISSING', 'EVIDENCE_GAP', 'No source transcript recorded.', 'Record the transcript for editorial comparison.');
    const expected = Math.max(Number(c.numberOfSpeakers) || 0, Array.isArray(c.speakers) ? c.speakers.length : 0, labels(source), labels(text(c.ttsScript)));
    const audioMetadata = record(c.audioMetadata);
    const produced = Number(audioMetadata.speakerCount);
    if (expected >= 2 && (!Number.isFinite(produced) || produced < 2))
      add('DIALOGUE_PRODUCTION_UNVERIFIED', 'EVIDENCE_GAP', `Script/declared speakers=${expected}; recorded production speakerCount=${Number.isFinite(produced) ? produced : 'absent'}.`, 'Check actual audio and record production evidence for its version.');
    if (expected > 2 && produced === 2)
      add('SPEAKER_IDENTITIES_COLLAPSED', 'REVIEW', `${expected} source participants were mapped to two voice channels.`, 'Check that speaker identity questions remain answerable; use distinct voices if identity is part of the construct.');
    if (/^\s*\[[^\]\n]+\]:/m.test(text(c.ttsScript)) && expected >= 2)
      add('LEGACY_BRACKETED_DIALOGUE', 'REVIEW', 'Bracketed speaker labels were not recognized by the previous TTS parser; old audio may be single-voice.', 'Listen to the existing recording before deciding whether regeneration is necessary.');
    if (expected >= 2 && text(c.ttsScript) && labels(text(c.ttsScript)) < 2)
      add('DIALOGUE_SCRIPT_COLLAPSED', 'REVIEW', `Source indicates ${expected} speakers; TTS labels do not preserve them. Audio has not been listened to.`, 'Listen to the actual audio; verify turns and voices before any regeneration.');
    add('AUDIO_HUMAN_CHECK_REQUIRED', 'EVIDENCE_GAP', 'This static audit cannot verify audible voices, pronunciation, intelligibility or transcript alignment.', 'Record a human listening check against this content/audio version.');
  }
  if (['WRITING', 'SPEAKING'].includes(item.skill)) {
    if (!populated(c.rubric) && !populated(c.scoringRubric)) add('RUBRIC_MISSING', 'EVIDENCE_GAP', 'No item-specific rubric in content.', 'Link the applicable scoring rubric and version.');
    if (!populated(c.sampleAnswer) && !populated(c.sampleAnswers) && !populated(c.exemplar)) add('EXEMPLAR_MISSING', 'EVIDENCE_GAP', 'No model response recorded in recognized fields.', 'Add feasible responses with adjudicated dimension scores.');
    const seconds = Number(c.responseTime || c.maxTime || c.responseTimeSec || item.estimatedResponseTimeSec || 0);
    const limits = ['responseTime', 'maxTime', 'responseTimeSec', 'timeLimitSeconds'].flatMap(field => Number(c[field]) > 0 ? [Number(c[field])] : []);
    if (new Set(limits).size > 1) add('RESPONSE_LIMIT_CONFLICT', 'REVIEW', `Conflicting item-level seconds: ${limits.join(', ')}; renderer uses responseTime/maxTime.`, 'Choose one effective limit and align delivery, instructions and scoring evidence.');
    const words = Number(c.maxWords || c.wordLimit || 0);
    if (item.skill === 'SPEAKING' ? !(seconds > 0) : !(words > 0)) add('RESPONSE_LIMIT_UNDOCUMENTED', 'EVIDENCE_GAP', 'Response time/word limit is absent at item level.', 'Document the effective delivery limit, including profile defaults.');
    const demands = Math.max((prompt.match(/\?/g) || []).length, (prompt.match(/(?:^|\n)\s*(?:[-•]|\d+[.)])\s+/g) || []).length, 1)
      + (prompt.match(/\b(?:and|then)\s+(?:explain|describe|justify|compare|give|discuss|suggest)\b/gi) || []).length;
    if ((item.skill === 'SPEAKING' && seconds > 0 && seconds <= 60 && demands >= 4) || (item.skill === 'WRITING' && words > 0 && words <= 120 && demands >= 5))
      add('RESPONSE_LOAD_REVIEW', 'REVIEW', `Heuristic detects ${demands} demands; limit=${seconds || words}. This is not a CEFR rule.`, 'Check feasibility at the target level with timed sample responses.');
  }
  const missing = ['construct', 'subskill', 'descriptorRef', 'evidenceStatement'].filter(field => !text(item[field as keyof AuditItem]));
  if (missing.length) add('CONSTRUCT_MAPPING_INCOMPLETE', 'EVIDENCE_GAP', `Missing item fields: ${missing.join(', ')}.`, 'Document the target construct and descriptor mapping; a CEFR label alone is insufficient.');
  if (!populated(m.source) && !populated(m.license) && !populated(c.source) && !populated(c.license))
    add('RIGHTS_EVIDENCE_UNLOCATED', 'EVIDENCE_GAP', 'No source/license evidence found in recognized content/metadata fields; original authorship may be documented elsewhere.', 'Record authorship or source and usage rights.');
  const approvals = new Set((item.itemReviews || []).filter(r => r.verdict === 'APPROVE').map(r => r.reviewerId));
  if (approvals.size < 2) add('DUAL_REVIEW_EVIDENCE_MISSING', 'EVIDENCE_GAP', `${approvals.size} distinct approving reviewers recorded.`, 'Obtain two independent reviews and adjudicate disagreements.');
  else add('REVIEW_VERSION_UNVERIFIED', 'EVIDENCE_GAP', 'Review records do not bind approval to a content version/hash.', 'Confirm both approvals cover the current content and record version-bound evidence.');
  if (m.paramSource !== 'calibrated' || !item._count?.calibrationRuns)
    add('EMPIRICAL_CALIBRATION_UNVERIFIED', 'EVIDENCE_GAP', `paramSource=${text(m.paramSource) || 'unrecorded'}; calibrationRuns=${item._count?.calibrationRuns ?? 'unknown'}; responses=${item._count?.responses ?? 'unknown'} (not unique candidates).`, 'Collect pilot coverage and assess fit, uncertainty and fairness; no automatic calibration claim.');
  return findings;
}

export function buildEvidenceQueue(items: AuditItem[]) {
  const queue = items.map(item => {
    const findings = auditItemEvidence(item);
    return { itemId: item.id, itemCode: item.itemCode, version: item.version, status: item.status, skill: item.skill,
      type: item.type, cefrLevel: item.cefrLevel, findings,
      requiredManualChecks: [
        'Construct and CEFR descriptor alignment', 'Unambiguous instructions and feasible response load',
        'Natural language, fairness and construct-preserving accessibility', 'Authorship/source and usage rights',
        ...(['MULTIPLE_CHOICE', 'FILL_IN_BLANKS', 'DRAG_DROP'].includes(item.type)
          ? ['Key correctness and plausible alternatives/accepted variants'] : []),
        ...(item.skill === 'LISTENING' ? ['Listen to actual audio: speaker turns, intelligibility and transcript alignment'] : []),
        ...(['WRITING', 'SPEAKING'].includes(item.skill) ? ['Timed sample response and rubric/exemplar alignment'] : []),
      ],
      decision: findings.some(f => f.severity === 'BLOCKER') ? 'BLOCKED' : 'PENDING_REVIEW_AND_EVIDENCE' };
  });
  const rank = (row: typeof queue[number]) => (row.findings.some(f => f.severity === 'BLOCKER') ? 0 : row.findings.some(f => f.severity === 'REVIEW') ? 2 : 4) + (row.status === 'ACTIVE' ? 0 : 1);
  return queue.sort((a, b) => rank(a) - rank(b) || a.itemId.localeCompare(b.itemId));
}
