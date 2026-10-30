import { backendForBuild, editableBackend } from './runtimeConfig';
import { nativePlatform } from './proctoring/platform';
import { usePhotoQueue } from './proctoring/usePhotoQueue';
import { preparationDeadline } from './proctoring/deadline';
import { ClientCapabilities, ExamPolicy, Preflight, missingCapabilities, validatePolicy } from './proctoring/protocol';
import { useProctoringEvents } from './proctoring/useProctoringEvents';
// Candidate flow against the existing backend. Mirrors the verified rules of the SwiftUI prototype:
// - a section transition has no item, so /next is fetched again (bounded loop);
// - a respond POST whose outcome is unknown is never replayed; it is reconciled via answeredItemIds;
// - provisional results are shown as the backend reports them; missing scores stay missing.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Answer, ApiError, AssessmentItem, Backend, Candidate, CandidateDetails, SessionProgress, WEB_ONLY_PRODUCT_LINES,
  canRender, isExamCode, isFinished, normaliseExamCode, responseMode,
} from './api';
import { B4Native } from './native';

export const DEFAULT_BACKEND = backendForBuild();
const DEFAULT_PRODUCT_LINE = 'General English';

export type Phase = 'signedOut' | 'ready' | 'launchPending' | 'item' | 'next' | 'uncertain' | 'finished';
type LaunchIntent = { id: string; productLine: string; organizationId?: string | null; preflight?: Preflight };

