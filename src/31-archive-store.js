/* ============================================================
   Archive · Store · Notices
   ============================================================ */
const ARCH = {};

ARCH.List = {
  data() { return { S }; },
  methods: {
    async startChat(c) {
      const chat = await A.ensureChat(c.id);
      A.go('chat.room', { chatId: chat.id });
    },
    memories(c) { return A.charMemories(c.id).length; },
    books(c) { return (c.worldbookIds || []).length; }
  },
  template: `<div class="page">
    <nav-bar title="">
      <template #right><button class="icon-btn" @click="A.go('archive.edit')"><ico name="plus" :size="20"/></button></template>
    </nav-bar>
    <div class="body">
      <div class="app-head" style="padding-top:2px">
        <div class="ah-row">
          <div>
            <h1>Characters</h1>
            <div class="desc">角色在这里出生。头像、人设与禁忌，会决定他们怎么说话。</div>
          </div>
          <div class="mark">{{S.chars.length}} FILES</div>
        </div>
      </div>
      <div class="pad">
        <div class="char-card" v-for="c in S.chars" :key="c.id" @click="A.go('archive.edit',{charId:c.id})">
          <av :file-key="c.avatarKey" :name="c.name" :size="50" radius="16px"/>
          <div class="grow" style="min-width:0">
            <div class="char-name">{{c.name}} <span class="tag">{{c.gender}}</span></div>
            <div class="char-meta">No. {{c.code}}</div>
            <div class="char-tags">
              <span class="tag" v-if="c.mbti">{{c.mbti}}</span>
              <span class="tag">{{memories(c)}} 记忆</span>
              <span class="tag">{{books(c)}} 世界书</span>
            </div>
          </div>
          <button class="btn sm" @click.stop="startChat(c)">聊天</button>
        </div>

        <div v-if="!S.chars.length" class="empty">
          <div class="e-ico"><ico name="archive" :size="22"/></div>
          <div class="e-title">档案柜是空的</div>
          <div class="e-sub">创建一个角色，给他一个名字、一张脸和一段不愿被人知道的事。</div>
          <button class="btn sm" @click="A.go('archive.edit')">创建角色</button>
        </div>
      </div>
      <div style="height:26px"></div>
    </div>
  </div>`
};

