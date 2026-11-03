/* ============================================================
   Home screen — grid, widgets, edit / drag / delete
   ============================================================ */
const HOME = {};

HOME.Postcard = {
  props: { item: Object },
  computed: {
    h() { return S.cfg.home; },
    dateText() { const d = new Date(); return (d.getMonth() + 1) + ' / ' + d.getDate(); }
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
      <div class="pc-av-wrap"><av :file-key="h.avatarKey" :name="h.name" :size="56" radius="20px"/></div>
      <div class="pc-text">
        <div class="pc-name">{{h.name}}</div>
        <div class="pc-sign">{{h.sign}}</div>
      </div>
    </div>
    <div class="pc-foot"><span>DAY {{A.dayNo()}}</span><span>{{A.mainAnniv() ? A.mainAnniv().label : '还没有纪念日'}}</span></div>
  </div>`
};

HOME.Polaroid = {
  computed: { h() { return S.cfg.home; } },
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
        <img v-if="url" :src="url" style="width:100%;height:100%;object-fit:cover;display:block">
        <ico v-else name="image" :size="22" :sw="1.3"/>
      </div>
      <div class="pol-cap">{{h.polaroidCap || 'no caption'}}</div>
    </div>
  </div>`
};

HOME.Music = {
  data() { return { wave: [6, 11, 17, 9, 22, 14, 7, 19, 25, 12, 8, 16, 21, 10, 6, 14, 23, 17, 9, 13, 6] }; },
  computed: {
    m() { return S.cfg.home.music; },
    pct() { return Math.min(100, (this.m.played / this.m.dur) * 100); },
    now() { return this.fmt(this.m.played); },
    total() { return this.fmt(this.m.dur); }
  },
  methods: {
    fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + U.pad(s % 60); },
    toggle(e) { e.stopPropagation(); S.musicPlaying = !S.musicPlaying; },
    open() { if (!S.editing) this.$parent.editWidget('music'); }
  },
  template: `<div class="widget music" @click="open">
    <div class="music-top">
      <div class="music-art" :class="{playing:S.musicPlaying}"></div>
      <div class="music-meta">
        <div class="music-name">{{m.title || '未命名曲目'}}</div>
        <div class="music-artist">{{m.artist || 'LIWU RADIO'}}</div>
      </div>
    </div>
    <div class="music-wave" :class="{playing:S.musicPlaying}">
      <i v-for="(h,i) in wave" :key="i" :style="{height:h+'px',animationDelay:(i*0.07)+'s'}"></i>
    </div>
    <div class="music-bot">
      <button class="music-play" @click="toggle"><ico :name="S.musicPlaying?'pause':'play'" :size="12"/></button>
      <div class="music-track">
        <div class="music-bar"><i :style="{width:pct+'%'}"></i></div>
        <div class="music-time"><span>{{now}}</span><span>{{total}}</span></div>
      </div>
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
      sheet: '', postForm: null, tick: null, suppressClick: false, pageTimer: 0,
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
      const ORDER = ['postcard', 'polaroid', 'dialog', 'music', 'anniv', 'level', 'reading', 'calendar', 'diary', 'clock'];
      const rank = (k) => { const i = ORDER.indexOf(k); return i < 0 ? 99 : i; };
      return out.sort((a, b) => rank(a.kind) - rank(b.kind));
    },
    fullWidth() { return ['postcard', 'diary', 'clock', 'calendar']; },
    allApps() {
      const rm = S.cfg.removedApps || [];
      const all = Object.keys(APPS || {});
      const order = ['chat', 'us', 'book', 'memory', 'archive', 'music', 'books', 'time', 'store', 'notices', 'beauty', 'settings'];
      const sorted = order.filter((a) => all.includes(a)).concat(all.filter((a) => !order.includes(a)));
      return sorted.filter((a) => !rm.includes(a));
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
    editing(v) { S.editing = v; }
  },
  mounted() { this.tickClock(); this._ct = setInterval(this.tickClock, 15000); },
  beforeUnmount() { clearInterval(this._ct); },
  methods: {
    tickClock() {
      const d = new Date();
      this.clock = U.pad(d.getHours()) + ':' + U.pad(d.getMinutes());
      this.dateText = (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 · 周' + '日一二三四五六'[d.getDay()];
    },
    meta(id) { return window.appMeta(id); },
    cellStyle(it) {
      const full = this.fullWidth.indexOf(it.kind) >= 0 || it.w >= 3;
      return { gridColumn: 'span ' + (full ? 2 : 1) };
    },
    dragStyleFor(id, appId) {
      if (!this.drag) return {};
      const same = id ? this.drag.id === id : this.drag.appId === appId;
      return same ? { transform: 'translate(' + this.drag.dx + 'px,' + this.drag.dy + 'px) scale(1.06)', zIndex: 90, position: 'relative' } : {};
    },
    onScroll() {
      const el = this.$refs.pages;
      if (!el) return;
      const sc = el.scrollTop > 14;
      if (sc !== this.scrolled) this.scrolled = sc;
      // 滚动期间关掉毛玻璃，停下 130ms 后恢复
      if (!this.scrolling) this.scrolling = true;
      clearTimeout(this._st);
      this._st = setTimeout(() => { this.scrolling = false; }, 130);
      S.homePage = 0;
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
    downGrid(e, it, pi) {
      if (e.button && e.button !== 0) return;
      this.beginPress(e, { from: 'grid', it, pi });
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
      if (dist > 7) {
        p.moved = true;
        clearTimeout(p.timer);
      }
      if (!this.drag && p.moved && (this.editing || p.long) && dist > 7) {
        this.drag = Object.assign({ dx: 0, dy: 0 }, p.it ? { id: p.it.id } : { appId: p.appId });
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
      const cells = Array.from(document.querySelectorAll('.page-grid .cell'));
      const list = this.widgets;
      const from = list.findIndex((i) => i.id === d.id);
      if (from < 0 || !cells.length) { this.resetDrag(); return; }
      // 落点最近的格子
      let to = from, best = 1e9;
      cells.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const dist = Math.abs(y - (r.top + r.height / 2)) + Math.abs(x - (r.left + r.width / 2)) * 0.35;
        if (dist < best) { best = dist; to = i; }
      });
      if (to === from) { this.resetDrag(); return; }
      const ids = list.map((i) => i.id);
      const [moved] = ids.splice(from, 1);
      ids.splice(to, 0, moved);
      S.cfg.widgetOrder = ids;
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
      S.cfg.layout = { pages: [JSON.parse(JSON.stringify(HOME.defaultPage())), []], dock: ['store', 'notices', 'beauty', 'settings'] };
      S.cfg.widgetOrder = [];
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
      <div class="home-clock" v-if="!editing">
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

        <section class="home-apps">
          <div class="ha-head"><span class="ha-t">全部应用</span><span class="ha-n">{{allApps.length}}</span></div>
          <div class="ha-grid">
            <button v-for="a in allApps" :key="a" class="app" @click.stop="openApp(a)">
              <span class="app-icon" :style="{'--tint':meta(a).tint}"><ico :name="meta(a).icon" :size="25" :sw="1.5"/></span>
              <span class="app-label">{{meta(a).name}}</span>
            </button>
          </div>
        </section>

        <div class="ha-head ha-sub"><span class="ha-t">今天</span></div>
        <div class="page-grid">
          <div v-for="it in widgets" :key="it.id" :class="['cell', fullWidth.indexOf(it.kind)>=0||it.w>=3?'wide':'', drag&&drag.id===it.id?'dragging':'', drag&&drag.id!==it.id?'dim':'' ]"
               :style="[cellStyle(it), dragStyleFor(it.id)]"
               @pointerdown="downGrid($event,it,0)">
            <template v-if="it.kind==='postcard'"><pc-card :item="it"/></template>
            <template v-else-if="it.kind==='polaroid'"><pol-card :item="it"/></template>
            <template v-else-if="it.kind==='music'"><music-card :item="it"/></template>
            <template v-else-if="it.kind==='dialog'"><dlg-card :item="it"/></template>
            <template v-else-if="it.kind==='anniv'"><anniv-card :item="it"/></template>
            <template v-else-if="it.kind==='level'"><lv-card :item="it"/></template>
            <template v-else-if="it.kind==='calendar'"><cal-card :item="it"/></template>
            <template v-else-if="it.kind==='reading'"><read-card :item="it"/></template>
            <template v-else-if="it.kind==='diary'"><diary-card :item="it"/></template>
            <template v-else-if="it.kind==='clock'"><clock-card :item="it"/></template>
            <button v-if="editing" class="del-badge" @click.stop="delWidget(it)"><ico name="x" :size="10" :sw="2.6"/></button>
            <div v-if="editing" class="widget-edit"></div>
          </div>
        </div>

      </div>

      <div class="home-foot">
        <div class="dots-nav">
          <i v-for="(p,i) in pages" :key="i" :class="{on:S.homePage===i}"></i>
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
    { id: 'w_diary', x: 2, y: 4, w: 2, h: 2, kind: 'diary' }
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
