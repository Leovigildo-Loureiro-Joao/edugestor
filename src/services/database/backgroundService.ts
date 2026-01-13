// services/backgroundService.ts
import { estrategiaService } from '../database/estrategiaService';

export const backgroundService = {
  iniciarMonitoramento(): void {

    setInterval(() => {
      estrategiaService.verificarPrazosMetas();
    }, 60 * 60 * 1000); // 1 hora

    const agora = new Date();
    const proxima2h = new Date();
    proxima2h.setHours(2, 0, 0, 0);
    if (agora > proxima2h) {
      proxima2h.setDate(proxima2h.getDate() + 1);
    }
    
    const tempoAteProxima2h = proxima2h.getTime() - agora.getTime();
    
    setTimeout(() => {
      estrategiaService.coletarDadosKPIs();
      setInterval(() => {
        estrategiaService.coletarDadosKPIs();
      }, 24 * 60 * 60 * 1000);
    }, tempoAteProxima2h);
  },

  inicializar(): void {
    console.log('🚀 Iniciando serviços de background...');
    this.iniciarMonitoramento();
    
    estrategiaService.verificarPrazosMetas();
    estrategiaService.coletarDadosKPIs();
  }
};
