import { useEffect, useState } from "react";
import { FiSave, FiCalendar, FiFileText, FiPlus, FiEdit, FiTrash, FiX } from "react-icons/fi";
import { AcademyConfig } from "../../types/config";
import { configService } from "../../services/database/config";
import { motion } from "framer-motion";

export const ConfiguracoesAcademicas = () => {
  const [abaAtiva, setAbaAtiva] = useState<'avaliacoes' | 'geral'>('avaliacoes');
    const [salvando, setSalvando] = useState(false);
    const [salvoComSucesso, setSalvoComSucesso] = useState(false);
    const [config, setConfig] = useState<AcademyConfig>({
      tiposAvaliacao: [ 
        { id: 1, nome: 'Teste Escrito', notaMax: 20, cor: '#3B82F6' },
        { id: 2, nome: 'Participação', notaMax: 5, cor: '#10B981' },
        { id: 3, nome: 'Trabalho Prático', notaMax: 20, cor: '#F59E0B' }
      ],
      maxAlunosTurma: 45,
      maxFaltasPermitidas: 10,
      permitirMatriculas: true,
      horario: { hora_inicial: '08:00', hora_final: '17:00' },
      sistemaAvaliacao: { min_approval: 10, scale: 20 }
    });

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  async function salvarConfiguracoes() {
    // Implementar salvamento das configurações
    try {
       setSalvando(true);
         await configService.updateAcademyConfig(config);
        setTimeout(() => {
          setSalvando(false);
          setSalvoComSucesso(true);
        }, 1000);
    } catch (error) {
      setSalvoComSucesso(false);
    }

  }

  async function  carregarConfiguracoes() {
    const data= await configService.getAcademyConfig();
    setConfig(data);
  }

  // Estados para tipos de avaliação
  const [modalAberto, setModalAberto] = useState<'avaliacao' | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [formAvaliacao, setFormAvaliacao] = useState({
    nome: '',
    notaMax: 0,
    cor: '#3B82F6'
  });

  // Funções para avaliações
  const abrirModalAvaliacao = (id?: number) => {
    setModalAberto('avaliacao');
    setEditandoId(id || null);
    
    if (id) {
      const avaliacao:any = config.tiposAvaliacao.find((a:any) => a.id === id);
      if (avaliacao) setFormAvaliacao(avaliacao);
    } else {
      setFormAvaliacao({ nome: '', notaMax: 0, cor: '#3B82F6' });
    }
  };

  const salvarAvaliacao = () => {
    if (editandoId) {
      setConfig(prev => ({
        ...prev,
        tiposAvaliacao: prev.tiposAvaliacao.map((a:any) => 
          a.id === editandoId ? { ...formAvaliacao, id: editandoId } : a
        )
      }));
    } else {
      const novaAvaliacao = { ...formAvaliacao, id: Math.max(...config.tiposAvaliacao.map((a:any) => a.id)) + 1 };
      setConfig(prev => ({
        ...prev,
        tiposAvaliacao: [...prev.tiposAvaliacao, novaAvaliacao]
      }));
    }
    setModalAberto(null);
  };

  const excluirAvaliacao = (id: number) => {
     setConfig(prev => ({...prev, tiposAvaliacao: prev.tiposAvaliacao.filter((a:any) => a.id !== id) }));
  };

  return (
    <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Cabeçalho com Abas */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Configurações Acadêmicas</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Gerir tipos de avaliação e configurações do centro
            </p>
            {/* Aviso de salvamento */}
          {salvoComSucesso && (
            <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 rounded-lg">
              Configurações salvas com sucesso!
            </div>
          )}
              </div>
          
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setAbaAtiva('avaliacoes')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                abaAtiva === 'avaliacoes'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <FiFileText size={18} />
              Tipos de Avaliação
            </button>
            <button
              onClick={() => setAbaAtiva('geral')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                abaAtiva === 'geral'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <FiCalendar size={18} />
              Configurações Gerais
            </button>
          </nav>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-6">
          {/* ABA: TIPOS DE AVALIAÇÃO */}
          {abaAtiva === 'avaliacoes' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Tipos de Avaliação</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Configure os tipos de avaliação usados nas provas periódicas
                  </p>
                </div>
                <button 
                  onClick={() => abrirModalAvaliacao()}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                >
                  <FiPlus size={16} />
                  Novo Tipo
                </button>
              </div>
              {/* Lista de Tipos de Avaliação */}
              <div className="grid gap-4">
                { config.tiposAvaliacao.map((tipo:any) => (
                  <div key={tipo.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: tipo.cor }}
                      />
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{tipo.nome}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Nota Maxima: {tipo.notaMax} val</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => abrirModalAvaliacao(tipo.id)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      >
                        <FiEdit size={16}/>
                      </button>
                      <button 
                        onClick={() => excluirAvaliacao(tipo.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <FiTrash size={16}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA: CONFIGURAÇÕES GERAIS */}
          {abaAtiva === 'geral' && (
            <div className="space-y-6">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Configurações Gerais do Centro</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Máximo de Alunos por Turma
                  </label>
                  <input
                    type="number"
                    value={config.maxAlunosTurma}
                    onChange={(e) => setConfig(prev => ({ ...prev, maxAlunosTurma: parseInt(e.target.value) }))}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Máximo de Faltas Permitidas
                  </label>
                  <input
                    type="number"
                    value={config.maxFaltasPermitidas}
                    onChange={(e) => setConfig(prev => ({ ...prev, maxFaltasPermitidas: parseInt(e.target.value) }))}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="1"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Horário de Início
                  </label>
                  <input
                    type="time"
                    value={config.horario.hora_inicial}
                    onChange={(e) => setConfig(prev => ({ ...prev, horario: ({ ...prev.horario, hora_inicial: e.target.value }) }))}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Horário de Fim
                  </label>
                  <input
                    type="time"
                    value={config.horario.hora_final}
                    onChange={(e) => setConfig(prev => ({ ...prev, horario: ({ ...prev.horario, hora_final: e.target.value }) }))}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="permitirMatriculas"
                  checked={config.permitirMatriculas}
                  onChange={(e) => setConfig(prev => ({ ...prev, permitirMatriculas: e.target.checked }))}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
                />
                <label htmlFor="permitirMatriculas" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Permitir novas matrículas
                </label>
              </div>
            </div>
          )}

          {/* Botão Salvar (presente em todas as abas) */}
          <div className="flex justify-end mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button onClick={salvarConfiguracoes} 
            disabled={salvando} 
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
              <FiSave size={18} />
               {salvando ? 'Salvando...' : 'Salvar Configurações Financeiras'}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL AVALIAÇÃO */}
      {modalAberto === 'avaliacao' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-none sm:max-w-md h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                {editandoId ? 'Editar Tipo de Avaliação' : 'Novo Tipo de Avaliação'}
              </h3>
              <button onClick={() => setModalAberto(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <FiX size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome do tipo de avaliação
                </label>
                <input
                  type="text"
                  placeholder="Ex: Teste Escrito, Participação, Trabalho Prático..."
                  value={formAvaliacao.nome}
                  onChange={(e) => setFormAvaliacao(prev => ({...prev, nome: e.target.value}))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nota Maxima
                </label>
                <input
                  type="number"
                  placeholder="0-100"
                  value={formAvaliacao.notaMax}
                  onChange={(e) => setFormAvaliacao(prev => ({...prev, notaMax: parseInt(e.target.value) || 0}))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cor de identificação
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={formAvaliacao.cor}
                    onChange={(e) => setFormAvaliacao(prev => ({...prev, cor: e.target.value}))}
                    className="p-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 h-10 w-16"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {formAvaliacao.cor}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setModalAberto(null)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={salvarAvaliacao}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                {editandoId ? 'Atualizar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
