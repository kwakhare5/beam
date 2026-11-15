import { createServer } from 'vite';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const GOLDEN = resolve(ROOT, 'showcase', 'ui-snapshot.json');
const check = process.argv.includes('--check');

const server = await createServer({
  root: ROOT,
  configFile: false,
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom'
});

let ui;
try {
  ui = await server.ssrLoadModule('/src/renderer/ui/index.ts');
} finally {
  await server.close();
}

const art = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=';
const today = new Date(2026, 10, 15);

const pills = {
  idle: ui.pill({ state: 'idle', title: 'Beam' }),
  quiet: ui.pill({ state: 'quiet', title: '' }),
  playing: ui.pill({ state: 'playing', title: 'Midnight City — M83', art }),
  paused: ui.pill({ state: 'paused', title: 'Midnight City — M83', art }),
  hover: ui.pill({ state: 'playing', title: 'Midnight City — M83', art, hover: true }),
  timer: ui.pill({ state: 'timer', title: '', digits: '4:59' }),
  done: ui.pill({ state: 'done', title: 'Done' }),
  files: ui.pill({ state: 'files', title: '3 files' }),
  drag: ui.pill({ state: 'drag', title: '+3 files' }),
  error: ui.pill({ state: 'error', title: 'Connection lost' })
};

const data = {
  music: {
    title: 'Midnight City',
    subtitle: 'M83',
    art,
    playing: true,
    positionMs: 420000,
    durationMs: 600000
  },
  files: [
    { path: 'C:\\demo\\alpha.txt', name: 'alpha.txt', size: '7 B', kind: 'file' },
    { path: 'C:\\demo\\beta.txt', name: 'beta.txt', size: '6 B', kind: 'file' },
    { path: 'C:\\demo\\gone.txt', name: 'gone.txt', size: '', kind: 'file', missing: true }
  ],
  timer: { mode: 'running', digits: '4:59', note: 'Focus', preset: '5' },
  calendar: { view: today, today },
  settings: { startup: false, shortcut: 'Alt + Space', volume: 60, theme: 'dark' }
};

const panels = {
  music: ui.panel('music', { ...data, files: [] }),
  files: ui.panel('files', data),
  timer: ui.panel('timer', { ...data, files: [] }),
  calendar: ui.panel('calendar', { ...data, files: [] }),
  settings: ui.panel('settings', { ...data, files: [] })
};

const snapshot = { pill: pills, panel: panels };
const text = `${JSON.stringify(snapshot, null, 2)}\n`;

if (check) {
  if (!existsSync(GOLDEN)) {
    console.error(`FAIL missing ${GOLDEN}; run npm run ui:snapshot`);
    process.exit(1);
  }
  const golden = JSON.parse(readFileSync(GOLDEN, 'utf8'));
  const diffs = [];
  for (const group of ['pill', 'panel']) {
    const keys = new Set([...Object.keys(golden[group] ?? {}), ...Object.keys(snapshot[group])]);
    for (const key of keys) {
      if (golden[group]?.[key] !== snapshot[group][key]) diffs.push(`${group}.${key}`);
    }
  }
  if (diffs.length) {
    console.error(`FAIL shared UI drift in: ${diffs.join(', ')}`);
    console.error('If the change is intended, run npm run ui:snapshot and review the diff.');
    process.exit(1);
  }
  console.log(`PASS shared UI snapshot matches (${Object.keys(pills).length} pill states, ${Object.keys(panels).length} tabs)`);
  process.exit(0);
}

writeFileSync(GOLDEN, text);
console.log(`WROTE ${GOLDEN} (${Object.keys(pills).length} pill states, ${Object.keys(panels).length} tabs)`);
process.exit(0);
