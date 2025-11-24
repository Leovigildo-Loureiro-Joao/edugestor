import { useState } from "react";
import { FiSave } from "react-icons/fi";

export const ConfiguracoesGerais = () => {
  const [config, setConfig] = useState({
    nomeEscola: '',
    telefone: '',
    email: '',
    endereco: '',
    nif: '',
    anoLetivo: new Date().getFullYear(),
    logo: '',
    timezone: 'Africa/Luanda'
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Informações da Escola</h2>
      
      <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Escola *
            </label>
            <input
              type="text"
              value={config.nomeEscola}
              onChange={(e) => setConfig(prev => ({...prev, nomeEscola: e.target.value}))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Escola Primária do Seu Irmão"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone *
            </label>
            <input
              type="tel"
              value={config.telefone}
              onChange={(e) => setConfig(prev => ({...prev, telefone: e.target.value}))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="+244 XXX XXX XXX"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={config.email}
              onChange={(e) => setConfig(prev => ({...prev, email: e.target.value}))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="escola@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Whatssap
            </label>
            <input
              type="text"
              value={config.nif}
              onChange={(e) => setConfig(prev => ({...prev, nif: e.target.value}))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Número de Identificação Fiscal"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Endereço Completo
            </label>
            <textarea
              value={config.endereco}
              onChange={(e) => setConfig(prev => ({...prev, endereco: e.target.value}))}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Endereço completo da escola"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ano Letivo
            </label>
            <select
              value={config.anoLetivo}
              onChange={(e) => setConfig(prev => ({...prev, anoLetivo: parseInt(e.target.value)}))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fuso Horário
            </label>
            <select
              value={config.timezone}
              onChange={(e) => setConfig(prev => ({...prev, timezone: e.target.value}))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="Africa/Luanda">Angola (Luanda)</option>
              <option value="Africa/Lagos">Nigéria (Lagos)</option>
              <option value="Africa/Johannesburg">África do Sul (Johannesburg)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <FiSave size={18} />
            Salvar Configurações
          </button>
        </div>
      </form>
    </div>
  );
};