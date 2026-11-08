/* Original beginner exercises used if an AI response cannot be validated. */
(() => {
  'use strict';

  // Word, Japanese meaning, IPA, collocation, example, Japanese example.
  const words = {
    open: ['開ける','ˈoʊpən','open the door','Please open the door.','ドアを開けてください。'],
    close: ['閉める','kloʊz','close the window','Please close the window.','窓を閉めてください。'],
    buy: ['買う','baɪ','buy a ticket','I buy a ticket.','私は切符を買います。'],
    wait: ['待つ','weɪt','wait here','Please wait here.','ここで待ってください。'],
    read: ['読む','riːd','read a book','I read a book.','私は本を読みます。'],
    start: ['始める','stɑːrt','start at nine','We start at nine.','私たちは9時に始めます。'],
    bring: ['持ってくる','brɪŋ','bring a bag','Please bring a bag.','袋を持ってきてください。'],
    leave: ['出発する','liːv','leave at noon','We leave at noon.','私たちは正午に出発します。'],
    pick: ['選ぶ','pɪk','pick a seat','Please pick a seat.','席を選んでください。'],
    send: ['送る','send','send a photo','Please send a photo.','写真を送ってください。'],
    finish: ['終わる','ˈfɪnɪʃ','finish at three','We finish at three.','私たちは3時に終わります。'],
    carry: ['運ぶ','ˈkæri','carry a box','I can carry a box.','私は箱を運べます。']
  };
  function term(word) {
    const [meaning,pronunciation,collocation,example,translation] = words[word];
    return {word,meaning,pronunciation,collocation,example,translation};
  }
  function question([prompt,options,translation,explanation,word]) {
    return {prompt,options,answer:0,translation,explanation,terms:[term(word)]};
  }

  const reading = {
    400: [
      ['School shop',
        'Our school shop opens at eight. The shop is next to Room Two. You can buy pens and books there. The shop closes at three. Please bring a bag for your books. You can wait by the door. The shop is closed on Sunday.',
        '学校の売店\n\n学校の売店は8時に開きます。売店は2番教室の隣です。そこでペンや本を買えます。売店は3時に閉まります。本を入れる袋を持ってきてください。ドアのそばで待てます。売店は日曜日は休みです。',
        [
          ['When does the shop open?',['At eight','At nine','At noon','At three'],'売店は何時に開きますか？','本文の opens at eight が開店時刻です。','open'],
          ['Where is the shop?',['By Room Two','By the park','At the station','In Room Three'],'売店はどこですか？','The shop is next to Room Two と書かれています。','buy'],
          ['What should you bring?',['A bag','A pen','A book','A chair'],'何を持っていくべきですか？','Please bring a bag と書かれています。','bring']
        ]],
      ['The library',
        'The library opens at nine. You can read books in Room One. There are six chairs in the room. Please close the door when you leave. You can wait near the front desk. The library closes at four. It is closed on Monday.',
        '図書室\n\n図書室は9時に開きます。1番教室で本を読めます。部屋には椅子が6脚あります。出るときはドアを閉めてください。受付の近くで待てます。図書室は4時に閉まります。月曜日は休みです。',
        [
          ['When does the library open?',['At nine','At eight','At four','At noon'],'図書室は何時に開きますか？','最初の文に opens at nine とあります。','open'],
          ['Where can you read books?',['In Room One','In Room Two','In the shop','In the hall'],'どこで本を読めますか？','本文に read books in Room One とあります。','read'],
          ['When does the library close?',['At four','At six','At nine','At noon'],'図書室は何時に閉まりますか？','closes at four が閉館時刻です。','close']
        ]]
    ],
    500: [
      ['Saturday trip',
        'This notice gives the new time for our Saturday trip. We will leave from the school gate at ten. Please wait by the gate from nine thirty. Last year, the bus left at nine. This year, it will leave one hour later. Bring some water and a small lunch. We will return to school at four.',
        '土曜日の遠足\n\nこのお知らせでは土曜日の遠足の新しい時刻をお伝えします。10時に学校の門から出発します。9時半から門のそばで待ってください。去年はバスが9時に出発しました。今年は1時間遅く出発します。水と軽い昼食を持ってきてください。4時に学校へ戻ります。',
        [
          ['Why did the school write this notice?',['To share a time','To sell bus tickets','To cancel the trip','To find a driver'],'学校はなぜこのお知らせを書きましたか？','最初の文に new time を伝えると書かれています。','leave'],
          ['Where should students wait?',['By the gate','On the bus','In the library','At the park'],'生徒はどこで待つべきですか？','Please wait by the gate が待つ場所です。','wait'],
          ['When will the group return?',['At four','At nine','At ten','At twelve'],'グループは何時に戻りますか？','最後の文に return to school at four とあります。','bring']
        ]],
      ['A change to the class',
        'This message tells you where to meet for our art class. We met in Room One last week. This Thursday, we will meet in Room Three. The class will start at two and finish at three. You can bring your own paper, but we have pencils here. Please send me a message if you cannot come.',
        '授業場所の変更\n\nこのメッセージでは美術の授業の集合場所をお知らせします。先週は1番教室で集まりました。今週の木曜日は3番教室で集まります。授業は2時に始まり、3時に終わります。自分の紙を持ってきてもかまいません。鉛筆はこちらにあります。来られない場合はメッセージを送ってください。',
        [
          ['Why did the teacher send this message?',['To share the room','To ask for pencils','To cancel the class','To sell some paper'],'先生はなぜこのメッセージを送りましたか？','最初の文の where to meet が連絡の目的です。','send'],
          ['Where will the class meet this Thursday?',['In Room Three','In Room One','In the library','At the school gate'],'今週の木曜日、授業はどこで行われますか？','This Thursday と Room Three が同じ文にあります。','bring'],
          ['When will the class finish?',['At three','At one','At two','At four'],'授業は何時に終わりますか？','finish at three が終了時刻です。','finish']
        ]]
    ]
  };
  const grammar = {
    400: [
      ['The shop ____ open.',['is','are','am','be'],'売店は開いています。','The shop は単数なので is を使います。','open'],
      ['I ____ books every day.',['read','reads','reading','am read'],'私は毎日本を読みます。','主語が I の現在形では read を使います。','read'],
      ['We start ____ nine.',['at','on','under','with'],'私たちは9時に始めます。','時刻の前には at を使います。','start'],
      ['Please ____ the door.',['close','closes','closing','closed'],'ドアを閉めてください。','Please の後は動詞の原形です。','close'],
      ['She has two ____.',['bags','bag','a bag','the bag'],'彼女は袋を2つ持っています。','two の後は複数形 bags です。','bring'],
      ['____ you wait here?',['Can','Is','Am','Has'],'ここで待てますか？','Can you と動詞の原形で、できるか尋ねられます。','wait']
    ],
    500: [
      ['We ____ a ticket yesterday.',['bought','buy','buys','buying'],'昨日、私たちは切符を買いました。','yesterday は過去を示すので bought を使います。','buy'],
      ['She will ____ a bag tomorrow.',['bring','brings','bringing','brought'],'明日、彼女は袋を持ってきます。','will の後は動詞の原形です。','bring'],
      ['We usually ____ at noon.',['leave','leaves','leaving','are leave'],'私たちは通常、正午に出発します。','主語が We の現在形では leave を使います。','leave'],
      ['He cannot come ____ he is sick.',['because','during','at','from'],'彼は具合が悪いので来られません。','後ろの文は理由なので because でつなぎます。','send'],
      ['The class will finish ____ three.',['at','into','on','by the'],'授業は3時に終わります。','時刻の前には at を使います。','finish'],
      ['Mia ____ carry the box by herself.',['can','is','has','does not to'],'ミアは一人で箱を運べます。','can の後に動詞の原形 carry を置くと「運べる」と表せます。','carry']
    ]
  };
  const vocabulary = {
    400: ['open','close','buy','wait','read','bring'],
    500: ['leave','pick','send','finish','carry','bring']
  };
  function create(type, level, recent, previousTitles) {
    if (type === 'Part 7') {
      const variants = reading[level];
      const [title,passage,passageTranslation,items] = variants.find(([name]) => !previousTitles.includes(name)) || variants[0];
      return {title,passage,passageTranslation,questions:items.map(question)};
    }
    const group = {title:type === 'Part 5' ? '基礎文法' : '基本の英単語',passage:'',passageTranslation:''};
    if (type === 'Part 5') {
      const items = [...grammar[level]].sort((a,b) => recent.lastIndexOf(a[4])-recent.lastIndexOf(b[4]));
      return {...group,questions:items.slice(0,5).map(question)};
    }
    const candidates = [...vocabulary[level]].sort((a,b) => recent.lastIndexOf(a)-recent.lastIndexOf(b));
    const questions = candidates.slice(0,5).map(word => {
      const t = term(word);
      const prompt = t.example.replace(new RegExp(`\\b${word}\\b`,'i'), match => `“${match}”`);
      const wrong = candidates.filter(other => other !== word).slice(0,3).map(other => words[other][0]);
      return question([prompt,[t.meaning,...wrong],t.translation,`この文の ${word} は「${t.meaning}」という意味です。`,word]);
    });
    return {...group,questions};
  }
  window.TC2BeginnerBank = Object.freeze({create});
})();
