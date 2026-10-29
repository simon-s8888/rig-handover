import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLine } from './reader.js';

export type NightCounts = { ok: number; retry: number; fail: number };

// Per-line counts by status for one night. Bad lines are not counted; null if no file.
export function countNight(runsDir: string, night: string): NightCounts | null {
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const raw of text.split('\n')) {
    const line = raw.trim() === '' ? null : parseLine(raw);
    if (line) counts[line.status]++;
  }
  return counts;
}
