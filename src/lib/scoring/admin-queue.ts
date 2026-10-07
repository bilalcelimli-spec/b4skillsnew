import { productiveModes, productiveScoringMode } from '../assessment-engine/productive-response.js';
import { shouldExcludeResponseFromAbility } from './score-evidence.js';
import { buildScoringPrompt } from './task-context.js';
import type { ScoringJob } from './scoring-queue.js';

export const unresolvedScoringWhere = {
  isPretest: false,
  OR: [
    { score: null },
    ...['pendingAsyncScore', 'requiresHumanReview', 'scoreFailed'].map(key => ({ metadata: { path: [key], equals: true } })),
    ...['ai_unavailable', 'ai_flagged'].map(value => ({ metadata: { path: ['scoreSource'], equals: value } })),
  ],
};
type QueueResponse = {
  id: string; sessionId: string; itemId: string; value: string | null;
  score: number | null; humanScore?: number | null; isPretest?: boolean; metadata?: unknown; createdAt: Date;
  item: { skill: string; type?: string; content: unknown };
  ratingTask?: { status: string; score: number | null } | null;
  session?: { candidate?: { name: string | null; email: string } };
};
const metadata = (response: QueueResponse) => (response.metadata ?? {}) as Record<string, unknown>;
function decodedValue(response: QueueResponse): ScoringJob['value'] {
  const raw = response.value ?? '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.audio === 'string' && typeof parsed.mimeType === 'string') return parsed;
  } catch { /* Writing may contain literal JSON or plain text. */ }
  return raw;
}
export function queueResponseStatus(response: QueueResponse): 'pending' | 'failed' | 'review' | null {
  if (response.isPretest || response.humanScore != null || !shouldExcludeResponseFromAbility(response)) return null;
  const content = (response.item.content ?? {}) as Record<string, unknown>;
  if (!productiveModes(response.item.skill, response.item.type, content).length) return null;
  const meta = metadata(response);
  if (meta.scoreFailed === true || meta.scoreSource === 'ai_unavailable') return 'failed';
  if (meta.requiresHumanReview === true || meta.scoreSource === 'ai_flagged') return 'review';
  return 'pending';
}
export function retryScoringJob(response: QueueResponse): ScoringJob | null {
  const status = queueResponseStatus(response);
  if (!status || status === 'review' || (response.ratingTask &&
    (response.ratingTask.status !== 'PENDING' || response.ratingTask.score != null))) return null;
  const content = (response.item.content ?? {}) as Record<string, unknown>;
  const value = decodedValue(response);
  try {
    const skill = productiveScoringMode(response.item.skill, response.item.type, content, value);
    if (!skill || (skill === 'SPEAKING' && typeof value === 'string')) return null;
    return { responseId: response.id, sessionId: response.sessionId, itemId: response.itemId,
      skill, value, prompt: buildScoringPrompt(content) };
  } catch { return null; }
}
export function summarizeAdminQueue(responses: QueueResponse[], now = Date.now()) {
  const groups = new Map<string, {sessionId: string; candidateName: string; candidateEmail: string; skill: string;
    pendingCount: number; reviewCount: number; failedCount: number; retryableCount: number; submittedAt: Date}>();
  for (const response of responses) {
    const status = queueResponseStatus(response);
    if (!status) continue;
    const content = (response.item.content ?? {}) as Record<string, unknown>;
    const meta = metadata(response);
    let skill = productiveModes(response.item.skill, response.item.type, content)[0];
    try { skill = productiveScoringMode(response.item.skill, response.item.type, content, decodedValue(response)) ?? skill; }
    catch { if (meta.scoringMode === 'WRITING' || meta.scoringMode === 'SPEAKING') skill = meta.scoringMode; }
    const key = JSON.stringify([response.sessionId, skill]);
    const group = groups.get(key) ?? {sessionId:response.sessionId,candidateName:response.session?.candidate?.name ?? 'Unknown',
      candidateEmail:response.session?.candidate?.email ?? '',skill,pendingCount:0,reviewCount:0,failedCount:0,retryableCount:0,submittedAt:response.createdAt};
    group.pendingCount++;
    if (status === 'review') group.reviewCount++;
    if (status === 'failed') group.failedCount++;
    if (retryScoringJob(response)) group.retryableCount++;
    if (response.createdAt < group.submittedAt) group.submittedAt = response.createdAt;
    groups.set(key,group);
  }
  const items = [...groups.values()].sort((a,b)=>+a.submittedAt-+b.submittedAt).map(group => {
    const hours = Math.max(0,(now-+group.submittedAt)/3_600_000);
    return {...group,submittedAt:group.submittedAt.toISOString(),hoursElapsed:Math.round(hours*10)/10,overdue:hours>=48};
  });
  return {items,stats:{totalPending:items.reduce((n,item)=>n+item.pendingCount,0),
    overdueCount:items.filter(i=>i.overdue).reduce((n,i)=>n+i.pendingCount,0),
    soonCount:items.filter(i=>!i.overdue && i.hoursElapsed>=36).reduce((n,i)=>n+i.pendingCount,0)}};
}
