/* ============================================================
   Us — 我们 / 小房间 / 时间胶囊 / 词云 / 月度回顾 / 额度
   这一组页面的共同点：都不需要联网，数据都存在本机
   ============================================================ */
const US = {};

function fmtDate(ts) {
  const d = new Date(ts);
  return d.getFullYear() + '.' + U.pad(d.getMonth() + 1) + '.' + U.pad(d.getDate());
}

/* ---------------- Us ---------------- */
US.Page = {
  data() {
    return { S, noteSheet: false, note: '' };
  },
  computed: {
    dayNo() { return A.dayNo(); },
    anniv() { return A.mainAnniv(); },
    noteText() { return S.cfg.extra.todayNote || ''; },
    todayLabel() {
      const d = new Date();
      return (d.getMonth() + 1) + ' / ' + d.getDate();
    },
    today() {
      const d = new Date();
      return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 · 周' + '日一二三四五六'[d.getDay()];
    },
    todos() { return S.cfg.extra.rooms.todos || []; },
    openTodos() { return this.todos.filter((x) => !x.done).length; },
    wishes() { return S.cfg.extra.rooms.wishes || []; },
    wishDone() { return this.wishes.filter((x) => x.done).length; },
    capsules() { return S.cfg.extra.capsules || []; },
    lockedCaps() { return this.capsules.filter((c) => c.openAt && new Date(c.openAt + 'T00:00:00') > new Date()); },
    checked() { return A.checkedToday(); },
    streak() { return A.checkinStreak(); },
    usage() { return S.cfg.extra.usage || { n: 0 }; },
    memCount() { return (S.memories || []).length; }
  },
  methods: {
    go(r, p) { A.go(r, p); },
    openNote() { this.note = S.cfg.extra.todayNote || ''; this.noteSheet = true; },
    saveNote() {
      S.cfg.extra.todayNote = this.note.trim().slice(0, 80);
      saveCfg(true);
      this.noteSheet = false;
    },
    check() {
      const on = A.checkin();
      A.toast(on ? '今天也打上了' : '取消了今天的打卡');
    }
  },
  template: `<div class="page">
    <nav-bar title=""></nav-bar>
    <div class="body">
      <div class="us-head">
        <div class="us-kicker"><span class="uk-en">365 infinity</span><span class="uk-no">{{dayNo}} / ∞</span></div>
        <div class="us-title">Us</div>
        <div class="us-sub">我们</div>
        <div class="us-desc">在一起的第 {{dayNo}} 天。今天也留一格给我们。</div>
      </div>

      <div class="pad">
        <div class="us-card">
          <div class="usc-top">
            <span class="usc-cap">together</span>
            <span class="usc-date">{{todayLabel}}</span>
          </div>
          <div class="usc-num">{{dayNo}}<i>天</i></div>
          <div class="usc-note" @click="openNote">
            <template v-if="noteText">{{noteText}}</template>
            <template v-else><i class="usc-plus">＋</i>写一句今天的提醒</template>
          </div>
          <div class="usc-foot">
            <span>{{today}}</span>
            <span v-if="anniv">{{anniv.label}}</span>
          </div>
        </div>

        <div class="us-index">
          <div class="ui-group">only us · 只属于我们</div>

          <div class="ui-item" @click="go('messages')">
            <div class="ui-main">
              <div class="ui-t">他的消息 <i>messages</i></div>
              <div class="ui-d">早安晚安，想你的时候主动来找你</div>
            </div>
            <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
          </div>

          <div class="ui-item" @click="go('deeptalk')">
            <div class="ui-main">
              <div class="ui-t">deeptalk <i>deep talk</i></div>
              <div class="ui-d">像写信一样，一张一张说心里话</div>
            </div>
            <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
          </div>

          <div class="ui-item" @click="go('secret')">
            <div class="ui-main">
              <div class="ui-t">秘密 <i>secret</i></div>
              <div class="ui-d">四位锁，只给你的那一格</div>
            </div>
            <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
          </div>

          <div class="ui-group">我们 · together</div>

          <div class="ui-item" @click="go('rooms')">
            <div class="ui-main">
              <div class="ui-t">小房间 <i>rooms</i></div>
              <div class="ui-d">{{openTodos ? '还有 ' + openTodos + ' 件没做完，他都知道' : '待办、备忘、心愿，还有每天的打卡'}}</div>
            </div>
            <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
          </div>

          <div class="ui-item" @click="go('capsule')">
            <div class="ui-main">
              <div class="ui-t">时间胶囊 <i>capsule</i></div>
              <div class="ui-d">{{lockedCaps.length ? lockedCaps.length + ' 封还封着，到日子才能拆' : '写给以后的我们，封起来'}}</div>
            </div>
            <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
          </div>

          <div class="ui-item" @click="go('words')">
            <div class="ui-main">
              <div class="ui-t">词云 <i>words</i></div>
              <div class="ui-d">我们最常说的那些话</div>
            </div>
            <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
          </div>

          <div class="ui-item" @click="go('monthly')">
            <div class="ui-main">
              <div class="ui-t">月度回顾 <i>monthly</i></div>
              <div class="ui-d">这个月说过多少话，还有一封他写的信</div>
            </div>
            <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
          </div>
        </div>

        <div class="us-tail">永远在建造中</div>
        <div style="height:28px"></div>
      </div>
    </div>

    <sheet v-if="noteSheet" :model-value="noteSheet" title="今天的提醒" :sub="today" @update:model-value="noteSheet=false">
      <div class="field">
        <textarea class="textarea" v-model="note" maxlength="80" placeholder="今天想记住的一件事，或者想对他说的一句话。"></textarea>
      </div>
      <template #footer>
        <div class="f g8">
          <button class="btn ghost" style="flex:1" @click="noteSheet=false">取消</button>
          <button class="btn primary" style="flex:2" @click="saveNote">保存</button>
        </div>
      </template>
    </sheet>
  </div>`
};

