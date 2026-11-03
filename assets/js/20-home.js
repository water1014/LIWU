/* ============================================================
   Home screen — grid, widgets, edit / drag / delete
   ============================================================ */
const HOME = {};

/* 桌面网格：4 列，一格 = 一枚图标的高度 */
const GRID = { cols: 4, row: 78, gap: 10 };
/* 每个组件的格位：[列, 行]。一页只安排一个视觉主角。 */
const WSIZE = {
  postcard: [4, 2], diary: [2, 2],
  polaroid: [2, 3], music: [4, 2], calendar: [2, 3],
  dialog: [2, 2], anniv: [2, 2], level: [2, 2], reading: [2, 2], clock: [2, 2]
};

HOME.Postcard = {
  props: { item: Object },
  computed: {
    h() { return S.cfg.home; },
    dateText() { const d = new Date(); return (d.getMonth() + 1) + ' / ' + d.getDate(); },
    talks() { return (S.stats && S.stats.total) || 0; },
    memories() { return (S.memories || []).length; },
    me() { return S.account || {}; }
  },
  data() { return { url: '' }; },
  watch: { 'h.bgKey': { immediate: true, handler(k) { this.load(k); } } },
  methods: {
    async load(k) { this.url = k ? await A.resolveImg(k) : ''; },
    open() { if (!S.editing) this.$parent.editWidget('postcard'); }
  },
  template: `<div class="widget pc" :style="{'--pc-base':h.base||'#F3F2EE'}" @click="open">
    <div class="pc-bg" :class="{empty:!url}" :style="url?{backgroundImage:'url('+url+')'}:{}"></div>
    <div class="pc-grain"></div>
    <div class="pc-fade"></div>
    <div class="pc-date">{{dateText}}</div>
    <div class="pc-mark">L I W U</div>
    <div class="pc-inner">
      <div class="pc-people">
        <div class="pc-av-wrap"><av :file-key="me.avatarKey" :name="me.name||h.name" :size="52" radius="18px"/></div>
        <span class="pc-heart"><ico name="heart" :size="11" :sw="1.8"/></span>
        <div class="pc-av-wrap"><av :file-key="h.avatarKey" :name="h.name" :size="52" radius="18px"/></div>
      </div>
      <div class="pc-text">
        <div class="pc-overline">MY SPACE</div>
        <div class="pc-name">{{h.name}}</div>
        <div class="pc-sign">{{h.sign}}</div>
      </div>
    </div>
    <div class="pc-foot"><span><b>{{A.dayNo()}}</b> DAYS</span><span><b>{{talks}}</b> TALKS</span><span><b>{{memories}}</b> MEMORIES</span></div>
  </div>`
};

HOME.Polaroid = {
  computed: {
    h() { return S.cfg.home; },
    photo() { return this.url || (S.cfg.ui.theme === 'glass' ? 'assets/img/wall-window.jpg' : 'assets/img/wall-fog.jpg'); }
  },
  data() { return { url: '' }; },
  watch: { 'h.polaroidKey': { immediate: true, handler(k) { this.load(k); } } },
  methods: {
    async load(k) { this.url = k ? await A.resolveImg(k) : ''; },
    open() { if (!S.editing) this.$parent.editWidget('polaroid'); }
  },
  template: `<div class="widget polaroid" @click="open">
    <div class="pol-back"></div>
    <div class="pol-front">
      <div class="pol-tape"></div>
      <div class="pol-img">
        <img :src="photo" alt="我们的照片" style="width:100%;height:100%;object-fit:cover;display:block">
        <span class="pol-shine"></span>
      </div>
      <div class="pol-cap">{{h.polaroidCap || 'no caption'}}</div>
    </div>
  </div>`
};

HOME.Music = {
  data() { return { wave: [6, 11, 17, 9, 22, 14, 7, 19, 25, 12, 8, 16, 21, 10, 6, 14, 23, 17, 9, 13, 6] }; },
  computed: {
    m() { return S.cfg.home.music; },
    track() { return A.musicTrack((S.cfg.life.music || {}).cur) || null; },
    pct() { return Math.min(100, (this.m.played / Math.max(1, this.m.dur)) * 100); },
    now() { return this.fmt(this.m.played); },
    total() { return this.fmt(this.m.dur); }
  },
  methods: {
    fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + U.pad(s % 60); },
    toggle(e) { e.stopPropagation(); A.toggleMusic(); },
    skip(e, n) { e.stopPropagation(); A.nextTrack(n); },
    open() { if (!S.editing) A.go('music'); }
  },
  template: `<div class="widget music" @click="open">
    <div class="music-kicker"><span>NOW PLAYING</span><span class="music-live"><i></i>{{S.musicPlaying?'ON AIR':'PAUSED'}}</span></div>
    <div class="music-top">
      <div class="music-art" :class="{playing:S.musicPlaying}"><span>LIWU</span></div>
      <div class="music-meta">
        <div class="music-name">{{track ? track.title : (m.title || 'Soft Static')}}</div>
        <div class="music-artist">{{track ? track.artist : (m.artist || 'LIWU RADIO')}}</div>
      </div>
      <ico name="music" :size="15" :sw="1.5"/>
    </div>
    <div class="music-track">
      <div class="music-bar"><i :style="{width:pct+'%'}"></i></div>
      <div class="music-time"><span>{{now}}</span><span>{{total}}</span></div>
    </div>
    <div class="music-bot">
      <button class="music-skip" @click="skip($event,-1)" aria-label="上一首"><ico name="prev" :size="15"/></button>
      <button class="music-play" @click="toggle" :aria-label="S.musicPlaying?'暂停':'播放'"><ico :name="S.musicPlaying?'pause':'play'" :size="15"/></button>
      <button class="music-skip" @click="skip($event,1)" aria-label="下一首"><ico name="next" :size="15"/></button>
    </div>
  </div>`
};

