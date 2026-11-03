/* ============================================================
   Life apps — music / books / time (anniversary + diary)
   ============================================================ */
const MUSIC = {};

MUSIC.Page = {
  data() {
    return {
      S, addSheet: false,
      form: { title: '', artist: 'LIWU RADIO', dur: 200 }
    };
  },
  computed: {
    m() { return S.cfg.life.music; },
    tracks() { return this.m.tracks || []; },
    cur() { return A.musicTrack(this.m.cur) || this.tracks[0] || null; },
    played() { return S.cfg.home.music.played || 0; },
    dur() { return S.cfg.home.music.dur || 1; },
    pct() { return Math.max(0, Math.min(100, (this.played / this.dur) * 100)); },
    totalText() {
      const s = this.tracks.reduce((a, b) => a + (b.dur || 0), 0);
      return Math.round(s / 60) + ' 分钟';
    },
    mode() { return this.m.mode || 'loop'; },
    modeLabel() { return { loop: '列表循环', one: '单曲循环', shuffle: '随机播放' }[this.mode]; }
  },
  methods: {
    fmt(s) {
      s = Math.max(0, Math.round(s || 0));
      return Math.floor(s / 60) + ':' + U.pad(s % 60);
    },
    play(id) { A.playTrack(id, true); },
    toggle() {
      if (!this.tracks.length) { this.addSheet = true; return; }
      if (!this.cur) A.playTrack(this.tracks[0].id, true);
      else A.toggleMusic();
    },
    prev() { A.nextTrack(-1); },
    next() { A.nextTrack(1); },
    seek(e) {
      const r = e.currentTarget.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (e.clientX - r.left) / Math.max(1, r.width)));
      S.cfg.home.music.played = Math.round(p * this.dur);
      saveCfg();
    },
    add() {
      if (!this.form.title.trim()) { A.toast('给这首歌起个名字'); return; }
      A.addTrack({
        title: this.form.title.trim(),
        artist: this.form.artist.trim() || 'LIWU RADIO',
        dur: Math.max(20, Math.min(900, Number(this.form.dur) || 200))
      });
      this.addSheet = false;
      this.form = { title: '', artist: 'LIWU RADIO', dur: 200 };
      A.toast('已加入播放列表');
    },
    del(t) {
      if (!confirm('从播放列表移除「' + t.title + '」？')) return;
      A.delTrack(t.id);
    }
  },
  template: `<div class="page">
    <nav-bar title=""></nav-bar>
    <div class="body">
      <div class="app-head" style="padding-top:2px">
        <div class="ah-row">
          <div>
            <h1>Music</h1>
            <div class="desc">一张不会跳针的唱片，让房间有一点声音。</div>
          </div>
          <div class="mark">{{tracks.length}} TRACKS</div>
        </div>
      </div>

      <div class="pad">
        <div class="now-card">
          <div class="nc-glow"></div>
          <div class="nc-top">
            <span class="nc-cap">now playing</span>
            <span class="nc-eq" :class="{on:S.musicPlaying}"><i></i><i></i><i></i><i></i></span>
          </div>
          <div class="nc-body">
            <div class="vinyl" :class="{on:S.musicPlaying}"><span>LIWU</span></div>
            <div class="nc-meta">
              <div class="nc-title">{{cur ? cur.title : '还没有曲目'}}</div>
              <div class="nc-artist">{{cur ? cur.artist : '添加一首，让它开始转'}}</div>
              <div class="nc-tag">{{S.musicPlaying ? '正在播放' : '已暂停'}} </div>
            </div>
          </div>

          <div class="nc-progress" @click="seek">
            <div class="nc-track"><i :style="{width:pct+'%'}"></i><b :style="{left:pct+'%'}"></b></div>
          </div>
          <div class="nc-times"><span>{{fmt(played)}}</span><span>{{fmt(dur)}}</span></div>

          <div class="nc-ctrl">
            <button @click="prev" aria-label="上一首"><ico name="prev" :size="17" :sw="1.5"/></button>
            <button class="nc-play" @click="toggle" aria-label="播放"><ico :name="S.musicPlaying?'pause':'play'" :size="19"/></button>
            <button @click="next" aria-label="下一首"><ico name="next" :size="17" :sw="1.5"/></button>
          </div>
        </div>

        <div class="mode-row">
          <button class="chip" :class="{on:mode==='loop'}" @click="A.setMusicMode('loop')">列表循环</button>
          <button class="chip" :class="{on:mode==='one'}" @click="A.setMusicMode('one')">单曲</button>
          <button class="chip" :class="{on:mode==='shuffle'}" @click="A.setMusicMode('shuffle')">随机</button>
          <span class="mode-total">{{tracks.length}} 首 · {{totalText}}</span>
        </div>

        <div class="section" style="padding:0;margin-top:20px">
          <div class="section-head">
            <span class="section-title">播放列表</span>
            <span class="section-act" @click="addSheet=true"><ico name="plus" :size="12"/>添加</span>
          </div>
          <div class="track" v-for="(t,i) in tracks" :key="t.id" :class="{on:cur&&cur.id===t.id}" @click="play(t.id)">
            <div class="tk-idx"><ico v-if="cur&&cur.id===t.id" name="music" :size="12"/><span v-else>{{U.pad(i+1)}}</span></div>
            <div class="tk-main">
              <div class="tk-n">{{t.title}}</div>
              <div class="tk-a">{{t.artist}}</div>
            </div>
            <div class="tk-d">{{fmt(t.dur)}}</div>
            <button class="tk-del" @click.stop="del(t)" aria-label="移除"><ico name="x" :size="11"/></button>
          </div>
          <div v-if="!tracks.length">
            <empty icon="music" title="播放列表是空的" sub="加一首歌，桌面上的音乐盒就会有声音。">
              <button class="btn sm" @click="addSheet=true">添加曲目</button>
            </empty>
          </div>
        </div>
        <div class="tk-note">唱片转完一面，就翻到下一首。</div>
        <div style="height:26px"></div>
      </div>
    </div>

    <sheet v-if="addSheet" v-model="addSheet" title="添加曲目" sub="不会真的播放音频，它只是这个小世界里的背景音。">
      <div class="form-stack">
        <div class="field"><label>曲名</label><input class="input" v-model="form.title" maxlength="24" placeholder="Soft Static"></div>
        <div class="field"><label>歌手 / 来源</label><input class="input" v-model="form.artist" maxlength="24"></div>
        <div class="field"><label>时长（秒）</label><input class="input" type="number" min="20" max="900" v-model.number="form.dur"></div>
      </div>
      <template #footer><button class="btn primary block" @click="add">加入播放列表</button></template>
    </sheet>
  </div>`
};

