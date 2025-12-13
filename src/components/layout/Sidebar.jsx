import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  FiHome, 
  FiUsers, 
  FiDollarSign, 
  FiCalendar, 
  FiBook,
  FiSettings, 
  FiBookOpen,
  FiMenu,
  FiX,
  FiChevronLeft,
  FiUser,
  FiLogOut,
  FiLayers,
  FiTrendingUp
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { FaGraduationCap } from 'react-icons/fa';

const Sidebar = () => {
  const { user,logout } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const navigation = [
    { name: 'Dashboard', href: '/', icon: FiHome },
    { name: 'Estrategia', href: '/estrategia', icon: FiTrendingUp },
    { name: 'Alunos', href: '/alunos', icon: FiUsers },
    { name: 'Turmas', href: '/turmas', icon: FiLayers },
    { name: 'Cursos', href: '/cursos', icon: FaGraduationCap },
    { name: 'Aulas', href: '/aulas', icon: FiBookOpen },
    { name: 'Financeiro', href: '/financeiro', icon: FiDollarSign },
    { name: 'Frequência', href: '/frequencia', icon: FiCalendar },
    { name: 'Notas', href: '/notas', icon: FiBook },
    { name: 'Configurações', href: '/configuracoes', icon: FiSettings },
  ];

  // Variantes de animação
  const sidebarVariants = {
    open: { x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
    closed: { x: "-100%", transition: { type: "spring", stiffness: 300, damping: 30 } }
  };

  const overlayVariants = {
    open: { opacity: 1, pointerEvents: "auto" },
    closed: { opacity: 0, pointerEvents: "none" }
  };

  useEffect(() => {
    let resizeTimeout;
    
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const width = window.innerWidth;
        
        if (width >= 1024) {
          setIsOpen(true);
        } else if (width < 1024) {
          setIsOpen(false);
        }
      }, 100);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <>
      {/* Botão Hamburguer para Mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <FiMenu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Overlay para Mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={overlayVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={() => setIsOpen(false)}
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        variants={sidebarVariants}
        initial="closed"
        animate={isOpen ? "open" : "closed"}
        className={`fixed lg:relative lg:translate-x-0 z-50 h-screen bg-white dark:bg-gray-800 shadow-xl border-r border-gray-200 dark:border-gray-700 transition-colors duration-200 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Header da Sidebar */}
        <div className="flex bg-cover relative items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`flex-1 `}
              >
              
                <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">EduGestor</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Gestão Académica</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Botões de controle */}
          <div className="flex items-center gap-2">
            {/* Botão Collapse/Expand (apenas desktop) */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:block p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FiChevronLeft 
                className={`h-4 w-4 text-gray-600 dark:text-gray-400 transition-transform ${
                  isCollapsed ? 'rotate-180' : ''
                }`} 
              />
            </button>

            {/* Botão Fechar (apenas mobile) */}
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FiX className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Navegação */}
        <nav className="mt-6 px-3">
          {navigation.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <NavLink
                to={item.href}
                onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all group relative ${
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`
                }
              >
                <item.icon className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
                
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Tooltip quando collapsed */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-200 text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </NavLink>
            </motion.div>
          ))}
        </nav>

        {/* User Info */}
        <motion.div 
          className={`absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 ${
            isCollapsed ? 'text-center' : ''
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex items-center gap-3 flex-1"
                >
                  {/* Avatar do usuário */}
                  <div className="w-8 h-8 bg-gray-500 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                    {user?.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt={`Foto de ${user.displayName}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-white text-sm font-semibold">
                        {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                      </span>
                    )}
                  </div>
                  
                  {/* Informações do usuário */}
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user?.displayName || 'Usuário'}
                    </p>
                    <p className="text-xs max-w-32 text-gray-500 dark:text-gray-400 truncate">
                      {user?.email || 'user@email.com'}
                    </p>
                  </div>

                  {/* Menu do usuário */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <FiUser className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </button>

                    <AnimatePresence>
                      {showUserMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                        >
                          <div className="p-2">
                            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-2">
                              <FiUser className="w-4 h-4" />
                              Perfil
                            </button>
                            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-2">
                              <FiSettings className="w-4 h-4" />
                              Configurações
                            </button>
                            <hr className="my-1 border-gray-200 dark:border-gray-600" />
                            <button 
                            onClick={logout}
                            className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-2">
                              <FiLogOut className="w-4 h-4" />
                              Sair
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Avatar collapsed */}
            {isCollapsed && (
              <div className="w-8 h-8 bg-gray-500 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden mx-auto">
                {user?.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="User"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-sm font-semibold">
                    {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </span>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </>
  );
};

export default Sidebar;