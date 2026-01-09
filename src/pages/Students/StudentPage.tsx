import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { propinaService } from '../../services/database/propinas';
import { alunosService } from '../../services/database/alunosService';
import {  Student } from '../../types/aluno';
import { frequenciaService } from '../../services/database/frequenciaService';
import { Propina, PropinaFormData } from '../../types/propina';
import { FrequenciaData } from '../../types/frequencia';
import { Avaliacao, NotaData } from '../../types/avaliacao';
import { av, avaliacaoService } from '../../services/database/avaliacao';
import { Bar, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const StudentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [aluno, setAluno] = useState<Student | undefined>(undefined);
  const [propinas, setPropinas] = useState<Propina[]>([]);
  const [frequencias, setFrequencias] = useState<FrequenciaData[]>([]);
  const [notas, setNotas] = useState<any>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      carregarDadosAluno();
    }
  }, [id]);

  const carregarDadosAluno = async () => {
    try {
      setLoading(true);
      
      // Carregar dados básicos do aluno
      const alunoData = await alunosService.getStudentById(id!);
      setAluno(alunoData);

      // Carregar propinas
      const propinasData = await propinaService.getByAluno(id!);
      setPropinas(propinasData);

      // Carregar frequências (últimos 30 dias)
      const frequenciasData = await frequenciaService.getByAluno(id!, 30);
      setFrequencias(frequenciasData);

      // Carregar notas
      const notasData = await avaliacaoService.getAvaliacoesByAluno(id!);
      setNotas(notasData);

    } catch (error) {
      console.error('Erro ao carregar dados do aluno:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularEstatisticas = () => {
    const totalPropinas = propinas.length;
    const propinasPagas = propinas.filter(p => p.estado === 'pago').length;
    const totalPago = propinas.reduce((sum, p) => sum + p.valor_pago, 0);
    const totalFalta = propinas.reduce((sum, p) => sum + p.valor_falta, 0);
    
    const totalFrequencias = frequencias.length;
    const presencas = frequencias.filter(f => f.presente).length;
    const frequenciaPercent = totalFrequencias > 0 ? (presencas / totalFrequencias) * 100 : 0;
    
    const mediaNotas = notas?notas.estatisticas.mediaGeral:0

    return {
      totalPropinas,
      propinasPagas,
      totalPago,
      totalFalta,
      frequenciaPercent,
      mediaNotas
    };
  };

  const stats = calcularEstatisticas();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
      case 'pago':
        return 'bg-green-100 text-green-800';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'atrasado':
      case 'desistente':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNotaColor = (nota: number) => {
    return nota >= 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dados do aluno...</p>
        </div>
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Aluno não encontrado</h2>
          <button 
            onClick={() => navigate('/alunos')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar para lista de alunos
          </button>
        </div>
      </div>
    );
  }
  console.log(aluno)

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate(localStorage.getItem("last_rota")||"/alunos")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                {aluno.nome_completo?.charAt(0) || 'A'}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{aluno.nome_completo}</h1>
                <p className="text-gray-600 text-lg">
                  {aluno.numero_estudante} • {aluno.curso}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className={`px-4 py-2 rounded-full text-sm font-semibold uppercase ${getStatusColor(aluno.estado)}`}>
                {aluno.estado}
              </span>
              <button onClick={
                ()=>  navigate('/alunos/editar/'+aluno.id)
              } className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Editar Aluno
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TABS */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="flex border-b border-gray-200">
            {['Visão Geral', 'Propinas', 'Frequência', 'Desempenho', 'Informações'].map((tab, index) => (
              <button
                key={tab}
                className={`px-8 py-4 font-medium text-sm transition-colors ${
                  activeTab === index
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white'
                }`}
                onClick={() => setActiveTab(index)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <div className="p-8">
            
            {/* ABA 0: VISÃO GERAL */}
            {activeTab === 0 && (
              <div className="space-y-8">
                {/* STATS CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                    <div className="text-3xl font-bold text-green-800">{stats.frequenciaPercent}%</div>
                    <div className="text-green-700 font-medium mt-2">Frequência</div>
                    <div className="text-green-600 text-sm mt-1">Últimos 30 dias</div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                    <div className="text-3xl font-bold text-blue-800">{stats.mediaNotas.toFixed(1)}</div>
                    <div className="text-blue-700 font-medium mt-2">Média Geral</div>
                    <div className="text-blue-600 text-sm mt-1">{notas?notas.avaliacoes.length:0} avaliações</div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200">
                    <div className="text-3xl font-bold text-red-800">${stats.totalFalta.toLocaleString('pt-BR')}</div>
                    <div className="text-red-700 font-medium mt-2">Pendente</div>
                    <div className="text-red-600 text-sm mt-1">Em atraso</div>
                  </div>
                </div>

                {/* GRÁFICO DE EVOLUÇÃO */}
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-800 mb-6">Evolução do Desempenho</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[
                        ...notas.estatisticas.evolucao
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="data" />
                        <YAxis yAxisId="left" domain={[0, 20]} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="media" 
                          stroke="#3B82F6" 
                          strokeWidth={3}
                          name="Nota Média"
                          dot={{ r: 4 }}
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="frequencia" 
                          stroke="#10B981" 
                          strokeWidth={3}
                          name="Frequência %"
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* PROPINAS RECENTES */}
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Propinas Recentes</h3>
                  <div className="space-y-3">
                    {propinas.slice(0, 5).map((propina) => (
                      <div key={propina.id} className="flex justify-between items-center p-3 hover:bg-white rounded-lg">
                        <div>
                          <span className="font-medium">{propina.mes_referencia}</span>
                          <span className={`ml-3 px-2 py-1 text-xs rounded-full ${getStatusColor(propina.estado)}`}>
                            {propina.estado}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${propina.valor_pago.toLocaleString('pt-BR')}</div>
                          {propina.valor_falta > 0 && (
                            <div className="text-red-600 text-sm">
                              Falta: ${propina.valor_falta.toLocaleString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ABA 1: PROPINAS (mantém igual) */}
            {activeTab === 1 && (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mês</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Pago</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor em Falta</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimento</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pagamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {propinas.map((propina:Propina) => (
                      <tr key={propina.id} className="hover:bg-white">
                        <td className="px-4 py-3 text-sm text-gray-900">{propina.mes_referencia}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ${propina.valor_pago.toLocaleString('pt-BR')}
                        </td>
                        <td className={`px-4 py-3 text-sm font-medium ${
                          propina.valor_falta > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          ${propina.valor_falta.toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(propina.estado)}`}>
                            {propina.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(propina.data_vencimento).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {propina.data_pagamento 
                            ? new Date(propina.data_pagamento).toLocaleDateString('pt-BR')
                            : '-'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ABA 2: FREQUÊNCIA (mantém igual) */}
            {activeTab === 2 && (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Justificativa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {frequencias.map((freq) => (
                      <tr key={freq.id} className="hover:bg-white">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(freq.data_aula).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            freq.presente ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {freq.presente ? 'Presente' : 'Falta'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {freq.justificativa || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ABA 3: DESEMPENHO (mantém igual) */}
            {activeTab === 3 && (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disciplina</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avaliação</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nota</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {notas.avaliacoes.map((nota:Avaliacao) => (
                      <tr key={nota.id} className="hover:bg-white">
                        <td className="px-4 py-3 text-sm text-gray-900">{nota.disciplina}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{nota.tipo_avaliacao}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getNotaColor(nota.nota)}`}>
                            {nota.nota.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(nota.data_avaliacao).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ABA 4: INFORMAÇÕES (mantém igual) */}
            {activeTab === 4 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className=" p-6 border-r border-primary-200">
                  <h3 className="text-lg font-semibold text-primary-800 mb-4">Dados Pessoais</h3>
                  <div className="space-y-3">
                    <div>
                      <strong className="text-gray-700">Nome:</strong>{' '}
                      <span className="text-gray-600">{aluno.nome_completo}</span>
                    </div>
                    <div>
                      <strong className="text-gray-700">Idade:</strong>{' '}
                      <span className="text-gray-600">
                        {aluno.data_nascimento ? new Date(aluno.data_nascimento).getFullYear()-new Date().getFullYear() : 'Não definida'}
                      </span>
                    </div>
                    <div>
                      <strong className="text-gray-700">Sexo:</strong>{' '}
                      <span className="text-gray-600">{aluno.sexo === 'M' ? 'Masculino' : 'Feminino'}</span>
                    </div>
                    <div>
                      <strong className="text-gray-700">Contacto:</strong>{' '}
                      <span className="text-gray-600">{aluno.contacto_principal||'Não informado'}</span>
                    </div>
                    <div>
                      <strong className="text-gray-700">Email:</strong>{' '}
                      <span className="text-gray-600">{aluno.email || 'Não informado'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 ">
                  <h3 className="text-lg font-semibold  text-primary-800 mb-4">Informações Acadêmicas</h3>
                  <div className="space-y-3">
                    <div>
                      <strong className="text-gray-700">Curso:</strong>{' '}
                      <span className="text-gray-600">{aluno.curso}</span>
                    </div>
                    <div>
                      <strong className="text-gray-700">Propina:</strong>{' '}
                      <span className="text-gray-600">{aluno.propina}</span>
                    </div>
                    <div>
                      <strong className="text-gray-700">Turma:</strong>{' '}
                      <span className="text-gray-600">{aluno.turma_nome || 'Não definida'}</span>
                    </div>
                    <div>
                      <strong className="text-gray-700">Professor:</strong>{' '}
                      <span className="text-gray-600">{aluno.professor || 'Não definido'}</span>
                    </div>
                    <div>
                      <strong className="text-gray-700">Nº Estudante:</strong>{' '}
                      <span className="text-gray-600">{aluno.numero_estudante}</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2  p-6 rounded-lg border-t border-primary-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Endereço</h3>
                  <p className="text-gray-600">{aluno.endereco||"Não foi disponiblizado ..."}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentPage;