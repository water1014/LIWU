/* ============================================================
   App shell, router, boot
   ============================================================ */
const NAV = Vue.reactive({ stack: [], dir: 'push', seq: 0 });

window.__go = function (name, params) {
  NAV.dir = 'push';
  NAV.stack.push({ name, params: params || {}, key: ++NAV.seq });
};
window.__back = function () {
  if (!NAV.stack.length) return;
  NAV.dir = 'pop';
  NAV.stack.pop();
};

window.appMeta = function (id) {
  if (APPS[id]) return APPS[id];
  const c = (S.cfg.customApps || []).find((x) => x.id === id);
  return c || { id, name: '组件', icon: 'grid', tint: 'linear-gradient(150deg,#B9B3A4,#8C8679)' };
};

A.applyFont = async function () {
  try {
    const key = S.cfg.ui.fontKey;
    if (!key) { document.documentElement.style.removeProperty('--home-font'); return; }
    const url = await DB.fileURL(key);
    if (!url) return;
    const face = new FontFace('LIWUUserFont', 'url(' + url + ')');
    await face.load();
    document.fonts.add(face);
    document.documentElement.style.setProperty('--home-font', "'LIWUUserFont', -apple-system, 'PingFang SC', sans-serif");
  } catch (e) { A.toast('字体加载失败'); }
};

