/* ============================================================
   LIWU OS — 通知 / 角标 / 实时状态 / App 联动
   让小手机像真正的手机：顶栏 Push、角标小红点、他的状态、跨 App 联动
   ============================================================ */
window.OS = (function () {
  let bt = null; // banner 定时器
  function ensure() {
    if (!S.cfg.os) S.cfg.os = { notices: [], status: {}, version: 1 };
    if (!Array.isArray(S.cfg.os.notices)) S.cfg.os.notices = [];
    if (!S.cfg.os.status) S.cfg.os.status = {};
  }

  const api = {
    /* 推送一条通知：顶部横幅 + 角标 + 持久化 */
    notify(opts) {
      ensure();
      const meta = (window.APPS && APPS[opts.app]) || {};
      const it = {
        id: U.uid('nt'),
        app: opts.app || meta.id || 'system',
        icon: opts.icon || meta.icon || 'bell',
        title: opts.title || meta.name || '通知',
        body: opts.body || '',
        route: opts.route || meta.route || '',
        params: opts.params || {},
        action: opts.action || null,
        ts: opts.ts || Date.now(),
        read: false
      };
      S.cfg.os.notices.unshift(it);
      if (S.cfg.os.notices.length > 80) S.cfg.os.notices.length = 80;
      api.bump(it.app, opts.count == null ? 1 : opts.count);
      S.banner = { id: it.id, app: it.app, icon: it.icon, title: it.title, body: it.body, route: it.route, params: it.params, action: it.action };
      clearTimeout(bt);
      bt = setTimeout(() => { if (S.banner && S.banner.id === it.id) S.banner = null; }, 4600);
      saveCfg();
      return it;
    },

    /* 角标：累加 / 设置 / 清除 */
    bump(app, n) {
      if (!app) return;
      const v = (S.badges[app] || 0) + (n == null ? 1 : n);
      if (v <= 0) delete S.badges[app]; else S.badges[app] = v;
    },
    setBadge(app, n) {
      if (!app) return;
      if (!n) delete S.badges[app]; else S.badges[app] = n;
    },
    clearBadge(app) {
      if (app) delete S.badges[app];
      else S.badges = {};
      saveCfg();
    },
    badge(app) { return S.badges[app] || 0; },

    /* 打开某 App 时清掉它的角标与未读 */
    readApp(app) {
      ensure();
      let changed = false;
      S.cfg.os.notices.forEach((n) => { if (n.app === app && !n.read) { n.read = true; changed = true; } });
      if (S.badges[app]) { delete S.badges[app]; changed = true; }
      if (changed) saveCfg();
    },

    unread() { ensure(); return S.cfg.os.notices.filter((n) => !n.read).length; },
    markNotice(id) {
      ensure();
      const n = S.cfg.os.notices.find((x) => x.id === id);
      if (n && !n.read) { n.read = true; saveCfg(); }
    },
    clearAll() {
      ensure();
      S.cfg.os.notices.forEach((n) => (n.read = true));
      S.badges = {}; saveCfg();
    },

    /* 他的实时状态：主屏状态条 + 联动触发点 */
    setStatus(s) {
      ensure();
      Object.assign(S.cfg.os.status, s);
      saveCfg();
    },
    statusText() {
      ensure();
      const st = S.cfg.os.status || {};
      if (st.text) return st.text;
      const a = st.activity || '自由';
      const p = st.place || '家';
      return '他正在' + p + ' · ' + a;
    },

    /* App 联动：事件 → 自动通知 / 状态
       rule: {on:'weather', run:()=>{...}} */
    links: {},
    on(event, fn) { (api.links[event] = api.links[event] || []).push(fn); },
    emit(event, payload) {
      (api.links[event] || []).forEach((fn) => { try { fn(payload); } catch (e) {} });
    },

    /* 首次开机播下几条通知，让「通知系统」可见 */
    seedDemo() {
      ensure();
      if (S.cfg.os.seeded) return;
      S.cfg.os.seeded = true;
      const t0 = Date.now();
      const demo = [
        { app: 'messages', icon: 'comment', title: '他的消息', body: '早安。今天也要好好吃饭。', ts: t0 - 3600e3 * 5, read: true },
        { app: 'weather', icon: 'sun', title: '天气', body: '你那边今天降温了，记得加一件外套。', ts: t0 - 3600e3 * 3, read: false },
        { app: 'notes', icon: 'note', title: '他的备忘录', body: '记下了你的生日愿望清单 ✦', ts: t0 - 3600e3 * 1, read: false }
      ];
      demo.forEach((d) => {
        const meta = (APPS && APPS[d.app]) || {};
        S.cfg.os.notices.unshift({ id: U.uid('nt'), app: d.app, icon: d.icon || meta.icon, title: d.title, body: d.body, route: meta.route || '', params: {}, ts: d.ts, read: d.read });
        if (!d.read) api.bump(d.app, 1);
      });
      saveCfg();
    }
  };

  /* 注册默认联动：天气变化 → 切到聊天时他先开口 */
  api.on('weather.change', (p) => {
    api.notify({
      app: 'weather', icon: 'sun', title: '天气',
      body: (p && p.tip) || '今天天气有变化，他好像想提醒你点什么。',
      route: 'chat'
    });
  });

  return api;
})();

/* 打开 App 时顺手清角标 / 未读 */
const _openApp = window.A.openApp;
if (_openApp) {
  window.A.openApp = function (appId) {
    if (window.OS) OS.readApp(appId);
    return _openApp.apply(this, arguments);
  };
}
const _go = window.__go;
if (_go) {
  window.__go = function (name, params) {
    // 通知中心点开通知时，按 appId 清角标
    return _go.apply(this, arguments);
  };
}
