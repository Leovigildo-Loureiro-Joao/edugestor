import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import Layout from './components/layout/Layout.jsx';
import { Login } from './components/auth/Login.jsx';
import Dashboard from './pages/Dashboard/Dashboard.tsx';
import SyncMonitorPage from './pages/Dashboard/SyncMonitorPage.tsx';
import Students from './pages/Students/Students.tsx';
import { StudentNew } from './pages/Students/StudentsNew.tsx';
import { StudentEdit } from './pages/Students/StudentsEdit.tsx';
import { FrequenciaPage } from './pages/Attendance/Frequencia.tsx';
import { AulasPage } from './pages/Grades/AulaPage.tsx';
import Turmas from './pages/Turmas/Turmas.tsx';
import StudentPage from './pages/Students/StudentPage.tsx';
import PagamentosPage from './pages/Finance/Pagamento.tsx';
import { FinanceiroPage } from './pages/Finance/Financeiro.tsx';
import RegistroPagamentoPage from './pages/Finance/RegistroPagamentoPage.tsx';
import { ConfiguracoesPage } from './pages/Settings/ConfigPage.jsx';
import { MetaDetailsPage } from './pages/Estrategia/MetasDetails.tsx';
import Courses from './pages/Courses/Curso.tsx';
import { CursoNew } from './pages/Courses/CursoNew.jsx';
import { CursoEdit } from './pages/Courses/CursoEdit.jsx';
import TurmaDetails from './pages/Turmas/TurmasPage.tsx';
import CourseDetails from './pages/Courses/CursoPage.tsx';
import { CompletarMatricula } from './pages/Finance/RegistraMatricula.tsx';
import { configService } from './services/database/config.ts';
import EstrategiaPage from './pages/Estrategia/Estrategia.tsx';
import TarefaPage from './pages/Estrategia/TarefaPage.tsx';
import MetaPage from './components/strategy/MetaForm.tsx';
import EventosPage from './components/event/EventosPage.tsx';
import TurmaForm from './components/turmas/TurmasForm.tsx';
import AuthCallback from './components/auth/AuthCallback.tsx';
import db, { supabase, syncDatabase } from './services/database/db.js'; // ✅ IMPORT CORRETO
import InitialSetup from './pages/setup/InitialSetup.tsx';
import PromoteToAdmin from './pages/admin/PromoteToAdmin.tsx';
import AdminDashboard from './pages/admin/AdminDashboard.tsx';
import { ShowTimeot } from './components/ui/ShowTimeout.jsx';
import ProfilePage from './pages/User/ProfilePage.tsx';
import { TransacoesPage } from './pages/Finance/TransacaoPage.tsx';
import { backgroundService } from './services/database/backgroundService.ts';
import { notificacaoService } from './services/database/notificacaoService.ts';
import { AlertProvider } from './components/ui/AlertBadge.tsx';
import { NotasPage } from './pages/Grades/NotasPage.tsx';
import { auditLogService } from './services/audit/auditLogService.ts';
import { EventoPage } from './pages/Estrategia/Evento.js';

