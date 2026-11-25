// Config: one JSON file shared by every agent.
//
//   ~/.agent-notify/config.json   (override path with AGENT_NOTIFY_CONFIG)
//   {
//     "defaults": <layer>,
//     "agents":   { "claude": <layer>, "codex": <layer> },
//     "projects": { "D:/projects/foo": <layer> },
//     "log": false
//   }
//
// A layer: { enabled, sound, toast, quietHours, events: { stop|attention|permission:
//            { enabled, sound: "<file>" | false, toast, minTurnSeconds } } }
// Merge order, later wins: built-in → defaults → agents[agent] → longest matching projects[] prefix.

const fs = require('fs');
const os = require('os');
const path = require('path');

const BUILTIN_SOUNDS = {
  win32: {
    stop: 'C:\\Windows\\Media\\tada.wav',
    attention: 'C:\\Windows\\Media\\Ring02.wav',
    permission: 'C:\\Windows\\Media\\Alarm04.wav',
  },
  darwin: {
    stop: '/System/Library/Sounds/Glass.aiff',
    attention: '/System/Library/Sounds/Funk.aiff',
    permission: '/System/Library/Sounds/Sosumi.aiff',
  },
  linux: {
    stop: '/usr/share/sounds/freedesktop/stereo/complete.oga',
    attention: '/usr/share/sounds/freedesktop/stereo/bell.oga',
    permission: '/usr/share/sounds/freedesktop/stereo/dialog-warning.oga',
  },
};

function builtin(platform) {
  const s = BUILTIN_SOUNDS[platform] || BUILTIN_SOUNDS.linux;
  return {
    events: {
      // A toast on every finished turn is noise, so stop is sound-only by default.
      stop: { sound: s.stop, toast: false },
      attention: { sound: s.attention },
      permission: { sound: s.permission },
    },
  };
}

function configPath() {
  return process.env.AGENT_NOTIFY_CONFIG || path.join(os.homedir(), '.agent-notify', 'config.json');
}

function load(file = configPath()) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return {}; // no file = built-in defaults
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    process.stderr.write(`agent-notify: ignoring invalid ${file}: ${err.message}\n`);
    return {};
  }
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function merge(...layers) {
  const out = {};
  for (const layer of layers) {
    if (!isObject(layer)) continue;
    for (const [k, v] of Object.entries(layer)) {
      out[k] = isObject(v) && isObject(out[k]) ? merge(out[k], v) : v;
    }
  }
  return out;
}

function normPath(p, platform) {
  let s = String(p).replace(/^~(?=$|[\\/])/, os.homedir()).replace(/\\/g, '/').replace(/\/+$/, '');
  return platform === 'win32' ? s.toLowerCase() : s;
}

// The projects[] entry whose key is the longest path prefix of dir.
function projectLayer(projects, dir, platform) {
  if (!isObject(projects) || !dir) return undefined;
  const d = normPath(dir, platform);
  let best;
  let bestLen = -1;
  for (const [key, layer] of Object.entries(projects)) {
    const k = normPath(key, platform);
    if ((d === k || d.startsWith(k + '/')) && k.length > bestLen) {
      best = layer;
      bestLen = k.length;
    }
  }
  return best;
}

// "23:00-08:00"; wrapping past midnight is fine. Anything unparsable = never quiet.
function inQuietHours(spec, now) {
  const m = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(spec || '');
  if (!m) return false;
  const start = +m[1] * 60 + +m[2];
  const end = +m[3] * 60 + +m[4];
  const t = now.getHours() * 60 + now.getMinutes();
  return start <= end ? t >= start && t < end : t >= start || t < end;
}

// → { sound: "<file>" | null, toast: bool }, or null for silence.
function resolve(cfg, { agent, kind, projectDir, now = new Date(), turnStartedAt, platform = process.platform }) {
  const layer = merge(
    builtin(platform),
    cfg.defaults,
    cfg.agents && cfg.agents[agent],
    projectLayer(cfg.projects, projectDir, platform),
  );
  const ev = (layer.events && layer.events[kind]) || {};

  if (layer.enabled === false || ev.enabled === false) return null;
  if (ev.minTurnSeconds && turnStartedAt && now.getTime() - turnStartedAt < ev.minTurnSeconds * 1000) return null;

  let sound = layer.sound !== false && typeof ev.sound === 'string' && ev.sound ? ev.sound : null;
  if (sound && inQuietHours(layer.quietHours, now)) sound = null;
  const toast = layer.toast !== false && ev.toast !== false;

  return sound || toast ? { sound, toast } : null;
}

// Turn start, written on UserPromptSubmit, read for minTurnSeconds.
function turnFile(agent, sessionId) {
  if (!sessionId) return null;
  return path.join(os.tmpdir(), 'agent-notify', `${agent}-${String(sessionId).replace(/[^\w-]/g, '_')}`);
}

function markTurnStart(agent, sessionId, now = Date.now()) {
  const file = turnFile(agent, sessionId);
  if (!file) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, String(now));
}

function turnStart(agent, sessionId) {
  const file = turnFile(agent, sessionId);
  if (!file) return undefined;
  try {
    return Number(fs.readFileSync(file, 'utf8')) || undefined;
  } catch {
    return undefined;
  }
}

function logEvent(agent, event) {
  try {
    const file = path.join(path.dirname(configPath()), 'events.log');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify({ ts: new Date().toISOString(), agent, event }) + '\n');
  } catch {
    // logging is best-effort
  }
}

module.exports = { load, resolve, merge, inQuietHours, projectLayer, markTurnStart, turnStart, logEvent };
