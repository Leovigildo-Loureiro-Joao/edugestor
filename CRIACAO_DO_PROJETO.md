# Criacao do Projeto EduGestor

O EduGestor nasceu da necessidade de criar um sistema escolar mais proximo da realidade diaria de uma instituicao de ensino: gestao de alunos, turmas, cursos, pagamentos, presencas, avaliacoes, configuracoes academicas e acompanhamento geral por meio de dashboard. A ideia principal foi construir uma ferramenta que ajudasse a escola a organizar melhor os seus processos, mantendo uma visao clara do ano letivo, da situacao dos alunos e da saude financeira da instituicao.

Desde o inicio, o objetivo nao foi apenas criar telas bonitas, mas criar um sistema que funcionasse na pratica. O projeto foi pensado para lidar com dados locais, sincronizacao, estados academicos, pagamentos e operacoes administrativas. Por isso, uma das decisoes mais importantes foi combinar uma base remota com uma base local, usando Supabase e Dexie.

## Tecnologias Utilizadas

O projeto foi desenvolvido principalmente com:

- React para construcao da interface.
- TypeScript para dar mais seguranca aos dados e componentes.
- Vite para desenvolvimento rapido.
- Tailwind CSS para estilizar as telas.
- Dexie para trabalhar com IndexedDB e permitir funcionamento local/offline.
- Supabase para autenticacao, armazenamento remoto e sincronizacao dos dados.
- Framer Motion para pequenas animacoes e transicoes.
- React Icons e Lucide para icones da interface.
- Recharts e Chart.js para graficos e indicadores.

A arquitetura foi sendo criada com separacao entre componentes, paginas, servicos de banco de dados, tipos e utilitarios. Isso ajudou a manter o projeto mais organizado conforme novas funcionalidades foram aparecendo.

## Uso de IA no Desenvolvimento

Durante o desenvolvimento, usei IA como ferramenta de apoio para automatizar partes do processo, acelerar escrita de codigo, revisar ideias e resolver problemas mais rapidamente. Ainda assim, procurei manter o controle da visao do projeto. A IA ajudou bastante, mas percebi que o design e as decisoes principais precisam continuar com uma direcao humana.

Uma das aprendizagens mais importantes foi perceber que, mesmo usando IA, o produto ganha mais identidade quando o criador acompanha o desenho das telas, escolhe os fluxos e ajusta a experiencia com base no contexto real da instituicao. A IA pode acelerar, mas a identidade do sistema vem das escolhas feitas com intencao.

Gostei dessa pratica porque permitiu avancar bastante, mas tambem mostrou que uma proxima versao deve nascer com um planeamento mais alinhado desde o principio: regras, modulos, permissao dos usuarios, fluxos financeiros, ano letivo e rotinas academicas. A expectativa e criar uma versao mais forte, ainda mais conectada ao funcionamento real de uma escola.

## Principais Desafios

Um dos desafios mais marcantes foi o modo dark. A interface precisava funcionar bem tanto no tema claro quanto no escuro, sem perder legibilidade, contraste ou consistencia visual. Ajustar cores, fundos, bordas, inputs, cards e textos exigiu bastante cuidado, porque um componente pode parecer bom no modo claro e ficar fraco no modo dark.

Outro desafio importante foram os selects personalizados. Em vez de depender apenas de campos simples do navegador, o projeto passou a usar selects mais integrados ao estilo visual do sistema. Isso trouxe mais controle sobre a experiencia, mas tambem exigiu atencao com valores, estados, atualizacoes do formulario e compatibilidade com diferentes telas.

A primeira iteracao com Supabase e Dexie tambem foi um ponto importante. O Supabase trouxe a parte remota e a autenticacao, enquanto o Dexie permitiu guardar dados no navegador e trabalhar com uma experiencia mais resistente a falhas de conexao. No inicio, foi preciso entender bem como estruturar as tabelas locais, como criar indices, como controlar sincronizacao e como evitar conflitos entre dados locais e dados remotos.

