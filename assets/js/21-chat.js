/* ============================================================
   CHAT — login, list, room, settings, beauty, moments
   ============================================================ */
window.parseRaw = function (raw) {
  const out = [];
  const src = String(raw || '');
  const re = /<think>([\s\S]*?)<\/think>|<narratage>([\s\S]*?)<\/narratage>|<tool(?:\s+name="([^"]*)")?\s*>([\s\S]*?)<\/tool>|\[表情[:：]\s*([^\]\n]{1,24})\]/gi;
  let last = 0, m;
  const pushSay = (text, base) => {
    const t = text.replace(/^\s+|\s+$/g, '');
    if (!t) return;
    const parts = t.split(/\n\s*\n/);
    let cursor = base;
    parts.forEach((p) => {
      const trimmed = p.trim();
      if (!trimmed) { cursor += p.length; return; }
      const idx = src.indexOf(trimmed, cursor);
      const start = idx >= 0 ? idx : cursor;
      const end = start + trimmed.length;
      out.push({ type: 'say', text: trimmed, start, end });
      cursor = end;
    });
  };
  while ((m = re.exec(src))) {
    if (m.index > last) pushSay(src.slice(last, m.index), last);
    if (m[1] !== undefined) out.push({ type: 'think', text: m[1].trim(), start: m.index, end: re.lastIndex });
    else if (m[2] !== undefined) out.push({ type: 'narr', text: m[2].trim(), start: m.index, end: re.lastIndex });
    else if (m[5] !== undefined) out.push({ type: 'sticker', name: m[5].trim(), start: m.index, end: re.lastIndex });
    else out.push({ type: 'tool', name: m[3] || 'tool', text: m[4].trim(), start: m.index, end: re.lastIndex });
    last = re.lastIndex;
  }
  if (last < src.length) pushSay(src.slice(last), last);
  return out;
};

const CHAT = {};

/* ---------------------------------------------------------- */
/* Login / register                                            */
/* ---------------------------------------------------------- */
CHAT.Login = {
  data() {
    return {
      tab: 'login', username: '', password: '', err: '', busy: false,
      reg: { username: '', password: '', name: '', gender: '女', persona: '', jung: '', mbti: '', background: '', avatarKey: '' },
      more: false, avatarUrl: '', noAvatar: false
    };
  },
  methods: {
    async pickAvatar() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = async () => {
        if (!input.files[0]) return;
        this.reg.avatarKey = await A.uploadImage(input.files[0]);
        this.avatarUrl = await A.resolveImg(this.reg.avatarKey);
      };
      input.click();
    },
    async doLogin() {
      this.err = ''; this.busy = true;
      try {
        await A.login(this.username, this.password);
        A.toast('欢迎回来，' + S.account.name);
      } catch (e) { if (!this.$.isUnmounted) this.err = e.message; }
      if (!this.$.isUnmounted) this.busy = false;
    },
    async doRegister() {
      this.err = ''; this.busy = true;
      try {
        if (!this.reg.avatarKey && !this.noAvatar) throw new Error('请上传头像，或直接用文字头像');
        if (!this.reg.persona.trim()) throw new Error('请填写你的人设');
        await A.register(this.reg);
        A.toast('账号已创建');
      } catch (e) { if (!this.$.isUnmounted) this.err = e.message; }
      if (!this.$.isUnmounted) this.busy = false;
    }
  },
  template: `<div class="login">
    <div class="login-bg"></div>
    <button class="login-back" @click="A.back()"><ico name="chevronLeft" :size="17" :sw="1.8"/></button>
    <div class="login-inner">
      <div class="login-mark">
        <div class="lm1">L I W U</div>
        <div class="lm2">a small phone for your inner world</div>
        <div class="lm3">这里不是另一个社交软件。它只属于你和你的角色们。</div>
      </div>

      <div class="login-card">
        <div class="login-tabs">
          <button :class="{on:tab==='login'}" @click="tab='login';err=''">登录</button>
          <button :class="{on:tab==='register'}" @click="tab='register';err=''">注册</button>
        </div>

        <div v-if="tab==='login'" class="form-stack">
          <div class="field"><label>账号</label><input class="input" v-model="username" placeholder="输入账号" autocomplete="username"></div>
          <div class="field"><label>密码</label><input class="input" type="password" v-model="password" placeholder="输入密码" @keyup.enter="doLogin"></div>
          <div v-if="err" class="helper" style="color:var(--danger)">{{err}}</div>
          <button class="btn primary block" :disabled="busy" @click="doLogin">进入小手机</button>
          <div class="helper" style="text-align:center">还没有账号？<span style="text-decoration:underline" @click="tab='register'">创建一个</span></div>
        </div>

        <div v-else class="form-stack">
          <div class="avatar-upload">
            <div class="au-ring"><av :file-key="reg.avatarKey" :name="reg.name||'我'" :size="56"/></div>
            <div class="col g6">
              <div class="f g6">
                <button class="btn sm" @click="pickAvatar">上传头像</button>
                <button class="btn sm ghost" @click="noAvatar=true;reg.avatarKey=''">文字头像</button>
              </div>
              <span class="helper">不传头像时用昵称首字生成</span>
            </div>
          </div>
          <div class="field"><label>账号</label><input class="input" v-model="reg.username" placeholder="用于登录"></div>
          <div class="field"><label>密码</label><input class="input" type="password" v-model="reg.password" placeholder="至少 4 位"></div>
          <div class="field"><label>昵称</label><input class="input" v-model="reg.name" placeholder="别人怎么称呼你"></div>
          <div class="field"><label>性别</label>
            <div class="gender-row">
              <button v-for="g in ['女','男','其他']" :key="g" :class="{on:reg.gender===g}" @click="reg.gender=g">{{g}}</button>
            </div>
          </div>
          <div class="field"><label>人设</label><textarea class="textarea" v-model="reg.persona" placeholder="你是谁、过着什么样的生活、在意什么……"></textarea></div>

          <div class="reg-more">
            <div class="reg-toggle" @click="more=!more">
              <span>更多设定（可选）</span>
              <ico :name="more?'chevronUp':'chevronDown'" :size="14"/>
            </div>
            <div v-if="more" class="form-stack" style="margin-top:12px">
              <div class="field"><label>荣格八维</label><input class="input" v-model="reg.jung" placeholder="如 Fi / Ne / Ti / Se"></div>
              <div class="field"><label>十六型人格</label><input class="input" v-model="reg.mbti" placeholder="如 INFP"></div>
              <div class="field"><label>背景</label><textarea class="textarea" v-model="reg.background" placeholder="成长经历、关系、处境……"></textarea></div>
            </div>
          </div>
          <div v-if="err" class="helper" style="color:var(--danger)">{{err}}</div>
          <button class="btn primary block" :disabled="busy" @click="doRegister">创建账号</button>
        </div>
      </div>
      <div class="helper" style="text-align:center;margin-top:18px">数据只保存在这台设备的 IndexedDB 中</div>
    </div>
  </div>`
};

