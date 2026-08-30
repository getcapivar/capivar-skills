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
| `create-prompt` | Capivar | Transforma uma ideia crua no **prompt-base** do projeto (`docs/prompts/AAAA-MM-DD-<slug>.md`): decisões fechadas, escolhas técnicas ranqueadas com custo honesto e gatilho de migração, escopo v1 vs Fase 2. Entra **antes** do `/discovery` e do `/specify`. |
| `discovery` | Capivar | Pesquisa do domínio/codebase **antes** do `/specify`: ensina como a feature funciona, melhores práticas e opções. |
| `specify` | Capivar (fork de [obra/superpowers](https://github.com/obra/superpowers)) | Brainstorm colaborativo + grilling adversarial contra o glossário e os ADRs → produz `docs/specs/AAAA-MM-DD-<topic>-design.md`, entradas no `CONTEXT.md` e ADRs. Inclui o visual companion. |
| `to-prd` | Capivar (`capivar-code-docs`) | Transforma o contexto da conversa num PRD e publica como issue via `gh`. Rota de issue tracker. |
| `to-issues` | Capivar (`capivar-code-docs`) | Quebra um plano/spec/PRD em issues independentes por fatias verticais (tracer bullets), via `gh`. Rota de issue tracker. |
| `create-plan` | Capivar (fork de [obra/superpowers](https://github.com/obra/superpowers)) | Escreve o plano de implementação em `docs/plans/AAAA-MM-DD-<feature-name>.md`: tarefas bite-sized com caminhos exatos, código completo e passos de verificação. |
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
/create-prompt → /discovery (opcional) → /specify ─┬─ enxuta ─────────────────► /create-plan
                                                    └─ issue tracker → /to-prd → /to-issues → /create-plan

/create-plan → /subagent-driven-development → /requesting-code-review → /finishing-a-development-branch
```

## Manutenção

### Skills autorais deste repositório

`create-prompt`, `discovery`, `specify`, `to-prd`, `to-issues`, `create-plan`,
`subagent-driven-development` e `typescript-code-quality` são mantidas **aqui** — este repositório
é a fonte de verdade delas. Edite direto em `skills/<nome>/` e commite.

- `specify` e `create-plan` são forks de [obra/superpowers](https://github.com/obra/superpowers)
  (`brainstorming` e `writing-plans`), com o caminho de saída trocado para `docs/specs/` e
  `docs/plans/`; a `specify` acrescenta a fase de grilling e traz o visual companion
  (`visual-companion.md` + `scripts/`).
- `to-prd` e `to-issues` foram extraídas do `capivar-code-docs` (onde se chamavam
  `capivar-to-prd` / `capivar-to-issues`) e dependem do `gh` CLI.
- `create-prompt` traz auxiliares ao lado do `SKILL.md`: `template.md` (catálogo de seções),
  `review-checklist.md` (validação antes de salvar) e `example-drive-clone.md` (calibração).

### Skills vendorizadas de terceiros

`using-git-worktrees`, `requesting-code-review`, `finishing-a-development-branch`, `caveman` e
`improve-codebase-architecture` são cópias (vendored) de repositórios upstream. Para atualizá-las,
re-rode o comando de origem e recopie a pasta resultante para `skills/<nome>/`:

```bash
npx skills add https://github.com/obra/superpowers --skill using-git-worktrees --copy -a claude-code
npx skills add https://github.com/obra/superpowers --skill requesting-code-review --copy -a claude-code
npx skills add https://github.com/obra/superpowers --skill finishing-a-development-branch --copy -a claude-code
npx skills add https://github.com/juliusbrussee/caveman --skill caveman --copy -a claude-code
npx skills add https://github.com/mattpocock/skills --skill improve-codebase-architecture --copy -a claude-code
# depois: mover de .claude/skills/<nome> para skills/<nome> e remover .claude/
```

## Licença

As skills autorais seguem a licença do projeto Capivar. As skills vendorizadas de terceiros mantêm
o frontmatter original (autor/licença) de seus repositórios de origem.

As skills `specify` e `create-plan` são **trabalhos derivados** de `brainstorming` e `writing-plans`
do [obra/superpowers](https://github.com/obra/superpowers) (MIT, Jesse Vincent) — o texto, o
checklist, o fluxo e os scripts do visual companion vêm de lá. Crédito aos respectivos autores:
[obra/superpowers](https://github.com/obra/superpowers),
[JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman),
[mattpocock/skills](https://github.com/mattpocock/skills).
