import { estrategiaService } from ".";
import { instituicaoIdValue } from "../../../utils/getInsitituicaoID";
import { generateUniqueId } from "../../../utils/idGenarator";
import db from "../db";
import { syncManager } from "../syncManager";

export const estrategiaTarefaService = {
  async sincronizarTarefaNosPlaneamentos(tarefaId: string, instituicaoId?: string) {
    const activeInstituicaoId = instituicaoId || instituicaoIdValue();
    if (!activeInstituicaoId) return;

    const tarefa = await db.tarefas.get(tarefaId);
    if (!tarefa || tarefa.deleted) return;

    const planeamentosRelacionados = await db.planeamentos
      .filter(
        (plano: any) =>
          !plano.deleted &&
          plano.instituicao_id === activeInstituicaoId &&
          Array.isArray(plano.tarefas_ids) &&
          plano.tarefas_ids.includes(tarefaId)
      )
      .toArray();

    if (!planeamentosRelacionados.length) return;

    const now = new Date().toISOString();

    for (const plano of planeamentosRelacionados as any[]) {
      const tarefasIds = Array.isArray(plano.tarefas_ids) ? plano.tarefas_ids : [];
      const tarefasPlano = (await db.tarefas.bulkGet(tarefasIds)).filter((item) => !!item && !item.deleted);

      const concluidas = tarefasPlano.filter(
        (item) =>
          item?.concluida ||
          item?.status === "concluida" ||
          (typeof item?.percentual_conclusao === "number" && item.percentual_conclusao >= 100)
      ).length;
      const progresso = tarefasPlano.length > 0 ? Math.round((concluidas / tarefasPlano.length) * 100) : 0;
      const status = progresso >= 100 ? "concluido" : progresso > 0 ? "ativo" : "rascunho";

      await db.planeamentos.update(plano.id, {
        progresso,
        status,
        updated_at: now,
        sync_status: "pending",
      });

      await db.syncQueue.add({
        table: "planeamentos",
        instituicao_id: activeInstituicaoId,
        record_id: plano.id,
        operation: "upsert",
        status: "pending",
        created_at: now,
      });
    }
  },

  async sincronizarMetaPorTarefasRelacionadas(metaId: string, instituicaoId?: string) {
    const activeInstituicaoId = instituicaoId || instituicaoIdValue();
    if (!activeInstituicaoId || !metaId) return;

    const meta = await db.metas.get(metaId);
    if (!meta || meta.deleted || meta.instituicao_id !== activeInstituicaoId) return;

    const tarefasDaMeta = await db.tarefas
      .filter(
        (tarefa) =>
          !tarefa.deleted &&
          tarefa.instituicao_id === activeInstituicaoId &&
          tarefa.meta_id === metaId &&
          tarefa.status !== "cancelada"
      )
      .toArray();

    const progresso = tarefasDaMeta.length
      ? Math.round(
          tarefasDaMeta.reduce((acc, tarefa) => {
            if (typeof tarefa.percentual_conclusao === "number") return acc + tarefa.percentual_conclusao;
            if (tarefa.concluida || tarefa.status === "concluida") return acc + 100;
            return acc;
          }, 0) / tarefasDaMeta.length
        )
      : 0;

    const todasConcluidas =
      tarefasDaMeta.length > 0 && tarefasDaMeta.every((tarefa) => tarefa.concluida || tarefa.status === "concluida");

    const hoje = new Date();
    const existeAtrasada = tarefasDaMeta.some(
      (tarefa) =>
        !!tarefa.data_limite &&
        new Date(tarefa.data_limite) < hoje &&
        !tarefa.concluida &&
        tarefa.status !== "concluida"
    );

    let status: "nao_iniciada" | "em_andamento" | "concluida" | "atrasada" = "nao_iniciada";
    if (todasConcluidas) status = "concluida";
    else if (existeAtrasada) status = "atrasada";
    else if (progresso > 0) status = "em_andamento";

    const now = new Date().toISOString();
    await db.metas.update(metaId, {
      progresso,
      status,
      updated_at: now,
      sync_status: "pending",
    });

    await db.syncQueue.add({
      table: "metas",
      instituicao_id: activeInstituicaoId,
      record_id: metaId,
      operation: "upsert",
      status: "pending",
      created_at: now,
    });
  },

  async getResumoEstrategico() {
    try {
      const activeInstituicaoId = instituicaoIdValue();
      const [totalMetasConcluidas, tarefasPendentes, metasAtrasadas, proximasAtividades] =
        await Promise.all([
          db.metas
            .where("status")
            .equals("concluida")
            .filter((m) => m.instituicao_id === activeInstituicaoId)
            .count(),
          db.tarefas
            .filter(
              (tarefa) =>
                !tarefa.deleted &&
                !tarefa.concluida &&
                tarefa.status !== "concluida" &&
                tarefa.status !== "cancelada" &&
                tarefa.instituicao_id === activeInstituicaoId
            )
            .count(),
          db.metas
            .where("status")
            .equals("atrasada")
            .filter((m) => m.instituicao_id === activeInstituicaoId)
            .count(),
          db.tarefas
            .filter(
              (tarefa) =>
                !tarefa.deleted &&
                !tarefa.concluida &&
                tarefa.status !== "concluida" &&
                tarefa.status !== "cancelada" &&
                !!tarefa.data_limite &&
                tarefa.instituicao_id === activeInstituicaoId
            )
            .sortBy("data_limite")
        ]);

      return {
        tarefasPendentes: tarefasPendentes || 0,
        metasConcluidas: totalMetasConcluidas || 0,
        metasAtrasadas: metasAtrasadas || 0,
        proximasAtividades: (proximasAtividades || []).slice(0, 5).map((tarefa) => ({
          titulo: tarefa.titulo,
          prioridade: tarefa.prioridade === "critica" ? "alta" : (tarefa.prioridade as "alta" | "media" | "baixa"),
          data_limite: tarefa.data_limite,
        })),
      };
    } catch (error) {
      console.error("Erro ao buscar resumo estratégico:", error);
      throw error;
    }
  },

  async getTarefas() {
    try {
      const activeInstituicaoId=instituicaoIdValue()
      const tarefas = await db.tarefas.orderBy("created_at").reverse().filter(ta=>ta.instituicao_id==activeInstituicaoId).toArray();
      return tarefas || [];
    } catch (error) {
      console.error("Erro ao buscar tarefas:", error);
      throw error;
    }
  },

  async saveTarefa(tarefaData: any) {
    try {
      const activeInstituicaoId = tarefaData?.instituicao_id || instituicaoIdValue();
      const id = generateUniqueId();
      const now = new Date().toISOString();

      const tarefa = {
        ...tarefaData,
        instituicao_id: activeInstituicaoId,
        id,
        created_at: now,
        updated_at: now,
        sync_status: "pending",
        deleted: false,
      };

      await db.tarefas.put(tarefa);

      await db.syncQueue.add({
        table: "tarefas",
        record_id: id,
        operation: "upsert",
        status: "pending",
        instituicao_id: activeInstituicaoId,
        created_at: now,
      });

      if (tarefa.meta_id) {
        await this.sincronizarMetaPorTarefasRelacionadas(tarefa.meta_id, activeInstituicaoId);
      }

      return id;
    } catch (error) {
      console.error("❌ Erro ao salvar tarefa:", error);
      throw error;
    }
  },

  async updateTarefaStatus(tarefaId: string, concluida: string) {
    return this.updateTarefa(tarefaId, { status: concluida });
  },

  async syncTarefas() {
    if (navigator.onLine) {
      return Promise.all([
        syncManager.uploadTableBatch("tarefas"),
        syncManager.downloadTableBatch("tarefas", new Date(0)),
      ]);
    }

    throw new Error("sem net");
  },

  async deleteTarefa(id: string) {
    await estrategiaService.markForDelete("tarefas", id);
  },

  async updateTarefa(tarefaId: string, tarefaData: Partial<any>) {
    try {
      const existingTarefa = await db.tarefas.get(tarefaId);
      const activeInstituicaoId =
        (tarefaData as any)?.instituicao_id || existingTarefa?.instituicao_id || instituicaoIdValue();
      const updated_at = new Date().toISOString();

      await db.tarefas.update(tarefaId, {
        ...tarefaData,
        instituicao_id: activeInstituicaoId,
        updated_at,
        sync_status: "pending",
      });

      await db.syncQueue.add({
        table: "tarefas",
        instituicao_id: activeInstituicaoId,
        record_id: tarefaId,
        operation: "upsert",
        status: "pending",
        created_at: updated_at,
      });

      await this.sincronizarTarefaNosPlaneamentos(tarefaId, activeInstituicaoId);

      const metasRelacionadas = Array.from(
        new Set([(tarefaData as any)?.meta_id, existingTarefa?.meta_id].filter(Boolean))
      ) as string[];

      for (const metaRelacionada of metasRelacionadas) {
        await this.sincronizarMetaPorTarefasRelacionadas(metaRelacionada, activeInstituicaoId);
      }

      return { success: true, id: tarefaId };
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      throw error;
    }
  },
};
