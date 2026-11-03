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
  template: `<div class="widget pc" :style="{'--pc-base':h.base||'#EFEBE3'}" @click="open">
    <div class="pc-bg" :class="{empty:!url}" :style="url?{backgroundImage:'url('+url+')'}:{}"></div>
    <div class="pc-grain"></div>
    <div class="pc-fade"></div>
    <div class="pc-date">{{dateText}}</div>
    <div class="pc-mark">L I W U</div>
    <div class="pc-inner">
      <div class="pc-av-wrap"><av :file-key="h.avatarKey" :name="h.name" :size="66"/></div>
      <div class="pc-name">{{h.name}}</div>
      <div class="pc-sign">{{h.sign}}</div>
    </div>
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

HOME.Home = {
  components: { 'pc-card': HOME.Postcard, 'pol-card': HOME.Polaroid, 'music-card': HOME.Music, 'dlg-card': HOME.Dialog },
  data() {
    return {
      S, editing: false, press: null, drag: null, dragStyle: {},
      sheet: '', postForm: null, tick: null, suppressClick: false, pageTimer: 0
    };
  },
  computed: {
    layout() { return S.cfg.layout; },
    pages() { return this.layout.pages; },
    dock() { return this.layout.dock; },
    home() { return S.cfg.home; },
    wallStyle() {
      const k = S.cfg.ui.wallpaperKey;
      if (k && S.imgCache[k]) return { backgroundImage: 'url(' + S.imgCache[k] + ')' };
      const p = (window.WALLS && WALLS[S.cfg.ui.wallpaperPreset || 0]) || null;
      return p ? { backgroundImage: p.css } : {};
    },
    hasWall() { return !!(S.cfg.ui.wallpaperKey && S.imgCache[S.cfg.ui.wallpaperKey]); }
  },
  watch: {
    'S.cfg.ui.wallpaperKey': { immediate: true, handler(k) { if (k) A.resolveImg(k); } },
    editing(v) { S.editing = v; }
  },
  mounted() {
    this.tick = setInterval(() => {
      if (!S.musicPlaying) return;
      const m = S.cfg.home.music;
      m.played += 1;
      if (m.played >= m.dur) { m.played = 0; S.musicPlaying = false; }
    }, 1000);
  },
  beforeUnmount() { clearInterval(this.tick); },
  methods: {
    meta(id) { return window.appMeta(id); },
    cellStyle(it) {
      return {
        gridColumn: (it.x + 1) + ' / span ' + it.w,
        gridRow: (it.y + 1) + ' / span ' + it.h
      };
    },
    dragStyleFor(id, appId) {
      if (!this.drag) return {};
      const same = id ? this.drag.id === id : this.drag.appId === appId;
      return same ? { transform: 'translate(' + this.drag.dx + 'px,' + this.drag.dy + 'px) scale(1.06)', zIndex: 90, position: 'relative' } : {};
    },
    onScroll() {
      const el = this.$refs.pages;
      S.homePage = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
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
      if (!this.drag && p.moved && this.editing && dist > 7) {
        this.drag = Object.assign({ dx: 0, dy: 0 }, p.it ? { id: p.it.id } : { appId: p.appId });
      }
      if (this.drag) {
        this.drag.dx = dx; this.drag.dy = dy;
        this.edgeFlip(e.clientX);
      }
    },
    edgeFlip(x) {
      const scr = document.querySelector('.screen').getBoundingClientRect();
      const now = Date.now();
      if (now - this.pageTimer < 620) return;
      if (x < scr.left + 34 && S.homePage > 0) { S.homePage--; this.gotoPage(S.homePage); this.pageTimer = now; this.drag.dx += scr.width * 0.5; }
      else if (x > scr.right - 34 && S.homePage < this.pages.length - 1) { S.homePage++; this.gotoPage(S.homePage); this.pageTimer = now; this.drag.dx -= scr.width * 0.5; }
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
      const el = document.elementFromPoint(x, y);
      const grid = el && el.closest ? el.closest('.page-grid') : null;
      const dockEl = el && el.closest ? el.closest('.dock') : null;
      const p = this.press;

      if (dockEl) {
        if (d.appId) return; // already in dock
        const page = this.pages[d.page];
        const idx = page.findIndex((i) => i.id === d.id);
        if (idx < 0) return;
        const item = page[idx];
        if (item.kind !== 'app') { this.resetDrag(); return; }
        page.splice(idx, 1);
        if (!S.cfg.layout.dock.includes(item.app)) S.cfg.layout.dock.push(item.app);
        this.layoutKey = Date.now();
        S.layoutKey++;
        return;
      }

      if (!grid) { this.resetDrag(); return; }
      const rect = grid.getBoundingClientRect();
      const pi = Number(grid.dataset.page);
      const gap = 12, rowH = 94, padTop = 6;
      const cellW = (rect.width - gap * 3) / 4;
      let col = Math.floor((x - rect.left) / (cellW + gap));
      let row = Math.floor((y - rect.top - padTop) / (rowH + gap));
      const target = d.it || (p && p.it);
      const w = target ? target.w : 1, h = target ? target.h : 1;
      col = Math.max(0, Math.min(4 - w, col));
      row = Math.max(0, Math.min(6 - h, row));

      if (d.appId) {
        // dock -> grid
        const appId = d.appId;
        S.cfg.layout.dock = S.cfg.layout.dock.filter((a) => a !== appId);
        const item = { id: U.uid('app'), x: col, y: row, w: 1, h: 1, kind: 'app', app: appId };
        this.placeWithCollision(pi, item, null);
        S.cfg.removedApps = (S.cfg.removedApps || []).filter((a) => a !== appId);
        return;
      }
      if (!target) return;
      if (d.page === pi) {
        this.placeWithCollision(pi, target, target.x + ',' + target.y);
      } else {
        const oldPage = this.pages[d.page];
        oldPage.splice(oldPage.indexOf(target), 1);
        this.placeWithCollision(pi, target, null);
      }
    },
    placeWithCollision(pi, item, oldPos) {
      const page = this.pages[pi];
      if (!page.includes(item)) page.push(item);
      const rect = { x: item.x, y: item.y, w: item.w, h: item.h };
      const hits = page.filter((o) => o.id !== item.id && o.x < rect.x + rect.w && o.x + o.w > rect.x && o.y < rect.y + rect.h && o.y + o.h > rect.y);
      if (hits.length) {
        if (hits.length === 1 && hits[0].w === item.w && hits[0].h === item.h && oldPos) {
          const [ox, oy] = oldPos.split(',').map(Number);
          hits[0].x = ox; hits[0].y = oy;
        } else {
          hits.forEach((h) => {
            const f = this.findSpot(pi, h.w, h.h, item.id, hits);
            h.x = f.x; h.y = f.y;
          });
        }
      }
      S.layoutKey++;
    },
    findSpot(pi, w, h, skipId, alsoSkip) {
      const page = this.pages[pi];
      const conflict = (x, y) => page.some((o) => o.id !== skipId && !(alsoSkip || []).includes(o) &&
        x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y);
      for (let y = 0; y < 8; y++) for (let x = 0; x <= 4 - w; x++) if (!conflict(x, y)) return { x, y };
      return { x: 0, y: 0 };
    },
    resetDrag() { this.drag = null; },
    /* ---------- app / widget actions ---------- */
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
    resetPage() {
      if (!confirm('恢复默认桌面布局？自定义位置会丢失。')) return;
      S.cfg.layout = { pages: [JSON.parse(JSON.stringify(HOME.defaultPage())), []], dock: ['store', 'notices', 'beauty', 'settings'] };
      S.layoutKey++;
      saveCfg();
    }
  },
  template: `<div class="home" :class="{editing}" id="home-stage">
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
      <div class="pages" ref="pages" @scroll="onScroll">
        <div class="page-grid" v-for="(page,pi) in pages" :key="pi" :data-page="pi">
          <div v-for="it in page" :key="it.id" :class="['cell', drag&&drag.id===it.id?'dragging':'', drag&&drag.id!==it.id?'dim':'' ]"
               :style="[cellStyle(it), dragStyleFor(it.id)]"
               @pointerdown="downGrid($event,it,pi)">
            <template v-if="it.kind==='postcard'"><pc-card :item="it"/></template>
            <template v-else-if="it.kind==='polaroid'"><pol-card :item="it"/></template>
            <template v-else-if="it.kind==='music'"><music-card :item="it"/></template>
            <template v-else-if="it.kind==='dialog'"><dlg-card :item="it"/></template>
            <template v-else>
              <button class="app" @click.stop="onAppClick(it)">
                <span class="app-icon" :style="{background:meta(it.app).tint}"><ico :name="meta(it.app).icon" :size="25" :sw="1.5"/></span>
                <span class="app-label">{{meta(it.app).name}}</span>
              </button>
              <button v-if="editing" class="del-badge" @click.stop="delApp(it,pi)"><ico name="x" :size="10" :sw="2.6"/></button>
            </template>
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
              <span class="app-icon" :style="{background:meta(appId).tint}"><ico :name="meta(appId).icon" :size="24" :sw="1.5"/></span>
              <span class="app-label">{{meta(appId).name}}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="home-hint" v-if="false">长按图标编辑桌面</div>

    <!-- widget editors -->
    <sheet v-if="sheet" v-model="sheet" :title="sheet==='postcard'?'明信片':sheet==='music'?'音乐盒':sheet==='dialog'?'小对话':'拍立得'" :sub="sheet==='postcard'?'这一张卡片只属于你。':'组件的细节都可以慢慢改。'">
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

      <template #footer><button class="btn primary block" @click="saveCfg(true);sheet=''">保存</button></template>
    </sheet>
  </div>`
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