/* ---------------- Rooms ---------------- */
US.Rooms = {
  data() {
    return {
      S, tab: (this.params && this.params.tab) || 'todo',
      sheet: '', input: '', target: ''
    };
  },
  computed: {
    r() { return S.cfg.extra.rooms; },
    todos() { return this.r.todos || []; },
    memos() { return this.r.memos || []; },
    wishes() { return this.r.wishes || []; },
    openTodos() { return this.todos.filter((x) => !x.done).length; },
    wishDone() { return this.wishes.filter((x) => x.done).length; },
    streak() { return A.checkinStreak(); },
    monthCells() {
      const now = new Date();
      const y = now.getFullYear(), m = now.getMonth();
      const first = new Date(y, m, 1);
      const pad = (first.getDay() + 6) % 7;
      const total = new Date(y, m + 1, 0).getDate();
      const out = [];
      for (let i = 0; i < pad; i++) out.push(null);
      for (let d = 1; d <= total; d++) {
        const k = y + '-' + (m + 1) + '-' + d;
        out.push({ d, k, on: !!this.r.checkins[k], today: d === now.getDate(), future: d > now.getDate() });
      }
      return out;
    },
    monthLabel() { const n = new Date(); return (n.getMonth() + 1) + ' 月'; },
    checkedCount() {
      const pre = new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-';
      return Object.keys(this.r.checkins || {}).filter((k) => k.indexOf(pre) === 0).length;
    }
  },
  methods: {
    fmtDate,
    pick(t) { this.tab = t; },
    openSheet(kind) { this.sheet = kind; this.input = ''; },
    save() {
      const v = this.input.trim();
      if (!v) return;
      if (this.sheet === 'todo') A.addTodo(v);
      else if (this.sheet === 'memo') A.addMemo(v);
      else if (this.sheet === 'wish') A.addWish(v);
      this.input = '';
      this.sheet = '';
    },
    toggle(kind, it) {
      if (kind === 'todo') A.toggleTodo(it.id);
      else if (kind === 'wish') A.toggleWish(it.id);
      else if (kind === 'check') {
        const c = this.r.checkins;
        if (c[it.k]) delete c[it.k]; else c[it.k] = Date.now();
        saveCfg();
      }
    },
    remove(kind, it) {
      if (kind === 'todo') A.delTodo(it.id);
      else if (kind === 'memo') A.delMemo(it.id);
      else if (kind === 'wish') A.delWish(it.id);
    },
    checkToday() {
      const on = A.checkin();
      A.toast(on ? '今天来过了' : '取消了今天');
    }
  },
  template: `<div class="page">
    <nav-bar title=""></nav-bar>
    <div class="body">
      <div class="us-head tight">
        <div class="us-kicker"><span class="uk-en">rooms</span><span class="uk-no">{{openTodos}} OPEN</span></div>
        <div class="us-title sm">Rooms</div>
        <div class="us-sub">小房间</div>
      </div>

      <div class="pad">
        <div class="rm-stats">
          <div class="rms"><div class="n">{{openTodos}}</div><div class="l">待办</div></div>
          <div class="rms"><div class="n">{{wishDone}}/{{wishes.length}}</div><div class="l">心愿</div></div>
          <div class="rms"><div class="n">{{streak}}</div><div class="l">连续打卡</div></div>
        </div>

        <div class="seg-wrap">
          <seg :model-value="tab" @update:model-value="pick" :options="[{value:'todo',label:'待办'},{value:'memo',label:'备忘'},{value:'wish',label:'心愿'},{value:'check',label:'打卡'}]"/>
        </div>

        <template v-if="tab==='todo'">
          <div class="rm-add" @click="openSheet('todo')"><ico name="plus" :size="14"/><span>加一件没做完的事</span></div>
          <div v-if="!todos.length" class="rm-empty">还没有待办。写下第一件，他会记着的。</div>
          <div class="group" v-else>
            <div class="rm-item" v-for="t in todos" :key="t.id">
              <button class="rm-box" :class="{on:t.done}" @click="toggle('todo',t)"><ico v-if="t.done" name="check" :size="10" :sw="2.6"/></button>
              <div class="rm-text" :class="{done:t.done}">{{t.text}}</div>
              <button class="rm-del" @click="remove('todo',t)"><ico name="x" :size="12"/></button>
            </div>
          </div>
          <div class="rm-foot" v-if="todos.some(t=>t.done)"><span @click="A.clearDone()">清掉已完成</span></div>
        </template>

        <template v-else-if="tab==='memo'">
          <div class="rm-add" @click="openSheet('memo')"><ico name="plus" :size="14"/><span>贴一张便签</span></div>
          <div v-if="!memos.length" class="rm-empty">空着。勾上的那几条，他也记得。</div>
          <div class="memo-wrap" v-else>
            <div class="memo" v-for="m in memos" :key="m.id">
              <div class="memo-t">{{m.text}}</div>
              <div class="memo-f"><span>{{fmtDate(m.ts)}}</span><button @click="remove('memo',m)">撕掉</button></div>
            </div>
          </div>
        </template>

        <template v-else-if="tab==='wish'">
          <div class="rm-add" @click="openSheet('wish')"><ico name="plus" :size="14"/><span>写下一个心愿</span></div>
          <div v-if="!wishes.length" class="rm-empty">两个人的心愿，一件一件实现。</div>
          <div class="group" v-else>
            <div class="rm-item" v-for="w in wishes" :key="w.id">
              <button class="rm-box heart" :class="{on:w.done}" @click="toggle('wish',w)"><ico v-if="w.done" name="heart" :size="10"/></button>
              <div class="rm-text" :class="{done:w.done}">{{w.text}}</div>
              <button class="rm-del" @click="remove('wish',w)"><ico name="x" :size="12"/></button>
            </div>
          </div>
          <div class="rm-hint" v-if="wishes.length">实现了就点一下，划掉也算数。</div>
        </template>

        <template v-else>
          <div class="ck-head">
            <div class="ck-l"><b>{{monthLabel}}</b><span>来过 {{checkedCount}} 天</span></div>
            <button class="btn sm" :class="A.checkedToday()?'soft':'primary'" @click="checkToday">
              {{A.checkedToday()?'今天已打':'打今天的卡'}}
            </button>
          </div>
          <div class="ck-grid">
            <div class="ck-w" v-for="w in ['一','二','三','四','五','六','日']" :key="w">{{w}}</div>
            <template v-for="(c,i) in monthCells" :key="i">
              <div v-if="!c" class="ck-c blank"></div>
              <div v-else class="ck-c" :class="{on:c.on,today:c.today,future:c.future}" @click="toggle('check',c)">{{c.d}}</div>
            </template>
          </div>
          <div class="rm-hint">点格子补记，长按没有的东西就算了——这里只记来过。</div>
        </template>

        <div style="height:28px"></div>
      </div>
    </div>

    <sheet v-if="sheet" :model-value="!!sheet" :title="sheet==='todo'?'新的待办':(sheet==='memo'?'一张便签':'一个心愿')" @update:model-value="sheet=''">
      <div class="field">
        <textarea class="textarea" v-model="input" :placeholder="sheet==='memo'?'想记下来的话。':'一句话就够。'" :style="sheet==='memo'?'min-height:110px':''"></textarea>
      </div>
      <template #footer>
        <button class="btn primary block" @click="save">放进去</button>
      </template>
    </sheet>
  </div>`
};

