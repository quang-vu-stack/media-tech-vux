import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Never reuse a stale QA report from an earlier code version. */
export function defaultQaReportPath({ cwd = process.cwd(), fsRead = readFileSync } = {}) {
  const raw = fsRead(resolve(cwd, 'package.json'), 'utf8');
  const parsed = JSON.parse(raw);
  if (!/^\d+\.\d+\.\d+$/.test(parsed.version)) throw new Error('Project version is invalid');
  return `qa-reports/v${parsed.version.split('.')[0]}-local-report.json`;
}