ARCH.Edit = {
  props: { params: Object },
  data() {
    return {
      S, more: true, saving: false, worldSheet: false, apiSheet: false,
      form: {
        avatarKey: '', name: '', gender: '女', persona: '', jung: '', mbti: '',
        background: '', taboos: '', examples: '', greeting: ''
      },
      worldbookIds: [], apiId: 'inherit'
    };
  },
  computed: {
    editing() { return !!(this.params && this.params.charId); },
    char() { return this.editing ? A.charById(this.params.charId) : null; },
    apiName() {
      if (this.apiId === 'inherit' || !this.apiId) return '跟随全局';
      const a = S.cfg.api.find((x) => x.id === this.apiId);
      return a ? a.name : '跟随全局';
    }
  },
  mounted() {
    if (this.char) {
      Object.keys(this.form).forEach((k) => { this.form[k] = this.char[k] || this.form[k]; });
      this.worldbookIds = [...(this.char.worldbookIds || [])];
      this.apiId = this.char.apiId || 'inherit';
    }
  },
  methods: {
    async pickAvatar() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = async () => {
        if (!input.files[0]) return;
        if (this.editing && this.form.avatarKey) {
          this.form.avatarKey = await A.replaceImage(this.form.avatarKey, input.files[0]);
          await A.resolveImg(this.form.avatarKey);
        } else {
          this.form.avatarKey = await A.uploadImage(input.files[0]);
          await A.resolveImg(this.form.avatarKey);
        }
      };
      input.click();
    },
    async save() {
      this.saving = true;
      try {
        const c = await A.saveCharacter(Object.assign({}, this.form, {
          worldbookIds: this.worldbookIds, apiId: this.apiId
        }), this.editing ? this.char.id : null);
        A.toast(this.editing ? '档案已更新' : '角色已创建 · 通讯号 ' + c.code);
        A.back();
      } catch (e) { A.toast(e.message); }
      this.saving = false;
    },
    async remove() {
      if (!confirm('删除角色「' + this.char.name + '」以及全部聊天与记忆？')) return;
      await A.deleteCharacter(this.char.id);
      A.toast('已删除');
      A.back();
    },
    toggleBook(id) {
      const i = this.worldbookIds.indexOf(id);
      if (i >= 0) this.worldbookIds.splice(i, 1); else this.worldbookIds.push(id);
    },
    copyCode() {
      navigator.clipboard && navigator.clipboard.writeText(String(this.char.code));
      A.toast('通讯号已复制');
    }
  },
  template: `<div class="page">
    <nav-bar :title="editing?'编辑角色':'新建角色'">
      <template #right><button class="txt" :disabled="saving" @click="save">保存</button></template>
    </nav-bar>
    <div class="body pad">
      <div v-if="editing" class="card" style="padding:14px;margin:6px 0 16px;display:flex;align-items:center;gap:10px">
        <ico name="at" :size="16" style="color:var(--muted)"/>
        <div class="grow">
          <div style="font-size:10px;color:var(--muted);letter-spacing:.06em">通讯号</div>
          <div class="mono" style="font-size:14px;letter-spacing:.14em;margin-top:2px">{{char.code}}</div>
        </div>
        <button class="btn sm" @click="copyCode">复制</button>
      </div>

      <div class="upload-row" style="margin-bottom:16px">
        <div class="up-box" :style="form.avatarKey&&S.imgCache[form.avatarKey]?{backgroundImage:'url('+S.imgCache[form.avatarKey]+')',border:'none'}:{}" @click="pickAvatar">
          <template v-if="!form.avatarKey"><ico name="camera" :size="18"/><span>头像</span></template>
        </div>
        <div class="grow">
          <div style="font-size:12px;font-weight:600">角色头像</div>
          <div class="helper" style="margin-top:4px">必填。建议使用清晰的正方形图片，会压缩为 Blob 存入本地。</div>
          <button class="btn sm" style="margin-top:9px" @click="pickAvatar">{{form.avatarKey?'更换':'上传'}}</button>
        </div>
      </div>

      <div class="form-stack">
        <div class="field"><label>姓名</label><input class="input" v-model="form.name" placeholder="角色的名字"></div>
        <div class="field"><label>性别</label>
          <div class="gender-row">
            <button v-for="g in ['女','男','其他']" :key="g" :class="{on:form.gender===g}" @click="form.gender=g">{{g}}</button>
          </div>
        </div>
        <div class="field"><label>人设 · 无字数上限</label>
          <textarea class="textarea" v-model="form.persona" style="min-height:150px" placeholder="他是谁，如何说话，如何看待世界，如何看待你。"></textarea>
          <div class="helper">{{form.persona.length}} 字</div>
        </div>
      </div>

      <div class="section" style="padding:0;margin-top:18px">
        <div class="reg-toggle" @click="more=!more">
          <span class="section-title">更多设定</span>
          <ico :name="more?'chevronUp':'chevronDown'" :size="15" style="color:var(--muted)"/>
        </div>
        <div v-if="more" class="form-stack" style="margin-top:12px">
          <div class="field"><label>荣格八维</label><input class="input" v-model="form.jung" placeholder="Fi · Ne · Ti · Se"></div>
          <div class="field"><label>十六型人格</label><input class="input" v-model="form.mbti" placeholder="INFP"></div>
          <div class="field"><label>角色背景</label><textarea class="textarea" v-model="form.background" placeholder="成长、关系、正在经历的事。"></textarea></div>
          <div class="field"><label>角色扮演禁忌</label><textarea class="textarea" v-model="form.taboos" placeholder="禁止 OOC、禁止替用户行动、禁止……"></textarea></div>
          <div class="field"><label>参考对话</label><textarea class="textarea" v-model="form.examples" placeholder="用户：……&#10;角色：……" style="min-height:100px"></textarea></div>
          <div class="field"><label>开场白</label><textarea class="textarea" v-model="form.greeting" placeholder="添加好友时，角色主动发出的第一句话。留空则发送默认招呼。"></textarea></div>
        </div>
      </div>

      <div class="section" style="padding:0;margin-top:18px">
        <div class="group">
          <div class="row tap" @click="worldSheet=true">
            <div class="row-ico"><ico name="book" :size="15"/></div>
            <div class="row-main"><div class="row-title">绑定世界书</div><div class="row-sub">{{worldbookIds.length}} 本 · 注入到该角色的上下文</div></div>
            <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
          </div>
          <div class="row tap" @click="apiSheet=true">
            <div class="row-ico"><ico name="cpu" :size="15"/></div>
            <div class="row-main"><div class="row-title">专用 API</div><div class="row-sub">{{apiName}}</div></div>
            <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
          </div>
        </div>
      </div>

      <button v-if="editing" class="btn block danger" style="margin-top:22px;color:var(--danger)" @click="remove">删除角色</button>
      <div style="height:26px"></div>
    </div>

    <sheet v-if="worldSheet" v-model="worldSheet" title="绑定世界书" sub="只有绑定的世界书会进入这个角色的提示词">
      <div class="group">
        <div class="row tap" v-for="b in S.worldbooks" :key="b.id" @click="toggleBook(b.id)">
          <div class="row-ico"><ico name="book" :size="14"/></div>
          <div class="row-main"><div class="row-title">{{b.name}}</div><div class="row-sub">{{(b.entries||[]).length}} 个条目</div></div>
          <ico :name="worldbookIds.includes(b.id)?'check':'plus'" :size="15" :style="{color:worldbookIds.includes(b.id)?'var(--accent-ink)':'var(--muted-2)'}"/>
        </div>
      </div>
      <div v-if="!S.worldbooks.length" class="helper" style="text-align:center;padding:16px">还没有世界书。</div>
    </sheet>

    <sheet v-if="apiSheet" v-model="apiSheet" title="专用 API">
      <div class="group">
        <div class="row tap" @click="apiId='inherit';apiSheet=false">
          <div class="row-main"><div class="row-title">跟随全局</div><div class="row-sub">使用默认接口</div></div>
          <ico v-if="apiId==='inherit'" name="check" :size="15"/>
        </div>
        <div class="row tap" v-for="a in S.cfg.api" :key="a.id" @click="apiId=a.id;apiSheet=false">
          <div class="row-ico"><ico name="cpu" :size="14"/></div>
          <div class="row-main"><div class="row-title">{{a.name}}</div><div class="row-sub">{{a.model}}</div></div>
          <ico v-if="apiId===a.id" name="check" :size="15"/>
        </div>
      </div>
    </sheet>
  </div>`
};