/* ---------------- demo data (explicit, user triggered) ---------------- */
window.loadDemoData = async function () {
  if (!S.account) {
    await A.register({
      username: 'demo' + Math.floor(Math.random() * 900 + 100), password: 'demo',
      name: '阿时', gender: '女', persona: '在城市边缘租了一间朝北的房子，白天写稿，晚上散步。不太擅长表达需要，但很会听别人说话。'
    });
  }
  if (S.chars.some((c) => c.demo)) { A.toast('演示数据已经载入过了'); return; }
  let spread = 0;
  const mk = async (data, lines) => {
    const c = await A.saveCharacter(Object.assign({ demo: true, avatarKey: '' }, data));
    const chat = await A.ensureChat(c.id);
    for (let li = 0; li < lines.length; li++) {
      const l = lines[li];
      // 把演示对话摊到最近几天，日历热力图才有东西看
      const ts = Date.now() - (lines.length - li) * 5 * 3600e3 - (spread++) * 26 * 3600e3;
      await A.appendMessage(chat.id, l[0], l[1], Object.assign({ ts }, l[2] || {}));
    }
    const m = { id: U.uid('mem'), accountId: S.account.id, charId: c.id };
    await A.addMemory({ charId: c.id, type: 'permanent', title: '底色 · ' + c.name, content: data.perm, keywords: ['底色'] });
    await A.addMemory({ charId: c.id, type: 'index', title: data.topic, content: data.topicText, keywords: data.keys, msgIds: (S.msgs[chat.id] || []).slice(-4).map((x) => x.id), chatId: chat.id });
    return c;
  };

  await mk({
    name: '沈砚', gender: '男', mbti: 'INFP', jung: 'Fi · Ne · Si · Te',
    persona: '旧书店店主，三十二岁。说话慢，句子短，习惯先听。对别人的情绪很敏感，却不太会处理自己的。喜欢在雨天把店门半掩着。',
    background: '在老城区接手了父亲留下的书店，店里有只叫“星期四”的猫。',
    greeting: '<think>（她这个时候来，应该是想找个安静的地方。）</think>\n<narratage>他把手里的书合上，抬头看了一眼门口。</narratage>\n\n门没锁，进来吧。\n\n外面雨大吗？',
    perm: '沈砚把阿时当作少数不需要解释太多的人；他不会主动追问，但会记得她提过的细枝末节。',
    topic: '雨天的书店',
    topicText: '阿时在一个下雨的傍晚走进书店，两个人聊到很晚，沈砚给她留了靠窗的位置。',
    keys: ['雨', '书店', '窗边']
  }, [
    ['char', '<think>（她今天看起来有点累。）</think>\n<narratage>他把杯子往她那边推了推。</narratage>\n\n坐窗边吧，那里亮一点。\n\n茶是刚泡的，可能有点苦。'],
    ['user', '今天走了很久，鞋都湿了。'],
    ['char', '<think>（不需要问为什么走。先让她坐下来。）</think>\n\n那就先别走了。\n\n<narratage>窗外的雨敲在遮阳棚上，声音很密。</narratage>\n\n书店没什么人，你可以待到打烊。'],
    ['user', '你不问我去哪了吗？'],
    ['char', '<think>（问了就要解释，解释很累。）</think>\n\n你想说的时候会说。\n\n我这儿别的不多，时间很多。'],
    ['user', '书店一直开到这个点吗？'],
    ['char', '<narratage>他把台灯往边上挪了一点。</narratage>\n\n开到没人来为止。\n\n雨天的客人走得早，一般十点就剩我一个。'],
    ['user', '那我是不是待太久了。'],
    ['char', '<think>（她总是先替别人算时间。）</think>\n\n没有。\n\n我这儿的时间本来就不值钱，你坐着，它才有点像时间。'],
    ['user', '你说话总是这样。'],
    ['char', '哪样。\n\n<narratage>他低头笑了一下，把茶壶重新添满。</narratage>\n\n你听不下去就说，我改。'],
    ['user', '没有，挺好的。就是有点不习惯。'],
    ['char', '<think>（不习惯被人好好说话，这不算好事。）</think>\n\n那就多听几次。\n\n习惯这种东西，是慢慢养出来的。'],
    ['user', '雨好像小了。'],
    ['char', '嗯，小了。\n\n<narratage>他走到门口，把半掩的门推开一些。</narratage>\n\n要走的话，我送你到路口。\n\n不走的话，茶还有。']
  ]);

  await mk({
    name: '林见', gender: '女', mbti: 'ENTP', jung: 'Ne · Ti · Fe · Si',
    persona: '夜间电台主播，二十六岁。反应快，爱抬杠，擅长把沉重的事说得轻一点。下班后话很少。',
    background: '主持一档凌晨两点的节目，听众不多，但都很固定。',
    greeting: '<think>（这个点还没睡的人，多半有心事。）</think>\n\n喂，这里是凌晨两点。\n\n<narratage>电流声轻轻响了一下。</narratage>\n\n你是睡不着，还是不想睡？',
    perm: '林见觉得阿时是那种“嘴上说没事、其实全写脸上”的人，因此总忍不住多问一句。',
    topic: '凌晨两点的来电',
    topicText: '阿时第一次给电台留言，林见在节目里念了出来，之后两人开始私下聊天。',
    keys: ['凌晨', '电台', '失眠']
  }, [
    ['char', '<think>（她今天回得很快，不像平时。）</think>\n\n哟，今天这么早。\n\n<narratage>耳机里传来她按打火机的声音。</narratage>\n\n说吧，是什么事让你连觉都不睡了。'],
    ['user', '也没什么，就是突然觉得房间很空。'],
    ['char', '<think>（“没什么”通常就是有什么。）</think>\n\n房间空是正常的，空的是别的地方。\n\n<narratage>她笑了一声，很轻。</narratage>\n\n要不要听首烂歌？我这儿多的是。']
  ]);

  const demoShort = S.chars.find((c) => c.name === '沈砚');
  if (demoShort) {
    const dc = A.chatOfChar(demoShort.id);
    await A.addMemory({
      charId: demoShort.id, type: 'short', title: '短时记忆 · 今天', chatId: dc.id,
      content: '阿时在雨天走进书店，两个人从湿掉的鞋聊到打烊时间。沈砚没有追问她为什么来，只把靠窗的位置和一杯有点苦的茶留给了她。',
      range: [1, 6]
    });
  }

  const book = await A.saveBook({
    name: '雾港纪事',
    desc: '一座常年被雾包围的港城。潮汐不讲道理，旧城区的门牌会自己换位置。',
    entries: [
      { id: U.uid('e'), name: '潮汐规则', keys: ['潮汐', '涨潮'], content: '雾港每天只有一次退潮，持续四十分钟。退潮时旧城区的石阶会浮出来，通往不存在于地图上的第七码头。', position: 'pre', mode: 'always', probability: 30, enabled: true },
      { id: U.uid('e'), name: '旧城区', keys: ['旧城区', '巷子', '门牌'], content: '旧城区的门牌号在夜里会变。居民靠门口种的植物认路，不靠数字。', position: 'mid', mode: 'keyword', probability: 40, enabled: true },
      { id: U.uid('e'), name: '星期四的猫', keys: ['猫', '星期四'], content: '书店里的黑猫叫“星期四”，只在雨天出现，喜欢趴在靠窗的第二把椅子上。', position: 'post', mode: 'random', probability: 35, enabled: true }
    ]
  });
  const shen = S.chars.find((c) => c.name === '沈砚');
  if (shen) { shen.worldbookIds = [book.id]; await DB.put('characters', JSON.parse(JSON.stringify(shen))); }

  // 小房间 / 胶囊：给演示账号留一点生活痕迹
  const hrs = (n) => Date.now() - n * 3600e3;
  const backD = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
  S.cfg.extra.todayNote = '今天要早一点睡。';
  S.cfg.extra.rooms.todos = [
    { id: U.uid('td'), text: '把窗台的灰擦一下', done: false, ts: hrs(2) },
    { id: U.uid('td'), text: '还图书馆那本《雾港纪事》', done: false, ts: hrs(26) },
    { id: U.uid('td'), text: '买一包新的咖啡豆', done: true, ts: hrs(50), doneAt: hrs(30) }
  ];
  S.cfg.extra.rooms.memos = [
    { id: U.uid('mm'), text: '他说过喜欢下雨天。\n下次下雨记得叫他。', ts: hrs(20) },
    { id: U.uid('mm'), text: '洗衣液快用完了，是那种没什么味道的。', ts: hrs(70) }
  ];
  S.cfg.extra.rooms.wishes = [
    { id: U.uid('ws'), text: '一起去看一次海', done: false, ts: hrs(200) },
    { id: U.uid('ws'), text: '把那本没读完的书读完', done: true, ts: hrs(400), doneAt: hrs(90) },
    { id: U.uid('ws'), text: '学会做一道他爱吃的菜', done: false, ts: hrs(120) }
  ];
  S.cfg.extra.rooms.checkins = {};
  for (const d of [1, 2, 3, 5, 6, 8, 9, 12, 13]) {
    const x = new Date(); x.setDate(x.getDate() - d);
    S.cfg.extra.rooms.checkins[U.dayKey(x.getTime())] = x.getTime();
  }
  const soon = new Date(); soon.setDate(soon.getDate() + 214);
  const due = new Date(); due.setDate(due.getDate() - 3);
  S.cfg.extra.capsules = [
    {
      id: U.uid('cp'), title: '给一年后的我们', openAt: soon.toISOString().slice(0, 10), ts: hrs(300), opened: false,
      body: '写这封的时候是十一月，窗子关不严，风会从缝里进来。\n\n不知道你现在在哪，是不是还住在这间朝北的房子。如果搬了，希望新家的窗是朝南的。\n\n如果那时候我们已经不联系了，也希望你看到这封信的时候，记得今年冬天其实没有那么冷。'
    },
    {
      id: U.uid('cp'), title: '三个月后要问他的问题', openAt: due.toISOString().slice(0, 10), ts: hrs(2000), opened: false,
      body: '你那天说的「时间很多」，是真的吗？\n\n如果是真的，我想再坐久一点。'
    },
    {
      id: U.uid('cp'), title: '搬进来第一天', openAt: backD(30), ts: hrs(2400), opened: true, openedAt: hrs(700),
      body: '房间朝北，下午三点以后就没有太阳了。\n\n但窗很大，能看到对面楼顶的水箱。夜里滴水的声音很明显，一开始睡不着，现在习惯了。\n\n从今天起，这里是我住的地方。'
    }
  ];

  S.cfg.moments.unshift({
    id: U.uid('mo'), text: '今天的雨下得很慢。\n在窗边坐了一下午，什么也没做成，但觉得这样就很好。',
    imgs: [], ts: Date.now() - 3600e3, likes: [], comments: [], shares: 0
  });
  S.cfg.momentsSig = '把日子过成一张慢慢显影的照片。';
  const ago = new Date(); ago.setDate(ago.getDate() - 61);
  S.cfg.home.anniv = { date: ago.toISOString().slice(0, 10), label: '在一起' };
  S.cfg.home.sign = '把日子过成一张慢慢显影的照片。';

  // 时光：纪念日与日记
  const back = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
  S.cfg.life.annivs = [
    { id: U.uid('an'), date: back(88), label: '第一次说话', note: '在书店门口躲雨，问了句「这里还开着吗」。', main: false, ts: Date.now() },
    { id: U.uid('an'), date: back(61), label: '在一起', note: '', main: true, ts: Date.now() },
    { id: U.uid('an'), date: back(9), label: '第一次一起看完一部电影', note: '片尾字幕走完才起身。', main: false, ts: Date.now() }
  ];
  S.cfg.life.diary = [
    { id: U.uid('dy'), ts: Date.now() - 5 * 3600e3, mood: '平静', text: '今天没做什么。窗外的雨下到下午就停了，地上还留着一点湿。\n给他拍了一张水的照片，他回得很快，说像一面没擦干净的镜子。' },
    { id: U.uid('dy'), ts: Date.now() - 30 * 3600e3, mood: '想你', text: '忽然意识到，已经习惯了睡前把今天的事讲一遍。\n讲给谁听其实不重要，重要的是有人会在。' }
  ];
  // 书架：一起读的书
  S.cfg.life.books = [
    { id: U.uid('bk'), title: '你当像鸟飞往你的山', author: '塔拉·韦斯特弗', total: 388, cur: 214, status: 'reading', tint: A.bookTint('你当像鸟飞往你的山'), createdAt: Date.now() - 20 * 86400e3, quotes: [
      { id: U.uid('q'), text: '你可以爱一个人，但仍然选择和他说再见。', page: 186, ts: Date.now() - 4 * 86400e3 }
    ] },
    { id: U.uid('bk'), title: '我与地坛', author: '史铁生', total: 246, cur: 246, status: 'done', tint: A.bookTint('我与地坛'), createdAt: Date.now() - 50 * 86400e3, quotes: [
      { id: U.uid('q'), text: '就命运而言，休论公道。', page: 97, ts: Date.now() - 18 * 86400e3 }
    ] },
    { id: U.uid('bk'), title: '夏天、烟火和我的尸体', author: '乙一', total: 212, cur: 46, status: 'reading', tint: A.bookTint('夏天、烟火和我的尸体'), createdAt: Date.now() - 3 * 86400e3, quotes: [] }
  ];
  if (!S.cfg.home.name || S.cfg.home.name === '未命名') S.cfg.home.name = S.account.name;
  await saveCfg(true);
  await A.refreshSizes();
  A.toast('演示数据已载入');
  setTimeout(() => A.go('chat'), 400);
};