/* ---------------------------------------------------------- */
/* Books                                                       */
/* ---------------------------------------------------------- */
const BOOKS = {};

BOOKS.Page = {
  data() {
    return {
      S, tab: 'all', sheet: false,
      form: { title: '', author: '', total: 320, status: 'reading' }
    };
  },
  computed: {
    books() { return S.cfg.life.books || []; },
    list() { return this.tab === 'all' ? this.books : this.books.filter((b) => b.status === this.tab); },
    reading() { return this.books.filter((b) => b.status === 'reading'); },
    done() { return this.books.filter((b) => b.status === 'done'); },
    quotes() { return this.books.reduce((a, b) => a + ((b.quotes || []).length), 0); }
  },
  methods: {
    pct(b) { return Math.min(100, Math.round(((b.cur || 0) / Math.max(1, b.total || 1)) * 100)); },
    open(b) { A.go('book.detail', { bookId: b.id }); },
    add() {
      if (!this.form.title.trim()) { A.toast('先写书名'); return; }
      const b = A.addBook({
        title: this.form.title.trim(),
        author: this.form.author.trim(),
        total: Math.max(1, Number(this.form.total) || 320),
        status: this.form.status
      });
      this.sheet = false;
      this.form = { title: '', author: '', total: 320, status: 'reading' };
      this.open(b);
    }
  },
  template: `<div class="page">
    <nav-bar title="">
      <template #right><button class="icon-btn" @click="sheet=true"><ico name="plus" :size="20"/></button></template>
    </nav-bar>
    <div class="body">
      <div class="app-head" style="padding-top:2px">
        <div class="ah-row">
          <div>
            <h1>Books</h1>
            <div class="desc">一起读过的书。停在哪一页，下次就从那里继续。</div>
          </div>
          <div class="mark">{{books.length}} BOOKS</div>
        </div>
      </div>

      <div class="bk-stats">
        <div class="bs"><div class="n">{{reading.length}}</div><div class="l">在读</div></div>
        <div class="bs"><div class="n">{{done.length}}</div><div class="l">读完</div></div>
        <div class="bs"><div class="n">{{quotes}}</div><div class="l">摘句</div></div>
      </div>

      <div class="pad">
        <div class="segmented" style="margin:4px 0 16px">
          <button :class="{on:tab==='all'}" @click="tab='all'">全部</button>
          <button :class="{on:tab==='reading'}" @click="tab='reading'">在读</button>
          <button :class="{on:tab==='done'}" @click="tab='done'">读完</button>
        </div>

        <div class="bk-grid" v-if="list.length">
          <div class="bk-card" v-for="b in list" :key="b.id" @click="open(b)">
            <div class="bk-cover" :style="{background:b.tint||'linear-gradient(160deg,#B9B3A4,#7E786C)'}">
              <div class="bk-cv-t">{{b.title}}</div>
              <div class="bk-cv-a">{{b.author || '未署名'}}</div>
              <div class="bk-cv-line"></div>
              <span class="bk-cv-st" v-if="b.status==='done'">读完</span>
            </div>
            <div class="bk-info">
              <div class="bk-t">{{b.title}}</div>
              <div class="bk-bar"><i :style="{width:Math.max(2,pct(b))+'%'}"></i></div>
              <div class="bk-foot"><span>{{pct(b)}}%</span><span>第 {{b.cur||0}} / {{b.total}} 页</span></div>
            </div>
          </div>
        </div>

        <div v-else>
          <empty icon="book" title="书架还是空的" sub="放一本书进来，哪怕只读到第二页。">
            <button class="btn sm" @click="sheet=true">添加一本书</button>
          </empty>
        </div>
        <div style="height:26px"></div>
      </div>
    </div>

    <sheet v-if="sheet" v-model="sheet" title="添加一本书" sub="封面颜色会按书名自动生成。">
      <div class="form-stack">
        <div class="field"><label>书名</label><input class="input" v-model="form.title" maxlength="26" placeholder="你当像鸟飞往你的山"></div>
        <div class="field"><label>作者</label><input class="input" v-model="form.author" maxlength="20" placeholder="可以留空"></div>
        <div class="field"><label>总页数</label><input class="input" type="number" min="1" max="5000" v-model.number="form.total"></div>
        <div class="field"><label>状态</label>
          <div class="f g8">
            <button class="chip" :class="{on:form.status==='reading'}" @click="form.status='reading'">在读</button>
            <button class="chip" :class="{on:form.status==='done'}" @click="form.status='done'">读完</button>
          </div>
        </div>
      </div>
      <template #footer><button class="btn primary block" @click="add">放进书架</button></template>
    </sheet>
  </div>`
};

