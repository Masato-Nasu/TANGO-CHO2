const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const repo=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(repo,'tangocho2-commute.js'),'utf8');
const dom=new JSDOM('<html><body></body></html>',{url:'https://test.invalid',runScripts:'outside-only'});
dom.window.eval(source.replace("document.addEventListener('DOMContentLoaded',init);",'window.testDistribute=distributeAnswers;'));
const make=()=>({id:'old',index:0,complete:false,groups:[3,5,5].map((count,g)=>({type:['Part 7','Part 5','語彙'][g],graded:false,questions:Array.from({length:count},(_,i)=>({options:[`wrong-a-${g}-${i}`,`correct-${g}-${i}`,`wrong-c-${g}-${i}`,`wrong-d-${g}-${i}`],answer:1,choice:i===0?2:null,explanation:'正解はBです。選択肢 A は不適切。(B)が正しい。A: 誤り。Option C is wrong. A shipment arrived.'}))}))});
for(let n=0;n<100;n++){
 const input=make(),result=dom.window.testDistribute(input),totals=[0,0,0,0];
 result.groups.forEach((g,gi)=>{
  const counts=[0,0,0,0];g.questions.forEach((q,qi)=>{
   assert.equal(q.options[q.answer],`correct-${gi}-${qi}`);counts[q.answer]++;totals[q.answer]++;
   assert.equal(q.choice===null,null===input.groups[gi].questions[qi].choice);
   if(q.choice!==null)assert.equal(q.options[q.choice],`wrong-c-${gi}-${qi}`);
   const oldA=q.options.indexOf(`wrong-a-${gi}-${qi}`),oldC=q.options.indexOf(`wrong-c-${gi}-${qi}`);
   assert(q.explanation.includes(`正解は${'ABCD'[q.answer]}です`));assert(q.explanation.includes(`選択肢 ${'ABCD'[oldA]} は`));assert(q.explanation.includes(`(${'ABCD'[q.answer]})が`));assert(q.explanation.includes(`Option ${'ABCD'[oldC]} is`));assert(q.explanation.includes('A shipment arrived.'));
  });assert(Math.max(...counts)-Math.min(...counts)<=1);
 });assert.deepEqual([...totals].sort(),[3,3,3,4]);assert.equal(dom.window.testDistribute(result),result);assert.equal(input.groups[0].questions[0].answer,1);
}
const input=make();input.groups[0].graded=true;assert.equal(dom.window.testDistribute(input).groups[0],input.groups[0]);
console.log('PASS: 100 all-B fixtures become balanced A-D sessions and parts, correct option text and selected text are preserved, explanations remap once, graded groups and versioned layouts stay unchanged');dom.window.close();
