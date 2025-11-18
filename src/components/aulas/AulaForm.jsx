import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiBook, FiCalendar, FiClock, FiUsers, FiX } from 'react-icons/fi';

export const AulaForm = ({ aula, onSubmit, onCancel, loading = false }) => {
  const [formData, setFormData] = useState({
    turma_id: '',
    disciplina: '',
    data_aula: '',
    hora_inicio: '',
    hora_fim: '',
    conteudo_ministrado: '',
    tema_aula: ''
  });

  // Preencher form se estiver editando
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const isEditing = !!aula;
  const title = isEditing ? 'Editar Aula' : 'Nova Aula';

  return (
    <motion.form
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onSubmit={handleSubmit}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiX className="h-5 w-5" />
        </button>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Coluna Esquerda */}
          <div className="space-y-4">
            {/* Turma */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Turma *
              </label>
              <div className="relative">
                <FiUsers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <select
                  name="turma_id"
                  value={formData.turma_id}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
                >
                  <option value="">Selecione a turma</option>
                  <option value="10A">10ª Classe - Turma A</option>
                  <option value="10B">10ª Classe - Turma B</option>
                  <option value="11A">11ª Classe - Turma A</option>
                  <option value="11B">11ª Classe - Turma B</option>
                  <option value="12A">12ª Classe - Turma A</option>
                  <option value="12B">12ª Classe - Turma B</option>
                </select>
              </div>
            </div>

            {/* Disciplina */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Disciplina *
              </label>
              <div className="relative">
                <FiBook className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <select
                  name="disciplina"
                  value={formData.disciplina}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
                >
                  <option value="">Selecione a disciplina</option>
                  <option value="Matemática">Matemática</option>
                  <option value="Português">Português</option>
                  <option value="Física">Física</option>
                  <option value="Química">Química</option>
                  <option value="Biologia">Biologia</option>
                  <option value="História">História</option>
                  <option value="Geografia">Geografia</option>
                  <option value="Inglês">Inglês</option>
                  <option value="Educação Física">Educação Física</option>
                </select>
              </div>
            </div>

            {/* Data da Aula */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data da Aula *
              </label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <input
                  type="date"
                  name="data_aula"
                  value={formData.data_aula}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Coluna Direita */}
          <div className="space-y-4">
            {/* Hora Início */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora de Início *
              </label>
              <div className="relative">
                <FiClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <input
                  type="time"
                  name="hora_inicio"
                  value={formData.hora_inicio}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Hora Fim */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora de Término *
              </label>
              <div className="relative">
                <FiClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <input
                  type="time"
                  name="hora_fim"
                  value={formData.hora_fim}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Tema da Aula */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tema da Aula
              </label>
              <input
                type="text"
                name="tema_aula"
                value={formData.tema_aula}
                onChange={handleChange}
                placeholder="Ex: Equações do 2º grau"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Conteúdo Ministrado */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Conteúdo Ministrado
          </label>
          <textarea
            name="conteudo_ministrado"
            value={formData.conteudo_ministrado}
            onChange={handleChange}
            rows={4}
            placeholder="Descreva o conteúdo que foi ministrado nesta aula..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-4 p-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Salvando...' : (isEditing ? 'Atualizar Aula' : 'Criar Aula')}
        </button>
      </div>
    </motion.form>
  );
};