
import db from "./db";
import { generateUniqueId } from "../../utils/idGenarator";
import { alunosService } from "./alunosService";
import { turmaService } from "./turmas";
import { Avaliacao } from "../../types/avaliacao";
import { Propina } from "../../types/propina";
import { instituicaoIdValue, isValidInstituicaoId } from "../../utils/getInsitituicaoID";
import { profileService } from "./profileService";
import { getPendingCount } from "../../utils/emitPendingSync";


export interface NotificacaoMeta {
  [key: string]: any;
}

type DestinatarioNotificacao = 'aluno' | 'professor' | 'admin' | 'responsavel' | 'todos';

const normalizarDestinatarioNotificacao = (destinatario?: string): DestinatarioNotificacao | undefined => {
  if (!destinatario) return undefined;
  const valor = destinatario.toLowerCase();

  if (valor === 'teacher' || valor === 'professor') return 'professor';
  if (valor === 'manager' || valor === 'admin') return 'admin';
  if (valor === 'aluno' || valor === 'user') return 'aluno';
  if (valor === 'responsavel') return 'responsavel';
  if (valor === 'todos') return 'todos';

  return undefined;
};

const normalizarRoleParaDestinatario = (role?: string): DestinatarioNotificacao | undefined =>
  normalizarDestinatarioNotificacao(role);
const getSafeInstituicaoId = (value?: string | null): string | null =>
  isValidInstituicaoId(value) ? value : null;

export enum TipoNotificacao {
  
  SISTEMA = 'sistema',
  INFO = 'info',
  ALERTA = 'alerta',
  ERRO = 'erro',
  
  
  ALUNO_FREQUENCIA = 'aluno_frequencia',
  ALUNO_AVALIACAO = 'aluno_avaliacao',
  ALUNO_FINANCEIRO = 'aluno_financeiro',
  ALUNO_EVENTO = 'aluno_evento',
  
  
  PROF_AULA = 'prof_aula',
  PROF_AVALIACAO = 'prof_avaliacao',
  PROF_FREQUENCIA = 'prof_frequencia',
  
  
  ADMIN_FINANCEIRO = 'admin_financeiro',
  ADMIN_RELATORIO = 'admin_relatorio',
  ADMIN_META = 'admin_meta'
}

export enum PrioridadeNotificacao {
  BAIXA = 'baixa',
  MEDIA = 'media',
  ALTA = 'alta',
  URGENTE = 'urgente'
}

export interface Notificacao {
  id: string;
  titulo: string;
  corpo: string;
  tipo: TipoNotificacao;
  prioridade: PrioridadeNotificacao;
  lida: boolean;
  data_envio: string;
  meta: NotificacaoMeta;
  instituicao_id: string | null;
  aluno_id?: string;
  link?:string;
  turma_id?: string;
  user_id?: string;
  destinatario_tipo?: DestinatarioNotificacao;
  referencia_id?: string;
  created_at: string;
  updated_at: string;
  sync_status: 'pending' | 'synced' | 'pending_delete' | 'failed';
  deleted: boolean;
}

export type NotificacaoFormData = Omit<Notificacao, 
  'id' | 'created_at' | 'updated_at' | 'sync_status' | 'deleted'
>;


const NOTIFICACOES_POR_PERFIL = {
  aluno: [
    TipoNotificacao.ALUNO_AVALIACAO,
    TipoNotificacao.ALUNO_FREQUENCIA,
    TipoNotificacao.ALUNO_EVENTO,
    TipoNotificacao.INFO
  ],
  professor: [
    TipoNotificacao.PROF_AULA,
    TipoNotificacao.PROF_AVALIACAO,
    TipoNotificacao.PROF_FREQUENCIA,
    TipoNotificacao.ALERTA,
    TipoNotificacao.INFO
  ],
  admin: [
    TipoNotificacao.ADMIN_FINANCEIRO,
    TipoNotificacao.ADMIN_RELATORIO,
    TipoNotificacao.ADMIN_META,
    TipoNotificacao.ALERTA,
    TipoNotificacao.ERRO,
    TipoNotificacao.SISTEMA
  ],
  responsavel: [
    TipoNotificacao.ALUNO_FREQUENCIA,
    TipoNotificacao.ALUNO_AVALIACAO,
    TipoNotificacao.ALUNO_FINANCEIRO,
    TipoNotificacao.INFO
  ]
};

