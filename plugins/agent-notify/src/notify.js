#!/usr/bin/env node
// Hook entry for every agent: `node notify.js <agent>`, hook event JSON on stdin.
// Never fails the hook and never writes to stdout (Codex parses Stop hook stdout).
// Kill switch: AGENT_NOTIFY=off.

const { AGENTS } = require('./agents');
const config = require('./config');
const { notify } = require('./output');

function run(agentId, event) {
  const agent = AGENTS[agentId];
  if (!agent) return;

  const cfg = config.load();
  if (cfg.log) config.logEvent(agentId, event);

  if (event.hook_event_name === 'UserPromptSubmit') {
    config.markTurnStart(agentId, event.session_id);
    return;
  }

  const picked = agent.classify(event);
  if (!picked) return;

  const plan = config.resolve(cfg, {
    agent: agentId,
    kind: picked.kind,
    projectDir: process.env.CLAUDE_PROJECT_DIR || event.cwd || process.cwd(),
    turnStartedAt: config.turnStart(agentId, event.session_id),
  });
  if (plan) notify(agent.title, picked.message, plan);
}

if (process.env.AGENT_NOTIFY !== 'off') {
  let raw = '';
  process.stdin.on('data', (chunk) => {
    raw += chunk;
  });
  process.stdin.on('end', () => {
    try {
      let event = {};
      try {
        event = JSON.parse(raw || '{}');
      } catch {
        // malformed payload: classify sees an empty event and stays silent
      }
      run(process.argv[2], event);
    } catch {
      // never fail the hook
    }
    process.exit(0);
  });
}