/* ---------------------------------------------------------- */
/* Chat home (4 tabs)                                          */
/* ---------------------------------------------------------- */
CHAT.Home = {
  data() { return { S, tab: 'friends', search: '', addSheet: false, switchSheet: false }; },
  computed: {
    logged() { return !!S.account; },
    chats() {
      return [...S.chats].filter((c) => A.charById(c.charId)).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    },
    friends() { return this.chats.map((c) => ({ chat: c, char: A.charById(c.charId) })).filter((x) => x.char); },
    contacts() {
      return [...S.chars].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh'));
    },
    me() { return S.account || {}; },
    stats() {
      return { friends: this.chats.length, chars: S.chars.length, mem: S.memories.length };
    },
    api() { return A.pickApi(null); },
    apiLabel() {
      if (!this.api) return '未配置';
      return this.api.model || this.api.name || '已配置';
    },
    wallLabel() {
      if (S.cfg.ui.wallpaperKey) return '自定义图片';
      const p = (window.WALLS && WALLS[S.cfg.ui.wallpaperPreset || 0]);
      return p ? p.name + ' · 预设' : '默认';
    },
    sizeLabel() {
      const n = S.storageTotal || (S.sizes || []).reduce((a, b) => a + (b.bytes || 0), 0);
      if (!n) return '—';
      return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
    },
    week() {
      const days = (S.stats && S.stats.days) || {};
      const out = []; let max = 1;
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const k = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
        const c = days[k] || 0;
        if (c > max) max = c;
        out.push({ k, c, w: '日一二三四五六'[d.getDay()], today: i === 0 });
      }
      out.max = max;
      return out;
    },
    weekTotal() { return this.week.reduce((a, b) => a + b.c, 0); },
    coverStyle() {
      const k = S.cfg.ui.wallpaperKey;
      if (k && S.imgCache[k]) return { backgroundImage: 'url(' + S.imgCache[k] + ')' };
      return {};
    }
  },
  methods: {
    openChat(chatId) {
      const c = A.chatById(chatId);
      if (c) { c.unread = 0; DB.put('chats', JSON.parse(JSON.stringify(c))); }
      A.go('chat.room', { chatId });
    },
    nameOf(chat) { const c = A.charById(chat.charId); return chat.remark || (c ? c.name : '未知'); },
    charOf(chat) { return A.charById(chat.charId) || {}; },
    preview(chat) {
      return U.clip(chat.lastText || '还没有消息', 30);
    },
    async switchTo(acc) {
      await A.useAccount(acc);
      this.switchSheet = false;
      A.toast('已切换到 ' + acc.name);
    },
    async logout() {
      await A.signOut();
      this.switchSheet = false;
      A.toast('已退出登录');
    },
    goSettings() { A.go('settings'); }
  },
  template: `<div class="page chat-app">
    <chat-login v-if="!logged"></chat-login>
    <template v-else>
      <div style="flex:1;min-height:0;display:flex;flex-direction:column">
        <div class="chat-head">
          <div>
            <h1>{{tab==='friends'?'消息':tab==='contacts'?'通讯录':tab==='discover'?'发现':'我的'}}</h1>
            <div class="sub">{{tab==='friends'?'conversations':tab==='contacts'?'address book':tab==='discover'?'moments & more':'profile'}}</div>
          </div>
          <div class="chat-head-acts">
            <button class="icon-btn" v-if="tab==='friends'||tab==='contacts'" @click="A.go('chat.add')"><ico name="plus" :size="20"/></button>
          </div>
        </div>

        <!-- friends -->
        <template v-if="tab==='friends'">
          <div class="week-strip" v-if="chats.length">
            <div class="ws-top">
              <span class="ws-cap">this week</span>
              <span class="ws-sum">{{weekTotal}} 条消息</span>
            </div>
            <div class="ws-days">
              <div class="ws-d" v-for="d in week" :key="d.k" :class="{today:d.today}">
                <i :style="{height:(4 + 24 * (d.c / week.max)) + 'px',opacity:d.c ? .3 + .7 * (d.c / week.max) : .12}"></i>
                <span>{{d.w}}</span>
              </div>
            </div>
          </div>
          <div class="search-pill">
            <ico name="search" :size="14"/>
            <input v-model="search" placeholder="搜索聊天">
          </div>
          <div class="app-scroll" style="margin-top:6px">
            <div v-if="!friends.length">
              <empty icon="chat" title="还没有好友" sub="在「档案」创建角色，或用通讯号添加一位好友。">
                <button class="btn sm" style="margin-top:6px" @click="A.go('chat.add')">添加好友</button>
              </empty>
            </div>
            <div class="list">
              <div class="chat-row" v-for="f in friends" :key="f.chat.id" v-show="!search || nameOf(f.chat).includes(search) || preview(f.chat).includes(search)" @click="openChat(f.chat.id)">
                <div class="chat-av">
                  <av :file-key="f.char.avatarKey" :name="f.char.name" :size="45"/>
                  <i class="dot" v-if="S.typing[f.chat.id]"></i>
                </div>
                <div class="chat-main">
                  <div class="chat-line1">
                    <div class="chat-name">{{nameOf(f.chat)}}<span v-if="S.typing[f.chat.id]" style="font-size:8px;color:var(--accent-ink);font-weight:500">正在输入</span></div>
                    <div class="chat-time">{{U.rel(f.chat.updatedAt)}}</div>
                  </div>
                  <div class="chat-line1">
                    <div class="chat-preview">{{preview(f.chat)}}</div>
                    <span class="unread" v-if="f.chat.unread">{{f.chat.unread > 99 ? '99+' : f.chat.unread}}</span>
                  </div>
                </div>
              </div>
            </div>
            <div style="height:20px"></div>
          </div>
        </template>

        <!-- contacts -->
        <template v-else-if="tab==='contacts'">
          <div class="app-scroll">
            <div class="group" style="margin:4px 18px 14px">
              <div class="row tap" @click="A.go('chat.add')">
                <div class="row-ico" style="background:#EDF0EA;color:#6D7A66"><ico name="plus" :size="15"/></div>
                <div class="row-main"><div class="row-title">新的朋友</div><div class="row-sub">通过通讯号添加角色</div></div>
                <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
              </div>
            </div>
            <div class="alpha-head">ALL · {{contacts.length}}</div>
            <div class="contact-row" v-for="c in contacts" :key="c.id" @click="A.go('archive.edit',{charId:c.id})">
              <av :file-key="c.avatarKey" :name="c.name" :size="38"/>
              <div class="grow">
                <div class="contact-name">{{c.name}}</div>
                <div class="contact-id">No. {{c.code}}</div>
              </div>
              <span class="chip line">{{c.gender}}</span>
            </div>
            <div v-if="!contacts.length"><empty icon="users" title="通讯录是空的" sub="创建角色后会出现在这里。"/></div>
            <div style="height:24px"></div>
          </div>
        </template>

        <!-- discover -->
        <template v-else-if="tab==='discover'">
          <div class="app-scroll">
            <div class="card" style="margin:4px 18px 12px;overflow:hidden" @click="A.go('chat.moments')">
              <div style="height:104px;position:relative;background:linear-gradient(150deg,#C9C3B6,#8E9585)">
                <div v-if="S.cfg.momentsCoverKey && S.imgCache[S.cfg.momentsCoverKey]" :style="{position:'absolute',inset:0,backgroundImage:'url('+S.imgCache[S.cfg.momentsCoverKey]+')',backgroundSize:'cover'}"></div>
                <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.32))"></div>
                <div style="position:absolute;left:16px;bottom:12px;color:#fff;font-size:13px;font-weight:600;letter-spacing:.04em">朋友圈</div>
              </div>
              <div class="row" style="min-height:48px">
                <div class="row-main"><div class="row-title">看看他们的近况</div><div class="row-sub">{{S.cfg.moments.length}} 条动态</div></div>
                <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
              </div>
            </div>

            <div class="group" style="margin:0 18px 12px">
              <div class="row tap" @click="A.toast('论坛将在下一版开放')">
                <div class="row-ico" style="background:#F1EEF4;color:#7A6F86"><ico name="layers" :size="15"/></div>
                <div class="row-main"><div class="row-title">论坛 <span class="tag">预留</span></div><div class="row-sub">角色们的公开讨论区</div></div>
                <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
              </div>
              <div class="row tap" @click="A.go('worldbooks')">
                <div class="row-ico" style="background:#F4EFE9;color:#8A7864"><ico name="book" :size="15"/></div>
                <div class="row-main"><div class="row-title">世界书</div><div class="row-sub">{{S.worldbooks.length}} 本设定集</div></div>
                <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
              </div>
            </div>
            <div class="section-head" style="padding:2px 22px 8px"><span class="section-title">我们 · 生活</span><span class="section-act" @click="A.go('us')">全部</span></div>
            <div class="group" style="margin:0 18px 12px">
              <div class="row tap" @click="A.go('us')">
                <div class="row-ico" style="background:#F5EEF0;color:#8B7480"><ico name="heart" :size="15"/></div>
                <div class="row-main"><div class="row-title">我们</div><div class="row-sub">第 {{A.dayNo()}} 天 · 胶囊、词云、小房间</div></div>
                <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
              </div>
              <div class="row tap" @click="A.go('music')">
                <div class="row-ico" style="background:#F1EEE9;color:#8A7E6C"><ico name="music" :size="15"/></div>
                <div class="row-main"><div class="row-title">音乐</div><div class="row-sub">{{S.cfg.life.music.tracks.length}} 首 · 只在这个房间里响</div></div>
                <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
              </div>
              <div class="row tap" @click="A.go('books')">
                <div class="row-ico" style="background:#EEF1EA;color:#6D7A66"><ico name="bookmark" :size="15"/></div>
                <div class="row-main"><div class="row-title">书架</div><div class="row-sub">一起读的书、进度与摘句</div></div>
                <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
              </div>
              <div class="row tap" @click="A.go('time')">
                <div class="row-ico" style="background:#F4EFE8;color:#8A7458"><ico name="clock" :size="15"/></div>
                <div class="row-main"><div class="row-title">时光</div><div class="row-sub">纪念日与只给自己看的日记</div></div>
                <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
              </div>
              <div class="row tap" @click="A.go('stickers')">
                <div class="row-ico" style="background:#F2EEF3;color:#7C6C86"><ico name="smile" :size="15"/></div>
                <div class="row-main"><div class="row-title">表情库</div><div class="row-sub">{{(S.cfg.stickers||[]).length}} 张 · AI 也能用</div></div>
                <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
              </div>
            </div>
            <div style="height:20px"></div>
          </div>
        </template>

        <!-- me -->
        <template v-else>
          <div class="app-scroll">
            <div class="me-hero">
              <div class="me-cover" :style="coverStyle">
                <div class="me-cover-lab">M Y &nbsp; P R O F I L E</div>
              </div>
              <div class="me-body">
                <div class="me-av"><av :file-key="me.avatarKey" :name="me.name" :size="60" radius="20px"/></div>
                <div class="me-name">{{me.name}}</div>
                <div class="me-sig">@{{me.username}} · {{me.gender}}<span v-if="me.mbti"> · {{me.mbti}}</span></div>
                <div class="me-bio clamp2">{{me.persona || '还没有写人设。'}}</div>
              </div>
            </div>
            <div class="stat-row">
              <div class="stat"><div class="n">{{stats.friends}}</div><div class="l">好友</div></div>
              <div class="stat"><div class="n">{{stats.chars}}</div><div class="l">角色</div></div>
              <div class="stat"><div class="n">{{stats.mem}}</div><div class="l">记忆</div></div>
            </div>
            <div class="section" style="margin-top:18px">
              <div class="group">
                <div class="row tap" @click="A.go('beauty')">
                  <div class="row-ico"><ico name="image" :size="15"/></div>
                  <div class="row-main"><div class="row-title">外观</div><div class="row-sub">壁纸 · 字体 · 桌面 CSS</div></div>
                  <div class="row-val">{{wallLabel}}</div>
                  <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
                </div>
                <div class="row tap" @click="A.go('settings.api')">
                  <div class="row-ico"><ico name="link" :size="15"/></div>
                  <div class="row-main"><div class="row-title">API 通道</div><div class="row-sub">模型与协议</div></div>
                  <div class="row-val">{{apiLabel}}</div>
                  <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
                </div>
                <div class="row tap" @click="A.go('settings.data')">
                  <div class="row-ico"><ico name="database" :size="15"/></div>
                  <div class="row-main"><div class="row-title">数据存储</div><div class="row-sub">IndexedDB · 本机</div></div>
                  <div class="row-val">{{sizeLabel}}</div>
                  <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
                </div>
                <div class="row">
                  <div class="row-ico"><ico name="zap" :size="15"/></div>
                  <div class="row-main"><div class="row-title">运行状态</div><div class="row-sub">多文件 · 可离线 · 可安装</div></div>
                  <div class="row-val"><span class="live-dot"></span>Running</div>
                </div>
              </div>
            </div>
            <div class="section">
              <div class="group">
                <div class="row tap" @click="A.go('settings')">
                  <div class="row-ico"><ico name="settings" :size="15"/></div>
                  <div class="row-main"><div class="row-title">设置</div><div class="row-sub">API、提示词、数据</div></div>
                  <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
                </div>
                <div class="row tap" @click="A.go('archive')">
                  <div class="row-ico"><ico name="archive" :size="15"/></div>
                  <div class="row-main"><div class="row-title">角色档案</div><div class="row-sub">创建与绑定</div></div>
                  <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
                </div>
                <div class="row tap" @click="switchSheet=true">
                  <div class="row-ico"><ico name="users" :size="15"/></div>
                  <div class="row-main"><div class="row-title">切换账号</div><div class="row-sub">{{S.accounts.length}} 个账号 · 数据相互隔离</div></div>
                  <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
                </div>
                <div class="row tap" @click="logout">
                  <div class="row-ico" style="color:var(--danger)"><ico name="logout" :size="15"/></div>
                  <div class="row-main"><div class="row-title" style="color:var(--danger)">退出登录</div></div>
                </div>
              </div>
            </div>
            <div class="section">
              <div class="helper" style="text-align:center;line-height:1.8">LIWU · 小手机框架 v0.1<br>所有数据来自 IndexedDB</div>
            </div>
            <div style="height:24px"></div>
          </div>
        </template>
      </div>

      <div class="app-tabs">
        <button :class="{on:tab==='friends'}" @click="tab='friends'">
          <span class="t-ico"><ico name="chat" :size="21"/><i class="badge" v-if="chats.some(c=>c.unread)"></i></span>好友
        </button>
        <button :class="{on:tab==='contacts'}" @click="tab='contacts'"><ico name="users" :size="21"/>通讯录</button>
        <button :class="{on:tab==='discover'}" @click="tab='discover'"><ico name="compass" :size="21"/>发现</button>
        <button :class="{on:tab==='me'}" @click="tab='me'"><ico name="user" :size="21"/>我的</button>
      </div>

      <sheet v-if="switchSheet" v-model="switchSheet" title="账号" sub="每个账号拥有独立的好友、记忆与聊天记录">
        <div class="group">
          <div class="row tap" v-for="a in S.accounts" :key="a.id" @click="switchTo(a)">
            <av :file-key="a.avatarKey" :name="a.name" :size="34"/>
            <div class="row-main"><div class="row-title">{{a.name}}</div><div class="row-sub">@{{a.username}}</div></div>
            <ico v-if="a.id===S.account.id" name="check" :size="16" style="color:var(--accent-ink)"/>
          </div>
        </div>
        <template #footer><button class="btn block" @click="logout">退出当前账号</button></template>
      </sheet>
    </template>
  </div>`
};

