const test = require('node:test');
const assert = require('node:assert');
const { AGENTS } = require('../src/agents');

const kind = (agent, event) => AGENTS[agent].classify(event)?.kind ?? null;

test('claude: event → kind', () => {
  assert.equal(kind('claude', { hook_event_name: 'Stop' }), 'stop');
  assert.equal(kind('claude', { hook_event_name: 'StopFailure', error: 'rate_limit' }), 'stop');
  assert.equal(AGENTS.claude.classify({ hook_event_name: 'StopFailure', error: 'rate_limit' }).message, 'Turn failed: rate_limit');
  assert.equal(kind('claude', { hook_event_name: 'PermissionRequest', tool_name: 'Bash' }), 'permission');
  assert.equal(kind('claude', { hook_event_name: 'PermissionRequest', tool_name: 'ExitPlanMode' }), 'permission');
  assert.equal(kind('claude', { hook_event_name: 'PermissionRequest', tool_name: 'AskUserQuestion' }), 'attention');
  assert.equal(kind('claude', { hook_event_name: 'Elicitation', mcp_server_name: 'x', message: 'y' }), 'attention');
  assert.equal(kind('claude', { hook_event_name: 'Notification', notification_type: 'idle_prompt' }), 'attention');
  assert.equal(kind('claude', { hook_event_name: 'Notification', notification_type: 'permission_prompt' }), null);
  assert.equal(kind('claude', { hook_event_name: 'Notification', notification_type: 'elicitation_dialog' }), null);
  assert.equal(kind('claude', { hook_event_name: 'Notification', notification_type: 'agent_needs_input' }), 'attention');
  assert.equal(kind('claude', { hook_event_name: 'Notification', notification_type: 'auth_success' }), null);
  assert.equal(kind('claude', { hook_event_name: 'Notification', notification_type: 'plugin_notification' }), null);
  assert.equal(kind('claude', { hook_event_name: 'UserPromptSubmit' }), null);
  assert.equal(kind('claude', {}), null);
});

test('codex: event → kind', () => {
  assert.equal(kind('codex', { hook_event_name: 'Stop', turn_id: 't' }), 'stop');
  assert.equal(kind('codex', { hook_event_name: 'PermissionRequest', tool_name: 'shell' }), 'permission');
  assert.equal(kind('codex', { hook_event_name: 'PreToolUse', tool_name: 'request_user_input' }), 'attention');
  assert.equal(kind('codex', { hook_event_name: 'PreToolUse', tool_name: 'shell' }), null);
  assert.equal(kind('codex', { hook_event_name: 'SubagentStop' }), null);
});
