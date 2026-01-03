import { motion } from 'framer-motion';
import { useState, useEffect, useRef, ReactElement } from 'react';
import { IconType } from 'react-icons';
import { StatCard } from '../../types';

// Tipos


interface AnimatedStatProps {
  stat: StatCard;
  index: number;
}

// Mapeamento de cores para classes Tailwind
const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    bar: 'bg-blue-200'
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-600', 
    bar: 'bg-green-200'
  },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    bar: 'bg-emerald-200'
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    bar: 'bg-indigo-200'
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    bar: 'bg-purple-200'
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    bar: 'bg-orange-200'
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    bar: 'bg-red-200'
  },
  yellow: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-600',
    bar: 'bg-yellow-200'
  }
};

export const AnimatedStat = ({ stat, index }: AnimatedStatProps): ReactElement => {
  const [displayValue, setDisplayValue] = useState<string>('0');
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement>(null);

  // Get classes do mapeamento
  const colorClasses = colorMap[stat.color] || colorMap.blue;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible && typeof stat.value === 'number') {
      const isFloat = stat.value % 1 !== 0;
      const decimalPlaces = isFloat ? 1 : 0;
      
      let start = 0;
      const end = stat.value;
      const duration = 1000;
      const steps = 30;
      const increment = end / steps;

      let currentStep = 0;
      const timer = setInterval(() => {
        currentStep++;
        start += increment;
        if (currentStep >= steps) {
          setDisplayValue(end.toFixed(decimalPlaces));
          clearInterval(timer);
        } else {
          setDisplayValue(start.toFixed(decimalPlaces));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    } else if (isVisible && typeof stat.value === 'string') {
      // Se for string, apenas define o valor diretamente
      setDisplayValue(stat.value);
    }
  }, [isVisible, stat.value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileHover={{ scale: 1.05, boxShadow: '0 8px 15px rgba(0, 0, 0, 0.1)',transition: { duration: 0.3 } }}
      animate={isVisible ? { 
        opacity: 1, 
        y: 0,
      } : {}}
      transition={{ 
        delay: index * 0.1,
        duration: 0.3,
      }}
      className="bg-white dark:bg-gray-800 dark:border-gray-700 p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-white mb-1">
            {stat.title}
          </p>
          
          <motion.p 
            className="text-xl font-bold dark:text-white text-gray-900"
            key={displayValue}
          >
            {`${stat.fix ? stat.aux + " " : ""}` + displayValue + `${!stat.fix ? stat.aux : ""}`}
          </motion.p>
          
          <p className={`text-xs mt-1 ${
            stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
          }`}>
            {stat.change} vs mês passado
          </p>
        </div>
        
        <motion.div
          className={`p-2 rounded-full ${colorClasses.bg}`}
          initial={{ scale: 0 }}
          animate={isVisible ? { 
            scale: 1,
          } : {}}
          transition={{ 
            delay: index * 0.1 + 0.2,
          }}
        >
          <stat.icon className={`h-5 w-5 ${colorClasses.text}`} />
        </motion.div>
      </div>
      
      {/* Barra de progresso simples */}
      <motion.div
        className={`h-1 rounded-full mt-3 ${colorClasses.bar}`}
        initial={{ scaleX: 0 }}
        animate={isVisible ? { scaleX: 1 } : {}}
        transition={{ 
          delay: index * 0.1 + 0.3,
          duration: 0.6,
        }}
      />
    </motion.div>
  );
};