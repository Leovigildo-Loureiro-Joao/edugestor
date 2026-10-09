/**
 * connectivityService.ts
 *
 * Serviço central de conectividade.
 *
 * Problema resolvido:
 * - Antes o sistema só olhava para `navigator.onLine`.
 * - Se o Supabase caísse (500, timeout, Failed to fetch) mas a internet
 *   continuasse, o `navigator.onLine` ficava `true` e o auto-sync martelava
 *   o backend em loop, queimava retries e a UI mostrava "Online/Sincronizado".
 *
 * Novo comportamento:
 * - `browserOnline` (navigator.onLine + eventos online/offline)
 * - `supabaseReachable` (healthcheck real + classificação de erros)
 * - `effectiveOnline = browserOnline && supabaseReachable !== false`
 * - Quando o Supabase cai, o sistema entra SOZINHO em "modo offline":
 *   sync é pausado (com backoff/exponential), retries NÃO são queimados,
 *   UI passa a mostrar "Modo Offline" e retoma sozinho quando voltar.
 *
 * Uso:
 *   import { connectivityService } from './connectivityService';
 *   if (!connectivityService.isEffectiveOnline()) return; // não tenta sync
 *   connectivityService.reportFailure(error);
 *   connectivityService.reportSuccess();
 *
 * Nota: o `supabase` é importado de forma lazy dentro de checkHealth()
 * para evitar import circular com db.ts (que também usa este serviço).
 */

export type SupabaseReachability = boolean | null; // null = ainda não verificado

export interface ConnectivityState {
  browserOnline: boolean;
  supabaseReachable: SupabaseReachability;
  effectiveOnline: boolean;
  consecutiveFailures: number;
  lastHealthCheck: string | null;
  backoffUntil: number; // timestamp ms — até quando o sync deve ficar pausado
}

type Listener = (state: ConnectivityState) => void;

const HEALTH_TIMEOUT_MS = 7000;
const FAILURE_THRESHOLD = 2; // nº de falhas de rede seguidas para declarar Supabase down
const BACKOFF_STEPS_MS = [30_000, 60_000, 120_000, 300_000]; // 30s, 1m, 2m, 5m max
const HEALTH_POLL_MS = 30_000;

function isNetworkLikeError(error: any): boolean {
  if (!error) return false;
  const code = String(error?.code ?? error?.status ?? '');
  const msg = String(error?.message ?? error ?? '').toLowerCase();
  const details = String((error as any)?.details ?? '').toLowerCase();
  const combined = `${code} ${msg} ${details}`;

  // Erros que provam que o SERVIDOR respondeu -> NÃO é queda (é RLS/auth/dados).
  // Estes nunca devem forçar modo offline.
  const serverResponded = ['42501', '42502', '403', '401', '409', '23505', '23503', 'pgrst'];
  if (serverResponded.some((c) => combined.includes(c.toLowerCase()))) return false;

  // Falhas de rede / Supabase down
  const networkHints = [
    'failed to fetch',
    'networkerror',
    'network error',
    'network request failed',
    'fetch failed',
    'load failed',
    'timeout',
    'timed out',
    'abort',
    'aborted',
    'econnrefused',
    'econnreset',
    'enotfound',
    'err_internet',
    'err_network',
    'err_connection',
    'err_timed_out',
    '502',
    '503',
    '504',
    '500',
    '502 bad gateway',
    '503 service unavailable',
    'supabase is unavailable',
    'upstream',
    'typeerror',
  ];
  if (networkHints.some((h) => combined.includes(h))) return true;

  // Status HTTP 5xx explícito
  const status = Number(error?.status);
  if (Number.isFinite(status) && status >= 500 && status < 600) return true;

  return false;
}

function emit(state: ConnectivityState) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent('connectivity-change', { detail: { ...state } })
    );
    // Alias para compatibilidade com código que ouve status do supabase
    window.dispatchEvent(
      new CustomEvent('supabase-status-change', { detail: { ...state } })
    );
  } catch {
    /* noop */
  }
}

class ConnectivityService {
  private browserOnline: boolean =
    typeof navigator !== 'undefined' ? navigator.onLine : true;
  private supabaseReachable: SupabaseReachability = null;
  private consecutiveFailures = 0;
  private backoffUntil = 0;
  private lastHealthCheck: string | null = null;
  private listeners = new Set<Listener>();
  private healthInFlight = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  /** Snapshot atual — barato, sem I/O. */
  getState(): ConnectivityState {
    return {
      browserOnline: this.browserOnline,
      supabaseReachable: this.supabaseReachable,
      effectiveOnline: this.isEffectiveOnline(),
      consecutiveFailures: this.consecutiveFailures,
      lastHealthCheck: this.lastHealthCheck,
      backoffUntil: this.backoffUntil,
    };
  }

  /** Compat: o que o resto do código deve usar antes de qualquer chamada Supabase. */
  isEffectiveOnline(): boolean {
    return this.browserOnline && this.supabaseReachable !== false;
  }

