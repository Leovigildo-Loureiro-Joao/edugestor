import React from 'react';
import { FiUser } from 'react-icons/fi';

interface PageLoaderProps {
  title?: string;
  subtitle?: string;
  fullScreen?: boolean;
}

export const PageLoader: React.FC<PageLoaderProps> = ({
  title = 'Carregando dados',
  subtitle = 'Aguarde um instante...',
  fullScreen = true
}) => {
  return (
    <div
      className={
        fullScreen
          ? 'min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4'
          : 'w-full flex items-center justify-center py-12'
      }
    >
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="relative mx-auto w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100 dark:border-blue-900"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin"></div>
        </div>
        <h3 className="mt-5 text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
      </div>
    </div>
  );
};
