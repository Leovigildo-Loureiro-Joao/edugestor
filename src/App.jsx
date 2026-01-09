import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import Layout from './components/layout/Layout';
import {Login, logoBlack} from './components/auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Students from './pages/Students/Students.tsx';
import { StudentNew } from './pages/Students/StudentsNew';
import { StudentEdit } from './pages/Students/StudentsEdit';
import { FrequenciaPage } from './pages/Attendance/Frequencia';
import { AulasPage } from './pages/Grades/AulaPage.tsx';
import Turmas from './pages/Turmas/Turmas.tsx';
import StudentPage from './pages/Students/StudentPage';
import PagamentosPage from './pages/Finance/Pagamento.tsx';
import {FinanceiroPage} from './pages/Finance/Financeiro.tsx';
import RegistroPagamentoPage from './pages/Finance/RegistroPagamentoPage.tsx';
import { ConfiguracoesPage } from './pages/Settings/ConfigPage.jsx';
import Courses from './pages/Courses/Curso.tsx';
import { CursoNew } from './pages/Courses/CursoNew.jsx';
import { CursoEdit } from './pages/Courses/CursoEdit.jsx';
import TurmaDetails from './pages/Turmas/TurmasPage.tsx';
import CourseDetails from './pages/Courses/CursoPage.tsx';
import { CompletarMatricula } from './pages/Finance/RegistraMatricula.tsx';
import { configService } from './services/database/config.ts';
import EstrategiaPage from './pages/Estrategia/Estrategia.tsx';
import TarefaPage from './components/strategy/TarefaPage.tsx';
import MetaPage from './components/strategy/MetaForm.tsx';
import EventosPage from './components/event/EventosPage.tsx';
import TurmaForm from './components/turmas/TurmasForm.tsx';
import AuthCallback from './components/auth/AuthCallback.tsx';
import { supabase, syncDatabase } from './services/database/db.js';
import InitialSetup from './pages/setup/InitialSetup.tsx';
import PromoteToAdmin from './pages/admin/PromoteToAdmin.tsx';
import AdminDashboard from './pages/admin/AdminDashboard.tsx';
import { ShowTimeot } from './components/ui/ShowTimeout.jsx';
import ProfilePage from './pages/User/ProfilePage.tsx';
import { TransacoesPage } from './pages/Finance/TransacaoPage.tsx';

// Componente para rotas protegidas - CORRIGIDO
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  const [showTimeout, setShowTimeout] = React.useState(false);
  
  /*React.useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Loading de autenticação demorando mais de 8s');
        setShowTimeout(true);
      }
    }, 8000);
    
    return () => clearTimeout(timer);
  }, [loading]);*/

  if (showTimeout) {
    return (
     <ShowTimeot/>
    );
  }

  if (loading&&showTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }
  
  return children ;
  //return user ? children : <Navigate to="/login" replace />;

};

// Componente principal corrigido
function AppContent() {
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    // ✅ Inicializar sistema de sincronização
    const sincronizar = async () => {
      const result = await syncDatabase.syncAll();
      if (result.success) {
        console.log('Sincronização completa!');
      }
    };
    sincronizar()
  }, []);

  // 🔥 TODOS OS HOOKS DEVEM SER CHAMADOS SEMPRE
  useEffect(() => {
    const checkIfNeedsSetup = async () => {
      try {
        // Verificar se existe algum admin no sistema
        const hasAdminInLocalStorage = localStorage.getItem('has_admin_setup') === 'true';
        if (hasAdminInLocalStorage) {
          console.log('✅ Setup já realizado (cache local)');
          setNeedsSetup(false);
          setCheckingSetup(false);
          return;
        }
        try {
          const profilesTable = db.table('profiles');
          const localProfiles = await profilesTable?.where('role').equals('admin').count();
          
          if (localProfiles && localProfiles > 0) {
            console.log('✅ Admin encontrado no Dexie');
            localStorage.setItem('has_admin_setup', 'true');
            setNeedsSetup(false);
            setCheckingSetup(false);
            return;
          }
        } catch (dexieError) {
          console.log('⚠️ Tabela profiles não existe no Dexie ainda');
        }
        const { data: admins, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .limit(1);

        if (error) {
          console.error('Erro ao verificar setup:', error);
          setNeedsSetup(true);
        } else {
          setNeedsSetup(!admins || admins.length === 0);
        }
      } catch (error) {
        console.error('Erro na verificação de setup:', error);
        setNeedsSetup(true);
      } finally {
        setCheckingSetup(false);
      }
    };

    checkIfNeedsSetup();
  }, []);


  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Só inicializa se não precisa de setup
        if (!needsSetup) {
          await configService.initializeDefaultConfigs();
          console.log('✅ App inicializado com configurações padrão');
        }
      } catch (error) {
        console.warn('❌ Erro ao inicializar app:', error);
      }
    };

    initializeApp();
  }, [needsSetup]); // 🔥 ADICIONAR DEPENDÊNCIA

  // 🔥 SIMPLESMENTE COMENTE ou MODIFIQUE a verificação:
