/* ============================================================
   App 矩阵 · 桌面图标级独立应用
   天气 / 地图 / 备忘录 / 相册 / 待办 / 外卖 / 游戏 / 语音 / 健康 / 梦境 / 电话
   ============================================================ */
const APPX = {};

/* 小工具：保证某 App 的本地数据存在 */
function appData(key, def) {
  if (!S.cfg.apps) S.cfg.apps = {};
  if (S.cfg.apps[key] === undefined) S.cfg.apps[key] = def;
  return S.cfg.apps[key];
}
const saveApp = () => saveCfg();

/* ---------------- 天气 ---------------- */
APPX.Weather = {
  data() { return { S, pick: 0 }; },
  computed: {
    d() { const a = appData('weather', { city: '你的城市', cur: 2, fav: 18 }); return a; },
    today() { const w = ['晴', '多云', '小雨', '阴', '轻雾'][this.d.cur % 5]; const t = [21, 24, 17, 19, 16][this.d.cur % 5]; return { w, t, tip: t < 19 ? '今天有点凉，他让你加件外套。' : '天气不错，他希望你出去走走。' }; },
    fc() { const w = ['晴', '多云', '小雨', '阴', '小雨']; const t = [21, 22, 17, 19, 16]; return [0, 1, 2, 3, 4].map((i) => ({ day: ['今天', '明天', '周三', '周四', '周五'][i], w: w[(this.d.cur + i) % 5], t: t[(this.d.cur + i) % 5], hi: t[(this.d.cur + i) % 5] + 3 })); }
  },
  methods: {
    refresh() { this.d.cur = (this.d.cur + 1) % 5; saveApp(); A.toast('已更新天气'); },
    sync() {
      OS.setStatus({ activity: '担心你', place: '家', text: '他看了眼天气，想叮嘱你' });
      OS.emit('weather.change', { tip: '你那边' + this.today.w + '，' + this.today.tip });
      A.toast('他发来了一条消息');
    }
  },
  template: `<div class="page">
    <nav-bar title="天气"></nav-bar>
    <div class="body pad">
      <div class="wx-hero" :style="{'--wx':['#F3C98B','#C9D4DA','#A9C0CE','#B9BFC6','#D8D2C8'][d.cur%5]}">
        <div class="wx-top"><span>{{d.city}}</span><button class="wx-ref" @click="refresh"><ico name="refresh" :size="14"/></button></div>
        <div class="wx-temp">{{today.t}}<span>°</span></div>
        <div class="wx-w">{{today.w}}</div>
        <div class="wx-tip">{{today.tip}}</div>
      </div>
      <div class="wx-fc">
        <div class="wx-day" v-for="(f,i) in fc" :key="i"><div class="wd">{{f.day}}</div><div class="ww">{{f.w}}</div><div class="wt">{{f.hi}}°</div></div>
      </div>
      <button class="btn block primary" @click="sync">让他也看到 · 同步给聊天</button>
      <div class="helper center">天气变化时，他会主动在聊天里提醒你。这是 App 之间的联动。</div>
    </div>
  </div>`
};

/* ---------------- 地图 ---------------- */
APPX.Map = {
  data() { return { S, spots: [
    { id: 'home', name: '家', x: 22, y: 30, icon: 'home', now: false },
    { id: 'cafe', name: '街角咖啡店', x: 62, y: 24, icon: 'cup', now: false },
    { id: 'book', name: '旧书店', x: 48, y: 64, icon: 'book', now: false },
    { id: 'office', name: '公司', x: 80, y: 70, icon: 'store', now: false }
  ], sel: 'cafe' }; },
  computed: {
    d() { return appData('map', { place: 'cafe' }); },
    here() { return this.spots.find((s) => s.id === this.d.place) || this.spots[1]; }
  },
  methods: {
    go(id) { this.sel = id; this.d.place = id; saveApp(); const s = this.spots.find((x) => x.id === id); OS.setStatus({ place: s.name, activity: '在' + s.name, text: '他在「' + s.name + '」' }); A.toast('他现在在' + s.name); },
    bump() { OS.notify({ app: 'map', icon: 'map', title: '地图', body: '你发了个表情包，他看到了，回了你一个 😊', route: 'chat' }); A.toast('偶遇成功'); }
  },
  template: `<div class="page">
    <nav-bar title="他的位置"></nav-bar>
    <div class="body pad">
      <div class="map-canvas">
        <div class="map-road" style="left:0;top:46%;width:100%;height:8px;transform:rotate(-6deg)"></div>
        <div class="map-road" style="left:40%;top:0;width:8px;height:100%"></div>
        <div class="map-pin" v-for="s in spots" :key="s.id" :class="{on:s.id===sel}" :style="{'left':s.x+'%','top':s.y+'%'}" @click="go(s.id)">
          <ico :name="s.icon==='cup'?'coffee':s.icon" :size="13"/><i class="mp-name">{{s.name}}</i>
        </div>
        <div class="map-me">你</div>
      </div>
      <div class="map-here">
        <ico name="pin" :size="15"/> 他现在在 <b>{{here.name}}</b>
        <span class="helper">· 轻点地图上的点切换</span>
      </div>
      <button class="btn block" @click="bump">在这附近「偶遇」他</button>
      <div class="helper center">他的定位会同步到主屏状态条。</div>
    </div>
  </div>`
};

