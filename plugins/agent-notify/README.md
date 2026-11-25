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
`agent-notify`.

**Codex: approve the hooks, or nothing plays.** Codex never runs plugin hooks
until you approve them, and asks again after every plugin update:

- app: Plugins → `agent-notify` → **Hooks** → ⚙ → approve all 4 (or Settings → Hooks)
- CLI: `/hooks`

Claude Code needs no approval: installing the plugin is enough.

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

### Where it lives

One global file serves every agent:

| OS | Path |
| --- | --- |
| Windows | `C:\Users\<you>\.agent-notify\config.json` |
| macOS | `/Users/<you>/.agent-notify/config.json` |
| Linux | `/home/<you>/.agent-notify/config.json` |

- **Installing the plugin doesn't create it.** With no file, the built-in
  defaults apply. To customize, copy [`config.example.json`](config.example.json)
  there and edit it.
- **Edits apply on the next event.** The file is read on every hook call, so no
  restart is needed.
- **Other location:** set `AGENT_NOTIFY_CONFIG` to the file's path.
- **Kill switch:** set `AGENT_NOTIFY=off` in the environment to disable
  everything.
- **Invalid JSON** is ignored, so the defaults apply. The reason goes to the
  hook's stderr.

Don't edit the plugin's own files. Updates overwrite them, and Codex asks you to
re-approve the hooks after any change. For reference, they're stored here:

| | Claude Code | Codex |
| --- | --- | --- |
| plugin files | `~/.claude/plugins/cache/quo0-ai-toolkit/agent-notify/<version>/` | `~/.codex/plugins/cache/quo0-ai-toolkit/agent-notify/<version>/` |
| enabled in | `~/.claude/settings.json` → `enabledPlugins` | `~/.codex/config.toml` → `[plugins."agent-notify@quo0-ai-toolkit"]` |

### Format

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
| `soundOrder` | how to pick from a sound array: `"random"` or `"cycle"` (in order, wraps around). **Default: `"random"`.** Applies to every event below, which can override it |
| `events.<kind>.enabled` | `false` silences that event |
| `events.<kind>.sound` | file to play, an array of files (one is picked per event), or `false` |
| `events.<kind>.soundOrder` | `"random"` / `"cycle"` for this event only. Unset: the layer's `soundOrder`; if none is set anywhere, `"random"` |
| `events.<kind>.toast` | `true` / `false` (default: on, except `stop`) |
| `events.<kind>.minTurnSeconds` | stay silent if the turn took less (meant for `stop`) |

Arrays replace, never merge: an `agents.codex` array fully overrides the one in
`defaults`. Each agent + kind has its own cycle position, kept in
`<temp>/agent-notify/cycle-<agent>-<kind>`. That position resets on reboot. A
muted event (quiet hours, `sound: false`) doesn't advance the cycle.

Built-in sounds:

| kind | Windows | macOS | Linux |
| --- | --- | --- | --- |
| `stop` | `tada.wav` | `Glass.aiff` | `complete.oga` |
| `attention` | `Ring02.wav` | `Funk.aiff` | `bell.oga` |
| `permission` | `Alarm04.wav` | `Sosumi.aiff` | `dialog-warning.oga` |

`"log": true` appends every raw hook payload to `~/.agent-notify/events.log`
(next to the config file) — handy for checking what an agent actually sends.

## Notes

- Sound formats depend on the player each OS uses. Any path works,
  `~/…` included.

  | OS | player | formats |
  | --- | --- | --- |
  | Windows | `Media.SoundPlayer` | **`.wav` only** (uncompressed PCM) |
  | macOS | `afplay` | `.wav`, `.aiff`, `.mp3`, `.m4a`/`.aac`, `.caf` (no `.ogg`) |
  | Linux | `paplay` (PulseAudio / PipeWire) | `.wav`, `.ogg`/`.oga`, `.flac`, `.aiff`; `.mp3` needs libsndfile ≥ 1.1 |
- On Windows the script blocks for the clip length, because a detached hidden
  PowerShell silently drops audio on Win11. All hooks are `async` in both
  agents, so the agent never waits on the sound.
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
