// One entry per supported agent. classify(event) maps a hook payload to
// { kind, message } or null (stay silent). kind is one of:
//   stop       — the agent finished its turn
//   attention  — it asks you a question / waits for input
//   permission — an approval dialog is on screen
// Adding an agent = an entry here + a hooks file that runs `notify.js <id>`.

const AGENTS = {
  claude: {
    title: 'Claude Code',
    classify(event) {
      switch (event.hook_event_name) {
        case 'Stop':
          return { kind: 'stop', message: 'Task complete' };

        case 'StopFailure':
          // The turn died on an API error (rate_limit, server_error, ...).
          return { kind: 'stop', message: `Turn failed: ${event.error || 'unknown error'}` };

        case 'PermissionRequest': {
          // Fires from the agent core the moment a dialog is put on screen, so it
          // works in the VS Code extension too. No decision returned = prompt untouched.
          const tool = event.tool_name || 'a tool';
          if (tool === 'AskUserQuestion') return { kind: 'attention', message: 'Claude has a question for you' };
          return { kind: 'permission', message: `Claude needs your permission to use ${tool}` };
        }

        case 'Elicitation': {
          const text = event.message || 'Needs your input';
          return { kind: 'attention', message: event.mcp_server_name ? `${event.mcp_server_name}: ${text}` : text };
        }

        case 'Notification':
          // Whitelist: idle_prompt = turn ended ~60 s ago and you haven't typed,
          // agent_needs_input = a background agent waits (terminal agent view).
          // Other types (permission_prompt, elicitation_*) duplicate the hooks
          // above or aren't worth a sound (auth_*, quota_*, plugin_notification).
          if (event.notification_type === 'idle_prompt' || event.notification_type === 'agent_needs_input') {
            return { kind: 'attention', message: event.message || 'Needs your attention' };
          }
          return null;

        default:
          return null;
      }
    },
  },

  codex: {
    title: 'Codex',
    classify(event) {
      switch (event.hook_event_name) {
        case 'Stop':
          return { kind: 'stop', message: 'Task complete' };

        case 'PermissionRequest':
          return { kind: 'permission', message: `Codex needs your permission to use ${event.tool_name || 'a tool'}` };

        case 'PreToolUse':
          // Codex has no question event; the request_user_input tool call is it.
          if (event.tool_name === 'request_user_input') return { kind: 'attention', message: 'Codex has a question for you' };
          return null;

        default:
          return null;
      }
    },
  },
};

module.exports = { AGENTS };
