import test from "node:test";
import assert from "node:assert/strict";

function stageForLevel(level){
  if(level<=5) return "Startup Studio";
  if(level<=10) return "Growing Agency";
  if(level<=18) return "Scale-up Tech Firm";
  if(level<=25) return "Regional Powerhouse";
  return "Legendary Empire";
}
function progressPercent(level,xp){
  if(level>=30) return 100;
  return Math.round(((xp%500)/500)*100);
}
function employeeMode(hasTask, cycle){
  if(hasTask && cycle===1) return "meeting";
  if(hasTask && cycle===2) return "screen";
  if(hasTask && cycle===3) return "walk";
  if(hasTask) return "desk";
  return "desk";
}

test("company stage mapping works through max level", ()=>{
  assert.equal(stageForLevel(1),"Startup Studio");
  assert.equal(stageForLevel(8),"Growing Agency");
  assert.equal(stageForLevel(15),"Scale-up Tech Firm");
  assert.equal(stageForLevel(21),"Regional Powerhouse");
  assert.equal(stageForLevel(30),"Legendary Empire");
});

test("progress reaches 100 at max level", ()=>{
  assert.equal(progressPercent(30,99999),100);
  assert.equal(progressPercent(4,250),50);
});

test("employee modes route into meeting and screen states", ()=>{
  assert.equal(employeeMode(true,1), "meeting");
  assert.equal(employeeMode(true,2), "screen");
  assert.equal(employeeMode(true,3), "walk");
  assert.equal(employeeMode(false,0), "desk");
});
