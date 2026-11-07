/** Offline inventory ONLY. No database credentials or remote SQL writes. */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const v18to23 = Object.freeze([
  {version:18, file:'upgrade_v18_meetings.sql', table:'company_meetings'},
  {version:19, file:'upgrade_v19_ai_council.sql', table:'meeting_ai_debates'},
  {version:20, file:'upgrade_v20_council_actions.sql', table:'meeting_action_items_v20'},
  {version:21, file:'upgrade_v21_work_reports.sql', table:'meeting_work_reports_v21'},
  {version:22, file:'upgrade_v22_meeting_handoffs.sql', table:'meeting_handoffs_v22'},
  {version:23, file:'upgrade_v23_handoff_improvements.sql', table:'meeting_handoff_versions_v23'},
]);

export function auditMigrationFiles(root=process.cwd()) {
  return v18to23.map(row => {
    const filepath = resolve(root,'supabase',row.file);
    const exists=existsSync(filepath);
    const sql=exists?readFileSync(filepath,'utf8'):'';
    const declaresTable=sql.toLowerCase().includes(`create table if not exists public.${row.table}`);
    return {...row,fileExists:exists,declaresTable,readyForManualReview:exists&&declaresTable};
  });
}

if(import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const rows = auditMigrationFiles();
  for(const row of rows) console.log(`${row.readyForManualReview?'FOUND':'MISSING'} v${row.version}: supabase/${row.file} (public.${row.table})`);
  console.log('NOTE: This checks ONLY bundled SQL files. It does not query or change any Supabase project.');
  if(rows.some(row=>!row.readyForManualReview)) process.exitCode=1;
}
