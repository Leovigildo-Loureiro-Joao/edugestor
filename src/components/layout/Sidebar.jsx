import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  FiHome, 
  FiUsers, 
  FiDollarSign, 
  FiCalendar, 
  FiBook,
  FiSettings, 
  FiBookOpen,
  FiChevronDown,
  FiMenu,
  FiX,
  FiChevronLeft,
  FiUser,
  FiLogOut,
  FiLayers,
  FiTrendingUp
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { FaGraduationCap } from 'react-icons/fa';
import { initializeSyncSystem } from '../../services/database/syncManager.ts';

const Sidebar = () => {
    const userMenuRef = useRef(null);
  const navigate = useNavigate()
  const { user,logout,profile } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

    useEffect(() => {
      // ✅ Inicializar sistema de sincronização
      const initSync = async () => {
        await initializeSyncSystem();
        console.log('✅ Sistema de sincronização inicializado');
      };
      
      initSync();
    }, []);
  
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: FiHome },
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
           
                  
                

                  {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                }}
                className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none"
                aria-label="Menu do usuário"
              >
                <div className="relative">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-medium shadow-sm">
                    {profile?.full_name ? (
                      profile.full_name.charAt(0).toUpperCase()
                    ) : user?.email ? (
                      user.email.charAt(0).toUpperCase()
                    ) : (
                      <FiUser className="h-4 w-4" />
                    )}
                  </div>
                  {profile?.role === 'admin' && (
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                  )}
                </div>
                
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px]">
                    {profile?.full_name || user?.email || 'Usuário'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {profile?.role === 'admin' ? 'Administrador' :
                     profile?.role === 'manager' ? 'Gerente' :
                     profile?.role === 'teacher' ? 'Professor' : 'Usuário'}
                  </p>
                </div>
                
                <FiChevronDown className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                  showUserMenu ? 'rotate-180' : ''
                }`} />
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full -right-20 mb-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                  >
                    <div className="p-2">
                      {/* Info do usuário */}
                      <div className="px-3 py-2 mb-1 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {profile?.full_name || user?.email}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user?.email}
                        </p>
                        <div className="mt-1">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            profile?.role === 'admin' 
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                              : profile?.role === 'manager'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              : profile?.role === 'teacher'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {profile?.role === 'admin' ? 'Administrador' :
                             profile?.role === 'manager' ? 'Gerente' :
                             profile?.role === 'teacher' ? 'Professor' : 'Usuário'}
                          </span>
                        </div>
                      </div>

                      {/* Menu items */}
                      <button 
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-2 transition-colors"
                        onClick={() => {
                          setShowUserMenu(false);
                         navigate("/profile")
                        }}
                      >
                        <FiUser className="w-4 h-4" />
                        <span>Meu Perfil</span>
                      </button>
                      
                      <button 
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-2 transition-colors"
                        onClick={() => {
                          setShowUserMenu(false);
                          // Navegar para configurações
                        }}
                      >
                        <FiSettings className="w-4 h-4" />
                        <span>Configurações</span>
                      </button>

                      {/* Divisor */}
                      <hr className="my-2 border-gray-200 dark:border-gray-600" />

                      {/* Apenas admin vê esta opção */}
                      {profile?.role === 'admin' && (
                        <button 
                          className="w-full text-left px-3 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-2 transition-colors"
                          onClick={() => {
                            setShowUserMenu(false);
                            navigate("/admin/dashboard")
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>Painel Admin</span>
                        </button>
                      )}

                      {/* Divisor antes de sair */}
                      <hr className="my-2 border-gray-200 dark:border-gray-600" />

                      <button 
                        onClick={() => {
                          setShowUserMenu(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md flex items-center gap-2 transition-colors"
                      >
                        <FiLogOut className="w-4 h-4" />
                        <span>Sair</span>
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
                  <span className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    
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