/** One bounded retry fits inside the background job deadline, including backoff. */
export const SCORING_POLICY_VERSION = '2026-10-14.5';
export const SCORING_MODEL = 'gemini-2.5-flash';
export const SCORING_REQUEST_TIMEOUT_MS = 45_000;
export const SCORING_MAX_RETRIES = 1;
export const SCORING_MAX_RETRY_DELAY_MS = 5_000;
export const SCORING_JOB_TIMEOUT_MS = SCORING_REQUEST_TIMEOUT_MS * (SCORING_MAX_RETRIES + 1) + SCORING_MAX_RETRY_DELAY_MS + 5_000;

/** Store categories only: provider error bodies may contain credentials or response text. */
export function scoringFailureCode(error: unknown): string {
  const e = error as { status?: number; name?: string; message?: string } | null;
  const message = String(e?.message ?? '').toLowerCase();
  if (e?.name === 'CircuitBreakerOpenError') return 'AI_CIRCUIT_OPEN';
  if (/not configured|api key.*missing/.test(message)) return 'AI_NOT_CONFIGURED';
  if (e?.status === 401 || e?.status === 403 || /api.key.not.valid|api key not valid/.test(message)) return 'AI_AUTH_FAILED';
  if (e?.status === 429 || /429|quota|resource_exhausted/.test(message)) return 'AI_RATE_LIMITED';
  if (e?.name === 'AbortError' || /timeout|timed out|aborted/.test(message)) return 'AI_TIMEOUT';
  if (error instanceof SyntaxError || /invalid ai|missing ai|no result|empty ai|incomplete ai/.test(message)) return 'AI_INVALID_RESULT';
  if (/fetch failed|econn|network|socket/.test(message)) return 'AI_NETWORK_ERROR';
  return 'AI_PROVIDER_ERROR';
}