useEffect(() => {
  const timer = setTimeout(() => {
    setCheckingSetup(false);
    setNeedsSetup(false); 
  }, 1000);
  
  return () => clearTimeout(timer);
}, []);

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando configuração...</p>
        </div>
      </div>
    );
  }

  if (needsSetup) {
    return (
      <AuthProvider>
        <Router>
          <Routes>
            {/* 🔥 ROTA PARA SETUP - precisa do auth provider */}
            <Route path="*" element={<InitialSetup />} />
          </Routes>
        </Router>
      </AuthProvider>
    );
  }

  // Sistema normal (já configurado)
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* ROTA PÚBLICA DE LOGIN */}
          <Route path="/login" element={<Login />} />
          
          {/* ROTA DE CALLBACK DO GOOGLE (PÚBLICA) */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* ROTA RAIZ REDIRECIONA PARA LOGIN OU DASHBOARD */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* ROTA DE PROMOÇÃO A ADMIN (PROTEGIDA) */}
          <Route path="/setup/promote-admin" element={
            <ProtectedRoute>
              <PromoteToAdmin />
            </ProtectedRoute>
          } />


        
          
          {/* TODAS AS ROTAS PROTEGIDAS */}
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                    <Route path="/admin/dashboard" element={
                      <ProtectedRoute adminOnly>
                        <AdminDashboard />
                      </ProtectedRoute>
                    } />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/alunos" element={<Students />} />
                  <Route path="/alunos/:id" element={<StudentPage />} />
                  <Route path="/alunos/novo" element={<StudentNew />} />
                  <Route path="/alunos/editar/:id" element={<StudentEdit />} />
                  <Route path="/frequencia" element={<FrequenciaPage/>} />
                  <Route path="/configuracoes" element={<ConfiguracoesPage/>} />
                  <Route path="/financeiro" element={<FinanceiroPage/>} />
                  <Route path="/cursos" element={<Courses/>} />
                  <Route path="/eventos/add" element={<EventosPage />} />
                  <Route path="/estrategia/metas/nova" element={<MetaPage />} />
                  <Route path="/estrategia/metas/editar/:id" element={<MetaPage />} />
                  <Route path="/estrategia/tarefas/nova" element={<TarefaPage />} />
                  <Route path="/estrategia/tarefas/editar/:id" element={<TarefaPage />} />
                  <Route path="/estrategia/:seccao" element={<EstrategiaPage/>} />
                  <Route path="/estrategia" element={<EstrategiaPage/>} />
                  <Route path="/cursos/novo" element={<CursoNew/>} />
                  <Route path="/cursos/editar/:id" element={<CursoEdit/>} />
                  <Route path="/cursos/:id" element={<CourseDetails/>} />
                  <Route path="/financeiro/pagamentos" element={<PagamentosPage/>} />
                  <Route path="/financeiro/transacoes" element={<TransacoesPage/>} />
                  <Route path="/financeiro/Pagamento/:alunoId" element={<RegistroPagamentoPage/>} />
                  <Route path="/financeiro/matricula/:alunoId" element={<CompletarMatricula/>} />
                  <Route path="/aulas" element={<AulasPage/>} />
                  <Route path="/turmas" element={<Turmas />} />
                  <Route path="/turmas/:id" element={<TurmaDetails />} />
                  <Route path="/turmas/nova" element={<TurmaForm />} />
                  <Route path="/turmas/editar/:id" element={<TurmaForm />} />
                  
                  {/* ROTA 404 */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// Componente principal
function App() {
  return <AppContent />;
}

export default App;