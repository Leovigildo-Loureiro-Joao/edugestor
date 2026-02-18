import { supabase } from "../database/db";
import { instituicaoIdValue } from "../../utils/getInsitituicaoID";

type AuditDetails = Record<string, any>;

interface AuditLogPayload {
  user_id: string | null;
  user_email: string;
  action: string;
  details: AuditDetails;
  ip_address: string;
  created_at: string;
}

const PENDING_AUDIT_KEY = "pending_audit_logs";

const getUserContext = () => {
  const userId = localStorage.getItem("user_id");
  const profileRaw = localStorage.getItem("user_profile");

  let userEmail = "unknown";
  try {
    if (profileRaw) {
      const profile = JSON.parse(profileRaw);
      userEmail = profile?.email || userEmail;
    }
  } catch {
    // ignora parse inválido
  }

  return {
    userId: userId || null,
    userEmail,
    instituicaoId: instituicaoIdValue() || "",
  };
};

const getPendingLogs = (): AuditLogPayload[] => {
  try {
    const raw = localStorage.getItem(PENDING_AUDIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const setPendingLogs = (logs: AuditLogPayload[]) => {
  try {
    localStorage.setItem(PENDING_AUDIT_KEY, JSON.stringify(logs));
  } catch {
    // sem ação: evitar quebrar fluxo principal
  }
};

export const auditLogService = {
  async flushPendingLogs() {
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
    const { userId, userEmail, instituicaoId } = getUserContext();

    const payload: AuditLogPayload = {
      user_id: userId,
      user_email: userEmail,
      action,
      details: {
        ...details,
        instituicao_id: instituicaoId,
        source: "client",
      },
      ip_address: "client",
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

