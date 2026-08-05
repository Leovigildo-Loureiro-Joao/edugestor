import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PendingUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  instituicao_id: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Token de autenticação necessário" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido ou expirado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem sincronizar usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const pendingUsers: PendingUser[] = body.pendingUsers || [];

    if (!Array.isArray(pendingUsers) || pendingUsers.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum usuário pendente fornecido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const pendingUser of pendingUsers) {
      try {
        const { email, full_name, role, instituicao_id, id: localId } = pendingUser;

        if (!email || !role) {
          results.push({
            id: localId,
            email,
            status: "error",
            error: "Email e role são obrigatórios"
          });
          continue;
        }

        const tempPassword = `EduGestor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        let supabaseUserId: string | null = null;
        let isNewUser = false;

        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        const existingUser = existingUsers?.users?.find((u) => u.email === email);

        if (existingUser) {
          supabaseUserId = existingUser.id;
        } else {
          const { data: newUserData, error: createError } =
            await supabaseAdmin.auth.admin.createUser({
              email,
              password: tempPassword,
              email_confirm: true,
              user_metadata: {
                full_name,
                user_role: role,
                instituicao_id,
              },
            });

          if (createError) {
            results.push({
              id: localId,
              email,
              status: "error",
              error: createError.message,
            });
            continue;
          }

          supabaseUserId = newUserData?.user?.id || null;
          isNewUser = true;
        }

        if (!supabaseUserId) {
          results.push({
            id: localId,
            email,
            status: "error",
            error: "Não foi possível obter ID do usuário no Supabase",
          });
          continue;
        }

        const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
          {
            id: supabaseUserId,
            email,
            full_name,
            role,
            instituicao_id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

        if (profileError) {
          results.push({
            id: localId,
            email,
            supabaseId: supabaseUserId,
            status: "error",
            error: `Erro ao salvar perfil: ${profileError.message}`,
          });
          continue;
        }

        results.push({
          id: localId,
          email,
          supabaseId: supabaseUserId,
          status: isNewUser ? "created_profile" : "updated",
        });
      } catch (userError: any) {
        results.push({
          id: pendingUser.id,
          email: pendingUser.email,
          status: "error",
          error: userError.message || "Erro desconhecido",
        });
      }
    }

    const successCount = results.filter(
      (r) => r.status === "created_profile" || r.status === "updated" || r.status === "success"
    ).length;
    const errorCount = results.filter((r) => r.status === "error").length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `${successCount} usuário(s) sincronizado(s), ${errorCount} erro(s)`,
        details: results,
        stats: { total: pendingUsers.length, success: successCount, errors: errorCount },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro na Edge Function sync:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
