import { useEffect, useState } from "react";
import { FiSave } from "react-icons/fi";
import { Instituicao } from "../../types";
import { instituicaoService } from "../../services/database/insitituicao";
import { PaymentConfig } from "../../types/config";
import { configService } from "../../services/database/config";

export const ConfiguracoesFinanceiras = () => {
  const [config, setConfig] = useState<PaymentConfig>({
    valorPropina: 0,
    diaVencimento: 10,
    mesesPagamento: [],
    permitePagamentoAntecipado: false,
    multaPagamento: false,
    multaAtraso: 0,
    diasParaMulta: 5,
    pagamentoPrepago: false
  });
  
  const [instituicao, setInstituicao] = useState<Instituicao | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvoComSucesso, setSalvoComSucesso] = useState(false);

  async function carregarDados() {
    try {
      const configs = await configService.getPaymentConfig();
      const insti = await instituicaoService.getConfig();
      setConfig(configs);
      setInstituicao(insti);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  async function handelConfigFinance() {
    setSalvando(true);
    try {
      // Salvar configurações da instituição
      if (instituicao) {
        await instituicaoService.updateConfig(instituicao);
      }
      
      // Salvar configurações do sistema
      await configService.updateFinanceConfig(config);
      
      setSalvoComSucesso(true);
      
      // Esconder o aviso após 3 segundos
      setTimeout(() => {
        setSalvoComSucesso(false);
      }, 3000);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    } finally {
      setSalvando(false);
    }
  }

  // Função segura para converter valores para número
  const parseSafeFloat = (value: string): number => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Função para atualizar meses de pagamento
  const toggleMesPagamento = (mes: string) => {
    setConfig(prev => {
      const mesesAtuais = prev.mesesPagamento || [];
      const novosMeses = mesesAtuais.includes(mes)
        ? mesesAtuais.filter(m => m !== mes)
        : [...mesesAtuais, mes];
      
      return {
        ...prev,
        mesesPagamento: novosMeses
      };
    });
  };

  const mesesDoAno = [
   'Setembro', 'Outubro', 'Novembro', 'Dezembro', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Configurações Financeiras
      </h2>

      {/* Aviso de salvamento */}
      {salvoComSucesso && (
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 rounded-lg">
          Configurações salvas com sucesso!
        </div>
      )}

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Matrículas (AOA)
            </label>
            <input
              type="number"
              value={instituicao?.valor_matricula || ''}
              onChange={(e) => setInstituicao(prev => ({
                ...(prev || {} as Instituicao),
                valor_matricula: parseSafeFloat(e.target.value)
              }))}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Preço das matrículas ou inscrições"
              step="0.01"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Propina Padrão (AOA)
            </label>
            <input
              type="number"
              value={config?.valorPropina || 0}
              placeholder="Uma propina padrão adicionada aos alunos sem restrições"
              onChange={(e) => setConfig(prev => ({
                ...prev,
                valorPropina: parseSafeFloat(e.target.value)
              }))}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirmação (AOA)
            </label>
            <input
              type="number"
              value={instituicao?.valor_confirmacao || ''} 
              onChange={(e) => setInstituicao(prev => ({
                ...(prev || {
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                } as Instituicao),
                valor_confirmacao: parseSafeFloat(e.target.value)
              }))}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Preço das confirmações"
              step="0.01"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cartão (AOA)
            </label>
            <input
              type="number"
              value={instituicao?.valor_cartao || ''}
              placeholder="Preço atual do cartão"
              onChange={(e) => setInstituicao(prev => ({
                ...(prev || {} as Instituicao),
                valor_cartao: parseSafeFloat(e.target.value)
              }))}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              step="0.01"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Multa por Atraso (AOA)
            </label>
            <input
              type="number"
              value={config?.multaAtraso || 0}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                multaAtraso: parseSafeFloat(e.target.value)
              }))}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              min="0"
              step="0.01"
              placeholder="Valor fixo da multa"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Dia do Vencimento
            </label>
            <input
              type="number"
              value={config?.diaVencimento || 10}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                diaVencimento: parseInt(e.target.value) || 10
              }))}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              min="1"
              max="31"
            />
            <p className="text-xs text-gray-500 mt-1">Dia do mês para vencimento dos pagamentos</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Dias para Aplicar Multa
            </label>
            <input
              type="number"
              value={config?.diasParaMulta || 5}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                diasParaMulta: parseInt(e.target.value) || 5
              }))}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              min="0"
              max="30"
            />
            <p className="text-xs text-gray-500 mt-1">Dias após vencimento para aplicar multa</p>
          </div>
        </div>

        {/* Meses de Pagamento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Meses de Pagamento
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {mesesDoAno.map((mes) => (
              <div key={mes} className="flex items-center">
                <input
                  type="checkbox"
                  id={`mes-${mes}`}
                  checked={config?.mesesPagamento?.includes(mes) || false}
                  onChange={() => toggleMesPagamento(mes)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
                />
                <label htmlFor={`mes-${mes}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {mes}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Opções Adicionais */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="permitePagamentoAntecipado"
              checked={config?.permitePagamentoAntecipado || false}
              onChange={(e) => setConfig(prev => ({
                ...prev, 
                permitePagamentoAntecipado: e.target.checked
              }))}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
            />
            <label htmlFor="permitePagamentoAntecipado" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Permitir pagamento antecipado
            </label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="pagamentoPrepago"
              checked={config?.pagamentoPrepago || false}
              onChange={(e) => setConfig(prev => ({
                ...prev, 
                pagamentoPrepago: e.target.checked
              }))}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
            />
            <label htmlFor="pagamentoPrepago" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pagamento Prepago
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="multaPagamento"
              checked={config?.multaPagamento || false}
              onChange={(e) => setConfig(prev => ({
                ...prev, 
                multaPagamento: e.target.checked
              }))}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
            />
            <label htmlFor="multaPagamento" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Aplicar multa automaticamente em atrasos
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handelConfigFinance}
            type="button"
            disabled={salvando}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FiSave size={18} />
            {salvando ? 'Salvando...' : 'Salvar Configurações Financeiras'}
          </button>
        </div>
      </form>
    </div>
  );
};

