// components/dashboard/GraficoDesempenho.tsx
import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { format, subDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { estrategiaService } from '../../services/database/estrategiaService';

// Tipos para os dados do gráfico
interface DadosGrafico {
  tarefasPendentes: number;
  tarefasConcluidas: number;
  metasConcluidas: number;
  metasPendentes: number;
  tendencia: {
    datas: string[];
    tarefas: number[];
    metas: number[];
  };
}

interface Props {
  periodo?: 'semana' | 'mes' | 'trimestre';
  tema?: 'claro' | 'escuro';
}

export const GraficoDesempenho: React.FC<Props> = ({ 
  periodo = 'semana', 
  tema
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [temaDetectado, setTemaDetectado] = useState<'claro' | 'escuro'>(() => {
    if (typeof document === 'undefined') return 'claro';
    return document.documentElement.classList.contains('dark') ? 'escuro' : 'claro';
  });
  const temaAtual = tema ?? temaDetectado;
  
  // Cores profissionais para o tema claro
  const coresTemaClaro = {
    fundo: 'rgba(255, 255, 255, 0.1)',
    grid: 'rgba(0, 0, 0, 0.1)',
    texto: '#333',
    primaria: '#3B82F6', // Azul
    secundaria: '#10B981', // Verde
    terciaria: '#F59E0B', // Laranja
    quartaria: '#8B5CF6', // Roxo
    sucesso: '#10B981',
    alerta: '#F59E0B',
    perigo: '#EF4444'
  };

  // Cores profissionais para o tema escuro
  const coresTemaEscuro = {
    fundo: 'rgba(30, 41, 59, 0.5)',
    grid: 'rgba(148, 163, 184, 0.2)',
    texto: '#F8FAFC',
    primaria: '#60A5FA',
    secundaria: '#34D399',
    terciaria: '#FBBF24',
    quartaria: '#A78BFA',
    sucesso: '#34D399',
    alerta: '#FBBF24',
    perigo: '#F87171'
  };

  const cores = temaAtual === 'claro' ? coresTemaClaro : coresTemaEscuro;

  useEffect(() => {
    if (tema) return;
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const syncTheme = () => {
      setTemaDetectado(root.classList.contains('dark') ? 'escuro' : 'claro');
    };

    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [tema]);

  useEffect(() => {
    carregarDadosEGerarGrafico();
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [periodo, temaAtual]);

  const carregarDadosEGerarGrafico = async () => {
    try {
      const dados = await carregarDados();
      gerarGrafico(dados);
    } catch (error) {
      console.error('Erro ao carregar dados para o gráfico:', error);
    }
  };

  const carregarDados = async (): Promise<DadosGrafico> => {
    // Carregar dados do service
    const [resumo, tarefas, metas] = await Promise.all([
      estrategiaService.getResumoEstrategico(),
      estrategiaService.getTarefas(),
      estrategiaService.getMetas()
    ]);

    // Calcular totais
    const totalTarefas = tarefas.length;
    const tarefasConcluidas = tarefas.filter(t => t.concluida).length;
    
    const totalMetas = metas.length;
    const metasConcluidas = metas.filter(m => m.status === 'concluida').length;
    

    // Gerar dados de tendência para os últimos 7 dias
    const datasTendencia = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return format(date, 'dd/MM', { locale: pt });
    });

    // Simular dados de tendência (na prática, você buscaria do histórico)
    const tarefasTendencia = Array.from({ length: 7 }, (_, i) => 
      Math.floor(Math.random() * (totalTarefas * 0.3)) + (totalTarefas * 0.5)
    );

    const metasTendencia = Array.from({ length: 7 }, (_, i) => 
      Math.floor(Math.random() * (totalMetas * 0.3)) + (totalMetas * 0.5)
    );

    

    return {
      tarefasPendentes: totalTarefas - tarefasConcluidas,
      tarefasConcluidas,
      metasConcluidas,
      metasPendentes: totalMetas - metasConcluidas,
      tendencia: {
        datas: datasTendencia,
        tarefas: tarefasTendencia,
        metas: metasTendencia,
      }
    };
  };

  const gerarGrafico = (dados: DadosGrafico) => {
    if (!chartRef.current) return;

    // Destruir gráfico anterior se existir
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Configuração do gráfico combinado (barras + linhas)
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dados.tendencia.datas,
        datasets: [
          // Dataset 1: Tarefas (Barras)
          {
            label: 'Tarefas',
            data: dados.tendencia.tarefas,
            backgroundColor: `${cores.primaria}80`, // 50% de opacidade
            borderColor: cores.primaria,
            borderWidth: 2,
            borderRadius: 6,
            order: 1,
            yAxisID: 'y'
          },
          // Dataset 2: Metas (Barras)
          {
            label: 'Metas',
            data: dados.tendencia.metas,
            backgroundColor: `${cores.secundaria}80`,
            borderColor: cores.secundaria,
            borderWidth: 2,
            borderRadius: 6,
            order: 2,
            yAxisID: 'y'
          },
          // Dataset 3: Linha de tendência (Tarefas)
          {
            label: 'Tendência Tarefas',
            data: dados.tendencia.tarefas,
            type: 'line' as const,
            borderColor: cores.primaria,
            borderWidth: 3,
            backgroundColor: 'transparent',
            pointBackgroundColor: cores.primaria,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.4,
            order: 3,
            yAxisID: 'y'
          },
          // Dataset 4: Linha de tendência (Metas)
          {
            label: 'Tendência Metas',
            data: dados.tendencia.metas,
            type: 'line' as const,
            borderColor: cores.secundaria,
            borderWidth: 3,
            borderDash: [5, 5],
            backgroundColor: 'transparent',
            pointBackgroundColor: cores.secundaria,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.4,
            order: 4,
            yAxisID: 'y'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: cores.texto,
              font: {
                family: "'Inter', sans-serif",
                size: 12,
                weight: '500'
              },
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: temaAtual === 'claro' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.95)',
            titleColor: cores.texto,
            bodyColor: cores.texto,
            borderColor: cores.grid,
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            displayColors: true,
            boxPadding: 6,
            callbacks: {
              label: (context) => {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                label += context.parsed.y;
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: cores.grid,
              drawBorder: false
            },
            ticks: {
              color: cores.texto,
              font: {
                family: "'Inter', sans-serif",
                size: 11
              }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: cores.grid,
              drawBorder: false
            },
            ticks: {
              color: cores.texto,
              font: {
                family: "'Inter', sans-serif",
                size: 11
              },
              padding: 10
            },
            title: {
              display: true,
              text: 'Quantidade',
              color: cores.texto,
              font: {
                family: "'Inter', sans-serif",
                size: 12,
                weight: '600'
              }
            }
          }
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        }
      }
    });
  };

  const containerStyle = {
    backgroundColor: temaAtual === 'claro' ? '#ffffff' : '#1E293B',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: temaAtual === 'claro' 
      ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      : '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
  };

  return (
    <div style={containerStyle} className="grafico-container">
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ 
          color: cores.texto, 
          margin: 0,
          fontSize: '18px',
          fontWeight: '600',
          fontFamily: "'Inter', sans-serif"
        }}>
          Desempenho Estratégico
        </h3>
        <p style={{ 
          color: temaAtual === 'claro' ? '#64748B' : '#94A3B8',
          margin: '4px 0 0 0',
          fontSize: '14px',
          fontFamily: "'Inter', sans-serif"
        }}>
          Análise de tarefas, metas e rotinas dos últimos 7 dias
        </p>
      </div>
      
      <div style={{ position: 'relative', height: '400px' }}>
        <canvas ref={chartRef} />
      </div>
    </div>
  );
};
