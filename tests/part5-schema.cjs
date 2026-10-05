const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const repo=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';const file=path.join(repo,name);try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/json');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(8770,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-gpu','--no-zygote']});
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();const errors=[],bodies=[];let failOne=false;
 page.on('pageerror',e=>errors.push(e.message));await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({body:''}));
 await page.route('https://api.openai.com/v1/responses',async route=>{
  const body=route.request().postDataJSON();bodies.push(body);
  if(!body.text)return route.fulfill({contentType:'application/json',body:JSON.stringify({output:[{content:[{type:'output_text',text:'{"normal":true}'}]}]})});
  assert.equal(body.text.format.type,'json_schema');assert.equal(body.text.format.strict,true);
  const requests=JSON.parse(body.input),props=body.text.format.schema.properties.questions.properties,questions={};
  for(const r of requests){
   assert.deepEqual(props[r.index].required,['supported','sentence','correctOption','distractors','translation','explanation']);assert.equal(props[r.index].additionalProperties,false);
   if(r.type==='VOCAB')assert.deepEqual(props[r.index].properties.correctOption.enum,[r.word]);
   const isVocab=r.type==='VOCAB';
   questions[r.index]={supported:!(failOne && r.index===1),sentence:isVocab?'Managers must be ____ for their decisions.':'The policy establishes clear ____.',correctOption:isVocab?r.word:'accountability',distractors:isVocab?['available','affordable','adaptable']:['account','accountably','accounting'],translation:'責任を明確にします。',explanation:'文の構造に合う品詞と意味を選びます。'};
  }
  await route.fulfill({contentType:'application/json',body:JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({questions})}]}]})});
 });
 await page.addInitScript(()=>localStorage.setItem('tangoCho2Words',JSON.stringify([{id:'a',word:'accountable',meaning:'責任がある',status:'fuzzy'}])));
 await page.goto('http://127.0.0.1:8770/');
 await page.evaluate(()=>{getOpenAiApiKey=()=> 'test-placeholder';getOpenAiModel=()=> 'gpt-5-mini';ensureAiSettingsLoaded=async()=>{};});
 const baseline=await page.evaluate(()=>localStorage.getItem('tangoCho2Words'));
 await page.locator('[data-section="part5Section"]').click();await page.locator('#p5Mode').selectOption('MIX');await page.locator('#p5Start').click();await page.locator('.p5-label').waitFor();
 assert.equal(bodies.length,1);
 const bank=await page.evaluate(()=>JSON.parse(localStorage.getItem('tangoCho2Part5Bank:v1')));
 const wordForm=Object.values(bank).find(q=>q.type==='WORD FORM');assert(wordForm);assert(!wordForm.options.includes('accountable'));assert.equal(wordForm.options[wordForm.answer],'accountability');
 await page.locator('#p5End').click();
 console.log('PASS: actual Responses HTTP boundary uses strict per-question schema, explicit correct option and derivatives without the base word');
 await page.evaluate(()=>localStorage.removeItem('tangoCho2Part5Bank:v1'));failOne=true;
 await page.locator('#p5Start').click();await page.locator('.p5-label').waitFor();assert((await page.locator('#p5Message').textContent()).includes('5問練習します'));assert((await page.locator('#p5Message').textContent()).includes('一部の問題'));
 for(let i=0;i<5;i++){
  const options=await page.locator('[data-p5-answer]').allTextContents();const answer=options.findIndex(s=>s.includes('accountable')||s.includes('accountability'));assert(answer>=0);
  await page.locator('[data-p5-answer]').nth(answer).click();await page.locator('#p5Next').click();
 }
 await page.getByText('練習結果',{exact:true}).waitFor();
 const stats=await page.evaluate(()=>JSON.parse(localStorage.getItem('tangoCho2Part5Stats:v1')));assert.equal(stats.words.accountable.attempts,5);assert.equal(stats.words.accountable.correct,5);assert.equal(await page.evaluate(()=>localStorage.getItem('tangoCho2Words')),baseline);
 const normal=await page.evaluate(()=>callOpenAiJson({instruction:'Return JSON',input:'normal'}));assert.equal(normal.normal,true);assert(!Object.hasOwn(bodies.at(-1),'text'));assert.deepEqual(errors,[]);
 console.log('PASS: one unsupported MIX item does not abort five-question practice; accuracy and statuses preserved; other AI calls unchanged');
 await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
