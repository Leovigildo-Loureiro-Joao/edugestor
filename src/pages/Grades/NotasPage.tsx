import { useState } from "react";
import { FiSearch, FiFilter, FiDownload, FiEye, FiEdit3 } from "react-icons/fi";

export const NotasPage = () => {
  const [filtros, setFiltros] = useState({
    turma: '',
    disciplina: '',
    periodo: ''
  });

  // Dados mock - depois conectamos com o backend
  const alunos = [
    {
      id: 1,
      nome: "Manuel Bernardo",
      numero: "12526",
      turma: "ALPHA",
      notas: {
        matematica: 16,
        portugues: 14,
        historia: 15,
        ciencias: 13,
        media: 14.5
      },
      situacao: "aprovado"
    },
    {
      id: 2,
      nome: "Kadjex Cabenge", 
      numero: "22526",
      turma: "ALPHA",
      notas: {
        matematica: 8,
        portugues: 7,
        historia: 9,
        ciencias: 6,
        media: 7.5
      },
      situacao: "reprovado"
    },
    {
      id: 3,
      nome: "Raquel Bernardo",
      numero: "52526", 
      turma: "ALPHA",
      notas: {
        matematica: 18,
        portugues: 17,
        historia: 16,
        ciencias: 17,
        media: 17.0
      },
      situacao: "aprovado"
    }
  ];

  const getSituacaoColor = (situacao: string) => {
    switch(situacao) {
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'reprovado': return 'bg-red-100 text-red-800';
      case 'recuperacao': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSituacaoText = (situacao: string) => {
    switch(situacao) {
      case 'aprovado': return 'Aprovado';
      case 'reprovado': return 'Reprovado';
      case 'recuperacao': return 'Recuperação';
      default: return 'Pendente';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Cabeçalho */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Gestão de Notas</h2>
            <p className="text-sm text-gray-600 mt-1">
              Acompanhe o desempenho acadêmico dos estudantes
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
              <FiDownload size={16} />
              Exportar
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
              Lançar Notas
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Turma
            </label>
            <select 
              value={filtros.turma}
              onChange={(e) => setFiltros(prev => ({...prev, turma: e.target.value}))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Todas as turmas</option>
              <option value="ALPHA">ALPHA</option>
              <option value="BETA">BETA</option>
              <option value="GAMA">GAMA</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Disciplina
            </label>
            <select 
              value={filtros.disciplina}
              onChange={(e) => setFiltros(prev => ({...prev, disciplina: e.target.value}))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Todas as disciplinas</option>
              <option value="matematica">Matemática</option>
              <option value="portugues">Português</option>
              <option value="historia">História</option>
              <option value="ciencias">Ciências</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período
            </label>
            <select 
              value={filtros.periodo}
              onChange={(e) => setFiltros(prev => ({...prev, periodo: e.target.value}))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Todos os períodos</option>
              <option value="1bim">1º Bimestre</option>
              <option value="2bim">2º Bimestre</option>
              <option value="3bim">3º Bimestre</option>
              <option value="4bim">4º Bimestre</option>
            </select>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium h-10">
            <FiFilter size={16} />
            Filtrar
          </button>
        </div>
      </div>

      {/* Tabela de Notas */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estudante
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Matemática
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Português
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                História
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ciências
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Média
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Situação
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {alunos.map((aluno) => (
              <tr key={aluno.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {aluno.nome}
                    </div>
                    <div className="text-sm text-gray-500">
                      #{aluno.numero} • {aluno.turma}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    aluno.notas.matematica >= 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {aluno.notas.matematica}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    aluno.notas.portugues >= 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {aluno.notas.portugues}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    aluno.notas.historia >= 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {aluno.notas.historia}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    aluno.notas.ciencias >= 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {aluno.notas.ciencias}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                    aluno.notas.media >= 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {aluno.notas.media.toFixed(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSituacaoColor(aluno.situacao)}`}>
                    {getSituacaoText(aluno.situacao)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    <button className="text-blue-600 hover:text-blue-900">
                      <FiEye size={16} />
                    </button>
                    <button className="text-green-600 hover:text-green-900">
                      <FiEdit3 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resumo Estatístico */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Aprovados: <strong className="text-gray-900">2 alunos</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-600">Reprovados: <strong className="text-gray-900">1 aluno</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-600">Em recuperação: <strong className="text-gray-900">0 alunos</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Média geral: <strong className="text-gray-900">13.0</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};