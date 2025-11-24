import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiBook, FiCalendar, FiClock, FiUsers, FiX } from 'react-icons/fi';
import { Select } from '../ui/Select';
import { turmaService } from '../../services/database/turmas';

export const AulaForm = ({ aula, turmas, disciplinas, onSubmit, onCancel, loading = false }) => {
  const [formData, setFormData] = useState({
    turma_id: '',
    disciplina: '',
    data_aula: '',
    hora_inicio: '',
    hora_fim: '',
    conteudo_ministrado: '',
    tema_aula: ''
  });

  useEffect(() => {
    if (aula) {
      setFormData({
        turma_id: aula.turma_id || '',
        disciplina: aula.disciplina || '',
        data_aula: aula.data_aula || '',
        hora_inicio: aula.hora_inicio || '',
        hora_fim: aula.hora_fim || '',
        conteudo_ministrado: aula.conteudo_ministrado || '',
        tema_aula: aula.tema_aula || ''
      });
    }
  }, [aula]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = async (field, value) => {
  if (field == "turma_id") {
    try {
      const turmaId = await turmaService.getId(value);
      setFormData(prev => ({
        ...prev,
        [field]: turmaId[0].id
      }));
    } catch (error) {
      console.error('Erro ao buscar ID da turma:', error);
    }
  } else {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }
};

  const isEditing = !!aula;
  const title = isEditing ? 'Editar Aula' : 'Nova Aula';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto max-h-[55vh] p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coluna Esquerda */}
            <div className="space-y-4">
              {/* Turma */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Turma *
                </label>
                <Select
                  vect={turmas}
                  icon={FiUsers}
                  onChange={(value) => handleChange('turma_id', value)}
                />
              </div>

              {/* Disciplina */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Disciplina *
                </label>
                <Select
                  vect={disciplinas}
                  icon={FiBook}
                  onChange={(value) => handleChange('disciplina', value)}
                />
              </div>

              {/* Data da Aula */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Data da Aula *
                </label>
                <div className="relative">
                  <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={formData.data_aula}
                    onChange={(e) => handleChange('data_aula', e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Coluna Direita */}
            <div className="space-y-4">
              {/* Hora Início */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Hora de Início *
                </label>
                <div className="relative">
                  <FiClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) => handleChange('hora_inicio', e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Hora Fim */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Hora de Término *
                </label>
                <div className="relative">
                  <FiClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="time"
                    value={formData.hora_fim}
                    onChange={(e) => handleChange('hora_fim', e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Tema da Aula */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Tema da Aula
                </label>
                <input
                  type="text"
                  value={formData.tema_aula}
                  onChange={(e) => handleChange('tema_aula', e.target.value)}
                  placeholder="Ex: Equações do 2º grau"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Conteúdo Ministrado */}
          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Conteúdo Ministrado
            </label>
            <textarea
              value={formData.conteudo_ministrado}
              onChange={(e) => handleChange('conteudo_ministrado', e.target.value)}
              rows={4}
              placeholder="Descreva o conteúdo que foi ministrado nesta aula..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none transition-all duration-200"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-4 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-white transition-all duration-200 font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : (isEditing ? 'Atualizar Aula' : 'Criar Aula')}
          </button>
        </div>
      </form>
    </motion.div>
  );
};