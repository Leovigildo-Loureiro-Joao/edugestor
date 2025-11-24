import { useState } from "react";
import { FiSave } from "react-icons/fi";

export const ConfiguracoesFinanceiras = () => {
  const [config, setConfig] = useState({
    moeda: 'AOA',
    propinaPadrao: 0,
    multaAtraso: 0,
    diasParaMulta: 5,
    metodoPagamento: ['cash'],
    iva: 0,
    gerarRecibos: true
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Configurações Financeiras</h2>
      
      <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Moeda Principal
            </label>
            <select
              value={config.moeda}
              onChange={(e) => setConfig(prev => ({...prev, moeda: e.target.value}))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="AOA">Kwanza Angolano (AOA)</option>
              <option value="USD">Dólar Americano (USD)</option>
              <option value="EUR">Euro (EUR)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Propina Padrão (AOA)
            </label>
            <input
              type="number"
              value={config.propinaPadrao}
              onChange={(e) => setConfig(prev => ({...prev, propinaPadrao: parseFloat(e.target.value)}))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Multa por Atraso (%)
            </label>
            <input
              type="number"
              value={config.multaAtraso}
              onChange={(e) => setConfig(prev => ({...prev, multaAtraso: parseFloat(e.target.value)}))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="0"
              max="100"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dias para Aplicar Multa
            </label>
            <input
              type="number"
              value={config.diasParaMulta}
              onChange={(e) => setConfig(prev => ({...prev, diasParaMulta: parseInt(e.target.value)}))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="1"
              max="30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IVA (%)
            </label>
            <input
              type="number"
              value={config.iva}
              onChange={(e) => setConfig(prev => ({...prev, iva: parseFloat(e.target.value)}))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="0"
              max="100"
              step="0.1"
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Métodos de Pagamento Aceites
          </label>
          
          <div className="flex flex-wrap gap-4">
            {[
              { value: 'cash', label: 'Dinheiro' },
              { value: 'transferencia', label: 'Transferência' },
              { value: 'mbway', label: 'MBWay' },
              { value: 'cartao', label: 'Cartão' }
            ].map(metodo => (
              <label key={metodo.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.metodoPagamento.includes(metodo.value)}
                  onChange={(e) => {
                    const novosMetodos = e.target.checked
                      ? [...config.metodoPagamento, metodo.value]
                      : config.metodoPagamento.filter(m => m !== metodo.value);
                    setConfig(prev => ({...prev, metodoPagamento: novosMetodos}));
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{metodo.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="gerarRecibos"
            checked={config.gerarRecibos}
            onChange={(e) => setConfig(prev => ({...prev, gerarRecibos: e.target.checked}))}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="gerarRecibos" className="text-sm font-medium text-gray-700">
            Gerar recibos automaticamente para cada pagamento
          </label>
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            <FiSave size={18} />
            Salvar Configurações Financeiras
          </button>
        </div>
      </form>
    </div>
  );
};