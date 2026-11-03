/* ============================================================
   表情包
   库存在 cfg.stickers，图片走 files 表（blob + 运行时 URL 缓存），
   刷新不会裂图。AI 侧只认名单里的名字，输出 [表情:名字]，
   聊天渲染时替换成图片气泡。
   ============================================================ */
const STK = {};

/* 输入栏里的选择面板 */
STK.Picker = {
  props: { modelValue: Boolean },
  emits: ['update:modelValue', 'pick'],
  data() { return { S, urls: {} }; },
  computed: {
    list() { return S.cfg.stickers || []; }
  },
  watch: {
    modelValue(v) { if (v) this.load(); }
  },
  methods: {
    close() { this.$emit('update:modelValue', false); },
    pick(s) { this.$emit('pick', s.name); this.close(); },
    async load() {
      for (const s of this.list) {
        const u = S.imgCache[s.fileKey] || await A.resolveImg(s.fileKey);
        if (u) this.urls[s.id] = u;
      }
    },
    goLib() { this.close(); A.go('stickers'); }
  },
  template: `<sheet :model-value="modelValue" @update:model-value="close" title="表情" :sub="list.length ? '点一下直接发出' : '还没有表情'">
    <div v-if="list.length" class="stk-grid pick">
      <button class="stk-cell" v-for="s in list" :key="s.id" @click="pick(s)">
        <img v-if="urls[s.id]" :src="urls[s.id]" :alt="s.name">
        <span class="stk-ph" v-else>{{s.name.slice(0,1)}}</span>
        <span class="stk-name">{{s.name}}</span>
      </button>
    </div>
    <div v-else class="empty" style="padding:20px 0 10px">
      <div class="e-ico"><ico name="image" :size="20"/></div>
      <div class="e-title">表情库是空的</div>
      <div class="e-sub">上传几张图，起一个情绪化的名字，AI 就会用它们。</div>
    </div>
    <template #footer>
      <button class="btn block" @click="goLib">管理表情库</button>
    </template>
  </sheet>`
};

/* 表情库页面 */
STK.Library = {
  data() {
    return {
      S, sheet: false, edit: null, name: '', urls: {}, busy: false,
      preview: null
    };
  },
  computed: {
    list() { return S.cfg.stickers || []; }
  },
  mounted() { this.load(); },
  methods: {
    async load() {
      for (const s of this.list) {
        const u = S.imgCache[s.fileKey] || await A.resolveImg(s.fileKey);
        if (u) this.urls[s.id] = u;
      }
    },
    openEdit(s) {
      this.edit = s; this.name = s.name; this.sheet = true;
    },
    async pickFiles() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
      input.onchange = async () => {
        const files = [...input.files].slice(0, 12);
        if (!files.length) return;
        this.busy = true;
        for (const f of files) {
          const base = (f.name || '表情').replace(/\.[^.]+$/, '').slice(0, 8);
          const s = await A.addSticker(base || '表情', f);
          const u = await A.resolveImg(s.fileKey);
          if (u) this.urls[s.id] = u;
        }
        this.busy = false;
        A.toast('已加入 ' + files.length + ' 张，记得改成情绪化的名字');
      };
      input.click();
    },
    async saveName() {
      const n = this.name.trim();
      if (!n) { A.toast('名字不能为空'); return; }
      if (this.list.some((s) => s.id !== this.edit.id && s.name === n)) { A.toast('这个名字已经被占用了'); return; }
      await A.renameSticker(this.edit.id, n);
      this.sheet = false;
      A.toast('已改名');
    },
    async remove() {
      const id = this.edit.id;
      this.sheet = false;
      const s = this.list.find((x) => x.id === id);
      if (!s) return;
      await A.delSticker(id);
      delete this.urls[id];
      A.toast('已删除「' + s.name + '」', 3000, { label: '撤销', run: () => A.restoreSticker(s) });
    },
    test(name) { A.toast('在聊天里输入 [表情:' + name + '] 即可预览'); }
  },
  template: `<div class="page">
    <nav-bar title="表情库">
      <template #right><button class="icon-btn" :disabled="busy" @click="pickFiles"><ico name="plus" :size="20"/></button></template>
    </nav-bar>
    <div class="body">
      <div class="app-head" style="padding-top:2px">
        <div class="ah-row">
          <div>
            <h1>Stickers</h1>
            <div class="desc">给每张图起一个情绪名字。聊天时 AI 会按名字调用，你也能直接发。</div>
          </div>
        </div>
      </div>

      <div class="stk-tip">
        <ico name="sparkle" :size="13"/>
        <span>名字最好描述情绪，比如「委屈」「笑到打滚」。AI 只能从下面的名单里选，不会自己编。</span>
      </div>

      <div class="stk-grid" v-if="list.length">
        <button class="stk-cell" v-for="s in list" :key="s.id" @click="openEdit(s)">
          <img v-if="urls[s.id]" :src="urls[s.id]" :alt="s.name">
          <span class="stk-ph" v-else>{{s.name.slice(0,1)}}</span>
          <span class="stk-name">{{s.name}}</span>
        </button>
        <button class="stk-cell add" @click="pickFiles"><ico name="plus" :size="20"/><span class="stk-name">添加</span></button>
      </div>

      <div v-else class="empty">
        <div class="e-ico"><ico name="image" :size="22"/></div>
        <div class="e-title">还没有表情</div>
        <div class="e-sub">传几张图进来，它们会成为对话里最像人的部分。</div>
        <button class="btn sm" @click="pickFiles">上传表情</button>
      </div>

      <div class="stk-count" v-if="list.length">{{list.length}} 张 · 图片存在本机，不会上传</div>
      <div style="height:24px"></div>
    </div>

    <sheet v-if="sheet" v-model="sheet" title="编辑表情" :sub="'在对话里显示为 [表情:'+name+']'">
      <div class="stk-preview" v-if="edit">
        <img v-if="urls[edit.id]" :src="urls[edit.id]" :alt="edit.name">
        <span class="stk-ph" v-else>{{name.slice(0,1)}}</span>
      </div>
      <div class="field" style="margin-top:14px">
        <label>名字</label>
        <input class="input" v-model="name" maxlength="10" placeholder="如：委屈">
      </div>
      <div class="f g8" style="margin-top:14px">
        <button class="btn" style="flex:1" @click="test(name)">怎么用</button>
        <button class="btn danger" style="flex:1" @click="remove">删除</button>
      </div>
      <template #footer><button class="btn primary block" @click="saveName">保存</button></template>
    </sheet>
  </div>`
};
