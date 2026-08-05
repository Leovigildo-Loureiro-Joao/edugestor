import { FiBarChart2, FiCheckSquare, FiUsers, FiTrendingUp, FiActivity, FiClock } from "react-icons/fi";
import { motion } from "framer-motion";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const EstatisticasView = ({estatisticas, aulasFiltradas, frequenciasFiltradas}) => {
  const cardColorStyles = {
    blue: {
      border: 'border-l-4 border-l-blue-500',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconText: 'text-blue-600 dark:text-blue-400',
      valueGrad: 'bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-200'
    },
    green: {
      border: 'border-l-4 border-l-green-500',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconText: 'text-green-600 dark:text-green-400',
      valueGrad: 'bg-gradient-to-r from-green-600 to-green-800 dark:from-green-400 dark:to-green-200'
    },
    purple: {
      border: 'border-l-4 border-l-purple-500',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      iconText: 'text-purple-600 dark:text-purple-400',
      valueGrad: 'bg-gradient-to-r from-purple-600 to-purple-800 dark:from-purple-400 dark:to-purple-200'
    }
  };

  const overviewStatStyles = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  const statsCards = [
    {
      title: "Resumo Geral",
      icon: FiBarChart2,
      color: "blue",
      items: [
        { label: "Total de Aulas:", value: estatisticas?.totalAulas || 0 },
        { label: "Aulas Registradas:", value: estatisticas?.aulasRegistradas || 0, highlight: true, color: "green" },
        { label: "Aulas Pendentes:", value: estatisticas?.aulasPendentes || 0, highlight: true, color: "orange" }
      ]
    },
    {
      title: "Taxa de Registro",
      icon: FiCheckSquare,
      color: "green",
      value: `${estatisticas?.taxaRegistro?.toFixed(1) || 0}%`,
      description: "das aulas têm frequência registrada"
    },
    {
      title: "Taxa de Presença",
      icon: FiUsers,
      color: "purple",
      value: `${estatisticas?.taxaPresenca?.toFixed(1) || 0}%`,
      description: "média de alunos presentes"
    }
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {statsCards.map((card, index) => (
        <motion.div
          key={index}
          variants={cardVariants}
          whileHover={{ y: -4 }}
          className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 ${cardColorStyles[card.color].border}`}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-3 rounded-xl ${cardColorStyles[card.color].iconBg}`}>
              <card.icon className={`${cardColorStyles[card.color].iconText} text-xl`} />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg">{card.title}</h3>
          </div>
          
          {card.items ? (
            <div className="space-y-4">
              {card.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                  <span className={`font-bold ${
                    item.highlight 
                      ? item.color === 'green' ? 'text-green-600' : 'text-orange-600'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
                className={`text-4xl font-bold ${cardColorStyles[card.color].valueGrad} bg-clip-text text-transparent mb-3`}
              >
                {card.value}
              </motion.div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{card.description}</p>
            </div>
          )}
        </motion.div>
      ))}

      {/* Informações Adicionais */}
      <motion.div
        variants={cardVariants}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg md:col-span-2 lg:col-span-3"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100">
            <FiActivity className="text-indigo-600 text-xl" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg">Visão Geral do Sistema</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: "Total Alunos", value: estatisticas?.totalAlunos || 0, color: "blue", icon: FiUsers },
            { label: "Turmas Ativas", value: estatisticas?.turmasAtivas || 0, color: "green", icon: FiTrendingUp },
            { label: "Pendentes (Filtro)", value: aulasFiltradas.length, color: "orange", icon: FiClock },
            { label: "Registradas (Filtro)", value: frequenciasFiltradas.length, color: "purple", icon: FiCheckSquare }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="text-center p-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-100 dark:border-gray-700"
            >
              <div className={`inline-flex p-2 rounded-lg mb-3 ${overviewStatStyles[stat.color].bg}`}>
                <stat.icon className={overviewStatStyles[stat.color].text} />
              </div>
              <div className={`text-3xl font-bold mb-1 ${overviewStatStyles[stat.color].text}`}>
                {stat.value}
              </div>
              <div className="text-gray-600 dark:text-gray-400 text-sm font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>
        
        <div className="h-80 mt-6 border-t-2 pt-6 border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-gray-900 dark:text-white font-bold text-lg flex items-center gap-2">
              <FiTrendingUp className="text-blue-500" />
              Desempenho das Presenças
            </h4>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                Presenças
              </span>
              <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                Ausências
              </span>
            </div>
          </div>
          
          <motion.div
           initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="h-full pb-10"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[
                estatisticas
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="mes" stroke="#6b7280" />
                <YAxis yAxisId="left" domain={[0, 20]} stroke="#6b7280" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '10px', 
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="ausencias" 
                  stroke="#f6573b" 
                  strokeWidth={3}
                  name="Ausências %"
                  dot={{ r: 5, fill: "#f6573b" }}
                  activeDot={{ r: 8 }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="presença" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  name="Presenças %"
                  dot={{ r: 5, fill: "#10B981" }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};
