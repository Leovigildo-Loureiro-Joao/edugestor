import { useState } from "react";
import { FiSearch, FiFilter, FiDownload, FiEye, FiEdit3, FiPlus, FiX } from "react-icons/fi";

export const NotasPage = () => {
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>();
    const [filtros, setFiltros] = useState({
    turma: '',
    disciplina: '',
  });
  // Dados mock - disciplinas por aluno
  const alunos = [
    {
      id: 1,
      nome: "Manuel Bernardo",
      numero: "12526", 
      turma: "ALPHA",
      disciplinas: [
        { nome: "Matemática", nota: 16, tipoAvaliacao: "Teste" },
        { nome: "Física", nota: 14, tipoAvaliacao: "Trabalho Prático" }
      ],
      media: 15.0,
      situacao: "aprovado"
    },
    {
      id: 2,
      nome: "Kadjex Cabenge",
      numero: "22526",
      turma: "ALPHA", 
      disciplinas: [
        { nome: "Inglês", nota: 8, tipoAvaliacao: "Participação" },
        { nome: "Química", nota: 7, tipoAvaliacao: "Teste" }
      ],
      media: 7.5,
      situacao: "reprovado"
    }
  ];

  // Converte códigos internos → classes CSS de cor
const getSituacaoColor = (situacao: string) => {
  switch(situacao) {
    case 'aprovado': return 'bg-green-100 text-green-800';
    case 'reprovado': return 'bg-red-100 text-red-800';
    case 'recuperacao': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// USO:
const getSituacaoText = (situacao: string) => {
  switch(situacao) {
    case 'aprovado': return 'Aprovado';
    case 'reprovado': return 'Reprovado'; 
    case 'recuperacao': return 'Recuperação';
    default: return 'Pendente';
  }
};    // → "bg-green-100 text-green-800" ✅

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


          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium h-10">
            <FiFilter size={16} />
            Filtrar
          </button>
        </div>
      </div>
      
      {/* Tabela Simplificada */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Estudante
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Disciplinas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Média
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Situação
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {alunos.map((aluno) => (
              <tr key={aluno.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {aluno.nome}
                    </div>
                    <div className="text-sm text-gray-500">
                      #{aluno.numero} • {aluno.turma}
                    </div>
                  </div>
                </td>
                
                {/* Coluna Disciplinas - Dinâmica */}
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {aluno.disciplinas.map((disciplina, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                      >
                        {disciplina.nome}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {aluno.disciplinas.length} disciplina(s)
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                    aluno.media >= 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {aluno.media.toFixed(1)}
                  </span>
                </td>
                
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    getSituacaoColor(aluno.situacao)
                  }`}>
                    {getSituacaoText(aluno.situacao)}
                  </span>
                </td>
                
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setAlunoSelecionado(aluno)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Ver detalhes"
                    >
                      <FiEye size={16} />
                    </button>
                    <button 
                      className="text-green-600 hover:text-green-900"
                      title="Lançar notas"
                    >
                      <FiEdit3 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalhes do Aluno */}
      {alunoSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Desempenho de {alunoSelecionado.nome}
              </h3>
              <button 
                onClick={() => setAlunoSelecionado(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={24} />
              </button>
            </div>
            
            <div className="p-6">
              {/* Informações do Aluno */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Informações Pessoais</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>Número: #{alunoSelecionado.numero}</div>
                    <div>Turma: {alunoSelecionado.turma}</div>
                    <div>Média Geral: <strong>{alunoSelecionado.media.toFixed(1)}</strong></div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Situação</h4>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    getSituacaoColor(alunoSelecionado.situacao)
                  }`}>
                    {getSituacaoText(alunoSelecionado.situacao)}
                  </span>
                </div>
              </div>

              {/* Tabela de Disciplinas Detalhada */}
              <h4 className="text-sm font-medium text-gray-700 mb-4">Desempenho por Disciplina</h4>
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Disciplina
                    </th>
                    <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Tipo de Avaliação
                    </th>
                    <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Nota
                    </th>
                    <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {alunoSelecionado.disciplinas.map((disciplina, index) => (
                    <tr key={index}>
                      <td className="border border-gray-200 px-4 py-2 text-sm">
                        {disciplina.nome}
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-sm text-gray-600">
                        {disciplina.tipoAvaliacao}
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          disciplina.nota >= 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {disciplina.nota}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          disciplina.nota >= 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {disciplina.nota >= 10 ? 'Aprovado' : 'Reprovado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Botão para adicionar nova disciplina/nota */}
              <div className="flex justify-end mt-6">
                <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                  <FiPlus size={16} />
                  Adicionar Disciplina/Nota
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};