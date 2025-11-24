import { FiCheckCircle, FiClock, FiXCircle } from "react-icons/fi";

export const HistoricoPagamentos = ({ historico }) => {
  if (!historico || historico.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
        <FiClock className="mx-auto h-8 w-8 text-gray-400" />
        <p className="text-gray-500 mt-2">Nenhum pagamento registrado</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 text-sm">
        <div className="col-span-4">Estudante</div>
        <div className="col-span-2">Valor</div>
        <div className="col-span-3">Data</div>
        <div className="col-span-3">Status</div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {historico.slice(0, 5).map((pagamento) => (
          <div key={pagamento.id} className="grid grid-cols-12 gap-4 p-4 items-center">
            <div className="col-span-4 font-medium text-gray-900">
              {pagamento.aluno_nome}
            </div>
            <div className="col-span-2 text-green-600 font-semibold">
              {pagamento.valor?.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
            </div>
            <div className="col-span-3 text-gray-600">
              {new Date(pagamento.data_pagamento).toLocaleDateString('pt-AO')}
            </div>
            <div className="col-span-3">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                pagamento.status === 'aprovado' 
                  ? 'bg-green-100 text-green-800' 
                  : pagamento.status === 'pendente'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {pagamento.status === 'aprovado' && <FiCheckCircle size={14} />}
                {pagamento.status === 'pendente' && <FiClock size={14} />}
                {pagamento.status === 'recusado' && <FiXCircle size={14} />}
                {pagamento.status === 'aprovado' ? 'Aprovado' : 
                 pagamento.status === 'pendente' ? 'Pendente' : 'Recusado'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};