/* ---------------- 备忘录（他的） ---------------- */
APPX.Notes = {
  data() { return { S, edit: null, text: '', open: false }; },
  computed: { list() { return appData('notes', [
    { id: 'n1', t: '她的生理期大概在每月 12 号前后，那几天别让她喝冰的。' },
    { id: 'n2', t: '她喜欢下雨天，但不喜欢被雨淋。' },
    { id: 'n3', t: '纪念日：第一次见面是 4 月 7 号。' },
    { id: 'n4', t: '惊喜清单：想和她去看一次海。' }
  ]); } },
  methods: {
    add() { this.edit = null; this.text = ''; this.open = true; },
    edt(n) { this.edit = n.id; this.text = n.t; this.open = true; },
    save() { const v = this.text.trim(); if (!v) { this.open = false; return; } if (this.edit) { const n = this.list.find((x) => x.id === this.edit); n.t = v; } else this.list.unshift({ id: U.uid('n'), t: v }); this.open = false; saveApp(); A.toast('已保存到他的备忘录'); },
    del(n) { const i = this.list.indexOf(n); if (i >= 0) this.list.splice(i, 1); saveApp(); },
    ping() { OS.notify({ app: 'notes', icon: 'note', title: '他的备忘录', body: '他刚刚写了一句关于你的话。', route: 'notes' }); }
  },
  template: `<div class="page">
    <nav-bar title="他的备忘录">
      <template #right><button class="nav-btn" @click="add">写一条</button></template>
    </nav-bar>
    <div class="body pad">
      <div class="note-item" v-for="n in list" :key="n.id" @click="edt(n)">
        <div class="note-tx">{{n.t}}</div>
        <button class="note-x" @click.stop="del(n)"><ico name="trash" :size="13"/></button>
      </div>
      <div v-if="!list.length" class="empty"><div class="e-ico"><ico name="note" :size="22"/></div><div class="e-sub">他还没写任何关于你的话</div></div>
      <button class="btn block" @click="ping" style="margin-top:14px">模拟他刚写了新的一条</button>
    </div>
    <sheet v-model="open" :title="edit?'编辑':'写一条他的话'">
      <textarea class="input area" v-model="text" rows="5" placeholder="他记下的关于你的事…"></textarea>
      <div class="sheet-actions"><button class="btn primary" @click="save">保存</button><button class="btn ghost" @click="open=false">取消</button></div>
    </sheet>
  </div>`
};

/* ---------------- 相册 ---------------- */
APPX.Camera = {
  data() { return { S }; },
  computed: { list() { return appData('camera', [{ id: 'c0', key: '', cap: '他窗台上的光' }, { id: 'c1', key: '', cap: '雨天，空椅子' }]); } },
  methods: {
    async add() {
      const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
      input.onchange = async () => { const f = input.files[0]; if (!f) return; const k = await A.replaceImage('', f); this.list.unshift({ id: U.uid('c'), key: k, cap: '刚刚拍下' }); saveApp(); OS.notify({ app: 'camera', icon: 'camera', title: '相册', body: '他往共享相册里存了一张照片。', route: 'camera' }); };
      input.click();
    },
    del(p) { if (p.key) DB.delFile(p.key); const i = this.list.indexOf(p); if (i >= 0) this.list.splice(i, 1); saveApp(); }
  },
  template: `<div class="page">
    <nav-bar title="共享相册">
      <template #right><button class="nav-btn" @click="add">加一张</button></template>
    </nav-bar>
    <div class="body pad">
      <div class="cam-grid">
        <div class="cam-cell" v-for="p in list" :key="p.id" @click="del(p)">
          <img v-if="p.key" :src="S.imgCache[p.key]" style="width:100%;height:100%;object-fit:cover"/>
          <div v-else class="cam-empty"><ico name="image" :size="20"/></div>
          <div class="cam-cap">{{p.cap}}</div>
        </div>
      </div>
      <div class="helper center">点开任意一张可删除。他拍的照片会自动出现在这里。</div>
    </div>
  </div>`
};

