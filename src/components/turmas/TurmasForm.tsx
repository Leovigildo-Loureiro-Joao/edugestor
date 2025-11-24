import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiSave, FiArrowLeft, FiUsers, FiBook, FiClock, FiUser } from 'react-icons/fi';
import { turmaService } from '../../services/database/turmas.ts';
import { Select } from '../ui/Select.jsx';
import turmaImg from "../../assets/Choose-rafiki.svg";
import { Turma, TurmaFormData } from '../../types/turma.ts';
import { useAutoSave } from '../../hooks/useAutoSave.js';

const SelectTyped = Select as unknown as React.ComponentType<any>;

const getStorageKey = (turma_id?: string) => 
  turma_id ? `edugestor_draft_${turma_id}` : 'edugestor_new_turma_draft';

const TurmaForm = () => {
  const navigate = useNavigate();
  const { id } = useParams<string>();
  const isEditing = Boolean(id);
  const storageKey = getStorageKey(id);
  const initialData = {
    nome_turma: '',
    ano_lectivo: new Date().getFullYear().toString(),
    curso: 'Alfabetização',
    professor: '',
    capacidade_maxima: 30,
    turno: 'Manhã'
  };

   const { 
      data: formData, 
      setData: setFormData, 
      lastSave, 
      saveDraft, 
      clearDraft,
      hasUnsavedChanges 
    } = useAutoSave(storageKey, initialData, 2000);

 
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditing) {
      loadTurma();
    }
  }, [id]);

  const loadTurma = async () => {
    try {
      const turmas: Turma[] = (await turmaService.getTurmas()) ?? [];
      const turma = turmas.find(t => t.id === id);
      if (turma) {
        setFormData(turma);
      }
    } catch (error) {
      console.error('Erro ao carregar turma:', error);
    }
  };

  const handleSubmit = async (e:any) => {
    e.preventDefault();
    setLoading(true);
    clearDraft();
    try {
      if (isEditing) {
        await turmaService.editTurma(id||"", formData);
      } else {
        await turmaService.createTurma(formData);
      }
      navigate('/turmas');
    } catch (error) {
      console.error('Erro ao salvar turma:', error);
      //alert('Erro ao salvar turma. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field:any, value:any) => {
    setFormData((prev:TurmaFormData) => ({ ...prev, [field]: value }));
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
  }

  return (
    <div className="min-h-screen rounded-2xl shadow-sm p-8 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-8">
          <div className='w-full'>
           <div className='flex flex-row-reverse justify-between items-center'>
             <button
              onClick={() => navigate('/turmas')}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulário */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col gap-6">
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
                      value={formData.nome_turma}
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
                      value={formData.ano_lectivo}
                      onChange={(e) => handleChange('ano_lectivo', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Ex: 2024"
                    />
                  </div>
                {/* Curso */}
                <div className="space-y-2"  onClick={(e) => e.preventDefault()}>
                  <label className="block text-sm font-semibold text-gray-700">
                    Curso *
                  </label>
                  <SelectTyped
                    vect={['Alfabetização', 'Reforço', 'Iniciação','Caligrafia','Inglês']}
                    icon={FiBook}
                    onChange={(value:any) => handleChange('curso', value)}
                  />
                </div>
              
                {/* Turno */}
                <div className="space-y-2"  onClick={(e) => e.preventDefault()}>
                  <label className="block text-sm font-semibold text-gray-700">
                    Turno *
                  </label>
                  <SelectTyped
                    vect={['Manhã', 'Tarde', 'Noite']}
                    icon={FiClock}
                    onChange={(value:any) => handleChange('turno', value)}
                  />
                </div>
                  
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
                      value={formData.professor}
                      onChange={(e) => handleChange('professor', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Nome do professor"
                    />
                  </div>
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
                      max="50"
                      value={formData.capacidade_maxima}
                      onChange={(e) => handleChange('capacidade_maxima', parseInt(e.target.value))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="flex space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-3 w-full border border-gray-300 rounded-xl text-gray-700 hover:bg-white transition-all duration-200 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r w-full justify-center from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 flex items-center space-x-2 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  <FiSave size={18} />
                  <span>{loading ? 'Salvando...' : isEditing ? 'Atualizar Turma' : 'Criar Turma'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Ilustração e Informações */}
          <div className="flex flex-col  space-y-8">
            <img src={turmaImg} alt="" />
            <p className="text-gray-600 text-sm text-center relative -top-10 px-10">
            {isEditing ? 'Atualize os dados da turma' : 'Cadastre uma nova turma na instituição de modo a ter uma gestão mas flexivel'}
            </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default TurmaForm;