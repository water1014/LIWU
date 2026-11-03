/* ============================================================
   Beauty · Settings · API · Prompts · Data
   ============================================================ */
const WALLS = [
  { name: '纸', css: 'radial-gradient(90% 60% at 16% 4%,#FDFBF5 0%,rgba(253,251,245,0) 58%),radial-gradient(70% 50% at 92% 16%,#E9E1D0 0%,rgba(233,225,208,0) 62%),radial-gradient(80% 60% at 46% 108%,#D3CBB8 0%,rgba(211,203,184,0) 66%),linear-gradient(168deg,#F6F3EB,#E4DDCD)' },
  { name: '雾', css: 'radial-gradient(80% 50% at 18% 6%,#F6F7F4 0%,rgba(246,247,244,0) 56%),radial-gradient(70% 54% at 86% 28%,#C3CBC4 0%,rgba(195,203,196,0) 60%),radial-gradient(90% 60% at 40% 106%,#9FAAA0 0%,rgba(159,170,160,0) 62%),linear-gradient(170deg,#E7E9E4,#C4CCC3)' },
  { name: '潮', css: 'radial-gradient(76% 48% at 82% 6%,#DCE4EA 0%,rgba(220,228,234,0) 58%),radial-gradient(66% 52% at 20% 34%,#F0EEE7 0%,rgba(240,238,231,0) 60%),radial-gradient(90% 60% at 56% 108%,#A9B6BE 0%,rgba(169,182,190,0) 64%),linear-gradient(160deg,#EAE9E2,#C2CDD2)' },
  { name: '暮', css: 'radial-gradient(80% 54% at 22% 6%,#F7EBDF 0%,rgba(247,235,223,0) 58%),radial-gradient(66% 50% at 86% 30%,#D9B9A2 0%,rgba(217,185,162,0) 62%),radial-gradient(90% 58% at 46% 108%,#B08D77 0%,rgba(176,141,119,0) 62%),linear-gradient(162deg,#F0E3D6,#C7AA95)' },
  { name: '苔', css: 'radial-gradient(80% 50% at 76% 4%,#EDF0E4 0%,rgba(237,240,228,0) 58%),radial-gradient(70% 52% at 16% 30%,#D5DCC9 0%,rgba(213,220,201,0) 60%),radial-gradient(90% 60% at 54% 108%,#95A28C 0%,rgba(149,162,140,0) 62%),linear-gradient(166deg,#E9E8DA,#B9C4AE)' },
  { name: '樱', css: 'radial-gradient(84% 52% at 24% 4%,#FDF6F4 0%,rgba(253,246,244,0) 58%),radial-gradient(68% 50% at 88% 24%,#EAD2D2 0%,rgba(234,210,210,0) 60%),radial-gradient(92% 60% at 40% 106%,#CFB6BB 0%,rgba(207,182,187,0) 64%),linear-gradient(168deg,#F7EEEC,#DFC9CC)' }
];