/* ---------------- 待办 ---------------- */
APPX.Todo = {
  data() { return { S, text: '', done: 0 }; },
  computed: {
    d() { return appData('todo', { day: '', items: [] }); },
    items() { const t = new Date().toDateString(); if (this.d.day !== t) { this.d.day = t; this.d.items.forEach((x) => (x.done = false)); saveApp(); } return this.d.items; }
  },
  methods: {
    add() { const v = this.text.trim(); if (!v) return; this.d.items.unshift({ id: U.uid('t'), t: v, done: false }); this.text = ''; saveApp(); },
    toggle(x) { x.done = !x.done; saveApp(); if (x.done) { const r = ['乖，奖励你一个抱抱。', '今天也很棒，记得喝水。', '完成得漂亮，他给你比了个心。'][Math.floor(Math.random() * 3)]; OS.notify({ app: 'todo', icon: 'check', title: '待办', body: '他：' + r, route: 'todo' }); } },
    del(x) { const i = this.d.items.indexOf(x); if (i >= 0) this.d.items.splice(i, 1); saveApp(); }
  },
  template: `<div class="page">
    <nav-bar title="每日待办"></nav-bar>
    <div class="body pad">
      <div class="todo-add"><input class="input" v-model="text" placeholder="今天想完成什么？他来监督你" @keyup.enter="add"/><button class="btn sm primary" @click="add">加</button></div>
      <div class="todo-item" v-for="x in items" :key="x.id" :class="{done:x.done}" @click="toggle(x)">
        <i class="todo-check"><ico v-if="x.done" name="check" :size="12" :sw="2.4"/></i>
        <span class="todo-tx">{{x.t}}</span>
        <button class="note-x" @click.stop="del(x)"><ico name="trash" :size="12"/></button>
      </div>
      <div v-if="!items.length" class="empty"><div class="e-ico"><ico name="check" :size="22"/></div><div class="e-sub">今天还没有目标，写下第一个吧</div></div>
      <div class="helper center">每完成一项，他会给你一句专属奖励。</div>
    </div>
  </div>`
};

/* ---------------- 外卖 ---------------- */
APPX.Delivery = {
  data() { return { S, menu: ['奶茶·芋泥波波', '草莓蛋糕', '热可可', '一小束花', '宵夜·关东煮'], pick: 0, order: null }; },
  computed: { d() { return appData('delivery', { last: null }); } },
  methods: {
    orderNow() { const item = this.menu[this.pick]; const o = { id: U.uid('o'), item, ts: Date.now(), step: 0, steps: ['已下单', '他正在挑选', '骑手出发', '已送达'] }; this.d.last = o; this.order = o; saveApp(); OS.notify({ app: 'delivery', icon: 'gift', title: '外卖', body: '他为你下单了「' + item + '」，虚拟订单已生成。', route: 'delivery' }); this.advance(); },
    advance() { if (!this.order) return; this.order.step = Math.min(this.order.step + 1, 3); saveApp(); if (this.order.step < 3) setTimeout(() => this.advance(), 1400); }
  },
  template: `<div class="page">
    <nav-bar title="他为你的下单"></nav-bar>
    <div class="body pad">
      <div class="dl-menu">
        <div class="dl-item" v-for="(m,i) in menu" :key="i" :class="{on:i===pick}" @click="pick=i">{{m}}</div>
      </div>
      <button class="btn block primary" @click="orderNow">让他帮我点一份</button>
      <div class="dl-order" v-if="d.last">
        <div class="dl-t">最新订单</div>
        <div class="dl-item2">{{d.last.item}}</div>
        <div class="dl-steps">
          <div class="dl-s" v-for="(s,i) in d.last.steps" :key="i" :class="{on:i<=d.last.step}"><i></i><span>{{s}}</span></div>
        </div>
      </div>
      <div class="helper center">虚拟订单，只为增加一点被惦记的生活气。</div>
    </div>
  </div>`
};

