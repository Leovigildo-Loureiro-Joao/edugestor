// src/components/layout/Layout.jsx
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children }) =>  {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      return saved ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const openMobileMenu = useCallback(() => setIsMobileSidebarOpen(true), []);
  const closeMobileMenu = useCallback(() => setIsMobileSidebarOpen(false), []);

// src/components/layout/Layout.jsx - MANTENHA ESTE
useEffect(() => {
  const root = document.documentElement;
    
  if (isDarkMode) {
    root.classList.add('dark');
    localStorage.setItem('darkMode', 'true');
  } else {
    root.classList.remove('dark');
    localStorage.setItem('darkMode', 'false');
  }
  }, [isDarkMode]);

  return (
    <div className={`flex h-screen bg-white dark:bg-gray-900 transition-colors duration-200`}>
      <Sidebar
        mobileMenuOpen={isMobileSidebarOpen}
        onCloseMobileMenu={closeMobileMenu}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          setIsDarkMode={setIsDarkMode}
          isDarkMode={isDarkMode}
          onOpenMobileMenu={openMobileMenu}
        />
        <main className="flex-1 overflow-auto p-3 sm:p-6 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
