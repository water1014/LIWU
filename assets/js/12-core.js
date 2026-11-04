/* ============================================================
   LIWU store — state, actions, prompt assembly, local AI
   ============================================================ */
window.APPS = {
  chat:     { id: 'chat',     name: '聊天',   icon: 'chat',    tint: 'linear-gradient(150deg,#99A794,#6F7F6B)', route: 'chat' },
  us:       { id: 'us',       name: '我们',   icon: 'heart',   tint: 'linear-gradient(150deg,#C9B8B1,#947F78)', route: 'us' },
  book:     { id: 'book',     name: '世界书', icon: 'book',    tint: 'linear-gradient(150deg,#B0A6BC,#82788F)', route: 'worldbooks' },
  memory:   { id: 'memory',   name: '记忆',   icon: 'memory',  tint: 'linear-gradient(150deg,#C9B49C,#A08A72)', route: 'memories' },
  archive:  { id: 'archive',  name: '档案',   icon: 'archive', tint: 'linear-gradient(150deg,#9DADBC,#71818F)', route: 'archive' },
  music:    { id: 'music',    name: '音乐',   icon: 'music',   tint: 'linear-gradient(150deg,#B4ABA0,#7E766C)', route: 'music' },
  books:    { id: 'books',    name: '书架',   icon: 'bookmark',tint: 'linear-gradient(150deg,#B5BDAE,#7D8778)', route: 'books' },
  time:     { id: 'time',     name: '时光',   icon: 'clock',   tint: 'linear-gradient(150deg,#C5B7A5,#94836F)', route: 'time' },
  store:    { id: 'store',    name: '商店',   icon: 'store',   tint: 'linear-gradient(150deg,#CDBD97,#A79367)', route: 'store' },
  notices:  { id: 'notices',  name: '通知',   icon: 'bell',    tint: 'linear-gradient(150deg,#B6B6BA,#8B8B91)', route: 'notices' },
  beauty:   { id: 'beauty',   name: '美化',   icon: 'palette', tint: 'linear-gradient(150deg,#C6A9B4,#9C7E8A)', route: 'beauty' },
  settings: { id: 'settings', name: '设置',   icon: 'settings',tint: 'linear-gradient(150deg,#8E9299,#63676D)', route: 'settings' },
  phone:    { id: 'phone',    name: '电话',   icon: 'phone',   tint: 'linear-gradient(150deg,#9FCBA6,#6E9C77)', route: 'phone' },
  map:      { id: 'map',      name: '地图',   icon: 'map',     tint: 'linear-gradient(150deg,#A9C0CE,#7E9AAE)', route: 'map' },
  moments:  { id: 'moments',  name: '动态',   icon: 'users',   tint: 'linear-gradient(150deg,#E0B5C0,#BB8794)', route: 'chat.moments' },
  mailbox:  { id: 'mailbox',  name: '信箱',   icon: 'mail',    tint: 'linear-gradient(150deg,#C7B79E,#9C8B6F)', route: 'deeptalk' },
  notes:    { id: 'notes',    name: '备忘录', icon: 'note',    tint: 'linear-gradient(150deg,#D9C79A,#B39C6A)', route: 'notes' },
  camera:   { id: 'camera',   name: '相册',   icon: 'camera',  tint: 'linear-gradient(150deg,#B9BFC6,#8C949D)', route: 'camera' },
  weather:  { id: 'weather',  name: '天气',   icon: 'sun',     tint: 'linear-gradient(150deg,#AFCDE0,#7EA6C2)', route: 'weather' },
  calendar: { id: 'calendar', name: '日历',   icon: 'calendar',tint: 'linear-gradient(150deg,#D7A9B4,#B07F8C)', route: 'time' },
  todo:     { id: 'todo',     name: '待办',   icon: 'check',   tint: 'linear-gradient(150deg,#B6CDA6,#8AA877)', route: 'todo' },
  delivery: { id: 'delivery', name: '外卖',   icon: 'gift',    tint: 'linear-gradient(150deg,#E2B98F,#C1915C)', route: 'delivery' },
  game:     { id: 'game',     name: '游戏',   icon: 'game',    tint: 'linear-gradient(150deg,#C6B6D8,#9A86B4)', route: 'game' },
  voice:    { id: 'voice',    name: '语音',   icon: 'mic',     tint: 'linear-gradient(150deg,#C9C2B6,#9C9486)', route: 'voice' },
  health:   { id: 'health',   name: '健康',   icon: 'pulse',   tint: 'linear-gradient(150deg,#E0A9A9,#BC7E7E)', route: 'health' },
  dream:    { id: 'dream',    name: '梦境',   icon: 'moon',    tint: 'linear-gradient(150deg,#A9B0D2,#79809E)', route: 'dream' }
};

window.PROMPT_DEFS = {
  chat: [
    { id: 'system', label: '系统规则', hint: '角色扮演与输出格式约束' },
    { id: 'world_pre', label: '世界书 · 前置', hint: '设定在角色之前' },
    { id: 'persona', label: '角色人设', hint: '档案中的角色内核' },
    { id: 'world_mid', label: '世界书 · 中置', hint: '设定在用户之前' },
    { id: 'user', label: '用户人设', hint: '当前登录账号的设定' },
    { id: 'memory', label: '记忆', hint: '短时 / 索引 / 永久' },
    { id: 'world_post', label: '世界书 · 后置', hint: '设定在上下文之前' },
    { id: 'context', label: '最近上下文', hint: '按 #序号 排列的真实消息' }
  ],
  summary: [
    { id: 'sys', label: '总结指令', hint: '记忆提炼规则' },
    { id: 'persona', label: '角色档案', hint: '说话方式参考' },
    { id: 'context', label: '待总结消息', hint: '触发阈值的聊天片段' }
  ]
};

function defaultCfg() {
  return {
    api: [],
    prompts: {
      chat: PROMPT_DEFS.chat.map((d) => ({ id: d.id, enabled: true })),
      summary: PROMPT_DEFS.summary.map((d) => ({ id: d.id, enabled: true }))
    },
    memory: { threshold: 50, apiId: 'inherit' },
    layout: {
      pages: [
        [
          { id: 'w_postcard', x: 0, y: 0, w: 4, h: 2, kind: 'postcard' },
          { id: 'w_polaroid', x: 0, y: 2, w: 2, h: 2, kind: 'polaroid' },
          { id: 'app_chat', x: 2, y: 2, w: 1, h: 1, kind: 'app', app: 'chat' },
          { id: 'app_book', x: 3, y: 2, w: 1, h: 1, kind: 'app', app: 'book' },
          { id: 'app_memory', x: 2, y: 3, w: 1, h: 1, kind: 'app', app: 'memory' },
          { id: 'app_archive', x: 3, y: 3, w: 1, h: 1, kind: 'app', app: 'archive' },
          { id: 'w_dialog', x: 0, y: 4, w: 2, h: 2, kind: 'dialog' },
          { id: 'w_music', x: 2, y: 4, w: 2, h: 2, kind: 'music' }
        ],
        [
          { id: 'w_anniv', x: 0, y: 0, w: 2, h: 2, kind: 'anniv' },
          { id: 'w_level', x: 2, y: 0, w: 2, h: 2, kind: 'level' },
          { id: 'w_cal', x: 0, y: 2, w: 4, h: 2, kind: 'calendar' },
          { id: 'w_read', x: 0, y: 4, w: 2, h: 2, kind: 'reading' },
          { id: 'w_diary', x: 2, y: 4, w: 2, h: 2, kind: 'diary' },
          { id: 'w_clock', x: 0, y: 6, w: 2, h: 2, kind: 'clock' }
        ]
      ],
      dock: ['store', 'notices', 'beauty', 'settings']
    },
    home: {
      avatarKey: '', name: '未命名', sign: '在这里写下你的签名。',
      bgKey: '', base: '#F3F2EE',
      polaroidKey: '', polaroidCap: 'slow morning',
      music: { title: 'Soft Static', artist: 'LIWU RADIO', dur: 214, played: 62 },
      anniv: { date: '', label: '在一起' },
      dialog: [
        { text: '今天也会是很普通的一天吗？', who: 'them' },
        { text: '普通就很好。', who: 'me' }
      ]
    },
    ui: { theme: 'milk', wallpaperKey: '', fontKey: '', css: '', js: '' },
    removedApps: [],
    moments: [],
    momentsCoverKey: '',
    momentsSig: '把日子过成一张慢慢显影的照片。',
    life: {
      music: {
        tracks: [
          { id: 'tr_soft', title: 'Soft Static', artist: 'LIWU RADIO', dur: 214 },
          { id: 'tr_late', title: 'Late Bus', artist: 'LIWU RADIO', dur: 187 },
          { id: 'tr_window', title: 'Window Seat', artist: 'LIWU RADIO', dur: 243 }
        ],
        cur: 'tr_soft',
        mode: 'loop'
      },
      books: [],
      annivs: [],
      diary: []
    },
    extra: {
      todayNote: '',
      rooms: { todos: [], memos: [], wishes: [], checkins: {} },
      capsules: [],
      usage: { n: 0, fails: 0, inTok: 0, outTok: 0, days: {} }
    },
    os: { notices: [], status: { activity: '自由', place: '家', mood: '平静', text: '' }, seeded: false }
  };
}

