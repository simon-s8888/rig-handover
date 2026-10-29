import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

let runsDir = '';
const line = (o: object) => JSON.stringify(o);
const GOOD = [
  line({ at: '2026-10-28T02:00:00+01:00', job: 'zeta-sync', status: 'ok', owner: 'ana' }),
  line({ at: '2026-10-28T02:05:00+01:00', job: 'alpha-backup', status: 'retry', owner: null, error: 'timeout' }),
  line({ at: '2026-10-28T02:10:00+01:00', job: 'alpha-backup', status: 'ok', owner: null }),
  line({ at: '2026-10-28T02:15:00+01:00', job: 'mid-report', status: 'fail', owner: 'bo', error: 'boom' }),
];

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-'));
  writeFileSync(join(runsDir, '2026-10-01.jsonl'), GOOD.join('\n') + '\n');
  writeFileSync(join(runsDir, '2026-10-02.jsonl'), '');
  writeFileSync(join(runsDir, '2026-10-03.jsonl'), [GOOD[0], '{"at":"2026-10-28T02:', GOOD[1]].join('\n') + '\n');
});

afterAll(() => rmSync(runsDir, { recursive: true, force: true }));

const app = () =>
  createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir });

describe('GET /digest/:night', () => {
  it('200 with the jobs in a table', async () => {
    const res = await app().request('/digest/2026-10-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('<table');
    for (const job of ['alpha-backup', 'mid-report', 'zeta-sync']) expect(html).toContain(job);
  });

  it('404 for a night with no file', async () => {
    expect((await app().request('/digest/2026-09-30')).status).toBe(404);
  });

  it('empty night says nothing ran', async () => {
    const res = await app().request('/digest/2026-10-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('a bad line still renders the good jobs', async () => {
    const res = await app().request('/digest/2026-10-03');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('zeta-sync');
    expect(html).toContain('alpha-backup');
  });
});

describe('GET /api/digest/:night', () => {
  it('200 with night, rows sorted by job, badLines', async () => {
    const res = await app().request('/api/digest/2026-10-01');
    const body = (await res.json()) as Night;
    expect(res.status).toBe(200);
    expect(body.night).toBe('2026-10-01');
    expect(body.badLines).toBe(0);
    expect(body.rows.map((r) => r.job)).toEqual(['alpha-backup', 'mid-report', 'zeta-sync']);
    expect(body.rows[0]?.owner).toBeNull();
  });

  it('404 for a night with no file', async () => {
    expect((await app().request('/api/digest/2026-09-30')).status).toBe(404);
  });

  it('empty night has no rows and no bad lines', async () => {
    const res = await app().request('/api/digest/2026-10-02');
    const body = (await res.json()) as Night;
    expect(res.status).toBe(200);
    expect(body.rows).toEqual([]);
    expect(body.badLines).toBe(0);
  });

  it('a bad line is counted and the good rows stay', async () => {
    const res = await app().request('/api/digest/2026-10-03');
    const body = (await res.json()) as Night;
    expect(res.status).toBe(200);
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['alpha-backup', 'zeta-sync']);
  });
});

describe('page and JSON agree', () => {
  it('list the same jobs in the same order', async () => {
    const html = await (await app().request('/digest/2026-10-01')).text();
    const body = (await (await app().request('/api/digest/2026-10-01')).json()) as Night;
    const positions = body.rows.map((r) => html.indexOf(r.job));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
