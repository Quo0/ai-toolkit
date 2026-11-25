# AGENTS.md

**Asked to install or set up something from this repo?** Follow
[INSTALL.md](INSTALL.md). The rest of this file is for agents working *on* this
repo.

## Adding things

- **Skill:** add an entry to the right section of the INSTALL.md catalog
  (Global skills or Local skills), using the existing entry's fields:
  What, Source, Installed if, Install.
- **MCP server:** add an entry under Global MCP servers with What, Source,
  Installed if, and Install for each agent (`claude mcp add … -s user`,
  `codex mcp add …`). Use `npx -y` so it never stops at an install prompt.
- **Plugin:** create `plugins/<name>/` with `.claude-plugin/plugin.json` and
  `.codex-plugin/plugin.json`, add it to `.claude-plugin/marketplace.json`, then
  add a catalog entry under Plugins. Claude hooks go in `hooks/hooks.json` (exec
  form: `command` + `args`). Codex hooks go in a separate file referenced by the
  Codex manifest's `hooks` field (a shell string; Codex has no `args`).
- **Catalog entries:** write the What line for a non-technical user.

## Source of truth

`.claude-plugin/marketplace.json` and each plugin's manifests beat any prose.
If INSTALL.md or a README disagrees with them, fix the prose.

## Checks

- `node --test "plugins/agent-notify/test/*.test.js"`
- `claude plugin validate .` and `claude plugin validate plugins/<name>`