/* ---------------- Capsule ---------------- */
US.Capsule = {
  data() {
    return { S, sheet: false, view: null, form: { title: '', body: '', openAt: '' } };
  },
  computed: {
    list() {
      return (S.cfg.extra.capsules || []).slice().sort((a, b) => {
        const A1 = a.openAt || '', B1 = b.openAt || '';
        return A1 < B1 ? -1 : A1 > B1 ? 1 : 0;
      });
    },
    locked() {
      return this.list.filter((c) => !c.opened && new Date(c.openAt + 'T00:00:00') > new Date());
    },
    ready() {
      return this.list.filter((c) => !c.opened && new Date(c.openAt + 'T00:00:00') <= new Date());
    },
    opened() { return this.list.filter((c) => c.opened); }
  },
  methods: {
    fmtDate,
    left(c) { return A.capsuleLeft(c); },
    isLocked(c) { return !c.opened && new Date(c.openAt + 'T00:00:00') > new Date(); },
    openNew() {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      this.form = { title: '', body: '', openAt: d.toISOString().slice(0, 10) };
      this.sheet = true;
    },
    save() {
      if (!this.form.body.trim()) { A.toast('里面还是空的'); return; }
      if (!this.form.openAt) { A.toast('选一个可以拆开的日子'); return; }
      if (new Date(this.form.openAt + 'T00:00:00') <= new Date()) { A.toast('这个日子已经过去了'); return; }
      A.addCapsule(this.form);
      this.sheet = false;
      A.toast('封好了，等到那天再拆');
    },
    tap(c) {
      if (this.isLocked(c)) { A.toast('还差 ' + this.left(c) + ' 天。有些东西要等。'); return; }
      A.openCapsule(c.id);
      this.view = c;
    },
    tear(c) {
      A.delCapsule(c.id);
      if (this.view && this.view.id === c.id) this.view = null;
    }
  },
  template: `<div class="page">
    <nav-bar title=""></nav-bar>
    <div class="body">
      <div class="us-head tight">
        <div class="us-kicker"><span class="uk-en">capsule</span><span class="uk-no">{{locked.length}} SEALED</span></div>
        <div class="us-title sm">Capsule</div>
        <div class="us-sub">时间胶囊</div>
        <div class="us-desc">写给以后的我们。封上的那天起，就不许提前看。</div>
      </div>

      <div class="pad">
        <div style="height:6px"></div>
        <button class="btn primary block" @click="openNew">封一封新的</button>
        <div style="height:4px"></div>

        <div class="cp-ready" v-if="ready.length">
          <div class="cp-sec-h">可以拆了 <i>{{ready.length}}</i></div>
          <div class="cp-card ready" v-for="c in ready" :key="c.id" @click="tap(c)">
            <div class="cpc-top"><span class="cpc-tag">到期</span><span class="cpc-date">{{c.openAt}}</span></div>
            <div class="cpc-title">{{c.title}}</div>
            <div class="cpc-hint">轻点拆开</div>
          </div>
        </div>

        <div class="cp-sec-h" style="margin-top:22px">还封着 <i>{{locked.length}}</i></div>
        <div v-if="!locked.length" class="cp-empty">没有封着的信。写一封，给一年以后的自己。</div>
        <div class="cp-card" v-for="c in locked" :key="c.id" @click="tap(c)">
          <div class="cpc-top"><span class="cpc-tag lock"><ico name="lock" :size="9"/>封存</span><span class="cpc-date">{{c.openAt}}</span></div>
          <div class="cpc-title">{{c.title}}</div>
          <div class="cpc-count"><b>{{left(c)}}</b><span>天后可以拆</span></div>
        </div>

        <template v-if="opened.length">
          <div class="cp-sec-h" style="margin-top:22px">已经拆过 <i>{{opened.length}}</i></div>
          <div class="cp-card done" v-for="c in opened" :key="c.id" @click="view=c">
            <div class="cpc-top"><span class="cpc-tag">已拆</span><span class="cpc-date">{{c.openAt}}</span></div>
            <div class="cpc-title">{{c.title}}</div>
          </div>
        </template>

        <div style="height:28px"></div>
      </div>
    </div>

    <sheet v-if="sheet" :model-value="sheet" title="封一封新的" sub="到期之前，连你自己也打不开" @update:model-value="sheet=false">
      <div class="field">
        <label>标题</label>
        <input class="input" v-model="form.title" maxlength="40" placeholder="给一年后的我们">
      </div>
      <div class="field" style="margin-top:14px">
        <label>内容</label>
        <textarea class="textarea" v-model="form.body" style="min-height:150px" placeholder="今天的样子、想说的话、猜不到的事。"></textarea>
      </div>
      <div class="field" style="margin-top:14px">
        <label>什么时候可以拆</label>
        <input class="input" type="date" v-model="form.openAt">
      </div>
      <template #footer>
        <button class="btn primary block" @click="save">封起来</button>
      </template>
    </sheet>

    <teleport to=".screen">
      <div v-if="view" class="cp-view" @click="view=null">
        <div class="cp-paper" @click.stop>
          <div class="cpp-top"><span>{{view.openAt}}</span><span>{{fmtDate(view.ts)}} 封</span></div>
          <div class="cpp-title">{{view.title}}</div>
          <div class="cpp-body">{{view.body}}</div>
          <div class="cpp-foot">
            <button class="btn sm ghost" @click="tear(view)">撕掉</button>
            <button class="btn sm" @click="view=null">收好</button>
          </div>
        </div>
      </div>
    </teleport>
  </div>`
};

