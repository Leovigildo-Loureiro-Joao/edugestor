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
firebase login --token "4/0Ab32j914EG6jCYHBCEPpkcuhver04MMwg2vv7DwmAlTVkPRP0g-1onXxNNSQEqHemkZURg"