/* ============================================================
   Store
   ============================================================ */
const STORE = {};

STORE.Page = {
  data() {
    return {
      S, uploadSheet: false, name: '', html: '',
      widgets: [
        { kind: 'postcard', name: '明信片', desc: '4×2 · 头像、昵称、签名与背景', icon: 'image' },
        { kind: 'polaroid', name: '拍立得', desc: '2×2 · 一张可以随时换的照片', icon: 'camera' },
        { kind: 'music', name: '音乐盒', desc: '2×2 · 播放键、进度与曲名', icon: 'music' },
        { kind: 'dialog', name: '小对话', desc: '2×2 · 一对可编辑的对话气泡', icon: 'comment' },
        { kind: 'anniv', name: '纪念日', desc: '2×2 · 大数字倒数在一起的天数', icon: 'heart' },
        { kind: 'level', name: '熟悉度', desc: '2×2 · 按聊天条数累积的等级', icon: 'zap' },
        { kind: 'calendar', name: '日历', desc: '4×2 · 每天的聊天热力图', icon: 'calendar' },
        { kind: 'reading', name: '在读', desc: '2×2 · 正在读的书与页码', icon: 'bookmark' },
        { kind: 'diary', name: '日记', desc: '2×2 · 第几天，与最近一篇', icon: 'feather' },
        { kind: 'clock', name: '时钟', desc: '4×2 · 大号时间与第几天', icon: 'clock' }
      ]
    };
  },
  computed: {
    installed() { return Object.keys(APPS).filter((id) => A.appInLayout(id)); },
    removed() { return S.cfg.removedApps || []; },
    custom() { return S.cfg.customApps || []; }
  },
  methods: {
    meta(id) { return window.appMeta(id); },
    download(id) {
      A.restoreApp(id);
      A.toast('已放回桌面');
    },
    remove(id) {
      A.removeAppFromHome(id);
      A.toast('已从桌面移除');
    },
    upload() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.json,application/json';
      input.onchange = async () => {
        if (!input.files[0]) return;
        try {
          const text = await input.files[0].text();
          const j = JSON.parse(text);
          if (!j.name || !j.html) throw new Error('需要 name 与 html 字段');
          const app = { id: 'c_' + U.uid('x'), name: j.name, icon: j.icon || 'grid', tint: j.tint || 'linear-gradient(150deg,#B9B3A4,#8C8679)', html: String(j.html).slice(0, 20000) };
          S.cfg.customApps = [...(S.cfg.customApps || []), app];
          await saveCfg(true);
          A.restoreApp(app.id);
          A.toast('已安装「' + app.name + '」');
        } catch (e) { A.toast('组件格式不正确：' + e.message); }
      };
      input.click();
    },
    delCustom(a) {
      if (!confirm('删除自定义组件「' + a.name + '」？')) return;
      A.removeAppFromHome(a.id);
      S.cfg.customApps = this.custom.filter((x) => x.id !== a.id);
      saveCfg(true);
    }
  },
  template: `<div class="page">
    <nav-bar title="">
      <template #right><button class="icon-btn" @click="upload"><ico name="upload" :size="18"/></button></template>
    </nav-bar>
    <div class="body">
      <div class="app-head" style="padding-top:2px">
        <div class="ah-row">
          <div><h1>Store</h1><div class="desc">应用与组件。删掉的东西，都能在这里找回来。</div></div>
          <div class="mark">{{Object.keys(APPS).length}} CORE</div>
        </div>
      </div>
      <div class="pad">
        <div class="store-grid">
          <div class="store-item" v-for="id in Object.keys(APPS)" :key="id">
            <div class="si-top">
              <span class="app-icon" :style="{background:meta(id).tint}"><ico :name="meta(id).icon" :size="18" :sw="1.5"/></span>
              <div class="grow"><div class="si-n">{{meta(id).name}}</div></div>
            </div>
            <div class="si-d">{{A.appInLayout(id)?'已在桌面':(removed.includes(id)?'已移除，可重新下载':'未在桌面，可添加')}}</div>
            <button class="si-btn" :class="{ok:!A.appInLayout(id)}" @click="A.appInLayout(id)?remove(id):download(id)">
              {{A.appInLayout(id)?'移出桌面':(removed.includes(id)?'重新下载':'加到桌面')}}
            </button>
          </div>
        </div>

        <div class="section" style="padding:0;margin-top:22px">
          <div class="section-head"><span class="section-title">桌面组件</span><span class="section-act">长按桌面也能编辑</span></div>
          <div class="store-grid">
            <div class="store-item" v-for="w in widgets" :key="w.kind">
              <div class="si-top">
                <span class="app-icon" style="background:rgba(255,255,255,.7);border:1px solid var(--line);color:var(--ink-2)"><ico :name="w.icon" :size="18" :sw="1.5"/></span>
                <div class="grow"><div class="si-n">{{w.name}}</div></div>
              </div>
              <div class="si-d">{{w.desc}}</div>
              <button class="si-btn" :class="{ok:!A.hasWidget(w.kind)}" @click="A.hasWidget(w.kind)?A.removeWidget(w.kind):A.addWidget(w.kind)">
                {{A.hasWidget(w.kind)?'移除':'加到桌面'}}
              </button>
            </div>
          </div>
        </div>

        <div class="section" style="padding:0;margin-top:22px">
          <div class="section-head"><span class="section-title">自定义组件</span><span class="section-act" @click="upload"><ico name="plus" :size="12"/>上传</span></div>
          <div class="store-grid" v-if="custom.length">
            <div class="store-item" v-for="a in custom" :key="a.id">
              <div class="si-top">
                <span class="app-icon" :style="{background:a.tint}"><ico :name="a.icon" :size="18" :sw="1.5"/></span>
                <div class="grow"><div class="si-n">{{a.name}}</div></div>
              </div>
              <div class="si-d">自定义 · 沙箱运行</div>
              <button class="si-btn ok" @click="delCustom(a)">卸载</button>
            </div>
          </div>
          <div class="card" v-else style="padding:16px;text-align:center">
            <div class="helper" style="line-height:1.7">上传一份 JSON：<span class="mono">{ name, icon, tint, html }</span><br>组件会在 iframe 沙箱里运行，不污染小手机。</div>
            <button class="btn sm" style="margin-top:10px" @click="upload">上传组件</button>
          </div>
        </div>
      </div>
      <div style="height:26px"></div>
    </div>
  </div>`
};

