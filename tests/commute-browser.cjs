const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const repo=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';try{const f=path.join(repo,name);res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/json');res.end(fs.readFileSync(f));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(8795,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-gpu','--no-zygote']});const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({body:''}));
 await page.goto('http://127.0.0.1:8795/');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-tc2-boot'));
 await page.locator('[data-section="listSection"]').click();await page.locator('[data-section="addSection"]').click();
 await page.locator('#word').fill('old');for(const id of ['meaning','synonyms','example','exampleTranslation','memo'])await page.locator('#'+id).fill('old detail');await page.locator('#word').fill('new');for(const id of ['meaning','synonyms','example','exampleTranslation','memo'])assert.equal(await page.locator('#'+id).inputValue(),'');
 await page.locator('[data-section="commuteSection"]').click();
 await page.evaluate(()=>{callOpenAiJson=async ({input})=>{const {type}=JSON.parse(input);return {title:'Staff notice',passage:type==='Part 7'?Array(25).fill('Please submit your travel expenses by Friday.').join(' '):'',passageTranslation:type==='Part 7'?'金曜日までに旅費を提出してください。':'',questions:Array.from({length:type==='Part 7'?3:type==='Part 5'?2:5},()=>({prompt:type==='Part 5'?'Please ____ the report.':'Which day is the deadline?',options:['Friday','Monday','Tuesday','Wednesday'],answer:0,explanation:'締切は金曜日です。ほかの曜日は本文に記載されていません。',translation:'締切は何曜日ですか。',terms:[{word:'submit',meaning:'提出する',pronunciation:'səbˈmɪt',example:'Please submit your expenses.',translation:'経費を提出してください。',collocation:'submit a report'}]}))};};});
 await page.locator('#commutePrimary').click();await page.locator('[name="commuteQ0"]').first().waitFor();
 assert.equal(await page.locator('.commute-feedback').count(),0);
 await page.locator('[name="commuteQ0"][value="0"]').check();await page.reload();await page.locator('[data-section="commuteSection"]').click();assert(await page.locator('[name="commuteQ0"][value="0"]').isChecked());
 for(let group=0;group<3;group++){
  for(let i=0;i<(group===0?3:5);i++){
   const answer=await page.evaluate(i=>{const s=JSON.parse(localStorage.getItem('tangoCho2Commute:v1'));return s.groups[s.index].questions[i].answer;},i);
   await page.locator(`[name="commuteQ${i}"][value="${answer}"]`).check();
  }
  await page.locator('#commuteGrade').click();assert((await page.locator('#commutePractice').boundingBox()).y>=-1);assert((await page.locator('#commutePractice').boundingBox()).y<100);assert.equal(await page.locator('.commute-feedback').count(),group===0?3:5);
  if(group===0){await page.locator('[data-commute-save]').first().click();assert.equal(await page.evaluate(()=>loadWords().filter(w=>w.word==='submit').length),1);await page.locator('#commuteSection').screenshot({path:'/tmp/tc2-commute-mobile.png'});}
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#commuteNext').click();
 }
 assert((await page.locator('#commutePractice').innerText()).includes('13 / 13'));assert.deepEqual(errors,[]);
 console.log('PASS: mobile browser term reset, generation, hidden answers, resume after reload, 13/13 grading, word registration, no horizontal overflow or page errors');await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
