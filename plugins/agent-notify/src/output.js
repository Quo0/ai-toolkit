// Plays the sound and shows the toast. plan = { sound: "<file>" | null, toast: bool }.

const { spawn, spawnSync } = require('child_process');

function detachedOpts() {
  return { detached: true, stdio: 'ignore', windowsHide: true };
}

function notify(title, message, plan) {
  if (process.platform === 'darwin') notifyMac(title, message, plan);
  else if (process.platform === 'win32') notifyWindows(title, message, plan);
  else notifyLinux(title, message, plan);
}

function notifyMac(title, message, plan) {
  if (plan.sound) spawn('afplay', [plan.sound], detachedOpts()).unref();
  if (plan.toast) {
    const esc = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const script = `display notification "${esc(message)}" with title "${esc(title)}"`;
    spawn('osascript', ['-e', script], detachedOpts()).unref();
  }
}

function notifyWindows(title, message, plan) {
  if (plan.sound) {
    // Synchronous: detached + -WindowStyle Hidden silently suppresses audio on
    // Win11, so block for the clip length. Media.SoundPlayer plays .wav only.
    const soundPs = `(New-Object Media.SoundPlayer '${plan.sound.replace(/'/g, "''")}').PlaySync()`;
    spawnSync('powershell', ['-NoProfile', '-Command', soundPs], { windowsHide: true, stdio: 'ignore' });
  }

  if (plan.toast) {
    // Start-Process fully detaches the toast's PowerShell at the Win32 level.
    // The inner command is base64 (UTF-16 LE) to dodge nested PS quoting.
    const esc = (s) => s.replace(/'/g, "''");
    const innerPs = [
      `[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null`,
      `[System.Reflection.Assembly]::LoadWithPartialName('System.Drawing') | Out-Null`,
      `$ni = New-Object System.Windows.Forms.NotifyIcon`,
      `$ni.Icon = [System.Drawing.SystemIcons]::Information`,
      `$ni.BalloonTipTitle = '${esc(title)}'`,
      `$ni.BalloonTipText = '${esc(message)}'`,
      `$ni.Visible = $true`,
      `$ni.ShowBalloonTip(5000)`,
      `Start-Sleep -Seconds 6`,
      `$ni.Dispose()`,
    ].join('; ');
    const encoded = Buffer.from(innerPs, 'utf16le').toString('base64');
    const outerPs = `Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile','-EncodedCommand','${encoded}'`;
    spawnSync('powershell', ['-NoProfile', '-Command', outerPs], { windowsHide: true, stdio: 'ignore' });
  }
}

function notifyLinux(title, message, plan) {
  if (plan.sound) spawn('paplay', [plan.sound], detachedOpts()).unref();
  if (plan.toast) spawn('notify-send', [title, message], detachedOpts()).unref();
}

module.exports = { notify };
