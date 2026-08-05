-- Adiciona a coluna observacoes_especificas à tabela alunos
ALTER TABLE alunos
ADD COLUMN IF NOT EXISTS observacoes_especificas text;