  /** Compat: alguns serviços só querem saber da internet local. */
  isBrowserOnline(): boolean {
    return this.browserOnline;
  }

  /** Deve o sync tentar agora? Respeita backoff do circuit-breaker. */
  shouldAttemptSync(): boolean {
    if (!this.browserOnline) return false;
    if (this.supabaseReachable === false) {
      if (Date.now() < this.backoffUntil) return false;
      // Backoff expirou -> permite UMA tentativa de sonda (healthcheck decide).
      return true;
    }
    return true;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    try {
      fn(this.getState());
    } catch {
      /* noop */
    }
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    const s = this.getState();
    emit(s);
    this.listeners.forEach((fn) => {
      try {
        fn(s);
      } catch {
        /* noop */
      }
    });
  }

  /** Chamado pelo sync quando uma operação ao Supabase correu bem. */
  reportSuccess() {
    const wasDown = this.supabaseReachable === false;
    const hadFailures = this.consecutiveFailures > 0;
    this.consecutiveFailures = 0;
    this.backoffUntil = 0;
    if (this.supabaseReachable !== true) {
      this.supabaseReachable = true;
      this.lastHealthCheck = new Date().toISOString();
    }
    if (wasDown || hadFailures) this.notify();
  }

  /**
   * Chamado quando uma operação ao Supabase falha.
   * Só conta falhas de REDE (quedas). Erros de RLS/auth/dados não contam.
   */
  reportFailure(error: any) {
    if (!isNetworkLikeError(error)) return; // servidor respondeu -> nada a fazer
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= FAILURE_THRESHOLD) {
      const step = Math.min(
        this.consecutiveFailures - FAILURE_THRESHOLD,
        BACKOFF_STEPS_MS.length - 1
      );
      this.backoffUntil = Date.now() + BACKOFF_STEPS_MS[step];
      if (this.supabaseReachable !== false) {
        this.supabaseReachable = false;
        console.warn(
          `📴 Supabase inalcançável (${this.consecutiveFailures} falhas seguidas). ` +
            `Modo offline automático até ${new Date(this.backoffUntil).toLocaleTimeString()}.`
        );
      }
      this.notify();
    }
  }

  /**
   * Healthcheck leve: HEAD na tabela mais pequena.
   * Com timeout próprio para nunca pendurar o sync.
   */
  async checkHealth(timeoutMs = HEALTH_TIMEOUT_MS): Promise<boolean> {
    if (!this.browserOnline) return false;
    if (this.healthInFlight) return this.supabaseReachable !== false;

    this.healthInFlight = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // Lazy para quebrar ciclo db.ts <-> connectivityService.ts
      const { supabase } = await import('./db');
      const { error } = await supabase
        .from('system_config')
        .select('id', { count: 'exact', head: true })
        .abortSignal(controller.signal);

      this.lastHealthCheck = new Date().toISOString();

      if (!error) {
        this.reportSuccess();
        return true;
      }
      if (isNetworkLikeError(error)) {
        this.reportFailure(error);
        return false;
      }
      // Erro funcional (RLS etc.) = servidor está UP
      this.reportSuccess();
      return true;
    } catch (e: any) {
      this.lastHealthCheck = new Date().toISOString();
      // Abort/timeout/fetch fail -> queda
      this.reportFailure(e ?? new Error('healthcheck failed'));
      return false;
    } finally {
      clearTimeout(timer);
      this.healthInFlight = false;
    }
  }

  /** Inicia listeners online/offline + poll de saúde. Idempotente. */
  startMonitoring(pollMs = HEALTH_POLL_MS): () => void {
    if (typeof window === 'undefined') return () => {};
    if (this.initialized) return () => this.stopMonitoring();

    this.initialized = true;

    const onOnline = () => {
      this.browserOnline = true;
      // Ao voltar a internet, sonda de imediato em vez de esperar o poll
      void this.checkHealth().then(() => this.notify());
      this.notify();
    };
    const onOffline = () => {
      this.browserOnline = false;
      this.notify();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Sonda inicial (não bloqueia arranque)
    if (this.browserOnline) {
      setTimeout(() => void this.checkHealth(), 1500);
    }

    this.pollInterval = setInterval(() => {
      if (!this.browserOnline) return;
      // Se estamos em backoff, só sonda quando o backoff expirar (poupa martelar)
      if (this.supabaseReachable === false && Date.now() < this.backoffUntil) return;
      void this.checkHealth();
    }, pollMs);

    // Re-sonda sempre que algo novo entra na fila (volta mais rápido do offline)
    const onEnqueue = () => {
      if (!this.browserOnline) return;
      if (this.supabaseReachable === false && Date.now() < this.backoffUntil) return;
      void this.checkHealth();
    };
    window.addEventListener('sync-queue-enqueued', onEnqueue);

    const stop = () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('sync-queue-enqueued', onEnqueue);
      this.stopMonitoring();
    };
    (this as any)._stop = stop;
    return stop;
  }

  stopMonitoring() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = null;
    this.initialized = false;
  }
}

export const connectivityService = new ConnectivityService();
export { isNetworkLikeError };
