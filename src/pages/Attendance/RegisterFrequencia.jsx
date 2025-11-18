// components/RegistroFrequencia.jsx
import { useState } from 'react';
import { frequenciaService } from '../../services/database/frequenciaService';

export const RegistroFrequencia = ({ aula, alunos }) => {
  const [registros, setRegistros] = useState(() =>
    alunos.map(aluno => ({
      aluno_id: aluno.id,
      aluno_nome: aluno.nome_completo,
      presente: true
    }))
  );

  const togglePresenca = (alunoId) => {
    setRegistros(prev =>
      prev.map(reg =>
        reg.aluno_id === alunoId
          ? { ...reg, presente: !reg.presente }
          : reg
      )
    );
  };

  const salvarFrequencia = async () => {
    try {
      await frequenciaService.registrarFrequenciaLote(aula.id, registros);
    } catch (error) {
      alert('Erro ao registrar frequência: ' + error.message);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">
        Registrar Frequência - {aula.disciplina} - {aula.data_aula}
      </h2>
      
      <div className="space-y-2">
        {registros.map(reg => (
          <div key={reg.aluno_id} className="flex items-center gap-4 p-3 border rounded">
            <span className="flex-1">{reg.aluno_nome}</span>
            <button
              onClick={() => togglePresenca(reg.aluno_id)}
              className={`px-4 py-2 rounded ${
                reg.presente 
                  ? 'bg-green-500 text-white' 
                  : 'bg-red-500 text-white'
              }`}
            >
              {reg.presente ? 'Presente' : 'Ausente'}
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={salvarFrequencia}
        className="mt-6 px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Salvar Frequência
      </button>
    </div>
  );
};