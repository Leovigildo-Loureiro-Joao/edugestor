// components/ui/AlertBadge - VERSÃO CORRIGIDA E SIMPLIFICADA
import { AnimatePresence, motion } from "framer-motion";
import { 
  FiAlertCircle, 
  FiAlertOctagon, 
  FiCheckCircle, 
  FiX, 
  FiXOctagon,
  FiInfo
} from "react-icons/fi";
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export type AlertType = "error" | "warning" | "success" | "info";

export interface AlertProps {
  id?: string;
  type: AlertType;
  title: string;
  message?: string;
  duration?: number; // Auto-close em ms (0 = não fecha)
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface AlertContextType {
  showAlert: (alert: Omit<AlertProps, 'id'>) => string;
  removeAlert: (id: string) => void;
  clearAlerts: () => void;
}

let globalShowAlertHandler: ((alert: Omit<AlertProps, 'id'>) => string) | null = null;

export const showGlobalAlert = (alert: Omit<AlertProps, 'id'>): string => {
  if (!globalShowAlertHandler) return '';
  return globalShowAlertHandler(alert);
};

// Criar contexto
const AlertContext = createContext<AlertContextType | null>(null);

// Hook para usar alerts
export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
};

// Componente individual do alert
const AlertBadgeComponent: React.FC<AlertProps & { onClose: () => void }> = ({
  type,
  title,
  message,
  duration = 5000,
  onClose,
  action
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const config = {
    error: {
      icon: <FiXOctagon className="h-5 w-5" />,
      bgColor: "bg-red-50 dark:bg-red-900/20",
      borderColor: "border-l-4 border-red-500",
      iconColor: "text-red-600 dark:text-red-400"
    },
    warning: {
      icon: <FiAlertOctagon className="h-5 w-5" />,
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      borderColor: "border-l-4 border-orange-500",
      iconColor: "text-orange-600 dark:text-orange-400"
    },
    success: {
      icon: <FiCheckCircle className="h-5 w-5" />,
      bgColor: "bg-green-50 dark:bg-green-900/20",
      borderColor: "border-l-4 border-green-500",
      iconColor: "text-green-600 dark:text-green-400"
    },
    info: {
      icon: <FiInfo className="h-5 w-5" />,
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      borderColor: "border-l-4 border-blue-500",
      iconColor: "text-blue-600 dark:text-blue-400"
    }
  }[type];

  // Auto-close
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Aguarda animação
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 100, scale: 0.95 }}
        className={`fixed top-4 right-4 z-50 w-full max-w-sm ${config.bgColor} ${config.borderColor} rounded-r-lg shadow-lg`}
      >
        <div className="p-4">
          <div className="flex items-start">
            <div className={`flex-shrink-0 p-2 rounded-lg ${config.iconColor}`}>
              {config.icon}
            </div>
            <div className="ml-3 flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {title}
                  </h3>
                  {message && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {message}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="ml-4 flex-shrink-0 p-1 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>

              {action && (
                <div className="mt-3">
                  <button
                    onClick={() => {
                      action.onClick();
                      onClose();
                    }}
                    className={`text-sm font-medium ${config.iconColor} hover:underline`}
                  >
                    {action.label}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Provider principal
export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<(AlertProps & { id: string })[]>([]);

  const showAlert = useCallback((alert: Omit<AlertProps, 'id'>): string => {
    const id = Date.now().toString();
    const newAlert = { ...alert, id };
    
    setAlerts(prev => [...prev, newAlert]);
    
    if (alert.duration && alert.duration > 0) {
      setTimeout(() => {
        removeAlert(id);
      }, alert.duration);
    }

    return id;
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  useEffect(() => {
    globalShowAlertHandler = showAlert;
    return () => {
      globalShowAlertHandler = null;
    };
  }, [showAlert]);

  // Renderizar múltiplos alerts com espaçamento
  const renderAlerts = () => {
    return alerts.map((alert, index) => (
      <div 
        key={alert.id} 
        className="fixed top-4 right-4 z-50"
        style={{ 
          top: `${24 + (index * 80)}px`, // 80px de espaçamento entre alerts
          zIndex: 50 + index // Aumenta z-index para cada alert
        }}
      >
        <AlertBadgeComponent
          {...alert}
          onClose={() => removeAlert(alert.id!)}
        />
      </div>
    ));
  };

  return (
    <AlertContext.Provider value={{ showAlert, removeAlert, clearAlerts }}>
      {children}
      {renderAlerts()}
    </AlertContext.Provider>
  );
};
