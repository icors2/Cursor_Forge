#!/usr/bin/env node
/**
 * Validate Cursor starter layout: rules, skills, MCP, and memory.
 * Usage: node scripts/audit-cursor-setup.mjs
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];

function walk(dir, predicate, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, predicate, acc);
    else if (predicate(full, name)) acc.push(full);
  }
  return acc;
}

function read(path) {
  return readFileSync(path, "utf8");
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    data[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
  }
  return data;
}

const secretLike =
  /(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|xox[baprs]-[a-zA-Z0-9-]{20,}|AKIA[0-9A-Z]{16})/;

// Required files
for (const rel of [
  "AGENTS.md",
  "README.md",
  ".cursor/mcp.json",
  ".cursor/rules/00-core.mdc",
  ".cursor/rules/10-memory-protocol.mdc",
  ".cursor/rules/memory.mdc",
  ".cursor/rules/decisions.mdc",
  ".cursor/rules/conventions.mdc",
  ".cursor/rules/lessons.mdc",
]) {
  if (!existsSync(join(root, rel))) errors.push(`Missing ${rel}`);
}

// Rules
const rulesDir = join(root, ".cursor/rules");
for (const file of walk(rulesDir, (_, name) => name.endsWith(".md"))) {
  errors.push(`Ignored by Cursor (use .mdc): ${relative(root, file)}`);
}
for (const file of walk(rulesDir, (_, name) => name.endsWith(".mdc"))) {
  const fm = parseFrontmatter(read(file));
  if (!fm) {
    errors.push(`Rule missing YAML frontmatter: ${relative(root, file)}`);
    continue;
  }
  const always = fm.alwaysApply === "true";
  if (!always && !fm.description && !fm.globs) {
    warnings.push(
      `Rule has no description/globs and alwaysApply is not true (manual @-mention only): ${relative(root, file)}`,
    );
  }
}

// Memory snapshot
const memoryPath = join(root, ".cursor/rules/memory.mdc");
if (existsSync(memoryPath)) {
  const memory = read(memoryPath);
  if (!/Status:/i.test(memory)) errors.push("memory.mdc has no Status field");
  if (/unbootstrapped/i.test(memory)) {
    warnings.push("memory.mdc Status is still unbootstrapped");
  }
}

// Skills
const skillsDir = join(root, ".cursor/skills");
if (!existsSync(skillsDir)) {
  errors.push("Missing .cursor/skills/");
} else {
  for (const name of readdirSync(skillsDir)) {
    const skillDir = join(skillsDir, name);
    if (!statSync(skillDir).isDirectory()) continue;
    const skillFile = join(skillDir, "SKILL.md");
    if (!existsSync(skillFile)) {
      errors.push(`Skill folder missing SKILL.md: .cursor/skills/${name}`);
      continue;
    }
    const fm = parseFrontmatter(read(skillFile));
    if (!fm) {
      errors.push(`Skill missing frontmatter: .cursor/skills/${name}/SKILL.md`);
      continue;
    }
    if (!fm.name) errors.push(`Skill missing name: .cursor/skills/${name}/SKILL.md`);
    else if (fm.name !== name) {
      errors.push(`Skill name "${fm.name}" must match folder "${name}"`);
    }
    if (!fm.description) errors.push(`Skill missing description: .cursor/skills/${name}/SKILL.md`);
  }
}

// MCP
const mcpPath = join(root, ".cursor/mcp.json");
if (existsSync(mcpPath)) {
  let mcp;
  try {
    mcp = JSON.parse(read(mcpPath));
  } catch (err) {
    errors.push(`mcp.json is not valid JSON: ${err.message}`);
  }
  if (mcp) {
    if (!mcp.mcpServers || typeof mcp.mcpServers !== "object") {
      errors.push("mcp.json must have an mcpServers object");
    } else {
      for (const [name, server] of Object.entries(mcp.mcpServers)) {
        if (!server || typeof server !== "object") {
          errors.push(`MCP server ${name} is not an object`);
          continue;
        }
        const blob = JSON.stringify(server);
        if (secretLike.test(blob)) {
          errors.push(`MCP server ${name} looks like it contains a hardcoded secret`);
        }
        const hasStdio = server.command || server.type === "stdio";
        const hasHttp = Boolean(server.url);
        if (!hasStdio && !hasHttp) {
          errors.push(`MCP server ${name} needs command (stdio) or url (HTTP)`);
        }
        if (server.envFile && !hasStdio) {
          warnings.push(`MCP server ${name}: envFile is stdio-only`);
        }
      }
    }
  }
}

// AGENTS.md placeholder vs status
const agentsPath = join(root, "AGENTS.md");
if (existsSync(agentsPath) && existsSync(memoryPath)) {
  const agents = read(agentsPath);
  const memory = read(memoryPath);
  const active = /\*\*Status:\*\*\s*active/i.test(memory);
  const placeholder = /Status: not bootstrapped/i.test(agents);
  if (active && placeholder) {
    errors.push("memory.mdc is active but AGENTS.md Project-specific section is still the placeholder");
  }
}

// Scan tracked-looking cursor files for secrets
for (const file of [
  ...walk(join(root, ".cursor"), (_, name) => name.endsWith(".mdc") || name.endsWith(".md") || name.endsWith(".json")),
  join(root, ".env.example"),
]) {
  if (!existsSync(file)) continue;
  if (secretLike.test(read(file))) {
    errors.push(`Possible hardcoded secret in ${relative(root, file)}`);
  }
}

const ok = errors.length === 0;
console.log(ok ? "Cursor setup audit: PASS" : "Cursor setup audit: FAIL");
if (errors.length) {
  console.log("\nErrors:");
  for (const e of errors) console.log(`  - ${e}`);
}
if (warnings.length) {
  console.log("\nWarnings:");
  for (const w of warnings) console.log(`  - ${w}`);
}
process.exit(ok ? 0 : 1);
