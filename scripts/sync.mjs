#!/usr/bin/env node
// Sincroniza as skills de origem Capivar a partir do projeto capivar-code-docs.
//
// Fonte de verdade: <CAPIVAR_SKILLS_SRC>/<skill>/  (default: C:\dev\capivar-code-docs\.agents\skills)
// Destino:          <repo>/skills/<skill>/
//
// Apenas as skills autorais/forkadas do Capivar sao gerenciadas aqui. As skills de
// terceiros (using-git-worktrees, requesting-code-review, finishing-a-development-branch,
// caveman, improve-codebase-architecture) NAO vivem no capivar-code-docs e sao mantidas
// via `npx skills add ...` / `npx skills update` (ver README).
//
// Uso:
//   node scripts/sync.mjs            # sincroniza usando o SOURCE_ROOT default
//   CAPIVAR_SKILLS_SRC=/outro/path node scripts/sync.mjs
//
// Idempotente: cada execucao apaga e recopia o destino a partir da fonte atual.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(REPO_ROOT, "skills");

const SOURCE_ROOT =
  process.env.CAPIVAR_SKILLS_SRC ||
  "C:\\dev\\capivar-code-docs\\.agents\\skills";

// src   = nome da pasta na fonte (capivar-code-docs)
// dest  = nome da pasta neste repo (skills/<dest>)
// rename = se definido, substitui todas as ocorrencias do token `src` por `rename`
//          dentro do SKILL.md (cobre frontmatter `name:`, heading e announce).
const SKILLS = [
  { src: "discovery", dest: "discovery" },
  { src: "specify", dest: "specify" },
  { src: "subagent-driven-development", dest: "subagent-driven-development" },
  { src: "capivar-writing-plans", dest: "writing-plans", rename: "writing-plans" },
];

function fail(msg) {
  console.error(`\n[sync] ERRO: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(SOURCE_ROOT)) {
  fail(
    `SOURCE_ROOT nao encontrado: ${SOURCE_ROOT}\n` +
      `       Defina a env CAPIVAR_SKILLS_SRC apontando para .agents/skills do capivar-code-docs.`,
  );
}

fs.mkdirSync(SKILLS_DIR, { recursive: true });

let changed = 0;
for (const skill of SKILLS) {
  const from = path.join(SOURCE_ROOT, skill.src);
  const to = path.join(SKILLS_DIR, skill.dest);

  if (!fs.existsSync(path.join(from, "SKILL.md"))) {
    fail(`skill de origem ausente ou sem SKILL.md: ${from}`);
  }

  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });

  if (skill.rename) {
    const skillMd = path.join(to, "SKILL.md");
    const original = fs.readFileSync(skillMd, "utf8");
    const renamed = original.split(skill.src).join(skill.rename);
    fs.writeFileSync(skillMd, renamed);
  }

  const label =
    skill.src === skill.dest ? skill.src : `${skill.src} -> ${skill.dest}`;
  console.log(`[sync] ok  ${label}`);
  changed++;
}

console.log(`\n[sync] ${changed} skill(s) de origem Capivar sincronizada(s) a partir de:\n       ${SOURCE_ROOT}`);
console.log(`[sync] destino: ${SKILLS_DIR}`);
