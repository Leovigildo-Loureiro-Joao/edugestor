import { alunosService } from "..";
import { METRICAS_POR_MODULO } from "../../../components/strategy/KPIManager";
import { Fonte, IndicadorDesempenho, Meta } from "../../../types/eventos";
import { generateUniqueId } from "../../../utils/idGenarator";
import { avaliacaoService } from "../avaliacao";
import db from "../db";
import { propinaService } from "../propinas";
import { transacaoService } from "../transacaoService";
import { estrategiaMetaService } from "./metaService";

export const estrategiaKpiService = {
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
    kpiData: Omit<Meta["kpis"][0], "id" | "ultima_atualizacao">
  ): Promise<void> {
    try {
      const meta = await estrategiaMetaService.getMetasID(metaId);
      if (!meta) return;

      const novoKPI: Meta["kpis"][0] = {
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

      const progresso = await this.calcularProgressoMeta(await estrategiaMetaService.getMetasID(metaId));

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

      console.log(`💰 ${alocacaoData.valor} AOA alocados para meta ${meta.titulo}`);
    } catch (error) {
      console.error("Erro ao alocar recursos:", error);
      throw error;
    }
  },

  async coletarDadosKPIs(): Promise<void> {
    try {
      console.log("📊 Coletando dados para KPIs...");

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
            const novoValor = await this.calcularValorKPI(kpi.fonte_dados);
            if (novoValor !== null && novoValor !== kpi.valor_atual) {
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

      console.log("✅ Dados de KPIs atualizados");
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
            return 0;
            break;
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
              (sum, av) => sum + av.nota * (av.peso || 1),
              0
            );
            const somaPesos = avaliacoes.reduce((sum, av) => sum + (av.peso || 1), 0);
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
            break;
          case "receita_mensal":
            return transacao
              .filter((t) => t.tipo === "entrada" && estaNoMesAtual(t.data))
              .reduce((sum, t) => sum + t.valor, 0);
            break;
          case "despesas":
            return transacao
              .filter((t) => t.tipo === "saida" && estaNoMesAtual(t.data))
              .reduce((sum, t) => sum + t.valor, 0);
            break;
          case "lucro_operacional":
            const receita = transacao
              .filter((t) => t.tipo === "entrada" && estaNoMesAtual(t.data))
              .reduce((sum, t) => sum + t.valor, 0);
            const despesas = transacao
              .filter((t) => t.tipo === "saida" && estaNoMesAtual(t.data))
              .reduce((sum, t) => sum + t.valor, 0);
            return receita - despesas;
            break;
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
