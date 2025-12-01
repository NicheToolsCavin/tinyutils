import { spawn } from 'node:child_process';

export function runNodeScript(label, script, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [script], {
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });
    child.on('exit', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${label} failed with code ${code}`));
    });
  });
}
