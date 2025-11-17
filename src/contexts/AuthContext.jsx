import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup, // ✅ MUDAR PARA POPUP
  GoogleAuthProvider,
  signInWithPhoneNumber
} from 'firebase/auth';
import { auth } from '../services/firebase/config';

// Criar o Context
const AuthContext = createContext();

// Hook personalizado para usar o AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

// Provider principal
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ✅ useEffect SIMPLIFICADO - apenas observer do auth state
  useEffect(() => {
    console.log('🔄 AuthProvider iniciando...');
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('🔄 Auth state changed:', firebaseUser);
      
      if (firebaseUser) {
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL
        };
        console.log('✅ Usuário definido no estado:', userData);
        setUser(userData);
      } else {
        console.log('❌ Nenhum usuário encontrado, definindo null');
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      console.log('🧹 Cleanup do AuthProvider');
      unsubscribe();
    };
  }, []);

  // Login com email e senha
  const login = async (email, password) => {
    try {
      setError('');
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result;
    } catch (error) {
      const errorMessage = getAuthErrorMessage(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Registro de novo usuário
  const register = async (email, password, displayName) => {
    try {
      setError('');
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Atualizar perfil com display name
      await updateProfile(auth.currentUser, {
        displayName: displayName
      });
      
      return result;
    } catch (error) {
      const errorMessage = getAuthErrorMessage(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Login com Google usando POPUP (mais confiável)
  const loginWithGoogle = async () => {
    try {
      setError('');
      setLoading(true);
      console.log('🔄 Iniciando login com Google...');
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      console.log('✅ Login com Google bem-sucedido:', result.user);
      
      return result;
    } catch (error) {
      console.error('❌ Erro no login com Google:', error);
      
      // Tratamento específico para erros de popup
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Login cancelado. Tente novamente.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Popup bloqueado. Permita popups para este site.');
      } else {
        const errorMessage = getAuthErrorMessage(error.code);
        setError(errorMessage);
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Login com Telefone (implementação básica)
  const loginWithPhone = async (phoneNumber) => {
    try {
      setError('');
      setLoading(true);
      
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      return result;
    } catch (error) {
      const errorMessage = getAuthErrorMessage(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      setError('');
      console.log('🚪 Fazendo logout...');
      await signOut(auth);
    } catch (error) {
      const errorMessage = getAuthErrorMessage(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Limpar erros
  const clearError = () => setError('');

  // Valores disponíveis no Context
  const value = {
    user,
    login,
    register,
    logout,
    loginWithGoogle,
    loginWithPhone,
    loading,
    error,
    clearError,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Tradutor de mensagens de erro do Firebase
const getAuthErrorMessage = (errorCode) => {
  const errorMessages = {
    'auth/invalid-email': 'Email inválido',
    'auth/user-disabled': 'Esta conta foi desativada',
    'auth/user-not-found': 'Usuário não encontrado',
    'auth/wrong-password': 'Senha incorreta',
    'auth/email-already-in-use': 'Este email já está em uso',
    'auth/weak-password': 'Senha muito fraca (mínimo 6 caracteres)',
    'auth/network-request-failed': 'Erro de conexão. Verifique sua internet',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde',
    'auth/operation-not-allowed': 'Operação não permitida',
    'auth/configuration-not-found': 'Serviço de autenticação não configurado',
    'auth/popup-closed-by-user': 'Login cancelado pelo usuário',
    'auth/popup-blocked': 'Popup bloqueado. Permita popups para este site',
    'auth/cancelled-popup-request': 'Múltiplas tentativas de login detectadas',
  };

  return errorMessages[errorCode] || `Erro: ${errorCode}`;
};