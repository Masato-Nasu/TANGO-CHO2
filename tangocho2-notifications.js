/* Web Push is delivered by the optional notification Worker, never page timers. */
(() => {
  'use strict';
  const KEY='tangoCho2Push:v1';
  const DEFAULT_SERVER='https://tangocho2-notifications.1bitexist.workers.dev';
  let state={};try{state=JSON.parse(localStorage.getItem(KEY)||'{}');}catch{}
  if(!state||typeof state!=='object'||Array.isArray(state))state={};
  const normalizeTimes=times=>Array.isArray(times)&&times.length>=1&&times.length<=6&&times.every(t=>typeof t==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t))?[...new Set(times)].sort():null;
  state.times=normalizeTimes(state.times)||['08:45','18:15'];
  if(typeof state.server!=='string'||!state.server.trim())state.server=DEFAULT_SERVER;
  let config=null,root,busy=false;
  function renderTimes(){
    const list=root.querySelector('#tc2PushTimes');list.replaceChildren();
    state.times.forEach((time,i)=>{
      const row=document.createElement('div');row.className='field-row';
      const label=document.createElement('label');label.textContent=`通知 ${i+1}`;
      const input=document.createElement('input');input.type='time';input.required=true;input.value=time;input.dataset.pushTime='';input.style.minWidth='0';input.style.flex='1';label.append(input);label.style.flex='1';
      const remove=document.createElement('button');remove.type='button';remove.className='ghost-btn';remove.textContent='削除';remove.dataset.removeTime=String(i);remove.disabled=state.times.length===1;
      row.append(label,remove);list.append(row);
    });
  }
  function readTimes(){
    const times=normalizeTimes([...root.querySelectorAll('[data-push-time]')].map(input=>input.value));
    if(!times)throw new Error('通知時刻を1〜6件入力してください。');return times;
  }
  async function saveTimes(){
    if(busy)return;
    busy=true;refresh();
    try{
      const times=readTimes();
      if(state.id){
        if(config?.scheduleVersion!==2)throw new Error('配信サーバーの更新が必要です。接続先の詳細の手順で更新してください。');
        await api(`/subscriptions/${state.id}`,{method:'PUT',body:{times},auth:true});
      }
      state.times=times;save();renderTimes();msg(state.id?'通知時刻を変更しました。':'通知時刻を保存しました。配信には通知の有効化が必要です。');
    }catch(e){msg(e.message||'通知時刻を保存できませんでした。');}
    finally{busy=false;refresh();}
  }
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
    busy=true;refresh();
    try{
      const server=serviceUrl(root.querySelector('#tc2PushServer').value.trim());
      if(state.id&&server!==state.server)throw new Error('先に現在の通知を解除してください。');
      const previous=state.server;state.server=server;
      try{
        const data=await api('/config');
        if(data.service!=='tangocho2-notifications'||!/^[\w-]{87}$/.test(data.publicKey)||data.timezone!=='Asia/Tokyo')throw new Error('通知サーバーの設定を確認できませんでした。');
        config=data;
        if(state.id&&config.scheduleVersion===2){
          const schedule=await api(`/subscriptions/${state.id}`,{auth:true});
          const times=normalizeTimes(schedule.times);if(times){state.times=times;renderTimes();}
        }
        save();
        msg(config.scheduleVersion!==2?'配信サーバーの更新が必要です。接続先の詳細の手順で更新してください。':state.id?'通知サーバーに接続しました。':'接続しました。「通知を有効にする」を押してください。');
      }catch(e){state.server=previous;config=null;throw e;}
    }catch(e){msg(e.message||'接続できませんでした。');}
    finally{busy=false;refresh();}
  }
  function bytes(key){const raw=atob(key.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-key.length%4)%4));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
  function availability(){
    if(!supports())return 'このブラウザでは通知を利用できません。AndroidのChrome、またはホーム画面へ追加したiPhoneアプリで開いてください。';
    if(!state.server&&!config)return '通知の配信準備が必要です。配信サーバーの初回公開と、下の「接続先の詳細」での接続が済むまで通知は届きません。時刻は先に保存できます。';
    if(!config)return busy?'通知サーバーへの接続を確認しています…':'通知サーバーに接続できていません。「接続先の詳細」で配信先URLを確認し、接続してください。';
    if(config.scheduleVersion!==2)return '通知サーバーの更新が必要です。接続先の詳細の手順で配信サーバーを更新してください。';
    if(Notification.permission==='denied')return 'スマホ側でこのサイトの通知がブロックされています。ブラウザのサイト設定で通知を許可してください。';
    return state.id?'通知を登録済みです。テスト通知で受信を確認できます。':'配信先に接続しました。「通知を有効にする」を押すとスマホの通知許可へ進みます。';
  }
  function refresh(){
    const ready=Boolean(config?.scheduleVersion===2&&supports());
    const enable=root.querySelector('#tc2PushEnable');
    enable.disabled=busy||!ready||Boolean(state.id)||window.Notification?.permission==='denied';
    enable.textContent=!state.server&&!config?'配信の準備が必要です':!config?'配信先への接続が必要です':config.scheduleVersion!==2?'配信サーバーの更新が必要です':'通知を有効にする';
    root.querySelector('#tc2PushAvailability').textContent=availability();
    root.querySelector('#tc2PushServer').disabled=busy;
    root.querySelector('#tc2PushDisable').disabled=busy||!state.id;
    root.querySelector('#tc2PushTest').disabled=busy||!state.id;
    root.querySelector('#tc2PushConnect').disabled=busy;
    root.querySelector('#tc2PushSaveTimes').disabled=busy;
    root.querySelector('#tc2PushAddTime').disabled=busy||root.querySelectorAll('[data-push-time]').length>=6;
    root.querySelectorAll('[data-push-time], [data-remove-time]').forEach(el=>el.disabled=busy||(el.hasAttribute('data-remove-time')&&root.querySelectorAll('[data-push-time]').length===1));
    root.querySelector('#tc2PushState').textContent=`${state.id?'登録済み':'未設定'} · 毎日 ${state.times.join('／')}（日本時間）`;
  }
  async function enable(){
    if(busy||!config||!supports())return;
    if(config.scheduleVersion!==2){msg('配信サーバーの更新が必要です。');return;}
    let times;try{times=readTimes();}catch(e){msg(e.message);return;}
    // Permission request must begin in the user's click gesture (including iOS).
    let permission;
    try{permission=Notification.requestPermission();}catch{msg('通知の許可画面を開けませんでした。Chromeなどのブラウザでアプリを直接開いてください。');return;}
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
      const result=await api('/subscriptions',{method:'POST',body:{subscription:subscription.toJSON(),times}});
      if(typeof result.id!=='string'||typeof result.token!=='string')throw new Error('通知登録を確認できませんでした。');
      state={server:state.server,id:result.id,token:result.token,times};
      try{save();}catch(e){await api(`/subscriptions/${state.id}`,{method:'DELETE',auth:true});state={server:state.server,times:state.times};throw new Error('通知設定を保存できませんでした。端末の空き容量を確認してください。');}
      msg('通知を登録しました。テスト通知で届くことを確認してください。');
    }catch(e){if(created&&subscription&&!state.id)try{await subscription.unsubscribe();}catch{}msg(e.message||'通知登録に失敗しました。');}
    finally{busy=false;refresh();}
  }
  async function disable(){
    if(busy||!state.id)return;busy=true;refresh();
    try{
      await api(`/subscriptions/${state.id}`,{method:'DELETE',auth:true});
      state={server:state.server,times:state.times};save();
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
    const host=document.querySelector('#commuteSettings');if(!host)return;
    root=document.createElement('details');root.className='card';
    root.innerHTML='<summary>学習通知</summary><p id="tc2PushState"></p><p class="note">アプリを閉じていても練習時刻をお知らせします。通知をタップすると通勤テストを開きます。通信状況や省電力設定で遅れることがあります。iPhoneではホーム画面へ追加したアプリから設定してください。</p><p class="note">通知時刻（日本時間・毎日／最大6回）</p><div id="tc2PushTimes"></div><button class="ghost-btn" type="button" id="tc2PushAddTime">時刻を追加</button><button class="secondary-btn" type="button" id="tc2PushSaveTimes">時刻を保存</button><details id="tc2PushSetup"><summary>接続先の詳細</summary><label class="field-label" for="tc2PushServer">配信先URL</label><input type="url" id="tc2PushServer" placeholder="https://tangocho2-notifications.1bitexist.workers.dev" autocomplete="off"><button class="secondary-btn" type="button" id="tc2PushConnect">接続</button><p class="note">配信先は設定済みです。通常は変更不要です。<a href="https://github.com/Masato-Nasu/TANGO-CHO2/tree/main/notifications" target="_blank" rel="noopener">設定手順</a></p></details><p id="tc2PushAvailability" class="note" role="status"></p><button class="primary-btn" type="button" id="tc2PushEnable">通知を有効にする</button><button class="ghost-btn" type="button" id="tc2PushTest">テスト通知</button><button class="ghost-btn" type="button" id="tc2PushDisable">通知を解除</button><p id="tc2PushMsg" role="status"></p>';
    host.after(root);renderTimes();
    root.querySelector('#tc2PushSetup').open=!state.server;
    root.querySelector('#tc2PushSaveTimes').addEventListener('click',saveTimes);
    root.querySelector('#tc2PushAddTime').addEventListener('click',()=>{
      if(busy)return;
      const draft=[...root.querySelectorAll('[data-push-time]')].map(el=>el.value);
      if(draft.length<6){const saved=state.times;state.times=[...draft,'12:00'];renderTimes();state.times=saved;refresh();}
    });
    root.addEventListener('click',ev=>{
      const remove=ev.target.closest('[data-remove-time]');if(!remove||busy)return;
      const draft=[...root.querySelectorAll('[data-push-time]')].map(el=>el.value);if(draft.length<=1)return;
      draft.splice(Number(remove.dataset.removeTime),1);const saved=state.times;state.times=draft;renderTimes();state.times=saved;refresh();
    });
    root.querySelector('#tc2PushServer').value=state.server||'';
    root.querySelector('#tc2PushConnect').addEventListener('click',connect);
    root.querySelector('#tc2PushEnable').addEventListener('click',enable);
    root.querySelector('#tc2PushTest').addEventListener('click',test);
    root.querySelector('#tc2PushDisable').addEventListener('click',disable);
    if(!supports())msg('このブラウザでは通知を利用できません。AndroidのChrome、またはホーム画面へ追加したiPhoneアプリから開いてください。');
    else if(!state.server)msg('通知はまだ有効になっていません。接続先の詳細が必要です。');
    if(state.server&&supports())connect();
    refresh();openPractice();window.addEventListener('hashchange',openPractice);
  }
  document.addEventListener('DOMContentLoaded',init);
})();
