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
npx skills add getcapivar/capivar-skills --skill specify --skill writing-plans

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
| `discovery` | Capivar (`capivar-code-docs`) | Pesquisa do domínio/codebase **antes** do `/specify`: ensina como a feature funciona, melhores práticas e opções. |
| `specify` | Capivar (`capivar-code-docs`) | Brainstorm divergente + grilling adversarial → produz CONTEXT.md, ADRs e o trio de spec (requirements/design/tasks). |
| `writing-plans` | Capivar (fork de `capivar-writing-plans`) | Preenche o `tasks.md` do trio de spec antes de tocar em código (tabela Progresso = fonte de verdade). |
| `subagent-driven-development` | Capivar (`capivar-code-docs`) | Executa planos de implementação com tarefas independentes na sessão atual, via subagentes. |
| `typescript-code-quality` | Capivar | Boas práticas de qualidade de código TypeScript (simplicidade primeiro, tsconfig/lint estritos, sem `any`, validação de fronteira com Zod, unions discriminadas exaustivas, tratamento de erros, async correto). Documento único e autocontido. |

## Estrutura do repositório

```
skills/<nome>/SKILL.md      # cada skill; layout descoberto automaticamente pelo `npx skills add`
scripts/sync.mjs            # sincroniza as skills de origem Capivar a partir do capivar-code-docs
```

## Manutenção

### Skills de origem Capivar (fonte de verdade: `capivar-code-docs`)

`discovery`, `specify`, `writing-plans` e `subagent-driven-development` são mantidas no
monorepo `capivar-code-docs` (`.agents/skills/`). Para trazer as versões mais recentes para
este repositório:

```bash
node scripts/sync.mjs
# fonte alternativa:
# CAPIVAR_SKILLS_SRC=/caminho/para/.agents/skills node scripts/sync.mjs

git add skills/ && git commit -m "chore: sync skills do capivar-code-docs" && git push
```

O script é **idempotente** e renomeia `capivar-writing-plans` → `writing-plans`
automaticamente. A skill `typescript-code-quality` é autoral deste repositório (não vem do
sync) e é um `SKILL.md` único e autocontido.

## Licença

As skills de origem Capivar seguem a licença do projeto Capivar. Skills que futuramente forem
vendorizadas de terceiros manterão o frontmatter original (autor/licença) de seus repositórios
de origem, com crédito aos respectivos autores.
