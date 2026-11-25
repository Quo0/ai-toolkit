# agent-notify

Sound + desktop toast when an AI coding agent finishes a turn, asks you a
question, or needs a permission click. Works with **Claude Code** and **Codex**.
Pure Node, no dependencies. Replaces `claude-notify` from `Quo0/claude-toolkit`.

## Install

Claude Code:

```bash
claude plugin marketplace add Quo0/ai-toolkit
claude plugin install agent-notify@quo0-ai-toolkit
```

Codex (desktop app / CLI):

```bash
codex plugin marketplace add Quo0/ai-toolkit
codex plugin add agent-notify@quo0-ai-toolkit
```

Or in the Codex app: Plugins → add marketplace `Quo0/ai-toolkit` → install
`agent-notify`. Then **trust its hooks** (`/hooks` in the CLI, Settings → Hooks
in the app) — Codex never runs plugin hooks until you approve them, and asks
again after every plugin update.

Start a new session after installing; hooks resolve at session start.

## Hooks

Every hook maps to one of three event kinds — `stop`, `attention`,
`permission` — which the [config](#config) keys on.

Claude Code ([`hooks/hooks.json`](hooks/hooks.json)):

| hook | fires when | kind |
| --- | --- | --- |
| `Stop` | turn finished | `stop` |
| `StopFailure` | turn died on an API error | `stop` |
| `PermissionRequest` | permission dialog shown (incl. `ExitPlanMode`) | `permission` |
| `PermissionRequest` for `AskUserQuestion` | question shown | `attention` |
| `Elicitation` | MCP server asks for input | `attention` |
| `Notification` `idle_prompt` | idle ~60 s after turn end | `attention` |
| `Notification` `agent_needs_input` | background agent waits | `attention` |
| `UserPromptSubmit` | prompt sent | — (starts turn timer) |

Codex ([`hooks/codex-hooks.json`](hooks/codex-hooks.json)):

| hook | fires when | kind |
| --- | --- | --- |
| `Stop` | turn finished | `stop` |
| `PermissionRequest` | approval dialog shown | `permission` |
| `PreToolUse` for `request_user_input` | question asked | `attention` |
| `UserPromptSubmit` | prompt sent | — (starts turn timer) |

The turn timer feeds `minTurnSeconds`. Codex has no failure, idle or MCP-input
hook, so those stay Claude-only.

## Config

One file for all agents: `~/.agent-notify/config.json` (override the path with
`AGENT_NOTIFY_CONFIG`). No file = built-in defaults. `AGENT_NOTIFY=off` in env
disables everything. Full example: [`config.example.json`](config.example.json).

```json
{
  "defaults": { ...layer },
  "agents":   { "claude": { ...layer }, "codex": { ...layer } },
  "projects": { "D:/projects/foo": { ...layer } },
  "log": false
}
```

Layers merge in order, later wins: built-in → `defaults` → `agents.<agent>` →
the `projects` entry whose path is the longest prefix of the session's project
dir. A layer can set:

| key | meaning |
| --- | --- |
| `enabled` | `false` silences everything in this layer's scope |
| `sound` / `toast` | `false` turns that channel off for every event |
| `quietHours` | `"23:00-08:00"` (may wrap midnight) — sound muted, toast still shown |
| `events.<kind>.enabled` | `false` silences that event |
| `events.<kind>.sound` | file to play, or `false` |
| `events.<kind>.toast` | `true` / `false` (default: on, except `stop`) |
| `events.<kind>.minTurnSeconds` | stay silent if the turn took less (meant for `stop`) |

Built-in sounds:

| kind | Windows | macOS | Linux |
| --- | --- | --- | --- |
| `stop` | `tada.wav` | `Glass.aiff` | `complete.oga` |
| `attention` | `Ring02.wav` | `Funk.aiff` | `bell.oga` |
| `permission` | `Alarm04.wav` | `Sosumi.aiff` | `dialog-warning.oga` |

`"log": true` appends every raw hook payload to `~/.agent-notify/events.log`
(next to the config file) — handy for checking what an agent actually sends.

## Notes

- Windows plays sounds with `Media.SoundPlayer`: **`.wav` only**. The script
  blocks for the clip length, because a detached hidden PowerShell silently
  drops audio on Win11. All hooks are `async` in both agents, so the agent never
  waits on the sound.
- Claude's `Notification` is matched to `idle_prompt|agent_needs_input` only:
  its other types either repeat `PermissionRequest` / `Elicitation`
  (`permission_prompt` arrives ~6 s after the dialog) or aren't worth a sound
  (`auth_*`, `quota_*`, `plugin_notification`).
- Codex: the VS Code extension officially doesn't support plugins. If hooks
  don't fire there, add them user-level to `~/.codex/hooks.json` with the
  absolute path to `src/notify.js` (same handlers as
  [`hooks/codex-hooks.json`](hooks/codex-hooks.json)).
- Tests: `node --test "plugins/agent-notify/test/*.test.js"`.

## Migrating from claude-notify

`claude-notify`'s plugin options (`sound_stop`, …) and the `notifications` block
in `.claude/settings.local.json` are not read. Move custom sounds to
`events.<kind>.sound` (`STOP` → `stop`, `ATTENTION` → `attention`,
`PERMISSION` → `permission`). Uninstall `claude-notify` first, or both play.
`CLAUDE_NOTIFY=off` → `AGENT_NOTIFY=off`.