/* ---------------------------------------------------------- */
/* Add friend                                                  */
/* ---------------------------------------------------------- */
CHAT.Add = {
  data() { return { S, code: '', result: null, tried: false, busy: false }; },
  methods: {
    search() {
      this.tried = true;
      const c = S.chars.find((x) => String(x.code) === this.code.trim());
      this.result = c || null;
    },
    async add() {
      if (!this.result) return;
      this.busy = true;
      const chat = await A.ensureChat(this.result.id);
      this.busy = false;
      S.toast('已添加 ' + this.result.name);
      A.back();
      setTimeout(() => A.go('chat.room', { chatId: chat.id }), 200);
    },
    async create() { A.go('archive.edit'); }
  },
  template: `<div class="page">
    <nav-bar title="添加好友">
      <template #right><button class="txt" @click="create">新建角色</button></template>
    </nav-bar>
    <div class="body pad">
      <div class="card" style="padding:18px;margin-top:8px">
        <div class="eyebrow">CHARACTER ID</div>
        <div style="font-size:15px;font-weight:600;margin-top:8px">输入角色通讯号</div>
        <div class="helper" style="margin:6px 0 14px">通讯号是 8 位数字，在角色档案中生成。</div>
        <div class="f g8">
          <input class="input" v-model="code" placeholder="例如 38410277" style="font-family:var(--mono);letter-spacing:.12em" @keyup.enter="search">
          <button class="btn primary" @click="search">查找</button>
        </div>
      </div>

      <div v-if="result" class="char-card" style="margin-top:16px">
        <av :file-key="result.avatarKey" :name="result.name" :size="52" radius="16px"/>
        <div class="grow">
          <div class="char-name">{{result.name}} <span class="tag">{{result.gender}}</span></div>
          <div class="char-meta">No. {{result.code}}</div>
          <div class="char-tags"><span class="tag">{{result.mbti || '未设定 MBTI'}}</span></div>
        </div>
        <button class="btn sm primary" :disabled="busy" @click="add">添加</button>
      </div>
      <div v-else-if="tried" class="empty" style="padding-top:36px">
        <div class="e-ico"><ico name="search" :size="22"/></div>
        <div class="e-title">没有找到这个通讯号</div>
        <div class="e-sub">确认号码是否正确，或先创建一个角色。</div>
      </div>

      <div class="section" style="padding:0;margin-top:22px">
        <div class="section-head"><span class="section-title">我的角色</span><span class="section-act">点击复制通讯号</span></div>
        <div class="group">
          <div class="row tap" v-for="c in S.chars" :key="c.id" @click="code=String(c.code);navigator.clipboard&&navigator.clipboard.writeText(code);A.toast('已复制 '+code)">
            <av :file-key="c.avatarKey" :name="c.name" :size="30"/>
            <div class="row-main"><div class="row-title">{{c.name}}</div><div class="row-sub">No. {{c.code}}</div></div>
            <ico name="copy" :size="14" style="color:var(--muted-2)"/>
          </div>
        </div>
        <div v-if="!S.chars.length" class="helper" style="text-align:center;padding:18px">还没有角色，先到档案里建一个。</div>
      </div>
    </div>
  </div>`
};

