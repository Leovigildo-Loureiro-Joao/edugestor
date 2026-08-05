import { supabase } from "../services/database/db";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://fbgpygnqzcifbfzxqlzh.supabase.co";

async function callEdgeFunction(path: string, options: RequestInit = {}) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Erro na operação");
  }

  return data;
}

export const adminEdgeFunctions = {
  async listUsers(instituicaoId?: string) {
    const params = instituicaoId ? `?instituicao_id=${instituicaoId}` : "";
    return callEdgeFunction(`admin-manage-users${params}`, { method: "GET" });
  },

  async createUser(userData: {
    email: string;
    full_name: string;
    role: string;
    instituicao_id?: string;
  }) {
    return callEdgeFunction("admin-manage-users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  async updateUser(userData: {
    userId: string;
    role?: string;
    is_active?: boolean;
    full_name?: string;
  }) {
    return callEdgeFunction("admin-manage-users", {
      method: "PATCH",
      body: JSON.stringify(userData),
    });
  },

  async deleteUser(userId: string) {
    return callEdgeFunction(`admin-delete-user?userId=${userId}`, {
      method: "DELETE",
    });
  },
};
