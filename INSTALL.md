# INSTALL.md — installer protocol for AI agents

You are an AI coding agent (Claude Code, Codex, or similar). The user gave you
this repo and asked you to install or set up things from it. Follow the steps
below in order. The user picks what gets installed; you never install anything
they didn't select.

The user may be new to AI tools:

- Talk in their language and in plain words. Describe each item by what it does
  for them, not how it works.
- Don't make them run commands: you run them. When something needs a click in
  an app (approving hooks, restarting), tell them exactly where to click.
- You need to be able to run commands on this computer. If you can't (e.g. a
  chat without tools), say so, tell the user to open Claude Code or Codex
  (desktop app, VS Code extension or terminal), and stop.

Repo: `https://github.com/Quo0/ai-toolkit`. If you only have the URL, read files
raw: `https://raw.githubusercontent.com/Quo0/ai-toolkit/main/<path>`.

`~` means the user's home directory (`%USERPROFILE%` on Windows).

## Step 1 — Detect the environment

Do this silently, without asking the user.

- **Agents on this machine** (the install targets). Users of the desktop apps
  or VS Code extensions often have no CLI on PATH. Use the bundled binary for
  `claude …` / `codex …` commands then (`.exe` on Windows):
  - Claude Code: `~/.claude/` exists, or `claude` is on PATH. Bundled binary:
    `~/.vscode/extensions/anthropic.claude-code-*/resources/native-binary/claude`.
  - Codex: `~/.codex/` exists, or `codex` is on PATH. Bundled binary:
    `~/.vscode/extensions/openai.chatgpt-*/bin/*/codex`, or, for the Windows
    desktop app, `<InstallLocation>\app\resources\codex.exe`, where
    `<InstallLocation>` = `(Get-AppxPackage OpenAI.Codex).InstallLocation` in
    PowerShell. Listing that folder is denied, so build the path directly.
- **Prerequisites**:
  - Node.js (`node --version`): skills need ≥ 22.20 (skills CLI), and plugins
    need any current Node.
  - Git (`git --version`): needed to add plugin marketplaces.
- **Project**: the current directory counts as a project if it's a git repo
  and isn't `~` itself. Local skills are offered only for a project, and they
  are installed into it, never into this toolkit repo.

If a prerequisite is missing or too old, explain in one sentence why it's
needed and offer to install it. Install only after the user agrees:

| OS | Node.js | Git |
| --- | --- | --- |
| Windows | `winget install -e --id OpenJS.NodeJS.LTS` | `winget install -e --id Git.Git` |
| macOS | `brew install node` | `brew install git` (or `xcode-select --install`) |
| Linux | distro package manager, or nodejs.org | distro package manager |

No winget/brew: give the download page (nodejs.org, git-scm.com) and wait for
the user. A freshly installed tool is often not on PATH in the current session.
Try its default install path (e.g. `C:\Program Files\nodejs\node.exe`). If that
fails, ask the user to restart the agent and say "continue installation" in the
new session. If they decline a prerequisite, drop every item that needs it.

## Step 2 — Check what's already installed

