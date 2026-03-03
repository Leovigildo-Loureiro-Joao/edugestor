import { estrategiaMetaService } from "./metaService";
import { estrategiaTarefaService } from "./tarefaService";

interface StatusMetasResumo {
  nao_iniciada: number;
  em_andamento: number;
  concluida: number;
  atrasada: number;
}

const clampPercent = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
};

const PESO_METAS = 50;
const PESO_TAREFAS = 50;

export const estrategiaProgressoService = {
  async getProgressoEstrategias(): Promise<{
    progressoTotal: number;
    detalhes: {
      metas: {
        progresso: number;
        peso: number;
        total?: number;
        porStatus?: {
          nao_iniciada: number;
          em_andamento: number;
          concluida: number;
          atrasada: number;
        };
      };
      tarefas: {
        progresso: number;
        peso: number;
        total?: number;
      };
    };
    resumo: {
      nivel: string;
      cor: string;
      mensagem: string;
      alertas: string;
      sugestoes: string;
    };
  }> {
    try {
      const [metas, tarefas] = await Promise.all([
        estrategiaMetaService.getMetas(),
        estrategiaTarefaService.getTarefas(),
      ]);

      const metasValidas = metas.filter((meta) => !meta.deleted);
      const tarefasValidas = tarefas.filter(
        (tarefa) => !tarefa.deleted && tarefa.status !== "cancelada"
      );

      // Cálculo de metas (média ponderada por prioridade)
      let somaProgressoMetasPonderado = 0;
      let somaPesosPrioridade = 0;

      for (const meta of metasValidas) {
        // Prioriza o progresso manual salvo quando existe
        let progressoMeta =
          typeof meta.progresso === "number" ? clampPercent(meta.progresso) : 0;

        // Fallback automático se progresso não vier definido
        if (progressoMeta === 0) {
          const componentes: Array<{ peso: number; valor: number }> = [];

          if (meta.kpis && meta.kpis.length > 0) {
            let somaKPIs = 0;
            let pesoTotalKPIs = 0;

            meta.kpis.forEach((kpi) => {
              const pesoKPI = kpi.peso || 1;
              const progressoKPI =
                kpi.valor_meta > 0
                  ? clampPercent((kpi.valor_atual / kpi.valor_meta) * 100)
                  : 0;

              somaKPIs += progressoKPI * pesoKPI;
              pesoTotalKPIs += pesoKPI;
            });

            const mediaKPIs = pesoTotalKPIs > 0 ? somaKPIs / pesoTotalKPIs : 0;
            componentes.push({ peso: 70, valor: mediaKPIs });
          }

          if (meta.orcamento_previsto && meta.orcamento_previsto > 0) {
            const orcamentoAlocado = meta.orcamento_alocado || 0;
            const progressoOrcamento = clampPercent(
              (orcamentoAlocado / meta.orcamento_previsto) * 100
            );
            componentes.push({ peso: 30, valor: progressoOrcamento });
          }

          if (componentes.length > 0) {
            const somaPesos = componentes.reduce((acc, c) => acc + c.peso, 0);
            const somaPonderada = componentes.reduce(
              (acc, c) => acc + c.valor * c.peso,
              0
            );
            progressoMeta = clampPercent(somaPonderada / somaPesos);
          }
        }

        const pesoPrioridade =
          meta.prioridade === "critica"
            ? 1.2
            : meta.prioridade === "alta"
            ? 1.1
            : meta.prioridade === "baixa"
            ? 0.9
            : 1.0;

        somaProgressoMetasPonderado += progressoMeta * pesoPrioridade;
        somaPesosPrioridade += pesoPrioridade;
      }

      const progressoFinalMetas =
        somaPesosPrioridade > 0
          ? clampPercent(somaProgressoMetasPonderado / somaPesosPrioridade)
          : 0;

      // Cálculo de tarefas (média simples)
      const somaProgressoTarefas = tarefasValidas.reduce((acc, tarefa) => {
        if (tarefa.status === "concluida" || tarefa.concluida) {
          return acc + 100;
        }

        if (typeof tarefa.percentual_conclusao === "number") {
          return acc + clampPercent(tarefa.percentual_conclusao);
        }

        if (tarefa.status === "em_andamento") {
          return acc + 50;
        }

        if (tarefa.status === "atrasada") {
          return acc + 25;
        }

        return acc;
      }, 0);

      const progressoFinalTarefas =
        tarefasValidas.length > 0
          ? clampPercent(somaProgressoTarefas / tarefasValidas.length)
          : 0;

      const progressoTotal = clampPercent(
        (progressoFinalMetas * PESO_METAS + progressoFinalTarefas * PESO_TAREFAS) /
          (PESO_METAS + PESO_TAREFAS)
      );

      const statusMetas: StatusMetasResumo = {
        nao_iniciada: metasValidas.filter((m) => m.status === "nao_iniciada").length,
        em_andamento: metasValidas.filter((m) => m.status === "em_andamento").length,
        concluida: metasValidas.filter((m) => m.status === "concluida").length,
        atrasada: metasValidas.filter((m) => m.status === "atrasada").length,
      };

      let nivelProgresso = "";
      let corProgresso = "";

      if (progressoTotal >= 90) {
        nivelProgresso = "Excelente";
        corProgresso = "text-green-600";
      } else if (progressoTotal >= 75) {
        nivelProgresso = "Bom";
        corProgresso = "text-blue-600";
      } else if (progressoTotal >= 50) {
        nivelProgresso = "Regular";
        corProgresso = "text-yellow-600";
      } else if (progressoTotal >= 25) {
        nivelProgresso = "Preocupante";
        corProgresso = "text-orange-600";
      } else {
        nivelProgresso = "Crítico";
        corProgresso = "text-red-600";
      }

      let mensagemResumo = "";

      if (progressoTotal >= 90) {
        mensagemResumo = "Estratégias avançando muito bem! Continue assim!";
      } else if (progressoTotal >= 75) {
        mensagemResumo = "Bom progresso! Alguns ajustes podem otimizar ainda mais.";
      } else if (progressoTotal >= 50) {
        mensagemResumo = "Progresso regular. Foque nas metas prioritárias.";
      } else if (progressoTotal >= 25) {
        mensagemResumo = "Atenção necessária. Reavalie prazos e recursos.";
      } else {
        mensagemResumo = "Ação imediata requerida. Revise toda a estratégia.";
      }

      if (statusMetas.atrasada > 0) {
        mensagemResumo += ` ${statusMetas.atrasada} meta(s) atrasada(s).`;
      }

      if (statusMetas.nao_iniciada > 0 && progressoTotal < 50) {
        mensagemResumo += ` ${statusMetas.nao_iniciada} meta(s) não iniciada(s).`;
      }

      return {
        progressoTotal: Number(progressoTotal.toFixed(1)),
        detalhes: {
          metas: {
            progresso: Number(progressoFinalMetas.toFixed(1)),
            peso: PESO_METAS,
            total: metasValidas.length,
            porStatus: statusMetas,
          },
          tarefas: {
            progresso: Number(progressoFinalTarefas.toFixed(1)),
            peso: PESO_TAREFAS,
            total: tarefasValidas.length,
          },
        },
        resumo: {
          nivel: nivelProgresso,
          cor: corProgresso,
          mensagem: mensagemResumo,
          alertas:
            statusMetas.atrasada > 0 ? `⚠️ ${statusMetas.atrasada} meta(s) atrasada(s)` : "",
          sugestoes: this.gerarSugestoesMelhoria(progressoTotal, statusMetas),
        },
      };
    } catch (error) {
      console.error("❌ Erro ao calcular progresso:", error);
      return {
        progressoTotal: 0,
        detalhes: {
          metas: { progresso: 0, peso: PESO_METAS },
          tarefas: { progresso: 0, peso: PESO_TAREFAS },
        },
        resumo: {
          nivel: "Não calculado",
          cor: "text-gray-600",
          mensagem: "Erro ao calcular progresso",
          alertas: "",
          sugestoes: "",
        },
      };
    }
  },

  gerarSugestoesMelhoria(progressoTotal: number, statusMetas: StatusMetasResumo): string {
    const sugestoes: string[] = [];

    if (progressoTotal < 50) {
      sugestoes.push("Foque nas metas de prioridade alta");
      sugestoes.push("Revise prazos e recursos disponíveis");
    }

    if (statusMetas.atrasada > 0) {
      sugestoes.push("Atenda primeiro às metas atrasadas");
      sugestoes.push("Considere ajustar prazos ou realocar recursos");
    }

    if (statusMetas.nao_iniciada > 0) {
      sugestoes.push("Inicie as metas não iniciadas");
      sugestoes.push("Atribua responsáveis claros para cada meta");
    }

    if (progressoTotal > 75 && progressoTotal < 90) {
      sugestoes.push("Mantenha o ritmo atual");
      sugestoes.push("Otimize processos para acelerar conclusão");
    }

    if (progressoTotal >= 90) {
      sugestoes.push("Excelente trabalho!");
      sugestoes.push("Considere estabelecer novas metas desafiadoras");
    }

    return sugestoes.join(". ");
  },

  async getProgressoDashboard(): Promise<{
    progresso: number;
    nivel: string;
    cor: string;
  }> {
    try {
      const resultado = await this.getProgressoEstrategias();
      return {
        progresso: resultado.progressoTotal,
        nivel: resultado.resumo.nivel,
        cor: resultado.resumo.cor,
      };
    } catch (error) {
      console.error("Erro no progresso do dashboard:", error);
      return {
        progresso: 0,
        nivel: "Erro",
        cor: "text-gray-600",
      };
    }
  },

  async gerarRelatorioProgresso(): Promise<string> {
    try {
      const progresso = await this.getProgressoEstrategias();
      const dataAtual = new Date().toLocaleDateString("pt-BR");

      return `
RELATÓRIO DE PROGRESSO ESTRATÉGICO
Data: ${dataAtual}
===================================

PROGRESSO GERAL: ${progresso.progressoTotal}%
Nível: ${progresso.resumo.nivel}

DETALHAMENTO:
-------------
• Metas: ${progresso.detalhes.metas.progresso}% (${progresso.detalhes.metas.peso}% do total)
  - Não iniciadas: ${progresso.detalhes.metas.porStatus?.nao_iniciada}
  - Em andamento: ${progresso.detalhes.metas.porStatus?.em_andamento}
  - Concluídas: ${progresso.detalhes.metas.porStatus?.concluida}
  - Atrasadas: ${progresso.detalhes.metas.porStatus?.atrasada}

• Tarefas: ${progresso.detalhes.tarefas.progresso}% (${progresso.detalhes.tarefas.peso}% do total)
  - Total: ${progresso.detalhes.tarefas.total} tarefas



ANÁLISE:
--------
${progresso.resumo.mensagem}

${progresso.resumo.alertas ? "ALERTAS:\n" + progresso.resumo.alertas + "\n" : ""}
SUGESTÕES:
----------
${progresso.resumo.sugestoes}
`;
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      return "Erro ao gerar relatório de progresso";
    }
  },
};