HOME.Dialog = {
  computed: {
    d() { return S.cfg.home.dialog; },
    keys() { return S.cfg.home.dialogAvKey || ''; }
  },
  methods: { open() { if (!S.editing) this.$parent.editWidget('dialog'); } },
  template: `<div class="widget dlg" @click="open">
    <div class="dlg-cap">A SMALL TALK</div>
    <div class="dlg-row">
      <div class="dlg-av"><av :file-key="keys" name="TA" :size="18"/></div>
      <div class="dlg-bub">{{d[0] && d[0].text}}</div>
    </div>
    <div class="dlg-row me">
      <div class="dlg-av"><av :file-key="S.cfg.home.avatarKey" :name="S.cfg.home.name" :size="18"/></div>
      <div class="dlg-bub">{{d[1] && d[1].text}}</div>
    </div>
  </div>`
};

HOME.Anniv = {
  computed: {
    cfg() { return S.cfg.home.anniv || {}; },
    days() {
      if (!this.cfg.date) return null;
      const t = new Date(this.cfg.date + 'T00:00:00');
      if (isNaN(t)) return null;
      const now = new Date(); now.setHours(0, 0, 0, 0);
      return Math.round((now - t) / 86400000) + 1;
    },
    future() { return this.days != null && this.days < 1; },
    big() { return this.days == null ? '＋' : Math.abs(this.days); },
    dateText() { return this.cfg.date ? this.cfg.date.replace(/-/g, '.') : '点一下设置日期'; }
  },
  methods: { open() { if (!S.editing) this.$parent.editWidget('anniv'); } },
  template: `<div class="widget glassw anniv" @click="open">
    <div class="gw-top">
      <span class="gw-cap">{{future ? 'still counting' : 'days together'}}</span>
      <ico class="gw-ico" name="heart" :size="12" :sw="1.4"/>
    </div>
    <div class="anniv-num" :class="{sm:big>999}">{{big}}</div>
    <div class="anniv-lab" v-if="days!=null">{{future ? '天后 · ' + (cfg.label || '见面') : '天 · ' + (cfg.label || '在一起')}}</div>
    <div class="anniv-lab" v-else>设置一个纪念日</div>
    <div class="anniv-date">{{dateText}}</div>
  </div>`
};

HOME.Level = {
  computed: {
    total() { return (S.stats && S.stats.total) || 0; },
    lv() { return 1 + Math.floor(this.total / 40); },
    pct() { return Math.round(((this.total % 40) / 40) * 100); },
    human() { return this.total >= 1000 ? (this.total / 1000).toFixed(1) + 'k' : this.total; },
    tail() { return this.total < 10 ? '才刚刚开始' : this.total < 200 ? '慢慢熟起来' : '已经聊了很久'; }
  },
  methods: { open() { if (!S.editing) A.toast('熟悉度由聊天条数自动累积'); } },
  template: `<div class="widget glassw lv" @click="open">
    <div class="gw-top">
      <span class="gw-cap">familiarity</span>
      <span class="lv-badge">Lv.{{lv}}</span>
    </div>
    <div class="lv-row">
      <span class="lv-big">{{pct}}<span style="font-size:13px;color:rgba(23,23,27,.4)">%</span></span>
      <span class="lv-pct">{{40 - (total % 40)}} 条后升级</span>
    </div>
    <div class="lv-bar"><i :style="{width:Math.max(3,pct)+'%'}"></i></div>
    <div class="lv-sub"><span>共 {{human}} 条对话</span><span>{{tail}}</span></div>
  </div>`
};

HOME.Calendar = {
  data() { return { off: 0 }; },
  computed: {
    month() { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + this.off); return d; },
    title() { return this.month.getFullYear() + ' 年 · ' + (this.month.getMonth() + 1) + ' 月'; },
    heat() {
      const src = (S.stats && S.stats.days) || {};
      let max = 1;
      for (const k in src) if (src[k] > max) max = src[k];
      return { map: src, max };
    },
    cells() {
      const y = this.month.getFullYear(), mo = this.month.getMonth();
      const first = new Date(y, mo, 1).getDay();
      const days = new Date(y, mo + 1, 0).getDate();
      const today = new Date();
      const isNow = today.getFullYear() === y && today.getMonth() === mo;
      const out = [];
      for (let i = 0; i < first; i++) out.push({ n: 0 });
      for (let i = 1; i <= days; i++) {
        const c = this.heat.map[y + '-' + (mo + 1) + '-' + i] || 0;
        out.push({ n: i, c, today: isNow && today.getDate() === i });
      }
      return out;
    }
  },
  methods: {
    shade(c) {
      if (!c) return {};
      const max = this.heat.max || 1;
      const a = 0.1 + 0.55 * Math.min(1, c / max);
      return { background: 'rgba(92,107,87,' + a.toFixed(2) + ')', color: a > 0.4 ? '#fff' : 'inherit' };
    },
    open() { if (!S.editing) A.toast('颜色越深，那天聊得越多'); }
  },
  template: `<div class="widget glassw cal" @click="open">
    <div class="cal-head">
      <div class="cal-m">{{title}}<span>· {{cells.filter(c=>c.c).length}} 天有对话</span></div>
      <div class="cal-nav">
        <button @click.stop="off--"><ico name="chevronLeft" :size="11" :sw="2"/></button>
        <button @click.stop="off++"><ico name="chevronRight" :size="11" :sw="2"/></button>
      </div>
    </div>
    <div class="cal-grid">
      <div class="cal-w" v-for="w in ['日','一','二','三','四','五','六']" :key="w">{{w}}</div>
      <div class="cal-d" v-for="(d,i) in cells" :key="i" :class="{dim:!d.n,today:d.today}" :style="shade(d.c)">{{d.n||''}}</div>
    </div>
    <div class="cal-foot">颜色越深，那天聊得越多</div>
  </div>`
};

