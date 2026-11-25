const test = require('node:test');
const assert = require('node:assert');
const { resolve, inQuietHours, pickSound } = require('../src/config');

const at = (hh, mm) => new Date(2026, 0, 1, hh, mm);
const base = { agent: 'codex', kind: 'stop', projectDir: 'D:\\projects\\app', now: at(12, 0), platform: 'win32' };

test('built-in defaults: stop is sound-only, others sound + toast', () => {
  assert.deepEqual(resolve({}, base), { sound: 'C:\\Windows\\Media\\tada.wav', toast: false });
  assert.deepEqual(resolve({}, { ...base, kind: 'permission' }), { sound: 'C:\\Windows\\Media\\Alarm04.wav', toast: true });
});

test('merge order: defaults < agents[agent] < projects[longest prefix]', () => {
  const cfg = {
    defaults: { events: { stop: { sound: 'd.wav' } } },
    agents: { codex: { events: { stop: { sound: 'codex.wav' } } }, claude: { events: { stop: { sound: 'claude.wav' } } } },
    projects: {
      'D:/projects': { events: { stop: { sound: 'projects.wav' } } },
      'd:/PROJECTS/app/': { events: { stop: { sound: 'app.wav' } } },
    },
  };
  assert.equal(resolve(cfg, { ...base, projectDir: 'E:\\other' }).sound, 'codex.wav');
  assert.equal(resolve(cfg, { ...base, agent: 'claude', projectDir: 'E:\\other' }).sound, 'claude.wav');
  assert.equal(resolve(cfg, { ...base, projectDir: 'D:\\projects\\lib' }).sound, 'projects.wav');
  assert.equal(resolve(cfg, { ...base, projectDir: 'D:\\projects\\app\\src' }).sound, 'app.wav');
  assert.equal(resolve(cfg, { ...base, projectDir: 'D:\\projects\\application' }).sound, 'projects.wav');
});

test('~ in a sound path expands to the home dir', () => {
  const cfg = { defaults: { events: { stop: { sound: '~/sounds/done.mp3' } } } };
  assert.equal(resolve(cfg, base).sound, require('os').homedir() + '/sounds/done.mp3');
});

test('sound arrays: picker gets expanded list, order (event > layer > undefined) and agent-kind key', () => {
  const calls = [];
  const pick = (files, order, key) => (calls.push({ files, order, key }), files[1]);
  const cfg = {
    defaults: { soundOrder: 'cycle', events: { stop: { sound: ['a.wav', '~/b.wav', '', 7] } } },
    agents: { claude: { events: { attention: { sound: ['c.wav', 'd.wav'], soundOrder: 'random' } } } },
  };
  assert.equal(resolve(cfg, { ...base, pick }).sound, require('os').homedir() + '/b.wav');
  assert.deepEqual(calls[0], { files: ['a.wav', require('os').homedir() + '/b.wav'], order: 'cycle', key: 'codex-stop' });
  resolve(cfg, { ...base, agent: 'claude', kind: 'attention', pick });
  assert.deepEqual(calls[1], { files: ['c.wav', 'd.wav'], order: 'random', key: 'claude-attention' });
});

test('muted events never reach the picker (cycle must not advance)', () => {
  const pick = () => assert.fail('picker called');
  const sounds = { events: { stop: { sound: ['a.wav', 'b.wav'] } } };
  assert.equal(resolve({ defaults: { ...sounds, quietHours: '00:00-23:59' } }, { ...base, pick }), null);
  assert.equal(resolve({ defaults: { ...sounds, sound: false } }, { ...base, pick }), null);
  assert.equal(resolve({ defaults: { events: { stop: { sound: [] } } } }, { ...base, pick }), null);
});

test('pickSound: single file, random, cycle with persisted position', () => {
  const fs = require('fs');
  const stateDir = fs.mkdtempSync(require('path').join(require('os').tmpdir(), 'agent-notify-test-'));
  try {
    assert.equal(pickSound(['only.wav'], 'cycle', 'k', { stateDir }), 'only.wav');
    assert.equal(pickSound([], 'random', 'k', { stateDir }), null);
    assert.equal(pickSound(['a', 'b', 'c'], 'random', 'k', { random: () => 0.99 }), 'c');
    assert.equal(pickSound(['a', 'b', 'c'], undefined, 'k', { random: () => 0 }), 'a');
    const seq = [1, 2, 3, 4].map(() => pickSound(['a', 'b', 'c'], 'cycle', 'k', { stateDir }));
    assert.deepEqual(seq, ['a', 'b', 'c', 'a']);
    assert.equal(pickSound(['a', 'b', 'c'], 'cycle', 'other', { stateDir }), 'a'); // separate key, separate position
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test('enabled / sound / toast switches', () => {
  assert.equal(resolve({ agents: { codex: { enabled: false } } }, base), null);
  assert.equal(resolve({ defaults: { events: { stop: { enabled: false } } } }, base), null);
  assert.equal(resolve({ projects: { 'D:/projects/app': { sound: false } } }, base), null); // stop has no toast either
  assert.deepEqual(resolve({ defaults: { sound: false } }, { ...base, kind: 'attention' }), { sound: null, toast: true });
  assert.deepEqual(resolve({ defaults: { events: { permission: { sound: false } } } }, { ...base, kind: 'permission' }), { sound: null, toast: true });
  assert.equal(resolve({ defaults: { toast: false, events: { permission: { sound: false } } } }, { ...base, kind: 'permission' }), null);
});

test('quiet hours mute the sound, keep the toast', () => {
  const cfg = { defaults: { quietHours: '23:00-08:00' } };
  assert.deepEqual(resolve(cfg, { ...base, kind: 'permission', now: at(2, 0) }), { sound: null, toast: true });
  assert.equal(resolve(cfg, { ...base, now: at(23, 30) }), null);
  assert.equal(resolve(cfg, { ...base, now: at(8, 0) }).sound, 'C:\\Windows\\Media\\tada.wav');
});

test('inQuietHours: same-day and wrapping ranges, junk ignored', () => {
  assert.equal(inQuietHours('13:00-14:00', at(13, 30)), true);
  assert.equal(inQuietHours('13:00-14:00', at(14, 0)), false);
  assert.equal(inQuietHours('22:00-06:30', at(6, 29)), true);
  assert.equal(inQuietHours('22:00-06:30', at(12, 0)), false);
  assert.equal(inQuietHours('nonsense', at(12, 0)), false);
  assert.equal(inQuietHours(undefined, at(12, 0)), false);
});

test('minTurnSeconds skips short turns, applies only when turn start is known', () => {
  const cfg = { defaults: { events: { stop: { minTurnSeconds: 20 } } } };
  const now = at(12, 0);
  assert.equal(resolve(cfg, { ...base, now, turnStartedAt: now.getTime() - 5000 }), null);
  assert.ok(resolve(cfg, { ...base, now, turnStartedAt: now.getTime() - 25000 }));
  assert.ok(resolve(cfg, { ...base, now, turnStartedAt: undefined }));
});
