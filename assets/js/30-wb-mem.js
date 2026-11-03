/* ============================================================
   World book & memory
   ============================================================ */
const WB = {};

WB.List = {
  props: { params: Object },
  data() { return { S, sheet: false, name: '', desc: '', scope: 'local', bind: this.params && this.params.charId ? this.params.charId : '' }; },
  computed: {
    char() { return this.bind ? A.charById(this.bind) : null; }
  },
  methods: {
    open(b) {
      if (this.bind) {
        const ch = A.charById(this.bind);
        ch.worldbookIds = ch.worldbookIds || [];
        const i = ch.worldbookIds.indexOf(b.id);
        if (i >= 0) ch.worldbookIds.splice(i, 1); else ch.worldbookIds.push(b.id);
        DB.put('characters', JSON.parse(JSON.stringify(ch)));
        A.toast(i >= 0 ? '已解除绑定' : '已绑定到 ' + ch.name);
        return;
      }
      A.go('worldbook.detail', { bookId: b.id });
    },
    async create() {
      if (!this.name.trim()) { A.toast('给这本世界书起个名字'); return; }
      const b = await A.saveBook({ name: this.name.trim(), desc: this.desc.trim(), scope: this.scope, entries: [] });
      this.sheet = false; this.name = ''; this.desc = ''; this.scope = 'local';
      A.go('worldbook.detail', { bookId: b.id });
    },
    counts(b) {
      const e = b.entries || [];
      return {
        all: e.length,
        pre: e.filter((x) => x.position === 'pre').length,
        mid: e.filter((x) => x.position === 'mid').length,
        post: e.filter((x) => x.position === 'post').length
      };
    },
    bound(b) { return this.char && (this.char.worldbookIds || []).includes(b.id); }
  },
  template: `<div class="page">
    <nav-bar title="">
      <template #right><button class="icon-btn" @click="sheet=true"><ico name="plus" :size="20"/></button></template>
    </nav-bar>
    <div class="body">
      <div class="app-head" style="padding-top:2px">
        <div class="ah-row">
          <div>
            <h1>World Books</h1>
            <div class="desc">把设定切成条目，按位置与条件注入。它们会真实进入提示词。</div>
          </div>
        </div>
      </div>

      <div v-if="char" class="card" style="margin:0 18px 14px;padding:12px 14px;display:flex;gap:10px;align-items:center;background:#F0F2EC;border-color:#E2E7DC">
        <ico name="link" :size="16" style="color:#6D7A66"/>
        <div class="grow" style="font-size:10.5px;color:#5C6B57;line-height:1.5">正在为 <b>{{char.name}}</b> 绑定世界书，点击卡片即可切换。</div>
      </div>

      <div class="pad">
        <div class="wb-card" v-for="b in S.worldbooks" :key="b.id" @click="open(b)" :style="bound(b)?{borderColor:'rgba(23,23,27,.28)'}:{}">
          <div class="wb-cover" :style="{background:b.cover || 'linear-gradient(155deg,#BDB6A6,#8C8679)'}">
            <span>{{b.name}}</span>
          </div>
          <div class="wb-main">
            <div>
              <div class="wb-title">{{b.name}}</div>
              <div class="wb-sub">{{b.desc || '没有写简介。加一些条目，让这个世界有重量。'}}</div>
            </div>
            <div class="wb-foot">
              <span class="tag">{{(b.entries||[]).length}} 条目</span>
              <span class="tag pre" v-if="counts(b).pre">前 {{counts(b).pre}}</span>
              <span class="tag mid" v-if="counts(b).mid">中 {{counts(b).mid}}</span>
              <span class="tag post" v-if="counts(b).post">后 {{counts(b).post}}</span>
              <span v-if="b.scope==='global'" class="tag on" style="margin-left:auto">全局生效</span>
              <span v-else-if="bound(b)" class="tag on" style="margin-left:auto">已绑定</span>
              <ico v-else name="chevronRight" :size="13" style="margin-left:auto;color:var(--muted-2)"/>
            </div>
          </div>
        </div>

        <div v-if="!S.worldbooks.length" class="empty">
          <div class="e-ico"><ico name="book" :size="22"/></div>
          <div class="e-title">世界还没有边界</div>
          <div class="e-sub">创建第一本世界书，把角色的世界、规则与秘密写进去。</div>
          <button class="btn sm" @click="sheet=true">新建世界书</button>
        </div>
      </div>
      <div style="height:24px"></div>
    </div>

    <sheet v-if="sheet" v-model="sheet" title="新建世界书" sub="之后可以继续添加条目">
      <div class="form-stack">
        <div class="field"><label>名称</label><input class="input" v-model="name" placeholder="如：雾港纪事"></div>
        <div class="field"><label>简介</label><textarea class="textarea" v-model="desc" placeholder="这个世界的气候、规则、正在发生的事。"></textarea></div>
        <div class="field"><label>生效范围</label>
          <seg :model-value="scope" @update:model-value="v=>scope=v" :options="[{value:'local',label:'手动绑定'},{value:'global',label:'全局生效'}]"/>
          <div class="helper" style="margin-top:7px">全局书对所有角色自动生效，适合放时代背景；手动绑定的书只在该角色的设定里出现。</div>
        </div>
      </div>
      <template #footer><button class="btn primary block" @click="create">创建</button></template>
    </sheet>
  </div>`
};