/* ============================================================
   Notices
   ============================================================ */
const NOTICE = {};
NOTICE.Page = {
  data() {
    return {
      S, tab: 'log',
      log: [
        '桌面新增：纪念日、熟悉度、日历热力三个组件，商店可增删',
        '玻璃质感：组件、气泡、弹层统一为磨砂玻璃，壁纸预设扩到 6 套',
        '「我的」改成封面资料卡 + 运行状态，一眼看到外观 / API / 存储',
        '好友列表新增本周消息条，聊天室补上日期分隔',
        '桌面网格、明信片 / 拍立得 / 音乐盒 / 小对话组件',
        '聊天：登录注册、好友、气泡、思维链、旁白、长按编辑',
        '世界书前后中位注入 · 三层记忆 · 角色档案',
        'API 兼容 OpenAI / Claude / Gemini',
        '数据全部落在 IndexedDB，支持分项查看与清理'
      ]
    };
  },
  template: `<div class="page">
    <nav-bar title="通知"></nav-bar>
    <div class="body pad">
      <div class="segmented" style="margin:6px 0 16px">
        <button :class="{on:tab==='log'}" @click="tab='log'">更新公告</button>
        <button :class="{on:tab==='tut'}" @click="tab='tut'">使用教程</button>
      </div>

      <template v-if="tab==='log'">
        <div class="note-card">
          <div class="n-ver">v0.2.0 · LIFE</div>
          <div class="n-t">把日子也装进手机里</div>
          <div class="n-b" style="padding-left:0">
            <div style="display:flex;gap:7px"><span style="color:var(--muted-2)">·</span><span>音乐：播放列表、唱片与进度，桌面音乐盒同步</span></div>
            <div style="display:flex;gap:7px"><span style="color:var(--muted-2)">·</span><span>书架：在读 / 读完、页码进度、摘句收藏</span></div>
            <div style="display:flex;gap:7px"><span style="color:var(--muted-2)">·</span><span>时光：纪念日时间线 + 只给自己看的日记</span></div>
            <div style="display:flex;gap:7px"><span style="color:var(--muted-2)">·</span><span>桌面新增「在读」「日记」两个玻璃组件</span></div>
            <div style="display:flex;gap:7px"><span style="color:var(--muted-2)">·</span><span>发现页新增生活分区，三个应用可直接进入</span></div>
          </div>
          <div class="n-time">2026.11.04</div>
        </div>
        <div class="note-card">
          <div class="n-ver">v0.1.0 · FRAMEWORK</div>
          <div class="n-t">小手机，第一次开机</div>
          <div class="n-b" style="padding-left:0">
            <div v-for="(l,i) in log" :key="i" style="display:flex;gap:7px"><span style="color:var(--muted-2)">·</span><span>{{l}}</span></div>
          </div>
          <div class="n-time">2026.11.03</div>
        </div>
        <div class="note-card" style="background:#FBFAF6">
          <div class="n-ver">NOTE</div>
          <div class="n-t">这是一个骨架</div>
          <div class="n-b">界面、路由、数据层、提示词拼装已经打通。论坛、语音、更多工具调用留给下一版。</div>
          <div class="n-time">保持轻盈</div>
        </div>
      </template>

      <template v-else>
        <div class="note-card">
          <div class="n-t" style="margin-top:0">五步开始</div>
          <div class="tut-step"><div class="idx">01</div><div><div class="tt">创建账号</div><div class="td">打开「聊天」，注册一个账号，填写你的人设。</div></div></div>
          <div class="tut-step"><div class="idx">02</div><div><div class="tt">创建角色</div><div class="td">在「档案」上传头像、写人设，保存后得到 8 位通讯号。</div></div></div>
          <div class="tut-step"><div class="idx">03</div><div><div class="tt">添加好友</div><div class="td">聊天右上角 +，输入通讯号，对方会发来开场白。</div></div></div>
          <div class="tut-step"><div class="idx">04</div><div><div class="tt">配置接口</div><div class="td">「设置 → API」填入 Base URL 与 Key，拉取模型并设为默认。没有接口时使用本地模拟回复。</div></div></div>
          <div class="tut-step"><div class="idx">05</div><div><div class="tt">调整提示词</div><div class="td">「设置 → 提示词」拖动顺序，实时看到每个块的字符占用。</div></div></div>
        </div>
        <div class="note-card">
          <div class="n-t" style="margin-top:0">手势与快捷键</div>
          <div class="n-b">长按桌面图标：编辑 / 拖动 / 删除
长按聊天气泡：编辑、删除、重回
聊天输入框左侧 +：旁白输入、时间感知
左右滑动桌面：翻页</div>
        </div>
      </template>
      <div style="height:26px"></div>
    </div>
  </div>`
};
