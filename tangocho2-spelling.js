/* TANGO-CHO2 spelling correction. Local WordNet data; no API key or network AI call. */
(() => {
  'use strict';
  const common = Object.freeze({
    recieve:'receive',recieved:'received',recieves:'receives',recieving:'receiving',
    acheive:'achieve',acheived:'achieved',acheivement:'achievement',achievment:'achievement',
    seperate:'separate',seperated:'separated',seperately:'separately',seperation:'separation',
    definately:'definitely',definitly:'definitely',definate:'definite',
    accomodate:'accommodate',accomodation:'accommodation',acommodate:'accommodate',
    occured:'occurred',occuring:'occurring',occurance:'occurrence',occurrance:'occurrence',
    commitee:'committee',committe:'committee',comittee:'committee',
    adress:'address',adresses:'addresses',addres:'address',
    enviroment:'environment',enviornment:'environment',goverment:'government',
    neccessary:'necessary',necesary:'necessary',neccessarily:'necessarily',
    buisness:'business',bussiness:'business',buisiness:'business',
    succesful:'successful',successfull:'successful',sucess:'success',succesfully:'successfully',
    responsability:'responsibility',responsibilty:'responsibility',
    independant:'independent',
    desicion:'decision',decison:'decision',desisions:'decisions',
    concious:'conscious',conscous:'conscious',consious:'conscious',
    embarass:'embarrass',embarassed:'embarrassed',embarassing:'embarrassing',
    maintainance:'maintenance',maintainence:'maintenance',
    recomend:'recommend',reccomend:'recommend',recommand:'recommend',
    tommorow:'tomorrow',tommorrow:'tomorrow',
    untill:'until',truely:'truly',arguement:'argument',wierd:'weird',
    priviledge:'privilege',privelege:'privilege',persistant:'persistent',
    begining:'beginning',beleive:'believe',beleived:'believed',beleives:'believes',
    calandar:'calendar',grammer:'grammar',
    oportunity:'opportunity',oppurtunity:'opportunity',ocassion:'occasion',
    applys:'applies',studys:'studies',tryed:'tried',replyed:'replied'
  });
  // These are valid words (even if another word is often intended).
  const validCommon = new Set(['a','an','the','and','or','but','if','to','of','for','with','in','on','at','by','from','as','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','can','could','shall','should','may','might','must','i','you','he','she','it','we','they','this','that','these','those','his','her','their','our','your','its','my','me','us','them','whose','whom','who','which','what','when','where','why','how','not','no','yes','than','then','dependent','dependant','calender']);
  const doubled = new Set(['occur','prefer','refer','admit','permit','commit','regret','submit','control','travel','cancel']);
  let sets, loading, pending = null, requestId = 0;
  const memo = new Map();
  const buttons = '#translateBtn,#aiAssistBtn,#synFetchBtn,#saveBtn';
  const replay = new WeakSet();

  function casing(source, corrected) {
    if (source === source.toUpperCase()) return corrected.toUpperCase();
    if (/^[A-Z][a-z]+$/.test(source)) return corrected[0].toUpperCase()+corrected.slice(1);
    return corrected;
  }
  async function dictionary() {
    if (sets) return sets;
    if (!loading) loading = (async () => {
      await __loadPosSets();
      const candidate = __posSets;
      if (!candidate || !candidate.n.size || !candidate.v.size) throw new Error('辞書を読み込めませんでした。');
      sets = candidate;
      return sets;
    })().catch(e => { loading = null; throw e; });
    return loading;
  }
  function forms(base, pos) {
    const result = new Set([base]);
    if (pos === 'n' || pos === 'v') {
      result.add(/[^aeiou]y$/.test(base) ? base.slice(0,-1)+'ies' : /(?:s|x|z|ch|sh|o)$/.test(base) ? base+'es' : base+'s');
    }
    const double = doubled.has(base) || (base.length <= 5 && /[^aeiou][aeiou][^aeiouwxy]$/.test(base));
    if (pos === 'v') {
      result.add(base.endsWith('e') ? base+'d' : /[^aeiou]y$/.test(base) ? base.slice(0,-1)+'ied' : base+'ed');
      result.add(base.endsWith('ie') ? base.slice(0,-2)+'ying' : /[^e]e$/.test(base) ? base.slice(0,-1)+'ing' : base+'ing');
      if (double) { result.add(base+base.at(-1)+'ed'); result.add(base+base.at(-1)+'ing'); }
    }
    if (pos === 'adj' && base.length <= 6) {
      for (const suffix of ['er','est']) {
        result.add(base.endsWith('e') ? base+suffix.slice(1) : /[^aeiou]y$/.test(base) ? base.slice(0,-1)+'i'+suffix : base+suffix);
        if (double) result.add(base+base.at(-1)+suffix);
      }
    }
    return result;
  }
  function known(word) {
    if (validCommon.has(word) || Object.values(sets).some(set=>set.has(word))) return true;
    for (const base of __posVariants(word)) {
      for (const pos of ['n','v','adj']) if (sets[pos].has(base) && forms(base,pos).has(word)) return true;
    }
    return false;
  }
  function suggestions(word) {
    const found = new Set();
    const check = candidate => { if (candidate !== word && known(candidate)) found.add(candidate); };
    for (let i=0;i<word.length;i++) {
      check(word.slice(0,i)+word.slice(i+1));
      if (i+1<word.length) check(word.slice(0,i)+word[i+1]+word[i]+word.slice(i+2));
      for (const c of 'abcdefghijklmnopqrstuvwxyz') check(word.slice(0,i)+c+word.slice(i+1));
    }
    for (let i=0;i<=word.length;i++) for (const c of 'abcdefghijklmnopqrstuvwxyz') check(word.slice(0,i)+c+word.slice(i));
    return [...found];
  }
  async function corrected(raw) {
    // Correct common errors in expressions too. Never reinterpret correctly spelled words.
    const mapped = raw.replace(/[A-Za-z]+/g, token => {
      const lower = token.toLowerCase();
      return common[lower] && !validCommon.has(lower) ? casing(token,common[lower]) : token;
    });
    if (mapped !== raw) return {value:mapped,reason:'よくあるスペルミス'};
    if (/^[A-Z]/.test(raw) || !/^[a-zA-Z]{4,24}$/.test(raw) || /^[A-Z]{2,}$/.test(raw) || /[a-z][A-Z]/.test(raw)) return {value:raw};
    const lower = raw.toLowerCase();
    if (memo.has(lower)) return {value:casing(raw,memo.get(lower))};
    try {
      await dictionary();
      if (known(lower)) { memo.set(lower,lower); return {value:raw}; }
      const candidates = suggestions(lower);
      // Ambiguous candidates require user judgment; do not silently substitute another word.
      const value = candidates.length === 1 ? candidates[0] : lower;
      memo.set(lower,value);
      if (memo.size > 500) memo.delete(memo.keys().next().value);
      return {value:casing(raw,value),candidates:candidates.length > 1 ? candidates.slice(0,4) : []};
    } catch (_) { return {value:raw}; }
  }
  function status(text) { const el=document.getElementById('tc2SpellingStatus');if(el)el.textContent=text; }
  async function check() {
    const field = document.getElementById('word');
    const raw = field.value.trim();
    if (!raw) return;
    if (pending?.raw === raw) return pending.promise;
    const id = ++requestId;
    const promise = (async () => {
      const result = await corrected(raw);
      if (id !== requestId || field.value.trim() !== raw) return;
      if (result.value !== raw) {
        field.value = result.value;
        field.dispatchEvent(new Event('input',{bubbles:true}));
        status(`スペルを修正しました：${raw} → ${result.value}`);
      } else if (result.candidates?.length) status(`スペル候補：${result.candidates.join(' / ')}（自動変更していません）`);
    })();
    pending = {raw,promise};
    await promise;
    if (pending?.promise === promise) pending=null;
  }
  document.addEventListener('click',async ev => {
    const button = ev.target instanceof Element ? ev.target.closest(buttons) : null;
    if (!button || replay.has(button)) return;
    ev.preventDefault();ev.stopImmediatePropagation();
    if (button.disabled) return;
    const field = document.getElementById('word');
    const raw = field.value;
    button.disabled=true;
    let replayed=false;
    try {
      await check();
      // A separate task permits replay even when the original click was programmatic.
      await new Promise(resolve => setTimeout(resolve,0));
      // Do not save/translate a newly typed word while an older spelling check is finishing.
      if (field.value !== raw && !document.getElementById('tc2SpellingStatus')?.textContent.includes(`${raw.trim()} → ${field.value}`)) return;
      replay.add(button);
      button.disabled=false;
      replayed=true;
      button.click();
    } finally { replay.delete(button);if(!replayed)button.disabled=false; }
  },true);
  window.tc2CorrectSpelling = corrected;
  document.addEventListener('DOMContentLoaded',() => {
    const field=document.getElementById('word');
    const el=document.createElement('p');el.id='tc2SpellingStatus';el.className='note';el.setAttribute('role','status');
    document.getElementById('saveBtn').insertAdjacentElement('afterend',el);
    field.setAttribute('spellcheck','true');field.setAttribute('lang','en');
    field.addEventListener('input',()=>{requestId++;status('');});
    field.addEventListener('blur',check);
  });
})();