export function useAssessment() {
  const [address, setAddressState] = useState(DEFAULT_BACKEND);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [productLine, setProductLine] = useState(DEFAULT_PRODUCT_LINE);
  const [item, setItem] = useState<AssessmentItem | null>(null);
  const [progress, setProgress] = useState<SessionProgress | null>(null);
  const [phase, setPhase] = useState<Phase>('signedOut');
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [answered, setAnswered] = useState(0);
  const [policy, setPolicy] = useState<ExamPolicy | null>(null);
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [preparationStep, setPreparationStep] = useState<string | null>(null);
  const [deviceChecks, setDeviceChecks] = useState<ClientCapabilities | null>(null);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [capabilityProblems, setCapabilityProblems] = useState<string[]>([]);

  const client = useRef<Backend | null>(null);
  const busyRef = useRef(false);
  const itemStarted = useRef(Date.now());
  const activeSession = useRef('');
  const pendingItemId = useRef<string | null>(null);
  const launchIntent = useRef<LaunchIntent | null>(null);

  const photoDelivery = usePhotoQueue(client.current, candidate?.uid);
  const audit = useProctoringEvents(client.current, candidate?.uid, sessionId, progress?.examAdmission,
    ['item', 'next', 'uncertain'].includes(phase));

  const resumeKey = (uid: string, base: string) => `session.${base}.${uid}`;
  const launchKey = (uid: string, base: string) => `launch.${base}.${uid}`;

  const perform = useCallback(async (action: () => Promise<unknown>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const enter = useCallback(async (backend: Backend, user: Candidate, productOverride?: string) => {
    setDeviceChecks(null); setPolicy(null); setPreflight(null); setPolicyAccepted(false); setCapabilityProblems([]);
    client.current = backend;
    setCandidate(user);
    setProductLine(productOverride || user.allowedProductLine || DEFAULT_PRODUCT_LINE);
    setSessionId((await B4Native.getPref(resumeKey(user.uid, backend.baseUrl))) ?? '');
    const pending = await B4Native.getPref(launchKey(user.uid, backend.baseUrl));
    launchIntent.current = pending ? JSON.parse(pending) : null;
    setPhase(launchIntent.current ? 'launchPending' : 'ready');
  }, []);

  // Restore the backend address and, if the refresh cookie is still valid, the signed-in candidate.
  useEffect(() => {
    (async () => {
      try {
        const saved = __DEV__ ? await B4Native.getPref('backend') : null;
        const base = backendForBuild(saved);
        setAddressState(base);
        const backend = new Backend(base);
        const user = await backend.me();
        await enter(backend, user);
      } catch {
        // Not signed in, or the server is unreachable: show the sign-in screen.
      } finally {
        setRestoring(false);
      }
    })();
  }, [enter]);

  const setAddress = useCallback((value: string) => {
    if (__DEV__) setAddressState(value);
  }, []);

  const saveAddress = useCallback((value: string): string | null => {
    try {
      const base = editableBackend(value);
      setAddressState(base);
      B4Native.setPref('backend', base);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }, []);

  const login = useCallback((email: string, password: string) =>
    perform(async () => {
      const backend = new Backend(backendForBuild(address));
      const user = await backend.login(email.trim(), password);
      B4Native.setPref('backend', backend.baseUrl);
      await enter(backend, user);
    }), [address, enter, perform]);

  /** Step 1 of code entry. Read-only: the code is not consumed. Errors are thrown to the caller. */
  const checkCode = useCallback(async (raw: string) => {
    const code = normaliseExamCode(raw);
    if (!isExamCode(code)) throw new ApiError('Kod 4–64 harf, rakam veya tireden oluşmalıdır.');
    const backend = client.current ?? new Backend(backendForBuild(address));
    const { productLine: line } = await backend.validateCode(code);
    if (WEB_ONLY_PRODUCT_LINES.includes(line)) {
      throw new ApiError('Bu kod web uygulamasında yapılan sabit formlu bir sınava ait. Kodu kullanmadan b4skills web sitesinden devam edin.');
    }
    return { code, productLine: line };
  }, [address]);

  /**
   * Step 2: consumes the code. The server signs the candidate in, so the identity always comes
   * from /me afterwards — never from what was typed. Errors are thrown to the caller.
   */
  const redeemCode = useCallback(async (code: string, candidateId: string, details: CandidateDetails) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const backend = client.current ?? new Backend(backendForBuild(address));
      const redemption = await backend.redeemCode(code, candidateId, details);
      const user = await backend.me();
      B4Native.setPref('backend', backend.baseUrl);
      setItem(null); setProgress(null); setAnswered(0); setNotice(null); setError(null);
      await enter(backend, user, redemption.productLine);
      setNotice(`Kodunuz kabul edildi: ${redemption.productLine}. Hazır olduğunuzda değerlendirmeye başlayın.`);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'account_login_required') {
        throw new ApiError('Bu e-posta adresiyle bir hesabınız var. Önce aşağıdan e-posta ve şifrenizle giriş yapın, sonra kodunuzu girin.', e.status, e.code);
      }
      throw e;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [address, enter]);

  const logout = useCallback(() =>
    perform(async () => {
      B4Native.cancelRecording();
      B4Native.stopPlayback();
      await client.current?.logout();
      await B4Native.clearCookies();
      client.current = null;
      activeSession.current = '';
      pendingItemId.current = null;
      launchIntent.current = null;
      setCandidate(null); setSessionId(''); setItem(null); setProgress(null);
      setNotice(null); setAnswered(0); setPhase('signedOut');
    }), [perform]);

  const loadNext = useCallback(async (id: string, preserveItemId?: string) => {
    const backend = client.current;
    if (!backend) return;
    for (let i = 0; i < 10; i += 1) {
      const delivery = await backend.next(id);
      if (delivery.stop) {
        setItem(null);
        setPhase('finished');
        setProgress(await backend.status(id));
        return null;
      }
      if (delivery.sectionTransition) {
        setNotice(delivery.nextSection ? `Yeni bölüm: ${sectionName(delivery.nextSection)}` : 'Yeni bölüme geçildi.');
        continue;
      }
      if (!delivery.item) throw new ApiError('Sunucudan beklenen yanıt alınamadı.');
      setItem(delivery.item);
      if (delivery.item.id !== preserveItemId) itemStarted.current = Date.now();
      setPhase('item');
      // Progress is informational only; a failure here must not block the item.
      backend.status(id).then(status => { if (activeSession.current === id) setProgress(status); }, () => undefined);
      return delivery.item;
    }
    throw new ApiError('Sunucudan beklenen yanıt alınamadı.');
  }, []);

  const rememberSession = useCallback((id: string) => {
    const backend = client.current;
    if (backend && candidate) B4Native.setPref(resumeKey(candidate.uid, backend.baseUrl), id);
  }, [candidate]);

  const checkAuditStorage = audit.checkStorage;
  const prepareExam = useCallback(() => perform(async () => {
    setDeviceChecks(null); setPreflight(null); setPolicy(null); setPolicyAccepted(false); setCapabilityProblems([]);
    const backend = client.current;
    if (!backend) return;
    try {
    setPreparationStep("Sınav koşulları alınıyor…");
    const current = await backend.examPolicy();
    validatePolicy(current);
    setPolicy(current);
    // Permissions are requested only after the candidate explicitly starts the device check.
    setPreparationStep("Mikrofon izni kontrol ediliyor. Görünen izin penceresini yanıtlayın.");
    const microphone = await preparationDeadline(B4Native.requestMicrophone(), 20000, "Mikrofon izin isteği tamamlanmadı. Sistem izin penceresini kontrol edip tekrar deneyin.");
    setPreparationStep("Teknik kayıt kontrol ediliyor…");
    let durableEvents = false;
    try { await preparationDeadline(checkAuditStorage(), 8000, "Teknik kayıt kontrolü zaman aşımına uğradı."); durableEvents = true; } catch { /* Report the missing capability below. */ }
    // Web parity: the camera runs in every exam, so ask for it here, before the exam starts.
    setPreparationStep("Kamera izni kontrol ediliyor. Görünen izin penceresini yanıtlayın.");
    let cameraEvidence = false;
    try {
      await preparationDeadline(B4Native.startCamera(), 20000, "Kamera izni isteği tamamlanmadı.");
      cameraEvidence = true;
    } catch { /* Reported as a missing capability only if the policy requires it. */ }
    finally { try { B4Native.stopCamera(); } catch { /* Probe only; nothing to release. */ } }
    const capabilities = { version: 1 as const, platform: nativePlatform(),
      microphone, lifecycleEvents: true, durableEvents, cameraEvidence, assessmentMode: false };
    setDeviceChecks(capabilities);
    const missing = missingCapabilities(current, capabilities);
    setCapabilityProblems(missing);
    if (!missing.length) setPreflight({ policyRevision: current.revision, accepted: true, capabilities });
    } finally { setPreparationStep(null); }
  }), [perform, checkAuditStorage]);

  const launch = useCallback(() =>
    perform(async () => {
      const backend = client.current;
      if (!backend || !candidate) return;
      if (!launchIntent.current && (!preflight || !policyAccepted)) throw new ApiError("Sınav koşullarını kontrol edip bilgilendirmeyi onaylayın.");
      const intent = launchIntent.current ?? {
        id: await B4Native.newRequestId(), productLine, organizationId: candidate.organizationId, preflight: preflight!,
      };
      // Persist before sending. The same receipt is recoverable after a lost response or restart.
      await B4Native.setPrefAsync(launchKey(candidate.uid, backend.baseUrl), JSON.stringify(intent));
      launchIntent.current = intent;
      setPhase('launchPending');
      let id: string;
      try {
        ({ sessionId: id } = await backend.launch(intent.productLine, intent.organizationId, intent.id, intent.preflight));
      } catch (launchError) {
        if (launchError instanceof ApiError && ['EXAM_PREFLIGHT_REQUIRED', 'EXAM_POLICY_CHANGED', 'EXAM_CAPABILITY_REQUIRED', 'EXAM_POLICY_INVALID'].includes(launchError.code ?? '')) {
          // These explicit gate failures occur before a session/credit is created.
          await B4Native.setPrefAsync(launchKey(candidate.uid, backend.baseUrl), '');
          launchIntent.current = null; setPreflight(null); setPolicyAccepted(false); setPhase('ready');
        }
        throw launchError;
      }
      if (!id) throw new ApiError('Sunucudan beklenen yanıt alınamadı.');
      await B4Native.setPrefAsync(resumeKey(candidate.uid, backend.baseUrl), id);
      await B4Native.setPrefAsync(launchKey(candidate.uid, backend.baseUrl), '');
      launchIntent.current = null;
      activeSession.current = id;
      setSessionId(id);
      setProgress(null);
      rememberSession(id);
      setAnswered(0);
      // The session exists even if its first delivery fails. Never offer a second launch.
      setPhase('next');
      await loadNext(id);
    }), [candidate, loadNext, perform, productLine, rememberSession, preflight, policyAccepted]);

  const resume = useCallback((raw: string) =>
    perform(async () => {
      const backend = client.current;
      const id = raw.trim();
      if (!backend || !id) return;
      const status = await backend.status(id);
      activeSession.current = id;
      setSessionId(id);
      setProgress(status);
      setAnswered(status.progress ?? 0);
      rememberSession(id);
      if (isFinished(status)) { setPhase('finished'); return; }
      setPhase('next');
      await loadNext(id);
    }), [loadNext, perform, rememberSession]);

  const retryNext = useCallback(() => perform(() => loadNext(sessionId)), [loadNext, perform, sessionId]);

  const submit = useCallback((answer: Answer) =>
    perform(async () => {
      if (audit.storageError && progress?.examAdmission?.policy.required.lifecycleEvents) throw new ApiError(audit.storageError);
      const backend = client.current;
      if (!backend || !item || !canRender(item) || phase !== 'item') return;
      const mode = responseMode(item);
      if (mode !== answer.kind) return;
      try {
        await backend.respond(sessionId, item.id, answer, Date.now() - itemStarted.current);
      } catch (e) {
        // Never blindly replay a POST whose response was lost. Reconcile against persisted ids.
        pendingItemId.current = item.id;
        setPhase('uncertain');
        throw e;
      }
      setAnswered(n => n + 1);
      setItem(null);
      setNotice(null);
      setPhase('next');
      await loadNext(sessionId);
    }), [item, loadNext, perform, phase, sessionId, audit.storageError, progress?.examAdmission]);

  const reconcile = useCallback(() =>
    perform(async () => {
      const backend = client.current;
      const id = pendingItemId.current;
      if (!backend || !id) return;
      const status = await backend.status(sessionId);
      setProgress(status);
      if (isFinished(status)) {
        pendingItemId.current = null;
        setItem(null);
        setAnswered(status.progress ?? 0);
        setPhase('finished');
        return;
      }
      if (!status.answeredItemIds) throw new ApiError('Sunucudan beklenen yanıt alınamadı.');
      if (status.answeredItemIds.includes(id)) {
        pendingItemId.current = null;
        setItem(null);
        setAnswered(status.progress ?? 0);
        if (isFinished(status)) { setPhase('finished'); return; }
        setPhase('next');
        await loadNext(sessionId);
      } else {
        // Confirm the server's current item before allowing an explicit user resubmission.
        // No answer POST is replayed here; the original editor/recording stays mounted.
        const delivered = await loadNext(sessionId, id);
        pendingItemId.current = null;
        if (delivered?.id === id) {
          setNotice('Yanıtınız kaydedilmemiş. Sorunuz ve yanıtınız korundu; kontrol edip yeniden gönderebilirsiniz.');
        }
      }
    }), [loadNext, perform, sessionId]);

  const refreshProgress = useCallback(() =>
    perform(async () => {
      const backend = client.current;
      if (!backend || !sessionId) return;
      const status = await backend.status(sessionId);
      setProgress(status);
      setAnswered(status.progress ?? 0);
    }), [perform, sessionId]);

  const leaveResults = useCallback(() => {
    setItem(null); setProgress(null); setNotice(null); setPhase('ready');
  }, []);

  const interrupted = useCallback(() => {
    if (phase === 'item') {
      setNotice('Uygulama kesintiye uğradı. Yanıtınız cihazda duruyor; sınavın sunucudaki süresi işlemeye devam edebilir.');
    }
  }, [phase]);

  return {
    address, setAddress, saveAddress, candidate, sessionId, productLine, item, progress, phase, busy,
    restoring, error, notice, answered, setError, setNotice,
    policy, deviceChecks, preparationStep, policyAccepted, setPolicyAccepted, capabilityProblems, prepareExam, canLaunch: !!preflight && policyAccepted,
    auditWarning: audit.storageError || audit.warning, retryAudit: audit.retry,
    login, logout, checkCode, redeemCode, launch, resume, retryNext, submit, reconcile, refreshProgress, leaveResults, interrupted,
    mediaUrl: (raw?: string | null) => client.current?.mediaUrl(raw) ?? null,
    cameraBackend: client.current, photoDelivery, recordFace: audit.recordFace,
  };
}

export type AssessmentState = ReturnType<typeof useAssessment>;

export function sectionName(section: string): string {
  const key = section.toUpperCase();
  return ({ READING: 'Reading', LISTENING: 'Listening', WRITING: 'Writing', SPEAKING: 'Speaking', GRAMMAR: 'Grammar', VOCABULARY: 'Vocabulary' } as Record<string, string>)[key] ?? section;
}
