import { motion } from "framer-motion";
import { FiCalendar, FiX } from "react-icons/fi";
import { PlanoAula } from "../../types/aula";

interface PlanoDetalhesProps{
  planoDetalhes:PlanoAula,
  setPlanoDetalhes:any
}

export const PlanoDetalhes=({planoDetalhes,setPlanoDetalhes}:PlanoDetalhesProps)=>{
    return <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setPlanoDetalhes(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >                                                                           
              {/* Header com gradiente animado */}
              <motion.div 
                className="flex items-start justify-between bg-gradient-to-r from-blue-600 to-blue-700 p-6"
              >
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="text-xl font-bold text-white">
                    {planoDetalhes.titulo}
                  </h3>
                  <p className="text-sm text-blue-100">{planoDetalhes.disciplina}</p>
                </motion.div>
                
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setPlanoDetalhes(null)}
                  className="p-2 hover:bg-blue-800 rounded-lg transition-colors text-white"
                >
                  <FiX size={20} />
                </motion.button>
              </motion.div>

              {/* Conteúdo com scroll */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="p-6 max-h-[75vh] overflow-y-auto"
              >
                {/* Descrição com animação de fade */}
                {planoDetalhes.descricao && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-sm text-gray-700 dark:text-gray-300 mb-4 italic border-l-4 border-blue-500 pl-3"
                  >
                    {planoDetalhes.descricao}
                  </motion.p>
                )}

                {/* Grid de métricas */}
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                  >
                    <span className="text-gray-500 dark:text-gray-400 text-xs">Tipo</span>
                    <div className="font-medium text-gray-900 dark:text-white mt-1">{planoDetalhes.tipo}</div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                  >
                    <span className="text-gray-500 dark:text-gray-400 text-xs">Status</span>
                    <div className="font-medium mt-1">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                        planoDetalhes.status === 'ativo' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        planoDetalhes.status === 'rascunho' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        planoDetalhes.status === 'arquivado' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {planoDetalhes.status}
                      </span>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                  >
                    <span className="text-gray-500 dark:text-gray-400 text-xs">Aulas planeadas</span>
                    <div className="font-medium text-gray-900 dark:text-white mt-1">{planoDetalhes.aulas_planeadas}</div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                  >
                    <span className="text-gray-500 dark:text-gray-400 text-xs">Aulas geradas</span>
                    <div className="font-medium text-gray-900 dark:text-white mt-1">{planoDetalhes.aulas_geradas?.length || 0}</div>
                  </motion.div>
                </div>

                {/* Datas do plano (se existirem) */}
                {(planoDetalhes.data_inicio || planoDetalhes.data_fim) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex items-center gap-4 mb-4 text-sm bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg"
                  >
                    {planoDetalhes.data_inicio && (
                      <div className="flex items-center gap-2">
                        <FiCalendar className="text-blue-600 dark:text-blue-400" />
                        <span className="text-gray-700 dark:text-gray-300">
                          Início: {new Date(planoDetalhes.data_inicio).toLocaleDateString('pt-AO')}
                        </span>
                      </div>
                    )}
                    {planoDetalhes.data_fim && (
                      <div className="flex items-center gap-2">
                        <FiCalendar className="text-blue-600 dark:text-blue-400" />
                        <span className="text-gray-700 dark:text-gray-300">
                          Fim: {new Date(planoDetalhes.data_fim).toLocaleDateString('pt-AO')}
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Objetivos de Aprendizagem */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="mb-4"
                >
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                    Objetivos de Aprendizagem
                  </h4>
                  <ul className="space-y-2">
                    {(planoDetalhes.objetivos_aprendizagem || []).map((objetivo, index) => (
                      <motion.li
                        key={`${planoDetalhes.id}-objetivo-${index}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 + index * 0.1 }}
                        className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{objetivo}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>

                {/* Conteúdos */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 }}
                  className="mb-4"
                >
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="w-1 h-4 bg-green-500 rounded-full"></span>
                    Conteúdos
                  </h4>
                  <div className="space-y-2">
                    {(planoDetalhes.conteudos || []).map((conteudo, index) => (
                      <motion.div
                        key={`${planoDetalhes.id}-conteudo-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.1 + index * 0.1 }}
                        whileHover={{ scale: 1.01, x: 5 }}
                        className="border-l-4 border-green-500 pl-3 py-2 bg-gray-50 dark:bg-gray-700/30 rounded-r-lg"
                      >
                        <div className="font-medium text-sm text-gray-900 dark:text-white">{conteudo.titulo}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{conteudo.descricao}</div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Metodologias e Recursos (se existirem) */}
                {planoDetalhes.metodologia_principal && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.3 }}
                    className="mb-4"
                  >
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                      Metodologias
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs"
                        >
                          {planoDetalhes.metodologia_principal}
                        </motion.span>
                    </div>
                  </motion.div>
                )}

                {planoDetalhes.recursos_necessarios && planoDetalhes.recursos_necessarios.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5 }}
                    className="mb-4"
                  >
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                      Recursos
                    </h4>
                    <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                      {planoDetalhes.recursos_necessarios.map((recurso, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1.6 + index * 0.1 }}
                        >
                          {recurso}
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {/* Footer com ações */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.7 }}
                  className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setPlanoDetalhes(null)}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Fechar
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      // Ação de editar
                      setPlanoDetalhes(null);
                      // Aqui você pode abrir o modal de edição
                    }}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Editar Plano
                  </motion.button>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
}