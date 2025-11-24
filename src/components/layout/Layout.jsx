import React from 'react';
import Sidebar from './Sidebar';
import Header from '../ui/Header';


const Layout = ({ children }) => {
  return (
    <div className="flex h-screen bg-white">
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