For every item in the [catalog](#catalog), use its "Installed if" checks to get
a status per detected agent: `installed`, `missing`, or `conflict` (the item
lists a predecessor in "Replaces" and that predecessor is installed).

## Step 3 — Let the user choose

Show one group per catalog section: **Global skills**, **Global MCP servers**,
**Plugins**, **Local skills**. Skip a section with no items, and skip Local
skills when there is no project. For each item, show its name, its one-line description, and its
status per agent, e.g. `grilling — installed: Claude, missing: Codex`.

- If your harness has a multi-select question tool, use it. In Claude Code
  that's `AskUserQuestion` with `multiSelect: true`: one question per group,
  at most 4 options per question and 4 questions per call, so split bigger
  groups. Otherwise print a numbered list and ask the user to reply with the
  numbers.
- Everything in the catalog is recommended. Pre-select (or mark as
  recommended) every item that is missing on some agent. Present fully
  installed items as installed, not as choices.
- If both Claude Code and Codex are detected, install into both unless the
  user says otherwise. Ask about this only if it's unclear.
- A pick with `conflict` status also means removing its predecessor. Say so in
  the option text.

The user's selection is their consent. If they select nothing, stop.

## Step 4 — Install

For each selected item, run its catalog "Install" commands for every target
agent. Rules:

- Run the commands one by one and check each exit code. If one fails, stop
  that item, keep its output, and move on to the next item. Don't improvise
  workarounds.
- When you edit a JSON or TOML settings file, merge into it: keep every
  existing key, and change only the keys the catalog names.
- Never write Codex hook-trust entries (`[hooks.state."…"]`) and never use
  `--dangerously-*` flags. Hook approval is the user's job.
- Don't touch anything the catalog doesn't mention.

## Step 5 — Verify and report

Re-run the Step 2 checks for what you installed. Then report a short table
(item × agent → installed / failed + reason), followed by each item's "After"
notes.

If you installed a plugin into Codex, tell the user to approve its hooks.
Otherwise the plugin stays silent: Codex runs no plugin hooks until the user
approves them, and you must not do it for them.

- Codex app: Plugins → `<plugin>` → **Hooks** → ⚙ → approve each hook (or
  Settings → Hooks).
- Codex CLI: `/hooks`.
- Approval is needed again after every plugin update.

Claude Code has no such step: installing the plugin is the approval.

Always end with a restart instruction (skills, plugins and hooks load at
session start), concrete for the user's app: close and reopen the desktop app,
run "Developer: Reload Window" in VS Code, or exit and relaunch the CLI.
Mention that saying "install from https://github.com/Quo0/ai-toolkit" again
later picks up anything new.

---

## Catalog

Agent ids for `npx skills -a`: `claude-code`, `codex`. Pass only the agents
being installed into (e.g. `-a claude-code codex`).

### Global skills

Installed per machine (user level), available in every project.

#### grilling

- **What:** asks you about a plan in rounds until no decision is left as an unstated assumption. Trigger: "grill me", `/grilling`.
- **Source:** [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/productivity/grilling)
- **Installed if:** Claude Code — `~/.claude/skills/grilling/SKILL.md` exists; Codex — `~/.agents/skills/grilling/SKILL.md` exists.
- **Install:** `npx skills add mattpocock/skills --skill grilling -g -a <agents> -y`

### Global MCP servers

MCP servers give the agent new tools. Installed at user level, available in
every project. Prefer the CLI commands: they edit the agent's own config
safely.

#### playwright

- **What:** lets the agent open web pages in a real browser, click, fill forms, and read what's on screen. Useful for checking a site or doing web chores. Logins persist between sessions in a separate browser profile.
- **Source:** [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) (needs Node.js ≥ 20)
- **Installed if:**
  - Claude Code: `claude mcp get playwright` succeeds.
  - Codex: `~/.codex/config.toml` has a `[mcp_servers.playwright]` table.
- **Browser:** uses Google Chrome by default. If Chrome isn't installed, append `--browser msedge` to the server args on Windows (Edge ships with Windows). On macOS and Linux, ask the user to install Chrome.
- **Install, Claude Code:** `claude mcp add playwright -s user -- npx -y @playwright/mcp@latest`
- **Install, Codex:** `codex mcp add playwright -- npx -y @playwright/mcp@latest`

  Without a `codex` binary, merge this into `~/.codex/config.toml`:

  ```toml
  [mcp_servers.playwright]
  command = "npx"
  args = ["-y", "@playwright/mcp@latest"]
  ```
- **After:** the first browser task opens a browser window. That's expected, so tell the user.

### Plugins

Installed at user level. The marketplace id is `quo0-ai-toolkit`, and both
agents read it from this repo.

#### agent-notify

- **What:** sound + desktop toast when the agent finishes a turn, asks a question, or needs a permission click. Per-agent, per-event sounds and rules in `~/.agent-notify/config.json`. Docs: [plugins/agent-notify/README.md](plugins/agent-notify/README.md).
- **Installed if:**
  - Claude Code: `~/.claude/settings.json` has `enabledPlugins["agent-notify@quo0-ai-toolkit"]: true`.
  - Codex: `~/.codex/config.toml` has a `[plugins."agent-notify@quo0-ai-toolkit"]` table with `enabled = true`.
- **Replaces:** `claude-notify@quo0-plugins` (from `Quo0/claude-toolkit`), detected by the same checks with that id. Keeping both makes every event sound twice.
- **Install, Claude Code:**
  1. If `claude-notify@quo0-plugins` is installed: `claude plugin uninstall claude-notify@quo0-plugins`.
  2. `claude plugin marketplace add Quo0/ai-toolkit` (skip if `quo0-ai-toolkit` is already in `~/.claude/plugins/known_marketplaces.json`).
  3. `claude plugin install agent-notify@quo0-ai-toolkit`.

  Without the `claude` CLI, merge this into `~/.claude/settings.json` instead
  (and set `"claude-notify@quo0-plugins": false` there if it's present):

  ```json
  {
    "extraKnownMarketplaces": {
      "quo0-ai-toolkit": { "source": { "source": "github", "repo": "Quo0/ai-toolkit" } }
    },
    "enabledPlugins": { "agent-notify@quo0-ai-toolkit": true }
  }
  ```
- **Install, Codex:**
  1. If `claude-notify@quo0-plugins` is installed: `codex plugin remove claude-notify@quo0-plugins`.
  2. `codex plugin marketplace add Quo0/ai-toolkit` (skip if `[marketplaces.quo0-ai-toolkit]` is already in `~/.codex/config.toml`).
  3. `codex plugin add agent-notify@quo0-ai-toolkit`.

  If you can't find a `codex` binary, don't hand-edit `config.toml`. Tell the
  user to add marketplace `Quo0/ai-toolkit` in the Codex app (Plugins) and
  install `agent-notify` there.
- **After:**
  - Codex: approve its 4 hooks (Stop, PermissionRequest, PreToolUse, UserPromptSubmit) as described in [Step 5](#step-5--verify-and-report). Without approval there is no sound in Codex.
  - Optional: custom sounds and rules. Offer to create `~/.agent-notify/config.json` from [`config.example.json`](plugins/agent-notify/config.example.json); its README documents each setting.

### Local skills

Installed into the current project (`.claude/skills/`, `.agents/skills/`).
Run the commands from the project root, without `-g`. Afterwards, suggest that
the user commit `.claude/skills/`, `.agents/skills/` and `skills-lock.json` so
their team gets the same set.

_None yet._
