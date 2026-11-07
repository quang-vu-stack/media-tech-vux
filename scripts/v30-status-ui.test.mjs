import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../apps/web/src/components/VuxControlPanel.tsx',import.meta.url),'utf8');
test('Gemini status not mislabeled as confirmed running',()=>{
 assert.match(src,/ĐỦ ĐIỀU KIỆN/);
 assert.match(src,/không đồng nghĩa worker đang thực hiện hội thoại/);
});
test('disabled topup explicitly explained and protected',()=>{
 assert.match(src,/disabled=\{busy\|\|employees\.length>=19\}/);
 assert.match(src,/đạt mục tiêu tối thiểu 19/);
});
test('paid provider requires backend-only configuration and explicit consent',()=>{
 assert.match(src,/ENABLE_VUX_AUTONOMOUS_GEMINI=true/);
 assert.match(src,/không thêm biến/);
});