export const notificacaoService = {
  
  
  async contarNotificacoesNaoLidas(){
    const profile= await profileService.getLocalProfile()
    if(profile){
      const notif=  db.notificacao.filter(not=> not.user_id===profile.id && !not.lida && !not.deleted).count()
      return notif
    }
    return 0
  },

  async criarNotificacao(notificacaoData: Partial<NotificacaoFormData>): Promise<Notificacao> {
    try {
      const now = new Date().toISOString();
      
      const notificacao: Notificacao = {
        id: generateUniqueId(),
        titulo: notificacaoData.titulo || 'Nova Notificação',
        corpo: notificacaoData.corpo || '',
        tipo: notificacaoData.tipo || TipoNotificacao.INFO,
        prioridade: notificacaoData.prioridade || PrioridadeNotificacao.BAIXA,
        lida: false,
        link:notificacaoData.link||'',
        data_envio: notificacaoData.data_envio || now,
        meta: notificacaoData.meta || {},
        instituicao_id: getSafeInstituicaoId(notificacaoData.instituicao_id || instituicaoIdValue()),
        aluno_id: notificacaoData.aluno_id,
        turma_id: notificacaoData.turma_id,
        user_id: notificacaoData.user_id,
        destinatario_tipo: normalizarDestinatarioNotificacao(notificacaoData.destinatario_tipo),
        referencia_id: notificacaoData.referencia_id,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        deleted: false
      };

      
      const hoje = now.split('T')[0];
      const similarExists = await db.notificacao
        .where('tipo')
        .equals(notificacao.tipo)
        .and(n => n.destinatario_tipo === notificacao.destinatario_tipo)
        .and(n => n.user_id === notificacao.user_id)
        .and(n => n.data_envio.startsWith(hoje))
        .and(n=> n.corpo==notificacao.corpo)
        .and(n=> n.titulo==notificacao.titulo)
        .count();
      
      if (similarExists > 0 && notificacao.prioridade !== PrioridadeNotificacao.URGENTE) {
        return notificacao;
      }
      
      await db.notificacao.put(notificacao);
      
      
      await db.syncQueue.add({
        table: 'notificacao',
        instituicao_id: getSafeInstituicaoId(notificacao.instituicao_id || instituicaoIdValue()) || '',
        record_id: notificacao.id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      
      if (notificacao.prioridade === PrioridadeNotificacao.ALTA || 
          notificacao.prioridade === PrioridadeNotificacao.URGENTE) {
        this.dispararEventoUI(notificacao);
      }

      return notificacao;
      
    } catch (error) {
      console.error('❌ Erro ao criar notificação:', error);
      throw error;
    }
  },

  
  
  async verificarNotificacoesAutomaticas() {
    
    const ultimaVerificacao = localStorage.getItem('ultima_verificacao_notif');
    const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000);
    
    if (ultimaVerificacao && new Date(ultimaVerificacao) > umaHoraAtras) {
      return;
    }
    
    try {
      
      await this.verificarFrequenciasPendentes();
      
      
      await this.verificarAvaliacoesProximas();
      
      
      await this.verificarPagamentosProximos();
      
      
      await this.verificarEventosHoje();
      
      
      await this.verificarMetasProximas();

      
      await this.verificarTurmasEstado();

      
      await this.verificarPlanosAulaPendentes();

      
      await this.verificarPending();
      
      localStorage.setItem('ultima_verificacao_notif', new Date().toISOString());
      } catch (error) {
      console.error('❌ Erro nas verificações automáticas:', error);
    }
  },

  async verificarTurmasEstado(){
      const turmas=turmaService.getTurmas();
      (await turmas).forEach((turma)=>{
        if(!turma.horarios||turma.horarios.length==0)
        this.criarNotificacaoAdmin({
          corpo:`Adicione um horario a turma ${turma.nome_turma} de forma a teres mais controle`,
          titulo:"Horarios das turmas",
          prioridade:PrioridadeNotificacao.MEDIA,
          tipo:TipoNotificacao.SISTEMA,
          link:"/turmas/"+turma.id
        })
      })
     
  },

  async verificarPlanosAulaPendentes() {
    const [turmas, cursos, planos] = await Promise.all([
      db.turmas.filter((turma) => !turma.deleted).toArray(),
      db.cursos.filter((curso) => !curso.deleted && curso.ativo).toArray(),
      db.plano_aulas.filter((plano) => !plano.deleted).toArray()
    ]);

    const turmasComPlano = new Set<string>();

    planos.forEach((plano: any) => {
      if (Array.isArray(plano.turma_ids)) {
        plano.turma_ids.forEach((turmaId: string) => turmasComPlano.add(turmaId));
      }
    });

    
    for (const turma of turmas) {
      if (turmasComPlano.has(turma.id)) continue;

      await this.criarNotificacaoAdmin({
        titulo: 'Plano de aula em falta',
        corpo: `A turma ${turma.nome_turma} ainda não possui plano de aula.`,
        prioridade: PrioridadeNotificacao.MEDIA,
        tipo: TipoNotificacao.SISTEMA,
        link: '/aulas/planos',
        meta: { turma_id: turma.id, curso_id: turma.curso_id }
      });
    }

    
    for (const curso of cursos) {
      const turmasDoCurso = turmas.filter((turma) => turma.curso_id === curso.id);
      if (turmasDoCurso.length === 0) continue;

      const cursoTemPlano = turmasDoCurso.some((turma) => turmasComPlano.has(turma.id));
      if (cursoTemPlano) continue;

      await this.criarNotificacaoAdmin({
        titulo: 'Curso sem plano de aula',
        corpo: `Crie plano(s) de aula para o curso ${curso.nome}.`,
        prioridade: PrioridadeNotificacao.MEDIA,
        tipo: TipoNotificacao.SISTEMA,
        link: '/aulas/planos',
        meta: { curso_id: curso.id, turmas_ids: turmasDoCurso.map((turma) => turma.id) }
      });
    }
  },

  async verificarPending(){
      const tables = [
        'alunos', 'turmas', 'cursos', 'transacoes', 'aulas', 
        'propina', 'frequencias', 'tarefas', 'metas', 'rotinas',
        'evento', 'profiles', 'instituicao', 'notificacao','avaliacoes','turma_horarios'
      ];
      for (const table of tables) {
        const count=await getPendingCount(table)
        if (count>0) {
          this.criarNotificacao(
            {
               titulo: 'Sicronize com a internet',
                corpo: `Possuis dados pendentes da secção ${table} `,
                tipo: TipoNotificacao.ALERTA,
                prioridade: PrioridadeNotificacao.ALTA,
                destinatario_tipo: 'todos',
            }
          )
        }
        
      }
      
     
  },
  
  async verificarFrequenciasPendentes() {
    const hoje = new Date().toISOString().split('T')[0];
    const aulasHoje = await db.aulas
      .where('data_aula')
      .equals(hoje)
      .toArray();
    
    for (const aula of aulasHoje) {
      const frequenciaRegistrada = await db.frequencias
        .where('aula_id')
        .equals(aula.id)
        .count();
      
      if (frequenciaRegistrada === 0) {
        
        const horaAula = new Date(`${hoje}T${aula.hora_inicio}`);
        const umaHoraDepois = new Date(horaAula.getTime() + 60 * 60 * 1000);
        const profile=await profileService.getLocalProfile()
        if (new Date() > umaHoraDepois && profile) {
          
          await this.criarNotificacao({
            titulo: 'Frequência pendente',
            corpo: `Registre a frequência da aula de ${aula.disciplina || 'hoje'}`,
            tipo: TipoNotificacao.PROF_FREQUENCIA,
            prioridade: PrioridadeNotificacao.MEDIA,
            user_id: profile.id,
            destinatario_tipo: 'professor',
            referencia_id: aula.id,
            link: '/frequencia',
            meta: { aula_id: aula.id, turma_id: aula.turma_id }
          });
        }
      }
    }
  },
  
  async verificarAvaliacoesProximas() {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const dataAmanha = amanha.toISOString().split('T')[0];
    
    const avaliacoesAmanha = await db.avaliacoes
      .where('data_avaliacao')
      .equals(dataAmanha)
      .and(av => !av.deleted)
      .toArray();
    
    
    const turmasMap = new Map();
    avaliacoesAmanha.forEach((av:Avaliacao) => {
      if (!turmasMap.has(av.turma_id)) {
        turmasMap.set(av.turma_id, []);
      }
      turmasMap.get(av.turma_id).push(av);
    });
    
    
    for (const [turmaId, avaliacoes] of turmasMap.entries()) {
      const alunosTurma = await db.alunos
        .where('turma_id')
        .equals(turmaId)
        .and(aluno => !aluno.deleted)
        .toArray();
      
      const disciplinas = [...new Set(avaliacoes.map((a:Avaliacao) => a.disciplina))];
      const mensagem = `Avaliação${disciplinas.length > 1 ? 's' : ''} de ${disciplinas.join(', ')}`;
      
      for (const aluno of alunosTurma) {
        await this.criarNotificacao({
          titulo: 'Avaliação agendada para amanhã',
          corpo: mensagem,
          tipo: TipoNotificacao.ALUNO_AVALIACAO,
          prioridade: PrioridadeNotificacao.MEDIA,
          aluno_id: aluno.id,
          destinatario_tipo: 'aluno',
          turma_id: turmaId,
          link: '/notas',
          meta: { avaliacoes_ids: avaliacoes.map((a:Avaliacao) => a.id) }
        });
      }
      
      
      if (avaliacoes[0].professor_id) {
        await this.criarNotificacao({
          titulo: 'Avaliação para aplicar amanhã',
          corpo: `Prepare ${disciplinas.length > 1 ? 'as' : 'a'} avaliação${disciplinas.length > 1 ? 's' : ''}`,
          tipo: TipoNotificacao.PROF_AVALIACAO,
          prioridade: PrioridadeNotificacao.MEDIA,
          user_id: avaliacoes[0].professor_id,
          destinatario_tipo: 'professor',
          turma_id: turmaId,
          link: '/notas'
        });
      }
    }
  },
  
  async verificarPagamentosProximos() {
    const local= await profileService.getLocalProfile();
    if(local?.role==="teacher")
      return null
    const tresDias = new Date();
    tresDias.setDate(tresDias.getDate() + 3);
    const dataLimite = tresDias.toISOString().split('T')[0];
    
    const propinasVencendo = await db.propina
      .where('data_vencimento')
      .belowOrEqual(dataLimite)
      .and(propina => propina.estado === 'pendente')
      .and(propina => !propina.deleted)
      .toArray();
    
    
    const alunosMap = new Map();
    propinasVencendo.forEach((propina:Propina) => {
      if (!alunosMap.has(propina.aluno_id)) {
        alunosMap.set(propina.aluno_id, []);
      }
      alunosMap.get(propina.aluno_id).push(propina);
    });
    
    for (const [alunoId, propinas] of alunosMap.entries()) {
      const aluno = await db.alunos.get(alunoId);
      if (!aluno) continue;
      
      const total = propinas.reduce((sum:Propina, p:any) => sum + (p.valor || 0), 0);
      
      await this.criarNotificacao({
        titulo: 'Pagamento próximo do vencimento',
        corpo: `${aluno.nome_completo}: ${propinas.length} pagamento(s) totalizando R$ ${total.toFixed(2)}`,
        tipo: TipoNotificacao.ALUNO_FINANCEIRO,
        prioridade: PrioridadeNotificacao.MEDIA,
        instituicao_id: instituicaoIdValue() || null,
        aluno_id: alunoId,
        
        destinatario_tipo: 'admin',
        link: '/financeiro/pagamentos',
        meta: { 
          propinas_ids: propinas.map((p:any) => p.id),
          valor_total: total,
          quantidade: propinas.length
        }
      });
    }
    
    
    if (propinasVencendo.length > 10) {
      await this.criarNotificacao({
        titulo: 'Resumo financeiro',
        corpo: `${propinasVencendo.length} pagamentos próximos do vencimento`,
        tipo: TipoNotificacao.ADMIN_FINANCEIRO,
        prioridade: PrioridadeNotificacao.BAIXA,
        destinatario_tipo: 'admin',
        link: '/financeiro',
        meta: { total_pagamentos: propinasVencendo.length }
      });
    }
  },
  
  async verificarEventosHoje() {
    const hoje = new Date().toISOString().split('T')[0];
    
    const eventosHoje = await db.evento
      .where('data_evento')
      .equals(hoje)
      .and(evento => !evento.deleted)
      .toArray();
    
    for (const evento of eventosHoje) {
      if (evento.turma_id) {
        
        const alunosTurma = await db.alunos
          .where('turma_id')
          .equals(evento.turma_id)
          .and(aluno => !aluno.deleted)
          .toArray();
        
        for (const aluno of alunosTurma) {
          await this.criarNotificacao({
            titulo: 'Evento hoje',
            corpo: evento.titulo || 'Evento da turma',
            tipo: TipoNotificacao.ALUNO_EVENTO,
            prioridade: PrioridadeNotificacao.BAIXA,
            aluno_id: aluno.id,
            destinatario_tipo: 'aluno',
            turma_id: evento.turma_id,
            link: '/estrategia/eventos',
            meta: { evento_id: evento.id }
          });
        }
      } else {
        
        await this.criarNotificacao({
          titulo: 'Evento institucional hoje',
          corpo: evento.titulo || 'Evento da escola',
          tipo: TipoNotificacao.INFO,
          prioridade: PrioridadeNotificacao.BAIXA,
          destinatario_tipo: 'todos',
          link: '/estrategia/eventos',
          meta: { evento_id: evento.id }
        });
      }
    }
  },
  
  async verificarMetasProximas() {
    const local=await profileService.getLocalProfile()
    if(local?.role==="teacher" || local?.role==="manager")
      return null
    const umaSemana = new Date();
    umaSemana.setDate(umaSemana.getDate() + 7);
    
    const metasProximas = await db.metas
      .where('data_limite_real')
      .belowOrEqual(umaSemana.toISOString())
      .and(meta => meta.status === 'em_andamento')
      .and(meta => !meta.deleted)
      .toArray();
    
    for (const meta of metasProximas) {
      const diasRestantes = Math.ceil(
        (new Date(meta.data_limite_real||"").getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      await this.criarNotificacao({
        titulo: 'Meta com prazo próximo',
        corpo: `${meta.titulo}: ${diasRestantes} dia(s) restante(s)`,
        tipo: TipoNotificacao.ADMIN_META,
        prioridade: diasRestantes <= 3 ? PrioridadeNotificacao.ALTA : PrioridadeNotificacao.MEDIA,
        destinatario_tipo: 'admin',
        referencia_id: meta.id,
        link: `/estrategia/metas/${meta.id}`,
        meta: { 
          meta_id: meta.id,
          dias_restantes: diasRestantes,
          progresso: meta.progresso || 0
        }
      });
    }
  },
  
  async verificarFrequenciaBaixaAlerta() {
    
    const local=await profileService.getLocalProfile()
    if(local?.role==="teacher")
      return null
    const ultimaVerificacao = localStorage.getItem('ultima_verificacao_frequencia');
    const umaSemanaAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    if (ultimaVerificacao && new Date(ultimaVerificacao) > umaSemanaAtras) {
      return;
    }
    
    const todasFrequencias = await db.frequencias.toArray();
    const alunosMap = new Map();
    
    
    todasFrequencias.forEach(freq => {
      if (!alunosMap.has(freq.aluno_id)) {
        alunosMap.set(freq.aluno_id, { total: 0, presentes: 0 });
      }
      const dados = alunosMap.get(freq.aluno_id);
      dados.total++;
      if (freq.presente) dados.presentes++;
    });
    
    
    for (const [alunoId, dados] of alunosMap.entries()) {
      if (dados.total >= 10) { 
        const percentual = (dados.presentes / dados.total) * 100;
        
        if (percentual < 75) {
          const aluno = await db.alunos.get(alunoId);
          if (!aluno) continue;
          
          await this.criarNotificacao({
            titulo: 'Alerta de frequência',
            corpo: `${aluno.nome_completo} está com ${percentual.toFixed(1)}% de frequência`,
            tipo: TipoNotificacao.ALERTA,
            prioridade: PrioridadeNotificacao.ALTA,
            aluno_id: alunoId,
            destinatario_tipo: 'admin',
            link: '/frequencia',
            meta: { 
              frequencia_percentual: percentual,
              total_aulas: dados.total,
              aulas_presentes: dados.presentes 
            }
          });
          
          
          await this.criarNotificacao({
            titulo: 'Alerta de frequência - Aluno',
            corpo: `${aluno.nome_completo} (${aluno.turma_id}): ${percentual.toFixed(1)}%`,
            tipo: TipoNotificacao.ALERTA,
            prioridade: PrioridadeNotificacao.MEDIA,
            destinatario_tipo: 'admin',
            aluno_id: alunoId,
            turma_id: aluno.turma_id,
            link: '/frequencia'
          });
        }
      }
    }
    
    localStorage.setItem('ultima_verificacao_frequencia', new Date().toISOString());
  },
  
  
  
  async criarNotificacaoAluno(params: {
    aluno_id: string;
    titulo: string;
    corpo: string;
    tipo?: TipoNotificacao;
    prioridade?: PrioridadeNotificacao;
    meta?: NotificacaoMeta;
  }): Promise<Notificacao> {
    return this.criarNotificacao({
      ...params,
      tipo: params.tipo || TipoNotificacao.ALUNO_AVALIACAO,
      prioridade: params.prioridade || PrioridadeNotificacao.MEDIA,
      aluno_id: params.aluno_id,
      destinatario_tipo: 'aluno'
    });
  },
  
  async criarNotificacaoProfessor(params: {
    professor_id: string;
    titulo: string;
    corpo: string;
    tipo?: TipoNotificacao;
    prioridade?: PrioridadeNotificacao;
    meta?: NotificacaoMeta;
  }): Promise<Notificacao> {
    return this.criarNotificacao({
      ...params,
      tipo: params.tipo || TipoNotificacao.PROF_AULA,
      prioridade: params.prioridade || PrioridadeNotificacao.MEDIA,
      user_id: params.professor_id,
      destinatario_tipo: 'professor'
    });
  },
  
  async criarNotificacaoAdmin(params: {
    titulo: string;
    corpo: string;
    tipo?: TipoNotificacao;
    prioridade?: PrioridadeNotificacao;
    meta?: NotificacaoMeta;
    link?:string
  }): Promise<Notificacao> {
    const instituicao_id=instituicaoIdValue() || null
    const profile=await profileService.getLocalProfile()

      return this.criarNotificacao({
        ...params,
        instituicao_id,
        user_id:profile?profile.id:"",
        tipo: params.tipo || TipoNotificacao.ADMIN_RELATORIO,
        prioridade: params.prioridade || PrioridadeNotificacao.MEDIA,
        destinatario_tipo: 'admin',
        link:params.link||""
      });
    
  },
  
  
  
  async listarNotificacoesUsuario(userRole: string, userId?: string, alunoId?: string) {
    try {
      let query = (await db.notificacao.toArray()).filter((notif:Notificacao) => !notif.deleted);
      const roleNormalizada = normalizarRoleParaDestinatario(userRole);
      const destinatariosAceitos = new Set<string>(
        [roleNormalizada, userRole].filter((valor): valor is string => !!valor)
      );
      
      
      const tiposRelevantes = NOTIFICACOES_POR_PERFIL[roleNormalizada as keyof typeof NOTIFICACOES_POR_PERFIL] || [];
      
      if (tiposRelevantes.length > 0) {
        query = query.filter((notif:Notificacao) => 
          tiposRelevantes.includes(notif.tipo) || 
          notif.destinatario_tipo === 'todos' ||
          destinatariosAceitos.has(notif.destinatario_tipo || '')
        );
      }
      
      
      if (userId) {
        query = query.filter((notif:Notificacao) => 
          notif.user_id === userId || 
          notif.destinatario_tipo === 'todos' ||
          destinatariosAceitos.has(notif.destinatario_tipo || '')
        );
      }
      
      if (alunoId) {
        query = query.filter((notif:Notificacao) => 
          notif.aluno_id === alunoId ||
          notif.destinatario_tipo === 'todos'
        );
      }
      
      return query.sort((a, b) => 
        new Date(b.data_envio).getTime() - new Date(a.data_envio).getTime()
      );
    } catch (error) {
      console.error('Erro ao listar notificações do usuário:', error);
      return [];
    }
  },
  
  async contarNotificacoesUsuario(userRole: string, userId?: string, alunoId?: string): Promise<number> {
    const notificacoes = await this.listarNotificacoesUsuario(userRole, userId, alunoId);
    return notificacoes.filter(n => !n.lida).length;
  },
  
  
  
  dispararEventoUI(notificacao: Notificacao) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nova-notificacao', {
        detail: {
          id: notificacao.id,
          titulo: notificacao.titulo,
          corpo: notificacao.corpo,
          tipo: notificacao.tipo,
          prioridade: notificacao.prioridade
        }
      }));
    }
  },
  
  async iniciarServicoNotificacoes() {
    
    await this.verificarNotificacoesAutomaticas();
    
    
    setInterval(async () => {
      await this.verificarNotificacoesAutomaticas();
    }, 60 * 60 * 1000); 
    
    
    setInterval(async () => {
      await this.verificarFrequenciaBaixaAlerta();
    }, 24 * 60 * 60 * 1000); 
    
    
    setInterval(async () => {
      await this.limparNotificacoesAntigas(30);
    }, 7 * 24 * 60 * 60 * 1000); 
  },

  
  
  async listarNotificacoes(filtros?: any): Promise<Notificacao[]> {
    
    try {
      let query = (await db.notificacao.toArray()).filter((notif:Notificacao) => !notif.deleted);

      if (filtros) {
        if (filtros.lida !== undefined) {
          query = query.filter((notif:Notificacao) => notif.lida === filtros.lida);
        }
        if (filtros.tipo) {
          query = query.filter((notif:Notificacao) => notif.tipo === filtros.tipo);
        }
        if (filtros.instituicao_id) {
          query = query.filter((notif:Notificacao) => notif.instituicao_id === filtros.instituicao_id);
        }
        if (filtros.aluno_id) {
          query = query.filter((notif:Notificacao) => notif.aluno_id === filtros.aluno_id);
        }
        if (filtros.user_id) {
          query = query.filter((notif:Notificacao) => notif.user_id === filtros.user_id);
        }
        if (filtros.data_inicio) {
          const inicio = new Date(filtros.data_inicio);
          query = query.filter((notif:Notificacao) => new Date(notif.data_envio) >= inicio);
        }
        if (filtros.data_fim) {
          const fim = new Date(filtros.data_fim);
          fim.setHours(23, 59, 59, 999);
          query = query.filter((notif:Notificacao) => new Date(notif.data_envio) <= fim);
        }
      }

      return query.sort((a, b) => 
        new Date(b.data_envio).getTime() - new Date(a.data_envio).getTime()
      );
    } catch (error) {
      console.error('Erro ao listar notificações:', error);
      return [];
    }
  },

  async buscarNotificacaoPorId(id: string): Promise<Notificacao | null> {
    try {
      const notificacao = await db.notificacao.get(id);
      return notificacao && !notificacao.deleted ? notificacao : null;
    } catch (error) {
      console.error(`Erro ao buscar notificação ${id}:`, error);
      return null;
    }
  },

  async atualizarNotificacao(id: string, dados: Partial<Notificacao>): Promise<Notificacao> {
    try {
      const now = new Date().toISOString();
      
      await db.notificacao.update(id, {
        ...dados,
        updated_at: now,
        sync_status: 'pending'
      });

      await db.syncQueue.add({
        table: 'notificacao',
        record_id: id,
        instituicao_id:instituicaoIdValue(),
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      const updated = await this.buscarNotificacaoPorId(id);
      if (!updated) throw new Error('Notificação não encontrada');
      return updated;
    } catch (error) {
      console.error(`Erro ao atualizar notificação ${id}:`, error);
      throw error;
    }
  },

  async marcarComoLida(id: string): Promise<Notificacao> {
    return this.atualizarNotificacao(id, { lida: true });
  },

  async marcarTodasComoLidas(userRole: string, userId?: string): Promise<number> {
    try {
      const notificacoes = await this.listarNotificacoesUsuario(userRole, userId);
      const naoLidas = notificacoes.filter(n => !n.lida);
      
      const now = new Date().toISOString();
      
      await Promise.all(
        naoLidas.map(async (notif) => {
          await db.notificacao.update(notif.id, {
            lida: true,
            updated_at: now,
            sync_status: 'pending'
          });

          await db.syncQueue.add({
            table: 'notificacao',
            record_id: notif.id,
            instituicao_id: getSafeInstituicaoId(notif.instituicao_id || instituicaoIdValue()) || '',
            operation: 'upsert',
            status: 'pending',
            created_at: now
          });
        })
      );

      return naoLidas.length;
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      throw error;
    }
  },

  async deletarNotificacao(id: string): Promise<void> {
    await this.markForDelete('notificacao', id);
  },

  async limparNotificacoesAntigas(dias: number = 30): Promise<number> {
    try {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - dias);
      
      const notificacoesAntigas = await db.notificacao
        .filter((notif:Notificacao) => new Date(notif.data_envio) < dataLimite&&!notif.deleted)
        .toArray();

      await Promise.all(
        notificacoesAntigas.map(notif => this.deletarNotificacao(notif.id))
      );

      return notificacoesAntigas.length;
    } catch (error) {
      console.error('Erro ao limpar notificações antigas:', error);
      throw error;
    }
  },

  
  
  async markForDelete(table:  "notificacao" , id: string): Promise<void> {
    try {
      const record = await db[table].get(id);
      if (!record) return;

      if (record.sync_status === 'synced' && !record.id.startsWith('local_')) {
        await db[table].update(id, { 
          deleted: true, 
          sync_status: 'pending_delete',
          updated_at: new Date().toISOString()
        });
        
        await db.syncQueue.add({
          table,
          instituicao_id: getSafeInstituicaoId(record.instituicao_id || instituicaoIdValue()) || '',
          record_id: id,
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        } else {
        await db[table].delete(id);
        
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .delete();
          
        }
    } catch (error) {
      console.error(`Erro ao deletar ${table}:`, error);
      throw error;
    }
  }
};