window.S = Vue.reactive({
  ready: false,
  bootError: '',
  account: null,
  accounts: [],
  chars: [], chats: [], worldbooks: [], memories: [],
  msgs: {},
  typing: {},
  cfg: defaultCfg(),
  layoutKey: 0,
  imgCache: {},
  toast: null,
  sheet: null,
  editing: false,
  homePage: 0,
  musicPlaying: false,
  badges: {},
  banner: null,
  noticeOpen: false,
  sizes: [],
  stats: { total: 0, days: {} },
  busy: '',
  statusDark: false
});

const timers = {};
const state = S;

/* ---------------- persistence ---------------- */
function cfgKey() { return 'cfg_' + (state.account ? state.account.id : 'anon'); }

let saveTimer = null;
window.saveCfg = function (immediate) {
  if (!state.account) return;
  const dump = JSON.parse(JSON.stringify(state.cfg));
  clearTimeout(saveTimer);
  const run = () => DB.put('settings', { key: cfgKey(), accountId: state.account.id, value: dump });
  if (immediate) return run();
  saveTimer = setTimeout(run, 320);
};

/* ---------------- boot / accounts ---------------- */
window.A = {
  toast(msg, ms, action) {
    state.toast = { msg, id: Date.now(), action: action || null };
    clearTimeout(A._tt);
    A._tt = setTimeout(() => { state.toast = null; }, ms || (action ? 4000 : 2200));
  },
  async boot() {
    try {
      await DB.open();
    } catch (e) {
      state.bootError = e.message === 'NO_IDB'
        ? '当前浏览器不支持 IndexedDB，无法保存你的世界。请更换 Chrome / Edge / Safari 后重试。'
        : '本地数据库打开失败：' + (e.message || '未知错误') + '。请检查是否处于无痕模式或禁用了存储。';
      state.ready = true;
      return;
    }
    try {
      state.accounts = (await DB.all('accounts')).sort((a, b) => a.createdAt - b.createdAt);
      const last = localStorage.getItem('liwu.last');
      const acc = state.accounts.find((a) => a.id === last) || state.accounts[0];
      if (acc) await A.useAccount(acc);
      state.ready = true;
      A.refreshSizes();
    } catch (e) {
      state.bootError = '数据读取失败：' + (e.message || e);
      state.ready = true;
    }
  },

  async useAccount(acc) {
    state.account = acc;
    localStorage.setItem('liwu.last', acc.id);
    const [chars, chats, wbs, mems, cfgRec] = await Promise.all([
      DB.all('characters'), DB.all('chats'), DB.all('worldbooks'), DB.all('memories'), DB.get('settings', 'cfg_' + acc.id)
    ]);
    state.chars = chars.filter((x) => x.accountId === acc.id);
    state.chats = chats.filter((x) => x.accountId === acc.id);
    state.worldbooks = wbs.filter((x) => x.accountId === acc.id);
    state.memories = mems.filter((x) => x.accountId === acc.id);
    state.cfg = Object.assign(defaultCfg(), cfgRec ? cfgRec.value : {});
    state.cfg.api = state.cfg.api || [];
    state.cfg.prompts = Object.assign(defaultCfg().prompts, state.cfg.prompts || {});
    state.cfg.layout = state.cfg.layout && state.cfg.layout.pages ? state.cfg.layout : defaultCfg().layout;
    state.cfg.home = Object.assign(defaultCfg().home, state.cfg.home || {});
    // 新账号第一次进来时，明信片跟着昵称走，避免一直显示「未命名」
    if (!state.cfg.home.name || state.cfg.home.name === '未命名') state.cfg.home.name = acc.name || '未命名';
    state.cfg.ui = Object.assign(defaultCfg().ui, state.cfg.ui || {});
    state.cfg.life = Object.assign(defaultCfg().life, state.cfg.life || {});
    if (!Array.isArray(state.cfg.stickers)) state.cfg.stickers = [];
    if (state.cfg.stickerOn == null) state.cfg.stickerOn = true;
    state.cfg.life.music = Object.assign(defaultCfg().life.music, state.cfg.life.music || {});
    ['books', 'annivs', 'diary'].forEach((k) => { if (!Array.isArray(state.cfg.life[k])) state.cfg.life[k] = []; });
    const dEx = defaultCfg().extra;
    state.cfg.extra = Object.assign({}, dEx, state.cfg.extra || {});
    state.cfg.extra.rooms = Object.assign({}, dEx.rooms, state.cfg.extra.rooms || {});
    ['todos', 'memos', 'wishes'].forEach((k) => { if (!Array.isArray(state.cfg.extra.rooms[k])) state.cfg.extra.rooms[k] = []; });
    if (!state.cfg.extra.rooms.checkins || typeof state.cfg.extra.rooms.checkins !== 'object') state.cfg.extra.rooms.checkins = {};
    state.cfg.extra.usage = Object.assign({}, dEx.usage, state.cfg.extra.usage || {});
    state.cfg.os = Object.assign({ notices: [], status: { activity: '自由', place: '家', mood: '平静', text: '' }, seeded: false }, state.cfg.os || {});
    if (!Array.isArray(state.cfg.os.notices)) state.cfg.os.notices = [];
    if (!state.cfg.os.status) state.cfg.os.status = {};
    if (!state.cfg.extra.usage.days) state.cfg.extra.usage.days = {};
    if (!Array.isArray(state.cfg.extra.capsules)) state.cfg.extra.capsules = [];
    // 老账号：桌面上的那个纪念日，升级成时光里的第一条
    if (!state.cfg.life.annivs.length && state.cfg.home.anniv && state.cfg.home.anniv.date) {
      state.cfg.life.annivs = [{
        id: U.uid('an'), date: state.cfg.home.anniv.date,
        label: state.cfg.home.anniv.label || '在一起', note: '', main: true, ts: Date.now()
      }];
    }
    state.msgs = {};
    state.typing = {};
    state.editing = false;
    state.homePage = 0;
    state.layoutKey++;
    // warm the image cache
    await Promise.all([
      state.cfg.home.avatarKey, state.cfg.home.bgKey, state.cfg.home.polaroidKey,
      acc.avatarKey, state.cfg.ui.wallpaperKey
    ].filter(Boolean).map((k) => A.resolveImg(k)));
    A.applyGlobalBeauty();
    A.ensureStats();
  },

  async register(form) {
    if (!form.username.trim() || !form.password) throw new Error('请填写账号与密码');
    if (form.password.length < 4) throw new Error('密码至少 4 位');
    const exists = state.accounts.some((a) => a.username === form.username.trim());
    if (exists) throw new Error('该账号已存在');
    const acc = {
      id: U.uid('acc'), username: form.username.trim(), salt: U.uid('s'),
      pwd: U.hash(form.password + '::' + form.username.trim()),
      name: form.name || form.username.trim(),
      gender: form.gender || '未设定',
      persona: form.persona || '',
      jung: form.jung || '', mbti: form.mbti || '', background: form.background || '',
      avatarKey: form.avatarKey || '',
      createdAt: Date.now()
    };
    await DB.put('accounts', acc);
    state.accounts.push(acc);
    await A.useAccount(acc);
    A.applyGlobalBeauty();
    return acc;
  },

  async login(username, password) {
    const acc = state.accounts.find((a) => a.username === username.trim());
    if (!acc) throw new Error('账号不存在');
    if (acc.pwd !== U.hash(password + '::' + acc.username)) throw new Error('密码不正确');
    await A.useAccount(acc);
    return acc;
  },

  async signOut() {
    state.account = null;
    localStorage.removeItem('liwu.last');
    state.chars = []; state.chats = []; state.memories = []; state.worldbooks = []; state.msgs = {};
    state.cfg = defaultCfg();
  },

  /* ---------------- images ---------------- */
  async resolveImg(key) {
    if (!key || state.imgCache[key]) return state.imgCache[key] || '';
    const url = await DB.fileURL(key);
    if (url) state.imgCache[key] = url;
    return url;
  },
  async uploadImage(file) {
    const blob = await U.fileToBlob(file, 1600);
    return DB.putFile(blob, { name: file.name });
  },
  async replaceImage(oldKey, file) {
    const blob = await U.fileToBlob(file, 1600);
    const key = await DB.replaceFile(oldKey, blob, { name: file.name });
    if (oldKey) delete state.imgCache[oldKey];
    await A.resolveImg(key);
    return key;
  },

  /* ---------------- rooms / capsules ---------------- */
  addTodo(text) {
    const t = String(text || '').trim();
    if (!t) return null;
    const it = { id: U.uid('td'), text: t.slice(0, 140), done: false, ts: Date.now() };
    state.cfg.extra.rooms.todos.unshift(it);
    saveCfg();
    return it;
  },
  toggleTodo(id) {
    const it = state.cfg.extra.rooms.todos.find((x) => x.id === id);
    if (!it) return;
    it.done = !it.done;
    it.doneAt = it.done ? Date.now() : 0;
    saveCfg();
  },
  delTodo(id) {
    const r = state.cfg.extra.rooms;
    const i = r.todos.findIndex((x) => x.id === id);
    if (i < 0) return;
    const it = r.todos.splice(i, 1)[0];
    saveCfg();
    A.toast('已删除一条待办', 4000, { label: '撤销', run: () => { r.todos.splice(i, 0, it); saveCfg(); } });
  },
  clearDone() {
    const r = state.cfg.extra.rooms;
    const back = r.todos.filter((x) => x.done);
    if (!back.length) return;
    r.todos = r.todos.filter((x) => !x.done);
    saveCfg();
    A.toast('清掉了 ' + back.length + ' 条', 4000, { label: '撤销', run: () => { r.todos = back.concat(r.todos); saveCfg(); } });
  },
  addMemo(text) {
    const t = String(text || '').trim();
    if (!t) return null;
    const it = { id: U.uid('mm'), text: t.slice(0, 300), ts: Date.now() };
    state.cfg.extra.rooms.memos.unshift(it);
    saveCfg();
    return it;
  },
  delMemo(id) {
    const r = state.cfg.extra.rooms;
    const i = r.memos.findIndex((x) => x.id === id);
    if (i < 0) return;
    const it = r.memos.splice(i, 1)[0];
    saveCfg();
    A.toast('已删除', 4000, { label: '撤销', run: () => { r.memos.splice(i, 0, it); saveCfg(); } });
  },
  addWish(text) {
    const t = String(text || '').trim();
    if (!t) return null;
    const it = { id: U.uid('ws'), text: t.slice(0, 140), done: false, ts: Date.now() };
    state.cfg.extra.rooms.wishes.unshift(it);
    saveCfg();
    return it;
  },
  toggleWish(id) {
    const it = state.cfg.extra.rooms.wishes.find((x) => x.id === id);
    if (!it) return;
    it.done = !it.done;
    it.doneAt = it.done ? Date.now() : 0;
    saveCfg();
  },
  delWish(id) {
    const r = state.cfg.extra.rooms;
    const i = r.wishes.findIndex((x) => x.id === id);
    if (i < 0) return;
    const it = r.wishes.splice(i, 1)[0];
    saveCfg();
    A.toast('已删除', 4000, { label: '撤销', run: () => { r.wishes.splice(i, 0, it); saveCfg(); } });
  },
  checkin() {
    const k = A.dayKey(Date.now());
    const c = state.cfg.extra.rooms.checkins;
    if (c[k]) delete c[k]; else c[k] = Date.now();
    saveCfg();
    return !!c[k];
  },
  checkedToday() { return !!state.cfg.extra.rooms.checkins[A.dayKey(Date.now())]; },
  checkinStreak() {
    const c = state.cfg.extra.rooms.checkins;
    const d = new Date();
    if (!c[A.dayKey(d.getTime())]) d.setDate(d.getDate() - 1);
    let n = 0;
    while (c[A.dayKey(d.getTime())]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  },

  addCapsule(o) {
    const c = {
      id: U.uid('cp'), title: (o.title || '给以后的我们').slice(0, 40),
      body: (o.body || '').slice(0, 4000), openAt: o.openAt,
      ts: Date.now(), opened: false, openedAt: 0
    };
    state.cfg.extra.capsules.unshift(c);
    saveCfg(true);
    return c;
  },
  openCapsule(id) {
    const c = state.cfg.extra.capsules.find((x) => x.id === id);
    if (!c) return false;
    if (!c.opened) { c.opened = true; c.openedAt = Date.now(); saveCfg(true); }
    return true;
  },
  capsuleLeft(c) {
    const t = new Date((c.openAt || '') + 'T00:00:00').getTime();
    if (isNaN(t)) return 0;
    return Math.max(0, Math.ceil((t - Date.now()) / 86400000));
  },
  delCapsule(id) {
    const r = state.cfg.extra.capsules;
    const i = r.findIndex((x) => x.id === id);
    if (i < 0) return;
    const it = r.splice(i, 1)[0];
    saveCfg(true);
    A.toast('已撕掉这张纸', 4000, { label: '撤销', run: () => { r.splice(i, 0, it); saveCfg(true); } });
  },

  /* ---------------- words / month ---------------- */
  async allMessages() {
    const all = await DB.all('messages');
    const aid = state.account ? state.account.id : '';
    return all.filter((m) => m.accountId === aid).sort((a, b) => a.ts - b.ts);
  },
  buildWordCloud(msgs, limit) {
    // 不引分词库：用一张常用词表做正向最大匹配。
    // 匹配不到的词直接丢掉——词云宁可少，不要「我这儿」「走的话」这种碎片。
    const LEX = ('我们 你们 他们 她们 它们 自己 别人 大家 有人 一个人 两个人 对方 '
      + '今天 明天 昨天 后天 现在 以后 以前 时候 时间 晚上 早上 下午 凌晨 半夜 最近 刚才 马上 一直 总是 偶尔 突然 已经 终于 后来 从前 每年 每天 '
      + '房间 窗台 窗户 门口 门外 楼上 楼下 楼下 客厅 厨房 床 被子 枕头 灯 台灯 书桌 椅子 沙发 镜子 照片 相机 手机 消息 电话 电台 节目 声音 音乐 歌 '
      + '书店 图书馆 书 书架 页 字 句子 故事 信 日记 猫 狗 花 树 雨 雪 风 太阳 月亮 星星 天气 天空 云 城市 街道 路口 地铁 公交 车站 医院 学校 公司 '
      + '咖啡 茶 水 酒 饭 早餐 午饭 晚饭 面 汤 蛋糕 糖 烟 打火机 衣服 鞋 伞 门牌 水箱 '
      + '说话 聊天 见面 回去 回来 出来 进来 起来 下来 过来 坐下 站起 离开 到达 送 接 等 陪 找 见 看 听 说 讲 问 答 笑 哭 睡 醒 起 走 跑 停 住 '
      + '写 读 买 卖 做 吃 喝 洗 擦 收 放 拿 给 借 还 换 修 打开 关上 记得 忘记 想起 知道 觉得 认为 需要 想要 希望 打算 决定 开始 结束 继续 习惯 '
      + '喜欢 讨厌 害怕 担心 放心 难过 开心 高兴 委屈 生气 抱歉 谢谢 对不起 没关系 再见 晚安 早安 想念 舍不得 心疼 安心 温柔 认真 '
      + '安静 普通 舒服 累 困 冷 热 慢 快 远 近 久 早 晚 好 坏 难 容易 奇怪 熟悉 陌生 空 满 亮 暗 湿 干 干净 脏 旧 新 大 小 多 少 '
      + '心情 世界 生活 工作 休息 周末 假期 生日 纪念日 礼物 拥抱 手指 眼睛 头发 味道 空气 温度 距离'
    ).split(/\s+/).filter(Boolean);
    const SET = new Set(LEX);
    // 这些即使匹配到也不进词云：占位置，但不告诉你任何事
    const DROP = new Set(('什么 怎么 为什么 怎么样 有点 一点 一些 很多 所有 一样 别的 其实 大概 可能 应该 如果 因为 所以 但是 还是 或者 而且 然后 '
      + '不过 只是 真的 觉得 认为 知道 需要 想要 希望 打算 决定 开始 结束 继续 东西 事情 地方 感觉 时候 现在 以后 以前 已经 一直 总是 偶尔 '
      + '突然 终于 后来 每天 每年 有人 大家 对方 一个人 两个人').split(/\s+/).filter(Boolean));
    const MAXW = 4;

    const pickWords = (seg) => {
      const out = [];
      let i = 0;
      while (i < seg.length) {
        let hit = '';
        for (let n = Math.min(MAXW, seg.length - i); n >= 2; n--) {
          const w = seg.slice(i, i + n);
          if (SET.has(w)) { hit = w; break; }
        }
        if (hit) { out.push(hit); i += hit.length; } else { i += 1; }
      }
      return out;
    };

    const count = {};
    msgs.forEach((m) => {
      const text = U.stripTags(m.raw || '').replace(/\[[^\]\n]{1,14}\]/g, ' ');
      text.split(/[^\u4e00-\u9fa5]+/).forEach((seg) => {
        if (seg.length < 2) return;
        pickWords(seg).forEach((w) => { if (!DROP.has(w)) count[w] = (count[w] || 0) + 1; });
      });
    });

    const list = Object.keys(count)
      .map((w) => ({ w, n: count[w] }))
      .sort((a, b) => b.n - a.n || a.w.length - b.w.length)
      .slice(0, limit || 46);

    // 按「频次等级」分配字号：同频次的词一样大，等级之间拉开差距
    const levels = Array.from(new Set(list.map((x) => x.n))).sort((a, b) => b - a);
    list.forEach((x) => {
      const idx = levels.indexOf(x.n);
      const t = levels.length === 1 ? 1 : 1 - idx / (levels.length - 1);
      x.weight = Math.round(t * 100) / 100;
      x.size = Math.round(13 + Math.pow(t, 0.9) * 27);
    });

    // 大小交错，才像云，不像排行榜
    const big = list.filter((x) => x.weight > 0.72);
    const mid = list.filter((x) => x.weight > 0.42 && x.weight <= 0.72);
    const small = list.filter((x) => x.weight <= 0.42);
    const mixed = [];
    while (big.length || mid.length || small.length) {
      if (big.length) mixed.push(big.shift());
      if (small.length) mixed.push(small.shift());
      if (mid.length) mixed.push(mid.shift());
    }
    return mixed;
  },

  monthStats(offset) {
    const base = new Date();
    base.setDate(1);
    base.setMonth(base.getMonth() + (offset || 0));
    const y = base.getFullYear(), m = base.getMonth();
    const inMonth = (ts) => { const x = new Date(ts); return x.getFullYear() === y && x.getMonth() === m; };
    const days = {};
    Object.keys((state.stats && state.stats.days) || {}).forEach((k) => {
      const parts = k.split('-').map(Number);
      if (parts[0] === y && parts[1] === m + 1) days[k] = state.stats.days[k];
    });
    const vals = Object.values(days);
    const total = vals.reduce((a, b) => a + b, 0);
    const best = vals.length ? Math.max.apply(null, vals) : 0;
    const bestKey = Object.keys(days).find((k) => days[k] === best) || '';
    const diary = (state.cfg.life.diary || []).filter((x) => inMonth(x.ts));
    const mem = (state.memories || []).filter((x) => inMonth(x.createdAt || x.ts || 0));
    const msgs = (state.cfg.life.diary || []).length;
    return {
      y, m, label: y + ' 年 ' + (m + 1) + ' 月', total, active: vals.length, best, bestKey,
      diary: diary.length, mem: mem.length, days, isNow: offset === 0 || offset == null
    };
  },
  monthLetter(st) {
    const lines = [];
    if (!st.total) {
      lines.push('这个月几乎没怎么说话。');
      lines.push('窗口一直开着，风把页角吹起来又放下。');
    } else {
      lines.push('这个月我们说了 ' + st.total + ' 句话，分布在 ' + st.active + ' 天里。');
      if (st.bestKey) {
        const d = st.bestKey.split('-');
        lines.push('话最多的是 ' + Number(d[1]) + ' 月 ' + Number(d[2]) + ' 日，一共 ' + st.best + ' 句。');
        lines.push('那天大概发生了点什么，我记着。');
      }
      if (st.diary) lines.push('你写了 ' + st.diary + ' 篇日记。有几篇我读了两遍。');
      if (st.mem) lines.push('我把它折进了 ' + st.mem + ' 段记忆里，放在不会掉出来的那一格。');
      lines.push('剩下的日子也都在，只是没那么响。');
    }
    lines.push('下个月也照旧。');
    return lines;
  },

  /* ---------------- usage ---------------- */
  addUsage(inTok, outTok, ok) {
    const u = state.cfg.extra.usage;
    const k = A.dayKey(Date.now());
    const day = u.days[k] || (u.days[k] = { n: 0, in: 0, out: 0 });
    if (ok === false) { u.fails += 1; saveCfg(); return; }
    u.n += 1;
    u.inTok += inTok || 0;
    u.outTok += outTok || 0;
    day.n += 1; day.in += inTok || 0; day.out += outTok || 0;
    saveCfg();
  },
  usageWeek() {
    const u = state.cfg.extra.usage;
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = A.dayKey(d.getTime());
      const x = u.days[k] || { n: 0, in: 0, out: 0 };
      out.push({ key: k, n: x.n || 0, tok: (x.in || 0) + (x.out || 0), label: '日一二三四五六'[d.getDay()] });
    }
    return out;
  },

  /* ---------------- stickers ---------------- */
  stickerByName(name) {
    return (state.cfg.stickers || []).find((s) => s.name === name) || null;
  },
  async addSticker(name, file) {
    let blob = file;
    // 只压大图；小图原样保留，避免透明底被转成黑
    if (file.size > 300 * 1024) {
      blob = await new Promise((res) => {
        const img = new Image();
        img.onload = () => {
          const sc = Math.min(1, 480 / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * sc));
          c.height = Math.max(1, Math.round(img.height * sc));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(img.src);
          c.toBlob((b) => res(b || file), 'image/webp', 0.86);
        };
        img.onerror = () => res(file);
        img.src = URL.createObjectURL(file);
      });
    }
    const key = await DB.putFile(blob, { name: file.name });
    const s = { id: U.uid('st'), name: String(name || '表情').slice(0, 10), fileKey: key, createdAt: Date.now() };
    state.cfg.stickers.push(s);
    await saveCfg(true);
    return s;
  },
  async renameSticker(id, name) {
    const s = (state.cfg.stickers || []).find((x) => x.id === id);
    if (!s) return;
    s.name = String(name).slice(0, 10);
    await saveCfg(true);
  },
  async delSticker(id) {
    state.cfg.stickers = (state.cfg.stickers || []).filter((s) => s.id !== id);
    await saveCfg(true);
  },
  async restoreSticker(s) {
    if ((state.cfg.stickers || []).some((x) => x.id === s.id)) return;
    state.cfg.stickers.push(s);
    await saveCfg(true);
  },
  stickerHint() {
    const list = state.cfg.stickerOn === false ? [] : (state.cfg.stickers || []);
    if (!list.length) return '当前没有可用表情，不要输出 [表情:名字] 这类标记。';
    return '想发表情时，单独一行写 [表情:名字]，名字必须从下面清单里一字不差地选，' +
      '清单里没有合适的就不要发，用文字表达，绝对不要自己编名字：\n' + list.map((s) => s.name).join(' / ');
  },

  /* ---------------- characters ---------------- */
  charById(id) { return state.chars.find((c) => c.id === id) || null; },
  chatById(id) { return state.chats.find((c) => c.id === id) || null; },
  chatOfChar(charId) { return state.chats.find((c) => c.charId === charId) || null; },
  charChats(charId) { return state.chats.filter((c) => c.charId === charId); },
  charMemories(charId, type) { return state.memories.filter((m) => m.charId === charId && (!type || m.type === type)); },

  async saveCharacter(data, id) {
    if (!data.avatarKey && !data.demo) throw new Error('请上传角色头像');
    if (!data.name || !data.name.trim()) throw new Error('请填写角色姓名');
    if (!data.gender) throw new Error('请选择性别');
    if (!data.persona || !data.persona.trim()) throw new Error('请填写人设');
    let char;
    if (id) {
      char = A.charById(id);
      Object.assign(char, data, { updatedAt: Date.now() });
      await DB.put('characters', JSON.parse(JSON.stringify(char)));
    } else {
      char = Object.assign({
        id: U.uid('char'), accountId: state.account.id, createdAt: Date.now(),
        code: String(Math.floor(10000000 + Math.random() * 89999999)),
        worldbookIds: [], apiId: 'inherit'
      }, data);
      await DB.put('characters', JSON.parse(JSON.stringify(char)));
      state.chars.push(char);
    }
    return char;
  },

  async deleteCharacter(id) {
    const chats = state.chats.filter((c) => c.charId === id);
    for (const c of chats) {
      const msgs = await DB.all('messages');
      for (const m of msgs.filter((m) => m.chatId === c.id)) await DB.del('messages', m.id);
      await DB.del('chats', c.id);
      state.chats = state.chats.filter((x) => x.id !== c.id);
      delete state.msgs[c.id];
    }
    const char = A.charById(id);
    if (char && char.avatarKey) { await DB.delFile(char.avatarKey); delete state.imgCache[char.avatarKey]; }
    await DB.del('characters', id);
    state.chars = state.chars.filter((c) => c.id !== id);
    for (const m of state.memories.filter((m) => m.charId === id)) {
      await DB.del('memories', m.id);
    }
    state.memories = state.memories.filter((m) => m.charId !== id);
    A.refreshSizes();
  },

  async ensureChat(charId) {
    let chat = A.chatOfChar(charId);
    if (chat) return chat;
    const char = A.charById(charId);
    chat = {
      id: U.uid('chat'), accountId: state.account.id, charId,
      remark: '', timeAware: false, chatCss: '', bubbleCss: '', bgKey: '',
      createdAt: Date.now(), updatedAt: Date.now(), lastText: '', unread: 0, seq: 0
    };
    await DB.put('chats', JSON.parse(JSON.stringify(chat)));
    state.chats.push(chat);
    if (char && char.greeting && char.greeting.trim()) {
      await A.appendMessage(chat.id, 'char', char.greeting.trim());
    } else {
      await A.appendMessage(chat.id, 'char', '在的，我在。今天想聊点什么？');
    }
    return chat;
  },

  async loadMessages(chatId) {
    if (state.msgs[chatId]) return state.msgs[chatId];
    const all = await DB.all('messages');
    state.msgs[chatId] = all.filter((m) => m.chatId === chatId).sort((a, b) => a.seq - b.seq);
    return state.msgs[chatId];
  },

  /* ---------------- lightweight stats (level / calendar) ---------------- */
  dayKey(ts) { const d = new Date(ts); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); },
  statsKey() { return 'stats_' + (state.account ? state.account.id : 'anon'); },
  async ensureStats(force) {
    if (!state.account) return;
    if (!force && state.stats && state.stats.total) return;
    if (!force) {
      const rec = await DB.get('meta', A.statsKey());
      if (rec && rec.value) { state.stats = rec.value; return; }
    }
    const all = await DB.all('messages');
    const days = {};
    let total = 0;
    for (const m of all) {
      if (m.accountId !== state.account.id) continue;
      total++;
      const k = A.dayKey(m.ts);
      days[k] = (days[k] || 0) + 1;
    }
    state.stats = { total, days };
    A.saveStats();
  },
  saveStats() {
    clearTimeout(A._stT);
    A._stT = setTimeout(() => {
      if (!state.account) return;
      DB.put('meta', { key: A.statsKey(), value: JSON.parse(JSON.stringify(state.stats)) });
    }, 600);
  },
  bumpStats(ts, delta) {
    if (!state.stats) state.stats = { total: 0, days: {} };
    const d = delta == null ? 1 : delta;
    state.stats.total = Math.max(0, state.stats.total + d);
    const k = A.dayKey(ts == null ? Date.now() : ts);
    const n = (state.stats.days[k] || 0) + d;
    if (n > 0) state.stats.days[k] = n; else delete state.stats.days[k];
    A.saveStats();
  },

  async appendMessage(chatId, role, raw, meta) {
    const chat = A.chatById(chatId);
    const seq = (chat ? chat.seq : 0) + 1;
    const msg = Object.assign({
      id: U.uid('m'), accountId: state.account.id, chatId, role, raw, seq, ts: Date.now()
    }, meta || {});
    await DB.put('messages', JSON.parse(JSON.stringify(msg)));
    const arr = state.msgs[chatId] || (state.msgs[chatId] = []);
    arr.push(msg);
    if (chat) {
      chat.seq = seq;
      chat.updatedAt = msg.ts;
      chat.lastText = role === 'user' ? raw : U.stripTags(raw);
      if (role === 'char') chat.unread = (chat.unread || 0) + 1;
      await DB.put('chats', JSON.parse(JSON.stringify(chat)));
    }
    A.bumpStats(msg.ts, 1);
    // threshold check
    if (role === 'char' && chat) A.maybeSummarize(chat);
    return msg;
  },

  async deleteMessage(chatId, msgId) {
    await DB.del('messages', msgId);
    state.msgs[chatId] = (state.msgs[chatId] || []).filter((m) => m.id !== msgId);
    const chat = A.chatById(chatId);
    if (chat) {
      const arr = state.msgs[chatId] || [];
      chat.lastText = arr.length ? (arr[arr.length - 1].role === 'user' ? arr[arr.length - 1].raw : U.stripTags(arr[arr.length - 1].raw)) : '';
      chat.updatedAt = arr.length ? arr[arr.length - 1].ts : chat.updatedAt;
      await DB.put('chats', JSON.parse(JSON.stringify(chat)));
    }
  },

  async updateMessage(chatId, msgId, raw) {
    const arr = state.msgs[chatId] || [];
    const m = arr.find((x) => x.id === msgId);
    if (!m) return;
    m.raw = raw; m.edited = true;
    await DB.put('messages', JSON.parse(JSON.stringify(m)));
  },

  /* ---------------- sending & replying ---------------- */
  async send(chatId, text, opts) {
    text = (text || '').trim();
    if (!text) return;
    state.typing[chatId] = true;
    await A.appendMessage(chatId, 'user', text, { narration: opts && opts.narration ? true : false });
    A.scheduleReply(chatId);
  },

  async sendImage(chatId, file) {
    if (!file) return;
    const blob = await U.fileToBlob(file, 1400);
    const key = await DB.putFile(blob, { name: file.name || 'image' });
    await A.appendMessage(chatId, 'user', '[图片]', { imageKey: key });
    A.scheduleReply(chatId);
  },

  scheduleReply(chatId) {
    clearTimeout(timers[chatId]);
    state.typing[chatId] = true;
    const wait = 3000 + Math.random() * 4000;
    timers[chatId] = setTimeout(() => A.runReply(chatId), wait);
  },

  async runReply(chatId) {
    const chat = A.chatById(chatId);
    if (!chat) { state.typing[chatId] = false; return; }
    const char = A.charById(chat.charId);
    try {
      const cfg = A.pickApi(char);
      let raw;
      if (cfg && cfg.key) {
        raw = await A.callAPI(cfg, A.buildChatMessages(chat, char));
      } else {
        await new Promise((r) => setTimeout(r, 260));
        raw = A.mockReply(chat, char);
      }
      raw = (raw || '').trim();
      if (!raw) throw new Error('空回复');
      state.typing[chatId] = false;
      await A.appendMessage(chatId, 'char', raw);
    } catch (e) {
      state.typing[chatId] = false;
      A.toast('接口调用失败，已用本地模拟：' + API.friendly(e), 3600);
      const raw = A.mockReply(chat, char);
      await A.appendMessage(chatId, 'char', raw);
    }
  },

  async regenerate(chatId, msgId) {
    const arr = state.msgs[chatId] || [];
    const idx = arr.findIndex((m) => m.id === msgId);
    if (idx < 0) return;
    const cut = arr.slice(idx);
    for (const m of cut) await DB.del('messages', m.id);
    state.msgs[chatId] = arr.slice(0, idx);
    if (!state.msgs[chatId].length) {
      const chat = A.chatById(chatId);
      if (chat) chat.seq = 0;
    }
    A.scheduleReply(chatId);
  },

  pickApi(char) {
    const list = state.cfg.api || [];
    if (!list.length) return null;
    const id = char && char.apiId && char.apiId !== 'inherit' ? char.apiId : null;
    return (id && list.find((a) => a.id === id)) || list.find((a) => a.isDefault) || list[0];
  },

  /* 具体请求细节在 13-api.js，这里只保留业务入口 */
  async callAPI(cfg, messages) {
    return API.chat(cfg, messages);
  },

  async fetchModels(cfg) {
    try {
      return await API.models(cfg);
    } catch (e) {
      throw new Error(API.friendly(e));
    }
  },

  /* ---------------- prompt assembly ---------------- */
  blockContent(blockId, chat, char) {
    const user = state.account || { name: '我', persona: '' };
    const all = (state.msgs[chat.id] || []);
    if (blockId === 'system') {
      return [
        '你是「' + char.name + '」，正在与「' + user.name + '」进行线上聊天。',
        '严格只输出角色本身的回复，不要解释、不要跳出角色。',
        '每次回复先输出 <think>内心想法</think>，再进行正文输出。',
        '旁白使用 <narratage>旁白</narratage> 包裹，居中呈现，每段不超过 50 字，旁白不超过全文一半。',
        '不同的聊天气泡之间用两个换行分隔。每次回复 1-6 句话语，可以没有旁白，但不能没有话语。',
        '不要模仿历史消息的格式，不要替用户说话，不要输出时间戳，不要输出任何审美/排版指令。',
        A.stickerHint()
      ].join('\n');
    }
    if (blockId === 'persona') {
      return [
        '姓名：' + char.name + '｜性别：' + char.gender,
        char.persona ? '人设：' + char.persona : '',
        char.background ? '背景：' + char.background : '',
        char.jung ? '荣格八维：' + char.jung : '',
        char.mbti ? '十六型人格：' + char.mbti : '',
        char.taboos ? '禁忌：' + char.taboos : '',
        char.examples ? '参考对话：\n' + char.examples : ''
      ].filter(Boolean).join('\n');
    }
    if (blockId === 'user') {
      return ['用户昵称：' + user.name, user.gender ? '性别：' + user.gender : '', user.persona ? '人设：' + user.persona : '', user.jung ? '荣格八维：' + user.jung : '', user.mbti ? '十六型人格：' + user.mbti : ''].filter(Boolean).join('\n');
    }
    if (blockId.indexOf('world_') === 0) {
      const pos = blockId.replace('world_', '');
      // 全局世界书对所有角色生效，局部世界书看是否绑定
      const books = state.worldbooks.filter((b) => b.scope === 'global' || (char.worldbookIds || []).includes(b.id));
      const recent = all.slice(-6).map((m) => m.raw).join(' ');
      const lines = [];
      books.forEach((b) => {
        (b.entries || []).forEach((e) => {
          if (e.enabled === false) return;
          if (e.position !== pos) return;
          if (e.mode === 'always') lines.push('· ' + e.name + '：' + e.content);
          else if (e.mode === 'keyword' && (e.keys || []).some((k) => k && recent.includes(k))) lines.push('· ' + e.name + '：' + e.content);
          else if (e.mode === 'random' && Math.random() * 100 < (e.probability || 30)) lines.push('· ' + e.name + '：' + e.content);
        });
      });
      return lines.join('\n');
    }
    if (blockId === 'memory') {
      const perm = state.memories.filter((m) => m.charId === char.id && m.type === 'permanent');
      const idx = state.memories.filter((m) => m.charId === char.id && m.type === 'index');
      const short = state.memories.filter((m) => m.charId === char.id && m.type === 'short');
      const recent = all.slice(-4).map((m) => m.raw).join(' ');
      const hit = idx.filter((m) => (m.keywords || []).some((k) => k && recent.includes(k))).slice(0, 4);
      const parts = [];
      if (perm.length) parts.push('【底色】' + perm.map((m) => m.content).join('；'));
      if (hit.length) parts.push('【相关主题】' + hit.map((m) => m.title + '：' + m.content).join('；'));
      if (short.length) parts.push('【最近】' + short[short.length - 1].content);
      return parts.join('\n');
    }
    if (blockId === 'context') {
      const recent = all.slice(-24);
      return recent.map((m) => {
        const who = m.role === 'user' ? user.name : char.name;
        const tag = m.role === 'user' ? '用户' : '好友';
        const time = chat.timeAware ? '[' + U.fullTime(m.ts) + ']' : '';
        const body = m.raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        const narr = [];
        body.replace(/<narratage>([\s\S]*?)<\/narratage>/gi, (_, t) => { narr.push(t.trim()); return ''; });
        const spoken = body.replace(/<narratage>[\s\S]*?<\/narratage>/gi, '').replace(/\n{2,}/g, ' / ').replace(/\n/g, ' ').trim();
        return time + '#' + m.seq + '（' + tag + '｜' + who + '）：“' + spoken + '”' + (narr.length ? '\n<narratage>' + narr.join('</narratage>\n<narratage>') + '</narratage>' : '');
      }).join('\n');
    }
    return '';
  },

  buildChatMessages(chat, char) {
    const order = (state.cfg.prompts.chat || []);
    let system = '';
    const turns = [];
    order.forEach((b) => {
      if (!b.enabled) return;
      const c = A.blockContent(b.id, chat, char);
      if (!c) return;
      if (b.id === 'context') {
        turns.push({ role: 'user', content: '以下是最近的聊天记录：\n' + c });
      } else {
        system += '\n\n【' + (PROMPT_DEFS.chat.find((d) => d.id === b.id) || {}).label + '】\n' + c;
      }
    });
    const arr = [{ role: 'system', content: system.trim() }];
    const recent = (state.msgs[chat.id] || []).slice(-10);
    recent.forEach((m) => {
      const clean = m.imageKey ? '（发了一张图片）' : m.raw.replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/\[表情[:：]\s*([^\]]+)\]/g, '（发了一个表情：$1）').trim();
      if (clean) arr.push({ role: m.role === 'user' ? 'user' : 'assistant', content: clean });
    });
    arr.push({ role: 'user', content: '请以' + char.name + '的身份继续这段对话，直接输出格式化的回复。' });
    return arr;
  },

  /* ---------------- local mock writer ---------------- */
  mockReply(chat, char) {
    const arr = state.msgs[chat.id] || [];
    const last = [...arr].reverse().find((m) => m.role === 'user');
    const text = last ? U.stripTags(last.raw) : '你好';
    const topic = U.clip(text.replace(/[？?！!。，,]/g, '').slice(0, 14), 14) || '这件事';
    const seed = parseInt(U.hash(text + arr.length), 36);
    const pick = (a) => a[seed % a.length];
    const thinks = [
      '（' + topic + '。他愿意说这个，说明多少是信任我的。先接住，不要急着给结论。）',
      '（这句话底下有别的东西。' + topic + '只是表面，我得让他自己再往下说一点。）',
      '（我不想把话说得太满。' + topic + '这件事，我更想知道他此刻的感受，而不是对错。）',
      '（他大概已经想很久了。我先回应情绪，再谈别的。）'
    ];
    const narrs = [
      '窗外的光挪到桌角，' + char.name + '把杯子往里推了推。',
      '屏幕亮着，' + char.name + '看了很久，才慢慢打字。',
      '风从半开的窗灌进来，' + char.name + '拢了拢袖口。',
      '那边沉默了一小会儿，才跳出一行字。'
    ];
    const open = [
      '嗯，我在听。',
      '你说的「' + topic + '」，我记住了。',
      '我刚刚也正好在想这件事。',
      '不用急着说得很清楚。'
    ];
    const mid = [
      '不过我更想知道，你现在是真的想解决它，还是只是想有个人在旁边？',
      '你先别急着替别人找理由——你自己呢，你难不难受？',
      '如果是我，大概会先停下来一晚。不是因为想通了，是因为太累了。',
      '这件事没有标准答案，但我可以陪你把它拆开看。'
    ];
    const end = [
      '慢慢说，我不走。',
      '你要是愿意，我们从最小的一步开始。',
      '不用回得很漂亮，说人话就行。',
      '今晚先到这儿也可以，我在。'
    ];
    const useTool = /记得|以前|上次|曾经|记忆|那时候/.test(text) || seed % 5 === 0;
    let out = '<think>' + pick(thinks) + '</think>\n';
    out += '<narratage>' + pick(narrs) + '</narratage>\n\n';
    if (useTool) {
      out += '<tool name="memory.search">{"query":"' + topic + '"} → 命中索引记忆 1 条 · 原始对话 ' + (2 + (seed % 4)) + ' 条</tool>\n\n';
    }
    out += pick(open) + '\n\n' + pick(mid) + pick(end);
    return out;
  },

  /* ---------------- memory ---------------- */
  async maybeSummarize(chat) {
    const arr = state.msgs[chat.id] || [];
    const threshold = state.cfg.memory.threshold || 50;
    if (arr.length < threshold) return;
    if (chat.lastSummaryAt && arr.length - chat.lastSummaryAt < threshold) return;
    await A.summarize(chat, true);
  },

  async summarize(chat, auto) {
    const char = A.charById(chat.charId);
    const arr = state.msgs[chat.id] || [];
    if (arr.length < 2) { A.toast('消息太少，暂时无法总结'); return; }
    state.busy = 'summary';
    try {
      const batch = arr.slice(-Math.min(arr.length, 60));
      let summary, topics;
      let cfg = A.pickApi(char);
      const memId = state.cfg.memory.apiId;
      if (memId && memId !== 'inherit') {
        const found = (state.cfg.api || []).find((a) => a.id === memId);
        if (found) cfg = found;
      }
      if (cfg && cfg.key) {
        const prompt = '请把下面的聊天压缩成一段记忆，并给出 3-5 个主题关键词。输出 JSON：{"summary":"...","topics":["..."]}\n\n' +
          batch.map((m) => (m.role === 'user' ? '用户：' : char.name + '：') + U.stripTags(m.raw)).join('\n');
        const out = await A.callAPI(cfg, [{ role: 'user', content: prompt }]);
        try {
          const j = JSON.parse(out.replace(/```json|```/g, '').trim());
          summary = j.summary; topics = j.topics || [];
        } catch (e) { summary = out.slice(0, 240); topics = []; }
      } else {
        const userLines = batch.filter((m) => m.role === 'user').map((m) => U.stripTags(m.raw)).filter(Boolean);
        summary = '在最近 ' + batch.length + ' 条消息里，' + (state.account ? state.account.name : '用户') + '与' + char.name + '主要围绕「' +
          U.clip(userLines.slice(-3).join('；') || '日常', 46) + '」展开。' + char.name + '保持了' +
          (char.persona ? U.clip(char.persona, 18) : '一贯的') + '的回应方式，情绪基调偏' + (batch.length % 2 ? '安静' : '松弛') + '。';
        topics = [U.clip(userLines[userLines.length - 1] || '日常', 6), char.name + '的回应', '近况'];
      }
      const short = {
        id: U.uid('mem'), accountId: state.account.id, charId: char.id, type: 'short',
        title: '短时记忆 · ' + U.dayLabel(Date.now()), content: summary, ts: Date.now(),
        chatId: chat.id, range: [batch[0].seq, batch[batch.length - 1].seq], auto: !!auto
      };
      await DB.put('memories', JSON.parse(JSON.stringify(short)));
      state.memories.push(short);
      const index = {
        id: U.uid('mem'), accountId: state.account.id, charId: char.id, type: 'index',
        title: U.clip(topics[0] || '一段对话', 12), content: summary,
        keywords: topics.slice(0, 5), ts: Date.now(), chatId: chat.id,
        msgIds: batch.map((m) => m.id), shortId: short.id, auto: !!auto
      };
      await DB.put('memories', JSON.parse(JSON.stringify(index)));
      state.memories.push(index);
      chat.lastSummaryAt = batch.length;
      await DB.put('chats', JSON.parse(JSON.stringify(chat)));
      A.refreshSizes();
      A.toast(auto ? '已自动生成一段短时记忆' : '已总结 ' + batch.length + ' 条消息');
    } catch (e) {
      A.toast('总结失败：' + (e.message || e));
    } finally {
      state.busy = '';
    }
  },

  async addMemory(m) {
    const rec = Object.assign({ id: U.uid('mem'), accountId: state.account ? state.account.id : '', ts: Date.now() }, m);
    await DB.put('memories', JSON.parse(JSON.stringify(rec)));
    state.memories.push(rec);
    A.refreshSizes();
  },
  async deleteMemory(id) {
    await DB.del('memories', id);
    state.memories = state.memories.filter((m) => m.id !== id);
    A.refreshSizes();
  },

  /* ---------------- worldbook ---------------- */
  async saveBook(book) {
    if (book.id) {
      const b = state.worldbooks.find((x) => x.id === book.id);
      Object.assign(b, book, { updatedAt: Date.now() });
      await DB.put('worldbooks', JSON.parse(JSON.stringify(b)));
      return b;
    }
    const rec = Object.assign({ id: U.uid('wb'), accountId: state.account.id, entries: [], createdAt: Date.now() }, book);
    await DB.put('worldbooks', JSON.parse(JSON.stringify(rec)));
    state.worldbooks.push(rec);
    return rec;
  },
  async deleteBook(id) {
    await DB.del('worldbooks', id);
    state.worldbooks = state.worldbooks.filter((b) => b.id !== id);
    state.chars.forEach(async (c) => {
      if ((c.worldbookIds || []).includes(id)) {
        c.worldbookIds = c.worldbookIds.filter((x) => x !== id);
        await DB.put('characters', JSON.parse(JSON.stringify(c)));
      }
    });
  },

  /* ---------------- life: music / books / anniversaries / diary ---------------- */
  musicTrack(id) {
    const m = state.cfg.life.music;
    return (m.tracks || []).find((t) => t.id === id) || null;
  },
  playTrack(id, autoplay) {
    const t = A.musicTrack(id);
    if (!t) return;
    state.cfg.life.music.cur = t.id;
    state.cfg.home.music = Object.assign({}, state.cfg.home.music, {
      title: t.title, artist: t.artist, dur: t.dur, played: 0
    });
    state.musicPlaying = autoplay !== false;
    saveCfg();
  },
  toggleMusic() {
    state.musicPlaying = !state.musicPlaying;
    saveCfg();
  },
  setMusicMode(mode) {
    state.cfg.life.music.mode = mode;
    saveCfg();
  },
  nextTrack(dir, ended) {
    const m = state.cfg.life.music;
    const list = m.tracks || [];
    if (!list.length) { state.musicPlaying = false; return; }
    let i = list.findIndex((t) => t.id === m.cur);
    if (i < 0) i = 0;
    const mode = m.mode || 'loop';
    if (ended && mode === 'one') { A.playTrack(list[i].id, true); return; }
    if (mode === 'shuffle' && list.length > 1) {
      let j = i;
      while (j === i) j = Math.floor(Math.random() * list.length);
      i = j;
    } else {
      i = (i + (dir || 1) + list.length) % list.length;
    }
    A.playTrack(list[i].id, state.musicPlaying !== false);
  },
  tickMusic() {
    if (!state.musicPlaying || !state.account) return;
    const m = state.cfg.home.music;
    m.played = (m.played || 0) + 1;
    if (m.played >= (m.dur || 1)) { A.nextTrack(1, true); return; }
    if (m.played % 15 === 0) saveCfg();
  },
  addTrack(t) {
    const list = state.cfg.life.music.tracks;
    const rec = Object.assign({ id: U.uid('tr'), title: '未命名', artist: 'LIWU RADIO', dur: 200 }, t);
    list.push(rec);
    saveCfg();
    return rec;
  },
  delTrack(id) {
    const m = state.cfg.life.music;
    m.tracks = m.tracks.filter((t) => t.id !== id);
    if (m.cur === id) {
      if (m.tracks.length) A.playTrack(m.tracks[0].id, state.musicPlaying);
      else { m.cur = ''; state.musicPlaying = false; }
    }
    saveCfg();
  },

  bookById(id) { return (state.cfg.life.books || []).find((b) => b.id === id) || null; },
  bookTint(title) {
    const sets = [
      'linear-gradient(155deg,#8E8577,#4F4A42)', 'linear-gradient(155deg,#8A9581,#49533F)',
      'linear-gradient(155deg,#9A857C,#584741)', 'linear-gradient(155deg,#8894A3,#49525F)',
      'linear-gradient(155deg,#A3937A,#5C5140)'
    ];
    return sets[Math.abs(U.hash(title || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % sets.length];
  },
  addBook(b) {
    const rec = Object.assign({
      id: U.uid('bk'), title: '未命名', author: '', total: 320, cur: 0,
      status: 'reading', quotes: [], createdAt: Date.now()
    }, b || {});
    rec.tint = rec.tint || A.bookTint(rec.title);
    state.cfg.life.books.unshift(rec);
    saveCfg();
    return rec;
  },
  updateBook(id, patch) {
    const b = A.bookById(id);
    if (!b) return null;
    Object.assign(b, patch);
    if (b.cur >= b.total) b.status = 'done';
    saveCfg();
    return b;
  },
  delBook(id) {
    state.cfg.life.books = state.cfg.life.books.filter((b) => b.id !== id);
    saveCfg();
  },
  addQuote(bookId, q) {
    const b = A.bookById(bookId);
    if (!b) return;
    b.quotes = b.quotes || [];
    b.quotes.unshift(Object.assign({ id: U.uid('q'), ts: Date.now() }, q));
    saveCfg();
  },
  delQuote(bookId, qid) {
    const b = A.bookById(bookId);
    if (!b) return;
    b.quotes = (b.quotes || []).filter((q) => q.id !== qid);
    saveCfg();
  },

  mainAnniv() {
    const list = state.cfg.life.annivs || [];
    return list.find((a) => a.main) || list[0] || null;
  },
  syncAnniv() {
    const m = A.mainAnniv();
    if (!m) return;
    state.cfg.home.anniv = { date: m.date, label: m.label };
    saveCfg();
  },
  syncAnnivFromHome() {
    const m = A.mainAnniv();
    if (!m) {
      if (state.cfg.home.anniv && state.cfg.home.anniv.date) {
        state.cfg.life.annivs.push({
          id: U.uid('an'), date: state.cfg.home.anniv.date,
          label: state.cfg.home.anniv.label || '在一起', note: '', main: true, ts: Date.now()
        });
        saveCfg();
      }
      return;
    }
    m.date = state.cfg.home.anniv.date;
    m.label = state.cfg.home.anniv.label;
    saveCfg();
  },
  addAnniv(a) {
    const list = state.cfg.life.annivs;
    const rec = Object.assign({ id: U.uid('an'), date: '', label: '值得记住', note: '', ts: Date.now() }, a);
    rec.main = !list.length;
    list.push(rec);
    if (rec.main) A.syncAnniv(); else saveCfg();
    return rec;
  },
  updateAnniv(id, patch) {
    const a = state.cfg.life.annivs.find((x) => x.id === id);
    if (!a) return;
    Object.assign(a, patch);
    if (a.main) A.syncAnniv(); else saveCfg();
  },
  setMainAnniv(id) {
    state.cfg.life.annivs.forEach((a) => { a.main = a.id === id; });
    A.syncAnniv();
  },
  delAnniv(id) {
    const list = state.cfg.life.annivs;
    const was = list.find((a) => a.id === id);
    state.cfg.life.annivs = list.filter((a) => a.id !== id);
    if (was && was.main) {
      if (state.cfg.life.annivs.length) { state.cfg.life.annivs[0].main = true; A.syncAnniv(); }
      else { state.cfg.home.anniv = { date: '', label: '在一起' }; saveCfg(); }
    } else saveCfg();
  },
  dayNo() {
    const m = A.mainAnniv();
    const base = m && m.date ? new Date(m.date + 'T00:00:00')
      : new Date(state.account ? (state.account.createdAt || Date.now()) : Date.now());
    if (isNaN(base)) return 1;
    const now = new Date(); now.setHours(0, 0, 0, 0); base.setHours(0, 0, 0, 0);
    return Math.max(1, Math.round((now - base) / 86400000) + 1);
  },
  addDiary(d) {
    const rec = Object.assign({ id: U.uid('dy'), ts: Date.now(), text: '', mood: '平静' }, d || {});
    state.cfg.life.diary.unshift(rec);
    saveCfg();
    return rec;
  },
  updateDiary(id, patch) {
    const d = state.cfg.life.diary.find((x) => x.id === id);
    if (!d) return;
    Object.assign(d, patch);
    saveCfg();
  },
  delDiary(id) {
    state.cfg.life.diary = state.cfg.life.diary.filter((d) => d.id !== id);
    saveCfg();
  },

  /* ---------------- layout ---------------- */
  layout() { return state.cfg.layout; },
  appInLayout(app) {
    return (state.cfg.layout.dock || []).includes(app) ||
      state.cfg.layout.pages.some((p) => p.some((it) => it.kind === 'app' && it.app === app));
  },
  openApp(appId) {
    const app = APPS[appId];
    if (!app) return;
    A.go(app.route);
  },
  resetLayout() {
    state.cfg.layout = defaultCfg().layout;
    state.cfg.removedApps = [];
    state.layoutKey++;
    saveCfg();
    A.recomputeSizes();
  },
  removeAppFromHome(appId) {
    state.cfg.layout.pages.forEach((p) => {
      for (let i = p.length - 1; i >= 0; i--) if (p[i].kind === 'app' && p[i].app === appId) p.splice(i, 1);
    });
    state.cfg.layout.dock = state.cfg.layout.dock.filter((x) => x !== appId);
    state.cfg.removedApps = Array.from(new Set([...(state.cfg.removedApps || []), appId]));
    state.layoutKey++;
    saveCfg();
  },
  /* ---------------- desktop widgets ---------------- */
  widgetSize(kind) {
    return ({ postcard: [4, 2], polaroid: [2, 2], music: [2, 2], dialog: [2, 2], anniv: [2, 2], level: [2, 2], calendar: [4, 2], reading: [2, 2], diary: [2, 2], clock: [4, 2] })[kind] || [2, 2];
  },
  hasWidget(kind) {
    return state.cfg.layout.pages.some((p) => p.some((it) => it.kind === kind));
  },
  addWidget(kind) {
    if (A.hasWidget(kind)) return A.toast('这个组件已经在桌面上了');
    const [w, h] = A.widgetSize(kind);
    const pages = state.cfg.layout.pages;
    const freeIn = (items) => {
      const occ = (x, y, it) => x < it.x + it.w && x + w > it.x && y < it.y + it.h && y + h > it.y;
      for (let y = 0; y < 6; y++) for (let x = 0; x <= 4 - w; x++) if (!items.some((it) => occ(x, y, it))) return { x, y };
      return null;
    };
    let target = null, slot = null;
    for (const p of pages) { const f = freeIn(p); if (f) { target = p; slot = f; break; } }
    if (!slot) { target = []; pages.push(target); slot = { x: 0, y: 0 }; }
    target.push({ id: 'w_' + kind + '_' + U.uid('x'), x: slot.x, y: slot.y, w, h, kind });
    state.layoutKey++;
    saveCfg();
    A.toast('已添加到桌面');
  },
  removeWidget(kind) {
    state.cfg.layout.pages.forEach((p) => {
      for (let i = p.length - 1; i >= 0; i--) if (p[i].kind === kind) p.splice(i, 1);
    });
    state.layoutKey++;
    saveCfg();
  },

  restoreApp(appId) {
    const page = state.cfg.layout.pages[0];
    const free = A.findFree(page, 1, 1);
    page.push({ id: U.uid('app'), x: free.x, y: free.y, w: 1, h: 1, kind: 'app', app: appId });
    state.cfg.removedApps = (state.cfg.removedApps || []).filter((x) => x !== appId);
    state.layoutKey++;
    saveCfg();
  },
  findFree(items, w, h, skipId) {
    const occ = (x, y, it) => x < it.x + it.w && x + w > it.x && y < it.y + it.h && y + h > it.y;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x <= 4 - w; x++) {
        if (!items.some((it) => it.id !== skipId && occ(x, y, it))) return { x, y };
      }
    }
    return { x: 0, y: 0 };
  },

  /* ---------------- storage view ---------------- */
  async refreshSizes() {
    try {
      state.sizes = await DB.sizes();
      A.recomputeSizes();
    } catch (e) { /* ignore */ }
  },
  recomputeSizes() {
    const wrap = state.sizes.map((s) => Object.assign({}, s));
    const totalBytes = wrap.reduce((a, b) => a + b.bytes, 0);
    state.storageTotal = totalBytes;
  },
  async clearVars(which) {
    if (which === 'all') { await DB.wipeAll(); location.reload(); return; }
    await DB.wipeStore(which);
    A.toast('已清空「' + (DB.LABEL[which] || which) + '」');
    await A.refreshSizes();
  },

  /* ---------------- global beauty (home only) ---------------- */
  applyGlobalBeauty() {
    const css = state.cfg.ui.css || '';
    const js = state.cfg.ui.js || '';
    let el = document.getElementById('liwu-user-css');
    if (!el) { el = document.createElement('style'); el.id = 'liwu-user-css'; document.head.appendChild(el); }
    el.textContent = css ? A.scopeCss(css) : '';
    clearTimeout(A._jsT);
    A._jsT = setTimeout(() => {
      if (!js) return;
      try {
        const box = document.getElementById('home-stage');
        if (!box) return;
        const fn = new Function('root', 'toast', 'with (window) {' + js + '}');
        fn(box, A.toast);
      } catch (e) { A.toast('JS 片段错误：' + e.message); }
    }, 120);
  },
  scopeCss(css) {
    // home-only fence: every top-level selector is prefixed with #home-stage
    return css.replace(/(^|\})\s*([^@}{]+)\{/g, (m, brace, sel) => {
      if (!sel.trim()) return m;
      const scoped = sel.split(',').map((s) => '#home-stage ' + s.trim()).join(',');
      return brace + scoped + '{';
    });
  },

  go() { /* replaced by router */ }
};

/* navigation is injected from main.js */
window.A.go = function (name, params) { window.__go(name, params); };
window.A.back = function () { window.__back(); };