/* ---------------- custom component page ---------------- */
const CUSTOM = {};
CUSTOM.Page = {
  props: { params: Object },
  computed: {
    app() { return window.appMeta(this.params.appId); },
    src() {
      return '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,"PingFang SC",sans-serif;background:#F4F2EE;color:#17171B;padding:20px;font-size:13px;line-height:1.7}h1{font-size:18px}button{font:inherit;padding:8px 12px;border-radius:10px;border:1px solid rgba(0,0,0,.1);background:#fff}</style></head><body>' + (this.app.html || '<p>这个组件还没有内容。</p>') + '</body></html>';
    }
  },
  template: `<div class="page">
    <nav-bar :title="app.name"></nav-bar>
    <iframe :srcdoc="src" sandbox="allow-scripts" style="flex:1;border:0;width:100%;background:#F4F2EE"></iframe>
  </div>`
};

/* ---------------- status bar ---------------- */
const StatusBar = {
  props: { hideTime: Boolean },
  data() { return { time: '', S }; },
  mounted() {
    this.tick();
    this.t = setInterval(this.tick, 20000);
  },
  beforeUnmount() { clearInterval(this.t); },
  methods: {
    tick() { const d = new Date(); this.time = U.pad(d.getHours()) + ':' + U.pad(d.getMinutes()); },
    toggle() { S.noticeOpen = !S.noticeOpen; }
  },
  template: `<div class="statusbar" :class="{dark:S.statusDark}">
    <span :style="hideTime?{opacity:0}:{}">{{time}}</span>
    <div class="sb-r">
      <ico name="signal" :size="14"/>
      <ico name="wifi" :size="14"/>
      <button class="sb-bell" @click="toggle"><ico name="bell" :size="14"/>
        <i class="sb-badge" v-if="OS.unread()">{{OS.unread()>99?'99+':OS.unread()}}</i>
      </button>
      <ico name="battery" :size="19"/>
    </div>
  </div>`
};

