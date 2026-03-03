import db from "../services/database/db";

export async function  getLastModifiedTimestamp(): Promise<number> {
  try {
    // Buscar o timestamp da última modificação em qualquer tabela relevante
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
    
    // Encontrar o timestamp mais recente
    const validTimestamps = timestamps
      .filter(item => item && item.updated_at)
      .map(item => new Date(item?item.updated_at||"":"").getTime());
    
    if (validTimestamps.length > 0) {
      return Math.max(...validTimestamps);
    }
    
    // Fallback: usar timestamp atual se não houver dados
    return Date.now();
  } catch (error) {
    console.warn('⚠️ Erro ao buscar timestamps, usando fallback');
    return Date.now();
  }
}