/* ---------------------------------------------------------- */
/* Chat room                                                   */
/* ---------------------------------------------------------- */
CHAT.Room = {
  props: { params: Object },
  data() {
    return {
      S, text: '', drawer: false, narration: '', limit: 40,
      menu: null, editMsg: null, editText: '', editSheet: false,
      scrollEl: null, atBottom: true, cssTag: '', stkOpen: false, stkUrls: {}, viewer: ''
    };
  },
  computed: {
    chat() { return A.chatById(this.params.chatId); },
    char() { return this.chat ? A.charById(this.chat.charId) : null; },
    title() { return this.chat ? (this.chat.remark || (this.char ? this.char.name : '聊天')) : '聊天'; },
    msgs() { return (S.msgs[this.chat.id] || []).slice(-this.limit); },
    typing() { return !!S.typing[this.chat.id]; },
    canMore() { return (S.msgs[this.chat.id] || []).length > this.limit; },
    bgStyle() {
      const k = this.chat.bgKey;
      return k && S.imgCache[k] ? { backgroundImage: 'url(' + S.imgCache[k] + ')' } : {};
    }
  },
  watch: {
    'msgs.length'() { this.toBottom(); this.syncStickers(); }
  },
  async mounted() {
    await A.loadMessages(this.chat.id);
    if (this.chat.bgKey) await A.resolveImg(this.chat.bgKey);
    this.applyCss();
    this.syncStickers();
    this.$nextTick(this.toBottom);
    this.scrollEl = this.$refs.msgs;
    this.scrollEl.addEventListener('scroll', this.onScroll, { passive: true });
  },
  beforeUnmount() {
    if (this.scrollEl) this.scrollEl.removeEventListener('scroll', this.onScroll);
    document.getElementById('room-user-css')?.remove();
  },
  methods: {
    applyCss() {
      let el = document.getElementById('room-user-css');
      if (!el) { el = document.createElement('style'); el.id = 'room-user-css'; document.head.appendChild(el); }
      const scope = '.room-' + this.chat.id;
      const sc = (css, extra) => css.replace(/(^|\})\s*([^@}{]+)\{/g, (m, b, sel) => b + sel.split(',').map((s) => scope + (extra || '') + ' ' + s.trim()).join(',') + '{');
      el.textContent = sc(this.chat.chatCss || '') + '\n' + sc(this.chat.bubbleCss || '', ' .bubble');
    },
    onScroll() {
      const el = this.$refs.msgs;
      this.atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
      if (el.scrollTop < 40 && this.canMore) this.limit += 30;
    },
    toBottom() {
      this.$nextTick(() => {
        const el = this.$refs.msgs;
        if (el && this.atBottom !== false) el.scrollTop = el.scrollHeight;
      });
    },
    blocks(m) {
      const all = parseRaw(m.raw);
      return m.imageKey ? all.filter((b) => b.type !== 'say') : all;
    },
    stickerUrl(name) { return this.stkUrls[name] || ''; },
    imgSrc(key) { return this.stkUrls['img:' + key] || ''; },
    onImgLoad() { if (this.atBottom) this.toBottom(); },
    openViewer(key) { this.viewer = this.imgSrc(key); },
    pickImage() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = async () => {
        if (!input.files[0]) return;
        this.drawer = false;
        await A.sendImage(this.chat.id, input.files[0]);
        this.$nextTick(this.toBottom);
      };
      input.click();
    },
    async syncStickers() {
      const names = new Set();
      for (const m of this.msgs) {
        if (m.imageKey && !this.stkUrls['img:' + m.imageKey]) {
          const u = S.imgCache[m.imageKey] || await A.resolveImg(m.imageKey);
          if (u) this.stkUrls['img:' + m.imageKey] = u;
        }
        parseRaw(m.raw).forEach((b) => { if (b.type === 'sticker') names.add(b.name); });
      }
      for (const n of names) {
        if (this.stkUrls[n]) continue;
        const s = A.stickerByName(n);
        if (!s) continue;
        const u = S.imgCache[s.fileKey] || await A.resolveImg(s.fileKey);
        if (u) this.stkUrls[n] = u;
      }
    },
    async sendSticker(name) {
      this.stkOpen = false;
      this.atBottom = true;
      await A.send(this.chat.id, '[表情:' + name + ']');
    },
    isNarrOnly(m) { return m.narration && !parseRaw(m.raw).some((b) => b.type === 'say'); },
    sendText() {
      const t = this.text.trim();
      if (!t) return;
      this.text = '';
      this.$nextTick(() => { if (this.$refs.ta) this.$refs.ta.style.height = '32px'; });
      this.atBottom = true;
      A.send(this.chat.id, t);
      this.toBottom();
    },
    grow(e) {
      const el = e.target;
      el.style.height = '32px';
      el.style.height = Math.min(100, el.scrollHeight) + 'px';
    },
    sendNarration() {
      const t = this.narration.trim();
      if (!t) return;
      if (t.length > 50) { A.toast('单段旁白不超过 50 字'); return; }
      A.send(this.chat.id, t, { narration: true });
      this.narration = '';
      this.drawer = false;
      this.atBottom = true;
      this.toBottom();
    },
    toggleTimeAware(v) {
      this.chat.timeAware = v;
      DB.put('chats', JSON.parse(JSON.stringify(this.chat)));
      A.toast(v ? '已开启时间感知：上下文将带上真实时间' : '已关闭时间感知');
    },
    pressBubble(e, m, block) {
      if (this.editSheet) return;
      const startX = e.clientX, startY = e.clientY;
      const timer = setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(8);
        const scr = document.querySelector('.screen').getBoundingClientRect();
        this.menu = {
          x: Math.min(Math.max(12, e.clientX - scr.left - 66), scr.width - 150),
          y: Math.max(56, e.clientY - scr.top - 8),
          msg: m, block
        };
        setTimeout(() => {
          document.addEventListener('pointerdown', this.closeMenu, { once: true });
        }, 60);
      }, 420);
      const cancel = (ev) => {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 8) clearTimeout(timer);
        window.removeEventListener('pointermove', cancel);
      };
      window.addEventListener('pointermove', cancel);
    },
    closeMenu() { this.menu = null; },
    startEdit() {
      this.editMsg = this.menu.msg;
      this.editText = this.menu.msg.raw;
      this.menu = null;
      this.editSheet = true;
    },
    async saveEdit() {
      await A.updateMessage(this.chat.id, this.editMsg.id, this.editText);
      this.editSheet = false;
      A.toast('已保存');
    },
    async deleteBubble() {
      const { msg, block } = this.menu;
      this.menu = null;
      const raw = msg.raw;
      const start = block.start, end = block.end;
      let next = (raw.slice(0, start) + raw.slice(end)).replace(/\n{3,}/g, '\n\n').trim();
      if (!next) {
        await A.deleteMessage(this.chat.id, msg.id);
      } else {
        await A.updateMessage(this.chat.id, msg.id, next);
      }
      A.toast('已删除这一段');
    },
    async regenerate() {
      const msg = this.menu.msg;
      this.menu = null;
      await A.regenerate(this.chat.id, msg.id);
      this.atBottom = true;
      A.toast('正在重新回应…');
    },
    goSettings() { A.go('chat.settings', { chatId: this.chat.id }); },
    fmtTime(ts) { return U.hhmm(ts); },
    dayShown(i) {
      const arr = this.msgs;
      if (i === 0) return true;
      return U.dayKey(arr[i].ts) !== U.dayKey(arr[i - 1].ts);
    },
    openTool(b) { b.open = !b.open; }
  },
  template: `<div class="page room" :class="'room-'+chat.id">
    <div class="room-bg" :style="bgStyle"></div>
    <div class="room-layer">
      <div class="room-nav">
        <button class="nav-back" @click="A.back()"><ico name="chevronLeft" :size="21" :sw="1.9"/></button>
        <div class="room-title">
          <div class="room-name">{{typing ? '对方正在输入…' : title}}</div>
          <div class="room-status" :class="{typing}">
            <template v-if="typing"><span class="typing-dots"><i></i><i></i><i></i></span></template>
            <template v-else>{{char.gender}} · {{char.mbti || 'online'}}</template>
          </div>
        </div>
        <div class="nav-act">
          <button class="nav-back" @click="goSettings"><ico name="more" :size="20"/></button>
        </div>
      </div>

      <div class="msgs" ref="msgs">
        <div v-if="canMore" style="text-align:center;font-size:9px;color:var(--muted-2);padding:2px 0 12px">上滑加载更早的消息</div>
        <div v-if="!msgs.length" class="empty" style="padding-top:60px">
          <div class="e-ico"><ico name="feather" :size="22"/></div>
          <div class="e-title">故事从这里开始</div>
          <div class="e-sub">说第一句话吧，{{char.name}}在等你。</div>
        </div>

        <template v-for="(m,i) in msgs" :key="m.id">
          <div class="day-sep" v-if="dayShown(i)"><span>{{U.dayLabel(m.ts)}}</span></div>

          <div class="narr" v-if="m.narration">{{m.raw}}</div>

          <div class="msg" v-else :class="m.role==='user'?'me':'them'">
            <div class="msg-av">
              <av :file-key="m.role==='user'?S.account.avatarKey:char.avatarKey" :name="m.role==='user'?S.account.name:char.name" :size="32" radius="11px"/>
              <span class="msg-time">{{fmtTime(m.ts)}}</span>
            </div>
            <div class="msg-body">
              <div v-if="m.imageKey" class="img-msg" @click="openViewer(m.imageKey)">
                <img :src="imgSrc(m.imageKey)" alt="图片" @load="onImgLoad">
              </div>
              <template v-for="(b,bi) in blocks(m)" :key="bi">
                <div v-if="b.type==='think'" class="think" :class="{open:b.open}">
                  <div class="think-head" @click="openTool(b)">
                    <ico name="sparkle" :size="10"/><span>思考过程</span>
                    <ico class="arr" name="chevronDown" :size="11"/>
                  </div>
                  <div v-if="b.open" class="think-body">{{b.text}}</div>
                </div>
                <div v-else-if="b.type==='tool'" class="tool" :class="{open:b.open}">
                  <div class="tool-head" @click="openTool(b)">
                    <ico name="database" :size="10"/><span class="tname">检索记忆</span><span style="color:var(--muted-2)">· {{U.clip(b.text,18)}}</span>
                    <ico class="arr" name="chevronDown" :size="10"/>
                  </div>
                  <div v-if="b.open" class="tool-body">{{b.text}}</div>
                </div>
                <div v-else-if="b.type==='narr'" class="narr">{{b.text}}</div>
                <div v-else-if="b.type==='sticker'" class="stk-msg" @pointerdown="pressBubble($event,m,b)">
                  <img v-if="stickerUrl(b.name)" :src="stickerUrl(b.name)" :alt="b.name">
                  <span v-else class="stk-missing">{{b.name}}</span>
                </div>
                <div v-else class="bubble" :class="{multi:false}" @pointerdown="pressBubble($event,m,b)">{{b.text}}</div>
              </template>
            </div>
          </div>
        </template>
        <div style="height:6px"></div>
      </div>

      <div class="composer">
        <button class="comp-btn" @click="drawer=true"><ico name="plus" :size="18"/></button>
        <button class="comp-btn" @click="stkOpen=true"><ico name="smile" :size="18"/></button>
        <textarea ref="ta" class="comp-input" v-model="text" rows="1" placeholder="说点什么…" @input="grow" @keydown.enter.exact.prevent="sendText"></textarea>
        <button class="send-btn" :class="{off:!text.trim(),sending:typing}" @click="sendText"><ico name="send" :size="16" :sw="1.9"/></button>
      </div>
    </div>

    <stk-picker v-model="stkOpen" @pick="sendSticker"/>

    <teleport to=".screen">
      <div v-if="viewer" class="img-view" @click="viewer=''">
        <img :src="viewer" alt="图片">
        <div class="iv-hint">点击任意处关闭</div>
      </div>
    </teleport>

    <!-- bubble menu -->
    <teleport to=".screen">
      <div v-if="menu" class="bub-menu" :style="{left:menu.x+'px',top:menu.y+'px'}" @click.stop>
        <button @click="startEdit"><ico name="edit" :size="13"/>编辑原始文本</button>
        <button @click="deleteBubble" class="danger"><ico name="trash" :size="13"/>删除这一段</button>
        <template v-if="menu.msg.role==='char'">
          <div class="sep"></div>
          <button @click="regenerate"><ico name="refresh" :size="13"/>重回这一轮</button>
        </template>
      </div>
    </teleport>

    <!-- drawer -->
    <sheet v-if="drawer" v-model="drawer" title="输入工具" sub="旁白会以居中淡化样式发送，并进入上下文">
      <div class="drawer">
        <div class="d-sec">
          <div class="d-head"><div class="d-title"><ico name="quote" :size="13"/>旁白输入</div><span class="mono">{{narration.length}}/50</span></div>
          <textarea class="textarea narr-input" v-model="narration" maxlength="60" placeholder="如：窗外的雨忽然大了起来。"></textarea>
          <div class="quick-row">
            <button class="chip" @click="narration='他停顿了一下，像是在斟酌措辞。'">停顿</button>
            <button class="chip" @click="narration='光线暗下去，房间里只剩屏幕的亮。'">环境</button>
            <button class="chip" @click="narration='他垂下眼，指尖在桌沿轻轻敲了两下。'">动作</button>
          </div>
        </div>
        <div class="d-sec">
          <div class="d-head">
            <div class="d-title"><ico name="clock" :size="13"/>时间感知</div>
            <toggle :model-value="chat.timeAware" @update:model-value="toggleTimeAware"/>
          </div>
          <div class="d-desc">开启后，最近上下文会带上真实的日期与时间（精确到分钟），让角色感知“现在”。</div>
        </div>
        <div class="d-sec">
          <div class="d-head"><div class="d-title"><ico name="layers" :size="13"/>上下文</div></div>
          <div class="d-desc">当前已载入 {{(S.msgs[chat.id]||[]).length}} 条消息 · 阈值 {{S.cfg.memory.threshold}} 条自动总结</div>
          <div class="f g6" style="margin-top:9px">
            <button class="btn sm" @click="pickImage">发送图片</button>
            <button class="btn sm" @click="A.summarize(chat)">立即总结</button>
            <button class="btn sm" @click="A.toast('上下文按提示词顺序实时拼装')">查看拼接</button>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn block" @click="drawer=false">取消</button>
        <button class="btn primary" style="flex:1" @click="sendNarration">发送旁白</button>
      </template>
    </sheet>

    <!-- edit -->
    <sheet v-if="editSheet" v-model="editSheet" title="编辑原始文本" sub="这里看到的是未截断的完整回复，包含格式标记">
      <textarea class="textarea" style="min-height:220px;font-family:var(--mono);font-size:11px;line-height:1.7" v-model="editText"></textarea>
      <template #footer>
        <button class="btn block" @click="editSheet=false">取消</button>
        <button class="btn primary" style="flex:1" @click="saveEdit">保存</button>
      </template>
    </sheet>
  </div>`
};

