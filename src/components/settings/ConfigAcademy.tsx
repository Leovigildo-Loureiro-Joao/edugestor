import { useState } from "react";
import { FiSave, FiBook, FiClock, FiFileText, FiCalendar } from "react-icons/fi";
import { Select } from "../ui/Select";

export const ConfiguracoesAcademicas = () => {
  const [abaAtiva, setAbaAtiva] = useState<'disciplinas' | 'horarios' | 'avaliacoes'>('disciplinas');
  const [config, setConfig] = useState({
    periodoLetivo: 'manha',
    maxAlunosTurma: 30,
    permitirMatriculas: true,
    diasAula: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
    horaInicio: '08:00',
    horaFim: '17:00'
  });

  // Dados mock para demonstração
  const [disciplinas, setDisciplinas] = useState([
    { id: 1, nome: 'Matemática', cargaHoraria: 20, professor: 'Arão', cor: '#3B82F6', ativa: true },
    { id: 2, nome: 'Português', cargaHoraria: 18, professor: 'Ana', cor: '#EF4444', ativa: true },
    { id: 3, nome: 'História', cargaHoraria: 15, professor: 'Arão', cor: '#10B981', ativa: true }
  ]);

  const [horarios, setHorarios] = useState([
    { id: 1, turma: 'ALPHA', disciplina: 'Matemática', dia: 'segunda', horaInicio: '08:00', horaFim: '09:30', sala: 'Sala 2' },
    { id: 2, turma: 'ALPHA', disciplina: 'Português', dia: 'segunda', horaInicio: '10:00', horaFim: '11:30', sala: 'Sala 2' }
  ]);

  const [tiposAvaliacao, setTiposAvaliacao] = useState([
    { id: 1, nome: 'Teste', peso: 40, cor: '#3B82F6' },
    { id: 2, nome: 'Trabalho Prático', peso: 30, cor: '#10B981' },
    { id: 3, nome: 'Participação', peso: 30, cor: '#F59E0B' }
  ]);

  const [novaDisciplina, setNovaDisciplina] = useState({
    nome: '',
    cargaHoraria: 0,
    professor: '',
    cor: '#3B82F6'
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Cabeçalho com Abas */}
      <div className="border-b border-gray-200">
        <div className="px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Configurações Acadêmicas</h2>
          <p className="text-sm text-gray-600 mt-1">
            Gerir disciplinas, horários e configurações de avaliação
          </p>
        </div>
        
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'disciplinas', label: 'Disciplinas', icon: FiBook },
            { id: 'horarios', label: 'Horários', icon: FiClock },
            { id: 'avaliacoes', label: 'Tipos de Avaliação', icon: FiFileText }
          ].map(aba => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id as any)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                abaAtiva === aba.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <aba.icon size={18} />
              {aba.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Conteúdo das Abas */}
      <div className="p-6">
        {/* ABA: DISCIPLINAS */}
        {abaAtiva === 'disciplinas' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Disciplinas Cadastradas</h3>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
                + Nova Disciplina
              </button>
            </div>

            {/* Lista de Disciplinas */}
            <div className="grid gap-4">
              {disciplinas.map(disciplina => (
                <div key={disciplina.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: disciplina.cor }}
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">{disciplina.nome}</h4>
                      <p className="text-sm text-gray-600">
                        {disciplina.cargaHoraria}h • Prof. {disciplina.professor}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      disciplina.ativa 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {disciplina.ativa ? 'Ativa' : 'Inativa'}
                    </span>
                    <button className="text-gray-400 hover:text-gray-600">
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Formulário para Nova Disciplina */}
            <div className="border-t pt-6 mt-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Adicionar Nova Disciplina</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nome da disciplina"
                  value={novaDisciplina.nome}
                  onChange={(e) => setNovaDisciplina(prev => ({...prev, nome: e.target.value}))}
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Carga horária (horas)"
                  value={novaDisciplina.cargaHoraria}
                  onChange={(e) => setNovaDisciplina(prev => ({...prev, cargaHoraria: parseInt(e.target.value)}))}
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Professor responsável"
                  value={novaDisciplina.professor}
                  onChange={(e) => setNovaDisciplina(prev => ({...prev, professor: e.target.value}))}
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="color"
                  value={novaDisciplina.cor}
                  onChange={(e) => setNovaDisciplina(prev => ({...prev, cor: e.target.value}))}
                  className="p-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-12"
                />
              </div>
              <div className="flex justify-end mt-4">
                <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                  Adicionar Disciplina
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ABA: HORÁRIOS */}
        {abaAtiva === 'horarios' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Grade de Horários</h3>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
                + Novo Horário
              </button>
            </div>

            {/* Grade de Horários */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Turma</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Disciplina</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Dia</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Horário</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Sala</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {horarios.map(horario => (
                    <tr key={horario.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{horario.turma}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{horario.disciplina}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 capitalize">{horario.dia}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {horario.horaInicio} - {horario.horaFim}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{horario.sala}</td>
                      <td className="px-4 py-3 text-sm">
                        <button className="text-blue-600 hover:text-blue-800 font-medium">
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA: TIPOS DE AVALIAÇÃO */}
        {abaAtiva === 'avaliacoes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Tipos de Avaliação</h3>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
                + Novo Tipo
              </button>
            </div>

            {/* Lista de Tipos de Avaliação */}
            <div className="grid gap-4">
              {tiposAvaliacao.map(tipo => (
                <div key={tipo.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tipo.cor }}
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">{tipo.nome}</h4>
                      <p className="text-sm text-gray-600">Peso: {tipo.peso}%</p>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    Editar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Configurações Gerais (presente em todas as abas) */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações Gerais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Período Letivo Padrão
              </label>
              <Select
                vect={["Manhã", "Tarde", "Noite", "Integral"]}
                value={config.periodoLetivo}
                icon={FiCalendar}
                onChange={(e: any) => setConfig(prev => ({ ...prev, periodoLetivo: e }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Máximo de Alunos por Turma
              </label>
              <input
                type="number"
                value={config.maxAlunosTurma}
                onChange={(e) => setConfig(prev => ({ ...prev, maxAlunosTurma: parseInt(e.target.value) }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="1"
                max="100"
              />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
              <FiSave size={18} />
              Salvar Configurações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};