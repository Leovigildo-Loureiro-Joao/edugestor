-- Adiciona suporte a arquivamento de notificações (aniversários auto-arquivam após 7 dias ou ao clicar)
ALTER TABLE notificacao
ADD COLUMN IF NOT EXISTS arquivada boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS arquivada_em timestamp with time zone;

-- Índice para filtrar aniversários arquivados
CREATE INDEX IF NOT EXISTS idx_notificacao_arquivada ON notificacao(arquivada);
CREATE INDEX IF NOT EXISTS idx_notificacao_tipo_arquivada ON notificacao(tipo, arquivada);
