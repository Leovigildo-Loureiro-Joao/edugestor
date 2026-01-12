import { motion } from "framer-motion";
import { use, useState } from "react";
import { FiBookOpen, FiCheckCircle, FiChevronRight, FiDollarSign, FiPlus, FiSettings, FiTarget, FiTrendingUp } from "react-icons/fi";
import { Meta } from "../../types/eventos";
import { useNavigate } from "react-router-dom";


const MetaComponent = ({ metas, setMetas }: { metas: Meta[] ,setMetas:React.Dispatch<React.SetStateAction<Meta[]>>}) => {
    const navigate = useNavigate();
    const [expandedMeta, setExpandedMeta] = useState<string | null>(null);
    const toggleMeta = (id: string) => {
    setExpandedMeta(expandedMeta === id ? null : id);
  };
  

  const getMetaIcon = (tipo: string) => {
    switch(tipo) {
      case 'academica': return <FiBookOpen  className="text-blue-500" />;
      case 'financeira': return <FiDollarSign className="text-green-500" />;
      case 'operacional': return <FiSettings className="text-purple-500" />;
      case 'marketing': return <FiTrendingUp className="text-orange-500" />;
      default: return <FiTarget className="text-gray-500" />;
    }
  };

  return (
      <div className="p-6 dark:bg-gray-700">
            <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                <FiTarget className="mr-2" />
                Metas Estratégicas
            </h2>
            <button 
            onClick={() => navigate("/estrategia/metas/nova")}
            className="btn btn-primary flex items-center dark:hover:bg-blue-400  hover:bg-blue-100 p-3 dark:text-blue-300 text-blue-600 rounded-md transition-all" >
                <FiPlus className="mr-2" />
                Nova Meta
            </button>
            </div>

            <div className="space-y-4">
            {metas.map((meta) => (
                <motion.div
                key={meta.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                >
                <div 
                    className="p-4 cursor-pointer"
                    onClick={() => toggleMeta(meta.id)}
                >
                    <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        {getMetaIcon(meta.tipo)}
                        <div>
                        <h3 className="font-semibold text-gray-800">
                            {meta.tipo.charAt(0).toUpperCase() + meta.tipo.slice(1)} Meta
                        </h3>
                        <p className="text-sm text-gray-500">
                            {meta.descricao}
                        </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${meta.progresso}%` }}
                        ></div>
                        </div>
                        <span className="font-semibold">{meta.progresso}%</span>
                        <FiChevronRight className={`transform transition-transform ${
                        expandedMeta === meta.id ? 'rotate-90' : ''
                        }`} />
                    </div>
                    </div>
                </div>

                {expandedMeta === meta.id && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        
                        className="border-t border-gray-100 p-4 bg-gray-50 transition-all"
                        >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                            <h4 className="font-semibold text-sm text-gray-600 mb-2">
                                Indicadores
                            </h4>
                            <ul className="space-y-1">
                                {meta.kpis && meta.kpis.length > 0 ? (
                                meta.kpis.map((kpi, index) => (
                                    <li key={index} className="flex justify-between text-sm">
                                    <span>{kpi.nome} ({kpi.unidade})</span>
                                    <span className="font-medium">
                                        {kpi.valor_atual} / {kpi.valor_meta}
                                    </span>
                                    </li>
                                ))
                                ) : (
                                <li className="text-sm text-gray-500">Nenhum indicador definido.</li>
                                )}
                            </ul>
                            </div>
                            <div>
                            <h4 className="font-semibold text-sm text-gray-600 mb-2">
                                Prazos
                            </h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                <span>Início:</span>
                                <span className="font-medium">
                                    {new Date(meta.data_inicio).toLocaleDateString()}
                                </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                <span>Fim:</span>
                                <span className="font-medium">
                                    {new Date(meta.data_fim).toLocaleDateString()}
                                </span>
                                </div>
                            </div>
                            </div>
                        </div>
                        <div className="flex gap-5">
                            <button
                             onClick={() => navigate("/estrategia/metas/editar/"+ meta.id)}
                             className="bg-blue-100 text-sm p-1 px-5 text-blue-700 rounded hover:bg-blue-200 transition-colors">Editar</button>
                            <button className="bg-red-100 text-sm p-1 px-5 text-red-700 rounded hover:bg-red-200 transition-colors">Apagar</button>
                        </div>
                    </motion.div>
                )}
                </motion.div>
            ))}
            </div>
        </div>
);}
export default MetaComponent;