/* ---------------- Words ---------------- */
US.Words = {
  data() {
    return { S, loading: true, words: [], total: 0, chars: 0, pick: null };
  },
  computed: {
    count() { return this.words.length; },
    top() { return this.words.slice().sort((a, b) => b.n - a.n).slice(0, 3); }
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        const msgs = await A.allMessages();
        this.total = msgs.length;
        this.chars = msgs.reduce((a, m) => a + U.stripTags(m.raw || '').length, 0);
        this.words = A.buildWordCloud(msgs, 46);
      } catch (e) {
        this.words = [];
      }
      this.loading = false;
    },
    shade(i) {
      const tones = ['#17171B', '#3A3A40', '#57575E', '#73737A', '#8E8E94', '#A6A6AB'];
      return tones[Math.min(tones.length - 1, Math.floor((i / Math.max(1, this.words.length)) * tones.length * 1.6))];
    },
    show(w) { this.pick = w; }
  },
  mounted() { this.load(); },
  template: `<div class="page">
    <nav-bar title=""></nav-bar>
    <div class="body">
      <div class="us-head tight">
        <div class="us-kicker"><span class="uk-en">words</span><span class="uk-no">{{total}} MSG</span></div>
        <div class="us-title sm">Words</div>
        <div class="us-sub">词云</div>
        <div class="us-desc">我们最常说的那些话，被时间称过重量。</div>
      </div>

      <div class="pad">
        <div class="wd-stats">
          <div class="wds"><div class="n">{{total}}</div><div class="l">条消息</div></div>
          <div class="wds"><div class="n">{{chars}}</div><div class="l">个字</div></div>
          <div class="wds"><div class="n">{{count}}</div><div class="l">个高频词</div></div>
        </div>

        <div class="wd-cloud" v-if="!loading && words.length" :class="{sparse: words.length < 18}">
          <span class="wd-w" v-for="(w,i) in words" :key="w.w"
                :style="{fontSize:w.size+'px', color:shade(i), opacity: 0.5 + w.weight*0.5}"
                @click="show(w)">{{w.w}}</span>
        </div>

        <div class="wd-empty" v-else-if="!loading">
          <div class="wde-t">还没有足够的对话</div>
          <div class="wde-s">多说几句，这里的词就会长出来。</div>
        </div>
        <div class="wd-empty" v-else><div class="wde-s">正在数…</div></div>

        <div class="wd-top" v-if="words.length">
          <div class="wdt-h">说得最多</div>
          <div class="wdt-row" v-for="(w,i) in top" :key="w.w">
            <span class="wdt-i">{{i+1}}</span>
            <span class="wdt-w">{{w.w}}</span>
            <span class="wdt-n">{{w.n}} 次</span>
          </div>
        </div>

        <div class="rm-hint" style="margin-top:18px">从本机所有聊天里数出来的，不上传。去掉语气词之后，剩下的就是我们的口癖。</div>
        <div style="height:28px"></div>
      </div>
    </div>

    <sheet v-if="pick" :model-value="!!pick" :title="pick.w" :sub="pick.n + ' 次'" @update:model-value="pick=null">
      <div class="wd-mean">这个词在这个月出现过 {{pick.n}} 次。它大概比你以为的更常出现。</div>
      <template #footer><button class="btn primary block" @click="pick=null">知道了</button></template>
    </sheet>
  </div>`
};

