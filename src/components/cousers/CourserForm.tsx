// src/pages/Courses/CourseForm.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiSave, FiArrowLeft, FiPlus, FiX, FiBook, FiClock, FiDollarSign, FiUsers } from 'react-icons/fi';
import { Select } from '../../components/ui/Select';
import { CourseFormData } from '../../types/curso';
import { cursosService } from '../../services/database';
import { SelectTyped } from '../students/StudentForm';
import { instituicaoIdValue } from '../../utils/getInsitituicaoID';
import { useConfirmModal } from '../ui/ComfirmModal';
import { useAlert } from '../ui/AlertBadge';



export const CourseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const { confirm, ModalComponent } = useConfirmModal();
  const { showAlert } = useAlert(); 
  const [loading, setLoading] = useState(false);
  const [novaDisciplina, setNovaDisciplina] = useState('');
  const [formData, setFormData] = useState<CourseFormData>({
    nome: '',
    preco: 0,
    duracao: '3 meses',
    disciplinas: [],
    vagas: 20,
    descricao: '',
    ativo: true,
    instituicao_id:instituicaoIdValue()||""
  });

  // Disciplinas pré-definidas disponíveis
  const disciplinasDisponiveis = [
    'Matemática', 'Português', 'Física', 'Química', 'Biologia',
    'História', 'Geografia', 'Inglês', 'Francês', 'Filosofia',
    'Educação Física', 'Artes', 'Informática','Caligrafia'
  ];

  const duracaoOptions = ['1 mês', '2 meses', '3 meses', '6 meses', '1 ano'];

  useEffect(() => {
    if (isEditing) {
      loadCourseData();
    }
  }, [id]);

  const loadCourseData = async () => {
    try {

      const courseData = await cursosService.getCoursesId(id||"");
      setFormData(courseData as CourseFormData);  
       console.log(courseData)
    } catch (error) {
      
      console.error('Erro ao carregar curso:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isEditing) {;
        showAlert({
          title:"Operação concluída",
          type:"success",
          duration:3000,
          message:"Curso atualizado com sucesso"
        })
        console.log('Curso atualizado:', formData);
        cursosService.updateCourse(id||"",formData)
      } else {
         showAlert({
          title:"Operação concluída",
          type:"success",
          duration:3000,
          message:"Curso criado com sucesso"
        })
        console.log('Curso criado:', formData);
        cursosService.create(formData)
      }
      
      navigate('/cursos');
    } catch (error) {
      showAlert({
          title:"Erro ao salvar",
          type:"error",
          duration:5000,
          message:"Não foi possivel efectuar a operação"
        })
      console.error('Erro ao salvar curso:', error);
    } finally {
      setLoading(false);
    }
  };

  const adicionarDisciplina = () => {
   
    if (novaDisciplina.trim() && !formData.disciplinas.includes(novaDisciplina.trim())) {
      setFormData(prev => ({
        ...prev,
        disciplinas: [...prev.disciplinas, novaDisciplina.trim()]
      }));
      setNovaDisciplina('');
    }
  };

  const removerDisciplina = (disciplina: string) => {
    setFormData(prev => ({
      ...prev,
      disciplinas: prev.disciplinas.filter(d => d !== disciplina)
    }));
  };

  const adicionarDisciplinaPredefinida = (disciplina: string) => {
    if (!formData.disciplinas.includes(disciplina)) {
      setFormData(prev => ({
        ...prev,
        disciplinas: [...prev.disciplinas, disciplina]
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/cursos')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <FiArrowLeft size={20} />
            Voltar para Cursos
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {isEditing ? 'Editar Curso' : 'Novo Curso'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {isEditing ? 'Atualize as informações do curso' : 'Preencha as informações para criar um novo curso'}
              </p>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              
              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome do Curso *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ex: Reforço 10ª A - Completo"
                  />
                </div>

               

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preço (AOA) *
                  </label>
                  <div className="relative">
                    <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      required
                      min="0"
                      step="100"
                      value={formData.preco}
                      onChange={(e) => setFormData(prev => ({ ...prev, preco: Number(e.target.value) }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Duração *
                  </label>
                  <SelectTyped
                    vect={duracaoOptions}
                    value={formData.duracao}
                    onChange={(value: string) => setFormData(prev => ({ ...prev, duracao: value }))}
                    icon={FiClock}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Vagas *
                  </label>
                  <div className="relative">
                    <FiUsers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      required
                      min="1"
                      max="100"
                      value={formData.vagas}
                      onChange={(e) => setFormData(prev => ({ ...prev, vagas: Number(e.target.value) }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Número de vagas"
                    />
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descrição do Curso
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  rows={4}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Descreva o objetivo e conteúdo do curso..."
                />
              </div>

              {/* Disciplinas */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Disciplinas do Curso *
                </label>

                {/* Adicionar disciplina manualmente */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={novaDisciplina}
                    onChange={(e) => setNovaDisciplina(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarDisciplina())}
                    className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Digite o nome de uma disciplina"
                  />
                  <button
                    type="button"
                    onClick={adicionarDisciplina}
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <FiPlus size={16} />
                    Adicionar
                  </button>
                </div>

                {/* Disciplinas pré-definidas */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Disciplinas disponíveis:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {disciplinasDisponiveis.map(disciplina => (
                      <button
                        key={disciplina}
                        type="button"
                        onClick={() => adicionarDisciplinaPredefinida(disciplina)}
                        disabled={formData.disciplinas.includes(disciplina)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          formData.disciplinas.includes(disciplina)
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900 dark:hover:text-blue-300'
                        }`}
                      >
                        {disciplina}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lista de disciplinas selecionadas */}
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Disciplinas selecionadas ({formData.disciplinas.length}):
                  </p>
                  {formData.disciplinas.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                      Nenhuma disciplina selecionada
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {
                        
                      formData.disciplinas.map(disciplina => (
                        <span
                          key={disciplina}
                          className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-3 py-2 rounded-lg text-sm font-medium"
                        >
                          <FiBook size={14} />
                          {disciplina}
                          <button
                            type="button"
                            onClick={() => removerDisciplina(disciplina)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                          >
                            <FiX size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <label htmlFor="ativo" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Curso ativo
                </label>
              </div>
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-4 pt-6">
              <button
                type="button"
                onClick={() => navigate('/cursos')}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !formData.nome || !formData.preco || formData.vagas<0 ||formData.disciplinas.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSave size={18} />
                {loading ? 'Salvando...' : (isEditing ? 'Atualizar Curso' : 'Criar Curso')}
              </button>
            </div>
          </form>
        </motion.div>
        <ModalComponent/>
      </div>
    </div>
  );
};

export default CourseForm;
