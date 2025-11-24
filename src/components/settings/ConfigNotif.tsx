import { useState } from 'react';
import { FaQuestion } from 'react-icons/fa6';
import { FiMail, FiPhone, FiMessageSquare, FiSave } from 'react-icons/fi';

export const ConfiguracoesNotificacoes = () => {
  const [config, setConfig] = useState({
    // Métodos ativos
    metodos: ['email', 'whatsapp', 'sms'] as string[],
    
    // Twilio WhatsApp
    whatsappAtivo: true,
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioWhatsAppNumber: '+14155238886', // Sandbox padrão
    
    // Twilio SMS
    smsAtivo: true,
    twilioSMSNumber: '', // Seu número Twilio para SMS
    
    // Email
    emailAtivo: true,
    emailService: 'gmail', // gmail, outlook, smtp
    emailUsuario: '',
    emailSenha: '',
    emailHost: 'smtp.gmail.com',
    emailPort: '587',
    
    // Tipos de notificação
    notificarPagamentos: true,
    notificarAtrasos: true,
    notificarLembretes: true,
    notificarAulas: false,
    
    // Configurações
    diasLembrete: 3,
    horarioNotificacoes: '09:00'
  });

  const [testando, setTestando] = useState({
    whatsapp: false,
    sms: false,
    email: false
  });

  // Testar configuração do WhatsApp
  const testarWhatsApp = async () => {
    setTestando(prev => ({...prev, whatsapp: true}));
    
    try {
      // ✅ Frontend direto (para testes - depois move para backend)
      const response = await fetch('/api/notificacoes/testar-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountSid: config.twilioAccountSid,
          authToken: config.twilioAuthToken,
          numeroTeste: '+244...' // Número de teste
        })
      });
      
      const result = await response.json();
      alert(result.success ? '✅ WhatsApp configurado!' : '❌ Erro: ' + result.error);
    } catch (error) {
      alert('❌ Erro ao testar WhatsApp');
    } finally {
      setTestando(prev => ({...prev, whatsapp: false}));
    }
  };

  // Testar configuração do SMS
  const testarSMS = async () => {
    setTestando(prev => ({...prev, sms: true}));
    
    try {
      const response = await fetch('/api/notificacoes/testar-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountSid: config.twilioAccountSid,
          authToken: config.twilioAuthToken,
          numeroTeste: '+244...'
        })
      });
      
      const result = await response.json();
      alert(result.success ? '✅ SMS configurado!' : '❌ Erro: ' + result.error);
    } catch (error) {
      alert('❌ Erro ao testar SMS');
    } finally {
      setTestando(prev => ({...prev, sms: false}));
    }
  };

  // Testar configuração do Email
  const testarEmail = async () => {
    setTestando(prev => ({...prev, email: true}));
    
    try {
      const response = await fetch('/api/notificacoes/testar-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: config.emailUsuario,
          senha: config.emailSenha,
          host: config.emailHost,
          port: config.emailPort
        })
      });
      
      const result = await response.json();
      alert(result.success ? '✅ Email configurado!' : '❌ Erro: ' + result.error);
    } catch (error) {
      alert('❌ Erro ao testar Email');
    } finally {
      setTestando(prev => ({...prev, email: false}));
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Configurações de Notificações</h2>
      
      <div className="space-y-8">
        
        {/* Configuração do Twilio (WhatsApp + SMS) */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            <FiMessageSquare className="inline mr-2 mb-1" />
            Twilio - WhatsApp & SMS
          </h3>
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
            <p className="text-sm text-blue-700">
              <strong>Como obter as credenciais:</strong> Acesse <a href="https://www.twilio.com/console" target="_blank" rel="noopener noreferrer" className="underline">Twilio Console</a> e copie o Account SID e Auth Token.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account SID *
              </label>
              <input
                type="text"
                value={config.twilioAccountSid}
                onChange={(e) => setConfig(prev => ({...prev, twilioAccountSid: e.target.value}))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auth Token *
              </label>
              <input
                type="password"
                value={config.twilioAuthToken}
                onChange={(e) => setConfig(prev => ({...prev, twilioAuthToken: e.target.value}))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div className={`border-2 rounded-lg p-4 mb-4 ${
            config.whatsappAtivo ? 'border-green-200 bg-green-50' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FiMessageSquare className="text-green-600" />
                <h4 className="font-medium text-gray-900">WhatsApp</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  config.whatsappAtivo 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {config.whatsappAtivo ? 'Ativo' : 'Inativo'}
                </span>
                <input
                  type="checkbox"
                  checked={config.whatsappAtivo}
                  onChange={(e) => setConfig(prev => ({...prev, whatsappAtivo: e.target.checked}))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {config.whatsappAtivo && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número WhatsApp (Sandbox)
                </label>
                <input
                  type="text"
                  value={config.twilioWhatsAppNumber}
                  onChange={(e) => setConfig(prev => ({...prev, twilioWhatsAppNumber: e.target.value}))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="+14155238886"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Use o número sandbox para testes. Para produção, compre um número Twilio.
                </p>
                
                <button
                  onClick={testarWhatsApp}
                  disabled={testando.whatsapp || !config.twilioAccountSid || !config.twilioAuthToken}
                  className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <FaQuestion size={16} />
                  {testando.whatsapp ? 'Testando...' : 'Testar WhatsApp'}
                </button>
              </div>
            )}
          </div>

          {/* SMS */}
          <div className={`border-2 rounded-lg p-4 ${
            config.smsAtivo ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FiPhone className="text-blue-600" />
                <h4 className="font-medium text-gray-900">SMS</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  config.smsAtivo 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {config.smsAtivo ? 'Ativo' : 'Inativo'}
                </span>
                <input
                  type="checkbox"
                  checked={config.smsAtivo}
                  onChange={(e) => setConfig(prev => ({...prev, smsAtivo: e.target.checked}))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {config.smsAtivo && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número SMS Twilio
                </label>
                <input
                  type="text"
                  value={config.twilioSMSNumber}
                  onChange={(e) => setConfig(prev => ({...prev, twilioSMSNumber: e.target.value}))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="+1234567890"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Número Twilio comprado para enviar SMS
                </p>
                
                <button
                  onClick={testarSMS}
                  disabled={testando.sms || !config.twilioAccountSid || !config.twilioAuthToken}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <FaQuestion size={16} />
                  {testando.sms ? 'Testando...' : 'Testar SMS'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Configuração do Email */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            <FiMail className="inline mr-2 mb-1" />
            Configurações de Email
          </h3>
          
          <div className={`border-2 rounded-lg p-4 ${
            config.emailAtivo ? 'border-purple-200 bg-purple-50' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FiMail className="text-purple-600" />
                <h4 className="font-medium text-gray-900">Email</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  config.emailAtivo 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {config.emailAtivo ? 'Ativo' : 'Inativo'}
                </span>
                <input
                  type="checkbox"
                  checked={config.emailAtivo}
                  onChange={(e) => setConfig(prev => ({...prev, emailAtivo: e.target.checked}))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {config.emailAtivo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Serviço de Email
                  </label>
                  <select
                    value={config.emailService}
                    onChange={(e) => setConfig(prev => ({...prev, emailService: e.target.value}))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="gmail">Gmail</option>
                    <option value="outlook">Outlook/Office365</option>
                    <option value="smtp">Outro (SMTP)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={config.emailUsuario}
                    onChange={(e) => setConfig(prev => ({...prev, emailUsuario: e.target.value}))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha/App Password *
                  </label>
                  <input
                    type="password"
                    value={config.emailSenha}
                    onChange={(e) => setConfig(prev => ({...prev, emailSenha: e.target.value}))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Sua senha ou app password"
                  />
                </div>

                {config.emailService === 'smtp' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SMTP Host
                      </label>
                      <input
                        type="text"
                        value={config.emailHost}
                        onChange={(e) => setConfig(prev => ({...prev, emailHost: e.target.value}))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="smtp.seuprovedor.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SMTP Port
                      </label>
                      <input
                        type="text"
                        value={config.emailPort}
                        onChange={(e) => setConfig(prev => ({...prev, emailPort: e.target.value}))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="587"
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <button
                    onClick={testarEmail}
                    disabled={testando.email || !config.emailUsuario || !config.emailSenha}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <FaQuestion size={16} />
                    {testando.email ? 'Testando...' : 'Testar Email'}
                  </button>
                  
                  {config.emailService === 'gmail' && (
                    <p className="text-sm text-gray-500 mt-2">
                      <strong>Para Gmail:</strong> Use uma "App Password" em vez da senha normal. Ative a verificação em 2 passos e gere a app password.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tipos de Notificação */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tipos de Notificação</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Pagamentos realizados
                </label>
                <p className="text-sm text-gray-500">
                  Notificar quando um pagamento for registrado
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.notificarPagamentos}
                onChange={(e) => setConfig(prev => ({...prev, notificarPagamentos: e.target.checked}))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Pagamentos em atraso
                </label>
                <p className="text-sm text-gray-500">
                  Alertar sobre pagamentos pendentes
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.notificarAtrasos}
                onChange={(e) => setConfig(prev => ({...prev, notificarAtrasos: e.target.checked}))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Lembretes de vencimento
                </label>
                <p className="text-sm text-gray-500">
                  Lembrar antes do vencimento das propinas
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.notificarLembretes}
                onChange={(e) => setConfig(prev => ({...prev, notificarLembretes: e.target.checked}))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>

          {config.notificarLembretes && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 ml-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dias antes do vencimento
                </label>
                <input
                  type="number"
                  value={config.diasLembrete}
                  onChange={(e) => setConfig(prev => ({...prev, diasLembrete: parseInt(e.target.value)}))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horário das notificações
                </label>
                <input
                  type="time"
                  value={config.horarioNotificacoes}
                  onChange={(e) => setConfig(prev => ({...prev, horarioNotificacoes: e.target.value}))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            type="button"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <FiSave size={18} />
            Salvar Configurações de Notificações
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracoesNotificacoes;