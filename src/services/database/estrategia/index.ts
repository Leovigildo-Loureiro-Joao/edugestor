import { estrategiaBaseService } from "./baseService";
import { estrategiaKpiService } from "./kpiService";
import { estrategiaMetaService } from "./metaService";
import { estrategiaPlaneamentoService } from "./planeamentoService";
import { estrategiaProgressoService } from "./progressoService";
import { estrategiaTarefaService } from "./tarefaService";

export const estrategiaService = {
  ...estrategiaBaseService,
  ...estrategiaTarefaService,
  ...estrategiaMetaService,
  ...estrategiaPlaneamentoService,
  ...estrategiaKpiService,
  ...estrategiaProgressoService,
};
