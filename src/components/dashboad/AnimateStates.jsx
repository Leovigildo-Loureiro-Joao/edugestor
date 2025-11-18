import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

export const AnimatedStat = ({ stat, index }) => {
  const [displayValue, setDisplayValue] = useState('0');
  const [isVisible, setIsVisible] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) {
      const isFloat = stat.value % 1 !== 0;
      const decimalPlaces = isFloat ? 1 : 0;
      
      let start = 0;
      const end = stat.value;
      const duration = 1500;
      const increment = end / (duration / 16);

      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setDisplayValue(end.toFixed(decimalPlaces));
          setHasCompleted(true);
          clearInterval(timer);
        } else {
          setDisplayValue(start.toFixed(decimalPlaces));
        }
      }, 16);

      return () => clearInterval(timer);
    }
  }, [isVisible, stat.value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.8 }}
      animate={isVisible ? { 
        opacity: 1, 
        y: 0, 
        scale: 1,
      } : {}}
      whileHover={{
        y: -5,
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      transition={{ 
        delay: index * 0.15, 
        duration: 0.6,
        ease: "easeOut"
      }}
      className="bg-white p-6 relative rounded-lg shadow-md cursor-pointer overflow-hidden"
    >
      {/* Background shimmer effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
        initial={{ x: "-100%" }}
        animate={hasCompleted ? { x: "100%" } : {}}
        transition={{ 
          delay: 0.5, 
          duration: 0.8,
          ease: "easeInOut"
        }}
      />
      
      <div className="flex items-center justify-between relative z-10">
        <div>
          <motion.p 
            className="text-sm font-medium text-gray-600"
            initial={{ opacity: 0, x: -20 }}
            animate={isVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: index * 0.15 + 0.2 }}
          >
            {stat.title}
          </motion.p>
          
          {/* Valor principal com múltiplas animações */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={isVisible ? { opacity: 1, scale: 1 } : {}}
            transition={{ 
              delay: index * 0.15 + 0.3,
              type: "spring",
              stiffness: 100
            }}
          >
            <motion.p 
              className="text-xl font-bold text-gray-900 mt-1"
              animate={hasCompleted ? {
                scale: [1, 1.1, 1],
                color: ["#1f2937", "#059669", "#1f2937"],
                transition: { 
                  duration: 0.5,
                  times: [0, 0.5, 1]
                }
              } : {}}
            >
              {`${stat.fix ? stat.aux + " " : ""}` + displayValue + `${!stat.fix ? stat.aux : ""}`}
            </motion.p>
          </motion.div>
          
          {/* Texto de change com animação */}
          <motion.p 
            className={`text-sm ${
              stat.change.startsWith('+') ? 'text-success-600' : 'text-danger-600'
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: index * 0.15 + 0.8 }}
          >
            {stat.change} em relação ao mês passado
          </motion.p>
        </div>
        
        {/* Ícone com animações */}
        <motion.div
          className={`p-3 rounded-full bg-${stat.color}-50 relative overflow-hidden`}
          initial={{ scale: 0, rotate: -180 }}
          animate={isVisible ? { 
            scale: 1, 
            rotate: 0,
          } : {}}
          whileHover={{
            scale: 1.1,
            rotate: 5,
            transition: { duration: 0.2 }
          }}
          transition={{ 
            delay: index * 0.15 + 0.4, 
            type: "spring",
            stiffness: 150
          }}
        >
          {/* Efeito de brilho no ícone */}
          <motion.div
            className={`absolute inset-0 bg-${stat.color}-200 rounded-full`}
            initial={{ scale: 0, opacity: 0 }}
            animate={hasCompleted ? {
              scale: [1, 2, 1],
              opacity: [0.5, 0, 0.5],
            } : {}}
            transition={{ 
              delay: 0.3,
              duration: 1,
              repeat: hasCompleted ? 1 : 0
            }}
          />
          <stat.icon className={`h-6 w-6 text-${stat.color}-600 relative z-10`} />
        </motion.div>
      </div>
      
      {/* Barra inferior animada */}
      <motion.div
        className={`bg-${stat.color}-50 p-2 -ml-6 rounded-b-md rounded-r-md rounded-t-none w-full absolute bottom-0`}
        initial={{ scaleX: 0, originX: 0 }}
        animate={isVisible ? { scaleX: 1 } : {}}
        transition={{ 
          delay: index * 0.15 + 0.6, 
          duration: 0.8,
          ease: "easeOut"
        }}
      />
      
      {/* Efeito de partículas quando completa (opcional) */}
      {hasCompleted && (
        <>
          <motion.div
            className={`absolute w-2 h-2 bg-${stat.color}-400 rounded-full`}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ 
              scale: [0, 3, 0],
              opacity: [1, 0.5, 0],
              x: [-20, 20, -20],
              y: [10, -10, 10]
            }}
            transition={{ 
              duration: 1.5,
              ease: "easeOut"
            }}
            style={{ top: "50%", left: "50%" }}
          />
          <motion.div
            className={`absolute w-2 h-2 bg-${stat.color}-400 rounded-full`}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ 
              scale: [0, 2, 0],
              opacity: [1, 0.3, 0],
              x: [10, -30, 10],
              y: [-5, 15, -5]
            }}
            transition={{ 
              duration: 1.2,
              ease: "easeOut",
              delay: 0.2
            }}
            style={{ top: "30%", left: "30%" }}
          />
        </>
      )}
    </motion.div>
  );
};