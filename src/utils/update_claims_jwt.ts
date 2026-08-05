import { supabase } from "../services/database/db";

export const updateJWTClaims = async (claims: Record<string, any>): Promise<boolean> => {
  try {
    const session = await supabase.auth.getSession();
    
    if (!session.data.session) {
      console.error('❌ Nenhuma sessão ativa para atualizar JWT');
      return false;
    }
    
    const response = await fetch(
      'https://fbgpygnqzcifbfzxqlzh.supabase.co/functions/v1/update-jwt-claims',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(claims)
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro ao atualizar JWT claims:', errorData);
      return false;
    }
    
    const result = await response.json();
    await supabase.auth.refreshSession();
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro na chamada da Edge Function:', error);
    return false;
  }
};
