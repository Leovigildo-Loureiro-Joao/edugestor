import { motion } from "framer-motion"
import { FiSave, FiX } from "react-icons/fi"
import { SelectTyped } from "../students/StudentForm"
import { useAlert } from "../ui/AlertBadge"

export const ModalSubmeta=({novaSubMeta,formData,setNovaSubMeta,handleSaveSubMeta,kpis,setShowSubMeta}:{
    novaSubMeta:any,setNovaSubMeta:any,handleSaveSubMeta:any,setShowSubMeta:any,kpis:Array<{ nome?: string }>,formData:any
})=>{
const { showAlert } = useAlert(); 
    return   <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
                    onClick={() => setShowSubMeta(false)}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 20 }}
                      className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-none sm:max-w-2xl h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className='flex justify-between items-center mb-4'>
                        <div>
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                            {novaSubMeta.titulo ? 'Editar Sub-meta' : 'Nova Sub-meta'}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Preencha os detalhes da etapa da meta principal
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setShowSubMeta(false);
                            setNovaSubMeta({
                              titulo: "",
                              descricao: "",
                              data_inicio: "",
                              data_fim: "",
                              status: "em_andamento",
                              responsavel: "",
                              custo_estimado: 0,
                              custo_real: 0,
                              kpis_afetados: [],
                              notas: ""
                            });
                          }}
                          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <FiX className="h-5 w-5" />
                        </button>
                      </div>
                      
                      <div className="space-y-4 w-full overflow-y-auto flex-1 px-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Título *
                            </label>
                            <input
                              type="text"
                              value={novaSubMeta.titulo}
                              onChange={(e) => setNovaSubMeta({...novaSubMeta, titulo: e.target.value})}
                              placeholder='Ex: Contratar novo professor'
                              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Status
                            </label>
                            <SelectTyped 
                              vect={[
                                { value: 'pendente', label: 'Pendente', icon: '○' },
                                { value: 'em_andamento', label: 'Em Andamento', icon: '↻' },
                                { value: 'concluida', label: 'Concluída', icon: '✓' },
                                { value: 'atrasada', label: 'Atrasada', icon: '⚠' }
                              ]}
                              value={novaSubMeta.status}
                              onChange={(value: any) => setNovaSubMeta({...novaSubMeta, status: value})}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Descrição
                          </label>
                          <textarea 
                            value={novaSubMeta.descricao}
                            onChange={(e) => setNovaSubMeta({...novaSubMeta, descricao: e.target.value})}
                            rows={3}
                            placeholder='Descreva em detalhes o que será feito nesta etapa...'
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Data de início *
                            </label>
                            <input
                              type="date"
                              value={novaSubMeta.data_inicio}
                              onChange={(e) => setNovaSubMeta({...novaSubMeta, data_inicio: e.target.value})}
                              min={formData.data_inicio}
                              max={formData.data_fim}
                              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Data de término *
                            </label>
                            <input
                              type="date"
                              value={novaSubMeta.data_fim}
                              onChange={(e) => setNovaSubMeta({...novaSubMeta, data_fim: e.target.value})}
                              min={novaSubMeta.data_inicio || formData.data_inicio}
                              max={formData.data_fim}
                              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Responsável *
                            </label>
                            <input
                              type="text"
                              value={novaSubMeta.responsavel}
                              onChange={(e) => setNovaSubMeta({...novaSubMeta, responsavel: e.target.value})}
                              placeholder='Ex: João Silva'
                              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Custo Previsto (AKZ)
                              </label>
                              <input
                                type="number"
                                value={novaSubMeta.custo_estimado || ''}
                                onChange={(e) => setNovaSubMeta({
                                  ...novaSubMeta, 
                                  custo_estimado: e.target.value ? parseFloat(e.target.value) : 0
                                })}
                                placeholder='0.00'
                                step="0.01"
                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Custo Real (AKZ)
                              </label>
                              <input
                                type="number"
                                value={novaSubMeta.custo_real || ''}
                                onChange={(e) => setNovaSubMeta({
                                  ...novaSubMeta, 
                                  custo_real: e.target.value ? parseFloat(e.target.value) : 0
                                })}
                                placeholder='0.00'
                                step="0.01"
                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* KPIs Relacionados */}
                        {kpis.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              KPIs Impactados por esta sub-meta
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {kpis.map((kpi, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => {
                                    const updated = novaSubMeta.kpis_afetados?.includes(index.toString())
                                      ? novaSubMeta.kpis_afetados.filter((id:any) => id !== index.toString())
                                      : [...(novaSubMeta.kpis_afetados || []), index.toString()];
                                    setNovaSubMeta({...novaSubMeta, kpis_afetados: updated});
                                  }}
                                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                    novaSubMeta.kpis_afetados?.includes(index.toString())
                                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                      : 'bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                                  }`}
                                >
                                  {kpi.nome || `KPI ${index + 1}`}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Notas e Observações
                          </label>
                          <textarea 
                            value={novaSubMeta.notas || ''}
                            onChange={(e) => setNovaSubMeta({...novaSubMeta, notas: e.target.value})}
                            rows={2}
                            placeholder='Observações importantes, riscos, dependências...'
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                          type="button"
                          onClick={() => {
                            setShowSubMeta(false);
                            setNovaSubMeta({
                              titulo: "",
                              descricao: "",
                              data_inicio: "",
                              data_fim: "",
                              status: "em_andamento",
                              responsavel: "",
                              custo_estimado: 0,
                              custo_real: 0,
                              kpis_afetados: [],
                              notas: ""
                            });
                          }}
                          className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!novaSubMeta.titulo.trim()) {
                                showAlert({
                                  type: 'warning',
                                  title: 'Preencha todos campos obrigatórios',
                                  message: 'Título é obrigatório',
                                  duration: 3000
                                });
                              return;
                            }
                            if (!novaSubMeta.data_inicio) {
                                showAlert({
                                  type: 'warning',
                                  title: 'Preencha todos campos obrigatórios',
                                  message: 'Data de início é obrigatória',
                                  duration: 3000
                                });
                              return;
                            }
                            if (!novaSubMeta.data_fim) {
                              showAlert({
                                  type: 'warning',
                                  title: 'Preencha todos campos obrigatórios',
                                  message: 'Data de término é obrigatória',
                                  duration: 3000
                                });
                              return;
                            }
                            if (!novaSubMeta.responsavel.trim()) {
                                showAlert({
                                  type: 'warning',
                                  title: 'Preencha todos campos obrigatórios',
                                  message: 'Responsável é obrigatório',
                                  duration: 3000
                                });
                              return;
                            }
                            
                            handleSaveSubMeta();
                            setShowSubMeta(false);
                          }}
                          className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 font-medium flex items-center justify-center"
                        >
                          <FiSave className="mr-2" />
                          {novaSubMeta.titulo ? 'Atualizar' : 'Adicionar'} Sub-meta
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
}
