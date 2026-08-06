import { supabase } from "../database/db";
import { instituicaoIdValue } from "../../utils/getInstituicaoID";

type AuditDetails = Record<string, any>;

interface AuditLogPayload {
  user_id: string | null;
  user_email: string;
  action: string;
  details: AuditDetails;
  ip_address: string;
  user_agent?: string;
  instituicao_id?: string;
  created_at: string;
}

const LEGACY_PENDING_AUDIT_KEY = "pending_audit_logs";
const AUDIT_IP_CACHE_KEY = "audit_client_ip_cache";
const AUDIT_IP_CACHE_TTL_MS = 15 * 60 * 1000;

let listenersInitialized = false;
let cachedIpPromise: Promise<string> | null = null;

const getUserContext = () => {
  const userId = localStorage.getItem("user_id");
  const userRole = localStorage.getItem("user_role") || "system";
  const profileRaw = localStorage.getItem("user_profile");
  let instituicao_id  = instituicaoIdValue() || null;
  let userEmail = "unknown";
  try {
    if (profileRaw) {
      const profile = JSON.parse(profileRaw);
      userEmail = profile?.email || userEmail;
      instituicao_id = profile?.instituicao_id || instituicao_id;
    }
  } catch {
    // ignora parse inválido
  }

  return {
    userId: userId || null,
    userEmail,
    userRole,
    instituicaoId: instituicao_id,
  };
};

const getPendingAuditKey = () => {
  const { userId, instituicaoId } = getUserContext();
  const userPart = userId || "anon";
  const instPart = instituicaoId || "noinst";
  return `pending_audit_logs_${instPart}_${userPart}`;
};

const getCachedIp = () => {
  try {
    const raw = localStorage.getItem(AUDIT_IP_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ip || !parsed?.expiresAt) return null;
    if (Date.now() > Number(parsed.expiresAt)) return null;
    return parsed.ip as string;
  } catch {
    return null;
  }
};

const setCachedIp = (ip: string) => {
  try {
    localStorage.setItem(
      AUDIT_IP_CACHE_KEY,
      JSON.stringify({
        ip,
        expiresAt: Date.now() + AUDIT_IP_CACHE_TTL_MS,
      })
    );
  } catch {
    // ignora erro de storage
  }
};

const getClientIP = async () => {
  const cached = getCachedIp();
  if (cached) return cached;

  if (!cachedIpPromise) {
    cachedIpPromise = fetch("https://api.ipify.org?format=json")
      .then((r) => r.json())
      .then((data) => {
        const ip = data?.ip || "unknown";
        setCachedIp(ip);
        return ip;
      })
      .catch(() => "unknown")
      .finally(() => {
        cachedIpPromise = null;
      });
  }

  return cachedIpPromise;
};

const normalizeDetails = (action: string, details: AuditDetails): AuditDetails => {
  const { userRole } = getUserContext();
  return {
    ...details,
    actor_role: details.actor_role || userRole || "system",
    actor_type: details.actor_type || (userRole === "admin" ? "admin" : "user"),
    action_label: details.action_label || action,
    table_name: details.table_name || details.table || null,
    record_id: details.record_id || details.target_id || null,
    old_values: details.old_values ?? null,
    new_values: details.new_values ?? null,
    source: details.source || "client",
  };
};

const getPendingLogs = (): AuditLogPayload[] => {
  try {
    const raw = localStorage.getItem(getPendingAuditKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const setPendingLogs = (logs: AuditLogPayload[]) => {
  try {
    localStorage.setItem(getPendingAuditKey(), JSON.stringify(logs));
  } catch {
    // sem ação: evitar quebrar fluxo principal
  }
};

export const auditLogService = {
  initializeListeners() {
    if (listenersInitialized || typeof window === "undefined") return;
    listenersInitialized = true;

    window.addEventListener("sync-queue-enqueued", async (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      const tableName = detail.table;
      const recordId = detail.record_id;
      const operation = detail.operation;
      if (!tableName || !recordId || !operation) return;

      const snapshot = detail.snapshot || null;

      const action = operation === "delete"
        ? "DELETE"
        : (String(recordId).startsWith("local_") ? "INSERT" : "UPDATE");

      await this.log(action, {
        source: "sync_queue",
        table_name: tableName,
        record_id: recordId,
        old_values: operation === "delete" ? snapshot : null,
        new_values: operation !== "delete" ? snapshot : null,
      });
    });
  },

  async flushPendingLogs() {
    // Limpa chave legada compartilhada para evitar vazamento entre contas/instituições.
    try {
      localStorage.removeItem(LEGACY_PENDING_AUDIT_KEY);
    } catch {
      // ignora
    }

    const pending = getPendingLogs();
    if (pending.length === 0 || !navigator.onLine) return;

    const stillPending: AuditLogPayload[] = [];
    for (const payload of pending) {
      const { error } = await supabase.from("audit_logs").insert(payload);
      if (error) {
        stillPending.push(payload);
      }
    }
    setPendingLogs(stillPending);
  },

  async log(action: string, details: AuditDetails = {}) {
    const now = new Date().toISOString();
    const { userId, userEmail, instituicaoId: contextInstituicaoId } = getUserContext();
    const detailInstituicaoId =
      details?.instituicao_id ||
      details?.instituicaoId ||
      details?.instituicao;
    const instituicaoId = detailInstituicaoId || contextInstituicaoId;
    if (!instituicaoId) {
      return;
    }
    const ipAddress = await getClientIP();
    const normalizedDetails = normalizeDetails(action, details);

    const payload: AuditLogPayload = {
      user_id: userId,
      user_email: userEmail,
      action,
      details: {
        ...normalizedDetails,
        instituicao_id: instituicaoId,
      },
      ip_address: ipAddress,
      instituicao_id: instituicaoId || undefined,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      created_at: now,
    };

    try {
      await this.flushPendingLogs();
      const { error } = await supabase.from("audit_logs").insert(payload);
      if (error) {
        const pending = getPendingLogs();
        pending.push(payload);
        setPendingLogs(pending);
      }
    } catch {
      const pending = getPendingLogs();
      pending.push(payload);
      setPendingLogs(pending);
    }
  },
};