/* ---------------------------------------------------------- */
/* Chat settings + beauty                                      */
/* ---------------------------------------------------------- */
CHAT.Settings = {
  props: { params: Object },
  data() { return { S, remarkSheet: false, remark: '', confirmDel: false }; },
  computed: {
    chat() { return A.chatById(this.params.chatId); },
    char() { return this.chat ? A.charById(this.chat.charId) : null; }
  },
  mounted() { this.remark = this.chat.remark || ''; },
  methods: {
    saveRemark() {
      this.chat.remark = this.remark.trim();
      DB.put('chats', JSON.parse(JSON.stringify(this.chat)));
      this.remarkSheet = false;
      A.toast('备注已更新');
    },
    async clearChat() {
      if (!confirm('清空该好友的全部聊天记录？此操作不可撤销。')) return;
      const all = await DB.all('messages');
      for (const m of all.filter((m) => m.chatId === this.chat.id)) await DB.del('messages', m.id);
      S.msgs[this.chat.id] = [];
      this.chat.lastText = ''; this.chat.seq = 0; this.chat.unread = 0;
      await DB.put('chats', JSON.parse(JSON.stringify(this.chat)));
      A.refreshSizes();
      A.toast('聊天记录已清空');
    },
    async removeChat() {
      if (!this.confirmDel) { this.confirmDel = true; return; }
      await A.deleteCharacter(this.char.id);
      A.toast('已删除该角色及其数据');
      A.go('chat');
    },
    openBeauty() { A.go('chat.beauty', { chatId: this.chat.id }); }
  },
  template: `<div class="page">
    <nav-bar title="聊天设置"></nav-bar>
    <div class="body">
      <div class="set-hero">
        <av :file-key="char.avatarKey" :name="char.name" :size="54" radius="18px"/>
        <div class="grow">
          <div class="nm">{{char.name}}</div>
          <div class="id">No. {{char.code}}</div>
        </div>
        <span class="chip">{{char.gender}}</span>
      </div>

      <div class="section" style="margin-top:14px">
        <div class="group">
          <div class="row tap" @click="remarkSheet=true">
            <div class="row-main"><div class="row-title">好友备注</div><div class="row-sub">只在你这边显示</div></div>
            <div class="row-val">{{chat.remark || '未设置'}}</div>
            <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
          </div>
          <div class="row tap" @click="openBeauty">
            <div class="row-main"><div class="row-title">聊天页美化</div><div class="row-sub">聊天室 CSS、气泡 CSS、背景</div></div>
            <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="group">
          <div class="row tap" @click="A.go('archive.edit',{charId:char.id})">
            <div class="row-main"><div class="row-title">查看角色档案</div></div>
            <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
          </div>
          <div class="row tap" @click="A.go('worldbooks',{charId:char.id})">
            <div class="row-main"><div class="row-title">绑定世界书</div><div class="row-sub">{{(char.worldbookIds||[]).length}} 本</div></div>
            <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
          </div>
          <div class="row tap" @click="A.go('memories',{charId:char.id})">
            <div class="row-main"><div class="row-title">记忆管理</div><div class="row-sub">{{A.charMemories(char.id).length}} 条</div></div>
            <ico name="chevronRight" :size="14" style="color:var(--muted-2)"/>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="group">
          <div class="row tap" @click="clearChat"><div class="row-main"><div class="row-title">清空聊天记录</div></div></div>
          <div class="row tap" @click="removeChat"><div class="row-main"><div class="row-title" style="color:var(--danger)">{{confirmDel?'再点一次确认删除':'删除好友及全部数据'}}</div></div></div>
        </div>
      </div>
      <div style="height:30px"></div>
    </div>

    <sheet v-if="remarkSheet" v-model="remarkSheet" title="好友备注">
      <input class="input" v-model="remark" maxlength="16" placeholder="给这段关系一个称呼">
      <template #footer>
        <button class="btn block" @click="remarkSheet=false">取消</button>
        <button class="btn primary" style="flex:1" @click="saveRemark">保存</button>
      </template>
    </sheet>
  </div>`
};

