import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { academy, flattened, lessonCount, academyPublic, gradeLesson } from '../apps/api/src/academy.js';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root,path),'utf8');

test('Curriculum CEO has 10 chapters, 30 unique lessons, 60 valid quiz questions',()=>{
  assert.equal(academy.length,10);
  assert.equal(lessonCount,30);
  assert.equal(flattened.length,30);
  assert.equal(new Set(flattened.map(x=>x.id)).size,30);
  assert.equal(flattened.reduce((n,x)=>n+x.questions.length,0),60);
  for(const lesson of flattened){
    assert.ok(lesson.title.length>=8);
    assert.ok(lesson.theory.length>80);
    assert.ok(lesson.example.length>50);
    assert.ok(lesson.exercise.length>20);
    for(const q of lesson.questions){
      assert.equal(q.options.length,4);
      assert.ok(q.correct>=0&&q.correct<=3);
      assert.ok(q.options[q.correct].length>0);
      assert.ok(new Set(q.options).size===4,`Duplicate options in ${lesson.id}`);
    }
  }
});
test('No answer indices leak in public Academy catalog',()=>{
  for(const chapter of academyPublic)for(const lesson of chapter.lessons){
    assert.equal(lesson.questions.length,2);
    for(const q of lesson.questions) assert.equal(Object.hasOwn(q,'correct'),false);
  }
});
test('Quiz grades exactly and rejects invalid lessons/answers',()=>{
  for(const lesson of flattened){
    const answers=lesson.questions.map(q=>q.correct);
    assert.equal(gradeLesson(lesson.id,answers).score,100);
    assert.equal(gradeLesson(lesson.id,answers.map((x)=>(x+1)%4)).score,0);
    assert.equal(gradeLesson(lesson.id,[0]),null);
    assert.equal(gradeLesson(lesson.id,['0','1']),null);
  }
  assert.equal(gradeLesson('unknown-lesson',[1,2]),null);
});
test('Production trust boundaries present',()=>{
  const api=read('apps/api/src/index.js');
  const web=read('apps/web/src/App.tsx')+read('apps/web/src/lib.ts');
  assert.ok(api.includes('db.auth.getUser(jwt)'));
  assert.ok(api.includes("/api/academy/submit"));
  assert.ok(api.includes("/api/ceo/decide"));
  assert.ok(api.includes("/api/ai/plan"));
  assert.ok(api.includes("/api/tasks/auto"));
  assert.ok(api.includes("process_due_auto_tasks"));
  for(const secret of ['SUPABASE_SERVICE_ROLE_KEY','GEMINI_API_KEY','OPENAI_API_KEY'])assert.ok(!web.includes(secret),`${secret} secret appears in web`);
});
test('Migration contains idempotent game operations and no drop table',()=>{
  const schema=read('supabase/upgrade_ceo_empire.sql').toLowerCase();
  for(const required of ['pass_ceo_lesson','issue_ceo_certificate','resolve_ceo_decision','hire_employee','pay_monthly_payroll','create_contract','complete_contract','process_due_auto_tasks','for update skip locked','security definer','service_role'])assert.ok(schema.includes(required),required);
  assert.ok(!/drop\s+table/.test(schema));
  assert.equal((schema.match(/\$\$/g)||[]).length%2,0);
});
test('Core web project and docs exist',()=>{
  for(const file of ['apps/web/src/components/OfficeScene.tsx','apps/web/src/components/AcademyView.tsx','apps/web/src/components/CeoOffice.tsx','apps/web/src/components/ContractsView.tsx','apps/web/src/components/AiPlanner.tsx','apps/web/src/components/HRPanel.tsx','HUONG_DAN_WINDOWS.md','docs/API_ROUTES.md']){
    assert.ok(existsSync(resolve(root,file)),file);
  }
});
