-- Adiciona data_inicio_estudos para controlar início da cobrança de propinas
-- Alunos inscritos mas que ainda não começaram a estudar não devem gerar inadimplência
ALTER TABLE alunos
ADD COLUMN IF NOT EXISTS data_inicio_estudos date;

-- Backfill: para alunos existentes sem valor, assume data_matricula como início
UPDATE alunos
SET data_inicio_estudos = data_matricula::date
WHERE data_inicio_estudos IS NULL AND data_matricula IS NOT NULL;

-- Índice para filtros por data de início (opcional)
CREATE INDEX IF NOT EXISTS idx_alunos_data_inicio_estudos ON alunos(data_inicio_estudos);
