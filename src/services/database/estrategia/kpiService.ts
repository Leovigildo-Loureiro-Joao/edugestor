import { alunosService } from "..";
import { METRICAS_POR_MODULO } from "../../../components/strategy/KPIManager";
import { Fonte, IndicadorDesempenho, Meta } from "../../../types/eventos";
import { instituicaoIdValue } from "../../../utils/getInstituicaoID";
import { generateUniqueId } from "../../../utils/idGenerator";
import { avaliacaoService } from "../avaliacao";
import db from "../db";
import { propinaService } from "../propinas";
import { transacaoService } from "../transacaoService";
import { estrategiaMetaService } from "./metaService";
import { notificacaoService, PrioridadeNotificacao, TipoNotificacao } from "../notificacaoService";

const METRICAS_PERCENTUAIS = new Set([
  "inadimplencia",
  "evasao_mensal",
  "retencao",
  "presenca_media",
  "ausencias_justificadas",
  "frequencia_diaria",
  "taxa_aprovacao",
  "recuperacao",
]);

export const estrategiaKpiService = {

  normalizarKPIItemPorOrcamento(meta: Meta, kpi: IndicadorDesempenho): IndicadorDesempenho {
    const fonte = kpi.fonte_dados;
    const metrica = fonte?.metrica || "";
    const isAutomatico = fonte?.tipo === "automatico";
    const metricasItem = new Set([
      "maquinas_adquiridas",
      "aparelhos_adquiridos",
      "equipamentos_adquiridos",
      "materiais_adquiridos",
      "utensilios_adquiridos",
      "moveis_adquiridos",
    ]);

    if (!isAutomatico || !metricasItem.has(metrica)) {
      return kpi;
    }

    const custoAtual = Number(fonte?.query_parametros?.custo_unitario || 0);
    const custoDerivado =
      meta.orcamento_previsto && Number(kpi.valor_meta || 0) > 0
        ? Number((meta.orcamento_previsto / Number(kpi.valor_meta)).toFixed(2))
        : 0;
    const custoUnitario = custoAtual > 0 ? custoAtual : custoDerivado;

    return {
      ...kpi,
      unidade: kpi.unidade?.toLowerCase().includes("uni") ? kpi.unidade : "unidades",
      fonte_dados: {
        ...fonte,
        query_parametros: {
          ...(fonte?.query_parametros || {}),
          ...(custoUnitario > 0 ? { custo_unitario: custoUnitario } : {}),
        },
      },
    };
  },

  isKpiFinanceiro(meta: Meta, kpi: IndicadorDesempenho): boolean {
    return meta.tipo === "financeira" || kpi.fonte_dados?.modulo === "financeiro";
  },

  getPeriodoAtualizacao(frequencia: string, referencia = new Date()): string {
    const ano = referencia.getFullYear();
    const mes = referencia.getMonth() + 1;
    const dia = referencia.getDate();
    const monthRef = `${ano}-${String(mes).padStart(2, "0")}`;

    switch (frequencia) {
      case "diaria":
        return `${monthRef}-${String(dia).padStart(2, "0")}`;
      case "semanal": {
        const inicioAno = new Date(ano, 0, 1);
        const diffDias = Math.floor(
          (referencia.getTime() - inicioAno.getTime()) / (1000 * 60 * 60 * 24)
        );
        const semana = Math.floor((diffDias + inicioAno.getDay()) / 7) + 1;
        return `${ano}-W${String(semana).padStart(2, "0")}`;
      }
      case "trimestral":
        return `${ano}-Q${Math.floor((mes - 1) / 3) + 1}`;
      case "anual":
        return `${ano}`;
      case "mensal":
      default:
        return monthRef;
    }
  },

  confirmarAtualizacaoFinanceira(
    meta: Meta,
    kpi: IndicadorDesempenho,
    novoValor: number
  ): boolean {
    if (!this.isKpiFinanceiro(meta, kpi)) return true;
    if (typeof window === "undefined" || typeof window.confirm !== "function") return true;

    const instituicaoId = instituicaoIdValue() || "global";
    const periodo = this.getPeriodoAtualizacao(kpi.frequencia, new Date());
    const chaveConfirmacao = `kpi_financeiro_confirm_${instituicaoId}_${meta.id}_${kpi.id}_${periodo}`;
    const decisaoAnterior = localStorage.getItem(chaveConfirmacao);

    if (decisaoAnterior === "aprovado") return true;
    if (decisaoAnterior === "recusado") return false;

    const atual = Number(kpi.valor_atual || 0);
    const mensagem = [
      `Meta financeira: ${meta.titulo}`,
      `KPI: ${kpi.nome}`,
      `Atual: ${atual.toLocaleString("pt-BR")} ${kpi.unidade}`,
      `Novo: ${Number(novoValor).toLocaleString("pt-BR")} ${kpi.unidade}`,
      `Frequência: ${kpi.frequencia}`,
      "Deseja continuar com a atualização automática agora?",
    ].join("\n");

    const aprovado = window.confirm(mensagem);
    localStorage.setItem(chaveConfirmacao, aprovado ? "aprovado" : "recusado");
    return aprovado;
  },

  async runKPIIntegrityBackfill(options?: { force?: boolean }) {
    try {
      const instituicaoId = instituicaoIdValue() || "";
      if (!instituicaoId) {
        return { skipped: true, metasAtualizadas: 0, kpisCorrigidos: 0, recalculados: 0 };
      }

      const todayKey = new Date().toISOString().split("T")[0];
      const runKey = `estrategia_backfill_kpi_integrity_${instituicaoId}`;
      const lastRun = localStorage.getItem(runKey);
      if (!options?.force && lastRun === todayKey) {
        return { skipped: true, metasAtualizadas: 0, kpisCorrigidos: 0, recalculados: 0 };
      }

      const METRICAS_UNIDADE_ITEM = new Set([
        "maquinas_adquiridas",
        "aparelhos_adquiridos",
        "equipamentos_adquiridos",
        "materiais_adquiridos",
        "utensilios_adquiridos",
        "moveis_adquiridos",
      ]);

      const metas = await estrategiaMetaService.getMetas();
      const now = new Date().toISOString();
      let metasAtualizadas = 0;
      let kpisCorrigidos = 0;
      let recalculados = 0;

      for (const meta of metas) {
        if (!meta.kpis || meta.kpis.length === 0) continue;

        let metaTeveMudanca = false;
        const novosKpis = [...meta.kpis];

        for (let i = 0; i < novosKpis.length; i++) {
          const kpi = novosKpis[i];
          const fonte = kpi.fonte_dados;
          if (!fonte || fonte.tipo !== "automatico") continue;

          let kpiAlterado = false;
          const unidadeNormalizada = (kpi.unidade || "").trim().toLowerCase();
          const nomeDescricao = `${kpi.nome || ""} ${kpi.descricao || ""}`.toLowerCase();

          // Corrige unidade percentual inconsistente.
          if (METRICAS_PERCENTUAIS.has(fonte.metrica) && kpi.unidade !== "%") {
            kpi.unidade = "%";
            kpiAlterado = true;
          }

          // Migração automática do bug: KPI de máquinas salvo como financeiro/inadimplência.
          const pareceKpiInfra =
            unidadeNormalizada === "uni" ||
            nomeDescricao.includes("maquina") ||
            nomeDescricao.includes("aparelho") ||
            nomeDescricao.includes("equipamento") ||
            nomeDescricao.includes("material") ||
            nomeDescricao.includes("utens") ||
            nomeDescricao.includes("movel") ||
            nomeDescricao.includes("móvel");
          if (
            pareceKpiInfra &&
            fonte.modulo === "financeiro" &&
            fonte.metrica === "inadimplencia"
          ) {
            const custoDerivado =
              Number(fonte.query_parametros?.custo_unitario) > 0
                ? Number(fonte.query_parametros?.custo_unitario)
                : meta.orcamento_previsto && (kpi.valor_meta || 0) > 0
                ? Number((meta.orcamento_previsto / kpi.valor_meta).toFixed(2))
                : 0;

            kpi.fonte_dados = {
              ...fonte,
              modulo: "infraestrutura",
              metrica: "maquinas_adquiridas",
              query_parametros: {
                ...(fonte.query_parametros || {}),
                ...(custoDerivado > 0 ? { custo_unitario: custoDerivado } : {}),
              },
            };
            kpi.unidade = "uni";
            kpiAlterado = true;
          }

          // Garante custo unitário na métrica de máquinas, quando possível.
          if (kpi.fonte_dados&&
            kpi.fonte_dados.modulo === "infraestrutura" &&
            METRICAS_UNIDADE_ITEM.has(kpi.fonte_dados.metrica)
          ) {
            const custoAtual = Number(kpi.fonte_dados.query_parametros?.custo_unitario || 0);
            if (custoAtual <= 0 && meta.orcamento_previsto && (kpi.valor_meta || 0) > 0) {
              const custoDerivado = Number((meta.orcamento_previsto / kpi.valor_meta).toFixed(2));
              kpi.fonte_dados = {
                ...kpi.fonte_dados,
                query_parametros: {
                  ...(kpi.fonte_dados.query_parametros || {}),
                  custo_unitario: custoDerivado,
                },
              };
              kpiAlterado = true;
            }
            if (kpi.unidade !== "uni") {
              kpi.unidade = "uni";
              kpiAlterado = true;
            }
          }

          // Recalcula valor automático após correções.
          if(kpi.fonte_dados)
          {
            const novoValor = await this.calcularValorKPI(kpi.fonte_dados);
            if (novoValor !== null && novoValor !== kpi.valor_atual) {
              const valorPercentual=(novoValor*(kpi.peso??0)/100)
              kpi.valor_atual += valorPercentual;
              recalculados += 1;
              kpiAlterado = true;
            }

            if (kpiAlterado) {
              kpi.ultima_atualizacao = now;
              novosKpis[i] = { ...kpi };
              metaTeveMudanca = true;
              kpisCorrigidos += 1;
            }
          }

          if (metaTeveMudanca) {
            const progresso = await this.calcularProgressoMeta({
              ...meta,
              kpis: novosKpis,
            } as Meta);
            const status = this.getStatusFromProgresso(meta, progresso);
            await estrategiaMetaService.updateMeta(meta.id, {
              kpis: novosKpis,
              progresso,
              status,
            });
            metasAtualizadas += 1;
          }
          }
          
      }

      localStorage.setItem(runKey, todayKey);
      
      return { skipped: false, metasAtualizadas, kpisCorrigidos, recalculados };
    } catch (error) {
      console.error("❌ Erro no backfill de KPI:", error);
      return { skipped: false, metasAtualizadas: 0, kpisCorrigidos: 0, recalculados: 0, error: true };
    }
  },

  getStatusFromProgresso(meta: Meta, progresso: number): Meta["status"] {
    if (meta.status === "suspensa" || meta.status === "atrasada") {
      return meta.status;
    }
    if (progresso >= 100) return "concluida";
    if (progresso > 0 && meta.status === "nao_iniciada") return "em_andamento";
    return meta.status;
  },


  async removeKPI(metaId: string, kpiId: string) {
    const meta = await estrategiaMetaService.getMetasID(metaId);
    if (!meta || !meta.kpis) return;

    const kpi = meta.kpis.length == 1 ? [] : meta.kpis.filter((k) => k.id !== kpiId);
    meta.kpis = kpi;

    const progresso = await this.calcularProgressoMeta(meta);
    await estrategiaMetaService.updateMeta(metaId, {
      kpis: kpi,
      progresso: progresso,
    });
  },

  async updateKPI(
    metaId: string,
    kpiId: string,
    kpi: IndicadorDesempenho
  ): Promise<void> {
    try {
      const meta = await estrategiaMetaService.getMetasID(metaId);
      if (!meta || !meta.kpis) return;

      const kpiIndex = meta.kpis.findIndex((k) => k.id === kpiId);
      if (kpiIndex >= 0) {
        meta.kpis[kpiIndex] = { ...kpi };
        meta.kpis[kpiIndex].ultima_atualizacao = new Date().toISOString();

        const progresso = await this.calcularProgressoMeta(meta);

        await estrategiaMetaService.updateMeta(metaId, {
          kpis: meta.kpis,
          progresso: progresso,
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar KPI:", error);
      throw error;
    }
  },

  async addKPI(
    metaId: string,
    kpiData: Omit<NonNullable<Meta["kpis"]>[number], "id" | "ultima_atualizacao">
  ): Promise<void> {
    try {
      const meta = await estrategiaMetaService.getMetasID(metaId);
      if (!meta) return;

      const novoKPI: NonNullable<Meta["kpis"]>[number] = {
        id: generateUniqueId(),
        ...kpiData,
        ultima_atualizacao: new Date().toISOString(),
      };

      const kpisAtualizados = meta.kpis ? [...meta.kpis, novoKPI] : [novoKPI];

      await estrategiaMetaService.updateMeta(metaId, { kpis: kpisAtualizados });
    } catch (error) {
      console.error("Erro ao adicionar KPI:", error);
      throw error;
    }
  },

  async calcularProgressoMeta(meta: Meta): Promise<number> {
    let progressoTotal = 0;
    let componentesAtivos = 0;
    const prSec = [
      meta.kpis && meta.kpis.length > 0,
      meta.orcamento_previsto && meta.orcamento_previsto > 0,
    ];

    if (prSec[0] && meta.kpis) {
      let progressoKPIs = 0;
      let pesoTotal = 0;

      meta.kpis.forEach((kpi) => {
        const peso = kpi.peso || 1;
        const progressoKPI =
          kpi.valor_meta > 0 ? Math.min((kpi.valor_atual / kpi.valor_meta) * 100, 100) : 0;

        progressoKPIs += progressoKPI * peso;
        pesoTotal += peso;
      });

      const mediaKPIs = pesoTotal > 0 ? progressoKPIs / pesoTotal : 0;
      progressoTotal += mediaKPIs * (prSec[0] && prSec[1] ? 0.5 : 1);
      componentesAtivos++;
    }

    if (prSec[1] && meta.orcamento_previsto) {
      const orcamentoAlocado = meta.orcamento_alocado || 0;
      const progressoOrcamento = Math.min(
        (orcamentoAlocado / meta.orcamento_previsto) * 100,
        100
      );
      progressoTotal += progressoOrcamento * (prSec[0] && prSec[1] ? 0.5 : 1);
      componentesAtivos++;
    }

    if (componentesAtivos === 0) return 0;

    const progressoFinal = Math.min(progressoTotal, 100);
    return Number(progressoFinal.toFixed(1));
  },

  async alocarRecursos(
    metaId: string,
    alocacaoData: {
      valor: number;
      motivo: string;
      tipo: "complementar" | "completo" | "parcial";
      responsavel: string;
    }
  ): Promise<void> {
    try {
      const meta = await estrategiaMetaService.getMetasID(metaId);
      if (!meta) throw new Error("Meta não encontrada");

      const alocacao = {
        id: generateUniqueId(),
        data: new Date().toISOString(),
        ...alocacaoData,
      };

      const novoOrcamentoAlocado = (meta.orcamento_alocado || 0) + alocacaoData.valor;

      const alocacoesAtualizadas = meta.alocacoes ? [...meta.alocacoes, alocacao] : [alocacao];

      const metaAtualizada = await estrategiaMetaService.getMetasID(metaId);
      const progresso = metaAtualizada ? await this.calcularProgressoMeta(metaAtualizada) : meta.progresso || 0;

      await estrategiaMetaService.updateMeta(metaId, {
        orcamento_alocado: novoOrcamentoAlocado,
        alocacoes: alocacoesAtualizadas,
        progresso,
      });

      await transacaoService.createTransacao({
        categoria: "investimento",
        data: new Date().toISOString(),
        descricao: `Alocação para meta: ${meta.titulo} - ${alocacaoData.motivo}`,
        tipo: "saida",
        valor: alocacaoData.valor,
      });

      } catch (error) {
      console.error("Erro ao alocar recursos:", error);
      throw error;
    }
  },

  async coletarDadosKPIs(): Promise<void> {
    try {
      const metas = await estrategiaMetaService.getMetas();
      const hoje = new Date();

      for (const meta of metas) {
        if (!meta.kpis || meta.status === "concluida" || meta.status === "suspensa") continue;

        let metaAtualizada = false;
        const kpisAtualizados = [...(meta.kpis || [])];

        for (let i = 0; i < kpisAtualizados.length; i++) {
          const kpi = kpisAtualizados[i];

          const precisaAtualizar = this.verificarNecessidadeAtualizacao(
            kpi.frequencia,
            kpi.ultima_atualizacao
          );

          if (precisaAtualizar && kpi.fonte_dados) {
            if ((kpi.peso ?? 0) <= 0) {
              continue;
            }
            const novoValor = await this.calcularValorKPI(kpi.fonte_dados);
            if (novoValor !== null && novoValor !== kpi.valor_atual) {
              if (this.isKpiFinanceiro(meta, kpi) && METRICAS_PERCENTUAIS.has(kpi.fonte_dados.metrica || "")) {
                const instituicaoId = instituicaoIdValue() || "global";
                const periodo = this.getPeriodoAtualizacao(kpi.frequencia, new Date());
                const chaveAviso = `kpi_financeiro_aviso_${instituicaoId}_${meta.id}_${kpi.id}_${periodo}`;
                if (!localStorage.getItem(chaveAviso) && novoValor > Number(kpi.valor_atual || 0)) {
                  try {
                    const instituicaoId = instituicaoIdValue() || "";
                    const link = `/estrategia/metas/${meta.id}/overview`;
                    const corpo = `Meta: ${meta.titulo} | KPI: ${kpi.nome}. Valor atual ${Number(kpi.valor_atual || 0).toFixed(2)}${kpi.unidade || ""} → novo ${Number(novoValor).toFixed(2)}${kpi.unidade || ""}.`;
                    await Promise.all([
                      notificacaoService.criarNotificacao({
                        titulo: "KPI financeiro pronto para atualizar",
                        corpo,
                        tipo: TipoNotificacao.ADMIN_FINANCEIRO,
                        prioridade: PrioridadeNotificacao.MEDIA,
                        meta: { meta_id: meta.id, kpi_id: kpi.id, novo_valor: novoValor },
                        instituicao_id: instituicaoId,
                        destinatario_tipo: "admin",
                        link
                      }),
                      notificacaoService.criarNotificacao({
                        titulo: "KPI financeiro pronto para atualizar",
                        corpo,
                        tipo: TipoNotificacao.ADMIN_FINANCEIRO,
                        prioridade: PrioridadeNotificacao.MEDIA,
                        meta: { meta_id: meta.id, kpi_id: kpi.id, novo_valor: novoValor },
                        instituicao_id: instituicaoId,
                        destinatario_tipo: "admin",
                        link
                      })
                    ]);
                    localStorage.setItem(chaveAviso, "enviado");
                  } catch (error) {
                    console.error("Erro ao notificar KPI financeiro:", error);
                  }
                }

                if (!this.confirmarAtualizacaoFinanceira(meta, kpi, novoValor)) {
                  continue;
                }
              }
              kpisAtualizados[i] = {
                ...kpi,
                valor_atual: novoValor,
                ultima_atualizacao: hoje.toISOString(),
              };
              metaAtualizada = true;
            }
          }
        }

        if (metaAtualizada) {
          await estrategiaMetaService.updateMeta(meta.id, { kpis: kpisAtualizados });
          await this.calcularProgressoMeta(meta);
        }
      }

      } catch (error) {
      console.error("❌ Erro ao coletar dados de KPIs:", error);
    }
  },

  async calcularValorKPI(fonte: Fonte): Promise<number | null> {
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);
    const turmaId = fonte.filtros?.turma_id;
    const disciplina = fonte.filtros?.disciplina_id;

    const estaNoMesAtual = (dataIso?: string) => {
      if (!dataIso) return false;
      const d = new Date(dataIso);
      return d >= inicioMes && d <= fimMes;
    };

    switch (fonte.modulo) {
      case "matriculas":
        let alunos = await alunosService.getAllStudents();
        if (turmaId) {
          alunos = alunos.filter((a) => a.turma_id === turmaId);
        }
        if (alunos.length === 0) return 0;
        switch (fonte.metrica ) {
          case "novas_matriculas":
            
            return alunos.filter((a) => a.estado === "ativo" && estaNoMesAtual(a.data_matricula)).length;
          case "cancelamentos":
            return alunos.filter(
              (a) =>
                ["desistente", "inativo", "transferido"].includes(a.estado) &&
                estaNoMesAtual(a.updated_at || a.data_matricula)
            ).length;
            break;
          case "evasao_mensal":
            const cancelados = alunos.filter(
              (a) =>
                ["desistente", "inativo", "transferido"].includes(a.estado) &&
                estaNoMesAtual(a.updated_at || a.data_matricula)
            ).length;
            return alunos.length > 0 ? (cancelados / alunos.length) * 100 : 0;
            break;
          case "retencao":
            const ativos = alunos.filter((a) => a.estado === "ativo").length;
            return alunos.length > 0 ? (ativos / alunos.length) * 100 : 0;
            break;
          default:
            return alunos.filter((a) => a.estado === "ativo").length;
        }
        
      case "frequencia":
        let frequencias = await db.frequencias.toArray();
        if (turmaId) {
          const alunosTurma = await alunosService.getAlunosPorTurma(turmaId);
          const alunosIds = new Set(alunosTurma.map((a) => a.id));
          frequencias = frequencias.filter((f) => alunosIds.has(f.aluno_id));
        }
        if (frequencias.length === 0) return 0;
        switch (fonte.metrica ) {
          case "ausencias_justificadas":
            const ausencias=frequencias.filter((freq)=> freq.justificativa&&!freq.presente)
            const todosAusentes=frequencias.filter((freq)=> !freq.presente)
            return todosAusentes.length > 0 ? (ausencias.length / todosAusentes.length) * 100 : 0;
          case "atrasos":
            const totalAtrasos = frequencias.filter((freq) => freq.presente && (freq.atraso ?? (freq.participacao === false))).length;
            return frequencias.length > 0 ? (totalAtrasos / frequencias.length) * 100 : 0;
          case "presenca_media":
            const presentesMedia = frequencias.filter((f) => f.presente).length;
            return (presentesMedia / frequencias.length) * 100;
            break;
          case "frequencia_diaria":
            const hojeIso = agora.toISOString().split("T")[0];
            const frequenciasHoje = frequencias.filter(
              (f) => f.data_aula && f.data_aula.startsWith(hojeIso)
            );
            if (frequenciasHoje.length === 0) return 0;
            const presentesHoje = frequenciasHoje.filter((f) => f.presente).length;
            return (presentesHoje / frequenciasHoje.length) * 100;
          default:
            const presentes = frequencias.filter((f) => f.presente).length;
            return (presentes / frequencias.length) * 100;
        }
      case "notas":
        let avaliacoes = await db.avaliacoes.filter((a) => !a.deleted).toArray();
        if (turmaId) {
          avaliacoes = avaliacoes.filter((a) => a.turma_id === turmaId);
        }
        if (disciplina) {
          avaliacoes = avaliacoes.filter((a) => a.disciplina === disciplina);
        }
        if (avaliacoes.length === 0) return 0;
        switch (fonte.metrica ) {
          case "media_geral":
            const somaPonderada = avaliacoes.reduce(
              (sum, av) => sum + av.nota,
              0
            );
            const somaPesos = avaliacoes.reduce((sum, av) => sum + 1, 0);
            return somaPesos > 0 ? somaPonderada / somaPesos : 0;
            break;
          case "taxa_aprovacao":
            return (avaliacoes.filter((av) => av.nota >= 10).length / avaliacoes.length) * 100;
            break;
          case "recuperacao":
            return (
              (avaliacoes.filter((av) => av.nota >= 10 && av.nota < 14).length /
                avaliacoes.length) *
              100
            );
            break;
          case "nota_maxima":
            return Math.max(...avaliacoes.map((av) => av.nota));
            break;
          case "nota_minima":
            return Math.min(...avaliacoes.map((av) => av.nota));
            break;
          default:
            return 0;
        }
      case "financeiro":
        if (!METRICAS_PERCENTUAIS.has(fonte.metrica || "")) return null;
        const transacao = await transacaoService.getAllTransactions();
        if (transacao.length === 0) return 0;
        switch (fonte.metrica ) {
          case "inadimplencia":
            const propinas = await propinaService.getAllPropinas();
            const propinasMes = propinas.filter((p) => estaNoMesAtual(p.data_vencimento));
            if (propinasMes.length === 0) return 0;
            const pendentes = propinasMes.filter(
              (p) => p.estado === "pendente" || p.estado === "atrasado"
            ).length;
            return (pendentes / propinasMes.length) * 100;
          default:
            return 0;
    
        }
        break
      default:
        return null;
    }
  },

  verificarNecessidadeAtualizacao(frequencia: string, ultimaAtualizacao?: string): boolean {
    if (!ultimaAtualizacao) return true;

    const agora = new Date();
    const ultima = new Date(ultimaAtualizacao);
    const diffHoras = (agora.getTime() - ultima.getTime()) / (1000 * 60 * 60);

    switch (frequencia) {
      case "diaria":
        return diffHoras >= 24;
      case "semanal":
        return diffHoras >= 168;
      case "mensal":
        return diffHoras >= 720;
      case "trimestral":
        return diffHoras >= 2160;
      default:
        return false;
    }
  },
};
