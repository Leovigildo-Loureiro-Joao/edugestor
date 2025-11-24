// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import Login from './components/auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Students from './pages/Students/Students';
import { StudentNew } from './pages/Students/StudentsNew';
import { StudentEdit } from './pages/Students/StudentsEdit';
import { FrequenciaPage } from './pages/Attendance/Frequencia';
import { AulasPage } from './pages/Grades/AulaPage.tsx';
import Turmas from './pages/Turmas/Turmas';
import { TurmaEdit } from './pages/Turmas/TurmasEdit';
import { TurmaNew } from './pages/Turmas/TurmasNew';
import StudentPage from './pages/Students/StudentPage';
import PagamentosPage from './pages/Finance/Pagamento.tsx';
import {FinanceiroPage} from './pages/Finance/Financeiro.jsx';
import RegistroPagamentoPage from './pages/Finance/RegistroPagamentoPage.tsx';
import { ConfiguracoesPage } from './pages/Settings/ConfigPage.jsx';
import { NotasPage } from './pages/Grades/NotasPage.tsx';
// ... outros imports

// Componente para rotas protegidas
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return user ? children : <Login />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/alunos" element={<Students />} />
                    <Route path="/alunos/:id" element={<StudentPage />} />
                    <Route path="/alunos/novo" element={<StudentNew />} />
                    <Route path="/alunos/editar/:id" element={<StudentEdit />} />
                    <Route path="/frequencia" element={<FrequenciaPage/>} />
                    <Route path="/configuracoes" element={<ConfiguracoesPage/>} />
                    <Route path="/financeiro" element={<FinanceiroPage/>} />
                    <Route path="/financeiro/pagamentos" element={<PagamentosPage/>} />
                    <Route path="/financeiro/Pagamento/:alunoId" element={<RegistroPagamentoPage/>} />

                    <Route path="/aulas" element={<AulasPage/>} />
                    <Route path="/notas" element={<NotasPage/>} />
                    <Route path="/turmas" element={<Turmas />} />
                    <Route path="/turmas/nova" element={<TurmaNew />} />
                    <Route path="/turmas/editar/:id" element={<TurmaEdit />} />
                                    
                  {/* ... outras rotas */}
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;