BOOKS.Detail = {
  props: { params: Object },
  data() {
    return { S, qSheet: false, qText: '', qPage: '', edit: false, eForm: null };
  },
  computed: {
    b() { return A.bookById(this.params.bookId); },
    pct() { return this.b ? Math.min(100, Math.round((this.b.cur / Math.max(1, this.b.total)) * 100)) : 0; },
    quotes() { return (this.b && this.b.quotes) || []; },
    days() { return this.b ? Math.max(1, Math.round((Date.now() - (this.b.createdAt || Date.now())) / 86400000) + 1) : 0; }
  },
  methods: {
    save() { if (this.b) A.updateBook(this.b.id, { cur: this.b.cur, status: this.b.status }); },
    step(n) {
      if (!this.b) return;
      this.b.cur = Math.max(0, Math.min(this.b.total, (this.b.cur || 0) + n));
      if (this.b.cur >= this.b.total) this.b.status = 'done';
      this.save();
    },
    finish() {
      if (!this.b) return;
      this.b.cur = this.b.total;
      this.b.status = 'done';
      this.save();
      A.toast('读完了。可以留一句摘句。');
    },
    reopen() { if (this.b) { this.b.status = 'reading'; this.save(); } },
    addQuote() {
      if (!this.qText.trim()) { A.toast('写点什么再保存'); return; }
      A.addQuote(this.b.id, { text: this.qText.trim(), page: Number(this.qPage) || this.b.cur || 0 });
      this.qText = ''; this.qPage = ''; this.qSheet = false;
    },
    delQuote(q) {
      if (!confirm('删除这条摘句？')) return;
      A.delQuote(this.b.id, q.id);
    },
    del() {
      if (!confirm('把《' + this.b.title + '》从书架移除？')) return;
      A.delBook(this.b.id);
      A.back();
    },
    openEdit() {
      this.eForm = { title: this.b.title, author: this.b.author, total: this.b.total, cur: this.b.cur };
      this.edit = true;
    },
    saveEdit() {
      if (!this.eForm.title.trim()) { A.toast('书名不能为空'); return; }
      A.updateBook(this.b.id, {
        title: this.eForm.title.trim(), author: this.eForm.author.trim(),
        total: Math.max(1, Number(this.eForm.total) || 1), cur: Math.max(0, Number(this.eForm.cur) || 0)
      });
      this.edit = false;
    }
  },
  template: `<div class="page" v-if="b">
    <nav-bar title="">
      <template #right>
        <button class="icon-btn" @click="openEdit"><ico name="edit" :size="17"/></button>
        <button class="icon-btn" @click="del"><ico name="trash" :size="17"/></button>
      </template>
    </nav-bar>
    <div class="body">
      <div class="bd-hero">
        <div class="bd-cover" :style="{background:b.tint||'linear-gradient(160deg,#B9B3A4,#7E786C)'}">
          <div class="bk-cv-t">{{b.title}}</div>
          <div class="bk-cv-a">{{b.author || '未署名'}}</div>
          <div class="bk-cv-line"></div>
        </div>
        <div class="bd-meta">
          <div class="bd-t">{{b.title}}</div>
          <div class="bd-a">{{b.author || '未署名'}}</div>
          <div class="f g6" style="margin-top:9px">
            <span class="tag" :class="{on:b.status==='done'}">{{b.status==='done'?'已读完':'在读'}}</span>
            <span class="tag">{{quotes.length}} 条摘句</span>
          </div>
        </div>
      </div>

      <div class="pad">
        <div class="bd-progress">
          <div class="bp-top"><span class="eyebrow">progress</span><span class="bp-pct">{{pct}}%</span></div>
          <div class="bp-bar"><i :style="{width:Math.max(2,pct)+'%'}"></i></div>
          <div class="bp-row">
            <button class="bp-btn" @click="step(-10)"><ico name="minus" :size="13"/></button>
            <div class="bp-page">第 <b>{{b.cur||0}}</b> / {{b.total}} 页</div>
            <button class="bp-btn" @click="step(10)"><ico name="plus" :size="13"/></button>
          </div>
          <button class="btn sm block" style="margin-top:12px" v-if="b.status!=='done'" @click="finish">标记读完</button>
          <button class="btn sm block ghost" style="margin-top:12px" v-else @click="reopen">重新在读</button>
        </div>

        <div class="bd-stats">
          <div class="bds"><div class="n">{{days}}</div><div class="l">共读天数</div></div>
          <div class="bds"><div class="n">{{quotes.length}}</div><div class="l">摘句</div></div>
          <div class="bds"><div class="n">{{Math.max(0,b.total-(b.cur||0))}}</div><div class="l">剩余页</div></div>
        </div>

        <div class="section" style="padding:0;margin-top:24px">
          <div class="section-head">
            <span class="section-title">摘句</span>
            <span class="section-act" @click="qSheet=true"><ico name="plus" :size="12"/>记一句</span>
          </div>
          <div class="quote" v-for="q in quotes" :key="q.id">
            <ico name="quote" :size="14" style="color:var(--muted-2);flex:none;margin-top:2px"/>
            <div class="q-main">
              <div class="q-t">{{q.text}}</div>
              <div class="q-f">P.{{q.page||'—'}}<button class="q-del" @click="delQuote(q)"><ico name="x" :size="10"/></button></div>
            </div>
          </div>
          <div v-if="!quotes.length" class="q-empty">还没有摘句。读到喜欢的那一行，就记下来。</div>
        </div>
        <div style="height:28px"></div>
      </div>
    </div>

    <sheet v-if="qSheet" v-model="qSheet" title="记一句" sub="它会被收在这本书下面。">
      <div class="form-stack">
        <div class="field"><label>摘句</label><textarea class="textarea" v-model="qText" maxlength="200" placeholder="也许，就是这么回事。"></textarea></div>
        <div class="field"><label>页码</label><input class="input" type="number" min="0" v-model.number="qPage" :placeholder="String(b.cur||0)"></div>
      </div>
      <template #footer><button class="btn primary block" @click="addQuote">收下</button></template>
    </sheet>

    <sheet v-if="edit" v-model="edit" title="编辑这本书">
      <div class="form-stack">
        <div class="field"><label>书名</label><input class="input" v-model="eForm.title" maxlength="26"></div>
        <div class="field"><label>作者</label><input class="input" v-model="eForm.author" maxlength="20"></div>
        <div class="field"><label>总页数</label><input class="input" type="number" min="1" v-model.number="eForm.total"></div>
        <div class="field"><label>当前页</label><input class="input" type="number" min="0" v-model.number="eForm.cur"></div>
      </div>
      <template #footer><button class="btn primary block" @click="saveEdit">保存</button></template>
    </sheet>
  </div>`
};

