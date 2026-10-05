const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const repo=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';const file=path.join(repo,name);try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/json');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(8769,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-gpu','--no-zygote']});
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({body:''}));
 await page.addInitScript(()=>localStorage.setItem('tangoCho2Words',JSON.stringify([{id:'momentum',word:'momentum',meaning:'勢い',status:'fuzzy',memo:'保存済み'}])));
 await page.goto('http://127.0.0.1:8769/');await page.locator('[data-section="part5Section"]').click();
 const baseline=await page.evaluate(()=>localStorage.getItem('tangoCho2Words'));
 async function setup(kind){await page.evaluate(kind=>{
  localStorage.removeItem('tangoCho2Part5Bank:v1');window.requests=[];
  callOpenAiJson=async ({input})=>{
   const requests=JSON.parse(input);window.requests.push(requests);
   if(kind==='missing' && window.requests.length===1)return {};
   return {questions:requests.map(r=>{
    if(kind==='unsupported')return {index:r.index,unsupported:true};
    const bad=kind==='bad' || kind==='repair' && window.requests.length===1 && r.index===2;
    return {index:String(r.index),type:' vocab ',sentence:'The campaign helped the team maintain _____.',options:['progress',' momentum ','expense','equipment'],answer:bad?0:kind==='format'?(r.index%3===0?'B':r.index%3===1?'1':'momentum'):1,translation:'そのキャンペーンはチームが勢いを維持する助けになりました。',explanation:'maintain momentumで勢いを維持する。他の選択肢はこの文脈に適さない。'};
   })};
  };
 },kind);}
 await setup('format');await page.locator('#p5Start').click();await page.locator('.p5-label').waitFor();
 assert.equal(await page.evaluate(()=>requests.length),1);assert.equal(await page.locator('.p5-sentence').textContent(),'The campaign helped the team maintain ____.');
 const choices=await page.locator('[data-p5-answer]').allTextContents();await page.locator('[data-p5-answer]').nth(choices.findIndex(x=>x.includes('momentum'))).click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tangoCho2Part5Stats:v1')).words.momentum.correct),1);
 await page.locator('#p5End').click();
 console.log('PASS: momentum, letter/text/string-number answers, case/whitespace and variable blank lengths');
 await setup('repair');await page.locator('#p5Start').click();await page.locator('.p5-label').waitFor();
 const requests=await page.evaluate(()=>window.requests);assert.equal(requests.length,2);assert.equal(requests[0].length,5);assert.deepEqual(requests[1].map(r=>r.index),[2]);
 await page.locator('#p5End').click();
 console.log('PASS: only invalid question is regenerated; valid questions survive');
 await setup('missing');await page.locator('#p5Start').click();await page.locator('.p5-label').waitFor();assert.equal(await page.evaluate(()=>requests.length),2);await page.locator('#p5End').click();
 const stats=await page.evaluate(()=>localStorage.getItem('tangoCho2Part5Stats:v1'));
 await setup('bad');await page.locator('#p5Start').click();await page.waitForFunction(()=>document.querySelector('#p5Message').textContent.includes('問題を作成できませんでした'));
 assert.equal(await page.evaluate(()=>requests.length),2);assert.equal(await page.locator('[data-p5-answer]').count(),0);assert(await page.locator('#p5Start').isEnabled());
 assert.equal(await page.evaluate(()=>localStorage.getItem('tangoCho2Part5Stats:v1')),stats);
 await setup('unsupported');await page.locator('#p5Mode').selectOption('WORD FORM');await page.locator('#p5Start').click();await page.waitForFunction(()=>document.querySelector('#p5Message').textContent.includes('VOCABを選んでください'));
 assert.equal(await page.evaluate(()=>requests.length),1);assert.equal(await page.evaluate(()=>localStorage.getItem('tangoCho2Words')),baseline);assert.deepEqual(errors,[]);
 console.log('PASS: missing response repair, bounded retries, wrong answers rejected, unsupported family reported, statuses/stats untouched on failure');
 await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
