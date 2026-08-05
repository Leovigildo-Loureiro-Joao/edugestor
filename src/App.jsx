import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import Layout from './components/layout/Layout.jsx';
import { Login } from './components/auth/Login.jsx';
import AuthCallback from './components/auth/AuthCallback.tsx';
import { configService } from './services/database/config.ts';
import db, { supabase, syncDatabase } from './services/database/db.js';
import { backgroundService } from './services/database/backgroundService.ts';
import { notificacaoService } from './services/database/notificacaoService.ts';
import { AlertProvider } from './components/ui/AlertBadge.tsx';
import { auditLogService } from './services/audit/auditLogService.ts';

const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard.tsx'));
const SyncMonitorPage = lazy(() => import('./pages/Dashboard/SyncMonitorPage.tsx'));
const Students = lazy(() => import('./pages/Students/Students.tsx'));
const StudentNew = lazy(() => import('./pages/Students/StudentsNew.tsx').then((m) => ({ default: m.StudentNew })));
const StudentEdit = lazy(() => import('./pages/Students/StudentsEdit.tsx').then((m) => ({ default: m.StudentEdit })));
const StudentPage = lazy(() => import('./pages/Students/StudentPage.tsx'));
const FrequenciaPage = lazy(() => import('./pages/Attendance/Frequencia.tsx').then((m) => ({ default: m.FrequenciaPage })));
const AulasPage = lazy(() => import('./pages/Grades/AulaPage.tsx').then((m) => ({ default: m.AulasPage })));
const NotasPage = lazy(() => import('./pages/Grades/NotasPage.tsx').then((m) => ({ default: m.NotasPage })));
const Turmas = lazy(() => import('./pages/Turmas/Turmas.tsx'));
const TurmaDetails = lazy(() => import('./pages/Turmas/TurmasPage.tsx'));
const TurmaForm = lazy(() => import('./components/turmas/TurmasForm.tsx'));
const PagamentosPage = lazy(() => import('./pages/Finance/Pagamento.tsx'));
const FinanceiroPage = lazy(() => import('./pages/Finance/Financeiro.tsx').then((m) => ({ default: m.FinanceiroPage })));
const RegistroPagamentoPage = lazy(() => import('./pages/Finance/RegistroPagamentoPage.tsx'));
const TransacoesPage = lazy(() => import('./pages/Finance/TransacaoPage.tsx').then((m) => ({ default: m.TransacoesPage })));
const CompletarMatricula = lazy(() => import('./pages/Finance/RegistraMatricula.tsx').then((m) => ({ default: m.CompletarMatricula })));
const Courses = lazy(() => import('./pages/Courses/Curso.tsx'));
const CursoNew = lazy(() => import('./pages/Courses/CursoNew.jsx').then((m) => ({ default: m.CursoNew })));
const CursoEdit = lazy(() => import('./pages/Courses/CursoEdit.jsx').then((m) => ({ default: m.CursoEdit })));
const CourseDetails = lazy(() => import('./pages/Courses/CursoPage.tsx'));
const EstrategiaPage = lazy(() => import('./pages/Estrategia/Estrategia.tsx'));
const TarefaPage = lazy(() => import('./pages/Estrategia/TarefaPage.tsx'));
const MetaPage = lazy(() => import('./components/strategy/MetaForm.tsx'));
const MetaDetailsPage = lazy(() => import('./pages/Estrategia/MetasDetails.tsx').then((m) => ({ default: m.MetaDetailsPage })));
const EventosPage = lazy(() => import('./components/event/EventosPage.tsx'));
const ConfiguracoesPage = lazy(() => import('./pages/Settings/ConfigPage.jsx').then((m) => ({ default: m.ConfiguracoesPage })));
const InitialSetup = lazy(() => import('./pages/setup/InitialSetup.tsx'));
const PromoteToAdmin = lazy(() => import('./pages/admin/PromoteToAdmin.tsx'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.tsx'));
const ProfilePage = lazy(() => import('./pages/User/ProfilePage.tsx'));

const LAST_ROUTE_KEY = 'last_rota';
const CURRENT_ROUTE_KEY = 'current_rota';
const ROUTE_TRACKER_INIT_KEY = 'route_tracker_initialized';

const RouteLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto"></div>
      <p className="mt-3 text-gray-600">Carregando...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles = ['admin', 'teacher', 'manager'] }) => {
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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(profile?.role)) {
    console.warn(`⚠️ Acesso negado: Usuário com role "${profile?.role}" tentou acessar rota permitida apenas para: ${allowedRoles.join(', ')}`);
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function LastRouteTracker() {
  const location = useLocation();

  useEffect(() => {
    const pathname = location.pathname || '';
    const isPublicRoute = pathname.startsWith('/login') || pathname.startsWith('/auth/callback');

    if (isPublicRoute) return;

    const currentPath = `${location.pathname}${location.search}${location.hash}`;
    const isTrackerInitialized = sessionStorage.getItem(ROUTE_TRACKER_INIT_KEY) === '1';

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

function ServicesInitializer() {
  const { user } = useAuth();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!user || initializedRef.current) return;

    initializedRef.current = true;

    const initializeServices = () => {
      try {
        auditLogService.initializeListeners();
      } catch (error) {
        console.error('❌ Erro ao iniciar listeners de auditoria:', error);
      }

      const scheduleHeavyTasks = () => {
        void syncDatabase.syncAll().catch((error) => {
          console.error('❌ Erro ao sincronizar dados:', error);
        });

        try {
          backgroundService.inicializar();
          notificacaoService.iniciarServicoNotificacoes();
        } catch (error) {
          console.error('❌ Erro ao inicializar serviços em background:', error);
        }
      };

      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          window.setTimeout(scheduleHeavyTasks, 1200);
        }, { timeout: 3000 });
      } else {
        window.setTimeout(scheduleHeavyTasks, 1200);
      }
    };

    initializeServices();
  }, [user]);

  return null;
}