// ✅ ProtectedRoute CORRIGIDO
// Modifique o ProtectedRoute para aceitar um array de roles permitidas
const ProtectedRoute = ({ children, allowedRoles = ['admin', 'teacher', 'manager'] }) => {
  const { user, profile, loading, logout } = useAuth();
  const [showTimeout, setShowTimeout] = useState(false);
  const [loggingOutUser, setLoggingOutUser] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Loading de autenticação demorando mais de 8s');
        setShowTimeout(true);
      }
    }, 8000);
    
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    const forceLogoutIfBasicUser = async () => {
      if (!loading && user && profile?.role === 'user') {
        try {
          setLoggingOutUser(true);
          await logout();
        } catch (error) {
          console.error('Erro ao encerrar sessão do usuário básico:', error);
        } finally {
          setLoggingOutUser(false);
        }
      }
    };

    forceLogoutIfBasicUser();
  }, [loading, user, profile?.role, logout]);

  // Mostrar loading enquanto verifica
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {showTimeout ? 'Ainda estamos verificando...' : 'Verificando autenticação...'}
          </p>
          {showTimeout && (
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Recarregar página
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loggingOutUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Encerrando sessão...</p>
        </div>
      </div>
    );
  }

  // Se não estiver logado, redirecionar para login
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 👇 VERIFICAR SE O USUÁRIO TEM PERMISSÃO PARA ACESSAR A ROTA
  if (!allowedRoles.includes(profile?.role)) {
    console.warn(`⚠️ Acesso negado: Usuário com role "${profile?.role}" tentou acessar rota permitida apenas para: ${allowedRoles.join(', ')}`);
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
// Componente principal corrigido
const LAST_ROUTE_KEY = 'last_rota';
const CURRENT_ROUTE_KEY = 'current_rota';
const ROUTE_TRACKER_INIT_KEY = 'route_tracker_initialized';

function LastRouteTracker() {
  const location = useLocation();

  useEffect(() => {
    const pathname = location.pathname || '';
    const isPublicRoute = pathname.startsWith('/login') || pathname.startsWith('/auth/callback');

    if (isPublicRoute) return;

    const currentPath = `${location.pathname}${location.search}${location.hash}`;
    const isTrackerInitialized = sessionStorage.getItem(ROUTE_TRACKER_INIT_KEY) === '1';

    // Evita herdar rota antiga de outra sessão/aba no primeiro carregamento
    if (!isTrackerInitialized) {
      sessionStorage.setItem(ROUTE_TRACKER_INIT_KEY, '1');
      sessionStorage.setItem(CURRENT_ROUTE_KEY, currentPath);
      localStorage.setItem(CURRENT_ROUTE_KEY, currentPath);
      return;
    }

    const previousPath =
      sessionStorage.getItem(CURRENT_ROUTE_KEY) ||
      localStorage.getItem(CURRENT_ROUTE_KEY);

    if (previousPath && previousPath !== currentPath) {
      sessionStorage.setItem(LAST_ROUTE_KEY, previousPath);
      localStorage.setItem(LAST_ROUTE_KEY, previousPath);
    }

    sessionStorage.setItem(CURRENT_ROUTE_KEY, currentPath);
    localStorage.setItem(CURRENT_ROUTE_KEY, currentPath);
  }, [location.pathname, location.search, location.hash]);

  return null;
}

function AppContent() {
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  // ✅ Inicializar serviços apenas uma vez
  useEffect(() => {
    const initializeServices = async () => {
      try {
        auditLogService.initializeListeners();
        // Sincronização inicial
        const syncResult = await syncDatabase.syncAll();
        if (syncResult.success) {
          }

        // Iniciar serviços de fundo
        backgroundService.inicializar();
        notificacaoService.iniciarServicoNotificacoes();
      } catch (error) {
        console.error('❌ Erro ao inicializar serviços:', error);
      }
    };

    initializeServices();
  }, []); // Executa apenas uma vez

  // ✅ Verificar necessidade de setup (CORRIGIDO)
  useEffect(() => {
    let isMounted = true;

    const checkIfNeedsSetup = async () => {
      try {
        // Cache local
        const hasAdminInLocalStorage = localStorage.getItem('has_admin_setup') === 'true';
        if (hasAdminInLocalStorage) {
          if (isMounted) {
            setNeedsSetup(false);
            setCheckingSetup(false);
          }
          return;
        }

        // Verificar no Dexie primeiro (mais rápido)
        try {
          if (db && db.table('profiles')) {
            const localAdmins = await db.table('profiles')
              .where('role')
              .equals('admin')
              .count();
            
            if (localAdmins > 0) {
              localStorage.setItem('has_admin_setup', 'true');
              if (isMounted) {
                setNeedsSetup(false);
                setCheckingSetup(false);
              }
              return;
            }
          }
        } catch (dexieError) {
          }

        // Verificar no Supabase
        const { data: admins, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .limit(1);

        if (error) {
          console.error('Erro ao verificar setup:', error);
          if (isMounted) setNeedsSetup(true);
        } else {
          const hasAdmin = admins && admins.length > 0;
          if (hasAdmin) {
            localStorage.setItem('has_admin_setup', 'true');
          }
          if (isMounted) setNeedsSetup(!hasAdmin);
        }
      } catch (error) {
        console.error('Erro na verificação de setup:', error);
        if (isMounted) setNeedsSetup(true);
      } finally {
        if (isMounted) setCheckingSetup(false);
      }
    };

    checkIfNeedsSetup();

    return () => {
      isMounted = false;
    };
  }, []); // Executa apenas uma vez

  // ✅ Inicializar configurações apenas se não precisa de setup
  useEffect(() => {
    if (!needsSetup && !checkingSetup) {
      const initConfigs = async () => {
        try {
          await configService.initializeDefaultConfigs();
        } catch (error) {
          console.warn('⚠️ Erro ao inicializar configurações:', error);
        }
      };
      
      initConfigs();
    }
  }, [needsSetup, checkingSetup]);

  // Loading enquanto verifica setup
  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando configuração do sistema...</p>
        </div>
      </div>
    );
  }

  // Fluxo de setup inicial
  if (needsSetup) {
    return (
      <AuthProvider>
        <Router>
          <LastRouteTracker />
          <Routes>
            <Route path="*" element={<InitialSetup />} />
          </Routes>
        </Router>
      </AuthProvider>
    );
  }
  return (
    <AlertProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Rotas públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Rota de promoção a admin */}
            <Route 
              path="/setup/promote-admin" 
              element={
                <ProtectedRoute>
                  <PromoteToAdmin />
                </ProtectedRoute>
              } 
            />
            
            {/* Todas as rotas protegidas */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      {/* Rotas que TODOS podem acessar */}
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/aulas" element={<AulasPage />} />
                      <Route path="/aulas/:seccao" element={<AulasPage />} />
                      <Route path="/frequencia" element={<FrequenciaPage />} />
                      <Route path="/frequencia/:seccao" element={<FrequenciaPage />} />
                      <Route path="/notas" element={<NotasPage />} />
                      <Route path="/turmas" element={<Turmas />} />
                      <Route path="/turmas/:id" element={<TurmaDetails />} />
                      <Route path="/turmas/:id/:seccao" element={<TurmaDetails />} />
                      
                      {/* 👇 ROTAS BLOQUEADAS PARA PROFESSORES */}
                      <Route 
                        path="/admin" 
                        element={<Navigate to="/admin/dashboard" replace />} 
                      />
                      <Route 
                        path="/admin/dashboard" 
                        element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <AdminDashboard />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/admin/dashboard/:seccao" 
                        element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <AdminDashboard />
                          </ProtectedRoute>
                        } 
                      />
                      
                      <Route 
                        path="/financeiro" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <FinanceiroPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/financeiro/:seccao" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <FinanceiroPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/financeiro/transacoes" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <TransacoesPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/financeiro/pagamentos" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <PagamentosPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/financeiro/pagamento/:alunoId" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <RegistroPagamentoPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/financeiro/matricula/:alunoId" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <CompletarMatricula />
                          </ProtectedRoute>
                        } 
                      />
                      <Route path="/pagamentos" element={<Navigate to="/financeiro/pagamentos" replace />} />
                      
                      <Route 
                        path="/cursos" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <Courses />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/cursos/novo" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <CursoNew />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/cursos/editar/:id" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <CursoEdit />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/cursos/:id" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <CourseDetails />
                          </ProtectedRoute>
                        } 
                      />
                      
                      <Route 
                        path="/alunos" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <Students />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/alunos/novo" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <StudentNew />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/alunos/editar/:id" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <StudentEdit />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/alunos/:id" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <StudentPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/alunos/:id/:seccao" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <StudentPage />
                          </ProtectedRoute>
                        } 
                      />
                      
                      <Route 
                        path="/estrategia" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <EstrategiaPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/estrategia/:seccao" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <EstrategiaPage />
                          </ProtectedRoute>
                        } 
                      />
                       <Route 
                        path="/estrategia/planeamento/:tipo" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <EstrategiaPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/estrategia/metas/nova" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <MetaPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/estrategia/metas/editar/:id" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <MetaPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/estrategia/metas/:id" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <MetaDetailsPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/estrategia/metas/:id/:seccao" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <MetaDetailsPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/estrategia/tarefas/nova" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <TarefaPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/estrategia/tarefas/editar/:id" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <TarefaPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/estrategia/tarefas/deletar/:id" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <TarefaPage />
                          </ProtectedRoute>
                        } 
                      />
                      
                      <Route 
                        path="/estrategia/eventos/novo" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <EventosPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/estrategia/eventos/:id" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <EventosPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/eventos" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <EventosPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/eventos/novo" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <EventosPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/eventos/add/:date" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <EventosPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/eventos/:id" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <EventosPage />
                          </ProtectedRoute>
                        } 
                      />
                      
                      <Route 
                        path="/configuracoes" 
                        element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <ConfiguracoesPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/configuracoes/:seccao" 
                        element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <ConfiguracoesPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/turmas/nova" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <TurmaForm />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/turmas/editar/:id" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <TurmaForm />
                          </ProtectedRoute>
                        } 
                      />
                      
                      <Route 
                        path="/sync-monitor" 
                        element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <SyncMonitorPage />
                          </ProtectedRoute>
                        } 
                      />
                      
                      {/* Rota 404 */}
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </AlertProvider>
  );
}

// Componente principal
function App() {
  return <AppContent />;
}

export default App;
