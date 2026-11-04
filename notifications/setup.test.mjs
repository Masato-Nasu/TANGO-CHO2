import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,copyFileSync,mkdirSync,symlinkSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
test('Setup creates and discovers D1 using supported flags, then reuses the account, DB and signing keys',()=>{
 const dir=mkdtempSync(join(tmpdir(),'tc2-setup-test-'));const bin=join(dir,'bin');mkdirSync(bin);
 try{
  for(const file of ['setup.mjs','wrangler.example.json','schema.sql'])copyFileSync(join(root,file),join(dir,file));
  symlinkSync(join(root,'node_modules'),join(dir,'node_modules'),'dir');
  writeFileSync(join(bin,'npx'),'#!/usr/bin/env node\n'+String.raw`
const fs=require('node:fs');
const [tool,...args]=process.argv.slice(2);if(tool!=='wrangler')process.exit(90);
fs.appendFileSync(process.env.TC2_SETUP_TEST_LOG,JSON.stringify(args)+'\n');
const stateFile=process.env.TC2_SETUP_TEST_STATE;
if(args[0]==='whoami'){console.log('Authenticated test account');}
else if(args[0]==='d1'&&args[1]==='list'){
 if(!args.includes('--json'))process.exit(91);
 console.log(JSON.stringify(fs.existsSync(stateFile)?[{name:'tangocho2-notifications',uuid:'11111111-1111-4111-8111-111111111111'}]:[]));
}else if(args[0]==='d1'&&args[1]==='create'){
 if(args.includes('--json')||!args.includes('--update-config=false'))process.exit(92);
 fs.writeFileSync(stateFile,'created');console.log('Successfully created D1 database');
}else if(args[0]==='d1'&&args[1]==='execute'){console.log('Schema installed');}
else if(args[0]==='deploy'){console.log('Test deployment completed');}
else if(args[0]==='secret'&&args[1]==='bulk'){
 const keys=JSON.parse(fs.readFileSync(args[2],'utf8'));
 if(keys.VAPID_PUBLIC_KEY.length!==87||keys.VAPID_PRIVATE_KEY.length!==43)process.exit(93);
 console.log('Signing keys installed');
}else process.exit(94);
`,{mode:0o700});
  const log=join(dir,'commands.jsonl'),env={...process.env,PATH:bin+':'+process.env.PATH,CLOUDFLARE_ACCOUNT_ID:'00000000000000000000000000000001',TC2_SETUP_TEST_LOG:log,TC2_SETUP_TEST_STATE:join(dir,'db-state')};
  const run=()=>spawnSync(process.execPath,[join(dir,'setup.mjs')],{env,encoding:'utf8'});
  const first=run();assert.equal(first.status,0,first.stderr);
  const config=JSON.parse(readFileSync(join(dir,'wrangler.json'),'utf8'));assert.equal(config.account_id,env.CLOUDFLARE_ACCOUNT_ID);assert.equal(config.d1_databases[0].database_id,'11111111-1111-4111-8111-111111111111');assert.deepEqual(config.triggers.crons,['* * * * *']);
  const keyHash=()=>createHash('sha256').update(readFileSync(join(dir,'.keys.json'))).digest('hex');
  const firstHash=keyHash();const second=run();assert.equal(second.status,0,second.stderr);assert.equal(keyHash(),firstHash);assert(!existsSync(join(dir,'.secrets.json')));
  const calls=readFileSync(log,'utf8').trim().split('\n').map(JSON.parse);assert.equal(calls.filter(a=>a[0]==='d1'&&a[1]==='create').length,1);assert.equal(calls.filter(a=>a[0]==='d1'&&a[1]==='list').length,2);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
