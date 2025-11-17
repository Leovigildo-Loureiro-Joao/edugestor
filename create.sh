#!/bin/bash

# Instalar dependências do projeto
echo "🎯 Instalando dependências específicas..."

# Navegação e Roteamento
npm install react-router-dom

# Estilização
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Animações
npm install framer-motion

# Ícones
npm install react-icons

# Firebase
npm install firebase

# Gráficos e Estatísticas
npm install recharts

# Formulários e Validação
npm install react-hook-form @hookform/resolvers zod

# Gerenciamento de Estado
npm install zustand

# Utilitários
npm install date-fns lucide-react
npm install -D @types/node

# Configurar Tailwind
echo "🎨 Configurando Tailwind CSS..."
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-soft': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-soft': 'bounce 1s infinite',
      }
    },
  },
  plugins: [],
}
EOF

# Criar estrutura de pastas
echo "📁 Criando estrutura de pastas..."

# Criar diretórios
mkdir -p src/{components,pages,contexts,hooks,utils,services,types,styles}

# Subdiretórios componentes
mkdir -p src/components/{ui,layout,students,finance,attendance,grades}

# Subdiretórios páginas
mkdir -p src/pages/{Dashboard,Students,Finance,Attendance,Grades,Settings}

# Subdiretórios serviços
mkdir -p src/services/{firebase,database,auth}

# Criar arquivos de configuração
echo "⚙️ Criando arquivos de configuração..."

# Configuração do Firebase
cat > src/services/firebase/config.js << 'EOF'
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Configuração do Firebase - substituir com suas credenciais
const firebaseConfig = {
  apiKey: "sua-api-key",
  authDomain: "edugestor-angola.firebaseapp.com",
  projectId: "edugestor-angola",
  storageBucket: "edugestor-angola.appspot.com",
  messagingSenderId: "seu-sender-id",
  appId: "seu-app-id"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar serviços
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
EOF

# Arquivo de estilos globais
cat > src/styles/globals.css << 'EOF'
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background-color: #f8fafc;
  color: #334155;
}

/* Scrollbar personalizada */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Animações personalizadas */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.slide-in {
  animation: slideIn 0.3s ease-out;
}

/* Loading states */
.loading-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Status indicators */
.status-saving {
  @apply bg-warning-500 animate-pulse-soft;
}

.status-saved {
  @apply bg-success-500;
}

.status-error {
  @apply bg-danger-500;
}
EOF

# Types TypeScript
cat > src/types/index.ts << 'EOF'
// Tipos principais do sistema

export interface Student {
  id: string;
  nome_completo: string;
  data_nascimento: string;
  numero_bi: string;
  nome_pai: string;
  nome_mae: string;
  contacto_telefone: string;
  email?: string;
  endereco: string;
  turma_id: string;
  data_matricula: string;
  estado: 'ativo' | 'transferido' | 'desistente';
  created_at: string;
  updated_at: string;
}

export interface Turma {
  id: string;
  nome_turma: string;
  ano_lectivo: string;
  curso_id: string;
  professor_director: string;
  capacidade_maxima: number;
  turno: 'manhã' | 'tarde' | 'noite';
  created_at: string;
}

export interface Propina {
  id: string;
  aluno_id: string;
  mes_referencia: string;
  valor_previsto: number;
  valor_pago: number;
  data_vencimento: string;
  data_pagamento?: string;
  estado: 'pendente' | 'pago' | 'atrasado';
  multa: number;
  recibo_numero?: string;
  created_at: string;
  updated_at: string;
}

export interface Frequencia {
  id: string;
  aluno_id: string;
  data_aula: string;
  presente: boolean;
  justificativa?: string;
  aula_id: string;
  hora_registro: string;
  created_at: string;
}

export interface Avaliacao {
  id: string;
  aluno_id: string;
  disciplina_id: string;
  tipo_avaliacao: 'teste' | 'exame' | 'trabalho';
  nota: number;
  peso_avaliacao: number;
  data_avaliacao: string;
  observacoes?: string;
  periodo: '1º trimestre' | '2º trimestre' | '3º trimestre';
  created_at: string;
}

export interface Disciplina {
  id: string;
  nome_disciplina: string;
  codigo: string;
  carga_horaria_semanal: number;
  professor_responsavel: string;
  curso_id: string;
}

export interface Curso {
  id: string;
  nome_curso: string;
  duracao_anos: number;
  regime: 'diurno' | 'nocturno';
}

export interface DashboardStats {
  totalAlunos: number;
  alunosAtivos: number;
  propinasPagas: number;
  propinasPendentes: number;
  frequenciaMedia: number;
}
EOF

# Componente principal App
cat > src/App.jsx << 'EOF'
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import Students from './pages/Students/Students';
import Finance from './pages/Finance/Finance';
import Attendance from './pages/Attendance/Attendance';
import Grades from './pages/Grades/Grades';
import Settings from './pages/Settings/Settings';
import './styles/globals.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/alunos" element={<Students />} />
            <Route path="/financeiro" element={<Finance />} />
            <Route path="/frequencia" element={<Attendance />} />
            <Route path="/notas" element={<Grades />} />
            <Route path="/configuracoes" element={<Settings />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
EOF

# Layout principal
cat > src/components/layout/Layout.jsx << 'EOF'
import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
EOF

# Componente Sidebar
cat > src/components/layout/Sidebar.jsx << 'EOF'
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FiHome, 
  FiUsers, 
  FiDollarSign, 
  FiCalendar, 
  FiBook,
  FiSettings 
} from 'react-icons/fi';

