import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FiHome, 
  FiUsers, 
  FiDollarSign, 
  FiCalendar, 
  FiBook,
  FiSettings, 
  FiBookOpen
} from 'react-icons/fi';

const Sidebar = () => {
  const navigation = [
    { name: 'Dashboard', href: '/', icon: FiHome },
    { name: 'Alunos', href: '/alunos', icon: FiUsers },
    { name: 'Aulas', href: '/aulas', icon: FiBookOpen },
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
