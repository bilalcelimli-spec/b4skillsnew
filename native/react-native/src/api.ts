import type { ExamAdmission, ExamPolicy, NativeEvent, Preflight } from './proctoring/protocol';
import type { NativePlatform } from './proctoring/platform';
// Client for B4Skills (server.ts), including versioned native policy/event contracts.
// Auth is the backend's httpOnly cookie pair; the native networking stack keeps the cookies.

export type Candidate = {
  uid: string;
  email: string;
  displayName?: string | null;
  organizationId?: string | null;
  allowedProductLine?: string | null;
};

export type Choice = string | { text: string };

export type ItemContent = {
  prompt?: string | null;
  passage?: string | null;
  stimulus?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
  options?: Choice[] | null;
  minWords?: number | null;
  maxWords?: number | null;
  scaffold?: string | null;
  blanks?: Array<{ label?: string }> | null;
  wordBank?: string[] | null;
};

export type AssessmentItem = { id: string; skill: string; type: string; metadata: ItemContent };

export type Delivery = {
  stop: boolean;
  sectionTransition?: boolean | null;
  nextSection?: string | null;
  item?: AssessmentItem | null;
};

export type SessionProgress = {
  examAdmission?: ExamAdmission | null;
  status?: string | null;
  progress: number;
  maxItems: number;
  pendingCount?: number | null;
  cefrLevel?: string | null;
  provisional?: boolean | null;
  answeredItemIds?: string[] | null;
  skills?: Record<string, number | null> | null;
};

export type Answer =
  | { kind: 'choice'; index: number }
  | { kind: 'text'; text: string }
  | { kind: 'blanks'; answers: string[] }
  | { kind: 'audio'; base64: string };

export type ResponseMode = 'choice' | 'text' | 'audio' | 'blanks' | 'unsupported';

/** Same marker normalization and ordered pipe-separated payload as the backend. */
export function blankTask(item: AssessmentItem) {
  const c = item.metadata;
  const source = c.scaffold || [c.prompt, c.passage].find(t => t?.includes('___')) || '';
  const scaffold = source.replace(/_{3,}(?:\[?\d+\]?_{3,})?/g, '___');
  const count = (scaffold.match(/___/g) ?? []).length || c.blanks?.length || 1;
  const choices = c.wordBank?.length ? c.wordBank : (c.options ?? []).map(choiceText);
  return { scaffold, count, choices };
}

export function completeBlanks(answers: string[], count: number): boolean {
  return answers.length === count && answers.every(a => !!a.trim() && !a.includes('|'));
}

export function choiceText(choice: Choice): string {
  return typeof choice === 'string' ? choice : choice?.text ?? '';
}

export function responseMode(item: AssessmentItem): ResponseMode {
  // Integrated/structured tasks need their own renderer and are deliberately blocked.
  const options = item.metadata?.options ?? [];
  if (item.type === 'FILL_IN_BLANKS') return 'blanks';
  if (item.type === 'MULTIPLE_CHOICE' && options.length > 0) return 'choice';
  if (item.skill === 'SPEAKING' && ['OPEN_RESPONSE', 'SPEAKING_PROMPT'].includes(item.type)) return 'audio';
  if (item.skill === 'WRITING' && ['OPEN_RESPONSE', 'WRITING_PROMPT'].includes(item.type)) return 'text';
  return 'unsupported';
}

export function canRender(item: AssessmentItem): boolean {
  return (
    responseMode(item) !== 'unsupported' &&
    !!item.metadata?.prompt &&
    (item.skill !== 'LISTENING' || !!item.metadata?.audioUrl)
  );
}

export function isFinished(p?: SessionProgress | null): boolean {
  return ['COMPLETED', 'ABORTED', 'EXPIRED'].includes(p?.status ?? '');
}

export class ApiError extends Error {
  constructor(message: string, readonly status?: number, readonly code?: string) {
    super(message);
  }
}

/** Fixed-form products run only in the web app (see src/lib/fixed-forms/ozgun-kids.ts). */
export const WEB_ONLY_PRODUCT_LINES = ['Özgün Kids — Form A (96 soru)'];

export type CandidateDetails = { name: string; surname: string; email: string; school: string; className: string };
export type Redemption = { success: true; organizationId: string; productLine: string; candidateId: string; displayName?: string | null };

