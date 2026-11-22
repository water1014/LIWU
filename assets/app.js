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
  var K_ALBUM = 'liwu.album.local';
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
    var sys = cfg.sys + activeWorldbookContext(hist);
    var arr = [{ role: 'system', content: sys }].concat(hist.map(function(m){
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
  function closeView(){ view.hidden = true; view.removeAttribute('aria-modal'); document.body.classList.remove('room-open'); }

  var homeScreen = $('#homeScreen');
  function paintHome(){
    var count = dayCount();
    $('#homeDays').textContent = count ? '相伴第 ' + count + ' 天' : '我们的里屋';
    $('#homeCount').textContent = count || '∞';
    $('#homeHero').textContent = D.hero || '把日子过成我们自己的故事。';
    var since = sinceValue();
    $('#homeSinceLabel').textContent = since ? '我们的纪念日　' + since.replace(/-/g, '.') : '我们的纪念日　还没有设置';
    var agendaItems=plannerItems('schedule').filter(function(x){return x.date===today();}).sort(function(a,b){return (a.time||'').localeCompare(b.time||'');});
    var calendarItems=plannerItems('calendar').filter(function(x){return x.date===today();});
    var todoItems=plannerItems('todo').filter(function(x){return !x.done&&(!x.date||x.date===today());});
    var agendaHtml=agendaItems.slice(0,3).map(function(x){return '<p><time>'+(x.time||'安排')+'</time> '+esc(x.title)+'</p>';}).concat(calendarItems.slice(0,2).map(function(x){return '<p><time>日历</time> '+esc(x.title)+'</p>'; })).concat(todoItems.slice(0,2).map(function(x){return '<p><time>待办</time> '+esc(x.title)+'</p>'; }));
    $('#homeAgenda').innerHTML = agendaHtml.length ? agendaHtml.join('') : '<p>今天暂时没有安排，给日子留一点空白。</p>';
    var diaries = diaryItems();
    var diary = $('#homeDiary');
    diary.innerHTML = diaries.length ? '<strong>' + esc(diaries[0].title || '今天的日记') + '</strong><p>' + esc((diaries[0].body || '').slice(0,76) || '留下一点今天的记录。') + '</p><time>' + esc(diaries[0].date) + '</time>' : '<p class="home-empty">今天还没有写日记，留一句给未来的我们。</p>';
    var memories = D.memory || [];
    var memory = $('#homeMemory');
    memory.innerHTML = memories.length ? '<strong>' + esc(memories[0].title || '一段记忆') + '</strong><p>' + esc((memories[0].body || '').slice(0,92)) + '</p><time>' + esc(memories[0].date || '') + '</time>' : '<p class="home-empty">重要的事，会慢慢收集起来。</p>';
  }
  var viewReturnTarget = 'home';
  function setDrawerCurrent(target){
    $$('.drawer-nav button').forEach(function(b){
      b.classList.toggle('nav-current', b.getAttribute('data-view') === target);
    });
  }
  function backFromView(){
    closeView();
    if (viewReturnTarget === 'chat') showChat();
    else showHome();
  }
  function showHome(){
    closeDrawer(); closeView(); $('#app').hidden = true; homeScreen.hidden = false; paintHome();
    setDrawerCurrent('home');
    $$('.home-tab').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-home-tab') === 'home'); });
  }
  function showChat(){
    homeScreen.hidden = true; $('#app').hidden = false; closeView();
    setDrawerCurrent('chat'); paintTop(); renderThread();
  }
  function goHomeTarget(target){
    if (target === 'home'){ showHome(); return; }
    if (target === 'chat'){ showChat(); $('#input').focus(); return; }
    if (target !== 'chat' && !FEATURE_INFO[target] && ['diary','album','memory','settings','worldbook'].indexOf(target) < 0) return;
    viewReturnTarget = 'home';
    setDrawerCurrent(target);
    homeScreen.hidden = true; $('#app').hidden = true;
    if (target === 'calendar' || target === 'schedule' || target === 'todo') viewPlanner(target);
    else if (target === 'countdown') viewCountdown();
    else if (target === 'mood') viewMood();
    else if (target === 'diary') viewDiary();
    else if (target === 'album') viewAlbum();
    else if (target === 'memory') viewMemory();
    else if (target === 'settings') viewSettings();
    else if (target === 'worldbook') viewWorldbook();
    else viewFeature(target);
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
  $('#newChat').addEventListener('click', function(){ newSession(); closeDrawer(); showChat(); $('#input').focus(); });
  $('#search').addEventListener('input', renderSessions);
  $('#viewBack').addEventListener('click', backFromView);

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
    if (!homeScreen.hidden) showChat();
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
    view.setAttribute('role', 'dialog');
    view.setAttribute('aria-modal', 'true');
    view.setAttribute('aria-label', title + '页面');
    document.body.classList.add('room-open');
    $('#viewBody').scrollTop = 0;
    $('#viewBack').focus({ preventScroll: true });
  }

  $$('.drawer-nav button').forEach(function(b){
    b.addEventListener('click', function(){
      var v = b.getAttribute('data-view');
      if (v === 'home'){ showHome(); return; }
      if (v === 'chat'){ showChat(); $('#input').focus(); return; }
      if (v !== 'chat' && !FEATURE_INFO[v] && ['diary','album','memory','settings','worldbook'].indexOf(v) < 0) return;
      viewReturnTarget = homeScreen.hidden && !$('#app').hidden ? 'chat' : 'home';
      setDrawerCurrent(v);
      closeDrawer();
      homeScreen.hidden = true; $('#app').hidden = true;
      if (v === 'calendar' || v === 'schedule' || v === 'todo') viewPlanner(v);
      else if (v === 'countdown') viewCountdown();
      else if (v === 'mood') viewMood();
      else if (v === 'diary') viewDiary();
      else if (v === 'album') viewAlbum();
      else if (v === 'memory') viewMemory();
      else if (v === 'settings') viewSettings();
      else if (v === 'worldbook') viewWorldbook();
      else viewFeature(v);
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
    var editing = -1;
    var query = '';
    function render(){
      var items = diaryItems();
      var shown = items.filter(function(it){
        var hay = [it.title, it.body, it.date].join(' ').toLowerCase();
        return !query || hay.indexOf(query.toLowerCase()) >= 0;
      });
      var html = '<div class="room-intro"><p class="lead">把今天留下来。日记只保存在这台设备里，可以随时修改或删除。</p><div class="room-stat"><strong>' + items.length + '</strong><span>篇日记</span></div></div>' +
        '<div class="diary-tools"><input id="dSearch" type="search" placeholder="搜索标题、内容或日期" value="' + esc(query) + '">' +
        '<button class="ghost solid" id="dNew" type="button">＋ 写日记</button></div>' +
        '<form class="compose diary-compose" id="dForm" hidden>' +
          '<div class="diary-compose-head"><strong id="dFormTitle">写下今天</strong><span>仅自己可见</span></div>' +
          '<input id="dTitle" placeholder="给这篇日记一个标题" maxlength="60">' +
          '<input id="dDate" type="date" value="' + today() + '">' +
          '<textarea id="dBody" rows="7" placeholder="今天发生了什么？此刻在想什么？"></textarea>' +
          '<div class="row"><button class="ghost solid" type="submit">保存日记</button><button class="ghost" type="button" id="dCancel">取消</button></div>' +
        '</form>';
      if (!shown.length){
        html += '<div class="blank diary-empty">' + (items.length ? '没有找到相关日记。换个词试试。' : '这里还空着。等第一段日常落下来。') + '</div>';
      } else {
        html += '<div class="diary-list">' + shown.map(function(it){
          var body = esc(it.body || '');
          return '<article class="item diary-entry">' +
            '<div class="k"><h4>' + esc(it.title || '无题') + '</h4><time>' + esc(it.date) + '</time></div>' +
            (body ? '<p>' + body + '</p>' : '') +
            (it.local ? '<div class="diary-actions"><button class="mini" type="button" data-editdiary="' + it.id + '">编辑</button><button class="mini" type="button" data-deldiary="' + it.id + '">删除</button></div>' : '<span class="diary-source">初始日记</span>') +
          '</article>';
        }).join('') + '</div>';
      }
      openView('日记', 'Diary', html);
      var body = $('#viewBody');
      body.onclick = function(ev){
        if (ev.target.id === 'dNew'){
          editing = -1;
          $('#dFormTitle').textContent = '写下今天';
          $('#dTitle').value = '';
          $('#dDate').value = today();
          $('#dBody').value = '';
          $('#dForm').hidden = false;
          $('#dTitle').focus();
        }
        if (ev.target.id === 'dCancel'){ $('#dForm').hidden = true; editing = -1; }
        var edit = ev.target.closest('[data-editdiary]');
        if (edit){
          editing = parseInt(edit.getAttribute('data-editdiary'),10);
          var item = LS.get(K_DIARY, [])[editing];
          if (!item) return;
          $('#dFormTitle').textContent = '修改日记';
          $('#dTitle').value = item.title || '';
          $('#dDate').value = item.date || today();
          $('#dBody').value = item.body || '';
          $('#dForm').hidden = false;
          $('#dTitle').focus();
          $('#dForm').scrollIntoView({behavior:'smooth',block:'nearest'});
        }
        var del = ev.target.closest('[data-deldiary]');
        if (del){
          var index = parseInt(del.getAttribute('data-deldiary'),10);
          if (!window.confirm('删除这篇日记？')) return;
          var arr = LS.get(K_DIARY, []);
          arr.splice(index,1);
          if (LS.set(K_DIARY,arr)) { editing=-1; render(); toast('日记已删除。'); }
        }
      };
      body.onsubmit = function(ev){
        if (ev.target.id !== 'dForm') return;
        ev.preventDefault();
        var title = $('#dTitle').value.trim();
        var content = $('#dBody').value.trim();
        if (!title && !content){ toast('先写一点内容再保存吧。'); return; }
        var arr = LS.get(K_DIARY, []);
        var entry = {date:$('#dDate').value || today(),title:title || '无题',body:content,updatedAt:Date.now()};
        if (editing >= 0 && arr[editing]) arr[editing] = Object.assign({},arr[editing],entry);
        else arr.push(Object.assign({createdAt:Date.now()},entry));
        if (LS.set(K_DIARY,arr)){ query=''; editing=-1; render(); toast('日记收好了。'); }
      };
      var search = $('#dSearch');
      search.addEventListener('input',function(){
        var pos=search.selectionStart; query=search.value; render();
        var next=$('#dSearch');next.focus();try{next.setSelectionRange(pos,pos);}catch(_){}
      });
    }
    render();
  }

  function viewAlbum(){
    var localKey = K_ALBUM;
    function items(){ return (D.album || []).map(function(it,i){return Object.assign({local:false,id:i},it);}).concat(LS.get(localKey,[]).map(function(it,i){return Object.assign({local:true,id:i},it);})); }
    function render(){
      var all=items();
      var html='<div class="room-intro"><p class="lead">把照片放进来，留住一起生活的片刻。图片会压缩后保存在这台设备里。</p><div class="room-stat"><strong>'+all.length+'</strong><span>张照片</span></div></div>' +
        '<div class="album-toolbar"><label class="ghost solid album-add">＋ 添加照片<input id="albumFiles" type="file" accept="image/*" multiple hidden></label><span class="tip">支持一次选择多张图片</span></div>';
      if(!all.length) html+='<div class="blank album-empty">相册还空着。挑几张喜欢的照片放进来吧。</div>';
      else html+='<div class="album-grid">'+all.map(function(it){return '<figure class="album-tile"><button class="album-image" type="button" data-album-open="'+(it.local?'local-':'seed-')+it.id+'"><img src="'+esc(it.src)+'" alt="'+esc(it.caption||'照片')+'" loading="lazy"></button><figcaption><span>'+esc(it.caption||'未命名照片')+'</span>'+(it.local?'<button class="mini" type="button" data-album-delete="'+it.id+'">删除</button>':'')+'</figcaption></figure>';}).join('')+'</div>';
      openView('相册','Album',html);
      var body=$('#viewBody');
      body.onchange=async function(ev){
        if(ev.target.id!=='albumFiles') return;
        var files=Array.from(ev.target.files||[]).filter(function(f){return f.type.indexOf('image/')===0;});
        if(!files.length) return;
        var current=LS.get(localKey,[]);
        var added=0;
        for(var file of files){
          try{
            var data=await compressAlbumImage(file);
            current.push({src:data,caption:file.name.replace(/\.[^.]+$/,''),date:today(),createdAt:Date.now()});
            added++;
          }catch(e){toast('有一张图片处理失败，已跳过。');}
        }
        if(added && LS.set(localKey,current)){render();toast('已添加 '+added+' 张照片。');}
      };
      body.onclick=function(ev){
        var open=ev.target.closest('[data-album-open]');
        if(open){
          var key=open.getAttribute('data-album-open');
          var it=all.find(function(x){return (x.local?'local-':'seed-')+x.id===key;});
          if(!it)return;
          var lb=document.createElement('div');lb.className='lightbox';
          var wrap=document.createElement('div');wrap.className='lightbox-content';
          var img=document.createElement('img');img.src=it.src;img.alt=it.caption||'照片';
          var caption=document.createElement('span');caption.textContent=it.caption||'';
          wrap.appendChild(img);wrap.appendChild(caption);lb.appendChild(wrap);
          lb.addEventListener('click',function(){lb.remove();});document.body.appendChild(lb);return;
        }
        var del=ev.target.closest('[data-album-delete]');
        if(del){
          if(!window.confirm('从相册删除这张照片？'))return;
          var list=LS.get(localKey,[]);list.splice(parseInt(del.getAttribute('data-album-delete'),10),1);
          if(LS.set(localKey,list)){render();toast('照片已删除。');}
        }
      };
    }
    render();
  }

  function compressAlbumImage(file){
    return new Promise(function(resolve,reject){
      var reader=new FileReader();
      reader.onerror=reject;
      reader.onload=function(){
        var img=new Image();
        img.onerror=reject;
        img.onload=function(){
          var max=1440,scale=Math.min(1,max/Math.max(img.width,img.height));
          var canvas=document.createElement('canvas');
          canvas.width=Math.max(1,Math.round(img.width*scale));
          canvas.height=Math.max(1,Math.round(img.height*scale));
          var ctx=canvas.getContext('2d');
          if(!ctx){reject(new Error('canvas unavailable'));return;}
          ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
          ctx.drawImage(img,0,0,canvas.width,canvas.height);
          var quality=.82,data=canvas.toDataURL('image/jpeg',quality);
          while(data.length>900000 && quality>.48){quality-=.08;data=canvas.toDataURL('image/jpeg',quality);}
          if(data.length>1400000){reject(new Error('image too large'));return;}
          resolve(data);
        };
        img.src=String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  /* ================= 已选功能入口目录 ================= */
  var FEATURE_INFO = {
    profile:{title:'人设档案',en:'Profile',desc:'管理宋祁的外观、性格、关系与共同设定。'},
    notice:{title:'通知',en:'Notice',desc:'集中查看重要消息、系统提醒与待处理事项。'},
    moments:{title:'动态',en:'Moments',desc:'记录两个人生活中的片段，让日常有迹可循。'},
    proactiveImage:{title:'主动生图',en:'Proactive Image',desc:'根据聊天情境与视觉记忆，规划主动生成陪伴图片。'},
    calendar:{title:'日历',en:'Calendar',desc:'查看日期、纪念日与重要日子的分布。'},
    schedule:{title:'安排',en:'Schedule',desc:'整理共同计划、约定与未来安排。'},
    todo:{title:'待办',en:'To-do',desc:'把想做的小事收集起来，逐项完成。'},
    countdown:{title:'倒计时',en:'Countdown',desc:'记录纪念日、期待的日子与重要节点。'},
    mood:{title:'心情',en:'Mood',desc:'记录每天的情绪变化与心情轨迹。'},
    quotes:{title:'语录',en:'Quotes',desc:'保存喜欢的话、聊天片段与值得反复读的句子。'},
    worldbook:{title:'世界书',en:'Worldbook',desc:'管理世界书、条目、触发条件与聊天注入规则，后续接入酒馆 JSON 导入。'},
    favorite:{title:'收藏',en:'Favorites',desc:'收纳喜欢的消息、图片、文字与生活片段。'},
    ledger:{title:'账本',en:'Ledger',desc:'账本与记账合并为一个入口，避免重复功能。'},
    health:{title:'健康',en:'Health',desc:'整理健康相关记录与日常趋势。'},
    period:{title:'经期',en:'Period',desc:'记录周期、日期与个人备注。'},
    study:{title:'学习',en:'Study',desc:'安排学习目标、任务与进度。'},
    class:{title:'课程表',en:'Class',desc:'管理课程时间、地点与每周安排。'},
    music:{title:'音乐',en:'Music',desc:'整理播放列表与共同听歌体验。'},
    game:{title:'游戏',en:'Games',desc:'进入两个人的互动小游戏与轻量玩法。'},
    window:{title:'窗廊',en:'Window',desc:'进入独立的窗边空间与场景体验。'},
    imageStudio:{title:'生图室',en:'Image Studio',desc:'管理图片生成、参考图与作品记录。'},
    beautify:{title:'美化',en:'Beautify',desc:'调整界面布局、材质、透明度、模糊与圆角。'},
    wallpaper:{title:'壁纸',en:'Wallpaper',desc:'管理首页与空间背景图片。'},
    theme:{title:'主题',en:'Theme',desc:'管理浅色、夜间与主题配色。'},
    data:{title:'数据管理',en:'Data',desc:'管理本机数据、备份文件与恢复流程。'},
    mcp:{title:'MCP',en:'MCP',desc:'配置外部工具连接与可调用能力。'},
    plugins:{title:'插件',en:'Plugins',desc:'查看和管理扩展能力与服务连接。'}
  };
  function viewFeature(key){
    var meta=FEATURE_INFO[key];
    if(!meta)return;
    var html='<div class="feature-room">' +
      '<div class="feature-room-mark">'+esc(meta.en)+'</div>' +
      '<h2>'+esc(meta.title)+'</h2>' +
      '<p class="lead">'+esc(meta.desc)+'</p>' +
      '<div class="feature-room-note"><span class="feature-room-dot"></span><div><strong>独立入口已接入</strong><p>这个功能已经归入里屋导航。具体内容和交互会逐项实现，不会用空白页面冒充已完成，也不会擅自删掉你选定的功能。</p></div></div>' +
      '<div class="feature-room-foot">LIWU · A PRIVATE SPACE FOR TWO</div>' +
    '</div>';
    openView(meta.title,meta.en,html);
  }



  /* ================= 共同生活 · 日历 / 安排 / 待办 ================= */
  var PLANNER_KEYS = { calendar:'liwu.calendar', schedule:'liwu.schedule', todo:'liwu.todo' };
  function plannerItems(key){ var v=LS.get(PLANNER_KEYS[key],[]);return Array.isArray(v)?v:[]; }
  function plannerSave(key,items){ return LS.set(PLANNER_KEYS[key],items); }
  function plannerDateLabel(value){
    if(!value)return '未设日期';
    var d=new Date(value+'T12:00:00');
    return d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日';
  }
  function plannerEscDate(value){ return /^\d{4}-\d{2}-\d{2}$/.test(value||'')?value:today(); }
  function viewPlanner(key){
    var meta={calendar:{title:'日历',en:'Calendar'},schedule:{title:'安排',en:'Schedule'},todo:{title:'待办',en:'To-do'}}[key];
    if(!meta)return;
    var selected=today(),monthCursor=new Date();monthCursor.setDate(1);
    var editing='';
    function render(){
      var items=plannerItems(key);
      var html='';
      if(key==='calendar'){
        var year=monthCursor.getFullYear(),month=monthCursor.getMonth();
        var first=new Date(year,month,1),offset=(first.getDay()+6)%7,days=new Date(year,month+1,0).getDate();
        var marks={};items.forEach(function(it){marks[it.date]=(marks[it.date]||0)+1;});
        html='<div class="planner-intro"><p class="lead">把重要的日子放在这里。点选日期，就能查看当天的纪念日和约定。</p><div class="planner-stat"><strong>'+items.length+'</strong><span>个日期记录</span></div></div>'+
          '<section class="calendar-panel"><div class="calendar-month"><button class="mini" id="calPrev" type="button" aria-label="上个月">‹</button><strong>'+year+'年 '+(month+1)+'月</strong><button class="mini" id="calNext" type="button" aria-label="下个月">›</button><button class="mini" id="calToday" type="button">今天</button></div>'+
          '<div class="calendar-grid calendar-week">'+['一','二','三','四','五','六','日'].map(function(x){return '<span>'+x+'</span>';}).join('')+'</div><div class="calendar-grid">'+
          Array.from({length:offset},function(){return '<span class="calendar-blank"></span>';}).join('')+
          Array.from({length:days},function(_,i){var date=year+'-'+p2(month+1)+'-'+p2(i+1);return '<button type="button" class="calendar-day '+(date===selected?'selected ':'')+(date===today()?'is-today':'')+'" data-cal-day="'+date+'"><span>'+(i+1)+'</span>'+(marks[date]?'<i>'+marks[date]+'</i>':'')+'</button>';}).join('')+
          '</div></section><div class="planner-section-head"><div><small>SELECTED DATE</small><h3>'+plannerDateLabel(selected)+'</h3></div><button class="ghost solid" id="calAdd" type="button">＋ 添加日历记录</button></div>';
        var dayItems=items.filter(function(it){return it.date===selected;}).sort(function(a,b){return (a.time||'').localeCompare(b.time||'');});
        html+='<form class="planner-form" id="plannerForm" hidden><strong id="plannerFormTitle">添加日历记录</strong><input id="plTitle" maxlength="80" placeholder="这一天有什么特别的？"><input id="plDate" type="date" value="'+selected+'"><textarea id="plNote" rows="3" placeholder="补充一点备注（可选）"></textarea><div class="planner-form-actions"><button class="ghost solid" type="submit">保存</button><button class="ghost" type="button" id="plCancel">取消</button></div></form>';
        html+=dayItems.length?'<div class="planner-list">'+dayItems.map(function(it){return '<article class="planner-item"><div class="planner-item-main"><strong>'+esc(it.title)+'</strong><p>'+esc(it.note||'')+'</p></div><div class="planner-item-actions"><button class="mini" type="button" data-pl-edit="'+esc(it.id)+'">编辑</button><button class="mini danger" type="button" data-pl-delete="'+esc(it.id)+'">删除</button></div></article>';}).join('')+'</div>':'<div class="blank planner-empty">这一天还没有记录。留一个值得记住的日子吧。</div>';
      }else if(key==='schedule'){
        var ordered=items.slice().sort(function(a,b){return (a.date+' '+(a.time||'')).localeCompare(b.date+' '+(b.time||''));});
        html='<div class="planner-intro"><p class="lead">把两个人的约定、计划和想去的地方排进日程。每条安排都可以随时调整。</p><div class="planner-stat"><strong>'+items.length+'</strong><span>项安排</span></div></div>'+
          '<div class="planner-toolbar"><button class="ghost solid" id="plNew" type="button">＋ 新增安排</button><span class="tip">按日期和时间排序</span></div>'+
          '<form class="planner-form" id="plannerForm" hidden><strong id="plannerFormTitle">新增安排</strong><input id="plTitle" maxlength="80" placeholder="安排名称"><div class="planner-fields"><label>日期<input id="plDate" type="date" value="'+today()+'"></label><label>时间<input id="plTime" type="time"></label></div><input id="plPlace" maxlength="100" placeholder="地点（可选）"><textarea id="plNote" rows="3" placeholder="备注、准备事项或约定内容"></textarea><div class="planner-form-actions"><button class="ghost solid" type="submit">保存安排</button><button class="ghost" type="button" id="plCancel">取消</button></div></form>';
        html+=ordered.length?'<div class="planner-list">'+ordered.map(function(it){return '<article class="planner-item schedule-item"><div class="planner-date-rail"><strong>'+esc((it.date||'').slice(8)||'--')+'</strong><small>'+esc((it.date||'').slice(0,7))+'</small></div><div class="planner-item-main"><strong>'+esc(it.title)+'</strong><p>'+esc([it.time,it.place].filter(Boolean).join(' · '))+'</p>'+(it.note?'<p>'+esc(it.note)+'</p>':'')+'</div><div class="planner-item-actions"><button class="mini" type="button" data-pl-edit="'+esc(it.id)+'">编辑</button><button class="mini danger" type="button" data-pl-delete="'+esc(it.id)+'">删除</button></div></article>';}).join('')+'</div>':'<div class="blank planner-empty">还没有安排。先把下一件期待的事写下来吧。</div>';
      }else{
        var done=items.filter(function(it){return it.done;}).length;
        var filter='all';
        html='<div class="planner-intro"><p class="lead">先把想做的事放在这里。完成一件，就轻轻勾掉一件。</p><div class="planner-stat"><strong>'+done+'/'+items.length+'</strong><span>已完成</span></div></div>'+
          '<form class="todo-quick" id="todoQuick"><input id="todoQuickTitle" maxlength="100" placeholder="添加一件待办…"><button class="ghost solid" type="submit">添加</button></form>'+
          '<div class="todo-filters"><button type="button" class="active" data-todo-filter="all">全部</button><button type="button" data-todo-filter="open">未完成</button><button type="button" data-todo-filter="done">已完成</button></div>'+
          '<form class="planner-form" id="plannerForm" hidden><strong id="plannerFormTitle">编辑待办</strong><input id="plTitle" maxlength="100" placeholder="要做什么？"><div class="planner-fields"><label>截止日期<input id="plDate" type="date"></label><label>优先级<select id="plPriority"><option value="normal">普通</option><option value="high">重要</option><option value="low">有空再做</option></select></label></div><textarea id="plNote" rows="2" placeholder="备注（可选）"></textarea><div class="planner-form-actions"><button class="ghost solid" type="submit">保存</button><button class="ghost" type="button" id="plCancel">取消</button></div></form>';
        html+='<div class="planner-list todo-list">'+items.slice().sort(function(a,b){return Number(a.done)-Number(b.done)||(a.date||'9999').localeCompare(b.date||'9999')||b.createdAt-a.createdAt;}).map(function(it){return '<article class="planner-item todo-item '+(it.done?'is-done':'')+'" data-todo-row="'+esc(it.id)+'"><label class="todo-check"><input type="checkbox" data-todo-check="'+esc(it.id)+'" '+(it.done?'checked':'')+'><span></span></label><div class="planner-item-main"><strong>'+esc(it.title)+'</strong><p>'+esc(it.date?('截止 '+plannerDateLabel(it.date)):'未设截止日期')+(it.priority==='high'?' · 重要':it.priority==='low'?' · 有空再做':'')+'</p>'+(it.note?'<p>'+esc(it.note)+'</p>':'')+'</div><div class="planner-item-actions"><button class="mini" type="button" data-pl-edit="'+esc(it.id)+'">编辑</button><button class="mini danger" type="button" data-pl-delete="'+esc(it.id)+'">删除</button></div></article>';}).join('')+'</div>';
        if(!items.length)html+='<div class="blank planner-empty">清单还空着。第一件小事从这里开始。</div>';
      }
      openView(meta.title,meta.en,html);
      var body=$('#viewBody');
      body.onclick=function(ev){
        if(ev.target.id==='calPrev'){monthCursor.setMonth(monthCursor.getMonth()-1);render();return;}
        if(ev.target.id==='calNext'){monthCursor.setMonth(monthCursor.getMonth()+1);render();return;}
        if(ev.target.id==='calToday'){selected=today();monthCursor=new Date();monthCursor.setDate(1);render();return;}
        var day=ev.target.closest('[data-cal-day]');if(day){selected=day.getAttribute('data-cal-day');render();return;}
        if(ev.target.id==='calAdd'||ev.target.id==='plNew'){editing='';$('#plannerForm').hidden=false;$('#plannerFormTitle').textContent=key==='calendar'?'添加日历记录':'新增安排';$('#plTitle').value='';$('#plDate').value=selected||today();if($('#plTime'))$('#plTime').value='';if($('#plPlace'))$('#plPlace').value='';if($('#plNote'))$('#plNote').value='';if($('#plPriority'))$('#plPriority').value='normal';$('#plTitle').focus();return;}
        if(ev.target.id==='plCancel'){$('#plannerForm').hidden=true;editing='';return;}
        var edit=ev.target.closest('[data-pl-edit]');if(edit){var it=items.find(function(x){return x.id===edit.getAttribute('data-pl-edit');});if(!it)return;editing=it.id;$('#plannerForm').hidden=false;$('#plannerFormTitle').textContent='修改'+(key==='calendar'?'日历记录':key==='schedule'?'安排':'待办');$('#plTitle').value=it.title||'';$('#plDate').value=it.date||today();if($('#plTime'))$('#plTime').value=it.time||'';if($('#plPlace'))$('#plPlace').value=it.place||'';if($('#plNote'))$('#plNote').value=it.note||'';if($('#plPriority'))$('#plPriority').value=it.priority||'normal';$('#plannerForm').scrollIntoView({behavior:'smooth',block:'nearest'});return;}
        var del=ev.target.closest('[data-pl-delete]');if(del){if(!confirm('确定删除这条记录？'))return;plannerSave(key,items.filter(function(x){return x.id!==del.getAttribute('data-pl-delete');}));render();toast('已删除。');return;}
        var filterBtn=ev.target.closest('[data-todo-filter]');if(filterBtn){Array.from(body.querySelectorAll('[data-todo-filter]')).forEach(function(b){b.classList.toggle('active',b===filterBtn);});var mode=filterBtn.getAttribute('data-todo-filter');Array.from(body.querySelectorAll('[data-todo-row]')).forEach(function(row){var item=items.find(function(x){return x.id===row.getAttribute('data-todo-row');});row.hidden=mode==='done'?!item.done:mode==='open'?!!item.done:false;});return;}
      };
      body.onchange=function(ev){var check=ev.target.closest('[data-todo-check]');if(!check)return;var list=plannerItems('todo'),it=list.find(function(x){return x.id===check.getAttribute('data-todo-check');});if(it){it.done=check.checked;it.completedAt=it.done?Date.now():0;if(plannerSave('todo',list)){render();toast(it.done?'完成啦。':'已恢复到待办。');}}};
      body.onsubmit=function(ev){
        if(ev.target.id==='todoQuick'){ev.preventDefault();var title=$('#todoQuickTitle').value.trim();if(!title)return;var list=plannerItems('todo');list.push({id:uid(),title:title,date:'',priority:'normal',note:'',done:false,createdAt:Date.now()});if(plannerSave('todo',list)){render();toast('已加入待办。');}return;}
        if(ev.target.id!=='plannerForm')return;ev.preventDefault();
        var title=$('#plTitle').value.trim();if(!title){toast('先写下标题吧。');return;}
        var list=plannerItems(key),existing=list.find(function(x){return x.id===editing;});
        var record={id:editing||uid(),title:title,date:plannerEscDate($('#plDate').value),note:$('#plNote').value.trim(),updatedAt:Date.now()};
        if(key==='schedule'){record.time=$('#plTime').value;record.place=$('#plPlace').value.trim();}
        if(key==='todo'){record.priority=$('#plPriority').value;record.done=existing?!!existing.done:false;record.createdAt=existing?existing.createdAt:Date.now();}
        if(key==='calendar')record.date=$('#plDate').value||selected;
        if(existing)list=list.map(function(x){return x.id===editing?Object.assign({},x,record):x;});else list.push(Object.assign({createdAt:Date.now()},record));
        if(plannerSave(key,list)){if(key==='calendar')selected=record.date;editing='';render();toast('已保存。');}
      };
    }
    render();
  }


  /* ================= 倒计时与心情 ================= */
  var K_COUNTDOWN='liwu.countdown';
  var K_MOOD='liwu.mood';
  function simpleList(key){var value=LS.get(key,[]);return Array.isArray(value)?value:[];}
  function simpleSave(key,value){return LS.set(key,value);}
  function dateDistance(value){
    var a=new Date(today()+'T00:00:00'),b=new Date((value||today())+'T00:00:00');
    return Math.round((b-a)/86400000);
  }
  function viewCountdown(){
    var key=K_COUNTDOWN,editing='';
    function render(){
      var all=simpleList(key).slice().sort(function(a,b){return (a.date||'').localeCompare(b.date||'');});
      var current=all.find(function(x){return x.id===editing;});
      var html='<div class="planner-intro"><p class="lead">把想见的日子、纪念日和期待放在这里。天数会随日期自动变化。</p><div class="planner-stat"><strong>'+all.length+'</strong><span>个日期</span></div></div>'+
        '<div class="planner-toolbar"><button class="ghost solid" type="button" id="countNew">＋ 添加日期</button><span class="tip">过去和未来的日期都会保留</span></div>'+
        '<form class="planner-form" id="countForm" '+(editing?'':'hidden')+'><strong>'+(editing?'修改日期':'添加日期')+'</strong><input id="countTitle" maxlength="80" required placeholder="例如：生日、旅行、纪念日" value="'+esc(current?current.title:'')+'"><label class="count-field">日期<input id="countDate" type="date" required value="'+esc(current?current.date:today())+'"></label><textarea id="countNote" rows="2" placeholder="备注（可选）">'+esc(current?current.note:'')+'</textarea><div class="planner-form-actions"><button class="ghost solid" type="submit">保存</button><button class="ghost" type="button" id="countCancel">取消</button></div></form>';
      if(!all.length)html+='<div class="blank planner-empty">还没有倒数的日子。先存下一个值得期待的日期。</div>';
      else html+='<div class="countdown-list">'+all.map(function(x){var gap=dateDistance(x.date),tag=gap>0?'还有 '+gap+' 天':gap<0?'已经过去 '+Math.abs(gap)+' 天':'就是今天';return '<article class="countdown-row"><div class="countdown-number"><strong>'+Math.abs(gap)+'</strong><small>'+(gap>0?'DAYS TO GO':gap<0?'DAYS AGO':'TODAY')+'</small></div><div class="countdown-copy"><strong>'+esc(x.title)+'</strong><span>'+esc(x.date)+' · '+tag+'</span>'+(x.note?'<p>'+esc(x.note)+'</p>':'')+'</div><div class="planner-item-actions"><button class="mini" type="button" data-count-edit="'+esc(x.id)+'">编辑</button><button class="mini danger" type="button" data-count-delete="'+esc(x.id)+'">删除</button></div></article>';}).join('')+'</div>';
      openView('倒计时','Countdown',html);
      var body=$('#viewBody');
      body.onclick=function(ev){
        if(ev.target.id==='countNew'){editing='';render();$('#countForm').hidden=false;$('#countTitle').focus();return;}
        if(ev.target.id==='countCancel'){editing='';render();return;}
        var edit=ev.target.closest('[data-count-edit]');if(edit){editing=edit.getAttribute('data-count-edit');render();$('#countForm').hidden=false;$('#countTitle').focus();return;}
        var del=ev.target.closest('[data-count-delete]');if(del&&confirm('删除这个日期？')){simpleSave(key,simpleList(key).filter(function(x){return x.id!==del.getAttribute('data-count-delete');}));editing='';render();toast('日期已删除。');}
      };
      body.onsubmit=function(ev){if(ev.target.id!=='countForm')return;ev.preventDefault();var title=$('#countTitle').value.trim(),date=$('#countDate').value;if(!title||!date){toast('名称和日期都要填写。');return;}var list=simpleList(key),item={id:editing||uid(),title:title,date:date,note:$('#countNote').value.trim(),updatedAt:Date.now()},idx=list.findIndex(function(x){return x.id===editing;});if(idx>=0)list[idx]=Object.assign({},list[idx],item);else list.push(item);if(simpleSave(key,list)){editing='';render();toast('日期已保存。');}};
    }
    render();
  }
  function viewMood(){
    var key=K_MOOD,level=3,labels={1:'低落',2:'疲惫',3:'平静',4:'不错',5:'很好'},query='';
    function render(){
      var all=simpleList(key).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'');});
      var current=all.find(function(x){return x.date===today();});if(current)level=current.level||3;
      var shown=all.filter(function(x){return !query||[x.date,x.note,labels[x.level]].join(' ').toLowerCase().indexOf(query.toLowerCase())>=0;});
      var html='<div class="planner-intro"><p class="lead">不必把情绪解释得很完整。选一个最接近此刻的状态，给今天留个记号。</p><div class="planner-stat"><strong>'+all.length+'</strong><span>条记录</span></div></div>'+
        '<form class="mood-compose" id="moodForm"><div class="mood-date">'+today()+(current?' · 今天已记录':' · 今天的心情')+'</div><div class="mood-choices">'+[1,2,3,4,5].map(function(n){return '<button type="button" class="mood-choice'+(level===n?' active':'')+'" data-mood-level="'+n+'"><strong>'+n+'</strong><span>'+labels[n]+'</span></button>';}).join('')+'</div><label class="field"><span>想说的话（可选）</span><textarea id="moodNote" rows="3" placeholder="今天是什么感觉？">'+esc(current?current.note:'')+'</textarea></label><button class="ghost solid" type="submit">保存今天</button></form>'+
        '<div class="diary-tools"><input id="moodSearch" type="search" placeholder="搜索心情记录" value="'+esc(query)+'"></div>'+
        (shown.length?'<div class="mood-history">'+shown.map(function(x){return '<article class="mood-history-row"><time>'+esc(x.date)+'</time><strong>'+x.level+' · '+labels[x.level]+'</strong><p>'+esc(x.note||'今天没有留下文字。')+'</p><button class="mini danger" type="button" data-mood-delete="'+esc(x.id)+'">删除</button></article>';}).join('')+'</div>':'<div class="blank">还没有心情记录。今天可以从这里开始。</div>');
      openView('心情','Mood',html);
      var body=$('#viewBody');
      body.onclick=function(ev){
        var choice=ev.target.closest('[data-mood-level]');if(choice){level=Number(choice.getAttribute('data-mood-level'));Array.from(body.querySelectorAll('.mood-choice')).forEach(function(b){b.classList.toggle('active',Number(b.getAttribute('data-mood-level'))===level);});return;}
        var del=ev.target.closest('[data-mood-delete]');if(del&&confirm('删除这条心情记录？')){simpleSave(key,simpleList(key).filter(function(x){return x.id!==del.getAttribute('data-mood-delete');}));render();toast('记录已删除。');}
      };
      body.oninput=function(ev){if(ev.target.id==='moodSearch'){var pos=ev.target.selectionStart;query=ev.target.value;render();var next=$('#moodSearch');next.focus();try{next.setSelectionRange(pos,pos);}catch(_){}}};
      body.onsubmit=function(ev){if(ev.target.id!=='moodForm')return;ev.preventDefault();var list=simpleList(key),old=list.find(function(x){return x.date===today();}),item={id:old?old.id:uid(),date:today(),level:level,note:$('#moodNote').value.trim(),updatedAt:Date.now()},idx=list.findIndex(function(x){return x.date===today();});if(idx>=0)list[idx]=item;else list.unshift(item);if(simpleSave(key,list)){render();toast('今天的心情收好了。');}};
    }
    render();
  }

  /* ================= 世界书 · 笔记本与条目 ================= */
  var K_WORLDBOOKS = 'liwu.worldbooks';
  function worldbooks(){ return LS.get(K_WORLDBOOKS, []); }
  function saveWorldbooks(items){ return LS.set(K_WORLDBOOKS, items); }
  function normalizeWorldbookEntry(raw, index){
    raw = raw || {};
    var keys = raw.keys || raw.key || [];
    if (!Array.isArray(keys)) keys = String(keys).split(/[,，\n]/);
    var secondary = raw.secondary_keys || raw.secondaryKeys || raw.keysecondary || [];
    if (!Array.isArray(secondary)) secondary = String(secondary).split(/[,，\n]/);
    return {
      id: String(raw.id || raw.uid || ('e' + Date.now().toString(36) + index + Math.random().toString(36).slice(2,5))),
      title: String(raw.title || raw.comment || raw.name || ('条目 ' + (index + 1))),
      keys: keys.map(function(x){return String(x).trim();}).filter(Boolean),
      secondaryKeys: secondary.map(function(x){return String(x).trim();}).filter(Boolean),
      content: String(raw.content || raw.text || ''),
      enabled: raw.enabled !== false && raw.disable !== true,
      constant: !!(raw.constant || raw.always_active),
      selective: raw.selective !== false,
      selectiveLogic: (String(raw.selectiveLogic == null ? (raw.selective_logic == null ? 'and' : raw.selective_logic) : raw.selectiveLogic).toLowerCase() === 'or' || Number(raw.selectiveLogic) === 1) ? 'or' : 'and',
      caseSensitive: !!(raw.caseSensitive || raw.case_sensitive),
      position: raw.position == null ? 0 : raw.position,
      depth: Number(raw.depth || 4),
      insertionOrder: Number(raw.insertion_order || raw.insertionOrder || 100)
    };
  }
  function parseWorldbookJSON(data, filename){
    var root = data && typeof data === 'object' ? data : {};
    var source = root.entries || (root.data && root.data.entries) || root.worldbook && root.worldbook.entries;
    var entries = [];
    if (Array.isArray(source)) entries = source.map(normalizeWorldbookEntry);
    else if (source && typeof source === 'object') entries = Object.keys(source).map(function(k,i){
      var item = Object.assign({}, source[k] || {});
      if (item.uid == null) item.uid = k;
      return normalizeWorldbookEntry(item, i);
    });
    else if (Array.isArray(root)) entries = root.map(normalizeWorldbookEntry);
    else throw new Error('没有找到 entries 条目');
    if (!entries.length) throw new Error('这个文件里没有可导入的条目');
    return {
      id: uid(),
      name: String(root.name || root.title || (filename || '导入的世界书').replace(/\.json$/i,'')),
      enabled: true,
      entries: entries,
      createdAt: Date.now()
    };
  }
  function worldbookExport(book){
    var entries = {};
    book.entries.forEach(function(e,i){
      entries[String(i)] = {
        uid:i, key:e.keys, keysecondary:e.secondaryKeys, comment:e.title,
        content:e.content, constant:e.constant, selective:e.selective,
        selectiveLogic:e.selectiveLogic === 'or' ? 1 : 0,
        enabled:e.enabled, position:e.position, depth:e.depth,
        insertion_order:e.insertionOrder, case_sensitive:e.caseSensitive
      };
    });
    return { name:book.name, entries:entries };
  }
  function downloadJSON(filename, data){
    var blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');a.href=url;a.download=filename;a.click();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
  }
  function viewWorldbook(){
    var selected = '';
    var editing = '';
    var query = '';
    function render(){
      var books = worldbooks();
      var book = books.find(function(b){return b.id===selected;});
      if (!book){
        selected = '';
        var html = '<div class="room-intro"><p class="lead">像整理笔记一样，一本一本收好设定。支持导入 Tavern / SillyTavern 导出的 JSON 世界书，内容保存在这台设备。</p><div class="room-stat"><strong>'+books.length+'</strong><span>本世界书</span></div></div>' +
          '<div class="worldbook-tools"><button class="ghost solid" id="wbNew" type="button">＋ 新建世界书</button><label class="ghost" for="wbImport">导入 JSON<input id="wbImport" type="file" accept=".json,application/json" hidden></label></div><form class="worldbook-compose" id="wbBookForm" hidden><strong>新建一本世界书</strong><input id="wbBookName" maxlength="80" placeholder="例如：宋祁的日常设定"><div class="row"><button class="ghost solid" type="submit">创建</button><button class="ghost" id="wbBookCancel" type="button">取消</button></div></form>';
        if(!books.length) html += '<div class="blank">这里还没有世界书。可以新建一本，或导入酒馆 JSON。</div>';
        else html += '<div class="worldbook-list">'+books.map(function(b){
          return '<button class="worldbook-card" type="button" data-wb-open="'+esc(b.id)+'"><span class="worldbook-card-top"><strong>'+esc(b.name)+'</strong><small>'+b.entries.length+' 个条目</small></span><span class="worldbook-card-bottom"><span>'+(b.enabled?'已启用':'已停用')+'</span><span>打开笔记本　↗</span></span></button>';
        }).join('')+'</div>';
        openView('世界书','Worldbook',html);
        var body=$('#viewBody');
        body.onclick=function(ev){
          var open=ev.target.closest('[data-wb-open]');
          if(open){selected=open.getAttribute('data-wb-open');query='';editing='';render();return;}
          if(ev.target.closest('#wbNew')){$('#wbBookForm').hidden=false;$('#wbBookName').focus();return;}
          if(ev.target.closest('#wbBookCancel')){$('#wbBookForm').hidden=true;return;}
        };
        body.onsubmit=function(ev){
          if(ev.target.id!=='wbBookForm')return;
          ev.preventDefault();var name=$('#wbBookName').value.trim();if(!name){toast('先给这本世界书起个名字。');return;}
          var all=worldbooks();var b={id:uid(),name:name,enabled:true,entries:[],createdAt:Date.now()};all.push(b);
          if(saveWorldbooks(all)){selected=b.id;render();toast('新世界书已创建。');}
        };
        body.onchange=async function(ev){
          if(ev.target.id!=='wbImport')return;
          var file=ev.target.files&&ev.target.files[0];if(!file)return;
          try{
            var parsed=JSON.parse(await file.text());
            var book=parseWorldbookJSON(parsed,file.name);
            var all=worldbooks();all.push(book);
            if(saveWorldbooks(all)){selected=book.id;render();toast('已导入 '+book.entries.length+' 个条目。');}
          }catch(err){toast('导入失败：'+(err.message||'JSON 格式不正确'));}
        };
        return;
      }
      var shown=book.entries.filter(function(e){
        return !query || [e.title,e.content].concat(e.keys,e.secondaryKeys).join(' ').toLowerCase().indexOf(query.toLowerCase())>=0;
      });
      var html = '<div class="worldbook-head"><button class="mini" id="wbBack" type="button">← 全部世界书</button><div class="worldbook-title-row"><div><h2>'+esc(book.name)+'</h2><p>'+book.entries.length+' 个条目 · 本机保存</p></div><label class="switch worldbook-switch"><span>整本启用</span><input id="wbBookEnabled" type="checkbox" '+(book.enabled?'checked':'')+'></label></div></div>' +
        '<div class="worldbook-tools"><input id="wbSearch" type="search" placeholder="搜索条目、关键词或内容" value="'+esc(query)+'"><button class="ghost solid" id="wbAdd" type="button">＋ 新条目</button></div>' +
        '<div class="worldbook-actions"><button class="mini" id="wbExport" type="button">导出 Tavern JSON</button><button class="mini" id="wbRename" type="button">重命名</button><button class="mini danger" id="wbDelete" type="button">删除整本</button></div>' +
        '<form class="compose worldbook-compose" id="wbEntryForm" '+(editing?'':'hidden')+'><strong id="wbFormHeading">'+(editing?'编辑条目':'新建条目')+'</strong><input id="wbEntryTitle" maxlength="100" placeholder="条目名称"><input id="wbEntryKeys" placeholder="关键词，用逗号分隔"><input id="wbEntrySecondary" placeholder="次要关键词，用逗号分隔（可选）"><textarea id="wbEntryContent" rows="8" placeholder="写下需要注入聊天的设定内容"></textarea><div class="worldbook-flags"><label><input id="wbEntryEnabled" type="checkbox" checked> 启用</label><label><input id="wbEntryConstant" type="checkbox"> 常驻注入</label><label><input id="wbEntrySelective" type="checkbox" checked> 需要关键词匹配</label></div><label class="field"><span>次要关键词逻辑</span><select id="wbEntryLogic"><option value="and">全部匹配（AND）</option><option value="or">任一匹配（OR）</option></select></label><div class="row"><button class="ghost solid" type="submit">保存条目</button><button class="ghost" id="wbCancel" type="button">取消</button></div></form>';
      if(!shown.length) html+='<div class="blank">'+(book.entries.length?'没有找到匹配的条目。':'这本笔记还没有条目。')+'</div>';
      else html+='<div class="worldbook-entries">'+shown.map(function(e){
        return '<article class="worldbook-entry"><div class="worldbook-entry-head"><div><h3>'+esc(e.title)+'</h3><small>'+esc(e.keys.join('、')||'无关键词')+'</small></div><label class="worldbook-toggle"><input type="checkbox" data-wb-toggle="'+esc(e.id)+'" '+(e.enabled?'checked':'')+'>启用</label></div><p>'+esc(e.content.slice(0,260))+(e.content.length>260?'…':'')+'</p><div class="worldbook-entry-actions"><button class="mini" type="button" data-wb-edit="'+esc(e.id)+'">编辑</button><button class="mini danger" type="button" data-wb-remove="'+esc(e.id)+'">删除</button><span class="tip">'+(e.constant?'常驻':e.selective?'关键词触发':'非关键词触发')+'</span></div></article>';
      }).join('')+'</div>';
      openView('世界书','Worldbook',html);
      var body=$('#viewBody');
      body.onclick=function(ev){
        if(ev.target.closest('#wbBack')){selected='';editing='';query='';render();return;}
        if(ev.target.closest('#wbAdd')){editing='';render();$('#wbEntryForm').hidden=false;$('#wbEntryTitle').focus();return;}
        if(ev.target.closest('#wbCancel')){editing='';render();return;}
        if(ev.target.closest('#wbRename')){var name=window.prompt('修改世界书名称',book.name);if(name&&name.trim()){book.name=name.trim();saveWorldbooks(books);render();}return;}
        if(ev.target.closest('#wbDelete')){if(window.confirm('删除整本世界书及其中所有条目？此操作无法撤销。')){saveWorldbooks(books.filter(function(b){return b.id!==book.id;}));selected='';render();}return;}
        if(ev.target.closest('#wbExport')){downloadJSON((book.name||'worldbook')+'.json',worldbookExport(book));return;}
        var edit=ev.target.closest('[data-wb-edit]');
        if(edit){editing=edit.getAttribute('data-wb-edit');var e=book.entries.find(function(x){return x.id===editing;});if(!e)return;render();$('#wbEntryForm').hidden=false;$('#wbEntryTitle').value=e.title;$('#wbEntryKeys').value=e.keys.join(', ');$('#wbEntrySecondary').value=e.secondaryKeys.join(', ');$('#wbEntryContent').value=e.content;$('#wbEntryEnabled').checked=e.enabled;$('#wbEntryConstant').checked=e.constant;$('#wbEntrySelective').checked=e.selective;$('#wbEntryLogic').value=e.selectiveLogic;return;}
        var del=ev.target.closest('[data-wb-remove]');
        if(del){if(window.confirm('删除这个条目？')){book.entries=book.entries.filter(function(x){return x.id!==del.getAttribute('data-wb-remove');});saveWorldbooks(books);render();}return;}
      };
      body.onchange=function(ev){
        if(ev.target.id==='wbBookEnabled'){book.enabled=ev.target.checked;saveWorldbooks(books);toast(book.enabled?'整本世界书已启用':'整本世界书已停用');return;}
        var toggle=ev.target.closest('[data-wb-toggle]');
        if(toggle){var e=book.entries.find(function(x){return x.id===toggle.getAttribute('data-wb-toggle');});if(e){e.enabled=toggle.checked;saveWorldbooks(books);toast('条目状态已保存');}}
      };
      body.onsubmit=function(ev){
        if(ev.target.id!=='wbEntryForm')return;
        ev.preventDefault();
        var title=$('#wbEntryTitle').value.trim(),content=$('#wbEntryContent').value.trim();
        if(!title||!content){toast('请填写条目名称和内容。');return;}
        var entry={
          id:editing||uid(),title:title,
          keys:$('#wbEntryKeys').value.split(/[,，\n]/).map(function(x){return x.trim();}).filter(Boolean),
          secondaryKeys:$('#wbEntrySecondary').value.split(/[,，\n]/).map(function(x){return x.trim();}).filter(Boolean),
          content:content,enabled:$('#wbEntryEnabled').checked,
          constant:$('#wbEntryConstant').checked,selective:$('#wbEntrySelective').checked,
          selectiveLogic:$('#wbEntryLogic').value,caseSensitive:false,depth:4,
          position:0,insertionOrder:100
        };
        if(editing){var at=book.entries.findIndex(function(x){return x.id===editing;});if(at>=0)book.entries[at]=entry;}
        else book.entries.push(entry);
        if(saveWorldbooks(books)){editing='';render();toast('条目已保存。');}
      };
      $('#wbSearch').addEventListener('input',function(){
        var pos=this.selectionStart;query=this.value;render();var next=$('#wbSearch');next.focus();try{next.setSelectionRange(pos,pos);}catch(_){}
      });
    }
    render();
  }
  function activeWorldbookContext(messages){
    var books=worldbooks().filter(function(b){return b.enabled!==false;});
    if(!books.length)return '';
    var scan=(messages||[]).filter(function(m){return m.role==='user'||m.role==='assistant';}).slice(-12).map(function(m){return String(m.content||'');}).join('\n');
    var matched=[];
    books.forEach(function(book){
      (book.entries||[]).forEach(function(e){
        if(!e.enabled||!e.content)return;
        var text=scan;
        function has(list){return (list||[]).some(function(k){if(!k)return false;var source=String(k);return e.caseSensitive?text.indexOf(source)>=0:text.toLowerCase().indexOf(source.toLowerCase())>=0;});}
        var primary=has(e.keys),secondary=has(e.secondaryKeys);
        var secondaryList=e.secondaryKeys||[];var secondaryMatch=!secondaryList.length||(e.selectiveLogic==='or'?secondary:secondaryList.every(function(k){var q=String(k);return e.caseSensitive?text.indexOf(q)>=0:text.toLowerCase().indexOf(q.toLowerCase())>=0;}));var triggered=e.constant||!e.selective||(primary&&secondaryMatch);
        if(triggered)matched.push({book:book.name,title:e.title,content:e.content,order:Number(e.insertionOrder)||100});
      });
    });
    matched.sort(function(a,b){return a.order-b.order;});
    if(!matched.length)return '';
    return '\n\n【世界书设定注入】\n'+matched.map(function(e){return '《'+e.book+' / '+e.title+'》\n'+e.content;}).join('\n\n')+'\n【世界书设定结束】';
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
        '<p class="tip">导出 JSON 含会话、配置、日记、相册、世界书、日历、安排、待办和起算日。Key 也在里面，别乱发。</p>' +
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
        var data = { v: 6, db: db, cfg: cfg, since: sinceValue(), diary: LS.get(K_DIARY, []), album: LS.get(K_ALBUM, []), worldbooks: LS.get(K_WORLDBOOKS, []), calendar: LS.get(PLANNER_KEYS.calendar, []), schedule: LS.get(PLANNER_KEYS.schedule, []), todo: LS.get(PLANNER_KEYS.todo, []), countdown: simpleList(K_COUNTDOWN), mood: simpleList(K_MOOD) };
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
              if (obj.album) LS.set(K_ALBUM, obj.album);
              if (Array.isArray(obj.worldbooks)) LS.set(K_WORLDBOOKS, obj.worldbooks);
              if (Array.isArray(obj.calendar)) LS.set(PLANNER_KEYS.calendar, obj.calendar);
              if (Array.isArray(obj.schedule)) LS.set(PLANNER_KEYS.schedule, obj.schedule);
              if (Array.isArray(obj.todo)) LS.set(PLANNER_KEYS.todo, obj.todo);
              if (Array.isArray(obj.countdown)) LS.set(K_COUNTDOWN, obj.countdown);
              if (Array.isArray(obj.mood)) LS.set(K_MOOD, obj.mood);
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
      if (!view.hidden) backFromView();
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