/* ---------------- Monthly ---------------- */
US.Monthly = {
  data() {
    return { S, offset: 0 };
  },
  computed: {
    st() { return A.monthStats(this.offset); },
    letter() { return A.monthLetter(this.st); },
    canNext() { return this.offset < 0; },
    bars() {
      const days = this.st.days || {};
      const n = new Date(this.st.y, this.st.m + 1, 0).getDate();
      const max = Math.max(1, ...Object.values(days));
      const out = [];
      for (let d = 1; d <= n; d++) {
        const k = this.st.y + '-' + (this.st.m + 1) + '-' + d;
        out.push({ d, v: days[k] || 0, p: Math.round(((days[k] || 0) / max) * 100) });
      }
      return out;
    }
  },
  methods: {
    fmtDate,
    prev() { this.offset -= 1; },
    next() { if (this.offset < 0) this.offset += 1; }
  },
  template: `<div class="page">
    <nav-bar title=""></nav-bar>
    <div class="body">
      <div class="us-head tight">
        <div class="us-kicker"><span class="uk-en">monthly</span><span class="uk-no">{{st.total}} MSG</span></div>
        <div class="us-title sm">Monthly</div>
        <div class="us-sub">月度回顾</div>
      </div>

      <div class="pad">
        <div class="mo-nav">
          <button class="mo-arrow" @click="prev"><ico name="chevronLeft" :size="14"/></button>
          <div class="mo-label">{{st.label}}<i v-if="st.isNow">本月</i></div>
          <button class="mo-arrow" :disabled="!canNext" @click="next"><ico name="chevronRight" :size="14"/></button>
        </div>

        <div class="mo-grid">
          <div class="mog"><div class="n">{{st.total}}</div><div class="l">消息</div></div>
          <div class="mog"><div class="n">{{st.active}}</div><div class="l">活跃天</div></div>
          <div class="mog"><div class="n">{{st.best}}</div><div class="l">最多一天</div></div>
          <div class="mog"><div class="n">{{st.diary}}</div><div class="l">日记</div></div>
          <div class="mog"><div class="n">{{st.mem}}</div><div class="l">新记忆</div></div>
          <div class="mog"><div class="n">{{st.active ? Math.round(st.total/st.active) : 0}}</div><div class="l">日均</div></div>
        </div>

        <div class="mo-chart">
          <div class="moc-h"><span>每天的说话量</span><span>{{st.label}}</span></div>
          <div class="moc-bars">
            <div class="moc-b" v-for="b in bars" :key="b.d" :title="b.d + ' 日 ' + b.v + ' 条'">
              <i :style="{height: Math.max(b.v?3:1, b.p) + '%'}" :class="{zero:!b.v}"></i>
            </div>
          </div>
          <div class="moc-x"><span>1</span><span>{{Math.ceil(bars.length/2)}}</span><span>{{bars.length}}</span></div>
        </div>

        <div class="mo-letter">
          <div class="mol-top"><span>一封信</span><span>{{st.label}}</span></div>
          <div class="mol-body">
            <p v-for="(l,i) in letter" :key="i">{{l}}</p>
          </div>
          <div class="mol-sign">— 写给你的</div>
        </div>

        <div class="rm-hint" style="margin-top:16px">数字来自本机的聊天统计。换账号会分开算。</div>
        <div style="height:28px"></div>
      </div>
    </div>
  </div>`
};

