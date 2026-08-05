import db from "../services/database/db";

export async function  getLastModifiedTimestamp(): Promise<number> {
  try {
    const timestamps = await Promise.all([
      db.alunos.orderBy('updated_at').last(),
      db.turmas.orderBy('updated_at').last(),
      db.aulas.orderBy('updated_at').last(),
      db.cursos.orderBy('updated_at').last(),
      db.frequencias.orderBy('updated_at').last(),
      db.transacoes.orderBy('updated_at').last(),
      db.propina.orderBy('updated_at').last(),
      db.avaliacoes.orderBy('updated_at').last(),
    ]);
    
    const validTimestamps = timestamps
      .filter(item => item && item.updated_at)
      .map(item => new Date(item?item.updated_at||"":"").getTime());
    
    if (validTimestamps.length > 0) {
      return Math.max(...validTimestamps);
    }
    
    return Date.now();
  } catch (error) {
    console.warn('⚠️ Erro ao buscar timestamps, usando fallback');
    return Date.now();
  }
}