/* ---------------- 游戏（石头剪刀布） ---------------- */
APPX.Game = {
  data() { return { S, my: null, his: null, log: '', win: 0, lose: 0 }; },
  computed: { d() { return appData('game', { win: 0, lose: 0 }); } },
  methods: {
    play(x) { const r = ['rock', 'paper', 'scissor'][Math.floor(Math.random() * 3)]; this.my = x; this.his = r; const m = { rock: '石头', paper: '布', scissor: '剪刀' }[x]; const h = { rock: '石头', paper: '布', scissor: '剪刀' }[r]; let res; if (x === r) res = '平局'; else if ((x === 'rock' && r === 'scissor') || (x === 'paper' && r === 'rock') || (x === 'scissor' && r === 'paper')) { res = '你赢了'; this.d.win++; } else { res = '他赢了'; this.d.lose++; } saveApp(); this.log = '你出' + m + ' · 他出' + h + ' → ' + res + (res === '你赢了' ? '，他撒娇了。' : res === '他赢了' ? '，他哄了你一句。' : '，再来一局。'); },
    reset() { this.my = this.his = this.log = null; }
  },
  template: `<div class="page">
    <nav-bar title="小游戏"></nav-bar>
    <div class="body pad">
      <div class="gm-score">你 {{d.win}} · 他 {{d.lose}}</div>
      <div class="gm-stage">
        <div class="gm-side"><div class="gm-who">你</div><div class="gm-hand">{{my?{rock:'✊',paper:'✋',scissor:'✌'}[my]:'·'}}</div></div>
        <div class="gm-vs">VS</div>
        <div class="gm-side"><div class="gm-who">他</div><div class="gm-hand">{{his?{rock:'✊',paper:'✋',scissor:'✌'}[his]:'·'}}</div></div>
      </div>
      <div class="gm-log" v-if="log">{{log}}</div>
      <div class="gm-pick">
        <button @click="play('rock')">✊</button><button @click="play('paper')">✋</button><button @click="play('scissor')">✌</button>
      </div>
      <div class="helper center">赢了他会撒娇，输了他会哄你。</div>
    </div>
  </div>`
};

/* ---------------- 语音 / 白噪音 ---------------- */
APPX.Voice = {
  data() { return { S, playing: null, ctx: null }; },
  computed: {
    d() { return appData('voice', { on: null }); },
    list() { return [{ id: 'rain', name: '雨声', icon: 'cloud', desc: '他窗外的夜雨' }, { id: 'story', name: '睡前故事', icon: 'book', desc: '他念给你听' }, { id: 'breath', name: '呼吸引导', icon: 'moon', desc: '一起慢慢呼吸' }]; }
  },
  methods: {
    toggle(id) { if (this.playing === id) { this.playing = null; A.musicPlaying = false; return; } this.playing = id; A.musicPlaying = true; OS.setStatus({ activity: '陪你听' + (this.list.find((x) => x.id === id).name), text: '他正在陪你听' + this.list.find((x) => x.id === id).name }); A.toast('播放中 · ' + this.list.find((x) => x.id === id).name); }
  },
  template: `<div class="page">
    <nav-bar title="语音 · 白噪音"></nav-bar>
    <div class="body pad">
      <div class="vc-item" v-for="v in list" :key="v.id" :class="{on:playing===v.id}" @click="toggle(v.id)">
        <div class="vc-ico"><ico :name="v.icon" :size="18"/></div>
        <div class="vc-main"><div class="vc-name">{{v.name}}</div><div class="vc-desc">{{v.desc}}</div></div>
        <i class="vc-play"><ico :name="playing===v.id?'pause':'play'" :size="13"/></i>
      </div>
      <div class="helper center">点开即播放，他陪你一起听。</div>
    </div>
  </div>`
};

/* ---------------- 健康 ---------------- */
APPX.Health = {
  data() { return { S }; },
  computed: {
    d() { return appData('health', { hr: 72, steps: 6840, sleep: 7.2 }); },
    advice() { const a = this.d.hr > 80 ? '他让你深呼吸，别太紧绷。' : this.d.steps < 6000 ? '他提醒你今天动得有点少，去走两步。' : this.d.sleep < 7 ? '他希望你今晚早点睡。' : '你今天状态不错，他偷偷放心了。'; return a; }
  },
  methods: {
    sync() { this.d.hr = 64 + Math.floor(Math.random() * 22); this.d.steps = 5000 + Math.floor(Math.random() * 5000); saveApp(); A.toast('已同步他的健康数据'); OS.setStatus({ activity: '在运动', text: '他刚走完今天的步数' }); }
  },
  template: `<div class="page">
    <nav-bar title="他的健康"></nav-bar>
    <div class="body pad">
      <div class="hp-pulse"><ico name="pulse" :size="20"/><span>{{d.hr}}</span><small>bpm</small></div>
      <div class="hp-grid">
        <div class="hp-cell"><div class="hp-v">{{d.steps}}</div><div class="hp-k">今日步数</div></div>
        <div class="hp-cell"><div class="hp-v">{{d.sleep}}h</div><div class="hp-k">睡眠</div></div>
      </div>
      <div class="hp-advice"><ico name="heart" :size="15"/> {{advice}}</div>
      <button class="btn block" @click="sync">刷新数据</button>
    </div>
  </div>`
};

