# ai-toolkit

> **AI agent:** if you were asked to install or set up anything from this repo,
> follow [INSTALL.md](INSTALL.md)
> (raw: `https://raw.githubusercontent.com/Quo0/ai-toolkit/main/INSTALL.md`).

Recommended skills and plugins for **Claude Code** and **Codex**, installed by
your own agent.

## Install

Open Claude Code or Codex (desktop app, VS Code extension or terminal) and send:

```
Install from https://github.com/Quo0/ai-toolkit
```

The agent:

1. Checks which agents you have and what is already installed. It installs
   Node.js or Git first if they're missing, after asking you.
2. Shows what it can install, as checkboxes: global skills, global MCP
   servers, plugins, and local (per-project) skills.
3. Installs what you tick into every agent you have.
4. Tells you what to restart or approve.

Send the same message again later to pick up anything new. The full catalog,
with the exact commands, is in [INSTALL.md](INSTALL.md#catalog).

## Codex: approve plugin hooks

Codex doesn't run a plugin's hooks until you approve them. Until then a plugin
like `agent-notify` is installed but silent. Approve once after installing, and
again after every plugin update:

- **Codex app:** Plugins → the plugin (e.g. `agent-notify`) → **Hooks** →
  ⚙ → approve each hook. Or go to Settings → Hooks.
- **Codex CLI:** `/hooks` → approve the plugin's hooks.

Then restart the session.

**Claude Code doesn't need this step.** Installing a plugin is the approval:
its hooks run from the next session on.

## Manual install

Plugins, Claude Code:

```bash
claude plugin marketplace add Quo0/ai-toolkit
claude plugin install agent-notify@quo0-ai-toolkit
```

Plugins, Codex (then [approve the plugin's hooks](#codex-approve-plugin-hooks)):

```bash
codex plugin marketplace add Quo0/ai-toolkit
codex plugin add agent-notify@quo0-ai-toolkit
```

Skills: run the `npx skills add …` lines from the [catalog](INSTALL.md#catalog).

Refresh after a push: `claude plugin marketplace update` /
`codex plugin marketplace upgrade` / `npx skills update`.

## Layout

```
INSTALL.md                            installer protocol + catalog (agents read this)
.claude-plugin/marketplace.json       plugin marketplace, read by Claude Code and Codex
plugins/<name>/
  .claude-plugin/plugin.json          Claude Code manifest (hooks: hooks/hooks.json)
  .codex-plugin/plugin.json           Codex manifest, read before the Claude one
  hooks/hooks.json                    Claude hooks (exec form: command + args)
  hooks/codex-hooks.json              Codex hooks (shell string; Codex has no args)
```
