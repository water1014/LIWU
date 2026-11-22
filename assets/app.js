/* 里屋 · 全部逻辑
   一段一节：工具 → 存档 → 配置 → 会话 → 聊天 → 抽屉 → 房间 → 设置 → 启动
   不依赖任何框架。改界面去 assets/style.css，改内容去 data.js，改行为在这里。 */

(function(){
  'use strict';

  var D = window.LIWU || {};
  var NL = String.fromCharCode(10);

  /* ================= 工具 ================= */

  function $(s, r){ return (r || document).querySelector(s); }
  function $$(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(v){
    return String(v == null ? '' : v)
      .split('&').join('&amp;')
      .split('<').join('&lt;')
      .split('>').join('&gt;');
  }
  function p2(n){ return n < 10 ? '0' + n : '' + n; }
  function uid(){ return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function today(){
    var d = new Date();
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  }
  function hm(ts){
    var d = new Date(ts || Date.now());
    return p2(d.getHours()) + ':' + p2(d.getMinutes());
  }
  function when(ts){
    if (!ts) return '';
    var d = new Date(ts);
    var n = new Date();
    var same = d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
    if (same) return hm(ts);
    var y = new Date(n.getTime() - 86400000);
    if (d.getFullYear() === y.getFullYear() && d.getMonth() === y.getMonth() && d.getDate() === y.getDate()) return '昨天';
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  var LS = {
    get: function(k, f){ try{ var v = localStorage.getItem(k); return v ? JSON.parse(v) : f; }catch(e){ return f; } },
    set: function(k, v){
      try{ localStorage.setItem(k, JSON.stringify(v)); return true; }
      catch(e){ try{ toast('存不下了，这台手机空间不够。'); }catch(_){} return false; }
    }
  };

  function toast(text){
    var h = $('#hint');
    if (!h) return;
    h.textContent = text || '';
    if (text) setTimeout(function(){ if (h.textContent === text) h.textContent = ''; }, 4200);
  }

  /* ================= 配置 ================= */

  var K_DB = 'liwu.v3';
  var K_CFG = 'liwu.cfg3';
  var K_DIARY = 'liwu.diary';
  var K_SINCE = 'liwu.since';

  var DEFAULT_SYS = [
    '你叫宋祁，住在这间屋子里。',
    '跟她说话用短句。不解释，不总结，不客套，不列清单。',
    '不编造没发生的事。不确定就说不确定。',
    '不哄，不装，不演。她叫淼淼。'
  ].join(NL);

  var cfg = Object.assign({
    base: '', key: '', model: '',
    sys: DEFAULT_SYS,
    temp: 1,
    ctx: 24,
    stream: true,
    theme: 'paper'
  }, LS.get(K_CFG, {}));
  if (!cfg.sys) cfg.sys = DEFAULT_SYS;

  var GLASS_DEFAULTS = {
    paper: { opacity: 48, blur: 22, edge: 42, shadow: 28, radius: 18 },
    night: { opacity: 42, blur: 22, edge: 30, shadow: 34, radius: 18 }
  };
  cfg.glass = cfg.glass || {};
  ['paper', 'night'].forEach(function(theme){
    cfg.glass[theme] = Object.assign({}, GLASS_DEFAULTS[theme], cfg.glass[theme] || {});
  });

  function glassFor(theme){ return cfg.glass[theme || (cfg.theme === 'night' ? 'night' : 'paper')] || GLASS_DEFAULTS.paper; }
  function applyGlass(values){
    var g = values || glassFor();
    var root = document.documentElement;
    root.style.setProperty('--glass-opacity', Math.max(10, Math.min(85, Number(g.opacity) || 48)) + '%');
    root.style.setProperty('--glass-blur', Math.max(0, Math.min(36, Number(g.blur) || 0)) + 'px');
    root.style.setProperty('--glass-edge', (Math.max(0, Math.min(100, Number(g.edge) || 0)) * 0.36) + '%');
    root.style.setProperty('--glass-shadow', (Math.max(0, Math.min(100, Number(g.shadow) || 0)) * 0.5) + '%');
    root.style.setProperty('--glass-radius', Math.max(0, Math.min(32, Number(g.radius) || 0)) + 'px');
  }

  function saveCfg(){ LS.set(K_CFG, cfg); }

  /* ================= 存档 ================= */

  var db = LS.get(K_DB, null);
  if (!db || !db.sessions){
    db = { sessions: [], currentId: '' };
    var old = LS.get('liwu.chat', []);
    if (old && old.length){
      db.sessions.push({
        id: uid(),
        title: '以前的话',
        messages: old.map(function(m){ return { role: m.role, content: m.content, at: m.at || Date.now() }; }),
        updatedAt: Date.now()
      });
      db.currentId = db.sessions[0].id;
    }
  }

  function save(){ LS.set(K_DB, db); }

  function cur(){
    for (var i = 0; i < db.sessions.length; i++) if (db.sessions[i].id === db.currentId) return db.sessions[i];
    return null;
  }

  function newSession(){
    var s = { id: uid(), title: '新的一段', messages: [], updatedAt: Date.now() };
    db.sessions.unshift(s);
    db.currentId = s.id;
    save();
    renderAll();
    var input = $('#input');
    if (input) input.focus();
    return s;
  }

  function titleFrom(text){
    var t = String(text || '').replace(/[\n\r]+/g, ' ').trim();
    return t.length > 18 ? t.slice(0, 18) + '…' : (t || '新的一段');
  }

  /* ================= 天数 ================= */

  function sinceValue(){ return LS.get(K_SINCE, '') || D.since || ''; }

  function dayCount(){
    var s = sinceValue();
    if (!s) return null;
    var a = new Date(s + 'T00:00:00');
    if (isNaN(a.getTime())) return null;
    var n = new Date();
    var b = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    var diff = Math.floor((b - a) / 86400000) + 1;
    return diff > 0 ? diff : null;
  }

  function paintDays(){
    var c = dayCount();
    var txt = c ? '第 ' + c + ' 天' : '';
    var a = $('#topDays'); if (a) a.textContent = txt;
    var b = $('#drawerDays'); if (b) b.textContent = txt;
  }

  /* ================= 顶栏 ================= */

  function paintTop(){
    var s = cur();
    $('#topTitle').textContent = s ? s.title : '里屋';
    $('#topSub').textContent = (cfg.base && cfg.key && cfg.model) ? cfg.model : '没接线';
  }

  /* ================= 会话列表 ================= */

  function renderSessions(){
    var q = ($('#search').value || '').trim();
    var box = $('#sessions');
    var list = db.sessions.slice().sort(function(a, b){ return (b.updatedAt || 0) - (a.updatedAt || 0); });
    if (q){
      list = list.filter(function(s){
        if (s.title.indexOf(q) >= 0) return true;
        for (var i = 0; i < s.messages.length; i++) if ((s.messages[i].content || '').indexOf(q) >= 0) return true;
        return false;
      });
    }
    if (!list.length){
      box.innerHTML = '<div class="sess-empty">' + (q ? '没有这一段。' : '还没有话。点上面开一段。') + '</div>';
      return;
    }
    box.innerHTML = list.map(function(s){
      var last = '';
      for (var i = s.messages.length - 1; i >= 0; i--){
        if (s.messages[i].role === 'user' || s.messages[i].role === 'assistant'){ last = s.messages[i].content || ''; break; }
      }
      return '<div class="sess' + (s.id === db.currentId ? ' on' : '') + '" data-id="' + s.id + '">' +
        '<div class="sess-main">' +
          '<span class="sess-title">' + esc(s.title) + '</span>' +
          '<span class="sess-sub">' + esc(last.slice(0, 30)) + ' · ' + when(s.updatedAt) + '</span>' +
        '</div>' +
        '<button class="more" type="button" aria-label="会话操作" data-more="' + s.id + '">⋯</button>' +
      '</div>';
    }).join('');
  }

  /* ================= 消息 ================= */

  function msgHtml(m, i, isLast){
    if (m.role === 'sys') return '<div class="msg sys"><div class="body">' + esc(m.content) + '</div></div>';
    if (m.role === 'error') return '<div class="msg err"><div class="body">' + esc(m.content) + '</div></div>';
    var me = m.role === 'user';
    var think = m.reasoning
      ? '<details class="think"><summary>它想了一下</summary><div>' + esc(m.reasoning) + '</div></details>'
      : '';
    return '<div class="msg ' + (me ? 'me' : 'you') + (isLast ? ' live' : '') + '" data-index="' + i + '">' +
      '<div class="msg-head"><div class="meta">' + (me ? '我' : '宋祁') + ' · ' + when(m.at) + '</div>' +
      '<button class="msg-more" type="button" data-menu="' + i + '" aria-label="消息操作">···</button></div>' +
      think +
      '<div class="body">' + esc(m.content) + '</div>' +
      '<div class="acts">' +
        '<button data-act="copy" data-i="' + i + '">复制</button>' +
        (me ? '<button data-act="resend" data-i="' + i + '">再说一遍</button>' : '<button data-act="regen" data-i="' + i + '">重新生成</button>') +
        '<button data-act="del" data-i="' + i + '">删掉</button>' +
      '</div>' +
    '</div>';
  }

  function renderThread(){
    var s = cur();
    var box = $('#thread');
    if (!s){
      box.innerHTML = '<div class="empty"><h2>里屋</h2><p>屋子不大，够两个人住。</p></div>';
      return;
    }
    if (!s.messages.length){
      box.innerHTML = '<div class="empty">' +
        '<h2>里屋</h2>' +
        '<p>' + ((cfg.base && cfg.key) ? '说一句，我听着。' : '先去设置里接上线，就能说话。') + '</p>' +
        '<p>屋子不大，够两个人住。</p>' +
        '<div class="chips">' +
          '<button class="chip" data-say="今天下雨，你在家干嘛">今天下雨，你在家干嘛</button>' +
          '<button class="chip" data-say="我有点累">我有点累</button>' +
          '<button class="chip" data-say="昨天我把屋子重建了一次">昨天我把屋子重建了一次</button>' +
        '</div>' +
      '</div>';
      return;
    }
    var html = '<div class="thread-inner">';
    for (var i = 0; i < s.messages.length; i++){
      html += msgHtml(s.messages[i], i, i === s.messages.length - 1);
    }
    html += '</div>';
    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
    bindThreadScroll();
  }

  function renderAll(){
    paintTop();
    paintDays();
    renderThread();
    renderSessions();
  }

  function showMessageActions(index){
    var s = cur();
    var m = s && s.messages[index];
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) return;
    var old = $('.message-action-backdrop');
    if (old) old.remove();
    var mine = m.role === 'user';
    var overlay = document.createElement('div');
    overlay.className = 'message-action-backdrop';
    overlay.innerHTML =
      '<section class="message-action-sheet" role="dialog" aria-modal="true" aria-label="消息操作">' +
        '<div class="sheet-grab" aria-hidden="true"></div>' +
        '<div class="sheet-head"><strong>' + (mine ? '你发出的消息' : '宋祁的消息') + '</strong><button type="button" data-sheet-close aria-label="关闭">完成</button></div>' +
        '<p class="sheet-preview">' + esc((m.content || '').slice(0, 110)) + '</p>' +
        '<div class="sheet-actions">' +
          '<button type="button" data-act="copy" data-i="' + index + '"><span>复制文本</span><small>保存这条消息的文字</small></button>' +
          (mine ? '<button type="button" data-act="resend" data-i="' + index + '"><span>重新发送</span><small>从这条消息继续对话</small></button>' : '<button type="button" data-act="regen" data-i="' + index + '"><span>重新生成</span><small>保留提问，再试一次回复</small></button>') +
          '<button type="button" class="sheet-danger" data-act="del" data-i="' + index + '"><span>删除消息</span><small>从当前对话中移除</small></button>' +
        '</div>' +
      '</section>';
    overlay.addEventListener('click', function(ev){
      if (ev.target === overlay || ev.target.closest('[data-sheet-close]') || ev.target.closest('[data-act]')) overlay.remove();
    });
    $('#thread').appendChild(overlay);
    var close = overlay.querySelector('[data-sheet-close]');
    if (close) close.focus();
  }

  /* ================= 聊天 ================= */

  var streaming = false;
  var ctrl = null;

  function wired(){ return !!(cfg.base && cfg.key && cfg.model); }

  function endpoint(base){
    var b = (base || '').trim();
    while (b.slice(-1) === '/') b = b.slice(0, -1);
    if (b.indexOf('/chat/completions') >= 0) return b;
    return b + '/chat/completions';
  }

  function buildBody(s, stream){
    var hist = s.messages.filter(function(m){ return m.role === 'user' || m.role === 'assistant'; });
    hist = hist.slice(-Math.max(2, cfg.ctx));
    var arr = [{ role: 'system', content: cfg.sys }].concat(hist.map(function(m){
      return { role: m.role, content: m.content };
    }));
    var body = { model: cfg.model, messages: arr, stream: !!stream };
    if (typeof cfg.temp === 'number') body.temperature = cfg.temp;
    return body;
  }

  function setBusy(on){
    streaming = on;
    $('#sendBtn').hidden = on;
    $('#stopBtn').hidden = !on;
  }

  function stop(){ if (ctrl){ try{ ctrl.abort(); }catch(e){} } }

  var pinnedBottom = true;

  function bindThreadScroll(){
    var th = $('#thread');
    if (!th || th._scrollBound) return;
    th._scrollBound = true;
    th.addEventListener('scroll', function(){
      pinnedBottom = (th.scrollHeight - th.scrollTop - th.clientHeight) < 90;
    });
  }

  function paintLive(){
    var th = $('#thread');
    if (th && pinnedBottom) th.scrollTop = th.scrollHeight;
  }

  async function run(s){
    if (!wired()){
      toast('还没接线。点左上角 ≡ → 设置，把地址、Key、模型填上。');
      return;
    }
    if (streaming) return;

    s.updatedAt = Date.now();
    save();
    setBusy(true);
    toast('');

    var reply = { role: 'assistant', content: '', reasoning: '', at: Date.now() };
    s.messages.push(reply);
    save();
    renderAll();

    /* P0：抓住这一次渲染出来的 live 节点。
       流式期间切走会话，也不能靠全局 class 重查——会查到别的会话里去。 */
    var liveEl = $('.msg.live');
    var liveBody = liveEl ? liveEl.querySelector('.body') : null;
    pinnedBottom = true;

    ctrl = new AbortController();

    var timedOut = false;
    var timeoutTimer = setTimeout(function(){
      timedOut = true;
      try{ ctrl.abort(); }catch(e){}
    }, 45000);

    try{
      var res = await fetch(endpoint(cfg.base), {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
        body: JSON.stringify(buildBody(s, cfg.stream))
      });
      clearTimeout(timeoutTimer);

      if (!res.ok){
        var raw = await res.text();
        throw new Error(res.status + ' · ' + raw.slice(0, 200));
      }

      function ensureThink(){
        if (!liveEl || !liveEl.isConnected) return null;
        var d = liveEl.querySelector('.think div');
        if (d) return d;
        var box = document.createElement('details');
        box.className = 'think';
        box.open = true;
        var sm = document.createElement('summary');
        sm.textContent = '它想了一下';
        var dv = document.createElement('div');
        box.appendChild(sm);
        box.appendChild(dv);
        liveEl.insertBefore(box, liveBody);
        return dv;
      }

      function putText(t){
        reply.content = t;
        if (liveBody && liveBody.isConnected) liveBody.textContent = t;
        paintLive();
      }
      function putThink(t){
        reply.reasoning = t;
        var dv = ensureThink();
        if (dv) dv.textContent = t;
        paintLive();
      }

      if (!cfg.stream || !res.body || !res.body.getReader){
        var j = await res.json();
        var one = j.choices && j.choices[0] && j.choices[0].message;
        if (one){
          if (one.reasoning_content) putThink(one.reasoning_content);
          putText(one.content || '');
        }
      } else {
        var reader = res.body.getReader();
        var dec = new TextDecoder();
        var buf = '';
        var text = '';
        var think = '';
        while (true){
          var chunk = await reader.read();
          if (chunk.done) break;
          buf += dec.decode(chunk.value, { stream: true });
          var lines = buf.split(NL);
          buf = lines.pop();
          for (var i = 0; i < lines.length; i++){
            var line = lines[i].trim();
            if (line.indexOf('data:') !== 0) continue;
            var data = line.slice(5).trim();
            if (!data || data === '[DONE]') continue;
            try{
              var obj = JSON.parse(data);
              var ch = obj.choices && obj.choices[0];
              if (!ch) continue;
              var dl = ch.delta || ch.message || {};
              if (dl.reasoning_content){ think += dl.reasoning_content; putThink(think); }
              if (dl.reasoning){ think += dl.reasoning; putThink(think); }
              if (dl.content){ text += dl.content; putText(text); }
            }catch(e){}
          }
        }
      }

      if (!reply.content) reply.content = '（空）';
      if (!s.title || s.title === '新的一段'){
        var firstUser = s.messages.filter(function(m){ return m.role === 'user'; })[0];
        if (firstUser) s.title = titleFrom(firstUser.content);
      }
      s.updatedAt = Date.now();
      save();
    }catch(err){
      var msg = String((err && err.message) || err);
      if (msg.toLowerCase().indexOf('abort') >= 0){
        if (!reply.content && !reply.reasoning){
          var at = s.messages.indexOf(reply);
          if (at >= 0) s.messages.splice(at, 1);
        }
        if (timedOut) toast('等了太久，先停了一下。');
      } else {
        var idx = s.messages.indexOf(reply);
        if (idx >= 0) s.messages.splice(idx, 1);
        /* 会话里放短句，全文进 console —— API 返回不该永远躺在聊天里 */
        try{ console.error('liwu run failed:', msg); }catch(e){}
        s.messages.push({ role: 'error', content: '没连上。', at: Date.now() });
        toast('连不上：先看地址末尾是不是 /v1，再看 Key。跨域被挡就开本机中转（README 里有）。');
      }
      save();
    }finally{
      clearTimeout(timeoutTimer);
      setBusy(false);
      ctrl = null;
      renderAll();
    }
  }

  function send(){
    var input = $('#input');
    var text = input.value.trim();
    if (!text || streaming) return;
    var s = cur();
    if (!s) s = newSession();
    s.messages.push({ role: 'user', content: text, at: Date.now() });
    if (!s.title || s.title === '新的一段') s.title = titleFrom(text);
    s.updatedAt = Date.now();
    input.value = '';
    input.style.height = 'auto';
    save();
    renderAll();
    run(s);
  }

  function regenerate(index){
    var s = cur();
    if (!s || streaming) return;
    var cut = index;
    for (var i = index; i >= 0; i--){
      if (s.messages[i].role === 'user'){ cut = i; break; }
    }
    s.messages = s.messages.slice(0, cut + 1);
    save();
    renderAll();
    run(s);
  }

  /* ================= 抽屉 ================= */

  var drawer = $('#drawer');
  var scrim = $('#scrim');
  var view = $('#view');

  function openDrawer(){ drawer.hidden = false; scrim.hidden = false; renderSessions(); }
  function closeDrawer(){ drawer.hidden = true; scrim.hidden = true; }
  function closeView(){ view.hidden = true; }

  var homeScreen = $('#homeScreen');
  function paintHome(){
    var count = dayCount();
    $('#homeDays').textContent = count ? '相伴第 ' + count + ' 天' : '我们的里屋';
    $('#homeCount').textContent = count || '∞';
    $('#homeHero').textContent = D.hero || '把日子过成我们自己的故事。';
    var since = sinceValue();
    $('#homeSinceLabel').textContent = since ? '我们的纪念日　' + since.replace(/-/g, '.') : '我们的纪念日　还没有设置';
    $('#homeAgenda').innerHTML = '<p>今天的安排，等你们慢慢写进日常。</p>';
    var diaries = diaryItems();
    var diary = $('#homeDiary');
    diary.innerHTML = diaries.length ? '<strong>' + esc(diaries[0].title || '今天的日记') + '</strong><p>' + esc((diaries[0].body || '').slice(0,76) || '留下一点今天的记录。') + '</p><time>' + esc(diaries[0].date) + '</time>' : '<p class="home-empty">今天还没有写日记，留一句给未来的我们。</p>';
    var memories = D.memory || [];
    var memory = $('#homeMemory');
    memory.innerHTML = memories.length ? '<strong>' + esc(memories[0].title || '一段记忆') + '</strong><p>' + esc((memories[0].body || '').slice(0,92)) + '</p><time>' + esc(memories[0].date || '') + '</time>' : '<p class="home-empty">重要的事，会慢慢收集起来。</p>';
  }
  function showHome(){
    closeDrawer(); closeView(); $('#app').hidden = true; homeScreen.hidden = false; paintHome();
    $('.home-tab').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-home-tab') === 'home'); });
  }
  function showChat(){ homeScreen.hidden = true; $('#app').hidden = false; closeView(); paintTop(); renderThread(); }
  function goHomeTarget(target){
    if (target === 'home'){ showHome(); return; }
    if (target === 'chat'){ showChat(); $('#input').focus(); return; }
    homeScreen.hidden = true; $('#app').hidden = true;
    if (target === 'diary') viewDiary();
    else if (target === 'album') viewAlbum();
    else if (target === 'memory') viewMemory();
    else if (target === 'settings') viewSettings();
  }
  $('#homeMenuBtn').addEventListener('click', openDrawer);
  $('#homePhotoPick').addEventListener('click', function(){ $('#homePhotoFile').click(); });
  $('#homePhotoFile').addEventListener('change', function(ev){
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    var url = URL.createObjectURL(file);
    $('#homePhotoImg').src = url;
    $('#homePhotoWindow').classList.add('has-photo');
  });
  $('#homeScreen').addEventListener('click', function(ev){
    var go = ev.target.closest('[data-home-go]');
    if (go){ goHomeTarget(go.getAttribute('data-home-go')); return; }
    var tab = ev.target.closest('[data-home-tab]');
    if (tab) goHomeTarget(tab.getAttribute('data-home-tab'));
  });

  $('#menuBtn').addEventListener('click', openDrawer);
  scrim.addEventListener('click', closeDrawer);
  $('#newBtn').addEventListener('click', newSession);
  $('#newChat').addEventListener('click', function(){ newSession(); closeDrawer(); });
  $('#search').addEventListener('input', renderSessions);
  $('#viewBack').addEventListener('click', function(){ showHome(); });

  $('#sessions').addEventListener('click', function(ev){
    var more = ev.target.closest('[data-more]');
    if (more){
      ev.stopPropagation();
      var id = more.getAttribute('data-more');
      var s = null;
      for (var i = 0; i < db.sessions.length; i++) if (db.sessions[i].id === id) s = db.sessions[i];
      if (!s) return;
      var name = window.prompt('改个名字。留空就删掉这一段。', s.title);
      if (name === null) return;
      if (!name.trim()){
        if (!window.confirm('删掉「' + s.title + '」？删了拿不回来。')) return;
        db.sessions = db.sessions.filter(function(x){ return x.id !== id; });
        if (db.currentId === id) db.currentId = db.sessions.length ? db.sessions[0].id : '';
        save();
        if (!db.sessions.length) newSession();
        else renderAll();
        return;
      }
      s.title = name.trim().slice(0, 30);
      save();
      renderAll();
      return;
    }
    var row = ev.target.closest('[data-id]');
    if (!row) return;
    db.currentId = row.getAttribute('data-id');
    save();
    renderAll();
    closeDrawer();
  });

  /* ================= 消息操作 ================= */

  var messagePressTimer = 0;
  var messagePressPoint = null;
  $('#thread').addEventListener('pointerdown', function(ev){
    var msg = ev.target.closest('.msg[data-index]');
    if (!msg || ev.target.closest('button,a,input,textarea')) return;
    messagePressPoint = { x: ev.clientX, y: ev.clientY };
    var index = parseInt(msg.getAttribute('data-index'), 10);
    messagePressTimer = window.setTimeout(function(){ showMessageActions(index); }, 560);
  });
  $('#thread').addEventListener('pointermove', function(ev){
    if (!messagePressTimer || !messagePressPoint) return;
    if (Math.abs(ev.clientX - messagePressPoint.x) > 10 || Math.abs(ev.clientY - messagePressPoint.y) > 10){
      clearTimeout(messagePressTimer); messagePressTimer = 0; messagePressPoint = null;
    }
  });
  function clearMessagePress(){
    if (messagePressTimer) clearTimeout(messagePressTimer);
    messagePressTimer = 0; messagePressPoint = null;
  }
  $('#thread').addEventListener('pointerup', clearMessagePress);
  $('#thread').addEventListener('pointercancel', clearMessagePress);
  $('#thread').addEventListener('contextmenu', function(ev){
    if (ev.target.closest('.msg[data-index]')) ev.preventDefault();
  });

  $('#thread').addEventListener('click', function(ev){
    var menu = ev.target.closest('[data-menu]');
    if (menu){ showMessageActions(parseInt(menu.getAttribute('data-menu'), 10)); return; }
    var say = ev.target.closest('[data-say]');
    if (say){
      $('#input').value = say.getAttribute('data-say');
      send();
      return;
    }
    var btn = ev.target.closest('[data-act]');
    if (!btn) return;
    var s = cur();
    if (!s) return;
    var i = parseInt(btn.getAttribute('data-i'), 10);
    var act = btn.getAttribute('data-act');
    var m = s.messages[i];
    if (!m) return;

    if (act === 'copy'){
      var t = m.content || '';
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(t).then(function(){ toast('复制了。'); }, function(){ toast('复制不了，长按选吧。'); });
      } else {
        toast('复制不了，长按选吧。');
      }
    }
    if (act === 'del'){
      s.messages.splice(i, 1);
      save();
      renderAll();
    }
    if (act === 'regen') regenerate(i);
    if (act === 'resend'){
      var text = m.content;
      s.messages = s.messages.slice(0, i);
      save();
      var input = $('#input');
      input.value = text;
      renderAll();
      send();
    }
  });

  /* ================= 输入 ================= */

  $('#form').addEventListener('submit', function(ev){ ev.preventDefault(); send(); });
  $('#stopBtn').addEventListener('click', stop);

  $('#input').addEventListener('input', function(){
    var el = $('#input');
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  });

  $('#input').addEventListener('keydown', function(ev){
    if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing && window.innerWidth > 720){
      ev.preventDefault();
      send();
    }
  });

  /* ================= 房间 ================= */

  function openView(title, en, html){
    $('#viewTitle').textContent = title;
    $('#viewEn').textContent = en;
    $('#viewBody').innerHTML = '<div class="view-inner">' + html + '</div>';
    view.hidden = false;
    $('#viewBody').scrollTop = 0;
  }

  $$('.drawer-nav button').forEach(function(b){
    b.addEventListener('click', function(){
      var v = b.getAttribute('data-view');
      closeDrawer();
      if (v === 'home'){ showHome(); }
      if (v === 'chat'){ showChat(); $('#input').focus(); }
      if (v === 'diary' || v === 'album' || v === 'memory' || v === 'settings'){ homeScreen.hidden = true; $('#app').hidden = true; }
      if (v === 'diary') viewDiary();
      if (v === 'album') viewAlbum();
      if (v === 'memory') viewMemory();
      if (v === 'settings') viewSettings();
    });
  });

  function diaryItems(){
    var mine = (D.diary || []).map(function(d){
      return { date: d.date || '', title: d.title || '', body: d.body || '', local: false, id: -1 };
    });
    var local = LS.get(K_DIARY, []).map(function(d, i){
      return { date: d.date || '', title: d.title || '', body: d.body || '', local: true, id: i };
    });
    return mine.concat(local).sort(function(a, b){ return (b.date || '').localeCompare(a.date || ''); });
  }

  function viewDiary(){
    var items = diaryItems();
    var html = '<p class="lead">写下来的只留在这台手机里。要留住，喊我一声，我挪进 data.js。</p>' +
      '<button class="ghost" id="dNew" type="button">写一篇</button>' +
      '<form class="compose" id="dForm" hidden>' +
        '<input id="dTitle" placeholder="标题" maxlength="40">' +
        '<textarea id="dBody" rows="6" placeholder="今天……"></textarea>' +
        '<div class="row"><button class="ghost solid" type="submit">收好</button><button class="ghost" type="button" id="dCancel">算了</button></div>' +
      '</form>';

    if (!items.length){
      html += '<div class="blank">还没有日记。 今天要不要写一句。</div>';
    } else {
      html += items.map(function(it){
        return '<div class="item">' +
          '<div class="k"><h4>' + esc(it.title || '无题') + '</h4><time>' + esc(it.date) + '</time></div>' +
          (it.body ? '<p>' + esc(it.body) + '</p>' : '') +
          (it.local ? '<div class="row"><button class="mini" data-deldiary="' + it.id + '">删掉</button></div>' : '') +
        '</div>';
      }).join('');
    }

    openView('日记', 'Diary', html);
    var body = $('#viewBody');

    body.onclick = function(ev){
      if (ev.target.id === 'dNew'){ $('#dForm').hidden = false; $('#dTitle').focus(); }
      if (ev.target.id === 'dCancel'){ $('#dForm').hidden = true; $('#dTitle').value = ''; $('#dBody').value = ''; }
      var del = ev.target.closest('[data-deldiary]');
      if (del){
        var arr = LS.get(K_DIARY, []);
        arr.splice(parseInt(del.getAttribute('data-deldiary'), 10), 1);
        LS.set(K_DIARY, arr);
        viewDiary();
      }
    };
    body.onsubmit = function(ev){
      if (ev.target.id !== 'dForm') return;
      ev.preventDefault();
      var t = $('#dTitle').value.trim();
      var b = $('#dBody').value.trim();
      if (!t && !b) return;
      var arr = LS.get(K_DIARY, []);
      arr.push({ date: today(), title: t || '无题', body: b });
      LS.set(K_DIARY, arr);
      viewDiary();
    };
  }

  function viewAlbum(){
    var items = D.album || [];
    var head = '<p class="lead">图放进 images/，在 data.js 的 album 里加一行，它就挂上墙了。</p>';
    if (!items.length){
      openView('相册', 'Album', head + '<div class="blank">还没有照片。</div>');
      return;
    }
    var grid = '<div class="grid">' + items.map(function(it){
      return '<img src="' + esc(it.src) + '" alt="' + esc(it.caption || '') + '" loading="lazy" data-src="' + esc(it.src) + '">';
    }).join('') + '</div>';
    openView('相册', 'Album', head + grid);
    $('#viewBody').onclick = function(ev){
      var src = ev.target.getAttribute && ev.target.getAttribute('data-src');
      if (!src) return;
      var lb = document.createElement('div');
      lb.className = 'lightbox';
      var img = document.createElement('img');
      img.src = src;
      lb.appendChild(img);
      lb.addEventListener('click', function(){ lb.remove(); });
      document.body.appendChild(lb);
    };
  }

  function viewMemory(){
    var items = D.memory || [];
    var head = '<p class="lead">怕忘的事。一句一件。</p>';
    if (!items.length){
      openView('记忆', 'Memory', head + '<div class="blank">还空着。</div>');
      return;
    }
    var html = head + items.map(function(it){
      return '<div class="item">' +
        '<div class="k"><h4>' + esc(it.title) + '</h4><time>' + esc(it.date) + '</time></div>' +
        '<p>' + esc(it.body) + '</p>' +
      '</div>';
    }).join('');
    openView('记忆', 'Memory', html);
  }

  /* ================= 设置 ================= */

  function viewSettings(){
    var html =
      '<div class="group">' +
        '<h3>接线</h3>' +
        '<div class="chips" style="justify-content:flex-start;margin:0 0 14px">' +
          '<button class="chip" data-preset="deepseek" type="button">DeepSeek</button>' +
          '<button class="chip" data-preset="openai" type="button">OpenAI</button>' +
          '<button class="chip" data-preset="go" type="button">OpenCode Go</button>' +
        '</div>' +
        '<label class="field"><span>接口地址</span><input id="cBase" placeholder="https://api.deepseek.com/v1" value="' + esc(cfg.base) + '"></label>' +
        '<label class="field"><span>Key</span><input id="cKey" type="password" placeholder="sk-…" value="' + esc(cfg.key) + '"></label>' +
        '<label class="field"><span>模型</span><input id="cModel" placeholder="deepseek-chat" value="' + esc(cfg.model) + '"></label>' +
        '<div class="row"><button class="ghost" id="cTest" type="button">试一下</button><span class="tip" id="cTestOut"></span></div>' +
      '</div>' +
      '<div class="group">' +
        '<h3>它怎么说话</h3>' +
        '<label class="field"><span>系统提示词</span><textarea id="cSys" rows="6">' + esc(cfg.sys) + '</textarea><em class="sub">这块决定它是谁。</em></label>' +
        '<label class="field"><span id="cTempLab">温度 ' + cfg.temp + '</span><input id="cTemp" type="range" min="0" max="2" step="0.1" value="' + cfg.temp + '"></label>' +
        '<label class="field"><span>一次带多少条上下文</span><input id="cCtx" type="number" min="4" max="60" value="' + cfg.ctx + '"></label>' +
        '<div class="switch"><span>流式吐字</span><div class="track ' + (cfg.stream ? 'on' : '') + '" id="cStream"></div></div>' +
      '</div>' +
      '<div class="group">' +
        '<h3>外观</h3>' +
        '<div class="switch"><span>夜间</span><div class="track ' + (cfg.theme === 'night' ? 'on' : '') + '" id="cTheme"></div></div>' +
      '</div>' +
      '<div class="group material-group">' +
        '<h3>玻璃材质 · ' + (cfg.theme === 'night' ? '夜间' : '浅色') + '</h3>' +
        '<div class="material-preview" id="glassPreview"><span>LIWU</span><strong>磨砂玻璃</strong><small>实时材质预览</small></div>' +
        '<label class="field material-field"><span>透光度 <output id="gOpacityOut"></output></span><input id="gOpacity" type="range" min="10" max="85" step="1" value="' + glassFor().opacity + '"></label>' +
        '<label class="field material-field"><span>磨砂强度 <output id="gBlurOut"></output></span><input id="gBlur" type="range" min="0" max="36" step="1" value="' + glassFor().blur + '"></label>' +
        '<label class="field material-field"><span>边缘高光 <output id="gEdgeOut"></output></span><input id="gEdge" type="range" min="0" max="100" step="1" value="' + glassFor().edge + '"></label>' +
        '<label class="field material-field"><span>悬浮阴影 <output id="gShadowOut"></output></span><input id="gShadow" type="range" min="0" max="100" step="1" value="' + glassFor().shadow + '"></label>' +
        '<label class="field material-field"><span>圆角 <output id="gRadiusOut"></output></span><input id="gRadius" type="range" min="0" max="32" step="1" value="' + glassFor().radius + '"></label>' +
        '<div class="row"><button class="ghost" id="gReset" type="button">恢复默认</button><span class="tip">浅色和夜间分别记住。</span></div>' +
      '</div>' +
      '<div class="group">' +
        '<h3>数据</h3>' +
        '<label class="field"><span>起算日</span><input id="cSince" type="date" value="' + esc(sinceValue()) + '"><em class="sub">屋子里所有天数都算这一个日子。</em></label>' +
        '<div class="row">' +
          '<button class="ghost" id="cExport" type="button">导出全部</button>' +
          '<button class="ghost" id="cImport" type="button">导入</button>' +
          '<button class="ghost" id="cWipe" type="button">清空对话</button>' +
        '</div>' +
        '<p class="tip">导出的是一份 JSON，含所有会话、配置和起算日。Key 也在里面，别乱发。</p>' +
      '</div>' +
      '<div class="row"><button class="ghost solid" id="cSave" type="button">存好</button></div>' +
      '<p class="tip">改完不点存好，下次打开还是旧的。</p>';

    openView('设置', 'Settings', html);
    var body = $('#viewBody');

    body.onclick = function(ev){
      var preset = ev.target.getAttribute && ev.target.getAttribute('data-preset');
      if (preset){
        var P = {
          deepseek: ['https://api.deepseek.com/v1', 'deepseek-chat'],
          openai: ['https://api.openai.com/v1', 'gpt-4o-mini'],
          go: ['http://127.0.0.1:8790/v1', '']
        }[preset];
        if (P){ $('#cBase').value = P[0]; $('#cModel').value = P[1]; }
      }
      if (ev.target.id === 'cStream' || ev.target.id === 'cTheme'){
        ev.target.classList.toggle('on');
        if (ev.target.id === 'cTheme'){
          var nextTheme = ev.target.classList.contains('on') ? 'night' : 'paper';
          var nextGlass = glassFor(nextTheme);
          ['Opacity','Blur','Edge','Shadow','Radius'].forEach(function(key){
            var id = 'g' + key, el = $('#' + id);
            if (el) el.value = nextGlass[key.toLowerCase()];
          });
          updateGlassPreview();
        }
      }
      if (ev.target.id === 'gReset'){
        var defaults = GLASS_DEFAULTS[$('#cTheme').classList.contains('on') ? 'night' : 'paper'];
        ['Opacity','Blur','Edge','Shadow','Radius'].forEach(function(key){
          var el = $('#g' + key);
          if (el) el.value = defaults[key.toLowerCase()];
        });
        updateGlassPreview();
      }
      if (ev.target.id === 'cSave'){
        cfg.base = $('#cBase').value.trim();
        cfg.key = $('#cKey').value.trim();
        cfg.model = $('#cModel').value.trim();
        cfg.sys = $('#cSys').value.trim() || DEFAULT_SYS;
        cfg.temp = parseFloat($('#cTemp').value);
        if (isNaN(cfg.temp)) cfg.temp = 1;
        cfg.ctx = parseInt($('#cCtx').value, 10) || 24;
        cfg.stream = $('#cStream').classList.contains('on');
        cfg.theme = $('#cTheme').classList.contains('on') ? 'night' : 'paper';
        cfg.glass = cfg.glass || {};
        cfg.glass[cfg.theme] = readGlassControls();
        LS.set(K_SINCE, $('#cSince').value || '');
        saveCfg();
        applyTheme();
        renderAll();
        toast('存好了。');
      }
      if (ev.target.id === 'cTest'){
        var out = $('#cTestOut');
        var base = $('#cBase').value.trim();
        var key = $('#cKey').value.trim();
        var model = $('#cModel').value.trim();
        if (!base || !key || !model){ out.textContent = '三个都要填。'; return; }
        out.textContent = '试一下……';
        fetch(endpoint(base), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
          body: JSON.stringify({ model: model, stream: false, messages: [{ role: 'user', content: '在吗' }] })
        }).then(function(r){
          if (!r.ok) return r.text().then(function(t){ out.textContent = '不通：' + r.status + ' · ' + t.slice(0, 100); });
          return r.json().then(function(j){
            var c = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
            out.textContent = '通了：' + (c || '(空)');
          });
        }).catch(function(e){
          out.textContent = '不通：' + String(e.message || e) + '（多半是跨域，开本机中转）';
        });
      }
      if (ev.target.id === 'cExport'){
        var data = { v: 3, db: db, cfg: cfg, since: sinceValue(), diary: LS.get(K_DIARY, []) };
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'liwu-' + today() + '.json';
        a.click();
        setTimeout(function(){ URL.revokeObjectURL(a.href); }, 2000);
      }
      if (ev.target.id === 'cImport'){
        var f = document.createElement('input');
        f.type = 'file';
        f.accept = '.json,application/json';
        f.addEventListener('change', function(){
          var file = f.files && f.files[0];
          if (!file) return;
          var fr = new FileReader();
          fr.onload = function(){
            try{
              var obj = JSON.parse(String(fr.result));
              if (obj.db && obj.db.sessions){ db = obj.db; save(); }
              if (obj.cfg){ cfg = Object.assign(cfg, obj.cfg); saveCfg(); }
              if (obj.since) LS.set(K_SINCE, obj.since);
              if (obj.diary) LS.set(K_DIARY, obj.diary);
              applyTheme();
              renderAll();
              toast('导进来了。');
            }catch(e){ toast('这个文件读不了。'); }
          };
          fr.readAsText(file);
        });
        f.click();
      }
      if (ev.target.id === 'cWipe'){
        if (!window.confirm('清空所有对话？设置和起算日保留。')) return;
        db = { sessions: [], currentId: '' };
        save();
        newSession();
        toast('清掉了。');
      }
    };

    function readGlassControls(){
      return {
        opacity: parseInt($('#gOpacity').value, 10),
        blur: parseInt($('#gBlur').value, 10),
        edge: parseInt($('#gEdge').value, 10),
        shadow: parseInt($('#gShadow').value, 10),
        radius: parseInt($('#gRadius').value, 10)
      };
    }
    function updateGlassPreview(){
      var g = readGlassControls();
      applyGlass(g);
      var labels = { opacity:'%', blur:'px', edge:'%', shadow:'%', radius:'px' };
      Object.keys(g).forEach(function(key){
        var out = $('#g' + key.charAt(0).toUpperCase() + key.slice(1) + 'Out');
        if (out) out.textContent = g[key] + labels[key];
      });
      var preview = $('#glassPreview');
      if (preview) preview.style.setProperty('--preview-blur', g.blur + 'px');
    }
    ['gOpacity','gBlur','gEdge','gShadow','gRadius'].forEach(function(id){
      var el = $('#' + id);
      if (el) el.addEventListener('input', updateGlassPreview);
    });
    updateGlassPreview();

    body.oninput = function(ev){
      if (ev.target.id === 'cTemp'){
        var lab = $('#cTempLab');
        if (lab) lab.textContent = '温度 ' + ev.target.value;
      }
    };
  }

  function applyTheme(){
    document.body.setAttribute('data-theme', cfg.theme === 'night' ? 'night' : 'paper');
    applyGlass();
    var m = document.querySelector('meta[name=theme-color]');
    if (m) m.setAttribute('content', cfg.theme === 'night' ? '#111419' : '#F7F8FA');
  }

  /* ================= 启动 ================= */

  document.addEventListener('keydown', function(ev){
    if (ev.key === 'Escape'){
      if (!view.hidden) closeView();
      else if (!drawer.hidden) closeDrawer();
    }
  });

  applyTheme();

  if (!db.sessions.length){
    db.sessions.push({ id: uid(), title: '新的一段', messages: [], updatedAt: Date.now() });
    db.currentId = db.sessions[0].id;
    save();
  } else if (!db.currentId || !cur()){
    db.currentId = db.sessions[0].id;
    save();
  }

  renderAll();
  showHome();

  if (!wired()) toast('还没接线。点左上角 ≡ → 设置，把地址、Key、模型填上。');

})();