/* ---------------- Quota ---------------- */
US.Quota = {
  data() { return { S }; },
  computed: {
    u() { return S.cfg.extra.usage || { n: 0, fails: 0, inTok: 0, outTok: 0 }; },
    week() { return A.usageWeek(); },
    maxN() { return Math.max(1, ...this.week.map((d) => d.n)); },
    totalTok() { return (this.u.inTok || 0) + (this.u.outTok || 0); },
    avg() { return this.u.n ? Math.round(this.totalTok / this.u.n) : 0; },
    today() { return this.week[6] || { n: 0, tok: 0 }; },
    okRate() {
      const all = (this.u.n || 0) + (this.u.fails || 0);
      return all ? Math.round(((this.u.n || 0) / all) * 100) : 100;
    }
  },
  methods: {
    tok(n) {
      if (!n) return '0';
      if (n < 1000) return String(n);
      if (n < 1000000) return (n / 1000).toFixed(1) + 'K';
      return (n / 1000000).toFixed(2) + 'M';
    }
  },
  template: `<div class="page">
    <nav-bar title=""></nav-bar>
    <div class="body">
      <div class="us-head tight">
        <div class="us-kicker"><span class="uk-en">quota</span><span class="uk-no">{{okRate}}% OK</span></div>
        <div class="us-title sm">Quota</div>
        <div class="us-sub">额度</div>
        <div class="us-desc">这台手机问了模型多少次，花了多少字。</div>
      </div>

      <div class="pad">
        <div class="qt-hero">
          <div class="qh-cap">累计请求</div>
          <div class="qh-num">{{u.n || 0}}</div>
          <div class="qh-sub">今天 {{today.n}} 次 · 平均每次 {{tok(avg)}} token</div>
        </div>

        <div class="qt-week">
          <div class="qtw-h">最近七天</div>
          <div class="qtw-empty" v-if="!u.n && !u.fails">最近七天还没有请求。配好接口，随便聊两句，这里就开始记账。</div>
          <div class="qtw-bars" v-else>
            <div class="qtw-col" v-for="(d,i) in week" :key="d.key">
              <div class="qtw-n" v-if="d.n">{{d.n}}</div>
              <div class="qtw-track"><i :style="{height: Math.max(d.n?4:2, Math.round(d.n/this.maxN*100)) + '%'}"></i></div>
              <div class="qtw-l" :class="{today:i===6}">{{i===6?'今':d.label}}</div>
            </div>
          </div>
        </div>

        <div class="qt-rows">
          <div class="qtr"><span>输入</span><b>{{tok(u.inTok)}}</b></div>
          <div class="qtr"><span>输出</span><b>{{tok(u.outTok)}}</b></div>
          <div class="qtr"><span>合计</span><b>{{tok(totalTok)}}</b></div>
          <div class="qtr"><span>失败</span><b>{{u.fails || 0}}</b></div>
        </div>

        <div class="qt-note">
          token 优先用接口返回的真实用量；拿不到就按字数估（中文约 1.6 字一个 token）。
          这里不显示余额——不同中转站的计价方式不一样，只记你自己用了多少。
        </div>
        <div style="height:28px"></div>
      </div>
    </div>
  </div>`
};

window.US = US;