function SetupGuard({ children }) {
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkIfNeedsSetup = async () => {
      try {
        const hasAdminInLocalStorage = localStorage.getItem('has_admin_setup') === 'true';
        if (hasAdminInLocalStorage) {
          if (isMounted) {
            setNeedsSetup(false);
            setCheckingSetup(false);
          }
          return;
        }

        try {
          if (db && db.table('profiles')) {
            const localAdmins = await db.table('profiles').where('role').equals('admin').count();

            if (localAdmins > 0) {
              localStorage.setItem('has_admin_setup', 'true');
              if (isMounted) {
                setNeedsSetup(false);
                setCheckingSetup(false);
              }
              return;
            }
          }
        } catch {
        }

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

    void checkIfNeedsSetup();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (needsSetup || checkingSetup) return;

    const initConfigs = async () => {
      try {
        await configService.initializeDefaultConfigs();
      } catch (error) {
        console.warn('⚠️ Erro ao inicializar configurações:', error);
      }
    };

    void initConfigs();
  }, [needsSetup, checkingSetup]);

  if (checkingSetup) {
    return <RouteLoader />;
  }

  if (needsSetup) {
    return <Navigate to="/setup/initial" replace />;
  }

  return children;
}

function ProtectedAppRoutes() {
  return (
    <Layout>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
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

          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
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

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

function AppContent() {
  return (
    <AlertProvider>
      <AuthProvider>
        <Router>
          <ServicesInitializer />
          <LastRouteTracker />

          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/setup/initial"
              element={
                <Suspense fallback={<RouteLoader />}>
                  <InitialSetup />
                </Suspense>
              }
            />
            <Route path="/" element={<Navigate to="/login" replace />} />

            <Route
              path="/setup/promote-admin"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<RouteLoader />}>
                    <PromoteToAdmin />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <SetupGuard>
                    <ProtectedAppRoutes />
                  </SetupGuard>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </AlertProvider>
  );
}

function App() {
  return <AppContent />;
}

export default App;