const BEAUTY = {};
BEAUTY.Page = {
  data() { return { S, WALLS, css: '', js: '', tab: 'wall' }; },
  computed: {
    preset() { return S.cfg.ui.wallpaperPreset == null ? 0 : S.cfg.ui.wallpaperPreset; },
    fontName() {
      const k = S.cfg.ui.fontKey;
      if (!k) return '系统默认';
      const rec = S.cfg.ui.fontName;
      return rec || '自定义字体';
    }
  },
  mounted() { this.css = S.cfg.ui.css || ''; this.js = S.cfg.ui.js || ''; },
  methods: {
    pickPreset(i) {
      S.cfg.ui.wallpaperPreset = i;
      if (S.cfg.ui.wallpaperKey) {
        DB.delFile(S.cfg.ui.wallpaperKey);
        delete S.imgCache[S.cfg.ui.wallpaperKey];
        S.cfg.ui.wallpaperKey = '';
      }
      saveCfg(true);
      A.toast('桌面背景已更新');
    },
    uploadWall() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = async () => {
        if (!input.files[0]) return;
        S.cfg.ui.wallpaperKey = await A.replaceImage(S.cfg.ui.wallpaperKey, input.files[0]);
        await A.resolveImg(S.cfg.ui.wallpaperKey);
        saveCfg(true);
        A.toast('桌面背景已更新');
      };
      input.click();
    },
    removeWall() {
      if (S.cfg.ui.wallpaperKey) { DB.delFile(S.cfg.ui.wallpaperKey); delete S.imgCache[S.cfg.ui.wallpaperKey]; }
      S.cfg.ui.wallpaperKey = '';
      saveCfg(true);
    },
    uploadFont() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.ttf,.otf,.woff,.woff2,font/*';
      input.onchange = async () => {
        if (!input.files[0]) return;
        const f = input.files[0];
        if (S.cfg.ui.fontKey) await DB.delFile(S.cfg.ui.fontKey);
        S.cfg.ui.fontKey = await DB.putFile(f, { name: f.name });
        S.cfg.ui.fontName = f.name.replace(/\.(ttf|otf|woff2?)$/i, '');
        saveCfg(true);
        await A.applyFont();
        A.toast('字体已应用');
      };
      input.click();
    },
    async clearFont() {
      if (S.cfg.ui.fontKey) await DB.delFile(S.cfg.ui.fontKey);
      S.cfg.ui.fontKey = ''; S.cfg.ui.fontName = '';
      document.documentElement.style.removeProperty('--home-font');
      saveCfg(true);
    },
    saveCss() {
      S.cfg.ui.css = this.css;
      saveCfg(true);
      A.applyGlobalBeauty();
      A.toast('CSS 已生效（仅桌面）');
    },
    saveJs() {
      S.cfg.ui.js = this.js;
      saveCfg(true);
      A.applyGlobalBeauty();
      A.toast('JS 已执行（仅桌面）');
    }
  },
  template: `<div class="page">
    <nav-bar title="">
      <template #right><button class="txt" @click="A.back()">完成</button></template>
    </nav-bar>
    <div class="body">
      <div class="app-head" style="padding-top:2px">
        <div class="ah-row"><div><h1>Beauty</h1><div class="desc">只改桌面，不动应用内部。所有改动都能撤回。</div></div></div>
      </div>
      <div class="pad">
        <div class="segmented" style="margin-bottom:16px">
          <button :class="{on:tab==='wall'}" @click="tab='wall'">背景</button>
          <button :class="{on:tab==='font'}" @click="tab='font'">字体</button>
          <button :class="{on:tab==='code'}" @click="tab='code'">CSS / JS</button>
        </div>

        <template v-if="tab==='wall'">
          <div class="section-head" style="padding-left:2px"><span class="section-title">预设</span>
            <span class="section-act" v-if="S.cfg.ui.wallpaperKey" @click="removeWall">使用预设并删除图片</span>
          </div>
          <div class="wp-grid">
            <div class="wp-cell" v-for="(w,i) in WALLS" :key="i" :class="{on:preset===i && !S.cfg.ui.wallpaperKey}" :style="{background:w.css}" @click="pickPreset(i)">
              <span>{{w.name}}</span>
            </div>
          </div>
          <div class="section-head" style="padding-left:2px;margin-top:22px"><span class="section-title">自定义图片</span></div>
          <div class="bg-pick" style="height:140px" :style="S.cfg.ui.wallpaperKey&&S.imgCache[S.cfg.ui.wallpaperKey]?{backgroundImage:'url('+S.imgCache[S.cfg.ui.wallpaperKey]+')',backgroundSize:'cover',borderStyle:'solid'}:{}" @click="uploadWall">
            <ico v-if="!S.cfg.ui.wallpaperKey" name="image" :size="22"/>
            <span v-if="!S.cfg.ui.wallpaperKey">上传桌面背景</span>
            <span v-else style="color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.4)">点击更换</span>
          </div>
          <div class="helper" style="margin-top:8px">图片会压缩后以 Blob 存入 IndexedDB，替换时旧图自动删除。</div>
        </template>

        <template v-else-if="tab==='font'">
          <div class="card" style="padding:18px;text-align:center">
            <div style="font-size:22px;letter-spacing:.04em">永 和 九 年</div>
            <div class="helper" style="margin-top:8px">Aa Bb Cc · 0123456789</div>
            <div class="helper" style="margin-top:14px">当前：{{fontName}}</div>
          </div>
          <div class="f g8" style="margin-top:14px">
            <button class="btn" style="flex:1" @click="uploadFont">上传字体包</button>
            <button class="btn ghost" v-if="S.cfg.ui.fontKey" @click="clearFont">恢复默认</button>
          </div>
          <div class="helper" style="margin-top:8px">支持 .ttf / .otf / .woff2。仅作用于模拟手机桌面，不影响应用内部与系统。</div>
        </template>

        <template v-else>
          <div class="section-head" style="padding-left:2px"><span class="section-title">全局 CSS</span><span class="section-act" @click="saveCss">应用</span></div>
          <textarea class="editor-area" v-model="css" spellcheck="false" placeholder="#home-stage .app-label { }&#10;.pc { border-radius: 30px; }"></textarea>
          <div class="helper" style="margin-top:6px">选择器会自动加上 <span class="mono">#home-stage</span> 前缀，只影响桌面。</div>

          <div class="section-head" style="padding-left:2px;margin-top:20px"><span class="section-title">全局 JS</span><span class="section-act" @click="saveJs">运行</span></div>
          <textarea class="editor-area" v-model="js" spellcheck="false" placeholder="// 可访问 root（桌面容器）与 toast()&#10;root.style.setProperty('--pc-base','#EFE7DA');"></textarea>
          <div class="helper" style="margin-top:6px">在受控函数作用域中执行，异常会被捕获，不会阻塞小手机。</div>
        </template>
      </div>
      <div style="height:26px"></div>
    </div>
  </div>`
};

/* ============================================================
   Settings
   ============================================================ */
const SET = {};
SET.Page = {
  data() { return { S }; },
  computed: {
    apiCount() { return (S.cfg.api || []).length; },
    total() { return S.storageTotal || 0; }
  },
  methods: {
    clearCache() { A.refreshSizes(); A.toast('占用已刷新'); }
  },
  template: `<div class="page">
    <nav-bar title=""></nav-bar>
    <div class="body">
      <div class="app-head" style="padding-top:2px">
        <div class="ah-row"><div><h1>Settings</h1><div class="desc">接口、提示词与这个世界的全部数据。</div></div></div>
      </div>
      <div class="pad">
        <div class="set-group">
          <div class="section-head" style="padding-left:2px"><span class="section-title">模型接口</span><span class="section-act" @click="A.go('settings.api.edit')"><ico name="plus" :size="12"/>添加</span></div>
          <div class="set-list">
            <div class="row tap" @click="A.go('settings.api')">
              <div class="row-ico"><ico name="cpu" :size="15"/></div>
              <div class="row-main"><div class="row-title">API 配置</div><div class="row-sub">OpenAI / Claude / Gemini 协议</div></div>
              <div class="row-val">{{apiCount}} 个</div>
              <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
            </div>
            <div class="row tap" @click="A.go('settings.prompt')">
              <div class="row-ico"><ico name="sliders" :size="15"/></div>
              <div class="row-main"><div class="row-title">全局提示词</div><div class="row-sub">按应用分组 · 调整拼接顺序</div></div>
              <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
            </div>
            <div class="row tap" @click="A.go('settings.data')">
              <div class="row-ico"><ico name="database" :size="15"/></div>
              <div class="row-main"><div class="row-title">应用数据</div><div class="row-sub">分项占用 · 变量清单 · 清理</div></div>
              <div class="row-val">{{U.bytes(total)}}</div>
              <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
            </div>
          </div>
        </div>

        <div class="set-group">
          <div class="section-head" style="padding-left:2px"><span class="section-title">当前账号</span></div>
          <div class="set-list">
            <div class="row">
              <av :file-key="S.account&&S.account.avatarKey" :name="S.account&&S.account.name" :size="32"/>
              <div class="row-main"><div class="row-title">{{S.account?S.account.name:'未登录'}}</div><div class="row-sub">{{S.account?'@'+S.account.username:'打开聊天登录'}}</div></div>
              <span class="chip">{{S.account?S.account.gender:''}}</span>
            </div>
            <div class="row tap" @click="A.go('beauty')">
              <div class="row-ico"><ico name="palette" :size="15"/></div>
              <div class="row-main"><div class="row-title">桌面美化</div><div class="row-sub">背景、字体、全局 CSS/JS</div></div>
              <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
            </div>
          </div>
        </div>

        <div class="set-group">
          <div class="section-head" style="padding-left:2px"><span class="section-title">关于</span></div>
          <div class="set-list">
            <div class="row"><div class="row-main"><div class="row-title">LIWU · 小手机</div><div class="row-sub">框架版 0.2.0 · 多文件静态站</div></div><span class="tag">Vue 3</span></div>
            <div class="row"><div class="row-main"><div class="row-title">存储</div><div class="row-sub">IndexedDB · 图片以 Blob 保存</div></div><span class="tag">{{U.bytes(total)}}</span></div>
          </div>
        </div>
      </div>
      <div style="height:26px"></div>
    </div>
  </div>`
};

SET.ApiList = {
  data() { return { S }; },
  methods: {
    async setDefault(a) {
      S.cfg.api.forEach((x) => { x.isDefault = x.id === a.id; });
      await saveCfg(true);
      A.toast('默认接口：' + a.name);
    },
    remove(a) {
      if (!confirm('删除接口「' + a.name + '」？')) return;
      S.cfg.api = S.cfg.api.filter((x) => x.id !== a.id);
      saveCfg(true);
    }
  },
  template: `<div class="page">
    <nav-bar title="API 配置">
      <template #right><button class="icon-btn" @click="A.go('settings.api.edit')"><ico name="plus" :size="20"/></button></template>
    </nav-bar>
    <div class="body pad">
      <div class="helper" style="margin:8px 2px 14px;line-height:1.7">接口只保存在本地。所有对话请求从浏览器直接发出，不经过任何中转。</div>
      <div class="api-card" v-for="a in S.cfg.api" :key="a.id" :class="{default:a.isDefault}" @click="A.go('settings.api.edit',{apiId:a.id})">
        <div class="a-ico"><ico name="cpu" :size="16"/></div>
        <div class="grow" style="min-width:0">
          <div class="a-n">{{a.name}} <span class="badge-def" v-if="a.isDefault">默认</span></div>
          <div class="a-d">{{a.protocol}} · {{a.model}}</div>
        </div>
        <button class="icon-btn" @click.stop="setDefault(a)" v-if="!a.isDefault" title="设为默认"><ico name="check" :size="16"/></button>
        <button class="icon-btn" @click.stop="remove(a)"><ico name="trash" :size="15"/></button>
      </div>
      <div v-if="!S.cfg.api.length" class="empty">
        <div class="e-ico"><ico name="cpu" :size="22"/></div>
        <div class="e-title">还没有接口</div>
        <div class="e-sub">添加后可一键拉取模型。没有接口时，聊天会使用本地模拟回复。</div>
        <button class="btn sm" @click="A.go('settings.api.edit')">添加接口</button>
      </div>
      <div style="height:26px"></div>
    </div>
  </div>`
};

SET.ApiEdit = {
  props: { params: Object },
  data() {
    return {
      S, busy: '', models: [], modelSheet: false,
      form: {
        id: '', name: '', protocol: 'openai', baseUrl: 'https://api.openai.com/v1',
        key: '', model: 'gpt-4o-mini', temp: 0.9, maxTokens: 1024,
        vision: false, image: false, isDefault: false
      }
    };
  },
  mounted() {
    const id = this.params && this.params.apiId;
    if (id) {
      const a = S.cfg.api.find((x) => x.id === id);
      if (a) this.form = JSON.parse(JSON.stringify(a));
    } else if (!S.cfg.api.length) {
      this.form.isDefault = true;
    }
    this.applyProtocol(this.form.protocol);
  },
  methods: {
    applyProtocol(p) {
      if (p === 'anthropic') this.form.baseUrl = 'https://api.anthropic.com/v1';
      else if (p === 'gemini') this.form.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
      else if (p === 'openai') this.form.baseUrl = 'https://api.openai.com/v1';
    },
    setProtocol(p) {
      this.form.protocol = p;
      this.applyProtocol(p);
    },
    async fetchModels() {
      this.busy = 'models';
      try {
        this.models = await A.fetchModels(this.form);
        if (!this.models.length) throw new Error('没有返回模型');
        this.modelSheet = true;
      } catch (e) { A.toast(e.message); }
      this.busy = '';
    },
    async test() {
      this.busy = 'test';
      try {
        const out = await A.callAPI(this.form, [{ role: 'user', content: '只回复两个字：你好' }]);
        A.toast('连通成功：' + U.clip(out.replace(/\s+/g, ' '), 24), 2600);
      } catch (e) { A.toast('连接失败：' + e.message, 3200); }
      this.busy = '';
    },
    async save() {
      if (!this.form.name.trim()) { A.toast('给接口起个名字'); return; }
      if (!this.form.baseUrl.trim()) { A.toast('填写 Base URL'); return; }
      if (!this.form.model.trim()) { A.toast('填写模型名'); return; }
      const list = S.cfg.api;
      if (this.form.id) {
        const i = list.findIndex((x) => x.id === this.form.id);
        list[i] = JSON.parse(JSON.stringify(this.form));
      } else {
        this.form.id = U.uid('api');
        list.push(JSON.parse(JSON.stringify(this.form)));
      }
      if (this.form.isDefault) list.forEach((x) => { x.isDefault = x.id === this.form.id; });
      await saveCfg(true);
      A.toast('已保存');
      A.back();
    }
  },
  template: `<div class="page">
    <nav-bar :title="form.id?'编辑接口':'添加接口'">
      <template #right><button class="txt" @click="save">保存</button></template>
    </nav-bar>
    <div class="body pad">
      <div class="form-stack" style="margin-top:8px">
        <div class="field"><label>名称</label><input class="input" v-model="form.name" placeholder="如：主力模型"></div>
        <div class="field"><label>协议</label>
          <seg :model-value="form.protocol" @update:model-value="setProtocol" :options="[{value:'openai',label:'OpenAI'},{value:'anthropic',label:'Claude'},{value:'gemini',label:'Gemini'}]"/>
        </div>
        <div class="field"><label>Base URL</label>
          <input class="input" v-model="form.baseUrl" placeholder="https://...">
          <div class="helper" style="margin-top:7px">填到哪一层都行。结尾带不带 /v1 会自动各试一次，不用手动改。</div>
        </div>
        <div class="field"><label>API Key</label><input class="input" type="password" v-model="form.key" placeholder="sk-..."></div>
        <div class="field">
          <label>模型</label>
          <div class="f g8">
            <input class="input" v-model="form.model" placeholder="模型 ID" style="font-family:var(--mono);font-size:11.5px">
            <button class="btn sm" :disabled="busy==='models'" @click="fetchModels">
              <span v-if="busy==='models'" class="spin-ring" style="width:11px;height:11px;border-width:1.5px"></span>
              <template v-else>拉取</template>
            </button>
          </div>
        </div>
        <div class="field"><label>温度 · {{form.temp}}</label><input type="range" min="0" max="2" step="0.1" v-model.number="form.temp" style="width:100%"></div>
        <div class="field"><label>最大输出 Token</label><input class="input" type="number" v-model.number="form.maxTokens" min="128" max="32000"></div>
      </div>

      <div class="set-list" style="margin-top:18px">
        <div class="row"><div class="row-main"><div class="row-title">支持视觉输入</div><div class="row-sub">允许发送图片</div></div><toggle v-model="form.vision"/></div>
        <div class="row"><div class="row-main"><div class="row-title">支持生成图片</div><div class="row-sub">用于后续绘图工具</div></div><toggle v-model="form.image"/></div>
        <div class="row"><div class="row-main"><div class="row-title">设为默认接口</div></div><toggle v-model="form.isDefault"/></div>
      </div>

      <div class="f g8" style="margin-top:18px">
        <button class="btn" style="flex:1" :disabled="busy==='test'" @click="test">
          <span v-if="busy==='test'" class="spin-ring" style="width:12px;height:12px;border-width:1.5px"></span>
          <template v-else>测试连接</template>
        </button>
        <button class="btn primary" style="flex:1" @click="save">保存</button>
      </div>
      <div class="helper" style="margin-top:12px;line-height:1.7">浏览器直连需要接口允许跨域（CORS）。Claude 已附带 anthropic-dangerous-direct-browser-access 头。</div>
      <div style="height:26px"></div>
    </div>

    <sheet v-if="modelSheet" v-model="modelSheet" title="选择模型" :sub="'共 '+models.length+' 个'">
      <div class="group" style="max-height:340px;overflow:auto">
        <div class="row tap" v-for="m in models" :key="m" @click="form.model=m;modelSheet=false">
          <div class="row-main"><div class="row-title mono" style="font-size:11px">{{m}}</div></div>
          <ico v-if="form.model===m" name="check" :size="15"/>
        </div>
      </div>
    </sheet>
  </div>`
};

SET.Prompt = {
  data() { return { S, tab: 'chat', preview: false }; },
  computed: {
    defs() { return PROMPT_DEFS[this.tab]; },
    order() { return S.cfg.prompts[this.tab] || []; },
    ctx() {
      const chat = S.chats[0];
      const char = chat ? A.charById(chat.charId) : S.chars[0];
      return { chat, char };
    },
    rows() {
      return this.order.map((b) => {
        const def = this.defs.find((d) => d.id === b.id) || {};
        let len = 0;
        try {
          if (this.ctx.chat && this.ctx.char) len = A.blockContent(b.id, this.ctx.chat, this.ctx.char).length;
        } catch (e) { len = 0; }
        return { id: b.id, label: def.label || b.id, hint: def.hint || '', enabled: b.enabled, len };
      });
    },
    totalChars() { return this.rows.reduce((a, b) => a + (b.enabled ? b.len : 0), 0); },
    previewText() {
      if (!this.ctx.chat || !this.ctx.char) return '还没有可用的角色与聊天记录。';
      return this.order.filter((b) => b.enabled).map((b) => {
        const c = A.blockContent(b.id, this.ctx.chat, this.ctx.char);
        if (!c) return '';
        const label = (this.defs.find((d) => d.id === b.id) || {}).label || b.id;
        return '【' + label + '】\n' + c;
      }).filter(Boolean).join('\n\n');
    }
  },
  methods: {
    up(i) {
      if (i <= 0) return;
      const a = this.order;
      [a[i - 1], a[i]] = [a[i], a[i - 1]];
      saveCfg(true);
    },
    down(i) {
      const a = this.order;
      if (i >= a.length - 1) return;
      [a[i + 1], a[i]] = [a[i], a[i + 1]];
      saveCfg(true);
    },
    toggle(b) { b.enabled = !b.enabled; saveCfg(true); }
  },
  template: `<div class="page">
    <nav-bar title="全局提示词">
      <template #right><button class="txt" @click="preview=true">预览</button></template>
    </nav-bar>
    <div class="body pad">
      <div class="helper" style="margin:8px 2px 12px;line-height:1.75">这里调整的是真实的拼接顺序。字符数来自当前账号的角色、世界书、记忆与聊天记录。</div>
      <div class="segmented" style="margin-bottom:14px">
        <button :class="{on:tab==='chat'}" @click="tab='chat'">好友聊天</button>
        <button :class="{on:tab==='summary'}" @click="tab='summary'">记忆总结</button>
      </div>

      <div class="f between" style="margin-bottom:10px;padding:0 2px">
        <span class="eyebrow">ORDER</span>
        <span class="mono" style="color:var(--muted)">{{totalChars}} chars · {{ctx.char?ctx.char.name:'—'}}</span>
      </div>

      <div class="prompt-block" v-for="(r,i) in rows" :key="r.id" :class="{off:!r.enabled}">
        <div class="pb-i">{{i+1}}</div>
        <div class="grow" style="min-width:0">
          <div class="pb-n">{{r.label}}</div>
          <div class="helper">{{r.hint}}</div>
        </div>
        <span class="pb-m">{{r.len}}c</span>
        <button class="icon-btn" style="width:24px;height:24px" @click="toggle(order[i])">
          <ico :name="r.enabled?'eye':'eyeOff'" :size="13"/>
        </button>
        <div class="pb-arrows">
          <button @click="up(i)"><ico name="chevronUp" :size="11"/></button>
          <button @click="down(i)"><ico name="chevronDown" :size="11"/></button>
        </div>
      </div>

      <div class="card" style="padding:13px;margin-top:14px;background:#FBFAF7">
        <div class="helper" style="line-height:1.75">系统会按此顺序拼接，再追加最近 10 条真实对话。旁白不计入上下文序号，时间戳仅在开启「时间感知」时出现。</div>
      </div>
      <div style="height:26px"></div>
    </div>

    <sheet v-if="preview" v-model="preview" title="实际拼接预览" :sub="'约 '+totalChars+' 字符'" tall>
      <pre style="white-space:pre-wrap;font-family:var(--mono);font-size:9.5px;line-height:1.75;color:var(--ink-2);margin:0">{{previewText}}</pre>
    </sheet>
  </div>`
};

SET.Data = {
  data() { return { S, open: false, demoBusy: false, confirmWipe: false }; },
  computed: {
    total() { return S.storageTotal || 0; },
    parts() {
      const colors = ['#8D9A87', '#B9A78F', '#A9A3B5', '#8FA0AE', '#C0B08E', '#9A9A9F', '#7E8C7A', '#B49A9A', '#A8B5A2'];
      return (S.sizes || []).filter((x) => x.bytes > 0).map((x, i) => Object.assign({}, x, { color: colors[i % colors.length] }));
    },
    vars() {
      return [
        { k: 'account.avatarKey', t: 'file', v: S.account ? (S.account.avatarKey ? '已设置' : '空') : '未登录' },
        { k: 'account.persona', t: 'text', v: S.account ? (S.account.persona || '').length + ' 字' : '—' },
        { k: 'cfg.api[]', t: 'array', v: (S.cfg.api || []).length + ' 项' },
        { k: 'cfg.prompts.chat[]', t: 'array', v: (S.cfg.prompts.chat || []).length + ' 项' },
        { k: 'cfg.memory.threshold', t: 'number', v: S.cfg.memory.threshold },
        { k: 'cfg.home.avatarKey / bgKey', t: 'file', v: [S.cfg.home.avatarKey, S.cfg.home.bgKey].filter(Boolean).length + ' 个' },
        { k: 'chats[].chatCss / bubbleCss', t: 'text', v: S.chats.filter((c) => c.chatCss || c.bubbleCss).length + ' 个会话' },
        { k: 'chats[].bgKey', t: 'file', v: S.chats.filter((c) => c.bgKey).length + ' 个' },
        { k: 'messages[].raw', t: 'text', v: Object.values(S.msgs).reduce((a, b) => a + b.length, 0) + ' 条已载入' },
        { k: 'characters[].worldbookIds', t: 'array', v: S.chars.reduce((a, c) => a + (c.worldbookIds || []).length, 0) + ' 条绑定' },
        { k: 'memories[]', t: 'array', v: S.memories.length + ' 条' },
        { k: 'files[]', t: 'blob', v: (S.sizes.find((x) => x.store === 'files') || {}).count + ' 个文件' }
      ];
    }
  },
  methods: {
    async refresh() { await A.refreshSizes(); },
    async wipe(store) {
      if (!confirm('清空「' + (DB.LABEL[store] || store) + '」？相关功能会失去数据。')) return;
      await A.clearVars(store);
      await A.refreshSizes();
      if (store === 'characters' || store === 'chats' || store === 'messages') {
        location.reload();
      }
    },
    async loadDemo() {
      this.demoBusy = true;
      try { await loadDemoData(); } catch (e) { A.toast('载入失败：' + e.message); }
      this.demoBusy = false;
    },
    async wipeAll() {
      if (!this.confirmWipe) { this.confirmWipe = true; A.toast('再点一次，清空全部数据'); return; }
      await DB.wipeAll();
      location.reload();
    }
  },
  async mounted() { await A.refreshSizes(); },
  template: `<div class="page">
    <nav-bar title="应用数据">
      <template #right><button class="icon-btn" @click="refresh"><ico name="refresh" :size="16"/></button></template>
    </nav-bar>
    <div class="body">
      <div class="storage-card">
        <div class="eyebrow">LOCAL STORAGE</div>
        <div class="storage-total" style="margin-top:8px"><span class="st-n">{{U.bytes(total)}}</span><span class="st-u">/ IndexedDB</span></div>
        <div class="storage-bar">
          <i v-for="p in parts" :key="p.store" :style="{width:(p.bytes/Math.max(1,total)*100)+'%',background:p.color}"></i>
        </div>
        <div class="storage-legend">
          <span class="lg" v-for="p in parts" :key="p.store"><i :style="{background:p.color}"></i>{{p.label}} {{U.bytes(p.bytes)}}</span>
        </div>
      </div>

      <div class="pad">
        <div class="section-head" style="padding-left:2px"><span class="section-title">分项占用</span><span class="section-act" @click="open=!open">{{open?'收起':'变量清单'}}</span></div>
        <div class="card" style="padding:2px 14px">
          <div class="store-row" v-for="s in S.sizes" :key="s.store">
            <div class="grow"><div class="sr-n">{{s.label}}</div><div class="sr-k">liwu.{{s.store}} · {{s.count}} records</div></div>
            <div class="sr-s">{{U.bytes(s.bytes)}}</div>
            <button class="icon-btn" style="width:26px;height:26px" @click="wipe(s.store)"><ico name="trash" :size="13"/></button>
          </div>
        </div>

        <div v-if="open" class="card" style="padding:2px 14px;margin-top:10px">
          <div class="var-row" v-for="v in vars" :key="v.k">
            <span class="v-k">{{v.k}}</span>
            <span class="v-t">{{v.t}}</span>
            <span style="color:var(--muted)">{{v.v}}</span>
          </div>
        </div>

        <div class="section-head" style="padding-left:2px;margin-top:22px"><span class="section-title">维护</span></div>
        <div class="group">
          <div class="row tap" @click="loadDemo">
            <div class="row-ico"><ico name="sparkle" :size="15"/></div>
            <div class="row-main"><div class="row-title">载入演示数据</div><div class="row-sub">两个角色、几段聊天、一条动态，用于预览界面</div></div>
            <span class="chip">可选</span>
          </div>
          <div class="row tap" @click="wipeAll">
            <div class="row-ico" style="color:var(--danger)"><ico name="alert" :size="15"/></div>
            <div class="row-main"><div class="row-title" style="color:var(--danger)">{{confirmWipe?'再点一次确认清空':'清空全部数据'}}</div><div class="row-sub">不可撤销，会重新加载</div></div>
          </div>
        </div>
        <div class="helper" style="margin-top:12px;line-height:1.7">替换头像 / 背景时，旧文件会在新文件写入成功后自动删除。清理单项不会影响其他应用。</div>
      </div>
      <div style="height:26px"></div>
    </div>
  </div>`
};
