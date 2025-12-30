import db from "./db";

// services/database/joinService.ts
export const joinService = {
  // ✅ Join 1:1 usando Promise.all (mais simples)
  async joinOneToOne(tableName: string, id: string, foreignTable: string, foreignKey: string) {
    const record = await db.table(tableName).get(id);
    
    if (!record || !record[foreignKey]) return null;
    
    const foreignRecord = await db.table(foreignTable).get(record[foreignKey]);
    
    return {
      ...record,
      [foreignTable]: foreignRecord
    };
  },
  
  // ✅ Join 1:N usando where()
  async joinOneToMany(tableName: string, id: string, foreignTable: string, foreignKey: string) {
    const record = await db.table(tableName).get(id);
    
    if (!record) return null;
    
    const foreignRecords = await db.table(foreignTable)
      .where(foreignKey)
      .equals(id)
      .toArray();
    
    return {
      ...record,
      [`${foreignTable}_list`]: foreignRecords,
      [`total_${foreignTable}`]: foreignRecords.length
    };
  },
  
  // ✅ Join Múltiplo: Aluno com Turma, Curso e Propinas
  async getAlunoDetalhado(alunoId: string) {
    const aluno = await db.alunos.get(alunoId);
    
    if (!aluno) return null;
    
    const [turma, propinas, frequencias] = await Promise.all([
      aluno.turma_id ? db.turmas.get(aluno.turma_id) : null,
      db.propinas
        .where('aluno_id')
        .equals(alunoId)
        .and(p => !p.deleted)
        .toArray(),
      db.frequencias
        .where('aluno_id')
        .equals(alunoId)
        .toArray()
    ]);
    
    return {
      ...aluno,
      turma,
      propinas: {
        lista: propinas,
        total: propinas.length,
        pago: propinas.filter(p => p.estado === 'pago').reduce((sum, p) => sum + p.valor_pago, 0),
        pendente: propinas.filter(p => p.estado === 'pendente').reduce((sum, p) => sum + p.valor_falta, 0)
      },
      frequencias: {
        lista: frequencias,
        total: frequencias.length,
        presencas: frequencias.filter(f => f.presente).length,
        ausencias: frequencias.filter(f => !f.presente).length
      }
    };
  },
  
  // ✅ Buscar Todos com Join
  async getAllAlunosComTurmas() {
    const alunos = await db.alunos
      .where('deleted')
      .equals(false+'')
      .toArray();
    
    // Buscar todas as turmas de uma vez (mais eficiente)
    const turmaIds = [...new Set(alunos.map(a => a.turma_id).filter(Boolean))];
    const turmas = await db.turmas
      .where('id')
      .anyOf(turmaIds)
      .toArray();
    
    const turmaMap = new Map(turmas.map(t => [t.id, t]));
    
    return alunos.map(aluno => ({
      ...aluno,
      turma: aluno.turma_id ? turmaMap.get(aluno.turma_id) : null
    }));
  },
  
  // ✅ Join com Filtro: Turmas com Alunos Ativos
  async getTurmasComAlunosAtivos() {
    const turmas = await db.turmas
      .where('deleted')
      .equals(false+'')
      .toArray();
    
    const resultado = [];
    
    for (const turma of turmas) {
      const alunos = await db.alunos
        .where('turma_id')
        .equals(turma.id)
        .and(a => !a.deleted && a.estado === 'ativo')
        .toArray();
      
      resultado.push({
        ...turma,
        alunos,
        totalAlunosAtivos: alunos.length
      });
    }
    
    return resultado;
  }
};