CHAT.Beauty = {
  props: { params: Object },
  data() { return { S, css: '', bub: '', bgUrl: '' }; },
  computed: {
    chat() { return A.chatById(this.params.chatId); },
    char() { return this.chat ? A.charById(this.chat.charId) : null; }
  },
  async mounted() {
    this.css = this.chat.chatCss || '';
    this.bub = this.chat.bubbleCss || '';
  },
  watch: {
    css() { this.chat.chatCss = this.css; DB.put('chats', JSON.parse(JSON.stringify(this.chat))); },
    bub() { this.chat.bubbleCss = this.bub; DB.put('chats', JSON.parse(JSON.stringify(this.chat))); }
  },
  methods: {
    uploadBg() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = async () => {
        if (!input.files[0]) return;
        this.chat.bgKey = await A.replaceImage(this.chat.bgKey, input.files[0]);
        await A.resolveImg(this.chat.bgKey);
        await DB.put('chats', JSON.parse(JSON.stringify(this.chat)));
        A.toast('背景已更新');
      };
      input.click();
    },
    removeBg() {
      if (this.chat.bgKey) { DB.delFile(this.chat.bgKey); delete S.imgCache[this.chat.bgKey]; }
      this.chat.bgKey = '';
      DB.put('chats', JSON.parse(JSON.stringify(this.chat)));
    },
    preset(kind) {
      if (kind === 'bubble') this.bub = '/* 只作用于气泡 */\n.bubble{\n  background: rgba(255,255,255,.66) !important;\n  backdrop-filter: blur(12px);\n  border: 1px solid rgba(255,255,255,.7);\n}';
      else this.css = '/* 作用于整个聊天室 */\n.msgs{\n  background-image: radial-gradient(rgba(23,23,27,.06) 1px, transparent 1px);\n  background-size: 16px 16px;\n}';
    }
  },
  template: `<div class="page">
    <nav-bar title="聊天页美化">
      <template #right><button class="txt" @click="A.back()">完成</button></template>
    </nav-bar>
    <div class="body pad">
      <div class="section" style="padding:0;margin-top:8px">
        <div class="section-head"><span class="section-title">聊天室背景</span><span class="section-act" @click="removeBg" v-if="chat.bgKey">移除</span></div>
        <div class="bg-pick" style="height:112px" :style="chat.bgKey&&S.imgCache[chat.bgKey]?{backgroundImage:'url('+S.imgCache[chat.bgKey]+')',backgroundSize:'cover',borderStyle:'solid'}:{}" @click="uploadBg">
          <ico v-if="!chat.bgKey" name="image" :size="20"/><span v-if="!chat.bgKey">上传一张聊天背景</span>
        </div>
      </div>

      <div class="section" style="padding:0;margin-top:22px">
        <div class="section-head"><span class="section-title">聊天室 CSS</span><span class="section-act" @click="preset('room')">插入示例</span></div>
        <textarea class="editor-area css-area" v-model="css" spellcheck="false" placeholder=".msgs { }&#10;.composer { }&#10;/* 仅作用于这个好友的聊天室 */"></textarea>
        <div class="helper" style="margin-top:6px">生效范围：该好友的整个聊天室（不含气泡内部）。</div>
      </div>

      <div class="section" style="padding:0;margin-top:20px">
        <div class="section-head"><span class="section-title">气泡 CSS</span><span class="section-act" @click="preset('bubble')">插入示例</span></div>
        <textarea class="editor-area css-area" v-model="bub" spellcheck="false" placeholder=".bubble { }&#10;.msg.me .bubble { }&#10;/* 仅作用于气泡，层级高于聊天室 */"></textarea>
        <div class="helper" style="margin-top:6px">气泡样式在聊天室样式之后注入，优先级更高。支持透明底、圆角、背景图。</div>
      </div>

      <div class="section" style="padding:0;margin-top:20px">
        <div class="section-head"><span class="section-title">预览</span></div>
        <div style="border-radius:18px;overflow:hidden;border:1px solid var(--line);padding:12px;background:var(--paper-2)">
          <div class="msg them" style="margin:0">
            <div class="msg-av"><av :file-key="char.avatarKey" :name="char.name" :size="28" radius="9px"/></div>
            <div class="msg-body">
              <div class="bubble">这是一条示例气泡，用来预览你的设定。</div>
            </div>
          </div>
          <div class="msg me" style="margin:6px 0 0">
            <div class="msg-av"><av :file-key="S.account.avatarKey" :name="S.account.name" :size="28" radius="9px"/></div>
            <div class="msg-body"><div class="bubble">收到。</div></div>
          </div>
        </div>
      </div>
      <div style="height:26px"></div>
    </div>
  </div>`
};

