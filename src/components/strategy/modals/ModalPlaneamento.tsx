
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiX, 
  FiCalendar, 
  FiClock, 
  FiTarget,
  FiPlus,
  FiTrash2,
  FiSave,
  FiList,
  FiChevronRight,
  FiChevronLeft
} from 'react-icons/fi';
import { Horario, PlaneamentoDiario, DiaAtividades, PlaneamentoMensal, Semanas, PlaneamentoSemanalType } from '../../../types/planeamento';
import { profileService } from '../../../services/database/profileService';
;

type TipoPlaneamento = 'diario' | 'semanal' | 'mensal';
type DadosPlaneamento = 
  | Omit<PlaneamentoDiario,  'created_at' | 'updated_at' | 'sync_status' | 'tipo'>
  | Omit<PlaneamentoSemanalType, 'created_at' | 'updated_at' | 'sync_status' | 'tipo'>
  | Omit<PlaneamentoMensal,  'created_at' | 'updated_at' | 'sync_status' | 'tipo'>;

interface ModalPlaneamentoProps {
  isOpen: boolean;
  onClose: () => void;
  tipo: TipoPlaneamento;
  onSave: (dados: DadosPlaneamento) => void;
  planeamentoExistente?: PlaneamentoDiario | PlaneamentoSemanalType | PlaneamentoMensal | null|undefined;
  userNome: string;
}



