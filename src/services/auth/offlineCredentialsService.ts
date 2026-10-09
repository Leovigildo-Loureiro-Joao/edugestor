/**
 * offlineCredentialsService.ts
 *
 * Permite login offline no MESMO dispositivo quando o Supabase cai.
 *
 * Ideia (método recomendado):
 * 1. No último login ONLINE com sucesso, guardamos um "verificador" local:
 *    salt aleatório + hash PBKDF2(SHA-256, 100k iterações) da senha.
 *    Nunca guardamos a senha em claro.
 * 2. Quando o Supabase está inalcançável (sem internet OU queda do backend),
 *    o login tenta online primeiro (com timeout); se falhar com erro de rede,
 *    valida email+senha contra o verificador local.
 * 3. Se bater certo, restauramos o perfil cacheado (Dexie `profiles` +
 *    snapshot em localStorage) e entramos em "modo offline": leitura/escrita
 *    100% local, sync pausado pelo connectivityService, retoma sozinho depois.
 *
 * Segurança:
 * - Um dispositivo roubado ainda exige a senha (hash + salt, comparação
 *   em tempo constante). Não é sessão aberta.
 * - Só funciona para contas que já fizeram login online neste dispositivo.
 * - Troca de senha online invalida o verificador antigo no próximo login.
 * - Logout explícito mantém o verificador (para continuidade na escola),
 *   mas limpa a sessão viva. Use `forgetDevice()` para apagar tudo
 *   (dispositivo partilhado / doado).
 */

const CREDENTIALS_KEY = 'edugestor_offline_credentials_v1';
const LAST_PROFILE_KEY = 'edugestor_offline_last_profile_v1';
const ITERATIONS = 100_000;

interface StoredVerifier {
  userId: string;
  email: string; // original case
  saltB64: string;
  hashB64: string;
  iterations: number;
  updatedAt: string;
}

type CredentialMap = Record<string, StoredVerifier>; // key = email lower

function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function pbkdf2Hash(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return bufToB64(bits);
}

function loadMap(): CredentialMap {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveMap(map: CredentialMap) {
  try {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(map));
  } catch {
    console.warn('⚠️ Não foi possível guardar verificador offline (storage cheio/indisponível)');
  }
}

export const offlineCredentialsService = {
  /** Guarda/atualiza o verificador após um login online com sucesso. */
  async saveVerifier(email: string, password: string, userId: string): Promise<void> {
    try {
      if (!email || !password || !userId) return;
      if (typeof crypto === 'undefined' || !crypto.subtle) {
        console.warn('⚠️ WebCrypto indisponível — verificador offline não guardado');
        return;
      }
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const hashB64 = await pbkdf2Hash(password, salt, ITERATIONS);
      const map = loadMap();
      map[email.trim().toLowerCase()] = {
        userId,
        email: email.trim(),
        saltB64: bufToB64(salt),
        hashB64,
        iterations: ITERATIONS,
        updatedAt: new Date().toISOString(),
      };
      // Limita a 5 contas por dispositivo (evita crescer sem limite em PCs partilhados)
      const keys = Object.keys(map);
      if (keys.length > 5) {
        const sorted = keys.sort(
          (a, b) => Date.parse(map[a].updatedAt) - Date.parse(map[b].updatedAt)
        );
        for (let i = 0; i < keys.length - 5; i++) delete map[sorted[i]];
      }
      saveMap(map);
    } catch (e) {
      console.warn('⚠️ Falha ao guardar verificador offline:', e);
    }
  },

  /** Verifica email+senha contra o verificador local. Retorna userId se OK. */
  async verify(email: string, password: string): Promise<{ ok: boolean; userId?: string }> {
    try {
      const key = email.trim().toLowerCase();
      const entry = loadMap()[key];
      if (!entry) return { ok: false };
      if (typeof crypto === 'undefined' || !crypto.subtle) return { ok: false };
      const hashB64 = await pbkdf2Hash(password, b64ToBytes(entry.saltB64), entry.iterations);
      if (timingSafeEqual(hashB64, entry.hashB64)) return { ok: true, userId: entry.userId };
      return { ok: false };
    } catch {
      return { ok: false };
    }
  },

  /** Há alguma conta que já entrou online neste dispositivo? */
  hasCachedAccount(email?: string): boolean {
    const map = loadMap();
    if (email) return Boolean(map[email.trim().toLowerCase()]);
    return Object.keys(map).length > 0;
  },

  /** Último email usado (para sugerir "continuar offline como…"). */
  getLastEmail(): string | null {
    try {
      const snap = localStorage.getItem(LAST_PROFILE_KEY);
      if (snap) {
        const p = JSON.parse(snap);
        if (p?.email) return String(p.email);
      }
    } catch {
      /* noop */
    }
    const keys = Object.keys(loadMap());
    if (keys.length === 0) return null;
    const map = loadMap();
    const sorted = keys.sort(
      (a, b) => Date.parse(map[b].updatedAt) - Date.parse(map[a].updatedAt)
    );
    return map[sorted[0]].email;
  },

  saveLastProfileSnapshot(profile: any) {
    try {
      if (!profile) return;
      localStorage.setItem(LAST_PROFILE_KEY, JSON.stringify(profile));
    } catch {
      /* quota — não crítico */
    }
  },

  getLastProfileSnapshot(): any | null {
    try {
      const raw = localStorage.getItem(LAST_PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /** Apaga tudo do dispositivo (ao doar/partilhar PC). */
  forgetDevice() {
    try {
      localStorage.removeItem(CREDENTIALS_KEY);
      localStorage.removeItem(LAST_PROFILE_KEY);
    } catch {
      /* noop */
    }
  },
};
