---
tipo: meio_jogo
situacao: Dexie Sync
projeto: Offline first
estado:
  - Ativo/Pausado/Em revisão/Complicado
inicio: 2025-12-30
previsao_termino:
complexidade:
  - Alta
stakeholders: []
tags:
  - processo
  - andamento
  - decisao
  - edugestor
---

# 🎯 Situação Atual: Dexie Sync

## 📍 Contexto Estratégico
---
*Onde estamos no tabuleiro geral?*
	  1. O dados do **dexie**  já estão acedendo algumas paginas 
	  2. O sistema já esta sincronizando rapidamente
	  3. Jogadas feitas mas sem noção clara
		  1. As configs ainda nao obedecem ao sistema
		  2. A tabela instituicao tem um erro pertinente
		  3. As notas nao foram ainda resolvidas
		  4. Não se testou as rotas apos adesao do dexie
		  5. As estrategias nao estao sicronizado com o dexie
		  
## 🎪 Peças em Jogo

### Recursos Disponíveis:

- Recurso 1: Telefone do Antonio das 00:00 as 06:00
- Recurso 2: DeepSeek e ChatGpt
- Recurso 3: Investimento do Henriques

### Restrições Identificadas:

- Restrição 1: Padaria me rouba meu tempo
- Restrição 2: O uso da net é limitado

### Oportunidades em Aberto:

- Oportunidade 1: O Dexie é offline e bom para cortes
- Oportunidade 2: DeepSeek a cada dia mas simplifica o trabalho

## 🗺️ Mapa da Situação Actual
### Posição Atual:

> O sistema ta numa fase de mudança de *Online-only*  para *Offline-first* 

Tabelas sincronizados com IndexDB

``` typescript
table:'alunos'|'turmas' | 'cursos' |'transacoes'|'aulas'|'propina'|'frequencias';
```

- Todas as tabelas o **CRUD** não foi testado e o *join* não foi feito de forma certa 
- Dados das turmas select é falso
- Dados Curso nao foi analisado
- Tornar a tabela nota funcionando

### Posição Desejada:

- Completar os *joins* das tabelas criando funções com retorno perfeito
- Turma e cursos e select  funcionar de forma verdadeira
- Ajustar os horarios
- Tornar tabela nota funcional assim completando o Turma select
- Ajustar as configs para permanecer para uma instituição
- Ajustar as configs do admin com o sistema

### Gap Identificado:

Actualmente as diferenças são pequenas onde 
- Os *joins* estão quase ser terminados
- Turma e os cursos vão ser corregidos
- Os horários estão em fase de pausa
- As notas estão em analise para colocar-se em pratica
- As configs estão em fase de urgencia pois eles definiam muita coisa no *Only Online*

## ⚔️ Tensões e Conflitos
### Tensão 1:
- **Partes envolvidas:** Problemas ao entender o Dexie e os *joins* 
- **Natureza do conflito:** Falta de conhecimento técnico
- **Possíveis resoluções:** Pratica antes de usar IA

### Tensão 2:
- **Partes envolvidas:** Gerar o auth e o **RLS** do sistema
- **Natureza do conflito:** Falta de conhecimento técnico
- **Possíveis resoluções:** Fazer uma simples sem muitas restrições

## ♟️ Opções de Movimento
### Opção A: JOINs Tables
- **Descrição:** Criação de Funções que eu fiz no sql e adicionarei ao meu sistema assim tornando tudo mas simples inves de usar apenas o select proprio do Dexie
- **Vantagens:** Os dados seriam logo actualizados e menos funcoes longas no service
- **Riscos:** Excesso de Funções
- **Recursos necessários:** Copiloto DeepSeek

### Opção B: View Results of the *Offline-First*
- **Descrição:**  Testar rotas do CRUD para ver se o sistema não sofreu dano e perdeu qualidade
- **Vantagens:** Corrigir os bugs do CRUD
- **Riscos:** Tempo mal destruibuido
- **Recursos necessários:** Tempo

### Opção C: Fix Configs 
- **Descrição:** Corrigir o uso das configs
- **Vantagens:** Tornar o sistema normal
- **Riscos:** modificação da forma que foi criada
- **Recursos necessários:** Tempo

## 📅 Próximas Jogadas
### Curto Prazo (Esta semana):
- [x] Join Tables
- [x] View Results of the *Offline-First*
- [x] Fix Configs

### Médio Prazo (Este mês):
- [x] Update Database
- [x] Teste Alpha

## 🚦 Indicadores de Progresso
- **Indicador 1:** 70% / Coesão dos dados
- **Indicador 2:**  80%/ CRUD  Funcionando
- **Indicador 3:** 45% / Configs mal usadas
- **Indicador 4:** 15% / USER AUTH

## 📝 Diário do Meio-Jogo
### 2025-12-30 - Última Atualização
**Movimento executado:** **Sync Tables**
**Resultado:** As tabelas 'alunos'|'turmas' | 'cursos' |'transacoes'|'aulas'|'propina'|'frequencias' foram sincronizados
**Aprendizado:** Aprende que a Sincronia dos dados com offline-first é bem complexo 
**Próximo passo:** Dominar o sync 

## 🔍 Pontos de Atenção

- Decisão pendente -  sync dos dados

## 🧩 Ligações Estratégicas
- Relacionado à abertura: [[Abertura X]]
- Impacta o final: [[Final Potencial Y]]
- Táticas aplicáveis: [[Tática Z]]

---
*Próxima avaliação: +72*