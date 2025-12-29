// src/components/auth/AuthCallback.tsx - VERSÃO SIMPLIFICADA
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🔗 Página de callback acessada');
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Autenticação concluída. Redirecionando...</p>
      </div>
    </div>
  );
};

export default AuthCallback;