WB.Detail = {
  props: { params: Object },
  data() {
    return {
      S, sheet: false, editing: null,
      form: { name: '', keys: '', content: '', position: 'pre', mode: 'always', probability: 30, enabled: true },
      bookSheet: false, bookName: '', bookDesc: ''
    };
  },
  computed: {
    book() { return S.worldbooks.find((b) => b.id === this.params.bookId); },
    entries() { return this.book ? (this.book.entries || []) : []; }
  },
  mounted() {
    if (this.book) { this.bookName = this.book.name; this.bookDesc = this.book.desc || ''; }
  },
  methods: {
    openEntry(e) {
      this.editing = e || null;
      this.form = e ? { name: e.name, keys: (e.keys || []).join(', '), content: e.content, position: e.position, mode: e.mode, probability: e.probability || 30, enabled: e.enabled !== false }
        : { name: '', keys: '', content: '', position: 'pre', mode: 'always', probability: 30, enabled: true };
      this.sheet = true;
    },
    async saveEntry() {
      if (!this.form.name.trim() || !this.form.content.trim()) { A.toast('名称与内容不能为空'); return; }
      const data = {
        id: this.editing ? this.editing.id : U.uid('e'),
        name: this.form.name.trim(),
        keys: this.form.keys.split(/[,，\s]+/).filter(Boolean),
        content: this.form.content.trim(),
        position: this.form.position,
        mode: this.form.mode,
        probability: Number(this.form.probability) || 30,
        enabled: this.form.enabled
      };
      const e = this.book.entries || (this.book.entries = []);
      if (this.editing) Object.assign(this.editing, data);
      else e.push(data);
      await DB.put('worldbooks', JSON.parse(JSON.stringify(this.book)));
      this.sheet = false;
      A.toast('条目已保存');
    },
    async removeEntry(e) {
      if (!confirm('删除条目「' + e.name + '」？')) return;
      this.book.entries = this.entries.filter((x) => x.id !== e.id);
      await DB.put('worldbooks', JSON.parse(JSON.stringify(this.book)));
    },
    async toggle(e) {
      e.enabled = !e.enabled;
      await DB.put('worldbooks', JSON.parse(JSON.stringify(this.book)));
    },
    async saveBook() {
      this.book.name = this.bookName;
      this.book.desc = this.bookDesc;
      await DB.put('worldbooks', JSON.parse(JSON.stringify(this.book)));
      this.bookSheet = false;
      A.toast('已保存');
    },
    async removeBook() {
      if (!confirm('删除整本世界书？绑定关系会一并解除。')) return;
      await A.deleteBook(this.book.id);
      A.back();
    },
    modeLabel(e) { return e.mode === 'always' ? '始终注入' : e.mode === 'keyword' ? '关键词' : '概率 ' + (e.probability || 30) + '%'; },
    async toggleScope() {
      this.book.scope = this.book.scope === 'global' ? 'local' : 'global';
      await DB.put('worldbooks', JSON.parse(JSON.stringify(this.book)));
      A.toast(this.book.scope === 'global' ? '这本设定会对所有角色生效' : '改为手动绑定，只有绑定的角色会读到');
    }
  },
  template: `<div class="page">
    <nav-bar title="">
      <template #right>
        <button class="icon-btn" @click="bookSheet=true"><ico name="edit" :size="17"/></button>
        <button class="icon-btn" @click="openEntry(null)"><ico name="plus" :size="20"/></button>
      </template>
    </nav-bar>
    <div class="body" v-if="book">
      <div class="app-head" style="padding-bottom:10px">
        <div class="ah-row">
          <div>
            <div class="mark">WORLD BOOK</div>
            <h1 style="font-size:20px;margin-top:6px">{{book.name}}</h1>
            <div class="desc">{{book.desc || '尚未填写简介'}}</div>
          </div>
        </div>
        <div class="f g6" style="margin-top:12px">
          <span class="tag" :class="{on:book.scope==='global'}" style="cursor:pointer" @click="toggleScope">{{book.scope==='global'?'全局生效':'手动绑定'}}</span>
          <span class="tag">{{entries.length}} 个条目</span>
          <span class="tag pre">前置 {{entries.filter(e=>e.position==='pre').length}}</span>
          <span class="tag mid">中置 {{entries.filter(e=>e.position==='mid').length}}</span>
          <span class="tag post">后置 {{entries.filter(e=>e.position==='post').length}}</span>
        </div>
      </div>

      <div class="pad">
        <div class="entry" v-for="e in entries" :key="e.id" :class="{off:e.enabled===false}" @click="openEntry(e)">
          <div class="entry-top">
            <div class="entry-name">{{e.name}}</div>
            <toggle :model-value="e.enabled!==false" @update:model-value="toggle(e)" @click.stop/>
          </div>
          <div class="entry-keys" v-if="e.keys && e.keys.length"># {{e.keys.join(' · ')}}</div>
          <div class="entry-content">{{e.content}}</div>
          <div class="entry-tags">
            <span class="tag" :class="e.position">{{e.position==='pre'?'前置':e.position==='mid'?'中置':'后置'}}</span>
            <span class="tag">{{modeLabel(e)}}</span>
            <button class="tag" style="margin-left:auto;color:var(--muted-2);display:flex;align-items:center;gap:3px" @click.stop="removeEntry(e)"><ico name="trash" :size="9"/>删除</button>
          </div>
        </div>

        <div v-if="!entries.length" class="empty">
          <div class="e-ico"><ico name="file" :size="22"/></div>
          <div class="e-title">还没有条目</div>
          <div class="e-sub">一条设定、一段规则、一个只有你知道的秘密。</div>
          <button class="btn sm" @click="openEntry(null)">添加条目</button>
        </div>
        <button class="btn ghost block" style="margin-top:8px;color:var(--danger)" @click="removeBook">删除这本世界书</button>
      </div>
      <div style="height:26px"></div>
    </div>

    <sheet v-if="sheet" v-model="sheet" :title="editing?'编辑条目':'新建条目'" sub="位置决定它被拼接到提示词的哪一段">
      <div class="form-stack">
        <div class="field"><label>条目名称</label><input class="input" v-model="form.name" placeholder="如：雾港的潮汐规则"></div>
        <div class="field"><label>关键词（逗号分隔）</label><input class="input" v-model="form.keys" placeholder="潮汐, 雾, 港口"></div>
        <div class="field"><label>内容</label><textarea class="textarea" v-model="form.content" style="min-height:120px" placeholder="会被真实注入到提示词里的文本。"></textarea></div>
        <div class="field"><label>插入位置</label>
          <seg v-model="form.position" :options="[{value:'pre',label:'前置'},{value:'mid',label:'中置'},{value:'post',label:'后置'}]"/>
        </div>
        <div class="field"><label>注入方式</label>
          <seg v-model="form.mode" :options="[{value:'always',label:'始终'},{value:'keyword',label:'关键词'},{value:'random',label:'概率'}]"/>
        </div>
        <div class="field" v-if="form.mode==='random'">
          <label>触发概率 · {{form.probability}}%</label>
          <input type="range" min="5" max="100" step="5" v-model.number="form.probability" style="width:100%">
        </div>
      </div>
      <template #footer><button class="btn primary block" @click="saveEntry">保存条目</button></template>
    </sheet>

    <sheet v-if="bookSheet" v-model="bookSheet" title="世界书信息">
      <div class="form-stack">
        <div class="field"><label>名称</label><input class="input" v-model="bookName"></div>
        <div class="field"><label>简介</label><textarea class="textarea" v-model="bookDesc"></textarea></div>
      </div>
      <template #footer><button class="btn primary block" @click="saveBook">保存</button></template>
    </sheet>
  </div>`
};

