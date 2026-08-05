import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
      .select("role, instituicao_id")
      .eq("id", user.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem gerir usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "GET") {
      const url = new URL(req.url);
      const instituicaoId = url.searchParams.get("instituicao_id");

      let query = supabaseAdmin
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (instituicaoId) {
        query = query.eq("instituicao_id", instituicaoId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data: data || [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { email, full_name, role, instituicao_id } = body;

      if (!email || !role) {
        return new Response(
          JSON.stringify({ error: "Email e role são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const validRoles = ["admin", "manager", "teacher", "user"];
      if (!validRoles.includes(role)) {
        return new Response(
          JSON.stringify({ error: "Role inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tempPassword = `EduGestor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      const existingUser = existingUsers?.users?.find((u) => u.email === email);

      let supabaseUserId: string;

      if (existingUser) {
        supabaseUserId = existingUser.id;

        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .upsert(
            {
              id: supabaseUserId,
              email,
              full_name: full_name || email.split("@")[0],
              role,
              instituicao_id: instituicao_id || callerProfile.instituicao_id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );

        if (profileError) throw profileError;
      } else {
        const { data: newUserData, error: createError } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              full_name: full_name || email.split("@")[0],
              user_role: role,
              instituicao_id: instituicao_id || callerProfile.instituicao_id,
            },
          });

        if (createError) throw createError;

        supabaseUserId = newUserData?.user?.id;

        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .insert({
            id: supabaseUserId,
            email,
            full_name: full_name || email.split("@")[0],
            role,
            instituicao_id: instituicao_id || callerProfile.instituicao_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (profileError) throw profileError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          userId: supabaseUserId,
          message: existingUser
            ? "Usuário existente vinculado ao perfil"
            : "Usuário criado com sucesso",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "PATCH") {
      const body = await req.json();
      const { userId, role, is_active, full_name } = body;

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "userId é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (userId === user.id) {
        return new Response(
          JSON.stringify({ error: "Não pode alterar a sua própria conta" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (role) updateData.role = role;
      if (full_name !== undefined) updateData.full_name = full_name;
      if (is_active !== undefined) updateData.is_active = is_active;

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("id", userId);

      if (profileError) throw profileError;

      if (role) {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { user_role: role },
        });
      }

      if (is_active === false) {
        await supabaseAdmin.auth.admin.signOut(userId);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Usuário atualizado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Método não suportado" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro na Edge Function admin-manage-users:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
