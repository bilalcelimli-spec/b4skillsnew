// Client for the existing B4Skills backend (server.ts). No new endpoints are used.
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
};

export type AssessmentItem = { id: string; skill: string; type: string; metadata: ItemContent };

export type Delivery = {
  stop: boolean;
  sectionTransition?: boolean | null;
  nextSection?: string | null;
  item?: AssessmentItem | null;
};

export type SessionProgress = {
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
  | { kind: 'audio'; base64: string };

export type ResponseMode = 'choice' | 'text' | 'audio' | 'unsupported';

export function choiceText(choice: Choice): string {
  return typeof choice === 'string' ? choice : choice?.text ?? '';
}

export function responseMode(item: AssessmentItem): ResponseMode {
  // Integrated/structured tasks need their own renderer and are deliberately blocked.
  const options = item.metadata?.options ?? [];
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
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

const LAN = /^(10\.\d{1,3}|192\.168|172\.(1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}$/;

/** Validates and normalises the backend origin. HTTP is accepted only for local development hosts. */
export function normaliseBaseUrl(raw: string): string {
  const value = raw.trim().replace(/\/+$/, '');
  const match = /^(https?):\/\/([^/?#@\s]+)$/i.exec(value);
  if (!match) throw new ApiError('Geçerli bir sunucu adresi girin (ör. https://app.b4skills.com).');
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

  launch(productLine: string, organizationId?: string | null) {
    return this.request<{ sessionId: string }>('api/sessions/launch', { productLine, organizationId: organizationId ?? null });
  }

  next(id: string) {
    return this.request<Delivery>(`api/sessions/${encodeURIComponent(id)}/next`);
  }

  status(id: string) {
    return this.request<SessionProgress>(`api/sessions/${encodeURIComponent(id)}/status`);
  }

  async respond(id: string, itemId: string, answer: Answer, latencyMs: number): Promise<void> {
    const value =
      answer.kind === 'choice' ? answer.index
      : answer.kind === 'text' ? answer.text
      : { audio: answer.base64, mimeType: 'audio/mp4' };
    const ack = await this.request<{ success: boolean }>(`api/sessions/${encodeURIComponent(id)}/respond`, {
      itemId,
      value,
      latencyMs: Math.max(0, Math.min(3_600_000, Math.round(latencyMs))),
    });
    if (!ack?.success) throw new ApiError('Sunucudan beklenen yanıt alınamadı.');
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
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!response.ok) {
      const message = data?.message ?? data?.error ?? (response.status === 401 ? 'Oturumunuzun süresi doldu. Yeniden giriş yapın.' : 'İstek tamamlanamadı');
      throw new ApiError(`${message} (HTTP ${response.status})`, response.status);
    }
    return data as T;
  }
}
