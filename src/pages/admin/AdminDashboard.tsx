// src/pages/Admin/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUsers, 
  FiSettings, 
  FiShield, 
  FiBarChart2, 
  FiDatabase,
  FiActivity,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
  FiEdit,
  FiTrash2,
  FiSearch,
  FiDownload,
  FiRefreshCw,
  FiUserPlus
} from 'react-icons/fi';
import db, { supabase } from '../../services/database/db';
import { useAuth } from '../../contexts/AuthContext';
import { AddUserModal } from './AddUserModal';
import { profileService } from '../../services/database/profileService';
import { useNavigate, useParams } from 'react-router-dom';
import { auditLogService } from '../../services/audit/auditLogService';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'manager' | 'teacher' | 'user';
  created_at: string;
  last_sign_in_at: string | null;
  is_active: boolean;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  admins: number;
  managers: number;
  teachers: number;
  students: number;
  recentLogins: number;
}

interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  details: any;
  ip_address: string;
  created_at: string;
}

const AdminDashboard = () => {
  const { seccao } = useParams<{ seccao?: string }>();
  const navigate = useNavigate();
  const secoesAdmin = ['users', 'audit', 'settings', 'backup'] as const;
  type SecaoAdmin = (typeof secoesAdmin)[number];
  const { profile, loading: authLoading } = useAuth();
  
  // Estados
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [activeTab, setActiveTab] = useState<SecaoAdmin>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    admins: 0,
    managers: 0,
    teachers: 0,
    students: 0,
    recentLogins: 0
  });
  const [loading, setLoading] = useState({
    users: true,
    logs: true,
    stats: true,
    initial: true
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    role: '',
    is_active: true
  });
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [syncLoading, setSyncLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // ✅ 1. VERIFICAR ADMIN
  useEffect(() => {
    let isMounted = true;
    
    const verifyAdmin = async () => {
      if (authLoading) return;
      
      if (!profile) {
        window.location.href = '/dashboard';
        return;
      }
      
      if (profile.role !== 'admin') {
        window.location.href = '/dashboard';
        return;
      }
      
      if (isMounted) {
        setIsAdminVerified(true);
        setLoading(prev => ({ ...prev, initial: false }));
      }
    };
    
    verifyAdmin();
    
    return () => {
      isMounted = false;
    };
  }, [profile, authLoading]);

  // ✅ 2. CARREGAR DADOS
  useEffect(() => {
    if (!isAdminVerified) return;
    
    const loadData = async () => {
      try {
        await Promise.all([
          loadUsers(),
          loadAuditLogs(),
          loadStats(),
          loadPendingUsers()
        ]);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setDataLoaded(true);
      }
    };
    
    loadData();
  }, [isAdminVerified]);

  // ✅ 3. SINCRONIZAR TAB COM URL
  useEffect(() => {
    if (!isAdminVerified) return;
    
    const secaoParam = seccao as SecaoAdmin | undefined;
    if (secaoParam && secoesAdmin.includes(secaoParam)) {
      setActiveTab(secaoParam);
    } else {
      setActiveTab('users');
    }
  }, [seccao, isAdminVerified]);

  // ✅ 4. FILTRAR USUÁRIOS
  useEffect(() => {
    if (!users.length) return;
    
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => 
        statusFilter === 'active' ? user.is_active : !user.is_active
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, statusFilter]);

  const handleTabChange = (tab: SecaoAdmin) => {
    setActiveTab(tab);
    navigate(`/admin/dashboard/${tab}`);
  };

  const loadUsers = async () => {
    try {
      setLoading(prev => ({ ...prev, users: true }));
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('instituicao_id', profile?.instituicao_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const usersWithStatus = data.map(profile => ({
        ...profile,
        is_active: profile.status === 'active' || profile.status === 'ativo'
      }));

      setUsers(usersWithStatus);
      setFilteredUsers(usersWithStatus);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      showNotification('error', 'Erro ao carregar usuários');
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  };

  const loadPendingUsers = async () => {
    try {
      const pending = await db.profiles
        .where('sync_status')
        .equals('pending')
        .toArray();
      setPendingUsers(pending);
    } catch (error) {
      console.error('Erro ao carregar usuários pendentes:', error);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setLoading(prev => ({ ...prev, logs: true }));
      await auditLogService.flushPendingLogs();
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setLoading(prev => ({ ...prev, logs: false }));
    }
  };

  const loadStats = async () => {
    try {
      setLoading(prev => ({ ...prev, stats: true }));

      const { data: usersData } = await supabase
        .from('profiles')
        .select('role')
        .eq('instituicao_id', profile?.instituicao_id);
        
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('created_at')
        .eq('instituicao_id', profile?.instituicao_id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const statsData: SystemStats = {
        totalUsers: usersData?.length || 0,
        activeUsers: usersData?.filter(u => u.role !== 'inactive').length || 0,
        inactiveUsers: usersData?.filter(u => u.role === 'inactive').length || 0,
        admins: usersData?.filter(u => u.role === 'admin').length || 0,
        managers: usersData?.filter(u => u.role === 'manager').length || 0,
        teachers: usersData?.filter(u => u.role === 'teacher').length || 0,
        students: usersData?.filter(u => u.role === 'user').length || 0,
        recentLogins: logs?.length || 0
      };

      setStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  const handleUserAdded = () => {
    loadPendingUsers();
    loadUsers();
    showNotification('success', 'Usuário adicionado com sucesso!');
  };

  const handleSyncUsers = async () => {
    setSyncLoading(true);
    try {
      const result = await profileService.syncPendingUsers();
      
      if (result.success) {
        showNotification('success', result.message || 'Usuários sincronizados com sucesso!');
        await Promise.all([loadUsers(), loadPendingUsers()]);
      } else {
        showNotification('error', result.message || 'Erro ao sincronizar usuários');
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      showNotification('error', 'Erro ao sincronizar usuários');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      role: user.role,
      is_active: user.is_active
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: editForm.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      if (!editForm.is_active && selectedUser.is_active) {
        await supabase.auth.admin.signOut(selectedUser.id);
      }

      await logAuditAction('UPDATE_USER', {
        user_id: selectedUser.id,
        old_role: selectedUser.role,
        new_role: editForm.role,
        old_status: selectedUser.is_active,
        new_status: editForm.is_active
      });

      showNotification('success', 'Usuário atualizado com sucesso!');
      await Promise.all([loadUsers(), loadAuditLogs(), loadStats()]);
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      showNotification('error', 'Erro ao atualizar usuário');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      if (userToDelete === profile?.id) {
        showNotification('error', 'Você não pode deletar sua própria conta');
        return;
      }

      const { error } = await supabase.auth.admin.deleteUser(userToDelete);
      if (error) throw error;

      await logAuditAction('DELETE_USER', { user_id: userToDelete });
      showNotification('success', 'Usuário deletado com sucesso!');
      await Promise.all([loadUsers(), loadAuditLogs(), loadStats()]);
      setShowConfirmDelete(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      showNotification('error', 'Erro ao deletar usuário');
    }
  };

  const logAuditAction = async (action: string, details: any) => {
    try {
      await supabase.from('audit_logs').insert({
        user_id: profile?.id,
        user_email: profile?.email,
        action,
        details,
        ip_address: await getClientIP(),
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao registrar ação:', error);
    }
  };

  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const exportData = async (type: 'users' | 'logs') => {
    try {
      let data: any[] = [];
      let filename = '';

      if (type === 'users') {
        data = users;
        filename = `usuarios_${new Date().toISOString().split('T')[0]}.json`;
      } else {
        data = auditLogs;
        filename = `logs_auditoria_${new Date().toISOString().split('T')[0]}.json`;
      }

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification('success', `Dados exportados com sucesso!`);
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      showNotification('error', 'Erro ao exportar dados');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'manager': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'teacher': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  // ✅ LOADING INICIAL
  if (loading.initial || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // ✅ SE NÃO FOR ADMIN
  if (!isAdminVerified) {
    return null;
  }

  // ✅ LOADING DOS DADOS
  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="mb-6">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      {/* Notificação */}
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3 ${
            notification.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800/30 dark:text-green-300'
              : notification.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-300'
              : 'bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800/30 dark:text-blue-300'
          }`}
        >
          {notification.type === 'success' && <FiCheckCircle className="w-5 h-5" />}
          {notification.type === 'error' && <FiXCircle className="w-5 h-5" />}
          {notification.type === 'info' && <FiAlertCircle className="w-5 h-5" />}
          <span>{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            className="ml-auto text-gray-500 hover:text-gray-700"
          >
            <FiXCircle className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <FiShield className="text-primary-600 dark:text-primary-400" />
          Painel de Administração
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Gerencie usuários, monitore atividades e configure o sistema
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Usuários</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {loading.stats ? '...' : stats.totalUsers}
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
              <FiUsers className="text-blue-600 dark:text-blue-400 text-xl" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm">
            <span className="text-green-600 dark:text-green-400 font-medium">
              +{stats.activeUsers} ativos
            </span>
            <span className="mx-2">•</span>
            <span className="text-gray-500">
              {stats.inactiveUsers} inativos
            </span>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Administradores</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {loading.stats ? '...' : stats.admins}
              </p>
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
              <FiShield className="text-red-600 dark:text-red-400 text-xl" />
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Gerentes: {stats.managers} • Professores: {stats.teachers}
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Atividades Recentes</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {loading.stats ? '...' : stats.recentLogins}
              </p>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg">
              <FiActivity className="text-purple-600 dark:text-purple-400 text-xl" />
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Últimas 24 horas
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Sistema</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                Online
              </p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
              <FiDatabase className="text-green-600 dark:text-green-400 text-xl" />
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Versão 1.0.0 • Todos os serviços OK
          </div>
        </motion.div>
      </div>

      {/* Abas e Conteúdo */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex overflow-x-auto">
            {[
              { id: 'users', label: 'Usuários', icon: FiUsers },
              { id: 'audit', label: 'Logs de Auditoria', icon: FiBarChart2 },
              { id: 'settings', label: 'Configurações', icon: FiSettings },
              { id: 'backup', label: 'Backup', icon: FiDatabase },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as SecaoAdmin)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                    : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Conteúdo das Tabs */}
        <div className="p-4 md:p-6">
          {/* Tab: Usuários */}
          {activeTab === 'users' && (
            <div>
              {/* Filtros e Busca */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nome ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">Todas as Roles</option>
                    <option value="admin">Administrador</option>
                    <option value="manager">Gerente</option>
                    <option value="teacher">Professor</option>
                    <option value="user">Usuário</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="active">Ativos</option>
                    <option value="inactive">Inativos</option>
                  </select>
                  
                  <button
                    onClick={() => setShowAddUserModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <FiUserPlus className="w-4 h-4" />
                    Adicionar Usuário
                  </button>
                  
                  <button
                    onClick={loadUsers}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Recarregar"
                  >
                    <FiRefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => exportData('users')}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                  >
                    <FiDownload className="w-4 h-4" />
                    Exportar
                  </button>
                </div>
              </div>

              {/* Seção de Usuários Pendentes */}
              {pendingUsers.length > 0 && (
                <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                      <FiUserPlus className="w-4 h-4" />
                      Usuários Pendentes: {pendingUsers.length}
                    </h4>
                    <button
                      onClick={handleSyncUsers}
                      disabled={syncLoading}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2 disabled:opacity-50"
                    >
                      {syncLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Sincronizando...
                        </>
                      ) : (
                        <>
                          <FiRefreshCw className="w-4 h-4" />
                          Sincronizar Agora
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {pendingUsers.map((user, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                        <div>
                          <span className="font-medium">{user.full_name || user.nome}</span>
                          <span className="text-gray-500 ml-2">({user.email})</span>
                        </div>
                        <span className="px-2 py-1 text-xs rounded bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200">
                          {user.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabela de Usuários */}
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Último Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {loading.users ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                          </div>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          Nenhum usuário encontrado
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-medium">
                                {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {user.full_name || 'Sem nome'}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                              {user.role === 'admin' ? 'Administrador' :
                               user.role === 'manager' ? 'Gerente' :
                               user.role === 'teacher' ? 'Professor' : 'Usuário'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(user.is_active)}`}>
                              {user.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                            {user.last_sign_in_at 
                              ? new Date(user.last_sign_in_at).toLocaleDateString('pt-BR')
                              : 'Nunca'}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditUser(user)}
                                className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                                title="Editar"
                              >
                                <FiEdit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setUserToDelete(user.id);
                                  setShowConfirmDelete(true);
                                }}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                title="Deletar"
                                disabled={user.id === profile?.id}
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Logs de Auditoria */}
          {activeTab === 'audit' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Logs de Atividades do Sistema
                </h3>
                <button
                  onClick={() => exportData('logs')}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                >
                  <FiDownload className="w-4 h-4" />
                  Exportar Logs
                </button>
              </div>

              <div className="space-y-4">
                {loading.logs ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum log de auditoria encontrado
                  </div>
                ) : (
                  auditLogs.map(log => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {log.user_email}
                            </span>
                            <span className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              {log.action}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(log.created_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {log.details && (
                              <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                            <span>IP: {log.ip_address}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab: Configurações */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Configurações do Sistema
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Segurança</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Login com Google</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Forçar 2FA</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Notificações</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Email de Atividades</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Alertas de Segurança</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Limpeza de Dados</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Remova logs antigos para liberar espaço no banco de dados
                </p>
                <div className="flex gap-3">
                  <button className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800/40 text-sm">
                    Limpar Logs Antigos
                  </button>
                  <button className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800/40 text-sm">
                    Limpar Cache
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Backup */}
          {activeTab === 'backup' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <FiDatabase className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Sistema de Backup
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                O backup automático é realizado diariamente. Você pode gerar um backup manual a qualquer momento.
              </p>
              <div className="flex gap-3 justify-center">
                <button className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
                  <FiDownload className="w-5 h-5" />
                  Gerar Backup Agora
                </button>
                <button className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                  <FiDatabase className="w-5 h-5" />
                  Ver Backups Anteriores
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Edição */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full"
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Editar Usuário
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={selectedUser.full_name || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={selectedUser.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Função
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="admin">Administrador</option>
                    <option value="manager">Gerente</option>
                    <option value="teacher">Professor</option>
                    <option value="user">Usuário</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Status da Conta</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.is_active}
                      onChange={(e) => setEditForm({...editForm, is_active: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Adição de Usuário */}
      {showAddUserModal && (
        <AddUserModal
          isOpen={showAddUserModal}
          onClose={() => setShowAddUserModal(false)}
          onSuccess={handleUserAdded}
          adminId={profile?.id || ''}
          instituicaoId={profile?.instituicao_id || ''}
        />
      )}

      {/* Modal de Confirmação de Deleção */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full"
          >
            <div className="p-6">
              <div className="w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <FiAlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
                Confirmar Deleção
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConfirmDelete(false);
                    setUserToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Deletar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;