/* ---------------------------------------------------------- */
/* Moments                                                     */
/* ---------------------------------------------------------- */
CHAT.Moments = {
  data() { return { S, compose: false, draft: '', imgs: [], commentFor: null, commentText: '', fwd: null }; },
  computed: {
    list() { return S.cfg.moments || []; },
    me() { return S.account || {}; }
  },
  methods: {
    uploadCover() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = async () => {
        if (!input.files[0]) return;
        S.cfg.momentsCoverKey = await A.replaceImage(S.cfg.momentsCoverKey, input.files[0]);
        await A.resolveImg(S.cfg.momentsCoverKey);
        saveCfg(true);
        A.toast('封面已更新');
      };
      input.click();
    },
    openCompose() { this.draft = ''; this.imgs = []; this.compose = true; },
    async addImages() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
      input.onchange = async () => {
        for (const f of Array.from(input.files).slice(0, 9 - this.imgs.length)) {
          const key = await A.uploadImage(f);
          this.imgs.push(key);
        }
      };
      input.click();
    },
    async post() {
      if (!this.draft.trim() && !this.imgs.length) return;
      S.cfg.moments.unshift({
        id: U.uid('mo'), text: this.draft.trim(), imgs: this.imgs, ts: Date.now(),
        likes: [], comments: [], shares: 0
      });
      await saveCfg(true);
      this.compose = false;
      A.toast('已发布');
    },
    like(m) {
      const i = m.likes.indexOf(this.me.id);
      if (i >= 0) m.likes.splice(i, 1); else m.likes.push(this.me.id);
      saveCfg();
    },
    isLiked(m) { return m.likes.includes(this.me.id); },
    openComment(m) { this.commentFor = m; this.commentText = ''; },
    addComment() {
      if (!this.commentText.trim()) return;
      this.commentFor.comments.push({ id: U.uid('c'), name: me.name, text: this.commentText.trim() });
      saveCfg();
      this.commentFor = null;
      A.toast('已评论');
    },
    share(m) { m.shares = (m.shares || 0) + 1; saveCfg(); A.toast('已转发到你的主页'); },
    remove(m) {
      if (!confirm('删除这条动态？')) return;
      S.cfg.moments = S.cfg.moments.filter((x) => x.id !== m.id);
      saveCfg();
    },
    imgUrl(k) { return S.imgCache[k] || ''; }
  },
  async mounted() {
    S.statusDark = true;
    if (S.cfg.momentsCoverKey) await A.resolveImg(S.cfg.momentsCoverKey);
    for (const m of this.list) for (const k of m.imgs || []) await A.resolveImg(k);
  },
  beforeUnmount() { S.statusDark = false; },
  template: `<div class="moments">
    <div class="mo-cover">
      <div class="cover-img" v-if="S.cfg.momentsCoverKey && S.imgCache[S.cfg.momentsCoverKey]" :style="{backgroundImage:'url('+S.imgCache[S.cfg.momentsCoverKey]+')'}"></div>
      <div class="mo-top">
        <button @click="A.back()"><ico name="chevronLeft" :size="19"/></button>
        <div class="f g6">
          <button @click="uploadCover"><ico name="camera" :size="16"/></button>
          <button @click="openCompose"><ico name="plus" :size="18"/></button>
        </div>
      </div>
      <div class="mo-id">
        <div class="nm">{{me.name}}</div>
        <av :file-key="me.avatarKey" :name="me.name" :size="64" radius="18px"/>
      </div>
    </div>
    <div class="mo-body">
      <div class="mo-sig">
        <span>{{S.cfg.momentsSig}}</span>
        <span style="flex:none;color:var(--muted-2)">{{list.length}} posts</span>
      </div>

      <div v-if="!list.length" class="mo-empty">还没有动态。<br>拍一张照片，或者写一句话，让它慢慢长出来。</div>

      <div class="mo-card" v-for="m in list" :key="m.id">
        <div class="mh">
          <av :file-key="me.avatarKey" :name="me.name" :size="32" radius="10px"/>
          <div class="grow"><div class="nm">{{me.name}}</div><div class="tm">{{U.rel(m.ts)}}</div></div>
          <button class="icon-btn" style="width:26px;height:26px" @click="remove(m)"><ico name="more" :size="16"/></button>
        </div>
        <div class="mo-text" v-if="m.text">{{m.text}}</div>
        <div class="mo-imgs" v-if="m.imgs && m.imgs.length" :style="{gridTemplateColumns:'repeat('+Math.min(3,m.imgs.length)+',1fr)'}">
          <div v-for="k in m.imgs" :key="k" :style="{backgroundImage:'url('+imgUrl(k)+')'}"></div>
        </div>
        <div class="mo-foot">
          <button :class="{on:isLiked(m)}" @click="like(m)"><ico name="heart" :size="13"/>{{m.likes.length||'赞'}}</button>
          <button @click="openComment(m)"><ico name="comment" :size="13"/>{{m.comments.length||'评论'}}</button>
          <button @click="share(m)"><ico name="share" :size="13"/>{{m.shares||'转发'}}</button>
        </div>
        <div class="mo-likes" v-if="m.likes.length">
          <ico name="heart" :size="10"/> {{m.likes.length}} 人觉得这条不错
        </div>
        <div class="mo-cmts" v-if="m.comments.length">
          <div class="mo-cmt" v-for="c in m.comments" :key="c.id"><b>{{c.name}}</b>{{c.text}}</div>
        </div>
      </div>
      <div style="height:20px"></div>
    </div>

    <sheet v-if="compose" v-model="compose" title="新的动态" sub="只属于你的朋友圈">
      <div class="form-stack">
        <textarea class="textarea" v-model="draft" maxlength="300" placeholder="此刻在想什么？" style="min-height:110px"></textarea>
        <div class="f g6" style="flex-wrap:wrap">
          <div v-for="k in imgs" :key="k" style="width:64px;height:64px;border-radius:10px;background-image:url(imgUrl(k));background-size:cover;background-position:center"></div>
          <button v-if="imgs.length<9" class="up-box" style="width:64px;height:64px;border-radius:10px" @click="addImages"><ico name="plus" :size="18"/></button>
        </div>
      </div>
      <template #footer><button class="btn primary block" @click="post">发布</button></template>
    </sheet>

    <sheet v-if="!!commentFor" :model-value="!!commentFor" @update:model-value="commentFor=null" title="评论">
      <textarea class="textarea" v-model="commentText" placeholder="说点什么…"></textarea>
      <template #footer><button class="btn primary block" @click="addComment">发送</button></template>
    </sheet>
  </div>`
};