## Como o Sistema Funciona

O EduGestor trabalha com dados da instituicao ativa. Ao fazer login, o sistema identifica a instituicao do usuario e usa esse identificador para filtrar alunos, turmas, cursos, pagamentos e outras informacoes. Essa separacao e importante para que cada escola veja apenas os seus proprios dados.

Os dados principais ficam no IndexedDB por meio do Dexie. Isso permite que o sistema continue acessando informacoes locais e preparando alteracoes mesmo antes de sincronizar tudo com o Supabase. Quando uma acao precisa ir para a nuvem, ela entra numa fila de sincronizacao. Depois, o sistema envia ou baixa os dados conforme a disponibilidade da conexao.

O sistema tambem usa um dashboard para mostrar indicadores importantes, como alunos, pagamentos, inadimplencia, presencas, aulas e desempenho. Com a abertura de um novo ano letivo, o dashboard passa a ter mais importancia, porque mostra o ano atual, alunos aguardando ativacao, turmas ativas e cursos disponiveis.

## Regras de Alunos Ativos e Inativos

O estado do aluno e uma parte essencial do sistema. Um aluno pode estar ativo, inativo, transferido, desistente ou pendente, dependendo do fluxo academico.

Quando um aluno esta ativo, significa que ele esta confirmado para o periodo academico em uso e pode aparecer normalmente nas rotinas da escola, como pagamentos, presencas, avaliacoes e relatatorios.

Quando um aluno fica inativo, isso pode indicar que ele ainda nao foi confirmado no ano letivo atual, que a sua ativacao depende de uma data futura ou que a instituicao precisa fazer uma renovacao manual. Esse comportamento e util quando se abre um novo ano letivo, porque nem todos os alunos antigos devem continuar automaticamente sem revisao.

Alunos transferidos ou desistentes sao preservados como historico, mas nao devem ser tratados como alunos ativos nas operacoes normais. Isso ajuda a manter os dados organizados sem perder informacoes importantes.

No caso de alunos regulares, o sistema considera o ano letivo e a data de ativacao academica. Se o ano letivo ainda nao comecou, o aluno pode ficar inativo por padrao. Mas tambem existe a possibilidade de ativar manualmente quando a instituicao decide confirmar esse aluno.

## Ano Letivo

A abertura de um novo ano letivo e um dos fluxos mais importantes. Ela atualiza a configuracao academica da instituicao, permite selecionar turmas e cursos que continuam ativos e pode colocar alunos antigos em estado de espera para renovacao.

Esse processo evita que o sistema trate automaticamente todos os alunos do ano anterior como ativos no novo periodo. A ideia e dar mais controle para a escola: confirmar quem continua, ajustar turmas, rever cursos e manter uma visao limpa do novo ciclo.

Com isso, o dashboard passa a funcionar como um painel de acompanhamento da transicao. Ele ajuda a responder perguntas como:

- Qual e o ano letivo atual?
- Quantos alunos ja estao no novo ano?
- Quantos alunos ainda aguardam ativacao?
- Quantas turmas estao ativas neste ano?
- Quantos cursos continuam disponiveis?

## Visao Para uma Proxima Versao

Depois desta primeira experiencia, ficou claro que uma versao futura pode ser ainda melhor se comecar com um planeamento mais forte. A proxima versao deve partir de um desenho mais alinhado com a instituicao, considerando regras academicas, calendario, financeiro, permissoes, relatorios e processos administrativos desde o inicio.

A meta e transformar o EduGestor em um gestor escolar mais completo, ligado a um planeamento institucional forte. Um sistema que nao apenas guarde dados, mas ajude a escola a pensar, decidir e acompanhar o seu crescimento.

Esta primeira versao foi uma pratica valiosa. Ela mostrou os desafios tecnicos, os limites do improviso, a forca da automacao com IA e a importancia de manter uma direcao humana no produto. O resultado e uma base funcional, com espaco para evoluir para algo mais maduro, organizado e conectado a realidade escolar.