export const ModalPlaneamento: React.FC<ModalPlaneamentoProps> = ({
  isOpen,
  onClose,
  tipo,
  onSave,
  planeamentoExistente,
  userNome
}) => {
  const [etapa, setEtapa] = useState<'basico' | 'conteudo'>('basico');
  
  
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [responsavel, setResponsavel] = useState('');
  
  
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [focos, setFocos] = useState<string[]>(['', '', '']);
  const [lembretes, setLembretes] = useState<string[]>([]);
  
  
  const [dias, setDias] = useState<DiaAtividades[]>([]);
  const [objetivosSemanais, setObjetivosSemanais] = useState<string[]>(['', '', '']);
  const [metasPrioritarias, setMetasPrioritarias] = useState<string[]>([]);
  
  
  const [semanas, setSemanas] = useState<Semanas[]>([]);
  const [metasMensais, setMetasMensais] = useState<string[]>(['', '', '', '']);
  
  
  const [tarefas_ids] = useState<string[]>([]);
  const [metas_ids] = useState<string[]>([]);

  
  useEffect(() => {
    if (isOpen) {
      setEtapa('basico');
      
      if (planeamentoExistente) {
        
        setTitulo(planeamentoExistente.titulo);
        setDescricao(planeamentoExistente.descricao || '');
        setDataInicio(planeamentoExistente.data_inicio);
        setDataFim(planeamentoExistente.data_fim);
        setResponsavel(planeamentoExistente.responsavel);
        
        
        switch(tipo) {
          case 'diario':
            const diario = planeamentoExistente as PlaneamentoDiario;
            setHorarios(diario.horarios);
            setFocos(diario.focos.length ? diario.focos : ['', '', '']);
            setLembretes(diario.lembretes || []);
            break;
          case 'semanal':
            const semanal = planeamentoExistente as PlaneamentoSemanalType;
            setDias(semanal.dias);
            setObjetivosSemanais(semanal.objetivos_semanais);
            setMetasPrioritarias(semanal.metas_prioritarias || []);
            break;
          case 'mensal':
            const mensal = planeamentoExistente as PlaneamentoMensal;
            setSemanas(mensal.semanas);
            setMetasMensais(mensal.metas_mensais);
            break;
        }
      } else {
        
        resetEstados();
      }
    }
  }, [isOpen, tipo, planeamentoExistente]);

  const resetEstados = () => {
    
      const tipoValido: TipoPlaneamento = tipo || 'diario'; 
    
    setTitulo(getTituloPadrao(tipoValido) || 'Novo Planejamento');
    setDescricao('');
    setDataInicio(getDataInicioPadrao(tipoValido) || new Date().toISOString().split('T')[0]);
    setDataFim(getDataFimPadrao(tipoValido) || new Date().toISOString().split('T')[0]);
    setResponsavel(userNome || 'Usuário');
    
    
    switch(tipoValido) {
      case 'diario':
        setHorarios(getHorariosPadrao());
        setFocos(['', '', '']);
        setLembretes([]);
        break;
      case 'semanal':
        setDias(gerarDiasDaSemana(getDataInicioPadrao(tipoValido)));
        setObjetivosSemanais(['', '', '']);
        setMetasPrioritarias([]);
        break;
      case 'mensal':
        const inicio = getDataInicioPadrao(tipoValido);
        const fim = getDataFimPadrao(tipoValido);
        setSemanas(gerarSemanasDoMes(inicio, fim));
        setMetasMensais(['', '', '', '']);
        break;
    }

  };

  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (etapa === 'basico') {
      setEtapa('conteudo');
      return;
    }
    
    
    let dados: DadosPlaneamento;
    const profile = await profileService.getLocalProfile();
    switch(tipo) {
      case 'diario':
        dados = {
          id: planeamentoExistente?.id || "",
          user_id: profile?.id || '',
          responsavel,
          titulo,
          descricao: descricao || undefined,
          data_inicio: dataInicio,
          data_fim: dataInicio, 
          status: 'rascunho',
          progresso: 0,
          horarios: horarios.filter(h => h.atividade.trim() !== ''),
          lembretes: lembretes.filter(l => l.trim() !== ''),
          focos: focos.filter(f => f.trim() !== ''),
          tarefas_ids,
          metas_ids: metas_ids.length > 0 ? metas_ids : undefined
        };
        break;
        
      case 'semanal':
        dados = {
          id: planeamentoExistente?.id || "",
          user_id: profile?.id || '',
          responsavel,
          titulo,
          descricao: descricao || undefined,
          data_inicio: dataInicio,
          data_fim: dataFim,
          status: 'rascunho',
          progresso: 0,
          dias: dias.map(d => ({
            ...d,
            atividades: d.atividades.filter(a => a.titulo.trim() !== '')
          })),
          objetivos_semanais: objetivosSemanais.filter(o => o.trim() !== ''),
          metas_prioritarias: metasPrioritarias.filter(m => m.trim() !== ''),
          tarefas_ids,
          metas_ids: metas_ids.length > 0 ? metas_ids : undefined
        };
        break;
        
      case 'mensal':
        dados = {
          id: planeamentoExistente?.id || "",
          user_id: profile?.id || '',
          responsavel,
          titulo,
          
          descricao: descricao || undefined,
          data_inicio: dataInicio,
          data_fim: dataFim,
          status: 'rascunho',
          progresso: 0,
          semanas: semanas.map(s => ({
            ...s,
            objetivos: (s.objetivos || []).filter(o => o.trim() !== '')
          })),
          metas_mensais: metasMensais.filter(m => m.trim() !== ''),
          kpis: [],
          tarefas_ids,
          metas_ids
          
        };
        break;
    }
    
    onSave(dados);
    onClose();
  };

  
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-none sm:max-w-6xl h-[90vh] sm:h-auto sm:max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header - IGUAL PARA TODOS */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FiCalendar className="h-6 w-6 text-white" />
                    <h2 className="text-lg sm:text-xl font-bold text-white">
                      {planeamentoExistente ? 'Editar' : 'Novo'} {getTituloModal(tipo)}
                    </h2>
                  </div>
                  <button onClick={onClose} className="p-2 hover:bg-blue-500 rounded-lg">
                    <FiX className="h-5 w-5 text-white" />
                  </button>
                </div>
                
                {/* Progresso */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-blue-100 mb-1">
                    <span>Passo {etapa === 'basico' ? '1/2' : '2/2'}</span>
                    <span>{etapa === 'basico' ? 'Informações' : getTituloConteudo(tipo)}</span>
                  </div>
                  <div className="w-full bg-blue-500/50 rounded-full h-2">
                    <div 
                      className="bg-white dark:bg-gray-800 h-2 rounded-full transition-all duration-300"
                      style={{ width: etapa === 'basico' ? '50%' : '100%' }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Conteúdo - SWITCH por tipo */}
              <form onSubmit={handleSubmit}>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                  {etapa === 'basico' ? (
                    <ConteudoBasico 
                      titulo={titulo}
                      setTitulo={setTitulo}
                      descricao={descricao}
                      setDescricao={setDescricao}
                      dataInicio={dataInicio}
                      setDataInicio={setDataInicio}
                      dataFim={dataFim}
                      setDataFim={setDataFim}
                      responsavel={responsavel}
                      setResponsavel={setResponsavel}
                      tipo={tipo}
                    />
                  ) : (
                    <>
                      {tipo === 'diario' && (
                        <ConteudoDiario 
                          horarios={horarios}
                          setHorarios={setHorarios}
                          focos={focos}
                          setFocos={setFocos}
                          lembretes={lembretes}
                          setLembretes={setLembretes}
                        />
                      )}
                      {tipo === 'semanal' && (
                        <ConteudoSemanal 
                          dias={dias}
                          setDias={setDias}
                          objetivosSemanais={objetivosSemanais}
                          setObjetivosSemanais={setObjetivosSemanais}
                          metasPrioritarias={metasPrioritarias}
                          setMetasPrioritarias={setMetasPrioritarias}
                          dataInicio={dataInicio}
                        />
                      )}
                      {tipo === 'mensal' && (
                        <ConteudoMensal 
                          semanas={semanas}
                          setSemanas={setSemanas}
                          metasMensais={metasMensais}
                          setMetasMensais={setMetasMensais}
                          dataInicio={dataInicio}
                          dataFim={dataFim}
                        />
                      )}
                    </>
                  )}
                </div>
                
                {/* Footer - IGUAL PARA TODOS */}
                <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t flex justify-between">
                  {etapa === 'conteudo' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setEtapa('basico')}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                      >
                        <FiChevronLeft className="mr-1" /> Voltar
                      </button>
                      <div className="flex space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center"
                        >
                          <FiSave className="mr-2" />
                          {planeamentoExistente ? 'Atualizar' : 'Salvar'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div></div>
                      <div className="flex space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center"
                        >
                          Continuar
                          <FiChevronRight className="ml-2" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};


interface ConteudoBasicoProps {
  titulo: string;
  setTitulo: (v: string) => void;
  descricao: string;
  setDescricao: (v: string) => void;
  dataInicio: string;
  setDataInicio: (v: string) => void;
  dataFim: string;
  setDataFim: (v: string) => void;
  responsavel: string;
  setResponsavel: (v: string) => void;
  tipo: TipoPlaneamento;
}

const ConteudoBasico: React.FC<ConteudoBasicoProps> = ({
  titulo, setTitulo,
  descricao, setDescricao,
  dataInicio, setDataInicio,
  dataFim, setDataFim,
  responsavel, setResponsavel,
  tipo
}) => (
  <div className="space-y-6">
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Título do Planejamento
      </label>
      <input
        type="text"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
        placeholder="Ex: Planejamento de Aulas"
        required
      />
    </div>
    
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Descrição (opcional)
      </label>
      <textarea
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 h-24"
        placeholder="Descreva os objetivos principais..."
      />
    </div>
    
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Data Início
        </label>
        <input
          type="date"
          value={dataInicio}
          onChange={(e) => {
            setDataInicio(e.target.value);
            if (tipo === 'diario') setDataFim(e.target.value);
          }}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Data Fim
        </label>
        <input
          type="date"
          value={dataFim}
          onChange={(e) => setDataFim(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
          disabled={tipo === 'diario'}
          required
        />
      </div>
    </div>
    
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Responsável
      </label>
      <input
        type="text"
        value={responsavel}
        onChange={(e) => setResponsavel(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
        required
      />
    </div>
  </div>
);


interface ConteudoDiarioProps {
  horarios: Horario[];
  setHorarios: (h: Horario[]) => void;
  focos: string[];
  setFocos: (f: string[]) => void;
  lembretes: string[];
  setLembretes: (l: string[]) => void;
}

const ConteudoDiario: React.FC<ConteudoDiarioProps> = ({
  horarios, setHorarios,
  focos, setFocos,
  lembretes, setLembretes
}) => {
  const addHorario = () => {
    setHorarios([...horarios, { hora: '08:00', atividade: '', descricao: '', concluido: false }]);
  };
  
  const updateHorario = (index: number, campo: keyof Horario, valor: any) => {
    const novos = [...horarios];
    novos[index] = { ...novos[index], [campo]: valor };
    setHorarios(novos);
  };
  
  const removeHorario = (index: number) => {
    if (horarios.length > 1) {
      setHorarios(horarios.filter((_, i) => i !== index));
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Focos Principais */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Focos Principais do Dia (máx 3)
        </label>
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <input
              key={index}
              type="text"
              value={focos[index] || ''}
              onChange={(e) => {
                const novos = [...focos];
                novos[index] = e.target.value;
                setFocos(novos);
              }}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder={`Foco principal ${index + 1}`}
            />
          ))}
        </div>
      </div>
      
      {/* Agenda */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Agenda do Dia
          </label>
          <button
            type="button"
            onClick={addHorario}
            className="flex items-center text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200"
          >
            <FiPlus className="mr-1" /> Adicionar Horário
          </button>
        </div>
        
        <div className="space-y-3">
          {horarios.map((horario, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <input
                type="time"
                value={horario.hora}
                onChange={(e) => updateHorario(index, 'hora', e.target.value)}
                className="w-28 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
              />
              <input
                type="text"
                value={horario.atividade}
                onChange={(e) => updateHorario(index, 'atividade', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
                placeholder="Atividade"
              />
              <input
                type="text"
                value={horario.descricao || ''}
                onChange={(e) => updateHorario(index, 'descricao', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
                placeholder="Descrição"
              />
              {horarios.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeHorario(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <FiTrash2 />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Lembretes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Lembretes Importantes
        </label>
        <textarea
          value={lembretes.join('\n')}
          onChange={(e) => setLembretes(e.target.value.split('\n').filter(l => l.trim() !== ''))}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 h-24"
          placeholder="Adicione lembretes, um por linha..."
        />
      </div>
    </div>
  );
};


interface ConteudoSemanalProps {
  dias: DiaAtividades[];
  setDias: (d: DiaAtividades[]) => void;
  objetivosSemanais: string[];
  setObjetivosSemanais: (o: string[]) => void;
  metasPrioritarias: string[];
  setMetasPrioritarias: (m: string[]) => void;
  dataInicio: string;
}

const ConteudoSemanal: React.FC<ConteudoSemanalProps> = ({
  dias, setDias,
  objetivosSemanais, setObjetivosSemanais,
  metasPrioritarias, setMetasPrioritarias,
  dataInicio
}) => {
  const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  
  useEffect(() => {
    if (dias.length === 0) {
      setDias(gerarDiasDaSemana(dataInicio));
    }
  }, [dataInicio]);
  
  const addAtividade = (diaIndex: number) => {
    const novos = [...dias];
    novos[diaIndex].atividades.push({ 
      hora: '08:00', 
      titulo: '', 
      tipo: 'aula' 
    });
    setDias(novos);
  };
  
  return (
    <div className="space-y-6">
      {/* Objetivos da Semana */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Objetivos da Semana
        </label>
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <input
              key={index}
              type="text"
              value={objetivosSemanais[index] || ''}
              onChange={(e) => {
                const novos = [...objetivosSemanais];
                novos[index] = e.target.value;
                setObjetivosSemanais(novos);
              }}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder={`Objetivo ${index + 1}`}
            />
          ))}
        </div>
      </div>
      
      {/* Metas Prioritárias */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Metas Prioritárias
          </label>
          {metasPrioritarias.length < 5 && (
            <button
              type="button"
              onClick={() => setMetasPrioritarias([...metasPrioritarias, ''])}
              className="flex items-center text-sm bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-200"
            >
              <FiPlus className="mr-1" /> Adicionar Meta
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          {metasPrioritarias.map((meta, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={meta}
                onChange={(e) => {
                  const novas = [...metasPrioritarias];
                  novas[index] = e.target.value;
                  setMetasPrioritarias(novas);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                placeholder={`Meta prioritária ${index + 1}`}
              />
              <button
                type="button"
                onClick={() => setMetasPrioritarias(metasPrioritarias.filter((_, i) => i !== index))}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>
      </div>
      
      {/* Atividades por Dia */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Atividades da Semana</h4>
        <div className="space-y-4">
          {dias.map((dia, diaIndex) => (
            <div key={diaIndex} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h5 className="font-semibold text-gray-800 dark:text-gray-100">{diasSemana[diaIndex]}</h5>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(dia.data).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => addAtividade(diaIndex)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <FiPlus className="mr-1" /> Atividade
                </button>
              </div>
              
              {/* Renderizar atividades... (manter igual) */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


interface ConteudoMensalProps {
  semanas: Semanas[];
  setSemanas: (s: Semanas[]) => void;
  metasMensais: string[];
  setMetasMensais: (m: string[]) => void;
  dataInicio: string;
  dataFim: string;
}

const ConteudoMensal: React.FC<ConteudoMensalProps> = ({
  semanas, setSemanas,
  metasMensais, setMetasMensais,
  dataInicio, dataFim
}) => {
  useEffect(() => {
    if (semanas.length === 0) {
      setSemanas(gerarSemanasDoMes(dataInicio, dataFim));
    }
  }, [dataInicio, dataFim]);
  
  return (
    <div className="space-y-6">
      {/* Metas do Mês */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Metas do Mês
          </label>
          {metasMensais.length < 6 && (
            <button
              type="button"
              onClick={() => setMetasMensais([...metasMensais, ''])}
              className="flex items-center text-sm bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-200"
            >
              <FiPlus className="mr-1" /> Adicionar Meta
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          {metasMensais.map((meta, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={meta}
                onChange={(e) => {
                  const novas = [...metasMensais];
                  novas[index] = e.target.value;
                  setMetasMensais(novas);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                placeholder={`Meta ${index + 1}`}
              />
              {metasMensais.length > 1 && (
                <button
                  type="button"
                  onClick={() => setMetasMensais(metasMensais.filter((_, i) => i !== index))}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <FiTrash2 />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Planejamento por Semana */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Planejamento Semanal</h4>
        <div className="space-y-4">
          {semanas.map((semana, index) => (
            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-semibold text-gray-800 dark:text-gray-100">
                  Semana {semana.numero}
                </h5>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(semana.data_inicio).getDate()}/{new Date(semana.data_inicio).getMonth() + 1} - {new Date(semana.data_fim).getDate()}/{new Date(semana.data_fim).getMonth() + 1}
                </span>
              </div>
              
              {(semana.objetivos || ['']).map((obj, objIndex) => (
                <input
                  key={objIndex}
                  type="text"
                  value={obj || ''}
                  onChange={(e) => {
                    const novas = [...semanas];
                    if (!novas[index].objetivos) novas[index].objetivos = [];
                    novas[index].objetivos[objIndex] = e.target.value;
                    setSemanas(novas);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm mb-2"
                  placeholder={`Objetivo da semana ${semana.numero}`}
                />
              ))}
              
              {(semana.objetivos?.length || 0) < 3 && (
                <button
                  type="button"
                  onClick={() => {
                    const novas = [...semanas];
                    if (!novas[index].objetivos) novas[index].objetivos = [];
                    novas[index].objetivos.push('');
                    setSemanas(novas);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center mt-2"
                >
                  <FiPlus className="mr-1" /> Adicionar objetivo
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


function getTituloModal(tipo: TipoPlaneamento): string {
  const map = { diario: 'Diário', semanal: 'Semanal', mensal: 'Mensal' };
  return `Planejamento ${map[tipo]}`;
}

function getTituloConteudo(tipo: TipoPlaneamento): string {
  const map = { 
    diario: 'Agenda do Dia', 
    semanal: 'Atividades da Semana', 
    mensal: 'Metas e Semanas' 
  };
  return map[tipo];
}


function getTituloPadrao(tipo: TipoPlaneamento): string {
  const hoje = new Date();
  switch(tipo) {
    case 'diario':
      return `Planejamento Diário - ${hoje.toLocaleDateString('pt-BR')}`;
    case 'semanal':
      return `Planejamento Semanal - ${hoje.toLocaleDateString('pt-BR', { month: 'long' })}`;
    case 'mensal':
      return `Planejamento Mensal - ${hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
    default:
      return `Novo Planejamento`; 
  }
}

function getDataInicioPadrao(tipo: TipoPlaneamento): string {
  const hoje = new Date();
  try {
    switch(tipo) {
      case 'diario':
        return hoje.toISOString().split('T')[0];
      case 'semanal':
        const dia = hoje.getDay();
        const diff = dia === 0 ? 6 : dia - 1;
        const segunda = new Date(hoje);
        segunda.setDate(hoje.getDate() - diff);
        return segunda.toISOString().split('T')[0];
      case 'mensal':
        const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        return primeiroDia.toISOString().split('T')[0];
      default:
        return hoje.toISOString().split('T')[0]; 
    }
  } catch (error) {
    console.error('Erro ao gerar data:', error);
    return new Date().toISOString().split('T')[0]; 
  }
}

function getDataFimPadrao(tipo: TipoPlaneamento): string {
  const hoje = new Date();
  try {
    switch(tipo) {
      case 'diario':
        return hoje.toISOString().split('T')[0];
      case 'semanal':
        const inicio = getDataInicioPadrao('semanal');
        const data = new Date(inicio);
        data.setDate(data.getDate() + 6);
        return data.toISOString().split('T')[0];
      case 'mensal':
        const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        return ultimoDia.toISOString().split('T')[0];
      default:
        return hoje.toISOString().split('T')[0]; 
    }
  } catch (error) {
    console.error('Erro ao gerar data fim:', error);
    return new Date().toISOString().split('T')[0]; 
  }
}

function getHorariosPadrao(): Horario[] {
  return [
    { hora: '08:00', atividade: '', descricao: '', concluido: false },
    { hora: '10:00', atividade: '', descricao: '', concluido: false },
    { hora: '14:00', atividade: '', descricao: '', concluido: false }
  ];
}

function gerarDiasDaSemana(dataInicio: string): DiaAtividades[] {
  const dias: DiaAtividades[] = [];
  const nomes: ('segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo')[] = [
    'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'
  ];
  
  const data = new Date(dataInicio);
  
  for (let i = 0; i < 7; i++) {
    const dataDia = new Date(data);
    dataDia.setDate(data.getDate() + i);
    dias.push({
      dia: nomes[i],
      data: dataDia.toISOString().split('T')[0],
      atividades: []
    });
  }
  
  return dias;
}

function gerarSemanasDoMes(dataInicio: string, dataFim: string): Semanas[] {
  const semanas: Semanas[] = [];
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  
  let semanaAtual = 1;
  let dataInicioSemana = new Date(inicio);
  
  const diaSemana = dataInicioSemana.getDay();
  if (diaSemana !== 1) {
    const diff = diaSemana === 0 ? 6 : diaSemana - 1;
    dataInicioSemana.setDate(dataInicioSemana.getDate() - diff);
  }
  
  while (dataInicioSemana <= fim && semanaAtual <= 6) {
    const dataFimSemana = new Date(dataInicioSemana);
    dataFimSemana.setDate(dataInicioSemana.getDate() + 6);
    
    semanas.push({
      numero: semanaAtual,
      data_inicio: dataInicioSemana.toISOString().split('T')[0],
      data_fim: (dataFimSemana > fim ? fim : dataFimSemana).toISOString().split('T')[0],
      objetivos: []
    });
    
    semanaAtual++;
    dataInicioSemana.setDate(dataInicioSemana.getDate() + 7);
  }
  
  return semanas;
}

export default ModalPlaneamento;
