import { useEffect, useState } from 'react';
import { FiCalendar, FiChevronDown, FiCheck } from 'react-icons/fi';

interface SeletorMesesProps {
  value: string[];
  onChange: (meses: string[]) => void;
  anoLetivo?: number;
  availableMonths?: string[];
}

const DEFAULT_ACADEMIC_MONTHS = [
  { numero: '9', nome: 'Setembro' },
  { numero: '10', nome: 'Outubro' },
  { numero: '11', nome: 'Novembro' },
  { numero: '12', nome: 'Dezembro' },
  { numero: '1', nome: 'Janeiro' },
  { numero: '2', nome: 'Fevereiro' },
  { numero: '3', nome: 'Março' },
  { numero: '4', nome: 'Abril' },
  { numero: '5', nome: 'Maio' },
  { numero: '6', nome: 'Junho' },
  { numero: '7', nome: 'Julho' },
  { numero: '8', nome: 'Agosto' }
];

export const SeletorMeses = ({ value, onChange, availableMonths }: SeletorMesesProps) => {
  const [aberto, setAberto] = useState(false);
  const [mesesDisponiveis, setMesesDisponiveis] = useState<Array<{ numero: string; nome: string }>>([]);

  useEffect(() => {
    if (availableMonths?.length) {
      const defaultMap = new Map(DEFAULT_ACADEMIC_MONTHS.map((month) => [month.nome, month]));
      setMesesDisponiveis(
        availableMonths.map((month, index) => defaultMap.get(month) || { numero: String(index + 1), nome: month })
      );
      return;
    }

    setMesesDisponiveis(DEFAULT_ACADEMIC_MONTHS);
  }, [availableMonths]);

  const sortByVisibleOrder = (meses: string[]) => {
    return [...meses].sort(
      (a, b) =>
        mesesDisponiveis.findIndex((month) => month.nome === a) -
        mesesDisponiveis.findIndex((month) => month.nome === b)
    );
  };

  const toggleMes = (mesNome: string) => {
    const novosMeses = value.includes(mesNome)
      ? value.filter((mes) => mes !== mesNome)
      : [...value, mesNome];

    onChange(sortByVisibleOrder(novosMeses));
  };

  const selecionarTodos = () => {
    onChange(mesesDisponiveis.map((month) => month.nome));
  };

  const limparSelecao = () => {
    onChange([]);
  };

  const formatarMesesSelecionados = () => {
    if (value.length === 0) return 'Selecione os meses...';
    if (value.length === mesesDisponiveis.length) return 'Todos os meses';

    return value.slice(0, 3).join(', ') + (value.length > 3 ? ` +${value.length - 3}` : '');
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 hover:border-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-2">
          <FiCalendar className="text-gray-400" />
          <span className="text-gray-700 dark:text-gray-300">{formatarMesesSelecionados()}</span>
        </div>
        <FiChevronDown className={`text-gray-400 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {value.length} {value.length === 1 ? 'mês selecionado' : 'meses selecionados'}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={selecionarTodos}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={limparSelecao}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200"
                >
                  Limpar
                </button>
              </div>
            </div>
          </div>

          <div className="p-2">
            {mesesDisponiveis.map((mes) => (
              <button
                key={mes.numero}
                type="button"
                onClick={() => toggleMes(mes.nome)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors ${
                  value.includes(mes.nome) ? 'bg-green-50 border border-green-200' : ''
                }`}
              >
                <div
                  className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                    value.includes(mes.nome)
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {value.includes(mes.nome) && <FiCheck size={12} />}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900 dark:text-white">{mes.nome}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {parseInt(mes.numero, 10) < 9 ? 'Próximo ano' : 'Este ano'}
                  </div>
                </div>
                {value.includes(mes.nome) && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onChange(mesesDisponiveis.slice(0, 3).map((month) => month.nome))}
                className="flex-1 px-3 py-2 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200"
              >
                3 Meses
              </button>
              <button
                type="button"
                onClick={() => onChange(mesesDisponiveis.slice(0, 6).map((month) => month.nome))}
                className="flex-1 px-3 py-2 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 border border-green-200"
              >
                6 Meses
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
