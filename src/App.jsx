import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import Layout from './components/layout/Layout';
import { Login } from './components/auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import SyncMonitorPage from './pages/Dashboard/SyncMonitorPage.tsx';
import Students from './pages/Students/Students.tsx';
import { StudentNew } from './pages/Students/StudentsNew';
import { StudentEdit } from './pages/Students/StudentsEdit';
import { FrequenciaPage } from './pages/Attendance/Frequencia.tsx';
import { AulasPage } from './pages/Grades/AulaPage.tsx';
import Turmas from './pages/Turmas/Turmas.tsx';
import StudentPage from './pages/Students/StudentPage';
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

// ✅ ProtectedRoute CORRIGIDO
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, profile, loading } = useAuth();
  const [showTimeout, setShowTimeout] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Loading de autenticação demorando mais de 8s');
        setShowTimeout(true);
      }
    }, 8000);
    
    return () => clearTimeout(timer);
  }, [loading]);

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

  // Se não estiver logado, redirecionar para login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se for rota de admin, verificar permissão
  if (adminOnly && profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Componente principal corrigido
function AppContent() {
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  // ✅ Inicializar serviços apenas uma vez
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Sincronização inicial
        const syncResult = await syncDatabase.syncAll();
        if (syncResult.success) {
          console.log('✅ Sincronização inicial completa');
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
          console.log('✅ Setup já realizado (cache local)');
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
              console.log('✅ Admin encontrado no Dexie');
              localStorage.setItem('has_admin_setup', 'true');
              if (isMounted) {
                setNeedsSetup(false);
                setCheckingSetup(false);
              }
              return;
            }
          }
        } catch (dexieError) {
          console.log('ℹ️ Tabela profiles não existe no Dexie ainda:', dexieError);
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
          console.log('✅ Configurações padrão inicializadas');
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
          <Routes>
            <Route path="*" element={<InitialSetup />} />
          </Routes>
        </Router>
      </AuthProvider>
    );
  }

  // Sistema normal
  return (
    <AlertProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Rotas públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Redirecionamento raiz */}
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
                      {/* Rotas de admin */}
                      <Route 
                        path="/admin/dashboard" 
                        element={
                          <ProtectedRoute adminOnly>
                            <AdminDashboard />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/admin/dashboard/:seccao" 
                        element={
                          <ProtectedRoute adminOnly>
                            <AdminDashboard />
                          </ProtectedRoute>
                        } 
                      />
                      
                      {/* Rotas normais */}
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/sync-monitor" element={<SyncMonitorPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/alunos" element={<Students />} />
                      <Route path="/alunos/:id" element={<StudentPage />} />
                      <Route path="/alunos/:id/:seccao" element={<StudentPage />} />
                      <Route path="/alunos/novo" element={<StudentNew />} />
                      <Route path="/alunos/editar/:id" element={<StudentEdit />} />
                      <Route path="/frequencia" element={<FrequenciaPage />} />
                      <Route path="/frequencia/:seccao" element={<FrequenciaPage />} />
                      <Route path="/configuracoes" element={<ConfiguracoesPage />} />
                      <Route path="/configuracoes/:seccao" element={<ConfiguracoesPage />} />
                      <Route path="/financeiro" element={<FinanceiroPage />} />
                      <Route path="/financeiro/:seccao" element={<FinanceiroPage />} />
                      <Route path="/cursos" element={<Courses />} />
                      <Route path="/eventos/add/:date" element={<EventosPage />} />
                      <Route path="/estrategia/metas/nova" element={<MetaPage />} />
                      <Route path="/estrategia/metas/editar/:id" element={<MetaPage />} />
                      <Route path="/estrategia/tarefas/nova" element={<TarefaPage />} />
                      <Route path="/estrategia/tarefas/editar/:id" element={<TarefaPage />} />
                      <Route path="/estrategia/:seccao/:tipo" element={<EstrategiaPage />} />
                      <Route path="/estrategia/:seccao" element={<EstrategiaPage />} />
                      <Route path="/estrategia" element={<EstrategiaPage />} />
                      <Route path="/estrategia/metas/:id/:seccao" element={<MetaDetailsPage />} />
                      <Route path="/estrategia/metas/:id" element={<MetaDetailsPage />} />
                      <Route path="/cursos/novo" element={<CursoNew />} />
                      <Route path="/cursos/editar/:id" element={<CursoEdit />} />
                      <Route path="/notas" element={<NotasPage />} />
                      <Route path="/cursos/:id" element={<CourseDetails />} />
                      <Route path="/financeiro/pagamentos" element={<PagamentosPage />} />
                      <Route path="/financeiro/transacoes" element={<TransacoesPage />} />
                      <Route path="/financeiro/Pagamento/:alunoId" element={<RegistroPagamentoPage />} />
                      <Route path="/financeiro/matricula/:alunoId" element={<CompletarMatricula />} />
                      <Route path="/aulas" element={<AulasPage />} />
                      <Route path="/aulas/:seccao" element={<AulasPage />} />
                      <Route path="/turmas" element={<Turmas />} />
                      <Route path="/turmas/:id" element={<TurmaDetails />} />
                      <Route path="/turmas/:id/:seccao" element={<TurmaDetails />} />
                      <Route path="/turmas/nova" element={<TurmaForm />} />
                      <Route path="/turmas/editar/:id" element={<TurmaForm />} />
                      
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