/* ---------------- root ---------------- */
const VIEWS = {
  'chat': CHAT.Home,
  'chat.room': CHAT.Room,
  'chat.settings': CHAT.Settings,
  'chat.beauty': CHAT.Beauty,
  'chat.moments': CHAT.Moments,
  'chat.add': CHAT.Add,
  'worldbooks': WB.List,
  'worldbook.detail': WB.Detail,
  'memories': MEM.Page,
  'stickers': STK.Library,
  'archive': ARCH.List,
  'archive.edit': ARCH.Edit,
  'us': US.Page,
  'messages': OU.Messages,
  'deeptalk': OU.DeepTalk,
  'secret': OU.Secret,
  'rooms': US.Rooms,
  'capsule': US.Capsule,
  'words': US.Words,
  'monthly': US.Monthly,
  'quota': US.Quota,
  'music': MUSIC.Page,
  'books': BOOKS.Page,
  'book.detail': BOOKS.Detail,
  'time': TIME.Page,
  'store': STORE.Page,
  'notices': NOTICE.Page,
  'beauty': BEAUTY.Page,
  'settings': SET.Page,
  'settings.api': SET.ApiList,
  'settings.api.edit': SET.ApiEdit,
  'settings.prompt': SET.Prompt,
  'settings.data': SET.Data,
  'custom': CUSTOM.Page,
  'phone': APPX.Phone,
  'map': APPX.Map,
  'notes': APPX.Notes,
  'camera': APPX.Camera,
  'weather': APPX.Weather,
  'todo': APPX.Todo,
  'delivery': APPX.Delivery,
  'game': APPX.Game,
  'voice': APPX.Voice,
  'health': APPX.Health,
  'dream': APPX.Dream,
  'coming': APPX.Coming
};

