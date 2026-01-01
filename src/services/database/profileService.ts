// services/database/profileService.ts
import db from './db';

export const profileService = {
  // ✅ Salvar perfil localmente
  async saveProfile(profile: any) {
    try {
      // Se você tem tabela profiles no Dexie
      await db.table('profiles')?.put({
        id: profile.id,
        email: profile.email,
        role: profile.role || 'user',
        nome: profile.nome || '',
        updated_at: new Date().toISOString(),
        sync_status: 'pending'
      });
      
      // Também salvar no localStorage para acesso rápido
      localStorage.setItem('user_profile', JSON.stringify(profile));
      localStorage.setItem('has_admin_setup', 'true');
      
      console.log('✅ Perfil salvo localmente');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
    }
  },
  
  // ✅ Buscar perfil local
  async getLocalProfile() {
    try {
      // 1. Tentar localStorage primeiro
      const localProfile = localStorage.getItem('user_profile');
      if (localProfile) {
        return JSON.parse(localProfile);
      }
      
      // 2. Tentar Dexie
      const profiles = await db.table('profiles')?.toArray();
      if (profiles && profiles.length > 0) {
        return profiles[0];
      }
      
      return null;
    } catch (error) {
      console.log('⚠️ Não há perfil local');
      return null;
    }
  },
  
  // ✅ Verificar se há admin local
  async hasLocalAdmin() {
    try {
      // Check localStorage flag
      if (localStorage.getItem('has_admin_setup') === 'true') {
        return true;
      }
      
      // Check Dexie
      const adminCount = await db.table('profiles')
        ?.where('role')
        .equals('admin')
        .count();
      
      return (adminCount || 0) > 0;
    } catch {
      return false;
    }
  }
};