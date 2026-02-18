import { FiCopy, FiEdit2, FiEye, FiPlus, FiTarget, FiTrash2, FiUpload } from "react-icons/fi";
import { SyncStatusBadge } from "../ui/SyncStatusBadge";
import { AsyncMotionValueAnimation, motion } from "framer-motion";
import { PlanoAula } from "../../types/aula";
interface PlanoAulaComponentProps{
    setPlanoTemplate:any,
    setShowPlaneamento:any,
    planosAula:PlanoAula[],
    handleVerDetalhesPlano:any,
    handleUsarTemplatePlano:any,
    handleGerarAulasDoPlano:any,
    handleEditarPlano:any,
    handleDeletarPlano:any
}
export const PlanoAulaComponent =(
    {
        setPlanoTemplate,
        setShowPlaneamento,
        planosAula,
        handleVerDetalhesPlano,
        handleUsarTemplatePlano,
        handleGerarAulasDoPlano,
        handleEditarPlano,
        handleDeletarPlano
    }:PlanoAulaComponentProps)=>{
    return <div className="p-6">
            <div className="flex justify-between items-center mb-6">

              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                <FiTarget className="mr-2" />
                Planos de Aula
              </h2>
              <SyncStatusBadge tableName="plano_aulas" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPlanoTemplate(null);
                    setShowPlaneamento(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
                >
                  <FiPlus /> Novo Plano
                </button>
              </div>
            </div>

            {planosAula.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {planosAula.map((plano,index) => (
                  <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ y: -2, transition: { duration: 0.2 } }}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-300 hover:shadow-sm transition-all w-full duration-300 h-full shadow p-5 "
                       key={plano.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className='flex'>
                          
                                        
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                          {plano.titulo}
                        </h3>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {plano.disciplina}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        plano.status === 'ativo' ? 'bg-green-100 text-green-800' :
                        plano.status === 'rascunho' ? 'bg-yellow-100 text-yellow-800' :
                        plano.status === 'arquivado' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {plano.status}
                      </span>
                    </div>

                    {plano.descricao && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 line-clamp-2">
                        {plano.descricao}
                      </p>
                    )}

                    <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center justify-between">
                        <span>Tipo</span>
                        <span className="font-medium">{plano.tipo}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Aulas planeadas</span>
                        <span className="font-medium">{plano.aulas_planeadas}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Aulas geradas</span>
                        <span className="font-medium">{plano.aulas_geradas?.length || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Turmas</span>
                        <span className="font-medium">{plano.turma_ids?.length || 0}</span>
                      </div>
                    </div>

                    {(plano.data_inicio || plano.data_fim) && (
                      <div className="mt-4 text-xs text-gray-500">
                        {plano.data_inicio && (
                          <div>Início: {new Date(plano.data_inicio).toLocaleDateString('pt-AO')}</div>
                        )}
                        {plano.data_fim && (
                          <div>Fim: {new Date(plano.data_fim).toLocaleDateString('pt-AO')}</div>
                        )}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleVerDetalhesPlano(plano.id)}
                        className="px-3 py-1.5 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-1"
                      >
                        <FiEye /> Ver detalhes
                      </button>
                      <button
                        onClick={() => handleUsarTemplatePlano(plano.id)}
                        className="px-3 py-1.5 text-xs rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 flex items-center gap-1"
                      >
                        <FiCopy /> Usar como template
                      </button>
                      <button
                        onClick={() => handleGerarAulasDoPlano(plano.id)}
                        className="px-3 py-1.5 text-xs rounded-md bg-green-100 text-green-700 hover:bg-green-200 flex items-center gap-1"
                      >
                        <FiUpload /> Gerar aulas
                      </button>
                    </div>
                    <div className='flex justify-end gap-3 pt-5'>
                      <button
                        onClick={() => handleEditarPlano(plano)}
                        className="px-3 py-1.5 text-xs rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center gap-1"
                      >
                        <FiEdit2 /> Editar
                      </button>
                      <button
                        onClick={() => handleDeletarPlano(plano)}
                        className="px-3 py-1.5 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-1"
                      >
                        <FiTrash2 /> Apagar
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FiTarget className="mx-auto h-16 w-16 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                  Nenhum plano de aula encontrado
                </h3>
                <p className="text-gray-500 dark:text-gray-300 mt-2 max-w-md mx-auto">
                  Crie um plano de aula para organizar as suas aulas por série ou módulo.
                </p>
                <button
                  onClick={() => {
                    setPlanoTemplate(null);
                    setShowPlaneamento(true);
                  }}
                  className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Criar Primeiro Plano
                </button>
              </div>
            )}
          </div>
}