# Capivar Skills

Pacote canônico das **skills padrão do Capivar** — Agent Skills consumíveis por qualquer
agente de IA (Claude Code, Cursor, Codex, Copilot, etc.) através da CLI do
[skills.sh](https://www.skills.sh/).

## Instalação

Todos os comandos usam `npx skills` (não precisa instalar nada globalmente).

```bash
# Instalar TODAS as skills deste repositório
npx skills add getcapivar/capivar-skills

# Instalar apenas uma skill específica
npx skills add getcapivar/capivar-skills --skill discovery

# Instalar várias skills específicas de uma vez
npx skills add getcapivar/capivar-skills --skill specify --skill create-plan

# Instalar para agentes específicos (ex.: Claude Code e Cursor)
npx skills add getcapivar/capivar-skills -a claude-code -a cursor

# Instalar globalmente (no seu home, para todos os projetos)
npx skills add getcapivar/capivar-skills --global

# Modo não-interativo (CI): sem prompts
npx skills add getcapivar/capivar-skills --all -y
```

> Você também pode usar a URL completa:
> `npx skills add https://github.com/getcapivar/capivar-skills`

### Listar antes de instalar

```bash
npx skills add getcapivar/capivar-skills --list
```

### Atualizar depois

No projeto onde as skills foram instaladas:

```bash
npx skills update                 # atualiza todas (com prompt de escopo)
npx skills update discovery       # atualiza uma skill específica
npx skills update -g              # apenas as globais
```

### Remover

```bash
npx skills remove discovery
```

## Skills incluídas

| Skill | Origem | Descrição |
|---|---|---|
| `create-prompt` | Capivar | Recebe a frase que você ia mandar para um agente de IA e devolve a **versão afiada**: contexto, restrições, critério de sucesso observável e o que **não** fazer. Só chat — **não escreve nenhum arquivo**. |
| `discovery` | Capivar | Pesquisa do domínio/codebase **antes** de decidir: ensina como a feature funciona, melhores práticas e opções. Opcional. |
| `specify` | Capivar (fork de [obra/superpowers](https://github.com/obra/superpowers)) | **Opcional.** Brainstorm colaborativo + grilling adversarial contra o glossário e os ADRs → produz `docs/specs/AAAA-MM-DD-<topic>-design.md`, entradas no `CONTEXT.md` e ADRs. Inclui o visual companion. |
| `to-prd` | Capivar (`capivar-code-docs`) | Transforma o contexto da conversa num PRD e publica como issue via `gh`. Rota de issue tracker. |
| `to-issues` | Capivar (`capivar-code-docs`) | Quebra um plano/spec/PRD em issues independentes por fatias verticais (tracer bullets), via `gh`. Rota de issue tracker. |
| `create-plan` | Capivar | Transforma uma ideia no **plano de implementação** (`docs/plans/AAAA-MM-DD-<slug>.md`): decisões fechadas, **diagrama de arquitetura de runtime**, escolhas técnicas ranqueadas com custo honesto e gatilho de migração, escopo v1 vs Fase 2, e as tarefas bite-sized com caminhos exatos, código completo e passos de verificação. Roda o grill e **não escreve nada até você aprovar**. É o caminho rápido: tudo antes dele é opcional. |
| `grill-me` | [mattpocock/skills](https://github.com/mattpocock/skills) | Entrevista implacável sobre um plano ou design. Roteador fino sobre `grilling`. |
| `grill-with-docs` | [mattpocock/skills](https://github.com/mattpocock/skills) | A mesma entrevista, mantendo `CONTEXT.md` e os ADRs afiados durante a sessão. Roteador sobre `grilling` + `domain-modeling`. É o grill que a `create-plan` escolhe quando o repo alvo tem `CONTEXT.md`. |
| `grilling` | [mattpocock/skills](https://github.com/mattpocock/skills) | O motor da entrevista: mapeia as decisões como árvore, pergunta a fronteira inteira por rodada com resposta recomendada, e termina quando a fronteira esvazia. |
| `domain-modeling` | [mattpocock/skills](https://github.com/mattpocock/skills) | Constrói e afia o modelo de domínio: desafia termos contra o glossário, escreve `CONTEXT.md` e oferece ADRs com parcimônia. |
| `subagent-driven-development` | Capivar | Executa planos de implementação com tarefas independentes na sessão atual, via subagentes. |
| `typescript-code-quality` | Capivar | Boas práticas de qualidade de código TypeScript (simplicidade primeiro, tsconfig/lint estritos, sem `any`, validação de fronteira com Zod, unions discriminadas exaustivas, tratamento de erros, async correto). Documento único e autocontido. |
| `using-git-worktrees` | [obra/superpowers](https://github.com/obra/superpowers) | Garante um workspace isolado (git worktree nativo ou fallback) antes de iniciar feature work que precisa de isolamento ou de executar um plano. |
| `requesting-code-review` | [obra/superpowers](https://github.com/obra/superpowers) | Solicita revisão de código ao concluir tarefas/features ou antes do merge, para verificar se o trabalho atende aos requisitos. |
| `finishing-a-development-branch` | [obra/superpowers](https://github.com/obra/superpowers) | Com a implementação concluída e testes passando, apresenta opções estruturadas para integrar o trabalho: merge, PR ou cleanup. |
| `caveman` | [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) | Modo de comunicação ultra-comprimido (~75% menos tokens) mantendo precisão técnica; níveis lite/full/ultra (+ wenyan). Dispara em "caveman mode" / `/caveman`. |
| `improve-codebase-architecture` | [mattpocock/skills](https://github.com/mattpocock/skills) | Escaneia o codebase por oportunidades de aprofundamento (deepening), apresenta em relatório HTML visual e faz grilling na opção escolhida. |

## Estrutura do repositório

```
skills/<nome>/SKILL.md      # cada skill; layout descoberto automaticamente pelo `npx skills add`
```

## Pipeline

As skills do fluxo principal se encadeiam nesta ordem, e cada uma cita a próxima pelo nome:

```
opcionais, em qualquer combinação — nenhum é pré-requisito:

  /create-prompt    frase → prompt afiado, no chat, zero arquivos
  /discovery        pesquisa, quando a stack ainda está aberta
  /specify          brainstorm + grill → docs/specs/
        │
        ▼
/create-plan ──► grill ──► aprovação ──► docs/plans/AAAA-MM-DD-<slug>.md
                   │        (o gate)      o primeiro arquivo do fluxo
                   │                                 │
   grill-with-docs se o alvo tem CONTEXT.md          ▼
   grill-me se não tem                   /subagent-driven-development
                                         executa as tarefas; a última
                                         cria o ARCHITECTURE.md na raiz
                                                     │
                                                     ▼
                        /requesting-code-review ──► /finishing-a-development-branch

rota issue tracker: /specify ──► /to-prd ──► /to-issues ──► /create-plan
```

`/create-plan` sozinha é um fluxo completo: planejar e já partir para a implementação. **Nenhum
arquivo é escrito antes da sua aprovação** — nem o `ARCHITECTURE.md`, que é a última tarefa do
plano e nasce durante a implementação, não durante o planejamento.

## Manutenção

### Skills autorais deste repositório

`create-prompt`, `discovery`, `specify`, `to-prd`, `to-issues`, `create-plan`,
`subagent-driven-development` e `typescript-code-quality` são mantidas **aqui** — este repositório
é a fonte de verdade delas. Edite direto em `skills/<nome>/` e commite.

- `specify` é um fork do `brainstorming` de
  [obra/superpowers](https://github.com/obra/superpowers), com o caminho de saída trocado para
  `docs/specs/`, a fase de grilling acrescentada e o visual companion (`visual-companion.md` +
  `scripts/`).
- `create-plan` é autoral, mas a Parte VII do seu template (forma da tarefa, granularidade
  bite-sized, regra de "sem placeholders") deriva do `writing-plans` do mesmo repositório.
- `to-prd` e `to-issues` foram extraídas do `capivar-code-docs` (onde se chamavam
  `capivar-to-prd` / `capivar-to-issues`) e dependem do `gh` CLI.
- `create-plan` traz auxiliares ao lado do `SKILL.md`: `template.md` (catálogo de seções),
  `review-checklist.md` (validação antes de salvar) e `example-drive-clone.md` (calibração).

### Skills vendorizadas de terceiros

`using-git-worktrees`, `requesting-code-review`, `finishing-a-development-branch`, `caveman`,
`improve-codebase-architecture`, `grill-me`, `grill-with-docs`, `grilling` e `domain-modeling` são
cópias (vendored) de repositórios upstream. Para atualizá-las, re-rode o comando de origem e
recopie a pasta resultante para `skills/<nome>/`:

```bash
npx skills add https://github.com/obra/superpowers --skill using-git-worktrees --copy -a claude-code
npx skills add https://github.com/obra/superpowers --skill requesting-code-review --copy -a claude-code
npx skills add https://github.com/obra/superpowers --skill finishing-a-development-branch --copy -a claude-code
npx skills add https://github.com/juliusbrussee/caveman --skill caveman --copy -a claude-code
npx skills add https://github.com/mattpocock/skills --skill improve-codebase-architecture --copy -a claude-code
npx skills add https://github.com/mattpocock/skills --skill grill-me --skill grill-with-docs --copy -a claude-code
npx skills add https://github.com/mattpocock/skills --skill grilling --skill domain-modeling --copy -a claude-code
# depois: mover de .claude/skills/<nome> para skills/<nome>, remover a pasta agents/ e remover .claude/
```

## Licença

As skills autorais seguem a licença do projeto Capivar. As skills vendorizadas de terceiros mantêm
o frontmatter original (autor/licença) de seus repositórios de origem.

A skill `specify` é **trabalho derivado** do `brainstorming` do
[obra/superpowers](https://github.com/obra/superpowers) (MIT, Jesse Vincent) — o texto, o checklist,
o fluxo e os scripts do visual companion vêm de lá; a Parte VII do template da `create-plan` deriva
do `writing-plans` do mesmo repositório. Crédito aos respectivos autores:
[obra/superpowers](https://github.com/obra/superpowers),
[JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman),
[mattpocock/skills](https://github.com/mattpocock/skills).