HOME.Clock = {
  data() { return { time: '', date: '', tick: null }; },
  computed: {
    day() { return A.dayNo(); },
    label() { const m = A.mainAnniv(); return m ? m.label : '还没有纪念日'; }
  },
  mounted() { this.paint(); this.tick = setInterval(this.paint, 15000); },
  beforeUnmount() { clearInterval(this.tick); },
  methods: {
    paint() {
      const d = new Date();
      this.time = U.pad(d.getHours()) + ':' + U.pad(d.getMinutes());
      this.date = (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 · 周' + '日一二三四五六'[d.getDay()];
    },
    open() { if (!S.editing) A.go('time'); }
  },
  template: `<div class="widget glassw clockw" @click="open">
    <div class="gw-top">
      <span class="gw-cap">local time</span>
      <ico class="gw-ico" name="clock" :size="12" :sw="1.4"/>
    </div>
    <div class="cw-time">{{time}}</div>
    <div class="cw-date">{{date}}</div>
    <div class="cw-foot"><span>DAY {{day}}</span><span>{{label}}</span></div>
  </div>`
};

HOME.Reading = {
  computed: {
    book() {
      const bs = S.cfg.life.books || [];
      return bs.find((b) => b.status === 'reading') || bs[0] || null;
    },
    pct() { return this.book ? Math.min(100, Math.round((this.book.cur || 0) / Math.max(1, this.book.total || 1) * 100)) : 0; },
    quote() { return this.book && this.book.quotes && this.book.quotes.length ? this.book.quotes[0].text : ''; }
  },
  methods: {
    open() { if (!S.editing) A.go('books'); }
  },
  template: `<div class="widget glassw readw" @click="open">
    <div class="gw-top">
      <span class="gw-cap">reading</span>
      <ico class="gw-ico" name="book" :size="12" :sw="1.4"/>
    </div>
    <template v-if="book">
      <div class="rw-title">{{book.title}}</div>
      <div class="rw-author">{{book.author || '未署名'}}</div>
      <div class="rw-quote" v-if="quote">「{{quote}}」</div>
      <div class="rw-bar"><i :style="{width:Math.max(3,pct)+'%'}"></i></div>
      <div class="rw-foot"><span>第 {{book.cur||0}} / {{book.total}} 页</span><span>{{pct}}%</span></div>
    </template>
    <template v-else>
      <div class="rw-empty"><span>＋</span>放一本书进来</div>
      <div class="rw-foot"><span>书架还是空的</span></div>
    </template>
  </div>`
};

HOME.Diary = {
  computed: {
    last() { return (S.cfg.life.diary || [])[0] || null; },
    day() { return A.dayNo(); },
    dateText() {
      const d = new Date();
      return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
    }
  },
  methods: { open() { if (!S.editing) A.go('time', { tab: 'diary' }); } },
  template: `<div class="widget glassw diaryw" @click="open">
    <div class="gw-top">
      <span class="gw-cap">my diary</span>
      <span class="dw-day">DAY {{day}}</span>
    </div>
    <div class="dw-text" :class="{empty:!last}">{{last ? last.text : '写点什么，留给以后。'}}</div>
    <div class="dw-foot"><span>{{dateText}}</span><span v-if="last">{{last.mood}}</span></div>
  </div>`
};

HOME.Home = {
  components: { 'pc-card': HOME.Postcard, 'pol-card': HOME.Polaroid, 'music-card': HOME.Music, 'dlg-card': HOME.Dialog,
    'anniv-card': HOME.Anniv, 'lv-card': HOME.Level, 'cal-card': HOME.Calendar, 'read-card': HOME.Reading, 'diary-card': HOME.Diary, 'clock-card': HOME.Clock },
  data() {
    return {
      S, editing: false, press: null, drag: null, dragStyle: {}, scrolled: false, scrolling: false,
      sheet: '', postForm: null, tick: null, suppressClick: false, pageTimer: 0, areaH: 0, appsH: 0, rh: {},
      gridRow: 76, gridGap: 10,
      clock: '', dateText: '', _ct: 0
    };
  },
  computed: {
    layout() { return S.cfg.layout; },
    pages() { return this.layout.pages; },
    /* 所有组件合成一条流：按页序 + 页内坐标排，应用图标统一进「全部应用」 */
    widgets() {
      const out = [];
      this.pages.forEach((page) => {
        page.filter((i) => i.kind !== 'app')
          .sort((a, b) => (a.y - b.y) || (a.x - b.x))
          .forEach((i) => out.push(i));
      });
      // 用户拖过顺序就按保存的顺序；否则按「半宽成对、全宽独占」自动排
      const saved = S.cfg.widgetOrder || [];
      if (saved.length) {
        const pos = (id) => { const i = saved.indexOf(id); return i < 0 ? 999 : i; };
        return out.slice().sort((a, b) => pos(a.id) - pos(b.id));
      }
      const ORDER = ['postcard', 'dialog', 'anniv', 'level', 'polaroid', 'music', 'reading', 'calendar', 'diary', 'clock'];
      const rank = (k) => { const i = ORDER.indexOf(k); return i < 0 ? 99 : i; };
      return out.sort((a, b) => rank(a.kind) - rank(b.kind));
    },
    fullWidth() { return ['postcard', 'diary', 'clock', 'calendar']; },
    /* 图标与组件混在同一条流里：拖过就以保存的顺序为准 */
    flow() {
      const apps = this.allApps.map((a) => ({ key: 'app:' + a, type: 'app', appId: a }));
      const ws = this.widgets.map((it) => ({ key: it.id, type: 'w', it }));
      const saved = S.cfg.flowVer === 3 ? (S.cfg.flow || []) : [];
      if (saved.length) {
        const map = new Map();
        [...apps, ...ws].forEach((x) => map.set(x.key, x));
        const out = [];
        saved.forEach((k) => { const x = map.get(k); if (x) { out.push(x); map.delete(k); } });
        map.forEach((x) => out.push(x));
        return out;
      }
      // 默认版式：照 iOS 桌面 —— 全宽横条 + 两枚图标贴着竖卡 + 小卡穿插
      const out = []; let ai = 0;
      const used = {};
      const putApps = (n) => { for (let i = 0; i < n && ai < apps.length; i++) out.push(apps[ai++]); };
      const card = (kind) => { const w = ws.find((x) => x.it.kind === kind && !used[x.key]); if (w) { used[w.key] = 1; out.push(w); } };
      // 第一屏：横条 → 两枚图标 + 竖卡（占三行）→ 两枚图标 → 剩下图标垫底
      card('postcard');
      putApps(2); card('polaroid');
      putApps(4);
      putApps(99);
      // 第二屏：横向音乐卡是主角，日历与小对话、纪念日贴边混排
      card('music'); card('calendar'); card('dialog'); card('anniv');
      ['level', 'reading', 'diary', 'clock'].forEach(card);
      ws.forEach((w) => { if (!used[w.key]) out.push(w); });
      return out;
    },
    /* 4 列网格装箱：图标 1×1，组件 2×2 / 2×3 / 4×2，按格位找空 */
    homePages() {
      const H = Math.max(260, this.areaH || 560);
      const cols = GRID.cols, row = this.gridRow, gap = this.gridGap;
      const occ = [];
      const fits = (r, c, w, h) => {
        for (let i = 0; i < h; i++) {
          for (let j = 0; j < w; j++) if (occ[r + i] && occ[r + i][c + j]) return false;
        }
        return true;
      };
      const take = (r, c, w, h) => {
        for (let i = 0; i < h; i++) { occ[r + i] = occ[r + i] || []; for (let j = 0; j < w; j++) occ[r + i][c + j] = 1; }
      };

      const placed = [];
      let r = 0, c = 0;
      this.flow.forEach((x) => {
        const [w, h] = x.type === 'app' ? [1, 1] : (WSIZE[x.it.kind] || [2, 2]);
        let guard = 0;
        while (guard++ < 400) {
          if (c + w > cols) { r++; c = 0; continue; }
          if (fits(r, c, w, h)) break;
          c++;
        }
        take(r, c, w, h);
        placed.push(Object.assign({}, x, { r: r, c: c, w: w, h: h }));
        c += w;
      });

      // 一页最多几行
      const per = Math.max(2, Math.floor((H + gap) / (row + gap)));
      const pages = [];
      let i = 0;
      while (i < placed.length) {
        const base = placed[i].r;
        const cells = [];
        while (i < placed.length && placed[i].r + placed[i].h - base <= per) { cells.push(placed[i]); i++; }
        if (!cells.length) { cells.push(placed[i]); i++; }
        const rel = cells.map((p) => Object.assign({}, p, { r: p.r - base }));
        const rows = rel.reduce((m, p) => Math.max(m, p.r + p.h), 0);
        pages.push({ cells: rel, rows: rows });
      }
      if (!pages.length) pages.push({ cells: [], rows: 0 });
      return pages;
    },
    allApps() {
      const rm = S.cfg.removedApps || [];
      const all = Object.keys(APPS || {});
      const order = ['chat', 'us', 'book', 'memory', 'archive', 'music', 'books', 'time', 'store', 'notices', 'beauty', 'settings'];
      const sorted = order.filter((a) => all.includes(a)).concat(all.filter((a) => !order.includes(a)));
      const dk = this.dock || [];
      // 一个功能只留一个入口：已经停在 dock 上的，不再重复出现在应用格里
      return sorted.filter((a) => !rm.includes(a) && !dk.includes(a));
    },
    dock() { return this.layout.dock; },
    home() { return S.cfg.home; },
    dayNo() { return A.dayNo(); },
    annivLabel() { const m = A.mainAnniv(); return (m && m.label) || '陪伴'; },
    wallStyle() {
      const k = S.cfg.ui.wallpaperKey;
      if (k && S.imgCache[k]) return { backgroundImage: 'url(' + S.imgCache[k] + ')' };
      const p = (typeof WALLS !== 'undefined' && WALLS[S.cfg.ui.wallpaperPreset || 0]) || null;
      return p ? { backgroundImage: p.css } : {};
    },
    hasWall() {
      if (S.cfg.ui.wallpaperKey && S.imgCache[S.cfg.ui.wallpaperKey]) return true;
      const p = typeof WALLS !== 'undefined' && WALLS[S.cfg.ui.wallpaperPreset || 0];
      return !!(p && p.img);
    }
  },
  watch: {
    'S.cfg.ui.wallpaperKey': { immediate: true, handler(k) { if (k) A.resolveImg(k); } },
    editing(v) { S.editing = v; if (!v) this.$nextTick(this.measure); }
  },
  mounted() {
    this.tickClock();
    this._ct = setInterval(this.tickClock, 15000);
    this.$nextTick(this.measure);
    this._mt = setTimeout(this.measure, 260);
    window.addEventListener('resize', this.measure);
  },
  updated() { if (!this._mu) { this._mu = 1; this.$nextTick(this.measure); setTimeout(() => { this._mu = 0; }, 300); } },
  beforeUnmount() {
    clearInterval(this._ct); clearTimeout(this._mt);
    window.removeEventListener('resize', this.measure);
  },
  methods: {
    tickClock() {
      const d = new Date();
      this.clock = U.pad(d.getHours()) + ':' + U.pad(d.getMinutes());
      this.dateText = (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 · 周' + '日一二三四五六'[d.getDay()];
    },
    meta(id) { return window.appMeta(id); },
    gridStyle(cell) {
      const g = this.gridGap, row = this.gridRow;
      return {
        left: 'calc(' + cell.c + ' * (100% + ' + g + 'px) / 4)',
        width: 'calc(' + cell.w + ' * (100% - ' + (3 * g) + 'px) / 4 + ' + ((cell.w - 1) * g) + 'px)',
        top: (cell.r * (row + g)) + 'px',
        height: 'calc(' + cell.h + ' * ' + row + 'px + ' + ((cell.h - 1) * g) + 'px)'
      };
    },
    pageH(pg) { return Math.max(0, pg.rows * (this.gridRow + this.gridGap) - this.gridGap); },
    dragStyleFor(id, appId) {
      if (!this.drag) return {};
      const same = id ? this.drag.id === id : this.drag.appId === appId;
      return same ? { transform: 'translate(' + this.drag.dx + 'px,' + this.drag.dy + 'px) scale(1.06)', zIndex: 90, position: 'relative' } : {};
    },
    onScroll() {
      const el = this.$refs.pages;
      if (!el) return;
      const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
      if (i !== S.homePage) S.homePage = i;
      if (!this.scrolling) this.scrolling = true;
      clearTimeout(this._st);
      this._st = setTimeout(() => { this.scrolling = false; }, 130);
    },
    measure() {
      if (this.editing) return;
      const el = this.$refs.pages;
      if (el) {
        /* 可用高度 = 页容器顶到底栏顶，别把 dock 也算进去 */
        const dock = document.querySelector('.dock');
        const dots = document.querySelector('.dots-nav');
        let h = el.clientHeight;
        /* pages 是 flex:1，底栏高度已经被扣过，这里只留一点透气的余量 */
        h -= 6;
        if (h > 60 && Math.abs(h - this.areaH) > 2) this.areaH = h;
        const w = window.innerWidth || 390;
        const row = window.innerHeight < 780 ? 68 : (w < 380 ? 72 : 78), gap = w < 380 ? 9 : 10;
        if (row !== this.gridRow) { this.gridRow = row; this.gridGap = gap; }
      }
      const a = document.querySelector('.home-apps');
      if (a) {
        const h = a.offsetHeight;
        if (h > 20 && Math.abs(h - this.appsH) > 2) this.appsH = h;
      }
      /* 用真实渲染高度校准分页：估算是粗的，卡片自己的高度才准 */
      if (Date.now() - (this._rhT || 0) > 2500) { this._rhPass = 0; this._rhT = Date.now(); }
      if ((this._rhPass || 0) < 4) {
        const next = {};
        document.querySelectorAll('.hp .cell[data-kind]').forEach((c) => {
          const k = c.dataset.kind, h = c.offsetHeight;
          if (h > 40) next[k] = Math.max(next[k] || 0, h);
        });
        let changed = false;
        Object.keys(next).forEach((k) => {
          if (!this.rh[k] || Math.abs(this.rh[k] - next[k]) > 3) { this.rh[k] = next[k]; changed = true; }
        });
        if (changed) { this._rhPass = (this._rhPass || 0) + 1; this.$forceUpdate(); }
        else this._rhPass = 0;
      }
    },
    delWidget(it) {
      this.pages.forEach((p) => { const i = p.findIndex((x) => x.id === it.id); if (i >= 0) p.splice(i, 1); });
      S.layoutKey++;
      saveCfg();
    },
    gotoPage(i) {
      const el = this.$refs.pages;
      el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
    },
    /* ---------- press / long press / drag ---------- */
    downGrid(e, cell, pi) {
      if (e.button && e.button !== 0) return;
      this.beginPress(e, { from: 'grid', it: cell.it, key: cell.key, pi });
    },
    downDock(e, appId, index) {
      if (e.button && e.button !== 0) return;
      this.beginPress(e, { from: 'dock', appId, index });
    },
    beginPress(e, ctx) {
      this.suppressClick = false;
      const p = Object.assign({ sx: e.clientX, sy: e.clientY, moved: false, long: false }, ctx);
      p.timer = setTimeout(() => {
        p.long = true;
        this.editing = true;
        this.suppressClick = true;
        if (navigator.vibrate) navigator.vibrate(8);
      }, 460);
      this.press = p;
      window.addEventListener('pointermove', this.move);
      window.addEventListener('pointerup', this.up, { once: true });
      window.addEventListener('pointercancel', this.up, { once: true });
    },
    move(e) {
      const p = this.press;
      if (!p) return;
      const dx = e.clientX - p.sx, dy = e.clientY - p.sy;
      const dist = Math.hypot(dx, dy);
      if (dist > 10) {
        p.moved = true;
        clearTimeout(p.timer);
      }
      if (!this.drag && p.moved && (this.editing || p.long) && dist > 10) {
        this.drag = Object.assign({ dx: 0, dy: 0 }, { id: p.key || (p.it && p.it.id) });
      }
      if (this.drag) {
        this.drag.dx = dx; this.drag.dy = dy;
      }
    },
    up(e) {
      window.removeEventListener('pointermove', this.move);
      const p = this.press;
      this.press = null;
      if (p) clearTimeout(p.timer);
      if (this.drag) {
        this.drop(e.clientX, e.clientY);
        this.drag = null;
        saveCfg();
      }
      setTimeout(() => { this.press = null; }, 0);
    },
    drop(x, y) {
      const d = this.drag;
      if (!d || !d.id) { this.resetDrag(); return; }
      const pages = document.querySelectorAll('.hp');
      const pageEl = pages[Math.min(S.homePage || 0, pages.length - 1)];
      const cells = pageEl ? Array.from(pageEl.querySelectorAll('.cell')) : [];
      if (!cells.length) { this.resetDrag(); return; }
      // 只在本页内找落点，避免拖到别的页去
      let bestKey = null, best = 1e9;
      cells.forEach((c) => {
        const r = c.getBoundingClientRect();
        const dist = Math.abs(y - (r.top + r.height / 2)) + Math.abs(x - (r.left + r.width / 2)) * 0.3;
        if (dist < best) { best = dist; bestKey = c.dataset.id; }
      });
      const ids = this.flow.map((i) => i.key);
      const from = ids.indexOf(d.id), to = ids.indexOf(bestKey);
      if (from < 0 || to < 0 || from === to) { this.resetDrag(); return; }
      const [moved] = ids.splice(from, 1);
      ids.splice(to, 0, moved);
      S.cfg.flow = ids; S.cfg.flowVer = 3;
      S.layoutKey++;
      saveCfg();
      this.resetDrag();
    },
    resetDrag() { this.drag = null; },
    /* ---------- app / widget actions ---------- */
    openApp(id) { if (this.editing) return; A.openApp(id); },
    onAppClick(item) {
      if (this.suppressClick || this.editing) return;
      A.openApp(item.app);
    },
    delApp(item, pi) {
      const page = this.pages[pi];
      const i = page.indexOf(item);
      if (i >= 0) page.splice(i, 1);
      S.cfg.removedApps = Array.from(new Set([...(S.cfg.removedApps || []), item.app]));
      S.layoutKey++;
      saveCfg();
      A.toast(APPS[item.app].name + ' 已移除，可在商店重新下载');
    },
    editWidget(kind) {
      this.sheet = kind;
    },
    pickFile(cb) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        if (!input.files || !input.files[0]) return;
        await cb(input.files[0]);
      };
      input.click();
    },
    async setHomeImage(field, file) {
      const old = this.home[field];
      const key = await A.replaceImage(old, file);
      this.home[field] = key;
      await saveCfg(true);
      A.toast('已更新');
    },
    async setDialogAv(file) {
      const key = await A.replaceImage(this.home.dialogAvKey, file);
      this.home.dialogAvKey = key;
      await saveCfg(true);
    },
    async setPostBg(file) {
      await this.setHomeImage('bgKey', file);
    },
    async setAvatar(file) {
      await this.setHomeImage('avatarKey', file);
    },
    removePostBg() {
      if (this.home.bgKey) { DB.delFile(this.home.bgKey); delete S.imgCache[this.home.bgKey]; }
      this.home.bgKey = '';
      saveCfg();
    },
    save() { saveCfg(); },
    saveSheet() {
      saveCfg(true);
      if (this.sheet === 'anniv') A.syncAnnivFromHome();
      this.sheet = '';
    },
    resetPage() {
      if (!confirm('恢复默认桌面布局？自定义位置会丢失。')) return;
      S.cfg.layout = { pages: [JSON.parse(JSON.stringify(HOME.defaultPage())), JSON.parse(JSON.stringify(HOME.defaultPage2()))], dock: ['store', 'notices', 'beauty', 'settings'] };
      S.cfg.widgetOrder = []; S.cfg.flow = []; S.cfg.flowVer = 3;
      S.layoutKey++;
      saveCfg();
    }
  },
  template: `<div class="home" :class="{editing, wallimg:hasWall, scrolled, scrolling}" id="home-stage">
    <div class="wallpaper" :class="{tint:!hasWall,noise:!hasWall}" :style="wallStyle"></div>
    <div class="home-scrim"></div>

    <div class="edit-bar" v-if="editing">
      <div></div>
      <div class="f g6">
        <button class="chip" style="background:rgba(255,255,255,.86);backdrop-filter:blur(12px);box-shadow:0 2px 8px rgba(23,23,27,.08)" @click="resetPage">恢复默认</button>
        <button class="btn sm primary" @click="editing=false;S.editing=false">完成</button>
      </div>
    </div>

    <div class="home-inner">
      <div class="home-clock" :class="{ghost:editing}">
        <div class="hc-l">
          <div class="hc-time">{{clock}}</div>
          <div class="hc-date">{{dateText}}</div>
        </div>
        <div class="hc-r">
          <div class="hc-cap">{{annivLabel}}</div>
          <div class="hc-n">{{dayNo}}</div>
        </div>
      </div>
      <div class="pages" ref="pages" @scroll.passive="onScroll">
        <div class="hp" v-for="(pg,pi) in homePages" :key="'hp'+pi" :data-page="pi">
          <div class="page-grid" :style="{height:pageH(pg)+'px','--cell-r':gridRow+'px','--cell-gap':gridGap+'px'}">
            <div v-for="cell in pg.cells" :key="cell.key" :data-id="cell.key" :data-kind="cell.type==='w'?cell.it.kind:'app'"
                 :class="['cell', cell.type==='app'?'c-app':'c-w', drag&&drag.id===cell.key?'dragging':'', drag&&drag.id&&drag.id!==cell.key?'dim':'']"
                 :style="[gridStyle(cell), dragStyleFor(cell.key)]"
                 @pointerdown="downGrid($event,cell,pi)">
              <button v-if="cell.type==='app'" class="app" @click.stop="openApp(cell.appId)">
                <span class="app-icon" :style="{'--tint':meta(cell.appId).tint}"><ico :name="meta(cell.appId).icon" :size="24" :sw="1.5"/></span>
                <span class="app-label">{{meta(cell.appId).name}}</span>
              </button>
              <template v-else>
                <template v-if="cell.it.kind==='postcard'"><pc-card :item="cell.it"/></template>
                <template v-else-if="cell.it.kind==='polaroid'"><pol-card :item="cell.it"/></template>
                <template v-else-if="cell.it.kind==='music'"><music-card :item="cell.it"/></template>
                <template v-else-if="cell.it.kind==='dialog'"><dlg-card :item="cell.it"/></template>
                <template v-else-if="cell.it.kind==='anniv'"><anniv-card :item="cell.it"/></template>
                <template v-else-if="cell.it.kind==='level'"><lv-card :item="cell.it"/></template>
                <template v-else-if="cell.it.kind==='calendar'"><cal-card :item="cell.it"/></template>
                <template v-else-if="cell.it.kind==='reading'"><read-card :item="cell.it"/></template>
                <template v-else-if="cell.it.kind==='diary'"><diary-card :item="cell.it"/></template>
                <template v-else-if="cell.it.kind==='clock'"><clock-card :item="cell.it"/></template>
                <button v-if="editing" class="del-badge" @click.stop="delWidget(cell.it)"><ico name="x" :size="10" :sw="2.6"/></button>
                <div v-if="editing" class="widget-edit"></div>
              </template>
            </div>
          </div>
        </div>
      </div>
      <div class="home-foot">
        <div class="dots-nav">
          <i v-for="(p,i) in homePages" :key="i" :class="{on:S.homePage===i}" @click="gotoPage(i)"></i>
        </div>
        <div class="dock" ref="dock">
          <div v-for="(appId,i) in dock" :key="appId" class="dock-slot" :style="dragStyleFor(null,appId)"
               @pointerdown="downDock($event,appId,i)">
            <button class="app" @click.stop="editing?null:A.openApp(appId)">
              <span class="app-icon" :style="{'--tint':meta(appId).tint}"><ico :name="meta(appId).icon" :size="24" :sw="1.5"/></span>
              <span class="app-label">{{meta(appId).name}}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="home-hint" v-if="false">长按图标编辑桌面</div>

    <!-- widget editors -->
    <sheet v-if="sheet" v-model="sheet" :title="sheet==='postcard'?'明信片':sheet==='music'?'音乐盒':sheet==='dialog'?'小对话':sheet==='anniv'?'纪念日':'拍立得'" :sub="sheet==='postcard'?'这一张卡片只属于你。':sheet==='anniv'?'写下一个日期，剩下的交给它。':'组件的细节都可以慢慢改。'">
      <div v-if="sheet==='postcard'" class="form-stack">
        <div class="avatar-upload">
          <div class="au-ring"><av :file-key="home.avatarKey" :name="home.name" :size="56"/></div>
          <div class="col g6">
            <button class="btn sm" @click="pickFile(setAvatar)">更换头像</button>
            <span class="helper">图片会压缩后存入本地数据库</span>
          </div>
        </div>
        <div class="field"><label>昵称</label><input class="input" v-model="home.name" maxlength="12"></div>
        <div class="field"><label>签名</label><input class="input" v-model="home.sign" maxlength="30"></div>
        <div class="field"><label>卡片背景</label>
          <div class="f g8">
            <div class="bg-pick grow" :style="home.bgKey&&S.imgCache[home.bgKey]?{backgroundImage:'url('+S.imgCache[home.bgKey]+')',borderStyle:'solid'}:{}" @click="pickFile(setPostBg)">
              <ico v-if="!home.bgKey" name="image" :size="18"/><span v-if="!home.bgKey">上传背景</span>
            </div>
            <button v-if="home.bgKey" class="btn sm ghost" @click="removePostBg">移除</button>
          </div>
        </div>
        <div class="field"><label>底色</label>
          <div class="f g8">
            <button v-for="c in ['#EFEBE3','#E8E6E1','#E4E8E2','#EDE4DF','#E3E6EC']" :key="c" @click="home.base=c;save()"
              :style="{width:'30px',height:'30px',borderRadius:'9px',background:c,border:home.base===c?'2px solid #17171B':'1px solid rgba(0,0,0,.08)'}"></button>
          </div>
        </div>
      </div>

      <div v-else-if="sheet==='polaroid'" class="form-stack">
        <div class="bg-pick" style="height:160px" :style="home.polaroidKey&&S.imgCache[home.polaroidKey]?{backgroundImage:'url('+S.imgCache[home.polaroidKey]+')',backgroundSize:'cover'}:{}" @click="pickFile(f=>setHomeImage('polaroidKey',f))">
          <ico v-if="!home.polaroidKey" name="camera" :size="22"/><span v-if="!home.polaroidKey">点击上传照片</span>
        </div>
        <div class="field"><label>照片落款</label><input class="input" v-model="home.polaroidCap" maxlength="20" placeholder="slow morning"></div>
      </div>

      <div v-else-if="sheet==='anniv'" class="form-stack">
        <div class="field"><label>那一天</label><input class="input" type="date" v-model="home.anniv.date"></div>
        <div class="field"><label>这件事叫什么</label><input class="input" v-model="home.anniv.label" maxlength="10" placeholder="在一起 / 第一次见面"></div>
        <div class="helper">纪念日会显示在桌面卡片上，跨过零点自动加一天。</div>
      </div>
      <div v-else-if="sheet==='music'" class="form-stack">
        <div class="field"><label>歌曲名</label><input class="input" v-model="home.music.title" maxlength="24"></div>
        <div class="field"><label>歌手 / 来源</label><input class="input" v-model="home.music.artist" maxlength="24" placeholder="LIWU RADIO"></div>
        <div class="field"><label>时长（秒）</label><input class="input" type="number" min="30" max="600" v-model.number="home.music.dur"></div>
      </div>

      <div v-else class="form-stack">
        <div class="field"><label>对方气泡</label><textarea class="textarea" v-model="home.dialog[0].text" maxlength="40"></textarea></div>
        <div class="field"><label>我的气泡</label><textarea class="textarea" v-model="home.dialog[1].text" maxlength="40"></textarea></div>
        <div class="field"><label>对方头像</label>
          <button class="btn sm" @click="pickFile(setDialogAv)">上传圆头像</button>
        </div>
      </div>

      <template #footer>
        <button v-if="sheet==='music'" class="btn grow" @click="sheet='';A.go('music')"><ico name="music" :size="15"/>播放器</button>
        <button class="btn primary grow" @click="saveSheet">保存</button>
      </template>
    </sheet>
  </div>`
};

