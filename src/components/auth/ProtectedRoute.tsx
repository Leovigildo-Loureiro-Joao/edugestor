// src/components/auth/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'teacher' | 'user';
  adminOnly?: boolean;
  managerOrAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  adminOnly = false,
  managerOrAdmin = false
}) => {
  const { user, loading, profile, isAdmin, isManagerOrAdmin, hasPermission } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // 🔥 SEM AUTENTICAÇÃO
  if (!user) {
    console.warn('⚠️ Acesso não autorizado: Usuário não autenticado');
    return <Navigate to="/login" replace />;
  }

  // 🔥 VERIFICAÇÕES DE PERMISSÃO
  if (adminOnly && !isAdmin()) {
    console.warn('⚠️ Acesso negado: Apenas administradores');
    return <Navigate to="/unauthorized" replace />;
  }

  if (managerOrAdmin && !isManagerOrAdmin()) {
    console.warn('⚠️ Acesso negado: Apenas gerentes ou administradores');
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredRole && !hasPermission(requiredRole)) {
    console.warn(`⚠️ Acesso negado: Role ${requiredRole} requerida`);
    return <Navigate to="/unauthorized" replace />;
  }

  // 🔥 LOG DE ACESSO (OPCIONAL PARA MONITORAMENTO)
  React.useEffect(() => {
    console.log(`👤 Acesso autorizado: ${user.email} - Role: ${profile?.role}`);
  }, [user.email, profile?.role]);

  return <>{children}</>;
};

export default ProtectedRoute;