/* ============================================================
   Memory
   ============================================================ */
const MEM = {};

MEM.Page = {
  props: { params: Object },
  data() {
    return {
      S, tab: 'short', sel: '', detail: null, detailMsgs: [], addSheet: false,
      form: { title: '', content: '', keywords: '' }, apiSheet: false
    };
  },
  computed: {
    chars() { return S.chars.filter((c) => A.charMemories(c.id).length || A.chatOfChar(c.id)); },
    char() { return A.charById(this.sel) || S.chars[0] || null; },
    chat() { return this.char ? A.chatOfChar(this.char.id) : null; },
    list() { return this.char ? A.charMemories(this.char.id, this.tab) : []; },
    shortCount() { return this.char ? A.charMemories(this.char.id, 'short').length : 0; },
    indexCount() { return this.char ? A.charMemories(this.char.id, 'index').length : 0; },
    permCount() { return this.char ? A.charMemories(this.char.id, 'permanent').length : 0; },
    apiName() {
      const id = S.cfg.memory.apiId;
      if (id === 'inherit' || !id) return '跟随角色配置';
      const a = S.cfg.api.find((x) => x.id === id);
      return a ? a.name : '跟随角色配置';
    }
  },
  async mounted() {
    this.sel = (this.params && this.params.charId) || (this.chars[0] && this.chars[0].id) || (S.chars[0] && S.chars[0].id) || '';
    if (this.chat) await A.loadMessages(this.chat.id);
  },
  methods: {
    async summarize() {
      if (!this.chat) { A.toast('这个角色还没有聊天记录'); return; }
      await A.summarize(this.chat);
    },
    step(d) {
      const v = Math.max(10, Math.min(300, (S.cfg.memory.threshold || 50) + d));
      S.cfg.memory.threshold = v;
      saveCfg();
    },
    async drill(m) {
      this.detail = m;
      const all = this.chat ? await A.loadMessages(this.chat.id) : [];
      this.detailMsgs = (m.msgIds || []).map((id) => all.find((x) => x.id === id)).filter(Boolean);
      if (!this.detailMsgs.length && m.shortId) {
        const short = S.memories.find((x) => x.id === m.shortId);
        if (short) this.detailMsgs = all.filter((x) => x.seq >= short.range[0] && x.seq <= short.range[1]);
      }
    },
    async add() {
      if (!this.form.title.trim() || !this.form.content.trim()) { A.toast('标题与内容不能为空'); return; }
      await A.addMemory({
        charId: this.char.id, type: 'permanent', title: this.form.title.trim(),
        content: this.form.content.trim(), keywords: this.form.keywords.split(/[,，\s]+/).filter(Boolean), pinned: true
      });
      this.addSheet = false;
      this.form = { title: '', content: '', keywords: '' };
      this.tab = 'permanent';
      A.toast('已写入永久记忆');
    },
    remove(m) { A.deleteMemory(m.id); },
    async summarizeOne(m) {
      if (!this.chat) return;
      await A.summarize(this.chat);
    }
  },
  template: `<div class="page">
    <nav-bar title="记忆">
      <template #right>
        <button class="icon-btn" @click="apiSheet=true"><ico name="cpu" :size="18"/></button>
        <button class="icon-btn" @click="addSheet=true"><ico name="plus" :size="20"/></button>
      </template>
    </nav-bar>
    <div class="body">
      <div v-if="S.chars.length>1" class="f g6" style="padding:2px 18px 10px;overflow-x:auto;scrollbar-width:none">
        <button v-for="c in S.chars" :key="c.id" class="chip" :class="{on:sel===c.id}" @click="sel=c.id">
          <av :file-key="c.avatarKey" :name="c.name" :size="16" style="margin-left:-2px"/>{{c.name}}
        </button>
      </div>

      <template v-if="char">
        <div class="mem-summary">
          <div class="ms-t">MEMORY OF {{char.name}}</div>
          <div class="f" style="align-items:flex-end;gap:10px">
            <div class="ms-n">{{shortCount + indexCount + permCount}}</div>
            <div class="ms-s" style="padding-bottom:4px">短时 {{shortCount}} · 索引 {{indexCount}} · 永久 {{permCount}}</div>
          </div>
          <div class="ms-s">记忆会在总结后自动绑定主题；索引记忆默认不带原文，需要下钻。</div>
          <div class="ms-actions">
            <button class="ms-btn solid" @click="summarize"><ico name="sparkle" :size="12"/>一键总结</button>
            <button class="ms-btn" @click="apiSheet=true"><ico name="cpu" :size="12"/>{{apiName}}</button>
          </div>
        </div>

        <div class="pad">
          <div class="threshold">
            <div class="grow">
              <div style="font-size:11.5px;font-weight:600">短时记忆阈值</div>
              <div class="helper" style="margin-top:3px">每积累 N 条消息自动总结一次</div>
            </div>
            <div class="stepper">
              <button @click="step(-10)"><ico name="minus" :size="11"/></button>
              <span>{{S.cfg.memory.threshold}}</span>
              <button @click="step(10)"><ico name="plus" :size="11"/></button>
            </div>
          </div>

          <seg v-model="tab" :options="[{value:'short',label:'短时'},{value:'index',label:'索引'},{value:'permanent',label:'永久'}]" style="margin-bottom:12px"/>

          <template v-if="tab==='short'">
            <div class="mem-card" v-for="m in list" :key="m.id">
              <div class="mt"><ico name="clock" :size="13"/>{{m.title}}</div>
              <div class="mc">{{m.content}}</div>
              <div class="mf"><span>{{U.rel(m.ts)}}</span><span class="dot-sep"></span><span>消息 #{{m.range?m.range[0]:'-'}} - #{{m.range?m.range[1]:'-'}}</span></div>
            </div>
            <empty v-if="!list.length" icon="clock" title="还没有短时记忆" sub="聊到阈值后会自动总结，也可以点上面的「一键总结」。"/>
          </template>

          <template v-else-if="tab==='index'">
            <div class="mem-card" v-for="m in list" :key="m.id">
              <div class="mt"><ico name="sparkle" :size="13"/>{{m.title}}
                <span class="tag" style="margin-left:auto">{{(m.msgIds||[]).length}} 段原文</span>
              </div>
              <div class="mc">{{m.content}}</div>
              <div class="entry-tags" v-if="m.keywords && m.keywords.length">
                <span class="tag" v-for="k in m.keywords" :key="k">#{{k}}</span>
              </div>
              <div class="mf">
                <span>{{U.rel(m.ts)}}</span>
                <button class="chip" style="margin-left:auto;height:22px" @click="drill(m)"><ico name="layers" :size="10"/>下钻原始记忆</button>
                <button class="chip" style="height:22px" @click="remove(m)">删除</button>
              </div>
            </div>
            <empty v-if="!list.length" icon="sparkle" title="还没有主题记忆" sub="总结聊天时，会自动归纳主题并绑定原始记录。"/>
          </template>

          <template v-else>
            <div class="mem-card pin" v-for="m in list" :key="m.id">
              <div class="mt"><ico name="pin" :size="13"/>{{m.title}}<span class="tag on" style="margin-left:auto">永久</span></div>
              <div class="mc">{{m.content}}</div>
              <div class="mf"><span>{{U.rel(m.ts)}}</span><button class="chip" style="margin-left:auto;height:22px" @click="remove(m)">删除</button></div>
            </div>
            <empty v-if="!list.length" icon="pin" title="还没有永久记忆" sub="角色的人格底色、对你的态度、纪念日，都可以放在这里。"/>
          </template>
        </div>
      </template>
      <empty v-else icon="memory" title="还没有角色" sub="先去档案创建一个角色，记忆才有归属。"/>
      <div style="height:26px"></div>
    </div>

    <sheet v-if="addSheet" v-model="addSheet" title="写入永久记忆" sub="这类记忆会一直进入提示词">
      <div class="form-stack">
        <div class="field"><label>标题</label><input class="input" v-model="form.title" placeholder="如：他记得的那场雨"></div>
        <div class="field"><label>内容</label><textarea class="textarea" v-model="form.content" placeholder="写清楚事实与情感态度。"></textarea></div>
        <div class="field"><label>关键词</label><input class="input" v-model="form.keywords" placeholder="雨, 车站, 纪念日"></div>
      </div>
      <template #footer><button class="btn primary block" @click="add">保存</button></template>
    </sheet>

    <sheet v-if="apiSheet" v-model="apiSheet" title="记忆专用 API" sub="总结与记忆归纳会使用这里的配置">
      <div class="group">
        <div class="row tap" @click="S.cfg.memory.apiId='inherit';saveCfg(true);apiSheet=false">
          <div class="row-main"><div class="row-title">跟随角色配置</div><div class="row-sub">使用角色绑定的接口</div></div>
          <ico v-if="S.cfg.memory.apiId==='inherit'" name="check" :size="15"/>
        </div>
        <div class="row tap" v-for="a in S.cfg.api" :key="a.id" @click="S.cfg.memory.apiId=a.id;saveCfg(true);apiSheet=false">
          <div class="row-ico"><ico name="cpu" :size="14"/></div>
          <div class="row-main"><div class="row-title">{{a.name}}</div><div class="row-sub">{{a.model}}</div></div>
          <ico v-if="S.cfg.memory.apiId===a.id" name="check" :size="15"/>
        </div>
      </div>
      <div v-if="!S.cfg.api.length" class="helper" style="text-align:center;padding:16px">还没有 API 配置，去设置里添加。</div>
    </sheet>

    <sheet v-if="!!detail" :model-value="!!detail" @update:model-value="detail=null" title="原始记忆" :sub="detail?detail.title:''" tall>
      <div class="trace" v-for="m in detailMsgs" :key="m.id" style="background:#fff">
        <div class="trace-t">{{m.role==='user'?'用户':'角色'}} · {{U.fullTime(m.ts)}} · #{{m.seq}}</div>
        <div style="white-space:pre-wrap">{{U.stripTags(m.raw)}}</div>
      </div>
      <div v-if="!detailMsgs.length" class="helper" style="text-align:center;padding:24px">没有找到绑定的原始消息。</div>
    </sheet>
  </div>`
};
