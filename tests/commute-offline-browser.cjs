const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const repo=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';try{const f=path.join(repo,name);res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/json');res.end(fs.readFileSync(f));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(8797,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-gpu','--no-zygote']});const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});const page=await context.newPage();const errors=[],dialogs=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.dismiss();});
 await context.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({body:''}));
 await context.addInitScript(()=>{
  const connection=new EventTarget();connection.type='wifi';Object.defineProperty(navigator,'connection',{value:connection});
  window.addEventListener('DOMContentLoaded',()=>{
   window.aiCalls=0;ensureAiSettingsLoaded=async()=>({});getOpenAiApiKey=()=> 'test-placeholder';
   callOpenAiJson=async({input})=>{window.aiCalls++;const {type}=JSON.parse(input);return {title:'Commuter set '+window.aiCalls,passage:type==='Part 7'?Array(25).fill('Please submit your travel expenses by Friday.').join(' '):'',passageTranslation:type==='Part 7'?'金曜日までに旅費を提出してください。':'',questions:Array.from({length:type==='Part 7'?3:5},()=>({prompt:type==='Part 5'?'Please ____ the report.':'Which day is the deadline?',options:['Friday','Monday','Tuesday','Wednesday'],answer:0,explanation:'締切は金曜日です。',translation:'締切は何曜日ですか。',terms:[{word:'submit',meaning:'提出する',pronunciation:'səbˈmɪt',example:'Please submit your expenses.',translation:'経費を提出してください。',collocation:'submit a report'}]}))};};
  });
 });
 await page.goto('http://127.0.0.1:8797/');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tangoCho2CommuteQueue:v1')||'[]').length===2);
 assert.equal(await page.evaluate(()=>aiCalls),6);
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 await page.locator('[data-section="commuteSection"]').click();assert.equal(await page.locator('[data-offline-start]').count(),2);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await context.setOffline(true);await page.reload();await page.locator('[data-section="commuteSection"]').click();assert.equal(await page.locator('[data-offline-start]').count(),2);assert.equal(await page.evaluate(()=>aiCalls),0);
 await page.locator('[data-offline-start]').first().click();
 const firstId=await page.evaluate(()=>JSON.parse(localStorage.getItem('tangoCho2Commute:v1')).id);
 const firstAnswer=await page.evaluate(()=>JSON.parse(localStorage.getItem('tangoCho2Commute:v1')).groups[0].questions[0].answer);
 await page.locator(`[name="commuteQ0"][value="${firstAnswer}"]`).check();
 assert((await page.locator('#commuteOfflineStatus').innerText()).includes('解答中1回分 ＋ 保存済み1回分 · 合計2/2回分'));
 assert(await page.locator('[data-offline-start]').isEnabled());await page.locator('[data-offline-start]').click();
 assert.notEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('tangoCho2Commute:v1')).id),firstId);
 await page.locator(`[data-offline-start="${firstId}"]`).click();assert(await page.locator(`[name="commuteQ0"][value="${firstAnswer}"]`).isChecked());
 await page.locator('#commuteStart').click();assert.equal(await page.evaluate(()=>aiCalls),0);assert.deepEqual(dialogs,[]);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 for(let group=0;group<3;group++){
  for(let i=0;i<(group===0?3:5);i++){
   const answer=await page.evaluate(i=>{const s=JSON.parse(localStorage.getItem('tangoCho2Commute:v1'));return s.groups[s.index].questions[i].answer;},i);
   await page.locator(`[name="commuteQ${i}"][value="${answer}"]`).check();
  }
  await page.locator('#commuteGrade').click();await page.locator('#commuteNext').click();
 }
 assert((await page.locator('#commutePractice').innerText()).includes('13 / 13'));await page.locator('[data-offline-start]').click();assert(await page.locator('[name="commuteQ0"]').first().isVisible());assert.equal(await page.evaluate(()=>aiCalls),0);assert.deepEqual(errors,[]);assert.deepEqual(dialogs,[]);
 console.log('PASS: real mobile PWA caches both sets, reloads offline, grades all 13 questions and opens the second set with no AI calls or page errors');await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
