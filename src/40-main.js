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
  const mk = async (data, lines) => {
    const c = await A.saveCharacter(Object.assign({ demo: true, avatarKey: '' }, data));
    const chat = await A.ensureChat(c.id);
    for (const l of lines) {
      await A.appendMessage(chat.id, l[0], l[1], l[2] || {});
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
    ['char', '<think>（问了就要解释，解释很累。）</think>\n\n你想说的时候会说。\n\n我这儿别的不多，时间很多。']
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

  S.cfg.moments.unshift({
    id: U.uid('mo'), text: '今天的雨下得很慢。\n在窗边坐了一下午，什么也没做成，但觉得这样就很好。',
    imgs: [], ts: Date.now() - 3600e3, likes: [], comments: [], shares: 0
  });
  S.cfg.momentsSig = '把日子过成一张慢慢显影的照片。';
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
  data() { return { time: '', S }; },
  mounted() {
    this.tick();
    this.t = setInterval(this.tick, 20000);
  },
  beforeUnmount() { clearInterval(this.t); },
  methods: {
    tick() { const d = new Date(); this.time = U.pad(d.getHours()) + ':' + U.pad(d.getMinutes()); }
  },
  template: `<div class="statusbar" :class="{dark:S.statusDark}">
    <span>{{time}}</span>
    <div class="sb-r">
      <ico name="signal" :size="14"/>
      <ico name="wifi" :size="14"/>
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
  'archive': ARCH.List,
  'archive.edit': ARCH.Edit,
  'store': STORE.Page,
  'notices': NOTICE.Page,
  'beauty': BEAUTY.Page,
  'settings': SET.Page,
  'settings.api': SET.ApiList,
  'settings.api.edit': SET.ApiEdit,
  'settings.prompt': SET.Prompt,
  'settings.data': SET.Data,
  'custom': CUSTOM.Page
};

const Root = {
  data() { return { S, NAV, ready: false }; },
  computed: {
    top() { return NAV.stack.length ? NAV.stack[NAV.stack.length - 1] : null; },
    view() { return this.top ? VIEWS[this.top.name] : null; }
  },
  template: `<div class="stage">
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
        <status-bar></status-bar>
        <home-screen v-show="!top"></home-screen>

        <transition :name="NAV.dir==='push'?'pg':'pg-pop'">
          <component v-if="view" :is="view" :params="top.params" :key="top.key"></component>
        </transition>

        <div class="toast-wrap"><div class="toast" v-if="S.toast">{{S.toast.msg}}</div></div>

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
app.config.globalProperties.saveCfg = saveCfg;
app.config.globalProperties.PROMPT_DEFS = PROMPT_DEFS;
app.mount('#app');

A.boot().then(async () => {
  if (S.cfg.ui.fontKey) await A.applyFont();
  A.applyGlobalBeauty();
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && NAV.stack.length) A.back();
  });
});