const Root = {
  data() { return { S, NAV, ready: false, lock: false, lockUp: false, lockTime: '', lockDate: '', lockFrom: 0 }; },
  mounted() {
    this.lockTick();
    this._lt = setInterval(() => this.lockTick(), 10000);
    setTimeout(() => this.maybeLock(), 820);
  },
  beforeUnmount() { clearInterval(this._lt); },
  methods: {
    lockTick() {
      const d = new Date();
      this.lockTime = U.pad(d.getHours()) + ':' + U.pad(d.getMinutes());
      this.lockDate = (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 · 周' + '日一二三四五六'[d.getDay()];
    },
    maybeLock() {
      if (S.cfg.ui.lock === false) return;
      if (S.cfg.ui.lastUnlockDay === new Date().toDateString()) return;
      this.lock = true;
    },
    lockDown(e) { this.lockFrom = e.clientY || 0; },
    lockUp2(e) {
      const dy = (e.clientY || 0) - this.lockFrom;
      if (dy < -30 || this.lockFrom === 0) this.unlock();
    },
    unlock() {
      if (!this.lock || this.lockUp) return;
      this.lockUp = true;
      S.cfg.ui.lastUnlockDay = new Date().toDateString();
      saveCfg();
      setTimeout(() => { this.lock = false; this.lockUp = false; }, 540);
    },
    runToast() {
      const a = S.toast && S.toast.action;
      S.toast = null; clearTimeout(A._tt);
      if (a && a.run) a.run();
    },
    openBanner(b) {
      S.banner = null;
      if (!b) return;
      if (b.action && b.action.run) return b.action.run();
      if (b.route) { S.noticeOpen = false; A.go(b.route, b.params || {}); }
    },
    openNotice(n) {
      OS.markNotice(n.id);
      S.noticeOpen = false;
      if (n.route) A.go(n.route, n.params || {});
    },
    clearNotices() { OS.clearAll(); },
    meta(id) { return window.appMeta(id); },
    fmtTs(t) {
      const d = new Date(t), now = new Date();
      const same = d.toDateString() === now.toDateString();
      const p = (x) => (x < 10 ? '0' + x : x);
      return same ? p(d.getHours()) + ':' + p(d.getMinutes()) : (d.getMonth() + 1) + '/' + d.getDate() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    }
  },
  computed: {
    top() { return NAV.stack.length ? NAV.stack[NAV.stack.length - 1] : null; },
    view() { return this.top ? VIEWS[this.top.name] : null; },
    lockWall() {
      const k = S.cfg.ui.wallpaperKey;
      if (k && S.imgCache[k]) return { backgroundImage: 'url(' + S.imgCache[k] + ')' };
      const p = (typeof WALLS !== 'undefined' && WALLS[S.cfg.ui.wallpaperPreset || 0]) || null;
      return p ? { backgroundImage: p.css } : {};
    }
  },
  template: `<div class="stage" :class="['theme-'+(S.cfg.ui.theme||'milk'),{'on-home':!top}]">
    <div class="brand">
      <div class="b1">LIWU</div>
      <div class="b2">imitation mobile phone</div>
      <div class="b3"></div>
    </div>
    <div class="stage-side">A SMALL WORLD, HELD IN ONE HAND</div>
    <div class="stage-hint"><i></i>长按图标进入编辑 · 左右滑动翻页<i></i></div>

    <div class="device">
      <div class="screen">
        <div class="island"></div>
        <status-bar :hide-time="!top"></status-bar>

        <div class="os-banner" v-if="S.banner" :class="'b-'+S.banner.app" @click="openBanner(S.banner)">
          <div class="ob-ico" :style="{'--tint':meta(S.banner.app).tint}"><ico :name="S.banner.icon" :size="16"/></div>
          <div class="ob-mid">
            <div class="ob-title">{{S.banner.title}}</div>
            <div class="ob-body">{{S.banner.body}}</div>
          </div>
          <ico name="chevronRight" :size="14"/>
        </div>

        <div class="os-center" v-if="S.noticeOpen" @click.self="S.noticeOpen=false">
          <div class="oc-head"><span>通知</span><button class="oc-clear" @click="clearNotices">全部已读</button></div>
          <div class="oc-list">
            <div class="oc-item" v-for="n in S.cfg.os.notices" :key="n.id" :class="{un:n.read===false}" @click="openNotice(n)">
              <div class="oc-ico" :style="{'--tint':meta(n.app).tint}"><ico :name="n.icon" :size="14"/></div>
              <div class="oc-mid"><div class="oc-title">{{n.title}}<i v-if="n.read===false" class="oc-dot"></i></div><div class="oc-body">{{n.body}}</div><div class="oc-time">{{fmtTs(n.ts)}}</div></div>
            </div>
            <div v-if="!S.cfg.os.notices.length" class="oc-empty">还没有通知</div>
          </div>
        </div>
        <home-screen v-show="!top"></home-screen>

        <div class="lock" v-if="lock" :class="{hide:lockUp}" :style="lockWall"
             @pointerdown="lockDown" @pointerup="lockUp2">
          <div class="lk-top">
            <div class="lk-kicker">LIWU · PRIVATE</div>
            <div class="lk-time">{{lockTime}}</div>
            <div class="lk-date">{{lockDate}}</div>
          </div>
          <div class="lk-mid">
            <div class="lk-card">
              <div class="lk-row">
                <span class="lk-k">together</span>
                <span class="lk-v">DAY {{A.dayNo()}}</span>
              </div>
              <div class="lk-name">{{S.cfg.home.name || '未命名'}}</div>
              <div class="lk-line">{{S.cfg.home.sign || '在这里写下你的签名。'}}</div>
            </div>
          </div>
          <div class="lk-bottom">
            <div class="lk-hint"><i></i><span>向上轻扫</span></div>
          </div>
        </div>

        <transition :name="NAV.dir==='push'?'pg':'pg-pop'">
          <component v-if="view" :is="view" :params="top.params" :key="top.key"></component>
        </transition>

        <div class="toast-wrap"><div class="toast" v-if="S.toast">
          <span>{{S.toast.msg}}</span>
          <button v-if="S.toast.action" class="toast-act" @click="runToast">{{S.toast.action.label}}</button>
        </div></div>

        <div v-if="!S.ready" style="position:absolute;inset:0;background:var(--paper);display:grid;place-items:center;z-index:500">
          <div style="text-align:center">
            <div style="font-size:16px;letter-spacing:.3em">L I W U</div>
            <div class="helper" style="margin-top:10px">正在打开你的小手机…</div>
          </div>
        </div>

        <div v-if="S.bootError" style="position:absolute;inset:0;background:var(--paper);z-index:600;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;gap:12px">
          <div style="width:52px;height:52px;border-radius:18px;background:var(--surface-2);display:grid;place-items:center"><ico name="alert" :size="22"/></div>
          <div style="font-size:14px;font-weight:600">无法使用本地存储</div>
          <div class="helper" style="max-width:250px;line-height:1.75">{{S.bootError}}</div>
        </div>
      </div>
    </div>
  </div>`
};

/* ---------------- bootstrap ---------------- */
const app = Vue.createApp(Root);
app.component('ico', UI.Ico);
app.component('av', UI.Av);
app.component('nav-bar', UI.Nav);
app.component('sheet', UI.Sheet);
app.component('toggle', UI.Toggle);
app.component('seg', UI.Seg);
app.component('empty', UI.Empty);
app.component('xrow', UI.Row);
app.component('stk-picker', STK.Picker);
app.component('home-screen', HOME.Home);
app.component('chat-login', CHAT.Login);
app.component('status-bar', StatusBar);
app.config.errorHandler = (err, inst, info) => {
  console.error('[LIWU]', info || '', err);
};
app.config.globalProperties.U = U;
app.config.globalProperties.A = A;
app.config.globalProperties.S = S;
app.config.globalProperties.DB = DB;
app.config.globalProperties.APPS = APPS;
app.config.globalProperties.OS = OS;
app.config.globalProperties.saveCfg = saveCfg;
app.config.globalProperties.PROMPT_DEFS = PROMPT_DEFS;
app.mount('#app');

A.boot().then(async () => {
  if (S.cfg.ui.fontKey) await A.applyFont();
  A.applyGlobalBeauty();
  OS.seedDemo();
  setInterval(() => A.tickMusic(), 1000);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && NAV.stack.length) A.back();
  });
});