/* ---------------- 梦境 / 晚安日记 ---------------- */
APPX.Dream = {
  data() { return { S, open: false, text: '' }; },
  computed: {
    d() { return appData('dream', { date: '', his: '', mine: '' }); },
    today() { const t = new Date().toDateString(); if (this.d.date !== t) { this.d.date = t; this.d.his = '今天你笑了几次，我都记着。晚安，明天见。'; this.d.mine = ''; saveApp(); } return this.d; }
  },
  methods: {
    save() { this.d.mine = this.text.trim(); this.open = false; saveApp(); OS.notify({ app: 'dream', icon: 'moon', title: '梦境', body: '他写好了今晚的晚安日记。', route: 'dream' }); }
  },
  template: `<div class="page">
    <nav-bar title="晚安日记"></nav-bar>
    <div class="body pad">
      <div class="dm-card">
        <div class="dm-k">他写的</div>
        <div class="dm-tx">{{today.his}}</div>
        <div class="dm-date">{{today.date}}</div>
      </div>
      <div class="dm-card mine" v-if="today.mine"><div class="dm-k">你写的</div><div class="dm-tx">{{today.mine}}</div></div>
      <button class="btn block" @click="open=true;text=today.mine">写一句今天的总结</button>
    </div>
    <sheet v-model="open" title="今天的晚安">
      <textarea class="input area" v-model="text" rows="4" placeholder="今天发生了什么，想对他说什么…"></textarea>
      <div class="sheet-actions"><button class="btn primary" @click="save">收下</button><button class="btn ghost" @click="open=false">取消</button></div>
    </sheet>
  </div>`
};

/* ---------------- 电话 ---------------- */
APPX.Phone = {
  data() { return { S, calling: false, ring: 0 }; },
  computed: {
    d() { return appData('phone', { log: [
      { id: 'p1', type: 'missed', who: '他', name: '未接来电', time: '昨天 21:30' },
      { id: 'p2', type: 'voicemail', who: '他', name: '语音信箱 · 0:12', time: '昨天 21:31', text: '你没接，我就想说，今天也辛苦了。' }
    ] }); }
  },
  methods: {
    call() { this.calling = true; this.ring = 0; const t = setInterval(() => { this.ring++; if (this.ring > 3) { clearInterval(t); this.calling = false; this.d.log.unshift({ id: U.uid('p'), type: 'voicemail', who: '他', name: '语音信箱 · 0:09', time: '刚刚', text: '你打过来时我在忙，但我想让你知道，我在。' }); saveApp(); OS.notify({ app: 'phone', icon: 'phone', title: '电话', body: '他给你留了一段语音信箱。', route: 'phone' }); } }, 900); },
    hang() { this.calling = false; }
  },
  template: `<div class="page">
    <nav-bar title="电话"></nav-bar>
    <div class="body pad">
      <button class="btn block primary" @click="call">给他打语音</button>
      <div class="ph-calling" v-if="calling"><div class="ph-ring"></div><div>正在呼叫他…</div><button class="btn ghost" @click="hang">挂断</button></div>
      <div class="ph-log">
        <div class="ph-item" v-for="p in d.log" :key="p.id" :class="p.type">
          <i class="ph-ico"><ico :name="p.type==='missed'?'phone':'mic'" :size="13"/></i>
          <div class="ph-main"><div class="ph-name">{{p.name}}</div><div class="ph-text" v-if="p.text">{{p.text}}</div></div>
          <div class="ph-time">{{p.time}}</div>
        </div>
      </div>
      <div class="helper center">没接通时，他会把话留在语音信箱里。</div>
    </div>
  </div>`
};

/* ---------------- 占位（兜底） ---------------- */
APPX.Coming = {
  props: { name: { type: String, default: '这个应用' } },
  template: `<div class="page"><nav-bar :title="name"></nav-bar><div class="body pad"><div class="empty"><div class="e-ico"><ico name="sparkle" :size="22"/></div><div class="e-title">即将上线</div><div class="e-sub">这个 App 已经在桌面就位，下个版本会填上内容。</div></div></div></div>`
};
