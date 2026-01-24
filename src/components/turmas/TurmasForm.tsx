import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiSave, FiArrowLeft, FiUsers, FiBook, FiClock, FiUser, FiFileText, FiPaperclip } from 'react-icons/fi';
import { turmaService } from '../../services/database/turmas.ts';
import { Turma, TurmaFormData } from '../../types/turma.ts';
import { useAutoSave } from '../../hooks/useAutoSave.js';
import { Course } from '../../types/curso.ts';
import { cursosService } from '../../services/database/curso.ts';
import { SelectTyped } from '../students/StudentForm.tsx';
import { motion } from 'framer-motion';
import { instituicaoService } from '../../services/database/insitituicao.ts';

// Definição de tipo para opções do Select
interface SelectOption {
  value: string;
  label: string;
}

const TurmaForm = () => {
  const [cursos, setCursos] = useState<Course[]>([]);
  const [cursoSel, setCursoSel] = useState<Course>();
  const navigate = useNavigate();
  const { id } = useParams<string>();
  const isEditing = Boolean(id);
  const [loading, setLoading] = useState(false);
  
  const getStorageKey = (turma_id?: string) => 
    turma_id ? `edugestor_draft_${turma_id}` : 'edugestor_new_turma_draft';
  
  const storageKey = getStorageKey(id);
  

  // Dados iniciais - corrigido para usar curso_id
  const initialData: TurmaFormData = {
    nome_turma: '',
    ano_lectivo: '',
    curso_id: '',
    professor: '',
    capacidade_maxima: 0,
    turno: 'manhã',
    estado:"ativa",
    descricao:"",
    
  };

  const { 
    data: formData, 
    setData: setFormData, 
    clearDraft,
    hasUnsavedChanges 
  } = useAutoSave<TurmaFormData>(storageKey, initialData, 2000);

  const loadCursos = async () => {
    formData.ano_lectivo=await instituicaoService.getAnoLectivo()
    try {
      const res = await cursosService.getCourse();
      setCursos(res ?? []);
      setCursoSel(res[0])
      setFormData((prev: TurmaFormData) => ({ 
        ...prev, 
        "curso_id": res[0].id
      }));
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
    }
  };

  useEffect(() => {
    loadCursos();
    if (isEditing && id) {
      loadTurma();
    }
  }, [id]);

  const loadTurma = async () => {
    try {
      if (!id) return;
      const turma = await turmaService.findById(id||"");
      if (turma) {
        // Extrair apenas os dados do formulário
        const turmaFormData: TurmaFormData = {
          nome_turma: turma.nome_turma,
          ano_lectivo: turma.ano_lectivo,
          curso_id: turma.curso_id,
          professor: turma.professor,
          capacidade_maxima: turma.capacidade_maxima,
          turno: turma.turno,
          estado: turma.estado,
          descricao: turma.descricao
        };
        setFormData(turmaFormData);
      }
    } catch (error) {
      console.error('Erro ao carregar turma:', error);
    }
  };

  // Função para mudar valores normais
  const handleChange = (field: keyof TurmaFormData, value: string | number) => {
    setFormData((prev: TurmaFormData) => ({ ...prev, [field]: value }));
    
  };

  // Função específica para o Select - mantém a mesma estrutura que seu Select espera
  const handleSelectChange = (field: keyof TurmaFormData) => (value: string) => {
    if(field==="curso_id")
    {
      setCursoSel(cursos.find((curso)=> curso.id==formData.curso_id))
    }
    setFormData((prev: TurmaFormData) => ({ 
      ...prev, 
      [field]: value 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
   
      if (cursoSel&&cursoSel.vagas-(cursoSel.alunos||0)<0) {
          return
      }
      // Garantir que os dados estão no formato correto
      const turmaData: TurmaFormData = {
        nome_turma: formData.nome_turma || '',
        ano_lectivo: formData.ano_lectivo || '',
        curso_id: formData.curso_id || '',
        professor: formData.professor || '',
        capacidade_maxima: formData.capacidade_maxima || (cursoSel?cursoSel.vagas-(cursoSel.alunos||0):0),
        turno: formData.turno || 'manhã',
        estado: formData.estado || 'ativa',
        descricao: formData.descricao || ''
      };
     

      if (isEditing && id) {
        await turmaService.editTurma(id, turmaData);
      } else {
        await turmaService.createTurma(turmaData);
      }
      
      clearDraft();
      navigate('/turmas');
    } catch (error) {
      console.error('Erro ao salvar turma:', error);
      alert('Erro ao salvar turma. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        'Você tem alterações não salvas. Tem certeza de que deseja cancelar?'
      );
      if (!confirmLeave) return;
    }
    clearDraft();
    navigate('/turmas');
  };

  // Preparar opções para os Selects baseado nos seus dados
  const cursoOptions: SelectOption[] = cursos.map(curso => ({
    value: curso.id || '',
    label: curso.nome || 'Sem nome'
  }));

  const turnoOptions: SelectOption[] = [
    { value: 'manhã', label: 'Manhã' },
    { value: 'tarde', label: 'Tarde' },
    { value: 'noite', label: 'Noite' }
  ];

  // Encontrar o valor atual para o Select de cursos
  const selectedCursoValue = formData.curso_id || '';
  const selectedTurnoValue = formData.turno || 'manhã';



  return (
    <div className="min-h-screen rounded-2xl shadow-sm p-8 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-8">
          <div className='w-full'>
            <div className='flex flex-row-reverse justify-between items-center'>
              <button
                onClick={handleCancel}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
              >
                <FiArrowLeft size={20} />
                <span className="font-medium">Voltar para Turmas</span>
              </button>
              <h1 className="text-xl lg:text-2xl font-bold text-primary-600">
                {isEditing ? 'Editar Turma' : 'Nova Turma'}
              </h1>
            </div>
          </div>
        </div>
        {
          cursos.length>0?  <div className="">
          {/* Formulário */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-6 ">
             <div className='flex w-full gap-10'>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}  className="flex w-full flex-col gap-6">
                  {/* Nome da Turma */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Nome da Turma *
                    </label>
                    <div className="relative">
                      <FiBook className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={formData.nome_turma || ''}
                        onChange={(e) => handleChange('nome_turma', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        placeholder="Ex: Turma A, 1º Ano A"
                      />
                    </div>
                  </div>

                  {/* Ano Lectivo */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Ano Lectivo *
                    </label>
                    <div className="relative">
                      <FiClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={formData.ano_lectivo || ''}
                        onChange={(e) => handleChange('ano_lectivo', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        placeholder="Ex: 2024"
                      />
                    </div>
                  </div>

                  {/* Curso */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Curso *
                    </label>
                    <SelectTyped
                      vect={cursoOptions}
                      icon={FiFileText}
                      onChange={handleSelectChange('curso_id')}
                      value={selectedCursoValue}
                      placeholder="Selecione o curso"
                    />
                  </div>

                  {/* Turno */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Turno *
                    </label>
                    <SelectTyped
                      vect={turnoOptions}
                      icon={FiClock}
                      onChange={handleSelectChange('turno')}
                      value={selectedTurnoValue}
                    />
                  </div>

                  {/* Professor */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Professor *
                    </label>
                    <div className="relative">
                      <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={formData.professor || ''}
                        onChange={(e) => handleChange('professor', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        placeholder="Nome do professor"
                      />
                    </div>
                  </div>

                 
                </motion.div>
                 <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}  className="flex w-full flex-col gap-6">

                  {/* Turno */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Estado *
                    </label>
                    <SelectTyped
                      vect={["ativa","inativa","concluida"]}
                      icon={FiClock}
                      onChange={handleSelectChange('estado')}
                      value={selectedTurnoValue}
                    />
                  </div>

                   {/* Capacidade Máxima */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Capacidade Máxima *
                    </label>
                    <div className="relative">
                      <FiUsers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        required
                        min="1"
                        max={`${(cursoSel?.vagas||0)-(cursoSel?.alunos||0)}`}
                        disabled={!cursoSel}
                        value={formData.capacidade_maxima || 0}
                        onChange={(e) => handleChange('capacidade_maxima', parseInt(e.target.value))}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Professor */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Descricao *
                    </label>
                    <div className="relative">
                      <FiPaperclip className="absolute left-3 top-1/4 transform -translate-y-1/2 text-gray-400" />
                      <textarea
                        required
                        value={formData.descricao || ''}
                        rows={3}
                        onChange={(e) => handleChange('descricao', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        placeholder="A descrição da turma"
                      />
                    </div>
                  </div>

                 
                </motion.div>
             </div>

              {/* Botões */}
              <div className="justify-end  flex space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-3 w-min border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r text-nowrap  w-min justify-center from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 flex items-center space-x-2 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  <FiSave size={18} />
                  <span>{loading ? 'Salvando...' : isEditing ? 'Atualizar Turma' : 'Criar Turma'}</span>
                </button>
              </div>
            </form>
          </div>

      
        </div>
          :<motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          className='flex justify-center flex-col items-center h-96'>
               <div className='flex flex-col items-center w-96 text-center'>
                  <FiBook className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Adicione um curso para adicionar turmas</h3>
                  <p className="mt-1 text-wrap text-sm text-gray-500 dark:text-gray-400">
                    Ainda não possuis cursos pois cada turma neste sistema esta
                    vinculada a um curso, caso ja possua cursos 
                  </p>
                    <button className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 my-5 hover:to-indigo-800 text-white px-8 py-2 rounded-lg font-medium "
                    onClick={()=> navigate("cursos/novo")}>Adicionar um Curso</button>
               </div>
          </motion.div>
        }
      
      </div>
    </div>
  );
};

export default TurmaForm;