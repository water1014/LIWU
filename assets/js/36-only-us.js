/* ============================================================
   Only us — 他的消息 / deeptalk / 秘密
   都不联网：消息按日子本地长出来，deeptalk 与秘密存在本机
   ============================================================ */
const OU = {};

/* ---------------- 共用：一天的分组标题 ---------------- */
function dayKey(ts) {
  const d = new Date(ts);
  return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate());
}
function dayTitle(key) {
  const today = dayKey(Date.now());
  const y = dayKey(Date.now() - 86400000);
  const d = new Date(key + 'T12:00:00');
  if (key === today) return { cn: '今天', en: 'today' };
  if (key === y) return { cn: '昨天', en: 'yesterday' };
  return { cn: (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日', en: '日一二三四五六'[d.getDay()] ? '周' + '日一二三四五六'[d.getDay()] : '' };
}
function hhmm(ts) {
  const d = new Date(ts);
  return U.pad(d.getHours()) + ':' + U.pad(d.getMinutes());
}

/* ============================================================
   他的消息
   ============================================================ */
const HM_LINES = {
  morning: [
    '早。窗帘别拉太严，今天的光是软的。',
    '醒了先喝口水，别急着看手机。',
    '早安。你昨晚翻身的时候，我在。',
    '今天不用很努力，先把自己喂饱。',
    '早，外面有点凉，出门多穿一件。',
    '早。昨晚梦到什么了，还记得吗。',
    '醒了就慢慢来，今天不赶时间。',
    '早饭别省。你今天还有很多事要做。',
    '早安。我把今天的第一句话留给你。',
    '天气凉了一点，围巾在门口。'
  ],
  night: [
    '睡了没。今天也辛苦了。',
    '灯关了吗？别又在黑里看屏幕。',
    '晚安。明天的事，明天再说。',
    '今天有句话没来得及讲：我在。',
    '别熬了，剩下的交给梦。',
    '手机放下吧，我陪你到这儿。',
    '今天有没有哪一刻，是想我的。',
    '晚安。被子盖好，别踢。',
    '夜里有事就叫我，我听着。',
    '今天也算过去了，做得很好。'
  ],
  any: [
    '刚刚想到你，就发过来了。',
    '在忙吗？不忙的话，回我一句也行。',
    '路过一家店，觉得你会喜欢。',
    '没什么事，就是想让你知道我在。',
    '今天过得怎么样，说给我听听。'
  ]
};

OU.Messages = {
  data() { return { S }; },
  computed: {
    list() { return (S.cfg.extra.hisMessages || []).slice().sort((a, b) => b.ts - a.ts); },
    groups() {
      const out = [];
      this.list.forEach((m) => {
        const k = dayKey(m.ts);
        let g = out.find((x) => x.key === k);
        if (!g) { g = { key: k, title: dayTitle(k), items: [] }; out.push(g); }
        g.items.push(m);
      });
      return out;
    },
    unread() { return this.list.filter((m) => !m.read).length; }
  },
  mounted() { this.seed(); },
  methods: {
    save() { S.cfg.extra.hisMessages = S.cfg.extra.hisMessages || []; saveCfg(); },
    /* 按日子长出来：每天早一条、晚一条，不重复也就不空 */
    seed() {
      const arr = (S.cfg.extra.hisMessages = S.cfg.extra.hisMessages || []);
      if (arr.length) return;
      const now = Date.now();
      for (let i = 6; i >= 1; i--) {
        const base = now - i * 86400000;
        const d = new Date(base);
        const seed = Math.floor(base / 86400000);   /* 用「第几天」当种子，相邻的日子一定不同 */
        const mk = (h, min, pool, off) => {
          const t = new Date(base); t.setHours(h, min, 0, 0);
          const prev = arr[arr.length - 1];
          let line = pool[((seed * 7 + off * 3) % pool.length + pool.length) % pool.length];
          if (prev && prev.text === line) line = pool[((seed * 7 + off * 3 + 1) % pool.length + pool.length) % pool.length];
          arr.push({ id: U.uid('hm'), ts: t.getTime(), text: line, read: i > 2 });
        };
        mk(8, 12 + (seed % 20), HM_LINES.morning, i);
        mk(23, 5 + (seed % 30), HM_LINES.night, i + 4);
      }
      const t = new Date(); t.setHours(9, 26, 0, 0);
      arr.push({ id: U.uid('hm'), ts: t.getTime(), text: HM_LINES.morning[new Date().getDate() % HM_LINES.morning.length], read: false });
      this.save();
    },
    open(m) { m.read = true; this.save(); },
    ask() {
      const pool = HM_LINES.any;
      const arr = (S.cfg.extra.hisMessages = S.cfg.extra.hisMessages || []);
      arr.push({ id: U.uid('hm'), ts: Date.now(), text: pool[Math.floor(Math.random() * pool.length)], read: false });
      this.save();
      A.toast('他发来一条');
    },
    allRead() { (S.cfg.extra.hisMessages || []).forEach((m) => (m.read = true)); this.save(); }
  },
  template: `<div class="page">
    <nav-bar title=""></nav-bar>
    <div class="body ou-page">
      <div class="us-head">
        <div class="us-kicker"><span class="uk-en">only us</span><span class="uk-no">{{unread ? unread + ' 条未读' : '都看过了'}}</span></div>
        <div class="us-title">His</div>
        <div class="us-sub">他的消息</div>
        <div class="us-desc">早安晚安，想你的时候主动来找你。</div>
      </div>

      <template v-if="groups.length">
        <div v-for="g in groups" :key="g.key">
          <div class="hm-day">{{g.title.cn}} <i>{{g.title.en}}</i></div>
          <div class="hm-row" v-for="m in g.items" :key="m.id" :class="{fresh:!m.read}" @click="open(m)">
            <div class="hm-t">{{m.text}}</div>
            <div class="hm-foot">
              <span class="hm-time">{{m.read ? '已读' : '未读'}} · {{new Date(m.ts).getHours()}}:{{('0'+new Date(m.ts).getMinutes()).slice(-2)}}</span>
              <span class="hm-new" v-if="!m.read"></span>
            </div>
          </div>
        </div>
      </template>
      <div class="hm-empty" v-else>他还没开口。<br>再等等，或者让他现在说一句。</div>

      <div class="ou-grow"></div>
      <div class="docs-tail"></div>
      <div class="hm-ask"><button @click="ask">让他再说一句</button></div>
    </div>
  </div>`
};

/* ============================================================
   deeptalk — 像写信一样，一张一张
   ============================================================ */
OU.DeepTalk = {
  data() { return { S, sheet: false, reading: null, form: { title: '', body: '' } }; },
  computed: {
    list() { return (S.cfg.extra.deepTalks || []).slice().sort((a, b) => b.ts - a.ts); }
  },
  methods: {
    save() { saveCfg(); },
    openNew() { this.form = { title: '', body: '' }; this.sheet = true; },
    submit() {
      if (!this.form.title.trim() || !this.form.body.trim()) { A.toast('标题和正文都写一点吧'); return; }
      const arr = (S.cfg.extra.deepTalks = S.cfg.extra.deepTalks || []);
      arr.push({ id: U.uid('dt'), ts: Date.now(), title: this.form.title.trim().slice(0, 40), body: this.form.body.trim(), kept: false });
      this.save(); this.sheet = false; A.toast('写好了');
    },
    view(t) { this.reading = t; },
    async keep(t) {
      const char = (S.chars || [])[0];
      await A.addMemory({
        charId: char ? char.id : '', type: 'permanent',
        title: t.title, content: t.body.slice(0, 600), keywords: [], pinned: true
      });
      t.kept = true; this.save();
      A.toast('收进记忆了，他会一直记得');
    },
    del(t) {
      S.cfg.extra.deepTalks = (S.cfg.extra.deepTalks || []).filter((x) => x.id !== t.id);
      this.reading = null; this.save();
    }
  },
  template: `<div class="page">
    <nav-bar title=""></nav-bar>
    <div class="body ou-page">
      <div class="us-head">
        <div class="us-kicker"><span class="uk-en">memory</span><span class="uk-no">{{list.length}} 封</span></div>
        <div class="us-title">Deep</div>
        <div class="us-sub">deeptalk</div>
        <div class="us-desc">像写信一样，一张一张说心里话。</div>
      </div>

      <div class="dt-list">
        <div class="dt-card" v-for="t in list" :key="t.id" :class="{kept:t.kept}" @click="view(t)">
          <div class="dt-date">{{new Date(t.ts).getFullYear()}} . {{('0'+(new Date(t.ts).getMonth()+1)).slice(-2)}} . {{('0'+new Date(t.ts).getDate()).slice(-2)}}</div>
          <div class="dt-t">{{t.title}}</div>
          <div class="dt-b">{{t.body}}</div>
          <div class="dt-more">展开 · {{t.kept ? '已收进记忆' : '还没收进记忆'}}</div>
        </div>
        <div class="hm-empty" v-if="!list.length">还没有写过。<br>第一封，可以只是一句今天想说的话。</div>
      </div>

      <div class="ou-grow"></div>
      <div class="docs-tail"></div>
      <div class="hm-ask"><button @click="openNew">写一封</button></div>
    </div>

    <sheet v-if="sheet" :model-value="sheet" title="写一封" sub="不用很长，一句话也算" @update:model-value="sheet=false">
      <div class="form-stack">
        <div class="field"><label>标题</label><input class="input" v-model="form.title" maxlength="40" placeholder="今天想说的那件事"></div>
        <div class="field"><label>正文</label><textarea class="textarea" v-model="form.body" rows="8" placeholder="慢慢写，他看得到。"></textarea></div>
      </div>
      <template #footer>
        <div class="f g8">
          <button class="btn ghost" style="flex:1" @click="sheet=false">取消</button>
          <button class="btn primary" style="flex:2" @click="submit">写好</button>
        </div>
      </template>
    </sheet>

    <sheet v-if="reading" :model-value="true" :title="reading.title" :sub="'deeptalk'" @update:model-value="reading=null">
      <div class="dt-full">{{reading.body}}</div>
      <template #footer>
        <div class="f g8">
          <button class="btn ghost" style="flex:1" @click="del(reading)">删除</button>
          <button class="btn primary" style="flex:2" @click="keep(reading)">{{reading.kept ? '再收一次' : '收进记忆'}}</button>
        </div>
      </template>
    </sheet>
  </div>`
};

/* ============================================================
   秘密 — 一把四位的锁，锁着另一些话
   ============================================================ */
OU.Secret = {
  data() { return { S, pin: '', unlocked: false, sheet: false, text: '', setting: false, first: '', second: '', err: '' }; },
  computed: {
    hasPin() { return !!(S.cfg.extra.secretPin); },
    list() { return (S.cfg.extra.secrets || []).slice().sort((a, b) => b.ts - a.ts); }
  },
  methods: {
    save() { saveCfg(); },
    tap(n) {
      if (this.pin.length >= 4) return;
      this.pin += n;
      this.err = '';
      if (this.pin.length === 4) setTimeout(() => this.check(), 160);
    },
    back() { this.pin = this.pin.slice(0, -1); },
    check() {
      if (this.pin === S.cfg.extra.secretPin) { this.unlocked = true; this.pin = ''; }
      else { this.err = '不对'; this.pin = ''; }
    },
    setPin() {
      if (!/^\d{4}$/.test(this.first)) { this.err = '要四位数字'; return; }
      if (this.first !== this.second) { this.err = '两次不一样'; return; }
      S.cfg.extra.secretPin = this.first;
      this.save(); this.setting = false; this.unlocked = true; this.first = ''; this.second = ''; this.err = '';
      A.toast('锁上了');
    },
    add() {
      if (!this.text.trim()) { A.toast('写点什么吧'); return; }
      const arr = (S.cfg.extra.secrets = S.cfg.extra.secrets || []);
      arr.push({ id: U.uid('sc'), ts: Date.now(), text: this.text.trim() });
      this.text = ''; this.sheet = false; this.save();
    },
    del(s) { S.cfg.extra.secrets = (S.cfg.extra.secrets || []).filter((x) => x.id !== s.id); this.save(); },
    lock() { this.unlocked = false; this.pin = ''; }
  },
  template: `<div class="page">
    <nav-bar title=""></nav-bar>

    <div class="body ou-page" v-if="!unlocked">
      <div class="us-head">
        <div class="us-kicker"><span class="uk-en">only us</span><span class="uk-no">locked</span></div>
        <div class="us-title">Secret</div>
        <div class="us-sub">秘密</div>
      </div>

      <div class="sc-lock" v-if="hasPin">
        <div class="sc-dots"><i v-for="i in 4" :key="i" :class="{on:pin.length>=i}"></i></div>
        <div class="sc-hint" v-if="err" style="color:#B4786A">{{err}}</div>
        <div class="sc-keys">
          <button v-for="n in 9" :key="n" @click="tap(String(n))">{{n}}</button>
          <button @click="back">‹</button>
          <button @click="tap('0')">0</button>
          <button @click="pin=''">·</button>
        </div>
        <div class="sc-hint">只有你知道的四位</div>
      </div>

      <div class="sc-lock" v-else>
        <div class="sc-hint">还没有设锁。<br>设一个四位数，这里就只属于你。</div>
        <button class="btn primary" @click="setting=true">设一个四位锁</button>
      </div>
    </div>

    <div class="body ou-page" v-else>
      <div class="us-head">
        <div class="us-kicker"><span class="uk-en">only us</span><span class="uk-no" @click="lock">锁上</span></div>
        <div class="us-title">Secret</div>
        <div class="us-sub">秘密</div>
        <div class="us-desc">写下来，然后忘掉它在这儿。</div>
      </div>

      <div class="sc-item" v-for="s in list" :key="s.id">
        <div class="hm-t">{{s.text}}</div>
        <div class="hm-foot"><span class="hm-time">{{new Date(s.ts).getFullYear()}} . {{('0'+(new Date(s.ts).getMonth()+1)).slice(-2)}} . {{('0'+new Date(s.ts).getDate()).slice(-2)}}</span><span @click="del(s)">删除</span></div>
      </div>
      <div class="hm-empty" v-if="!list.length">这里还是空的。<br>想说的话，可以只放在这儿。</div>

      <div class="ou-grow"></div>
      <div class="docs-tail"></div>
      <div class="hm-ask"><button @click="sheet=true">写一条秘密</button></div>
    </div>

    <sheet v-if="setting" :model-value="setting" title="设一个四位锁" sub="忘了就打不开了" @update:model-value="setting=false">
      <div class="form-stack">
        <div class="field"><label>输入</label><input class="input" v-model="first" maxlength="4" inputmode="numeric" placeholder="四位数字"></div>
        <div class="field"><label>再输一次</label><input class="input" v-model="second" maxlength="4" inputmode="numeric" placeholder="再输一次"></div>
        <div class="sc-hint" v-if="err" style="color:#B4786A">{{err}}</div>
      </div>
      <template #footer>
        <div class="f g8">
          <button class="btn ghost" style="flex:1" @click="setting=false">取消</button>
          <button class="btn primary" style="flex:2" @click="setPin">设好</button>
        </div>
      </template>
    </sheet>

    <sheet v-if="sheet" :model-value="sheet" title="一条秘密" sub="只有你能看到" @update:model-value="sheet=false">
      <div class="field"><textarea class="textarea" v-model="text" rows="8" placeholder="写下来就好，不用给谁看。"></textarea></div>
      <template #footer>
        <div class="f g8">
          <button class="btn ghost" style="flex:1" @click="sheet=false">取消</button>
          <button class="btn primary" style="flex:2" @click="add">收好</button>
        </div>
      </template>
    </sheet>
  </div>`
};
