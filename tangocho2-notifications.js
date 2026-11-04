/* Web Push is delivered by the optional notification Worker, never page timers. */
(() => {
  'use strict';
  const KEY='tangoCho2Push:v1';
  let state={};try{state=JSON.parse(localStorage.getItem(KEY)||'{}');}catch{}
  let config=null,root,busy=false;
  const supports=()=> 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
  const msg=text=>{root.querySelector('#tc2PushMsg').textContent=text;};
  function serviceUrl(raw){const u=new URL(raw);if(u.protocol!=='https:'||!u.hostname.endsWith('.workers.dev')||u.username||u.password||u.port)throw new Error('デプロイ時に表示されたhttps://…workers.devを入力してください。');return u.origin;}
  async function api(path,{method='GET',body,auth=false}={}){
    const headers={};if(body)headers['Content-Type']='application/json';if(auth)headers.Authorization=`Bearer ${state.token}`;
    const response=await fetch(state.server+path,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
    let data={};try{data=await response.json();}catch{}
    if(!response.ok)throw new Error(data.error||'通知サーバーへ接続できませんでした。');return data;
  }
  async function connect(){
    if(busy)return;
    busy=true;
    try{
      const server=serviceUrl(root.querySelector('#tc2PushServer').value.trim());
      if(state.id&&server!==state.server)throw new Error('先に現在の通知を解除してください。');
      const previous=state.server;state.server=server;
      try{
        const data=await api('/config');
        if(data.service!=='tangocho2-notifications'||!/^[\w-]{87}$/.test(data.publicKey)||data.timezone!=='Asia/Tokyo')throw new Error('通知サーバーの設定を確認できませんでした。');
        config=data;save();
        msg('接続しました。「通知を有効にする」を押してください。');
      }catch(e){state.server=previous;config=null;throw e;}
    }catch(e){msg(e.message||'接続できませんでした。');}
    finally{busy=false;refresh();}
  }
  function bytes(key){const raw=atob(key.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-key.length%4)%4));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
  function refresh(){
    root.querySelector('#tc2PushEnable').disabled=busy||!config||!supports()||Boolean(state.id);
    root.querySelector('#tc2PushDisable').disabled=busy||!state.id;
    root.querySelector('#tc2PushTest').disabled=busy||!state.id;
    root.querySelector('#tc2PushConnect').disabled=busy;
    root.querySelector('#tc2PushState').textContent=state.id?'登録済み · 毎日8:45／18:15（日本時間）':'未設定 · 毎日8:45／18:15（日本時間）';
  }
  async function enable(){
    if(busy||!config||!supports())return;
    // Permission request must begin in the user's click gesture (including iOS).
    const permission=Notification.requestPermission();
    busy=true;refresh();
    let subscription,created=false;
    try{
      if(await permission!=='granted')throw new Error('通知が許可されていません。スマホのサイト設定から許可してください。');
      const registration=await navigator.serviceWorker.ready;
      subscription=await registration.pushManager.getSubscription();
      if(subscription){
        // Lost local credentials cannot safely control a former registration.
        if(!state.id){await subscription.unsubscribe();subscription=null;}
      }
      if(!subscription){subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(config.publicKey)});created=true;}
      const result=await api('/subscriptions',{method:'POST',body:subscription.toJSON()});
      if(typeof result.id!=='string'||typeof result.token!=='string')throw new Error('通知登録を確認できませんでした。');
      state={server:state.server,id:result.id,token:result.token};
      try{save();}catch(e){await api(`/subscriptions/${state.id}`,{method:'DELETE',auth:true});state={server:state.server};throw new Error('通知設定を保存できませんでした。端末の空き容量を確認してください。');}
      msg('通知を登録しました。テスト通知で届くことを確認してください。');
    }catch(e){if(created&&subscription&&!state.id)try{await subscription.unsubscribe();}catch{}msg(e.message||'通知登録に失敗しました。');}
    finally{busy=false;refresh();}
  }
  async function disable(){
    if(busy||!state.id)return;busy=true;refresh();
    try{
      await api(`/subscriptions/${state.id}`,{method:'DELETE',auth:true});
      state={server:state.server};save();
      try{const registration=await navigator.serviceWorker.ready;const sub=await registration.pushManager.getSubscription();if(sub)await sub.unsubscribe();}catch{}
      msg('学習通知を解除しました。');
    }catch(e){msg(e.message||'通知を解除できませんでした。通信を確認して再度お試しください。');}
    finally{busy=false;refresh();}
  }
  async function test(){
    if(busy||!state.id)return;busy=true;refresh();
    try{await api(`/subscriptions/${state.id}/test`,{method:'POST',auth:true});msg('テスト通知を送信しました。スマホの通知を確認してください。');}catch(e){msg(e.message||'送信できませんでした。');}finally{busy=false;refresh();}
  }
  function openPractice(){if(location.hash==='#commute')document.querySelector('[data-section="commuteSection"]')?.click();}
  function init(){
    const host=document.querySelector('#commuteSection > .card');if(!host)return;
    root=document.createElement('details');root.className='card';
    root.innerHTML='<summary>学習通知</summary><p id="tc2PushState"></p><p class="note">アプリを閉じていても練習時刻をお知らせします。通知をタップすると通勤練習を開きます。通信状況や省電力設定で遅れることがあります。iPhoneではホーム画面へ追加したアプリから設定してください。</p><details id="tc2PushSetup"><summary>初回設定</summary><label class="field-label" for="tc2PushServer">配信先URL</label><input type="url" id="tc2PushServer" placeholder="https://tangocho2-notifications.…workers.dev" autocomplete="off"><button class="secondary-btn" type="button" id="tc2PushConnect">接続</button><p class="note">配信先の初回準備はPCで行います。<a href="https://github.com/Masato-Nasu/TANGO-CHO2/tree/main/notifications" target="_blank" rel="noopener">設定手順</a></p></details><button class="primary-btn" type="button" id="tc2PushEnable">通知を有効にする</button><button class="ghost-btn" type="button" id="tc2PushTest">テスト通知</button><button class="ghost-btn" type="button" id="tc2PushDisable">通知を解除</button><p id="tc2PushMsg" role="status"></p>';
    host.after(root);
    root.querySelector('#tc2PushServer').value=state.server||'';
    root.querySelector('#tc2PushConnect').addEventListener('click',connect);
    root.querySelector('#tc2PushEnable').addEventListener('click',enable);
    root.querySelector('#tc2PushTest').addEventListener('click',test);
    root.querySelector('#tc2PushDisable').addEventListener('click',disable);
    if(!supports())msg('このブラウザでは通知を利用できません。AndroidのChrome、またはホーム画面へ追加したiPhoneアプリから開いてください。');
    else if(!state.server)msg('通知はまだ有効になっていません。初回設定が必要です。');
    if(state.server&&supports())connect();
    refresh();openPractice();window.addEventListener('hashchange',openPractice);
  }
  document.addEventListener('DOMContentLoaded',init);
})();