HOME.defaultPage2 = function () {
  return [
    { id: 'w_anniv', x: 0, y: 0, w: 2, h: 2, kind: 'anniv' },
    { id: 'w_level', x: 2, y: 0, w: 2, h: 2, kind: 'level' },
    { id: 'w_cal', x: 0, y: 2, w: 4, h: 2, kind: 'calendar' },
    { id: 'w_read', x: 0, y: 4, w: 2, h: 2, kind: 'reading' },
    { id: 'w_diary', x: 2, y: 4, w: 2, h: 2, kind: 'diary' },
    { id: 'w_clock', x: 0, y: 6, w: 2, h: 2, kind: 'clock' }
  ];
};

HOME.defaultPage = function () {
  return [
    { id: 'w_postcard', x: 0, y: 0, w: 4, h: 2, kind: 'postcard' },
    { id: 'w_polaroid', x: 0, y: 2, w: 2, h: 2, kind: 'polaroid' },
    { id: 'app_chat', x: 2, y: 2, w: 1, h: 1, kind: 'app', app: 'chat' },
    { id: 'app_book', x: 3, y: 2, w: 1, h: 1, kind: 'app', app: 'book' },
    { id: 'app_memory', x: 2, y: 3, w: 1, h: 1, kind: 'app', app: 'memory' },
    { id: 'app_archive', x: 3, y: 3, w: 1, h: 1, kind: 'app', app: 'archive' },
    { id: 'w_dialog', x: 0, y: 4, w: 2, h: 2, kind: 'dialog' },
    { id: 'w_music', x: 2, y: 4, w: 2, h: 2, kind: 'music' }
  ];
};
