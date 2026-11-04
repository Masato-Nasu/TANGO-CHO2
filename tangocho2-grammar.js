/* Original Part 5 grammar bank. No API call or vocabulary mutation. */
(() => {
  'use strict';
  const KEY = 'tangoCho2GrammarSeen:v1';
  const rules = {
    make: ['make＋人＋原形', 'makeの能動態では目的語の後に原形を置きます。to不定詞・分詞・三単現にはしません。'],
    made: ['be made＋to不定詞', 'makeが受動態になるとtoが必要です。能動態の原形と区別します。原形だけ・分詞・時制のある動詞は置けません。'],
    have: ['have＋人＋原形', '仕事を依頼するhave＋人の後は原形です。to不定詞・過去形・三単現ではありません。have＋物＋過去分詞と区別します。'],
    haveDone: ['have＋物＋過去分詞', '目的語は作業をされる側なので過去分詞です。原形・to不定詞は能動の形、ing形もこの受動の文脈には合いません。'],
    get: ['get＋人＋to不定詞', '人に行動を促すgetは目的語の後にto不定詞を取ります。have/make/letの原形と混同しないでください。'],
    getDone: ['get＋物＋過去分詞', '目的語は作業を受ける側なので過去分詞です。get＋人＋to不定詞とは異なり、原形・to不定詞・ing形はこの文脈に合いません。'],
    let: ['let＋人＋原形', '許可を表すletの目的語の後は原形です。to不定詞・ing形・過去分詞にはしません。'],
    result: ['make＋目的語＋過去分詞', '目的語が「理解される・聞かれる・知られる」関係なので過去分詞です。make＋人＋原形の使役と区別します。原形・ing形・to不定詞ではこの意味になりません。']
  };
  // All alternatives are original; a correct answer is explicit, never inferred from position.
  const causatives = [
    ['make','Although the schedule was tight, the director made the team ____ the figures before publication.',['verify','to verify','verified','verifies'],'日程は厳しかったが、部長は公開前にチームに数値を検証させた。'],
    ['make','The revised security policy makes every visitor, including regular contractors, ____ at reception.',['register','to register','registered','registers'],'改定された警備方針では常連の業者も含め全訪問者が受付で登録しなければならない。'],
    ['make','Nothing in the unsigned agreement can make either party ____ responsibility for the delay.',['accept','to accept','accepted','accepts'],'未署名の契約書のいかなる条項も、遅延の責任をどちらかの当事者に負わせることはできない。'],
    ['make','What made the supplier, despite repeated assurances, ____ its delivery date?',['change','to change','changed','changes'],'繰り返し確約していたにもかかわらず、何が納入業者に納品日を変更させたのだろうか。'],
    ['made','After the discrepancy was discovered, the accountants were made ____ the entire report.',['to revise','revise','revised','revising'],'不一致が見つかり、会計担当者は報告書全体を修正させられた。'],
    ['made','No applicant should be made ____ a processing fee before receiving an offer.',['to pay','pay','paid','paying'],'内定を受ける前に手数料を払わされる応募者があってはならない。'],
    ['made','The contractor, whose records were incomplete, was made ____ the missing receipts.',['to submit','submit','submitted','submitting'],'記録が不完全だった請負業者は、不足している領収書を提出させられた。'],
    ['made','Staff who had already finished the course were nevertheless made ____ the assessment again.',['to take','take','taken','taking'],'すでに講座を終えた職員も、それでも再び試験を受けさせられた。'],
    ['have','Before approving the purchase, the manager had an independent specialist ____ the equipment.',['inspect','to inspect','inspected','inspects'],'購入を承認する前に、管理者は独立した専門家に機器を検査してもらった。'],
    ['have','We will have the technician who installed the system ____ the fault tomorrow.',['diagnose','to diagnose','diagnosed','diagnoses'],'システムを設置した技術者に、明日その不具合を診断してもらう。'],
    ['have','Rather than contact every client herself, Ms. Ito had her assistant ____ the notices.',['distribute','to distribute','distributed','distributes'],'伊藤さんは全顧客に自分で連絡する代わりに、助手に通知を送ってもらった。'],
    ['have','Once the draft is ready, have someone outside the department ____ it for clarity.',['review','to review','reviewed','reviews'],'草案ができたら、部署外の人に分かりやすさを確認してもらってください。'],
    ['haveDone','Instead of deleting the obsolete files ourselves, we had them ____ by an authorized contractor.',['destroyed','destroy','to destroy','destroying'],'古いファイルは自分たちで削除したのではなく、認可された業者に廃棄してもらった。'],
    ['haveDone','Before the inspection, the owner had all emergency exits ____ by a certified electrician.',['checked','check','to check','checking'],'検査の前に、所有者は資格を持つ電気技師にすべての非常口を点検してもらった。'],
    ['haveDone','The company will have the documents that contain confidential data ____ by a sworn translator.',['translated','translate','to translate','translating'],'会社は機密データを含む書類を認定翻訳者に翻訳してもらう予定だ。'],
    ['haveDone','Instead of attempting the repair himself, the curator had the damaged frame ____ by a conservator.',['restored','restore','to restore','restoring'],'学芸員は自分で修理を試みず、傷んだ額縁を修復専門家に直してもらった。'],
    ['get','Despite the short notice, we got the vendor ____ the replacement parts overnight.',['to ship','ship','shipped','ships'],'急な依頼だったが、納入業者に交換部品を翌日配送で発送してもらった。'],
    ['get','It took several meetings to get the committee ____ the revised proposal.',['to endorse','endorse','endorsed','endorses'],'委員会に修正案を支持してもらうまでに数回の会議を要した。'],
    ['get','Can you get the consultant who prepared the estimates ____ the assumptions in writing?',['to explain','explain','explained','explains'],'見積もりを作成したコンサルタントに、その前提を文書で説明してもらえますか。'],
    ['get','The mediator finally got both parties ____ the revised terms voluntarily.',['to accept','accept','accepted','accepts'],'調停者はついに両当事者に修正条件を自発的に受け入れてもらった。'],
    ['getDone','We must get the security certificates ____ by an accredited agency before trading resumes.',['renewed','renew','to renew','renewing'],'取引を再開する前に、認定機関にセキュリティ証明書を更新してもらう必要がある。'],
    ['getDone','She got the invoice, which had been addressed to the wrong firm, ____ by the supplier.',['corrected','correct','to correct','correcting'],'彼女は宛先の会社が間違っていた請求書を、納入業者に訂正してもらった。'],
    ['getDone','Rather than alter the lock themselves, the tenants got it ____ by a licensed locksmith.',['replaced','replace','to replace','replacing'],'入居者たちは自分で錠をいじる代わりに、免許を持つ鍵職人に交換してもらった。'],
    ['getDone','The publisher needs to get the final proofs ____ by an external editor before printing begins.',['checked','check','to check','checking'],'出版社は印刷開始前に、外部の編集者に最終校正刷りを確認してもらう必要がある。'],
    ['let','The supervisor would not let anyone without a valid permit ____ the restricted area.',['enter','to enter','entered','entering'],'監督者は有効な許可証を持たない人を立入制限区域に入れようとしなかった。'],
    ['let','Please let the employees who worked overtime yesterday ____ early today.',['leave','to leave','left','leaving'],'昨日残業した従業員は、今日は早く帰らせてあげてください。'],
    ['let','The new booking system lets customers ____ their reservations without calling the office.',['modify','to modify','modified','modifying'],'新しい予約システムでは、顧客は事務所へ電話せずに予約を変更できる。'],
    ['let','Only after checking their identification did the guard let the visitors ____ inside.',['proceed','to proceed','proceeded','proceeding'],'身分証を確認して初めて、警備員は訪問者を中へ進ませた。'],
    ['result','Although the connection was poor, the presenter managed to make herself ____ by speaking slowly.',['understood','understand','understanding','to understand'],'接続は悪かったが、発表者はゆっくり話すことで自分の言うことを理解してもらえた。'],
    ['result','To make himself ____ above the machinery, the supervisor used a portable loudspeaker.',['heard','hear','hearing','to hear'],'機械の音に負けず自分の声を届かせるため、監督者は携帯拡声器を使った。'],
    ['result','The board made its decision ____ to all branch managers through an internal notice.',['known','know','knowing','to know'],'取締役会は社内通知を通じ、決定を全支店長に知らせた。'],
    ['result','Employees must make their preferences ____ to the coordinator before the roster is finalized.',['known','know','knowing','to know'],'勤務表が確定する前に、従業員は希望を調整担当者に知らせなければならない。']
  ];
  const extra = [
    ['plural','Each of the proposals submitted by the regional offices ____ a detailed cost estimate.',['includes','include','have included','are including'],'各地方事務所から提出された提案には、それぞれ詳しい費用見積もりが含まれている。','Eachが主語の核なので単数扱いでincludes。of以下の複数名詞に動詞を一致させません。残り3つは複数主語の形です。'],
    ['plural','The number of applications received this month ____ significantly higher than expected.',['is','are','have been','were'],'今月受け付けた申込件数は予想を大きく上回っている。','The numberが主語の核で単数なのでis。applicationsに引かれて複数形are/have been/wereを選ばないようにします。'],
    ['plural','A number of employees ____ expressed concern about the proposed relocation.',['have','has','is','was'],'かなりの従業員が、提案されている移転への懸念を表明している。','A number of＋複数名詞は複数扱いなのでhave expressed。The number ofと区別します。hasは単数、is/was expressedではemployeesが表明されるという不自然な受動になります。'],
    ['plural','Every one of the replacement printers ____ compatible with the existing software.',['is','are being','have been','were being'],'交換用プリンターは、どれも既存ソフトに対応していない。','Every oneが主語の核なので単数のis。残りは複数主語の形です。of以下のprintersに動詞を一致させません。'],
    ['plural','All laboratory ____ must be inspected before it is used in the new facility.',['equipment','equipments','an equipment','many equipment'],'すべての実験装置は新施設で使われる前に検査されなければならない。','equipmentは不可算名詞で複数の装置でもequipment。equipmentsとはせず、an/manyも直接付けません。後続のitも単数扱いを示します。'],
    ['plural','We cannot provide ____ on individual cases until the investigation has concluded.',['information','informations','an information','many informations'],'調査が終了するまで、個別事案に関する情報は提供できない。','informationは不可算名詞なので複数形やanを付けません。many informationsも使いません。件数を数えるならpieces of informationです。'],
    ['plural','The consultant offered three practical ____ for reducing unnecessary expenditure.',['suggestions','suggestion','advices','advice'],'コンサルタントは無駄な支出を減らすための実用的な提案を3つした。','threeの後には可算名詞の複数形suggestions。suggestionは単数、adviceは不可算でadvicesやthree adviceにはできません。'],
    ['plural','Applicants must submit two ____ of identification, one of which must include a photograph.',['pieces','piece','a piece','much pieces'],'応募者は身分証明書を2点提出し、そのうち1点には写真が必要だ。','twoの後は複数形pieces。piece/a pieceは単数で、muchは不可算名詞に使うためmuch piecesも不適切です。'],
    ['plural','These ____ were used to determine whether the bids met the eligibility requirements.',['criteria','criterion','criterions','a criterion'],'これらの基準は入札が参加資格の要件を満たすか判定するために用いられた。','criterionの複数形はcriteria。Theseとwereも複数を示します。criterion/a criterionは単数、criterionsはこの試験文脈の標準的な複数形ではありません。'],
    ['plural','Several ____ of the report are available, but only the latest one contains the revised figures.',['copies','copy','copys','a copy'],'報告書には複数の版があるが、修正数値を含むのは最新版だけだ。','severalの後は複数形。子音字＋yで終わるcopyはyをiに変えてcopies。copy/a copyは単数、copysは誤綴りです。'],
    ['plural','The list of eligible suppliers ____ on the procurement website.',['appears','appear','have appeared','are appearing'],'取引資格のある納入業者の一覧は調達サイトに掲載されている。','主語の核は単数のlistなのでappears。of以下のsuppliersに一致させません。残りは複数主語の形です。'],
    ['plural','One of the newly hired analysts ____ a certification in financial risk management.',['holds','hold','have held','are holding'],'新しく採用された分析担当者のうち1人が、金融リスク管理の資格を持っている。','Oneが主語の核なので単数のholds。analystsはof以下の修飾語です。hold/have held/are holdingはいずれも複数主語の形です。'],
    ['tense','We will not place the order until the distributor ____ the availability of every item.',['confirms','will confirm','will have confirmed','confirmed'],'販売代理店がすべての品目の在庫を確認するまで、注文は出さない。','未来の時を表すuntilの副詞節では現在形confirms。willを使わず、confirmedもこの未来の確認に合いません。'],
    ['tense','No sooner ____ the meeting begun than the fire alarm sounded.',['had','has','did','will'],'会議が始まるやいなや、火災報知器が鳴った。','No soonerを文頭に置く倒置で、過去の連続した出来事をhad＋主語＋過去分詞で表します。hasは現在完了、did/willの後には原形が必要なのでbegunとは組めません。'],
    ['tense','By the time the auditors arrived last Monday, the team ____ all outstanding entries.',['had reconciled','has reconciled','will reconcile','reconciles'],'先週月曜に監査人が来るまでに、チームは未処理の記帳をすべて照合し終えていた。','過去のarrivedより前の完了なので過去完了had reconciled。現在完了has、未来will、現在形reconcilesはこの過去の前後関係に合いません。'],
    ['tense','By the end of next quarter, the firm ____ the transition to the new platform.',['will have completed','had completed','has completed','was completing'],'来四半期末までには、会社は新基盤への移行を終えているだろう。','未来の期限までの完了には未来完了will have completed。過去完了・現在完了は未来の基準時に合わず、過去進行形もこの完了予測を表しません。'],
    ['tense','The supplier ____ our main distributor since the two companies signed the agreement in 2019.',['has been','was','had been','will be'],'2019年に両社が契約して以来、その納入業者は当社の主な販売代理店である。','sinceで過去から現在まで続く関係を示すのでhas been。wasは過去のみ、had beenは過去の基準時が必要で、will beは未来です。'],
    ['tense','As soon as the final inspection ____ complete, we will authorize the payment.',['is','will be','has being','will have'],'最終検査が完了し次第、支払いを承認する。','未来のことでもas soon asの時を表す副詞節では現在形is。will beは使わず、has beingとwill have completeは構造的にも不適切です。'],
    ['tense','While the engineers ____ the backup generator yesterday, the main power supply failed.',['were testing','have tested','are testing','will test'],'昨日、技術者たちが予備発電機を試験している間に、主電源が故障した。','過去のfailedが起きたとき進行中だった動作なのでwere testing。yesterdayがあるため現在完了・現在進行・未来形は合いません。'],
    ['tense','The conference ____ at 9 a.m. tomorrow, according to the published program.',['begins','began','has begun','had begun'],'公開されたプログラムによると、会議は明日の午前9時に始まる。','公的な予定・時刻表は未来でも現在形beginsで表せます。began/has begun/had begunはいずれもtomorrowの開始には合いません。'],
    ['tense','When I called at noon yesterday, the replacement parts ____ yet.',['had not arrived','have not arrived','will not arrive','do not arrive'],'昨日正午に電話した時点では、交換部品はまだ届いていなかった。','過去のcalledを基準に、それまでの未到着を過去完了had not arrivedで表します。現在完了・未来・現在形では過去の基準時を表せません。'],
    ['tense','The new terminal ____ by an independent contractor in 2022.',['was installed','has been installed','is installing','will be installed'],'新しい端末は2022年に独立した業者によって設置された。','in 2022という特定の過去なので過去形の受動was installed。現在完了には特定の終了した過去時を付けず、is installingは現在の能動で、未来形も不適切です。'],
    ['tense','The logistics team is still negotiating and ____ a final agreement with the carrier yet.',['has not reached','has not reach','had not reached','will not have reached'],'物流チームは現在も交渉中で、運送会社との最終合意にはまだ至っていない。','still negotiatingとyetで現在までの未達を表すため現在完了has not reached。has not reachは過去分詞が必要で誤り。過去完了・未来完了の基準時もなく、現在までの状態とずれます。'],
    ['tense','By this time next week, the replacement team ____ in the new office for a full month.',['will have been working','had been working','has been working','was working'],'来週の今ごろには、交代チームが新事務所で働き始めて丸1か月になる。','未来の基準時までの継続なので未来完了進行形will have been working。過去完了進行・現在完了進行・過去進行は基準時が異なります。']
  ];
  const lexicon = [
    ['make','〜させる','meɪk','make someone do'],['have','〜してもらう','hæv','have something done'],['get','〜してもらう','ɡet','get someone to do'],['let','〜することを許す','let','let someone do'],
    ['proposal','提案','prəˈpoʊzəl','submit a proposal'],['application','申請','ˌæplɪˈkeɪʃən','submit an application'],['employee','従業員','ɪmˈplɔɪiː','full-time employees'],['printer','プリンター','ˈprɪntər','replacement printers'],['equipment','機器・設備','ɪˈkwɪpmənt','laboratory equipment'],['information','情報','ˌɪnfərˈmeɪʃən','provide information'],['consultant','コンサルタント','kənˈsʌltənt','an independent consultant'],['identification','身分証明','aɪˌdentɪfɪˈkeɪʃən','proof of identification'],['report','報告書','rɪˈpɔːrt','revise a report'],['team','チーム','tiːm','a project team'],['transition','移行','trænˈzɪʃən','complete the transition'],['agreement','契約・合意','əˈɡriːmənt','reach an agreement'],['inspection','検査','ɪnˈspekʃən','a final inspection'],['generator','発電機','ˈdʒenəreɪtər','a backup generator'],['conference','会議','ˈkɑːnfərəns','attend a conference'],['part','部品','pɑːrt','replacement parts'],['terminal','端末','ˈtɜːrmɪnəl','install a terminal'],['carrier','運送会社','ˈkæriər','a freight carrier'],['supplier','納入業者','səˈplaɪər','eligible suppliers'],['analyst','分析担当者','ˈænəlɪst','a financial analyst'],['distributor','販売代理店','dɪˈstrɪbjətər','a local distributor'],['meeting','会議','ˈmiːtɪŋ','hold a meeting'],['criteria','基準（複数形）','kraɪˈtɪriə','eligibility criteria']
  ];
  function termsFor(q) {
    const sentence=q.prompt.replace('____',q.options[q.answer]);
    // Causative head verbs are recorded in their dictionary form.
    const head=q.rule ? (q.rule==='made'||q.rule==='result'?'make':q.rule==='haveDone'?'have':q.rule==='getDone'?'get':q.rule) : null;
    const entry=head?lexicon.find(t=>t[0]===head):lexicon.find(t=>new RegExp('\\b'+t[0]+'(?:s)?\\b','i').test(sentence));
    if(!entry)throw new Error('文法問題の語句情報を確認できませんでした。');
    const [word,meaning,pronunciation,collocation]=entry;
    return [{word,meaning,pronunciation,collocation,example:sentence,translation:q.translation}];
  }
  const bank = [
    ...causatives.map(([rule,prompt,options,translation],i)=>({id:'c'+i,rule,category:'causative',topic:rules[rule][0],prompt,options,answer:0,translation,explanation:`正答：${options[0]}。${rules[rule][1]} 不正解：${options.slice(1).join(' / ')}。`})),
    ...extra.map(([category,prompt,options,translation,explanation],i)=>({id:'g'+i,category,topic:category==='plural'?'複数形・主語と動詞の一致':'時制・完了形',prompt,options,answer:0,translation,explanation:`正答：${options[0]}。${explanation}`}))
  ];
  const shuffle = xs => { const result=[...xs];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result; };
  function create(count, mode='mixed') {
    if(!Number.isInteger(count)||count<1||count>30)throw new Error('問題数を確認してください。');
    let seen=[];try{const value=JSON.parse(localStorage.getItem(KEY));if(Array.isArray(value))seen=value;}catch{}
    const used=new Set(), picked=[];
    for(let i=0;i<count;i++){
      const category=mode==='causative'?'causative':['causative','plural','tense','plural','tense'][i%5];
      const pool=bank.filter(q=>q.category===category&&!used.has(q.id));
      const fresh=pool.filter(q=>!seen.includes(q.id));
      const candidates=fresh.length?fresh:pool.filter(q=>seen.indexOf(q.id)===Math.min(...pool.map(x=>seen.indexOf(x.id))));
      const q=shuffle(candidates)[0];used.add(q.id);picked.push({...q,options:[...q.options],terms:termsFor(q)});seen=[...seen.filter(id=>id!==q.id),q.id];
    }
    try{localStorage.setItem(KEY,JSON.stringify(seen));}catch{}
    return shuffle(picked);
  }
  window.TC2Grammar=Object.freeze({create});
})();