/** Same rules as the backend's CodeString schema: 4–64 letters, digits or dashes, uppercased. */
export function normaliseExamCode(raw: string): string {
  return raw.trim().toUpperCase();
}
export function isExamCode(code: string): boolean {
  return /^[A-Z0-9-]{4,64}$/.test(code);
}

const LAN = /^(10\.\d{1,3}|192\.168|172\.(1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}$/;

/** Validates and normalises the backend origin. HTTP is accepted only for local development hosts. */
export function normaliseBaseUrl(raw: string): string {
  const value = raw.trim().replace(/\/+$/, '');
  const match = /^(https?):\/\/([^/?#@\s]+)$/i.exec(value);
  if (!match) throw new ApiError('Geçerli bir sunucu adresi girin (ör. https://b4skills.com).');
  const scheme = match[1].toLowerCase();
  const host = match[2].replace(/:\d+$/, '').toLowerCase();
  if (scheme === 'http') {
    const local =
      host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.local') || LAN.test(host);
    if (!local || !__DEV__) {
      throw new ApiError('Uzak sunucular için HTTPS kullanın. HTTP yalnızca yerel geliştirme ağında kabul edilir.');
    }
  }
  return `${scheme}://${match[2]}`;
}

export class Backend {
  constructor(readonly baseUrl: string) {}

  async login(email: string, password: string): Promise<Candidate> {
    await this.request('api/auth/login', { email, password }, false);
    // Login omits allowedProductLine; resolve the authoritative candidate context via /me.
    return this.me();
  }

  async me(): Promise<Candidate> {
    const identity = await this.request<{ user: Candidate }>('api/auth/me');
    if (!identity?.user?.uid) throw new ApiError('Sunucudan beklenen yanıt alınamadı.');
    return identity.user;
  }

  async logout(): Promise<void> {
    try {
      await this.request('api/auth/logout', {}, false);
    } catch {
      // Cookies are cleared locally regardless.
    }
  }

  /** POST /api/codes/validate — read-only check; does not consume the code. */
  async validateCode(code: string): Promise<{ productLine: string; expiresAt?: string | null }> {
    const data = await this.request<{ valid?: boolean; productLine?: string; expiresAt?: string | null }>('api/codes/validate', { code }, false);
    if (data?.valid !== true || typeof data.productLine !== 'string') throw new ApiError('Kod doğrulanamadı. Lütfen tekrar deneyin.');
    return { productLine: data.productLine, expiresAt: data.expiresAt };
  }

  /**
   * POST /api/codes/redeem — consumes the code and signs the candidate in (the server sets the
   * auth cookies). candidateId is reused across retries of the same attempt, as on the web.
   */
  async redeemCode(code: string, candidateId: string, details: CandidateDetails): Promise<Redemption> {
    const data = await this.request<Redemption>('api/codes/redeem', { code, candidateId, ...details }, false);
    if (data?.success !== true || !data.productLine || !data.organizationId || !data.candidateId) {
      throw new ApiError('Kayıt doğrulanamadı. Tekrar denemeden önce kurumunuzla iletişime geçin.');
    }
    return data;
  }

  launch(productLine: string, organizationId?: string | null, launchRequestId?: string, preflight?: Preflight) {
    return this.request<{ sessionId: string }>('api/sessions/launch', {
      ...(preflight ? { preflight } : {}), productLine, ...(organizationId ? { organizationId } : {}), ...(launchRequestId ? { launchRequestId } : {}),
    });
  }

  examPolicy() { return this.request<ExamPolicy>('api/assessment/policy'); }

  async sendEvent(event: NativeEvent): Promise<void> {
    const ack = await this.request<{ accepted: boolean; eventId: string }>('api/proctoring/event', event);
    if (ack?.accepted !== true || ack.eventId !== event.eventId) throw new ApiError('Gözetim olayı alındı onayı doğrulanamadı.');
  }

  next(id: string) {
    return this.request<Delivery>(`api/sessions/${encodeURIComponent(id)}/next`);
  }

  status(id: string) {
    return this.request<SessionProgress>(`api/sessions/${encodeURIComponent(id)}/status`);
  }

  async respond(id: string, itemId: string, answer: Answer, latencyMs: number): Promise<void> {
    if (answer.kind === 'blanks' && (!answer.answers.length || !completeBlanks(answer.answers, answer.answers.length))) {
      throw new ApiError('Her boşluğu doldurun; yanıtlarda | işaretini kullanmayın.');
    }
    const value =
      answer.kind === 'choice' ? answer.index
      : answer.kind === 'text' ? answer.text
      : answer.kind === 'blanks' ? answer.answers.map(a => a.trim()).join('|')
      : { audio: answer.base64, mimeType: 'audio/mp4' };
    const ack = await this.request<{ success: boolean }>(`api/sessions/${encodeURIComponent(id)}/respond`, {
      itemId,
      value,
      latencyMs: Math.max(0, Math.min(3_600_000, Math.round(latencyMs))),
    });
    if (!ack?.success) throw new ApiError('Sunucudan beklenen yanıt alınamadı.');
  }

  async cameraPolicy(sessionId: string): Promise<{ enabled: boolean; retentionDays: number }> {
    const result = await this.request<Partial<{ enabled: unknown; retentionDays: unknown }> | null>(`api/sessions/${encodeURIComponent(sessionId)}/camera-policy`);
    const enabled = result?.enabled, retentionDays = result?.retentionDays;
    if (typeof enabled !== 'boolean' || typeof retentionDays !== 'number' || !Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 30) throw new ApiError('Kamera politikası doğrulanamadı.');
    return { ...result, enabled, retentionDays };
  }

  async sendCameraPhoto(sessionId: string, evidenceId: string, photo: import('./native').CameraPhoto, platform: NativePlatform, current: () => boolean = () => true): Promise<void> {
    if (!current()) throw new ApiError('Fotoğraf gönderimi iptal edildi.');
    if (photo.faceCount !== 1) throw new ApiError('Fotoğrafta yalnız bir yüz görünmeli. Yeniden çekin.');
    const { base64, faceCount, bytes, sha256, capturedAt } = photo;
    const reserved = await this.request<{ reserved?: unknown; evidenceId?: unknown } | null>('api/proctoring/evidence/reserve', {
      version: 1, evidenceId, sessionId, platform,
      kind: 'baseline', mimeType: 'image/jpeg', bytes, sha256, capturedAt, faceCount,
    });
    if (reserved?.reserved !== true || reserved.evidenceId !== evidenceId) throw new ApiError('Fotoğraf rezervasyonu doğrulanamadı.');
    if (!current()) throw new ApiError('Fotoğraf gönderimi iptal edildi.');
    const ack = await this.request<{ accepted?: unknown; evidenceId?: unknown; eventId?: unknown } | null>('api/proctoring/evidence/commit', { version: 1, evidenceId, sessionId, base64 });
    if (ack?.accepted !== true || ack.evidenceId !== evidenceId || ack.eventId !== `evidence_${evidenceId.toLowerCase()}`) throw new ApiError('Fotoğraf teslimi doğrulanamadı. Aynı fotoğrafla yeniden deneyin.');
  }

  mediaUrl(raw?: string | null): string | null {
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('//')) return null;
    return `${this.baseUrl}/${raw.replace(/^\/+/, '')}`;
  }

  private async request<T = unknown>(path: string, body?: unknown, refresh = true): Promise<T> {
    const send = () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45_000);
      return fetch(`${this.baseUrl}/${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          Origin: this.baseUrl,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          'Cache-Control': 'no-store',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
    };

    let response: Response;
    try {
      response = await send();
      if (response.status === 401 && refresh) {
        // A rejected authenticated request never reached its handler, so only this case is replayed.
        await this.request('api/auth/refresh', {}, false);
        response = await send();
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Sunucuya ulaşılamadı. İnternet bağlantınızı ve sunucu adresini kontrol edin.');
    }

    const text = await response.text();
    let data: { message?: unknown; error?: unknown; code?: unknown } | null = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!response.ok) {
      const message = (typeof data?.message === 'string' ? data.message : undefined) ?? (typeof data?.error === 'string' ? data.error : undefined) ?? (response.status === 401 ? 'Oturumunuzun süresi doldu. Yeniden giriş yapın.' : 'İstek tamamlanamadı');
      throw new ApiError(`${message} (HTTP ${response.status})`, response.status, typeof data?.code === 'string' ? data.code : typeof data?.error === 'string' ? data.error : undefined);
    }
    return data as T;
  }
}