const Sidebar = () => {
  const navigation = [
    { name: 'Dashboard', href: '/', icon: FiHome },
    { name: 'Alunos', href: '/alunos', icon: FiUsers },
    { name: 'Financeiro', href: '/financeiro', icon: FiDollarSign },
    { name: 'Frequência', href: '/frequencia', icon: FiCalendar },
    { name: 'Notas', href: '/notas', icon: FiBook },
    { name: 'Configurações', href: '/configuracoes', icon: FiSettings },
  ];

  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary-600">EduGestor</h1>
        <p className="text-sm text-gray-600">Gestão Académica</p>
      </div>
      
      <nav className="mt-6">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-600 border-r-2 border-primary-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
EOF

# Página Dashboard básica
cat > src/pages/Dashboard/Dashboard.jsx << 'EOF'
import React from 'react';
import { motion } from 'framer-motion';
import { 
  FiUsers, 
  FiDollarSign, 
  FiCheckCircle, 
  FiTrendingUp 
} from 'react-icons/fi';

const Dashboard = () => {
  const stats = [
    {
      title: 'Total de Alunos',
      value: '245',
      icon: FiUsers,
      color: 'primary',
      change: '+12%',
    },
    {
      title: 'Propinas do Mês',
      value: 'AKZ 1.240.000',
      icon: FiDollarSign,
      color: 'success',
      change: '+8%',
    },
    {
      title: 'Frequência Média',
      value: '94%',
      icon: FiCheckCircle,
      color: 'warning',
      change: '+2%',
    },
    {
      title: 'Desempenho Geral',
      value: '78%',
      icon: FiTrendingUp,
      color: 'danger',
      change: '+5%',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          Última atualização: {new Date().toLocaleString('pt-AO')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className={`text-sm ${
                  stat.change.startsWith('+') ? 'text-success-600' : 'text-danger-600'
                }`}>
                  {stat.change} em relação ao mês passado
                </p>
              </div>
              <div className={`p-3 rounded-full bg-${stat.color}-50`}>
                <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Gráficos e mais conteúdo virá aqui */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Propinas - Últimos 6 Meses
          </h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Gráfico será implementado com Recharts
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Alunos por Turma
          </h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Gráfico será implementado com Recharts
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
EOF

# Atualizar o main.jsx
cat > src/main.jsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

# Criar arquivo README com instruções
cat > README.md << 'EOF'
# 🎓 EduGestor - Sistema de Gestão Acadêmica

Sistema completo para gestão de alunos, finanças, frequência e desempenho académico.

## 🚀 Tecnologias Utilizadas

- **Frontend:** React 18 + Vite
- **Estilização:** Tailwind CSS 3
- **Animações:** Framer Motion
- **Ícones:** React Icons
- **Gráficos:** Recharts
- **Backend:** Firebase (Firestore, Auth, Storage)
- **Formulários:** React Hook Form + Zod
- **Estado:** Zustand
- **Roteamento:** React Router DOM

## 📦 Estrutura do Projeto
``` text
src/
├── components/ # Componentes reutilizáveis
│ ├── ui/ # Componentes de interface
│ ├── layout/ # Layout principal
│ ├── students/ # Componentes de alunos
│ ├── finance/ # Componentes financeiros
│ ├── attendance/ # Componentes de frequência
│ └── grades/ # Componentes de notas
├── pages/ # Páginas da aplicação
├── contexts/ # Contexts do React
├── hooks/ # Custom hooks
├── services/ # Serviços externos
│ ├── firebase/ # Configuração Firebase
│ ├── database/ # Operações de BD
│ └── auth/ # Autenticação
├── types/ # Tipos TypeScript
└── utils/ # Utilitários
```

## 🛠 Configuração do Firebase

1. Crie um projeto em [Firebase Console](https://console.firebase.google.com)
2. Ative Authentication, Firestore e Storage
3. Substitua as credenciais em `src/services/firebase/config.js`
4. Configure as regras de segurança no Firestore

## 📋 Funcionalidades

- [x] Dashboard com estatísticas
- [ ] Gestão de Alunos
- [ ] Controle Financeiro (Propinas)
- [ ] Registro de Frequência
- [ ] Lançamento de Notas
- [ ] Relatórios Automáticos
- [ ] Backup em Cloud
- [ ] Modo Offline

## 🚀 Como Executar

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

🔧 Configuração do Ambiente
Node.js 16+ instalado

Conta Firebase configurada

Variáveis de ambiente (se necessário)

📞 Suporte
Para dúvidas sobre configuração ou desenvolvimento, consulte a documentação das tecnologias utilizadas.
EOF

echo "✅ Projeto criado com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. cd $PROJECT_NAME"
echo "2. Configure o Firebase em src/services/firebase/config.js"
echo "3. npm run dev"
echo ""
echo "🎉 Seu projeto EduGestor está pronto para desenvolvimento!"
