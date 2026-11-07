/** Portable test discovery for Windows, Linux and CI. Never silently omit new suites. */
import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export function allTestPaths(root=process.cwd()) {
  return readdirSync(resolve(root,'scripts'))
    .filter(filename => filename.endsWith('.test.mjs'))
    .sort()
    .map(filename => `scripts/${filename}`);
}

if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const files=allTestPaths();
  if (!files.length) throw new Error('No test suites found');
  console.log(`MEDIA TECH VUS: running all ${files.length} Node test suites`);
  const result=spawnSync(process.execPath,['--test',...files],{stdio:'inherit',timeout:180000});
  process.exitCode=result.status??1;
}
