import {readFileSync,writeFileSync,existsSync,unlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import webpush from 'web-push';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('.',import.meta.url)));
const run=(args,{capture=false,input}={})=>{
  const r=spawnSync('npx',['wrangler',...args],{encoding:'utf8',stdio:capture?['pipe','pipe','inherit']:input?['pipe','inherit','inherit']:'inherit',input});
  if(r.status!==0)throw new Error('Cloudflareの操作に失敗しました。ログイン・アカウントを確認して再実行してください。');
  return r.stdout||'';
};
const parse=text=>{try{return JSON.parse(text);}catch{const start=text.search(/[\[{]/);return JSON.parse(text.slice(start));}};
try{
  run(['whoami']);
  if(!existsSync('wrangler.json')){
    const name='tangocho2-notifications';
    const list=parse(run(['d1','list','--json'],{capture:true}));
    let database=list.find(x=>x.name===name);
    if(!database)database=parse(run(['d1','create',name,'--json'],{capture:true}));
    const id=database.uuid||database.database_id||database.id;
    if(!id||!/^[a-f0-9-]{36}$/.test(id))throw new Error('D1のIDを取得できませんでした。');
    const config=JSON.parse(readFileSync('wrangler.example.json','utf8'));
    config.d1_databases[0].database_id=id;
    writeFileSync('wrangler.json',JSON.stringify(config,null,2)+'\n');
  }
  const config=JSON.parse(readFileSync('wrangler.json','utf8'));
  config.triggers={crons:['* * * * *']};
  writeFileSync('wrangler.json',JSON.stringify(config,null,2)+'\n');
  if(!existsSync('.keys.json'))writeFileSync('.keys.json',JSON.stringify(webpush.generateVAPIDKeys()),{mode:0o600});
  const keys=JSON.parse(readFileSync('.keys.json','utf8'));
  run(['d1','execute','tangocho2-notifications','--remote','--file','schema.sql']);
  run(['deploy']);
  writeFileSync('.secrets.json',JSON.stringify({VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey}),{mode:0o600});
  try{run(['secret','bulk','.secrets.json']);}finally{unlinkSync('.secrets.json');}
  console.log('\n準備完了。上に表示された https://tangocho2-notifications.…workers.dev をスマホの「通勤練習 → 学習通知 → 初回設定」に入力し、「接続」→「通知を有効にする」を押してください。アプリで設定した時刻（日本時間）に配信します。初回の時刻設定反映には数分かかることがあります。');
}catch(e){console.error(e.message);process.exitCode=1;}