/* ---------------------------------------------------------- */
/* Time — anniversaries + diary                                */
/* ---------------------------------------------------------- */
const TIME = {};

TIME.Page = {
  props: { params: Object },
  data() {
    return {
      S, tab: 'anniv',
      aSheet: false, aEdit: '', aForm: { date: '', label: '', note: '' },
      dSheet: false, dEdit: '', dForm: { text: '', mood: '平静' },
      moods: ['平静', '想你', '开心', '低落', '疲惫']
    };
  },
  computed: {
    annivs() { return (S.cfg.life.annivs || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')); },
    main() { return A.mainAnniv(); },
    days() { return this.main ? this.daysOf(this.main.date) : null; },
    diaries() { return (S.cfg.life.diary || []).slice().sort((a, b) => b.ts - a.ts); },
    dayNo() { return A.dayNo(); },
    monthCount() {
      const n = new Date();
      return this.diaries.filter((d) => {
        const x = new Date(d.ts);
        return x.getFullYear() === n.getFullYear() && x.getMonth() === n.getMonth();
      }).length;
    },
    words() { return this.diaries.reduce((a, d) => a + (d.text || '').length, 0); },
    streak() {
      const days = new Set(this.diaries.map((d) => { const x = new Date(d.ts); x.setHours(0, 0, 0, 0); return x.getTime(); }));
      let cur = new Date(); cur.setHours(0, 0, 0, 0);
      if (!days.has(cur.getTime())) cur.setDate(cur.getDate() - 1);
      let n = 0;
      while (days.has(cur.getTime())) { n++; cur.setDate(cur.getDate() - 1); }
      return n;
    }
  },
  methods: {
    daysOf(d) {
      if (!d) return null;
      const t = new Date(d + 'T00:00:00');
      if (isNaN(t)) return null;
      const now = new Date(); now.setHours(0, 0, 0, 0);
      return Math.round((now - t) / 86400000) + 1;
    },
    ago(d) {
      const n = this.daysOf(d);
      if (n == null) return '';
      if (n === 0) return '就是今天';
      return n > 0 ? '已经 ' + n + ' 天' : '还有 ' + (-n + 1) + ' 天';
    },
    fmt(d) { return d ? d.replace(/-/g, '.') : '未设定'; },
    dText(ts) {
      const d = new Date(ts);
      return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 · ' + U.pad(d.getHours()) + ':' + U.pad(d.getMinutes());
    },
    openAnniv(a) {
      this.aEdit = a ? a.id : '';
      this.aForm = a ? { date: a.date, label: a.label, note: a.note || '' } : { date: new Date().toISOString().slice(0, 10), label: '', note: '' };
      this.aSheet = true;
    },
    saveAnniv() {
      if (!this.aForm.date) { A.toast('选一个日期'); return; }
      if (!this.aForm.label.trim()) { A.toast('给这一天起个名字'); return; }
      if (this.aEdit) A.updateAnniv(this.aEdit, { date: this.aForm.date, label: this.aForm.label.trim(), note: this.aForm.note.trim() });
      else A.addAnniv({ date: this.aForm.date, label: this.aForm.label.trim(), note: this.aForm.note.trim() });
      this.aSheet = false;
      A.toast('记下了');
    },
    delAnniv() {
      if (!this.aEdit) return;
      if (!confirm('删除这一天？')) return;
      A.delAnniv(this.aEdit);
      this.aSheet = false;
    },
    setMain(a) { A.setMainAnniv(a.id); A.toast('已设为桌面上的那一天'); },
    openDiary(d) {
      this.dEdit = d ? d.id : '';
      this.dForm = d ? { text: d.text, mood: d.mood || '平静' } : { text: '', mood: '平静' };
      this.dSheet = true;
    },
    saveDiary() {
      if (!this.dForm.text.trim()) { A.toast('写点什么'); return; }
      if (this.dEdit) A.updateDiary(this.dEdit, { text: this.dForm.text.trim(), mood: this.dForm.mood });
      else A.addDiary({ text: this.dForm.text.trim(), mood: this.dForm.mood });
      this.dSheet = false;
      A.toast('写好了');
    },
    delDiary() {
      if (!this.dEdit || !confirm('删除这一篇？')) return;
      A.delDiary(this.dEdit);
      this.dSheet = false;
    }
  },
  mounted() { if (this.params && this.params.tab) this.tab = this.params.tab; },
  template: `<div class="page">
    <nav-bar title=""></nav-bar>
    <div class="body">
      <div class="app-head" style="padding-top:2px">
        <div class="ah-row">
          <div>
            <h1>Time</h1>
            <div class="desc">把日子数出来，把想说的话留下来。</div>
          </div>
          <div class="mark">{{annivs.length}} DAYS · {{diaries.length}} NOTES</div>
        </div>
      </div>

      <div class="pad">
        <div class="segmented" style="margin:4px 0 16px">
          <button :class="{on:tab==='anniv'}" @click="tab='anniv'">纪念日</button>
          <button :class="{on:tab==='diary'}" @click="tab='diary'">日记</button>
        </div>

        <template v-if="tab==='anniv'">
          <div class="tm-hero" v-if="main">
            <div class="tm-hero-top"><span class="tm-cap">days together</span><ico name="heart" :size="12" :sw="1.4" style="opacity:.5"/></div>
            <div class="tm-num">{{Math.abs(days)}}</div>
            <div class="tm-lab">{{main.label}} · 第 {{days}} 天</div>
            <div class="tm-date">{{fmt(main.date)}}</div>
            <div class="tm-hero-glow"></div>
          </div>
          <div class="tm-hero empty" v-else @click="openAnniv(null)">
            <div class="tm-hero-top"><span class="tm-cap">days together</span></div>
            <div class="tm-num">＋</div>
            <div class="tm-lab">设一个纪念日</div>
            <div class="tm-date">比如第一次说话的那天</div>
          </div>

          <div class="section" style="padding:0;margin-top:22px">
            <div class="section-head">
              <span class="section-title">时间线</span>
              <span class="section-act" @click="openAnniv(null)"><ico name="plus" :size="12"/>添加</span>
            </div>
            <div class="tl" v-if="annivs.length">
              <div class="tl-item" v-for="a in annivs" :key="a.id" @click="openAnniv(a)">
                <div class="tl-rail"><i :class="{main:a.main}"></i></div>
                <div class="tl-body">
                  <div class="tl-date">{{fmt(a.date)}} <span v-if="a.main" class="tag on">桌面</span></div>
                  <div class="tl-t">{{a.label}}</div>
                  <div class="tl-note" v-if="a.note">{{a.note}}</div>
                  <div class="tl-m">{{ago(a.date)}}<button class="tl-main" v-if="!a.main" @click.stop="setMain(a)">设为桌面</button></div>
                </div>
              </div>
            </div>
            <div v-else class="q-empty">还没有纪念日。第一个可以是「第一次说话」。</div>
          </div>
        </template>

        <template v-else>
          <div class="dw-hero">
            <div>
              <div class="tm-cap">my diary</div>
              <div class="dw-n">DAY {{dayNo}}</div>
              <div class="dw-s">{{diaries.length}} 篇 · 只写给自己看</div>
            </div>
            <button class="dw-write" @click="openDiary(null)"><ico name="edit" :size="16"/></button>
          </div>
          <div class="dw-stats" v-if="diaries.length">
            <span>本月 <b>{{monthCount}}</b> 篇</span><i></i>
            <span>共 <b>{{diaries.length}}</b> 篇</span><i></i>
            <span>连续 <b>{{streak}}</b> 天</span><i></i>
            <span>共 <b>{{words}}</b> 字</span>
          </div>

          <div class="diary-item" v-for="d in diaries" :key="d.id" @click="openDiary(d)">
            <div class="di-top"><span class="di-date">{{dText(d.ts)}}</span><span class="di-mood">{{d.mood}}</span></div>
            <div class="di-text">{{d.text}}</div>
          </div>
          <div v-if="!diaries.length">
            <empty icon="feather" title="第一页是空白的" sub="写一句今天，明天再来看，它就有了重量。">
              <button class="btn sm" @click="openDiary(null)">写一篇</button>
            </empty>
          </div>
        </template>
        <div style="height:26px"></div>
      </div>
    </div>

    <sheet v-if="aSheet" v-model="aSheet" :title="aEdit?'编辑这一天':'添加纪念日'" sub="日期会一直算下去，跨过零点自动加一天。">
      <div class="form-stack">
        <div class="field"><label>日期</label><input class="input" type="date" v-model="aForm.date"></div>
        <div class="field"><label>这一天叫什么</label><input class="input" v-model="aForm.label" maxlength="12" placeholder="在一起 / 第一次见面"></div>
        <div class="field"><label>备注</label><textarea class="textarea" v-model="aForm.note" maxlength="120" placeholder="那天发生了什么"></textarea></div>
      </div>
      <template #footer>
        <button v-if="aEdit" class="btn" style="color:var(--danger)" @click="delAnniv">删除</button>
        <button class="btn primary grow" @click="saveAnniv">保存</button>
      </template>
    </sheet>

    <sheet v-if="dSheet" v-model="dSheet" :title="dEdit?'这一篇':'写一篇'" sub="日记不会进入对话，也不会被角色看到。">
      <div class="form-stack">
        <div class="field"><label>今天</label><textarea class="textarea" style="min-height:150px" v-model="dForm.text" maxlength="1200" placeholder="今天没发生什么，但还是想写下来。"></textarea></div>
        <div class="field"><label>心情</label>
          <div class="f g6" style="flex-wrap:wrap">
            <button class="chip" v-for="m in moods" :key="m" :class="{on:dForm.mood===m}" @click="dForm.mood=m">{{m}}</button>
          </div>
        </div>
      </div>
      <template #footer>
        <button v-if="dEdit" class="btn" style="color:var(--danger)" @click="delDiary">删除</button>
        <button class="btn primary grow" @click="saveDiary">保存</button>
      </template>
    </sheet>
  </div>`
};
