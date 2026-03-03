// components/ui/ProgressBar
import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'orange';
  showLabel?: boolean;
  height?: 'sm' | 'md' | 'lg';
  className?: string;
}

const colorClasses = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500'
};

const heightClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3'
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  color = 'blue',
  showLabel = true,
  height = 'md',
  className = ''
}) => {
  // Garantir que o percentual não ultrapasse 100%
  const percent = Math.min((value / max) * 100, 100);
  
  // Se value for maior que max, mostrar visualmente
  const isExceeded = value > max;
  const excessValue = isExceeded ? value - max : 0;

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span>{value.toFixed(1)}/{max}</span>
          <span className={isExceeded ? 'text-red-600 dark:text-red-400 font-bold' : ''}>
            {percent.toFixed(1)}%
          </span>
        </div>
      )}
      
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${heightClasses[height]}`}>
        <div 
          className={`${colorClasses[color]} transition-all duration-300 rounded-full ${heightClasses[height]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      
      {isExceeded && showLabel && (
        <p className="text-xs text-red-500 dark:text-red-400 mt-1">
          Excedente: +{excessValue.toFixed(1)}
        </p>
      )}
    </div>
  );
};
