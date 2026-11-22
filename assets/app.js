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
  var K_MEMORY = 'liwu.memory.local';
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
      (m.image ? '<div class="chat-image-wrap"><img class="chat-image" src="'+esc(m.image)+'" alt="主动生成的陪伴画面"></div>' : '') +
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
          '<button type="button" data-act="favorite" data-i="' + index + '"><span>收藏这条消息</span><small>放进收藏夹，之后可以继续整理</small></button>' +
          '<button type="button" data-act="quote" data-i="' + index + '"><span>存为语录</span><small>把这句话留在语录页</small></button>' +
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

  function enabledMcpToolSpecs(){
    var servers=manageList('liwu.mcp.servers').filter(function(s){return s.enabled&&Array.isArray(s.tools)&&s.tools.length;});
    var out=[];
    servers.forEach(function(server){
      server.tools.forEach(function(tool,index){
        var safe='mcp_'+String(server.id).replace(/[^a-zA-Z0-9_]/g,'').slice(0,10)+'_'+String(tool.name).replace(/[^a-zA-Z0-9_]/g,'_');
        out.push({type:'function',function:{name:safe,description:('MCP '+server.name+': '+(tool.description||tool.name)).slice(0,900),parameters:tool.inputSchema||{type:'object',properties:{}}},serverId:server.id,toolIndex:index});
      });
    });
    return out;
  }
  function enabledPluginToolSpecs(){
    return manageList('liwu.plugins').filter(function(p){return p.enabled&&p.endpoint;}).map(function(p){
      var schema={type:'object',properties:{}};
      if(p.inputSchema){try{schema=JSON.parse(p.inputSchema);}catch(_){schema={type:'object',properties:{}};}}
      var name='plugin_'+String(p.id).replace(/[^a-zA-Z0-9_]/g,'').slice(0,14);
      return {type:'function',function:{name:name,description:('Plugin '+p.name+': '+(p.description||p.category||'Custom API')).slice(0,900),parameters:schema},pluginId:p.id};
    });
  }
  async function executePluginToolByName(name,args){
    var spec=enabledPluginToolSpecs().find(function(x){return x.function.name===name;});if(!spec)return 'Plugin tool unavailable: '+name;
    var plugin=manageList('liwu.plugins').find(function(x){return x.id===spec.pluginId;});if(!plugin)return 'Plugin no longer exists.';
    var method=String(plugin.method||'POST').toUpperCase(),url=plugin.endpoint,headers={'Content-Type':'application/json','Accept':'application/json'};
    if(plugin.token)headers.Authorization=/^Bearer\s/i.test(plugin.token)?plugin.token:'Bearer '+plugin.token;
    if(plugin.headers){try{var custom=JSON.parse(plugin.headers);Object.keys(custom).forEach(function(k){headers[k]=String(custom[k]);});}catch(_){return 'Plugin custom headers are invalid JSON.';}}
    var options={method:method,headers:headers,signal:ctrl&&ctrl.signal};
    if(method==='GET'||method==='HEAD'){var query=new URLSearchParams();Object.keys(args||{}).forEach(function(k){var v=args[k];query.set(k,typeof v==='string'?v:JSON.stringify(v));});if(query.toString())url+=(url.indexOf('?')>=0?'&':'?')+query.toString();}
    else options.body=JSON.stringify(args||{});
    try{var res=await fetch(url,options),text=await res.text();if(!res.ok)throw new Error('HTTP '+res.status+' '+text.slice(0,180));try{return JSON.stringify(JSON.parse(text));}catch(_){return text.slice(0,6000);}}
    catch(e){return 'Plugin request failed: '+String(e.message||e);}
  }
  async function executeAnyToolByName(name,args){
    if(enabledMcpToolSpecs().some(function(x){return x.function.name===name;}))return executeMcpToolByName(name,args);
    return executePluginToolByName(name,args);
  }

  function mcpResponsePayload(text){
    try{return JSON.parse(text);}catch(_){
      var line=String(text||'').split(/\r?\n/).filter(function(x){return x.indexOf('data:')===0;}).pop();
      if(line)return JSON.parse(line.slice(5).trim());
      return {raw:text};
    }
  }
  async function executeMcpToolByName(name,args){
    var specs=enabledMcpToolSpecs(),spec=specs.find(function(x){return x.function.name===name;});
    if(!spec)return 'MCP tool unavailable: '+name;
    var server=manageList('liwu.mcp.servers').find(function(x){return x.id===spec.serverId;}),tool=server&&server.tools&&server.tools[spec.toolIndex];
    if(!server||!tool)return 'MCP server or tool no longer exists.';
    var headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream','MCP-Protocol-Version':server.protocolVersion||'2025-03-26'};
    if(server.token)headers.Authorization='Bearer '+server.token;
    if(server.sessionId)headers['Mcp-Session-Id']=server.sessionId;
    try{
      var res=await fetch(server.url,{method:'POST',headers:headers,signal:ctrl&&ctrl.signal,body:JSON.stringify({jsonrpc:'2.0',id:Date.now(),method:'tools/call',params:{name:tool.name,arguments:args||{}}})});
      var raw=await res.text(),payload=mcpResponsePayload(raw);
      if(!res.ok)throw new Error('HTTP '+res.status+' '+raw.slice(0,180));
      if(payload.error)throw new Error(payload.error.message||'MCP tool error');
      return JSON.stringify(payload.result||payload);
    }catch(e){return 'MCP tool call failed: '+String(e.message||e);}
  }

  function buildBody(s, stream){
    var hist = s.messages.filter(function(m){ return m.role === 'user' || m.role === 'assistant'; });
    if(hist.length&&hist[hist.length-1].role==='assistant'&&!hist[hist.length-1].content)hist=hist.slice(0,-1);
    hist = hist.slice(-Math.max(2, cfg.ctx));
    var sys = cfg.sys + profilePrompt() + activeWorldbookContext(hist);
    var arr = [{ role: 'system', content: sys }].concat(hist.map(function(m){ return { role: m.role, content: m.content }; }));
    var body = { model: cfg.model, messages: arr, stream: !!stream };
    var tools=enabledMcpToolSpecs().concat(enabledPluginToolSpecs());
    if(tools.length){body.tools=tools.map(function(x){return {type:'function',function:x.function};});body.tool_choice='auto';body.stream=false;}
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
      var mcpAvailable=enabledMcpToolSpecs().length>0;
      var requestStream=!!cfg.stream&&!mcpAvailable;
      var requestBody=buildBody(s,requestStream);
      var res = await fetch(endpoint(cfg.base), {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
        body: JSON.stringify(requestBody)
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

      if (!requestStream || !res.body || !res.body.getReader){
        var j = await res.json();
        var one = j.choices && j.choices[0] && j.choices[0].message;
        var toolRound=0;
        while(one&&Array.isArray(one.tool_calls)&&one.tool_calls.length&&toolRound<3){
          requestBody.messages.push({role:'assistant',content:one.content||null,tool_calls:one.tool_calls});
          for(var tc=0;tc<one.tool_calls.length;tc++){
            var call=one.tool_calls[tc],fn=call.function||{},args={};
            try{args=fn.arguments?JSON.parse(fn.arguments):{};}catch(_){args={};}
            var result=await executeAnyToolByName(fn.name,args);
            requestBody.messages.push({role:'tool',tool_call_id:call.id,content:String(result).slice(0,6000)});
          }
          toolRound++;
          res=await fetch(endpoint(cfg.base),{method:'POST',signal:ctrl.signal,headers:{'Content-Type':'application/json','Authorization':'Bearer '+cfg.key},body:JSON.stringify(requestBody)});
          if(!res.ok)throw new Error(res.status+' · '+(await res.text()).slice(0,200));
          j=await res.json();one=j.choices&&j.choices[0]&&j.choices[0].message;
        }
        if(one){
          if (one.reasoning_content) putThink(one.reasoning_content);
          putText(one.content || (one.tool_calls?'工具调用次数达到上限。':''));
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
      if(reply.content)maybeProactiveImage(s);
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
    applySavedWallpaper();
    var memories = (D.memory || []).concat(LS.get(K_MEMORY, []));
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
    else if (target === 'profile') viewProfile();
    else if (target === 'notice') viewNotices();
    else if (target === 'countdown') viewCountdown();
    else if (target === 'mood') viewMood();
    else if (target === 'ledger') viewLedger();
    else if (target === 'health') viewHealth();
    else if (target === 'period') viewPeriod();
    else if (target === 'study') viewStudy();
    else if (target === 'class') viewClass();
    else if (target === 'beautify') viewSettingsSection('玻璃材质','美化','Beautify');
    else if (target === 'theme') viewSettingsSection('外观','主题','Theme');
    else if (target === 'data') viewSettingsSection('数据','数据管理','Data');
    else if (target === 'wallpaper') viewWallpaper();
    else if (target === 'mcp') viewMcp();
    else if (target === 'plugins') viewPlugins();
    else if (target === 'music') viewMusic();
    else if (target === 'game') viewGame();
    else if (target === 'window') viewWindow();
    else if (target === 'imageStudio') viewImageStudio();
    else if (target === 'proactiveImage') viewProactiveImage();
    else if (target === 'moments') viewMoments();
    else if (target === 'quotes') viewQuotes();
    else if (target === 'favorite') viewFavorites();
    else if (target === 'diary') viewDiary();
    else if (target === 'album') viewAlbum();
    else if (target === 'memory') viewMemory();
    else if (target === 'settings') viewSettings();
    else if (target === 'worldbook') viewWorldbook();
    else viewFeature(target);
  }
  $('#homeMenuBtn').addEventListener('click', openDrawer);
  $('#homePhotoPick').addEventListener('click', function(){ $('#homePhotoFile').click(); });
  $('#homePhotoFile').addEventListener('change', async function(ev){
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    try{var data = await compressAlbumImage(file);if(LS.set('liwu.wallpaper',data)){applySavedWallpaper();toast('首页照片已保存。');}}
    catch(e){toast('图片保存失败，请换一张较小的图片。');}
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
    if (act === 'favorite' || act === 'quote'){
      var textToSave=String(m.content||'').trim();
      if(textToSave){
        if(act==='favorite'){
          var favs=collectionList('liwu.favorites');
          if(!favs.some(function(x){return x.content===textToSave;})){favs.unshift({id:uid(),title:textToSave.split(/\n/)[0].slice(0,48)||'聊天收藏',category:'文字',content:textToSave,pinned:false,createdAt:Date.now()});LS.set('liwu.favorites',favs);toast('已收藏到收藏夹。');}
          else toast('这条消息已经收藏过了。');
        }else{
          var quotes=collectionList('liwu.quotes');
          if(!quotes.some(function(x){return x.text===textToSave;})){quotes.unshift({id:uid(),text:textToSave,author:m.role==='assistant'?'宋祁':'我',tags:'聊天',note:'',createdAt:Date.now()});LS.set('liwu.quotes',quotes);toast('已存进语录。');}
          else toast('这句话已经在语录里了。');
        }
      }
      return;
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
      else if (v === 'profile') viewProfile();
      else if (v === 'notice') viewNotices();
      else if (v === 'countdown') viewCountdown();
      else if (v === 'mood') viewMood();
      else if (v === 'ledger') viewLedger();
      else if (v === 'health') viewHealth();
      else if (v === 'period') viewPeriod();
      else if (v === 'study') viewStudy();
      else if (v === 'class') viewClass();
      else if (v === 'beautify') viewSettingsSection('玻璃材质','美化','Beautify');
      else if (v === 'theme') viewSettingsSection('外观','主题','Theme');
      else if (v === 'data') viewSettingsSection('数据','数据管理','Data');
      else if (v === 'wallpaper') viewWallpaper();
      else if (v === 'mcp') viewMcp();
      else if (v === 'plugins') viewPlugins();
      else if (v === 'music') viewMusic();
      else if (v === 'game') viewGame();
      else if (v === 'window') viewWindow();
      else if (v === 'imageStudio') viewImageStudio();
      else if (v === 'proactiveImage') viewProactiveImage();
      else if (v === 'moments') viewMoments();
      else if (v === 'quotes') viewQuotes();
      else if (v === 'favorite') viewFavorites();
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


  /* ================= 共同片段 · 动态 / 语录 / 收藏 ================= */
  function collectionList(key){var v=LS.get(key,[]);return Array.isArray(v)?v:[];}
  function viewMoments(){
    var key='liwu.moments',editing='',query='';
    function render(){
      var all=collectionList(key).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'')||(b.createdAt||0)-(a.createdAt||0);});
      var shown=all.filter(function(x){return !query||[x.title,x.content,x.date].join(' ').toLowerCase().includes(query.toLowerCase());});
      var html='<div class="planner-intro"><p class="lead">把生活里值得停一下的瞬间留在这里。不是动态广场，只属于这间屋子的两个人。</p><div class="planner-stat"><strong>'+all.length+'</strong><span>段片刻</span></div></div>'+
        '<div class="collection-toolbar"><input id="momentSearch" type="search" placeholder="搜索片段" value="'+esc(query)+'"><button class="ghost solid" id="momentNew" type="button">＋ 记一件小事</button></div>'+
        '<form class="planner-form" id="momentForm" hidden><strong id="momentFormTitle">记下这一刻</strong><input id="momentTitle" maxlength="80" placeholder="给这一刻一个名字（可选）"><input id="momentDate" type="date" value="'+today()+'"><textarea id="momentContent" rows="5" placeholder="发生了什么？当时是什么感觉？"></textarea><div class="planner-form-actions"><button class="ghost solid" type="submit">保存片段</button><button class="ghost" id="momentCancel" type="button">取消</button></div></form>';
      html+=shown.length?'<div class="moments-feed">'+shown.map(function(x){return '<article class="moment-card"><time>'+esc(plannerDateLabel(x.date))+'</time><h3>'+esc(x.title||'一个小片刻')+'</h3><p>'+esc(x.content)+'</p><div class="planner-item-actions"><button class="mini" type="button" data-moment-edit="'+esc(x.id)+'">编辑</button><button class="mini danger" type="button" data-moment-delete="'+esc(x.id)+'">删除</button></div></article>';}).join('')+'</div>':'<div class="blank planner-empty">'+(all.length?'没有找到相关片段。':'生活还在继续，等第一个瞬间落下来。')+'</div>';
      openView('动态','Moments',html);var body=$('#viewBody');
      body.onclick=function(ev){
        if(ev.target.id==='momentNew'){editing='';$('#momentFormTitle').textContent='记下这一刻';$('#momentTitle').value='';$('#momentDate').value=today();$('#momentContent').value='';$('#momentForm').hidden=false;$('#momentTitle').focus();return;}
        if(ev.target.id==='momentCancel'){$('#momentForm').hidden=true;editing='';return;}
        var edit=ev.target.closest('[data-moment-edit]');if(edit){var x=all.find(function(a){return a.id===edit.getAttribute('data-moment-edit');});if(!x)return;editing=x.id;$('#momentFormTitle').textContent='修改片段';$('#momentTitle').value=x.title||'';$('#momentDate').value=x.date||today();$('#momentContent').value=x.content||'';$('#momentForm').hidden=false;$('#momentForm').scrollIntoView({behavior:'smooth',block:'nearest'});return;}
        var del=ev.target.closest('[data-moment-delete]');if(del&&confirm('删除这段生活记录？')){LS.set(key,collectionList(key).filter(function(x){return x.id!==del.getAttribute('data-moment-delete');}));render();toast('片段已删除。');}
      };
      body.oninput=function(ev){if(ev.target.id==='momentSearch'){query=ev.target.value;var p=ev.target.selectionStart;render();$('#momentSearch').focus();try{$('#momentSearch').setSelectionRange(p,p);}catch(_){}}};
      body.onsubmit=function(ev){if(ev.target.id!=='momentForm')return;ev.preventDefault();var content=$('#momentContent').value.trim();if(!content){toast('先写下这一刻吧。');return;}var list=collectionList(key),item={id:editing||uid(),title:$('#momentTitle').value.trim(),date:$('#momentDate').value||today(),content:content,updatedAt:Date.now()},idx=list.findIndex(function(x){return x.id===editing;});if(idx>=0)list[idx]=Object.assign({},list[idx],item);else list.push(Object.assign({createdAt:Date.now()},item));if(LS.set(key,list)){editing='';query='';render();toast('这一刻收好了。');}};
    }
    render();
  }
  function viewQuotes(){
    var key='liwu.quotes',editing='',query='';
    function render(){
      var all=collectionList(key).slice().sort(function(a,b){return (b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0);});
      var shown=all.filter(function(x){return !query||[x.text,x.author,x.note,x.tags].join(' ').toLowerCase().includes(query.toLowerCase());});
      var html='<div class="planner-intro"><p class="lead">喜欢的话、聊天里的一句、想反复读的文字，都可以留在这里。</p><div class="planner-stat"><strong>'+all.length+'</strong><span>句收藏</span></div></div>'+
        '<div class="collection-toolbar"><input id="quoteSearch" type="search" placeholder="搜索语录、出处或标签" value="'+esc(query)+'"><button class="ghost solid" id="quoteNew" type="button">＋ 收下一句话</button></div>'+
        '<form class="planner-form" id="quoteForm" hidden><strong id="quoteFormTitle">收下一句话</strong><textarea id="quoteText" rows="4" placeholder="写下喜欢的句子…"></textarea><input id="quoteAuthor" maxlength="80" placeholder="说话的人 / 出处（可选）"><input id="quoteTags" maxlength="120" placeholder="标签，用逗号分开（可选）"><textarea id="quoteNote" rows="2" placeholder="为什么想留下它？（可选）"></textarea><div class="planner-form-actions"><button class="ghost solid" type="submit">保存语录</button><button class="ghost" id="quoteCancel" type="button">取消</button></div></form>';
      html+=shown.length?'<div class="quote-list">'+shown.map(function(x){return '<article class="quote-card"><span class="quote-mark">“</span><blockquote>'+esc(x.text)+'</blockquote>'+(x.author?'<cite>'+esc(x.author)+'</cite>':'')+(x.note?'<p>'+esc(x.note)+'</p>':'')+(x.tags?'<small>'+esc(x.tags)+'</small>':'')+'<div class="planner-item-actions"><button class="mini" type="button" data-quote-edit="'+esc(x.id)+'">编辑</button><button class="mini danger" type="button" data-quote-delete="'+esc(x.id)+'">删除</button></div></article>';}).join('')+'</div>':'<div class="blank planner-empty">'+(all.length?'没有找到相关语录。':'先收下一句喜欢的话吧。')+'</div>';
      openView('语录','Quotes',html);var body=$('#viewBody');
      body.onclick=function(ev){
        if(ev.target.id==='quoteNew'){editing='';$('#quoteFormTitle').textContent='收下一句话';['quoteText','quoteAuthor','quoteTags','quoteNote'].forEach(function(id){$('#'+id).value='';});$('#quoteForm').hidden=false;$('#quoteText').focus();return;}
        if(ev.target.id==='quoteCancel'){$('#quoteForm').hidden=true;editing='';return;}
        var edit=ev.target.closest('[data-quote-edit]');if(edit){var x=all.find(function(a){return a.id===edit.getAttribute('data-quote-edit');});if(!x)return;editing=x.id;$('#quoteFormTitle').textContent='修改语录';$('#quoteText').value=x.text||'';$('#quoteAuthor').value=x.author||'';$('#quoteTags').value=x.tags||'';$('#quoteNote').value=x.note||'';$('#quoteForm').hidden=false;$('#quoteForm').scrollIntoView({behavior:'smooth',block:'nearest'});return;}
        var del=ev.target.closest('[data-quote-delete]');if(del&&confirm('删除这句语录？')){LS.set(key,collectionList(key).filter(function(x){return x.id!==del.getAttribute('data-quote-delete');}));render();toast('语录已删除。');}
      };
      body.oninput=function(ev){if(ev.target.id==='quoteSearch'){query=ev.target.value;var p=ev.target.selectionStart;render();$('#quoteSearch').focus();try{$('#quoteSearch').setSelectionRange(p,p);}catch(_){}}};
      body.onsubmit=function(ev){if(ev.target.id!=='quoteForm')return;ev.preventDefault();var text=$('#quoteText').value.trim();if(!text){toast('先写下句子吧。');return;}var list=collectionList(key),item={id:editing||uid(),text:text,author:$('#quoteAuthor').value.trim(),tags:$('#quoteTags').value.trim(),note:$('#quoteNote').value.trim(),updatedAt:Date.now()},idx=list.findIndex(function(x){return x.id===editing;});if(idx>=0)list[idx]=Object.assign({},list[idx],item);else list.unshift(Object.assign({createdAt:Date.now()},item));if(LS.set(key,list)){editing='';query='';render();toast('语录收好了。');}};
    }
    render();
  }
  function viewFavorites(){
    var key='liwu.favorites',editing='',query='';
    function render(){
      var all=collectionList(key).slice().sort(function(a,b){return Number(!!b.pinned)-Number(!!a.pinned)||(b.createdAt||0)-(a.createdAt||0);});
      var shown=all.filter(function(x){return !query||[x.title,x.content,x.category].join(' ').toLowerCase().includes(query.toLowerCase());});
      var html='<div class="planner-intro"><p class="lead">把想留住的文字、图片说明和生活片段收在一起。置顶的内容会排在前面。</p><div class="planner-stat"><strong>'+all.length+'</strong><span>份收藏</span></div></div>'+
        '<div class="collection-toolbar"><input id="favoriteSearch" type="search" placeholder="搜索收藏" value="'+esc(query)+'"><button class="ghost solid" id="favoriteNew" type="button">＋ 添加收藏</button></div>'+
        '<form class="planner-form" id="favoriteForm" hidden><strong id="favoriteFormTitle">添加收藏</strong><input id="favoriteTitle" maxlength="100" placeholder="标题"><select id="favoriteCategory"><option value="文字">文字</option><option value="图片">图片</option><option value="生活">生活片段</option><option value="其他">其他</option></select><textarea id="favoriteContent" rows="4" placeholder="收藏内容或图片说明"></textarea><label class="worldbook-switch"><input id="favoritePinned" type="checkbox"> 置顶这份收藏</label><div class="planner-form-actions"><button class="ghost solid" type="submit">保存收藏</button><button class="ghost" id="favoriteCancel" type="button">取消</button></div></form>';
      html+=shown.length?'<div class="favorite-list">'+shown.map(function(x){return '<article class="favorite-card"><div class="favorite-card-top"><span>'+esc(x.category||'其他')+'</span>'+(x.pinned?'<small>已置顶</small>':'')+'</div><h3>'+esc(x.title||'未命名收藏')+'</h3><p>'+esc(x.content)+'</p><div class="planner-item-actions"><button class="mini" type="button" data-fav-edit="'+esc(x.id)+'">编辑</button><button class="mini" type="button" data-fav-pin="'+esc(x.id)+'">'+(x.pinned?'取消置顶':'置顶')+'</button><button class="mini danger" type="button" data-fav-delete="'+esc(x.id)+'">删除</button></div></article>';}).join('')+'</div>':'<div class="blank planner-empty">'+(all.length?'没有找到相关收藏。':'喜欢的内容可以放在这里。')+'</div>';
      openView('收藏','Favorites',html);var body=$('#viewBody');
      body.onclick=function(ev){
        if(ev.target.id==='favoriteNew'){editing='';$('#favoriteFormTitle').textContent='添加收藏';$('#favoriteTitle').value='';$('#favoriteCategory').value='文字';$('#favoriteContent').value='';$('#favoritePinned').checked=false;$('#favoriteForm').hidden=false;$('#favoriteTitle').focus();return;}
        if(ev.target.id==='favoriteCancel'){$('#favoriteForm').hidden=true;editing='';return;}
        var edit=ev.target.closest('[data-fav-edit]');if(edit){var x=all.find(function(a){return a.id===edit.getAttribute('data-fav-edit');});if(!x)return;editing=x.id;$('#favoriteFormTitle').textContent='修改收藏';$('#favoriteTitle').value=x.title||'';$('#favoriteCategory').value=x.category||'文字';$('#favoriteContent').value=x.content||'';$('#favoritePinned').checked=!!x.pinned;$('#favoriteForm').hidden=false;$('#favoriteForm').scrollIntoView({behavior:'smooth',block:'nearest'});return;}
        var pin=ev.target.closest('[data-fav-pin]');if(pin){var list=collectionList(key),item=list.find(function(x){return x.id===pin.getAttribute('data-fav-pin');});if(item){item.pinned=!item.pinned;LS.set(key,list);render();}return;}
        var del=ev.target.closest('[data-fav-delete]');if(del&&confirm('删除这份收藏？')){LS.set(key,collectionList(key).filter(function(x){return x.id!==del.getAttribute('data-fav-delete');}));render();toast('收藏已删除。');}
      };
      body.oninput=function(ev){if(ev.target.id==='favoriteSearch'){query=ev.target.value;var p=ev.target.selectionStart;render();$('#favoriteSearch').focus();try{$('#favoriteSearch').setSelectionRange(p,p);}catch(_){}}};
      body.onsubmit=function(ev){if(ev.target.id!=='favoriteForm')return;ev.preventDefault();var content=$('#favoriteContent').value.trim();if(!content){toast('收藏内容不能为空。');return;}var list=collectionList(key),item={id:editing||uid(),title:$('#favoriteTitle').value.trim(),category:$('#favoriteCategory').value,content:content,pinned:$('#favoritePinned').checked,updatedAt:Date.now()},idx=list.findIndex(function(x){return x.id===editing;});if(idx>=0)list[idx]=Object.assign({},list[idx],item);else list.unshift(Object.assign({createdAt:Date.now()},item));if(LS.set(key,list)){editing='';query='';render();toast('已加入收藏。');}};
    }
    render();
  }


  /* ================= 相处 · 人设档案与通知 ================= */
  var K_PROFILE='liwu.profile',K_NOTICES='liwu.notices',K_NOTICE_READ='liwu.notice.read';
  function profileData(){return Object.assign({name:'宋祁',relationship:'',personality:'',appearance:'',speech:'',background:''},LS.get(K_PROFILE,{}));}
  function profilePrompt(){
    var p=profileData(),parts=[];
    if(p.name)parts.push('名字：'+p.name);
    if(p.relationship)parts.push('关系与相处：'+p.relationship);
    if(p.personality)parts.push('性格：'+p.personality);
    if(p.appearance)parts.push('外观设定（保持一致）：'+p.appearance);
    if(p.speech)parts.push('说话方式：'+p.speech);
    if(p.background)parts.push('共同背景：'+p.background);
    return parts.length?'\n\n【人设档案】\n'+parts.join('\n'):'';
  }
  function viewProfile(){
    var p=profileData();
    var html='<div class="planner-intro"><p class="lead">这里记录宋祁是谁，以及你们共同确认过的设定。保存后会随聊天一起提供给模型。</p></div>'+
      '<form class="profile-form" id="profileForm">'+
      '<section class="profile-section"><small>IDENTITY</small><h3>基本信息</h3><label class="field"><span>名字</span><input id="pfName" maxlength="40" value="'+esc(p.name)+'"></label><label class="field"><span>关系与相处方式</span><textarea id="pfRelation" rows="2" placeholder="你们如何称呼彼此、如何相处…">'+esc(p.relationship)+'</textarea></label></section>'+
      '<section class="profile-section"><small>PERSONALITY</small><h3>性格与表达</h3><label class="field"><span>性格特征</span><textarea id="pfPersonality" rows="4" placeholder="性格、价值观、习惯与边界…">'+esc(p.personality)+'</textarea></label><label class="field"><span>说话方式</span><textarea id="pfSpeech" rows="3" placeholder="语气、句子长短、表达习惯…">'+esc(p.speech)+'</textarea></label></section>'+
      '<section class="profile-section"><small>APPEARANCE</small><h3>外观档案</h3><p class="tip">外观描述保留为一整段文字，不拆成零散选项。建议用英文描述细节，方便后续生图保持一致。</p><textarea id="pfAppearance" rows="8" placeholder="A detailed English appearance description...">'+esc(p.appearance)+'</textarea><label class="worldbook-switch"><input id="pfAppearanceConfirmed" type="checkbox" '+(p.appearanceConfirmed?'checked':'')+'> 我已确认这段外观描述，可用于主动生图</label></section>'+
      '<section class="profile-section"><small>SHARED WORLD</small><h3>共同背景</h3><label class="field"><span>生活背景与重要设定</span><textarea id="pfBackground" rows="4" placeholder="居住环境、共同经历、长期设定…">'+esc(p.background)+'</textarea></label></section>'+
      '<div class="profile-save-row"><button class="ghost solid" type="submit">保存档案</button><span class="tip">只保存在本机，修改后会用于之后的聊天。</span></div></form>';
    openView('人设档案','Profile',html);
    $('#viewBody').onsubmit=function(ev){if(ev.target.id!=='profileForm')return;ev.preventDefault();var next={name:$('#pfName').value.trim()||'宋祁',relationship:$('#pfRelation').value.trim(),personality:$('#pfPersonality').value.trim(),speech:$('#pfSpeech').value.trim(),appearance:$('#pfAppearance').value.trim(),appearanceConfirmed:$('#pfAppearanceConfirmed').checked,background:$('#pfBackground').value.trim(),updatedAt:Date.now()};if(LS.set(K_PROFILE,next))toast('人设档案已保存，之后的聊天会带上这些设定。');};
  }
  function viewNotices(){
    var manual=LS.get(K_NOTICES,[]),read=LS.get(K_NOTICE_READ,[]),auto=[];
    var todayValue=today(),limit=new Date();limit.setDate(limit.getDate()+7);var limitValue=limit.getFullYear()+'-'+p2(limit.getMonth()+1)+'-'+p2(limit.getDate());
    plannerItems('schedule').forEach(function(x){if(x.date>=todayValue&&x.date<=limitValue)auto.push({id:'schedule:'+x.id,title:x.title,body:'安排 · '+x.date+(x.time?' '+x.time:'')+(x.place?' · '+x.place:''),date:x.date,kind:'安排'});});
    plannerItems('calendar').forEach(function(x){if(x.date>=todayValue&&x.date<=limitValue)auto.push({id:'calendar:'+x.id,title:x.title,body:'日历记录 · '+x.date+(x.note?' · '+x.note:''),date:x.date,kind:'日历'});});
    plannerItems('todo').forEach(function(x){if(!x.done&&x.date&&x.date<=todayValue)auto.push({id:'todo:'+x.id,title:x.title,body:'待办已到期 · '+x.date,date:x.date,kind:'待办'});});
    var all=manual.map(function(x){return Object.assign({manual:true},x);}).concat(auto.map(function(x){return Object.assign({manual:false},x);}));
    all.sort(function(a,b){return (b.date||'').localeCompare(a.date||'');});
    var unread=all.filter(function(x){return read.indexOf(x.id)<0;}).length;
    var html='<div class="planner-intro"><p class="lead">即将到来的安排、日历记录和逾期待办会自动出现在这里。不会发送系统推送，只在你打开里屋时整理提醒。</p><div class="planner-stat"><strong>'+unread+'</strong><span>条未读</span></div></div>'+
      '<div class="notice-toolbar"><button class="ghost" id="noticeReadAll" type="button">全部标为已读</button><button class="ghost solid" id="noticeNew" type="button">＋ 写一条提醒</button></div>'+
      '<form class="planner-form" id="noticeForm" hidden><strong>新提醒</strong><input id="noticeTitle" maxlength="80" placeholder="提醒标题"><input id="noticeDate" type="date" value="'+today()+'"><textarea id="noticeBody" rows="3" placeholder="提醒内容（可选）"></textarea><div class="planner-form-actions"><button class="ghost solid" type="submit">保存提醒</button><button class="ghost" id="noticeCancel" type="button">取消</button></div></form>';
    html+=all.length?'<div class="notice-list">'+all.map(function(x){var isRead=read.indexOf(x.id)>=0;return '<article class="notice-item '+(isRead?'is-read':'')+'"><span class="notice-dot"></span><div class="notice-main"><div class="notice-meta"><small>'+esc(x.kind||'提醒')+'</small><time>'+esc(x.date||'')+'</time></div><strong>'+esc(x.title)+'</strong><p>'+esc(x.body||'')+'</p><div class="planner-item-actions"><button class="mini" type="button" data-notice-read="'+esc(x.id)+'">'+(isRead?'标为未读':'标为已读')+'</button>'+(x.manual?'<button class="mini danger" type="button" data-notice-delete="'+esc(x.id)+'">删除</button>':'')+'</div></div></article>';}).join('')+'</div>':'<div class="blank planner-empty">暂时没有提醒。重要的日子和待办会在这里出现。</div>';
    openView('通知','Notice',html);var body=$('#viewBody');
    body.onclick=function(ev){
      if(ev.target.id==='noticeNew'){$('#noticeForm').hidden=false;$('#noticeTitle').focus();return;}
      if(ev.target.id==='noticeCancel'){$('#noticeForm').hidden=true;return;}
      if(ev.target.id==='noticeReadAll'){LS.set(K_NOTICE_READ,all.map(function(x){return x.id;}));viewNotices();toast('已全部标为已读。');return;}
      var readBtn=ev.target.closest('[data-notice-read]');if(readBtn){var id=readBtn.getAttribute('data-notice-read'),list=LS.get(K_NOTICE_READ,[]);if(list.indexOf(id)>=0)list=list.filter(function(x){return x!==id;});else list.push(id);LS.set(K_NOTICE_READ,list);viewNotices();return;}
      var del=ev.target.closest('[data-notice-delete]');if(del&&confirm('删除这条提醒？')){LS.set(K_NOTICES,LS.get(K_NOTICES,[]).filter(function(x){return x.id!==del.getAttribute('data-notice-delete');}));viewNotices();toast('提醒已删除。');}
    };
    body.onsubmit=function(ev){if(ev.target.id!=='noticeForm')return;ev.preventDefault();var title=$('#noticeTitle').value.trim();if(!title){toast('先写提醒标题。');return;}var list=LS.get(K_NOTICES,[]);list.push({id:uid(),title:title,date:$('#noticeDate').value||today(),body:$('#noticeBody').value.trim(),createdAt:Date.now()});if(LS.set(K_NOTICES,list)){viewNotices();toast('提醒已保存。');}};
  }


  /* ================= 日常管理 · 账本 / 健康 / 经期 / 学习 / 课程表 ================= */
  var K_LEDGER='liwu.ledger',K_HEALTH='liwu.health',K_PERIOD='liwu.period',K_STUDY='liwu.study',K_CLASS='liwu.class';
  function manageList(key){var v=LS.get(key,[]);return Array.isArray(v)?v:[];}
  function manageSave(key,list){return LS.set(key,list);}
  function moneyText(value){return '¥'+Number(value||0).toFixed(2);}
  function manageDayName(n){return ['周一','周二','周三','周四','周五','周六','周日'][Math.max(0,Math.min(6,n-1))];}

  function viewLedger(){
    var month=today().slice(0,7),editing='';
    function render(){
      var all=manageList(K_LEDGER),items=all.filter(function(x){return (x.date||'').slice(0,7)===month;}).sort(function(a,b){return (b.date||'').localeCompare(a.date||'')||(b.createdAt||0)-(a.createdAt||0);});
      var income=items.filter(function(x){return x.type==='income';}).reduce(function(s,x){return s+Number(x.amount||0);},0);
      var expense=items.filter(function(x){return x.type!=='income';}).reduce(function(s,x){return s+Number(x.amount||0);},0);
      var current=all.find(function(x){return x.id===editing;});
      var html='<div class="planner-intro"><p class="lead">把日常收支放进同一本账里。收入和支出分开统计，记录只保存在本机。</p><div class="planner-stat"><strong>'+items.length+'</strong><span>笔记录</span></div></div>'+
        '<div class="ledger-summary"><div><small>收入</small><strong>'+moneyText(income)+'</strong></div><div><small>支出</small><strong>'+moneyText(expense)+'</strong></div><div><small>结余</small><strong>'+moneyText(income-expense)+'</strong></div></div>'+
        '<div class="ledger-toolbar"><label>月份<input id="ledgerMonth" type="month" value="'+month+'"></label><button class="ghost solid" type="button" id="ledgerNew">＋ 记一笔</button></div>'+
        '<form class="planner-form" id="ledgerForm" '+(editing?'':'hidden')+'><strong>'+(editing?'修改记录':'新增收支')+'</strong><div class="planner-fields"><label>类型<select id="ledgerType"><option value="expense" '+(!current||current.type!=='income'?'selected':'')+'>支出</option><option value="income" '+(current&&current.type==='income'?'selected':'')+'>收入</option></select></label><label>金额<input id="ledgerAmount" type="number" min="0.01" step="0.01" required value="'+esc(current?current.amount:'')+'" placeholder="0.00"></label></div><div class="planner-fields"><label>日期<input id="ledgerDate" type="date" required value="'+esc(current?current.date:today())+'"></label><label>分类<select id="ledgerCategory"><option '+(current&&current.category==='餐饮'?'selected':'')+'>餐饮</option><option '+(current&&current.category==='购物'?'selected':'')+'>购物</option><option '+(current&&current.category==='交通'?'selected':'')+'>交通</option><option '+(current&&current.category==='居家'?'selected':'')+'>居家</option><option '+(current&&current.category==='学习'?'selected':'')+'>学习</option><option '+(current&&current.category==='娱乐'?'selected':'')+'>娱乐</option><option '+(current&&current.category==='医疗'?'selected':'')+'>医疗</option><option '+(current&&current.category==='工资'?'selected':'')+'>工资</option><option '+(current&&current.category==='其他'?'selected':'')+'>其他</option></select></label></div><input id="ledgerNote" maxlength="120" placeholder="备注（可选）" value="'+esc(current?current.note:'')+'"><div class="planner-form-actions"><button class="ghost solid" type="submit">保存记录</button><button class="ghost" type="button" id="ledgerCancel">取消</button></div></form>'+
        (items.length?'<div class="ledger-list">'+items.map(function(x){return '<article class="ledger-row"><div class="ledger-kind '+(x.type==='income'?'income':'expense')+'">'+(x.type==='income'?'＋':'－')+'</div><div class="ledger-copy"><strong>'+esc(x.category||'其他')+'</strong><small>'+esc(x.date)+(x.note?' · '+esc(x.note):'')+'</small></div><strong class="ledger-amount '+(x.type==='income'?'income':'expense')+'">'+(x.type==='income'?'+':'−')+moneyText(x.amount)+'</strong><div class="planner-item-actions"><button class="mini" type="button" data-ledger-edit="'+esc(x.id)+'">编辑</button><button class="mini danger" type="button" data-ledger-delete="'+esc(x.id)+'">删除</button></div></article>';}).join('')+'</div>':'<div class="blank">这个月还没有收支记录。</div>');
      openView('账本','Ledger',html);var body=$('#viewBody');
      body.onclick=function(ev){
        if(ev.target.id==='ledgerNew'){editing='';render();$('#ledgerForm').hidden=false;$('#ledgerDate').value=today();$('#ledgerForm').scrollIntoView({behavior:'smooth',block:'nearest'});return;}
        if(ev.target.id==='ledgerCancel'){editing='';render();return;}
        var edit=ev.target.closest('[data-ledger-edit]');if(edit){editing=edit.getAttribute('data-ledger-edit');render();$('#ledgerForm').hidden=false;return;}
        var del=ev.target.closest('[data-ledger-delete]');if(del&&confirm('删除这笔记录？')){manageSave(K_LEDGER,manageList(K_LEDGER).filter(function(x){return x.id!==del.getAttribute('data-ledger-delete');}));editing='';render();toast('记录已删除。');}
      };
      body.onchange=function(ev){if(ev.target.id==='ledgerMonth'){month=ev.target.value||today().slice(0,7);editing='';render();}};
      body.onsubmit=function(ev){if(ev.target.id!=='ledgerForm')return;ev.preventDefault();var amount=Number($('#ledgerAmount').value),date=$('#ledgerDate').value;if(!isFinite(amount)||amount<=0||!date){toast('请填写正确的金额和日期。');return;}var list=manageList(K_LEDGER),item={id:editing||uid(),type:$('#ledgerType').value,amount:Math.round(amount*100)/100,date:date,category:$('#ledgerCategory').value,note:$('#ledgerNote').value.trim(),createdAt:current?current.createdAt:Date.now()},idx=list.findIndex(function(x){return x.id===editing;});if(idx>=0)list[idx]=item;else list.unshift(item);if(manageSave(K_LEDGER,list)){month=date.slice(0,7);editing='';render();toast('账目已保存。');}};
    }
    render();
  }

  function viewHealth(){
    var editing='';
    function render(){
      var all=manageList(K_HEALTH).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'');});
      var current=all.find(function(x){return x.id===editing;});
      var latest=all[0];
      var html='<div class="planner-intro"><p class="lead">只做个人日常记录，不代替专业诊断。你可以按自己的习惯记录睡眠、饮水、活动和身体感受。</p><div class="planner-stat"><strong>'+all.length+'</strong><span>条记录</span></div></div>'+
        (latest?'<div class="health-latest"><small>最近一次记录 · '+esc(latest.date)+'</small><div><span>睡眠 <strong>'+(latest.sleep||'—')+'</strong> 小时</span><span>饮水 <strong>'+(latest.water||'—')+'</strong> ml</span><span>体重 <strong>'+(latest.weight||'—')+'</strong> kg</span></div></div>':'')+
        '<div class="planner-toolbar"><button class="ghost solid" id="healthNew" type="button">＋ 记录今天</button></div>'+
        '<form class="planner-form" id="healthForm" '+(editing?'':'hidden')+'><strong>'+(editing?'修改健康记录':'新增健康记录')+'</strong><label>日期<input id="healthDate" type="date" required value="'+esc(current?current.date:today())+'"></label><div class="planner-fields"><label>睡眠（小时）<input id="healthSleep" type="number" min="0" max="24" step="0.1" value="'+esc(current?current.sleep:'')+'" placeholder="例如 7.5"></label><label>饮水（毫升）<input id="healthWater" type="number" min="0" max="10000" step="50" value="'+esc(current?current.water:'')+'" placeholder="例如 1500"></label></div><div class="planner-fields"><label>体重（kg，可选）<input id="healthWeight" type="number" min="0" max="500" step="0.1" value="'+esc(current?current.weight:'')+'"></label><label>活动情况<select id="healthActivity"><option value="" '+(!current||!current.activity?'selected':'')+'>未记录</option><option value="休息" '+(current&&current.activity==='休息'?'selected':'')+'>休息</option><option value="散步" '+(current&&current.activity==='散步'?'selected':'')+'>散步</option><option value="运动" '+(current&&current.activity==='运动'?'selected':'')+'>运动</option><option value="拉伸" '+(current&&current.activity==='拉伸'?'selected':'')+'>拉伸</option></select></label></div><textarea id="healthNote" rows="3" placeholder="身体感受或备注（可选）">'+esc(current?current.note:'')+'</textarea><div class="planner-form-actions"><button class="ghost solid" type="submit">保存记录</button><button class="ghost" type="button" id="healthCancel">取消</button></div></form>'+
        (all.length?'<div class="health-history">'+all.map(function(x){return '<article class="health-row"><time>'+esc(x.date)+'</time><div class="health-metrics">'+(x.sleep?'<span>睡眠 '+esc(x.sleep)+'h</span>':'')+(x.water?'<span>饮水 '+esc(x.water)+'ml</span>':'')+(x.weight?'<span>体重 '+esc(x.weight)+'kg</span>':'')+(x.activity?'<span>'+esc(x.activity)+'</span>':'')+'</div>'+(x.note?'<p>'+esc(x.note)+'</p>':'')+'<div class="planner-item-actions"><button class="mini" type="button" data-health-edit="'+esc(x.id)+'">编辑</button><button class="mini danger" type="button" data-health-delete="'+esc(x.id)+'">删除</button></div></article>';}).join('')+'</div>':'<div class="blank">还没有健康记录。你可以从今天开始，按自己的节奏记录。</div>');
      openView('健康','Health',html);var body=$('#viewBody');
      body.onclick=function(ev){
        if(ev.target.id==='healthNew'){editing='';render();$('#healthForm').hidden=false;$('#healthForm').scrollIntoView({behavior:'smooth',block:'nearest'});return;}
        if(ev.target.id==='healthCancel'){editing='';render();return;}
        var edit=ev.target.closest('[data-health-edit]');if(edit){editing=edit.getAttribute('data-health-edit');render();$('#healthForm').hidden=false;return;}
        var del=ev.target.closest('[data-health-delete]');if(del&&confirm('删除这条健康记录？')){manageSave(K_HEALTH,manageList(K_HEALTH).filter(function(x){return x.id!==del.getAttribute('data-health-delete');}));editing='';render();}
      };
      body.onsubmit=function(ev){if(ev.target.id!=='healthForm')return;ev.preventDefault();var date=$('#healthDate').value;if(!date){toast('请选择日期。');return;}var list=manageList(K_HEALTH),item={id:editing||uid(),date:date,sleep:$('#healthSleep').value,water:$('#healthWater').value,weight:$('#healthWeight').value,activity:$('#healthActivity').value,note:$('#healthNote').value.trim(),updatedAt:Date.now()},idx=list.findIndex(function(x){return x.id===editing;});if(idx>=0)list[idx]=item;else list.unshift(item);if(manageSave(K_HEALTH,list)){editing='';render();toast('健康记录已保存。');}};
    }
    render();
  }

  function viewPeriod(){
    var data=Object.assign({cycleLength:28,periodLength:5,lastStart:'',starts:[]},LS.get(K_PERIOD,{}));
    if(!Array.isArray(data.starts))data.starts=[];
    function nextDate(){if(!data.lastStart)return '';var d=new Date(data.lastStart+'T12:00:00');d.setDate(d.getDate()+Number(data.cycleLength||28));return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());}
    function render(){
      var next=nextDate(),gap=next?Math.round((new Date(next+'T00:00:00')-new Date(today()+'T00:00:00'))/86400000):null;
      var html='<div class="planner-intro"><p class="lead">记录周期和身体感受。预测日期只是按你填写的平均周期估算，不代表确定的生理时间。</p><div class="planner-stat"><strong>'+data.starts.length+'</strong><span>次记录</span></div></div>'+
        '<section class="period-summary"><small>下次日期估算</small><strong>'+(next||'尚未记录')+'</strong><span>'+(gap===null?'先记录一次开始日期':gap>0?'按当前周期估算还有 '+gap+' 天':gap===0?'按当前周期估算为今天':'估算日期已过 '+Math.abs(gap)+' 天')+'</span></section>'+
        '<form class="planner-form" id="periodSettings"><strong>周期设置</strong><div class="planner-fields"><label>平均周期（天）<input id="periodCycle" type="number" min="15" max="60" value="'+esc(data.cycleLength)+'"></label><label>经期时长（天）<input id="periodLength" type="number" min="1" max="15" value="'+esc(data.periodLength)+'"></label></div><button class="ghost solid" type="submit">保存周期设置</button></form>'+
        '<form class="planner-form" id="periodLog"><strong>记录一次开始日期</strong><label>开始日期<input id="periodStart" type="date" value="'+today()+'" required></label><input id="periodNote" maxlength="160" placeholder="备注（可选）"><div class="planner-form-actions"><button class="ghost solid" type="submit">保存记录</button></div></form>'+
        (data.starts.length?'<div class="period-history"><h3>历史记录</h3>'+data.starts.slice().sort(function(a,b){return b.date.localeCompare(a.date);}).map(function(x){return '<article class="period-row"><div><time>'+esc(x.date)+'</time>'+(x.note?'<p>'+esc(x.note)+'</p>':'')+'</div><button class="mini danger" type="button" data-period-delete="'+esc(x.id)+'">删除</button></article>';}).join('')+'</div>':'<div class="blank">还没有周期记录。保存一次开始日期后，就能看到基于平均周期的日期估算。</div>');
      openView('经期','Period',html);var body=$('#viewBody');
      body.onsubmit=function(ev){
        if(ev.target.id==='periodSettings'){ev.preventDefault();var c=parseInt($('#periodCycle').value,10),p=parseInt($('#periodLength').value,10);if(!Number.isFinite(c)||c<15||c>60||!Number.isFinite(p)||p<1||p>15){toast('请检查周期和时长范围。');return;}data.cycleLength=c;data.periodLength=p;if(LS.set(K_PERIOD,data)){render();toast('周期设置已保存。');}return;}
        if(ev.target.id==='periodLog'){ev.preventDefault();var date=$('#periodStart').value;if(!date){toast('请选择开始日期。');return;}data.starts.push({id:uid(),date:date,note:$('#periodNote').value.trim(),createdAt:Date.now()});data.lastStart=data.starts.slice().sort(function(a,b){return b.date.localeCompare(a.date);})[0].date;if(LS.set(K_PERIOD,data)){render();toast('周期记录已保存。');}}
      };
      body.onclick=function(ev){var del=ev.target.closest('[data-period-delete]');if(del&&confirm('删除这次周期记录？')){data.starts=data.starts.filter(function(x){return x.id!==del.getAttribute('data-period-delete');});data.lastStart=data.starts.slice().sort(function(a,b){return b.date.localeCompare(a.date);})[0]?.date||'';LS.set(K_PERIOD,data);render();}};
    }
    render();
  }

  function viewStudy(){
    var editing='',filter='all';
    function render(){
      var all=manageList(K_STUDY).slice().sort(function(a,b){return Number(!!a.done)-Number(!!b.done)||(a.date||'9999').localeCompare(b.date||'9999')||(b.createdAt||0)-(a.createdAt||0);});
      var done=all.filter(function(x){return x.done;}).length,current=all.find(function(x){return x.id===editing;});
      var shown=all.filter(function(x){return filter==='all'||(filter==='done'?x.done:!x.done);});
      var html='<div class="planner-intro"><p class="lead">把学习目标拆成一段段能完成的小任务。记录科目、日期和投入时间。</p><div class="planner-stat"><strong>'+done+'/'+all.length+'</strong><span>已完成</span></div></div>'+
        '<div class="todo-filters"><button type="button" data-study-filter="all" class="'+(filter==='all'?'active':'')+'">全部</button><button type="button" data-study-filter="open" class="'+(filter==='open'?'active':'')+'">进行中</button><button type="button" data-study-filter="done" class="'+(filter==='done'?'active':'')+'">已完成</button><button class="ghost solid" type="button" id="studyNew">＋ 学习任务</button></div>'+
        '<form class="planner-form" id="studyForm" '+(editing?'':'hidden')+'><strong>'+(editing?'修改任务':'新增学习任务')+'</strong><input id="studyTitle" maxlength="100" required value="'+esc(current?current.title:'')+'" placeholder="例如：复习英语单词"><div class="planner-fields"><label>科目<input id="studySubject" maxlength="50" value="'+esc(current?current.subject:'')+'" placeholder="科目 / 主题"></label><label>计划日期<input id="studyDate" type="date" value="'+esc(current?current.date:today())+'"></label></div><div class="planner-fields"><label>学习时长（分钟）<input id="studyMinutes" type="number" min="0" max="1440" step="5" value="'+esc(current?current.minutes:'')+'"></label><label>目标进度<select id="studyDone"><option value="0" '+(!current||!current.done?'selected':'')+'>进行中</option><option value="1" '+(current&&current.done?'selected':'')+'>已完成</option></select></label></div><textarea id="studyNote" rows="2" placeholder="笔记或下一步">'+esc(current?current.note:'')+'</textarea><div class="planner-form-actions"><button class="ghost solid" type="submit">保存任务</button><button class="ghost" type="button" id="studyCancel">取消</button></div></form>'+
        (shown.length?'<div class="study-list">'+shown.map(function(x){return '<article class="planner-item"><label class="todo-check"><input type="checkbox" data-study-check="'+esc(x.id)+'" '+(x.done?'checked':'')+'><span></span></label><div class="planner-item-main"><strong>'+esc(x.title)+'</strong><p>'+esc([x.subject,x.date,x.minutes?x.minutes+' 分钟':''].filter(Boolean).join(' · '))+'</p>'+(x.note?'<p>'+esc(x.note)+'</p>':'')+'</div><div class="planner-item-actions"><button class="mini" type="button" data-study-edit="'+esc(x.id)+'">编辑</button><button class="mini danger" type="button" data-study-delete="'+esc(x.id)+'">删除</button></div></article>';}).join('')+'</div>':'<div class="blank">还没有学习任务。先从一个小目标开始。</div>');
      openView('学习','Study',html);var body=$('#viewBody');
      body.onclick=function(ev){
        var f=ev.target.closest('[data-study-filter]');if(f){filter=f.getAttribute('data-study-filter');render();return;}
        if(ev.target.id==='studyNew'){editing='';render();$('#studyForm').hidden=false;$('#studyTitle').focus();return;}
        if(ev.target.id==='studyCancel'){editing='';render();return;}
        var edit=ev.target.closest('[data-study-edit]');if(edit){editing=edit.getAttribute('data-study-edit');render();$('#studyForm').hidden=false;return;}
        var del=ev.target.closest('[data-study-delete]');if(del&&confirm('删除这个学习任务？')){manageSave(K_STUDY,manageList(K_STUDY).filter(function(x){return x.id!==del.getAttribute('data-study-delete');}));editing='';render();}
      };
      body.onchange=function(ev){var check=ev.target.closest('[data-study-check]');if(!check)return;var list=manageList(K_STUDY),item=list.find(function(x){return x.id===check.getAttribute('data-study-check');});if(item){item.done=check.checked;manageSave(K_STUDY,list);render();}};
      body.onsubmit=function(ev){if(ev.target.id!=='studyForm')return;ev.preventDefault();var title=$('#studyTitle').value.trim();if(!title){toast('先写下学习任务。');return;}var list=manageList(K_STUDY),item={id:editing||uid(),title:title,subject:$('#studySubject').value.trim(),date:$('#studyDate').value,minutes:$('#studyMinutes').value,note:$('#studyNote').value.trim(),done:$('#studyDone').value==='1',createdAt:current?current.createdAt:Date.now()},idx=list.findIndex(function(x){return x.id===editing;});if(idx>=0)list[idx]=item;else list.unshift(item);if(manageSave(K_STUDY,list)){editing='';render();toast('学习任务已保存。');}};
    }
    render();
  }

  function viewClass(){
    var editing='';
    function render(){
      var all=manageList(K_CLASS).slice().sort(function(a,b){return Number(a.weekday)-Number(b.weekday)||(a.start||'').localeCompare(b.start||'');});
      var current=all.find(function(x){return x.id===editing;});
      var html='<div class="planner-intro"><p class="lead">把每周固定课程放在这里，按星期和上课时间排列。</p><div class="planner-stat"><strong>'+all.length+'</strong><span>门课程</span></div></div>'+
        '<div class="planner-toolbar"><button class="ghost solid" id="classNew" type="button">＋ 添加课程</button></div>'+
        '<form class="planner-form" id="classForm" '+(editing?'':'hidden')+'><strong>'+(editing?'修改课程':'新增课程')+'</strong><input id="className" maxlength="80" required value="'+esc(current?current.name:'')+'" placeholder="课程名称"><div class="planner-fields"><label>星期<select id="classDay">'+[1,2,3,4,5,6,7].map(function(n){return '<option value="'+n+'" '+(current&&Number(current.weekday)===n?'selected':'')+'>'+manageDayName(n)+'</option>';}).join('')+'</select></label><label>地点<input id="classPlace" maxlength="80" value="'+esc(current?current.place:'')+'" placeholder="教室 / 线上"></label></div><div class="planner-fields"><label>开始时间<input id="classStart" type="time" required value="'+esc(current?current.start:'08:00')+'"></label><label>结束时间<input id="classEnd" type="time" required value="'+esc(current?current.end:'09:00')+'"></label></div><input id="classTeacher" maxlength="60" value="'+esc(current?current.teacher:'')+'" placeholder="老师 / 备注（可选）"><div class="planner-form-actions"><button class="ghost solid" type="submit">保存课程</button><button class="ghost" type="button" id="classCancel">取消</button></div></form>'+
        (all.length?'<div class="class-week">'+[1,2,3,4,5,6,7].map(function(day){var rows=all.filter(function(x){return Number(x.weekday)===day;});return rows.length?'<section class="class-day"><h3>'+manageDayName(day)+'</h3>'+rows.map(function(x){return '<article class="class-row"><div class="class-time"><strong>'+esc(x.start)+'</strong><small>'+esc(x.end)+'</small></div><div class="class-copy"><strong>'+esc(x.name)+'</strong><p>'+esc([x.place,x.teacher].filter(Boolean).join(' · '))+'</p></div><div class="planner-item-actions"><button class="mini" type="button" data-class-edit="'+esc(x.id)+'">编辑</button><button class="mini danger" type="button" data-class-delete="'+esc(x.id)+'">删除</button></div></article>';}).join('')+'</section>':'';}).join('')+'</div>':'<div class="blank">课程表还空着。添加一门每周课程吧。</div>');
      openView('课程表','Class',html);var body=$('#viewBody');
      body.onclick=function(ev){
        if(ev.target.id==='classNew'){editing='';render();$('#classForm').hidden=false;$('#className').focus();return;}
        if(ev.target.id==='classCancel'){editing='';render();return;}
        var edit=ev.target.closest('[data-class-edit]');if(edit){editing=edit.getAttribute('data-class-edit');render();$('#classForm').hidden=false;return;}
        var del=ev.target.closest('[data-class-delete]');if(del&&confirm('删除这门课程？')){manageSave(K_CLASS,manageList(K_CLASS).filter(function(x){return x.id!==del.getAttribute('data-class-delete');}));editing='';render();}
      };
      body.onsubmit=function(ev){if(ev.target.id!=='classForm')return;ev.preventDefault();var name=$('#className').value.trim(),start=$('#classStart').value,end=$('#classEnd').value;if(!name||!start||!end||end<=start){toast('请检查课程名称和时间范围。');return;}var list=manageList(K_CLASS),item={id:editing||uid(),name:name,weekday:Number($('#classDay').value),place:$('#classPlace').value.trim(),start:start,end:end,teacher:$('#classTeacher').value.trim(),updatedAt:Date.now()},idx=list.findIndex(function(x){return x.id===editing;});if(idx>=0)list[idx]=item;else list.push(item);if(manageSave(K_CLASS,list)){editing='';render();toast('课程已保存。');}};
    }
    render();
  }


  /* ================= 休闲空间 · 音乐 / 游戏 / 窗廊 ================= */
  var K_MUSIC='liwu.music',K_GAMES='liwu.games',K_WINDOW='liwu.window',K_WINDOW_NOTES='liwu.window.notes';
  function viewMusic(){
    var editing='',active='';
    function render(){
      var all=manageList(K_MUSIC),current=all.find(function(x){return x.id===editing;}),playing=all.find(function(x){return x.id===active;});
      var html='<div class="planner-intro"><p class="lead">把想一起听的歌收在这里。添加可直接播放的音频链接，播放由浏览器原生播放器完成。</p><div class="planner-stat"><strong>'+all.length+'</strong><span>首收藏</span></div></div>'+
        '<div class="planner-toolbar"><button class="ghost solid" type="button" id="musicNew">＋ 添加音乐</button></div>'+
        '<form class="planner-form" id="musicForm" '+(editing?'':'hidden')+'><strong>'+(editing?'修改音乐':'添加一首歌')+'</strong><input id="musicTitle" maxlength="100" required value="'+esc(current?current.title:'')+'" placeholder="歌曲名称"><input id="musicArtist" maxlength="80" value="'+esc(current?current.artist:'')+'" placeholder="歌手 / 演奏者"><label class="field"><span>音频直链</span><input id="musicUrl" type="url" required value="'+esc(current?current.url:'')+'" placeholder="https://…/track.mp3"><em class="sub">填写浏览器可直接播放的音频文件地址，不是网页或视频页面链接。</em></label><textarea id="musicNote" rows="2" placeholder="想把这首歌留给哪个时刻？">'+esc(current?current.note:'')+'</textarea><div class="planner-form-actions"><button class="ghost solid" type="submit">保存歌曲</button><button class="ghost" type="button" id="musicCancel">取消</button></div></form>'+
        (playing?'<section class="music-now"><small>NOW PLAYING</small><strong>'+esc(playing.title)+'</strong><span>'+esc(playing.artist||'')+'</span><audio id="musicAudio" controls preload="none" src="'+esc(playing.url)+'"></audio></section>':'')+
        (all.length?'<div class="music-list">'+all.map(function(x,i){return '<article class="music-row"><span class="music-index">'+String(i+1).padStart(2,'0')+'</span><div class="music-copy"><strong>'+esc(x.title)+'</strong><small>'+esc(x.artist||'未填写歌手')+'</small>'+(x.note?'<p>'+esc(x.note)+'</p>':'')+'</div><div class="planner-item-actions"><button class="mini" type="button" data-music-play="'+esc(x.id)+'">播放</button><button class="mini" type="button" data-music-edit="'+esc(x.id)+'">编辑</button><button class="mini danger" type="button" data-music-delete="'+esc(x.id)+'">删除</button></div></article>';}).join('')+'</div>':'<div class="blank">播放列表还空着。先收下一首你喜欢的歌。</div>');
      openView('音乐','Music',html);var body=$('#viewBody');
      body.onclick=function(ev){
        if(ev.target.id==='musicNew'){editing='';render();$('#musicForm').hidden=false;$('#musicTitle').focus();return;}
        if(ev.target.id==='musicCancel'){editing='';render();return;}
        var play=ev.target.closest('[data-music-play]');if(play){active=play.getAttribute('data-music-play');render();var audio=$('#musicAudio');if(audio){var promise=audio.play();if(promise&&promise.catch)promise.catch(function(){toast('这条音频链接暂时无法播放，请检查地址或格式。');});}return;}
        var edit=ev.target.closest('[data-music-edit]');if(edit){editing=edit.getAttribute('data-music-edit');render();$('#musicForm').hidden=false;return;}
        var del=ev.target.closest('[data-music-delete]');if(del&&confirm('从播放列表移除这首歌？')){manageSave(K_MUSIC,manageList(K_MUSIC).filter(function(x){return x.id!==del.getAttribute('data-music-delete');}));if(active===del.getAttribute('data-music-delete'))active='';editing='';render();}
      };
      body.onsubmit=function(ev){if(ev.target.id!=='musicForm')return;ev.preventDefault();var title=$('#musicTitle').value.trim(),url=$('#musicUrl').value.trim();if(!title||!/^https?:\/\//i.test(url)){toast('请填写歌曲名称和有效的音频直链。');return;}var list=manageList(K_MUSIC),item={id:editing||uid(),title:title,artist:$('#musicArtist').value.trim(),url:url,note:$('#musicNote').value.trim(),createdAt:current?current.createdAt:Date.now()},idx=list.findIndex(function(x){return x.id===editing;});if(idx>=0)list[idx]=item;else list.push(item);if(manageSave(K_MUSIC,list)){editing='';render();toast('已加入播放列表。');}};
    }
    render();
  }

  function viewGame(){
    var history=manageList(K_GAMES),result='',questions=[
      '如果今天可以一起去一个地方，你想去哪里？','最近哪件小事让你觉得被理解？','如果把我们的日常拍成电影，今天会是什么镜头？',
      '你最想和对方一起学会什么？','最近想重复体验的一天是哪一天？','如果今晚只留一小时给彼此，你想怎么过？',
      '你觉得两个人最默契的一件小事是什么？','给下个月的我们留一句话吧。','最近有什么想做却一直没开始的小事？',
      '如果可以收藏今天的一个瞬间，你会选哪一刻？','你更想一起看海、看山，还是逛一条陌生的街？','最近最想听到的一句话是什么？',
      '如果一起做一道菜，会选什么？','你觉得家里最有安全感的角落在哪里？','下一次小小约会想安排什么？'
    ];
    function record(type,value){var list=manageList(K_GAMES);list.unshift({id:uid(),type:type,value:value,date:today(),createdAt:Date.now()});history=list.slice(0,50);manageSave(K_GAMES,history);}
    function render(){
      var html='<div class="planner-intro"><p class="lead">没有输赢压力的小玩法。随手掷一次、抛一次硬币，或者抽一道只属于你们的问题。</p><div class="planner-stat"><strong>'+history.length+'</strong><span>次游戏记录</span></div></div>'+
        '<div class="game-grid"><button class="game-tile" type="button" data-game="dice"><span class="game-symbol">⚄</span><strong>掷骰子</strong><small>看看今天的数字</small></button><button class="game-tile" type="button" data-game="coin"><span class="game-symbol">◐</span><strong>抛硬币</strong><small>让小决定交给运气</small></button><button class="game-tile" type="button" data-game="question"><span class="game-symbol">?</span><strong>默契问答</strong><small>抽一道问题聊聊</small></button></div>'+
        '<section class="game-result"><small>THIS ROUND</small><div id="gameResult">'+(result?esc(result):'选一个小游戏，开始这一回合。')+'</div><button class="ghost" type="button" id="gameAgain" '+(result?'':'hidden')+'>再来一次</button></section>'+
        (history.length?'<div class="game-history"><div class="planner-section-head"><div><small>RECENT</small><h3>最近玩过</h3></div><button class="mini danger" id="gameClear" type="button">清空记录</button></div>'+history.slice(0,12).map(function(x){return '<div class="game-history-row"><time>'+esc(x.date)+'</time><span>'+esc(x.type)+'</span><strong>'+esc(x.value)+'</strong></div>';}).join('')+'</div>':'');
      openView('游戏','Games',html);var body=$('#viewBody');
      body.onclick=function(ev){
        var play=ev.target.closest('[data-game]');if(play){var type=play.getAttribute('data-game'),value='';if(type==='dice')value='掷出了 '+(Math.floor(Math.random()*6)+1)+' 点';if(type==='coin')value=Math.random()<.5?'正面':'反面';if(type==='question')value=questions[Math.floor(Math.random()*questions.length)];result=value;record(type==='dice'?'掷骰子':type==='coin'?'抛硬币':'默契问答',value);render();return;}
        if(ev.target.id==='gameAgain'){var btn=$('[data-game="'+(history[0]&&history[0].type==='掷骰子'?'dice':history[0]&&history[0].type==='抛硬币'?'coin':'question')+'"]');if(btn)btn.click();return;}
        if(ev.target.id==='gameClear'&&confirm('清空游戏记录？')){history=[];manageSave(K_GAMES,history);result='';render();}
      };
    }
    render();
  }

  function viewWindow(){
    var scene=Object.assign({title:'窗边',description:'给今天留一扇窗。',image:''},LS.get(K_WINDOW,{}));
    var notes=manageList(K_WINDOW_NOTES),query='';
    function render(){
      var shown=notes.filter(function(x){return !query||[x.text,x.date].join(' ').toLowerCase().indexOf(query.toLowerCase())>=0;});
      var html='<div class="window-scene" '+(scene.image?'style="background-image:linear-gradient(180deg,rgba(20,30,42,.08),rgba(20,30,42,.48)),url('+JSON.stringify(scene.image)+')"':'')+'><div class="window-scene-copy"><small>THE WINDOW</small><h2>'+esc(scene.title)+'</h2><p>'+esc(scene.description)+'</p></div></div>'+
        '<form class="planner-form" id="windowSceneForm"><strong>窗外与窗边</strong><input id="windowTitle" maxlength="60" value="'+esc(scene.title)+'" placeholder="窗边标题"><textarea id="windowDescription" rows="2" placeholder="窗外是什么样子？">'+esc(scene.description)+'</textarea><label class="field"><span>窗外图片（可选）</span><input id="windowImage" type="file" accept="image/*"><em class="sub">图片会压缩后保存在本机，建议选择清晰但尺寸适中的照片。</em></label><div class="planner-form-actions"><button class="ghost solid" type="submit">保存窗景</button><button class="ghost" id="windowClearImage" type="button">移除图片</button></div></form>'+
        '<div class="collection-toolbar"><input id="windowSearch" type="search" placeholder="搜索窗边留言" value="'+esc(query)+'"><button class="ghost solid" id="windowNew" type="button">＋ 留一句话</button></div>'+
        '<form class="planner-form" id="windowNoteForm" hidden><strong>留在窗边的话</strong><input id="windowNoteDate" type="date" value="'+today()+'"><textarea id="windowNoteText" rows="3" placeholder="想在这里留下什么？"></textarea><div class="planner-form-actions"><button class="ghost solid" type="submit">保存留言</button><button class="ghost" id="windowNoteCancel" type="button">取消</button></div></form>'+
        (shown.length?'<div class="window-notes">'+shown.map(function(x){return '<article class="window-note"><time>'+esc(x.date)+'</time><p>'+esc(x.text)+'</p><button class="mini danger" type="button" data-window-delete="'+esc(x.id)+'">删除</button></article>';}).join('')+'</div>':'<div class="blank">窗边还没有留言。天气、心事或一句闲话，都可以放在这里。</div>');
      openView('窗廊','Window',html);var body=$('#viewBody');
      body.onclick=function(ev){
        if(ev.target.id==='windowClearImage'&&confirm('移除窗外图片？')){scene.image='';LS.set(K_WINDOW,scene);render();return;}
        if(ev.target.id==='windowNew'){$('#windowNoteForm').hidden=false;$('#windowNoteText').focus();return;}
        if(ev.target.id==='windowNoteCancel'){$('#windowNoteForm').hidden=true;return;}
        var del=ev.target.closest('[data-window-delete]');if(del&&confirm('删除这句留言？')){notes=notes.filter(function(x){return x.id!==del.getAttribute('data-window-delete');});manageSave(K_WINDOW_NOTES,notes);render();}
      };
      body.oninput=function(ev){if(ev.target.id==='windowSearch'){var pos=ev.target.selectionStart;query=ev.target.value;render();var el=$('#windowSearch');el.focus();try{el.setSelectionRange(pos,pos);}catch(_){}}};
      body.onchange=async function(ev){if(ev.target.id!=='windowImage')return;var file=ev.target.files&&ev.target.files[0];if(!file)return;try{scene.image=await compressAlbumImage(file);LS.set(K_WINDOW,scene);render();toast('窗外图片已更新。');}catch(e){toast('图片没能保存，请换一张小一些的图片。');}};
      body.onsubmit=function(ev){
        if(ev.target.id==='windowSceneForm'){ev.preventDefault();scene.title=$('#windowTitle').value.trim()||'窗边';scene.description=$('#windowDescription').value.trim();if(LS.set(K_WINDOW,scene)){render();toast('窗景已保存。');}return;}
        if(ev.target.id==='windowNoteForm'){ev.preventDefault();var text=$('#windowNoteText').value.trim();if(!text){toast('先写一句话吧。');return;}notes.unshift({id:uid(),date:$('#windowNoteDate').value||today(),text:text,createdAt:Date.now()});if(manageSave(K_WINDOW_NOTES,notes)){render();toast('留言留在窗边了。');}}
      };
    }
    render();
  }


  /* ================= 外观与数据入口 ================= */
  function viewSettingsSection(section,title,en){
    viewSettings();
    $('#viewTitle').textContent=title;
    $('#viewEn').textContent=en;
    var body=$('#viewBody'),inner=body.querySelector('.view-inner');
    Array.from(inner.children).forEach(function(node){
      if(node.classList&&node.classList.contains('group')){
        var h=node.querySelector('h3');node.hidden=!h||h.textContent.trim().indexOf(section)!==0;
      }else if(node.classList&&node.classList.contains('row')){node.hidden=false;}
      else if(node.classList&&node.classList.contains('tip')){node.hidden=true;}
    });
  }
  function applySavedWallpaper(){
    var src=LS.get('liwu.wallpaper',''),img=$('#homePhotoImg'),win=$('#homePhotoWindow');
    if(!img||!win)return;
    if(src){img.src=src;win.classList.add('has-photo');}
    else{img.removeAttribute('src');win.classList.remove('has-photo');}
  }
  function viewWallpaper(){
    var src=LS.get('liwu.wallpaper','');
    var html='<div class="planner-intro"><p class="lead">给首页的照片窗换一张图。图片压缩后保存在本机，刷新页面也会保留。</p></div>'+
      '<div class="wallpaper-preview" id="wallpaperPreview">'+(src?'<img src="'+esc(src)+'" alt="当前首页照片">':'<div><strong>首页照片窗</strong><small>还没有设置图片</small></div>')+'</div>'+
      '<div class="wallpaper-actions"><label class="ghost solid">选择照片<input id="wallpaperFile" type="file" accept="image/*" hidden></label><button class="ghost" id="wallpaperRemove" type="button" '+(src?'':'disabled')+'>移除照片</button></div>'+
      '<p class="tip">建议使用横向或方形图片。过大的图片会自动缩小并压缩。</p>';
    openView('壁纸','Wallpaper',html);
    var body=$('#viewBody');
    body.onchange=async function(ev){if(ev.target.id!=='wallpaperFile')return;var file=ev.target.files&&ev.target.files[0];if(!file)return;try{var data=await compressAlbumImage(file);if(LS.set('liwu.wallpaper',data)){applySavedWallpaper();viewWallpaper();toast('首页照片已保存。');}}catch(e){toast('图片保存失败，请换一张较小的图片。');}};
    body.onclick=function(ev){if(ev.target.id==='wallpaperRemove'&&confirm('移除首页照片？')){LS.set('liwu.wallpaper','');applySavedWallpaper();viewWallpaper();toast('首页照片已移除。');}};
  }


  /* ================= 扩展连接 · MCP 与插件清单 ================= */
  function viewMcp(){
    var key='liwu.mcp.servers',editing='';
    function render(){
      var all=manageList(key),current=all.find(function(x){return x.id===editing;});
      var html='<div class="planner-intro"><p class="lead">登记外部 MCP 服务地址与访问凭据，并可尝试发送初始化握手。浏览器跨域策略或服务端鉴权可能影响连接测试。</p><div class="planner-stat"><strong>'+all.length+'</strong><span>个服务</span></div></div>'+
        '<div class="planner-toolbar"><button class="ghost solid" id="mcpNew" type="button">＋ 添加 MCP 服务</button></div>'+
        '<form class="planner-form" id="mcpForm" '+(editing?'':'hidden')+'><strong>'+(editing?'修改服务':'添加 MCP 服务')+'</strong><input id="mcpName" maxlength="80" required value="'+esc(current?current.name:'')+'" placeholder="服务名称"><label class="field"><span>服务端点 URL</span><input id="mcpUrl" type="url" required value="'+esc(current?current.url:'')+'" placeholder="https://example.com/mcp"></label><div class="planner-fields"><label>传输方式<select id="mcpTransport"><option value="streamable">Streamable HTTP</option><option value="sse">SSE（兼容测试）</option></select></label><label>启用状态<select id="mcpEnabled"><option value="1">启用</option><option value="0">停用</option></select></label></div><label class="field"><span>Bearer Token（可选）</span><input id="mcpToken" type="password" autocomplete="off" value="'+esc(current?current.token:'')+'" placeholder="访问令牌"></label><textarea id="mcpNote" rows="2" placeholder="用途备注">'+esc(current?current.note:'')+'</textarea><div class="planner-form-actions"><button class="ghost solid" type="submit">保存服务</button><button class="ghost" type="button" id="mcpCancel">取消</button></div></form>'+
        (all.length?'<div class="integration-list">'+all.map(function(x){return '<article class="integration-card"><div class="integration-head"><div><strong>'+esc(x.name)+'</strong><small>'+esc(x.transport==='sse'?'SSE':'Streamable HTTP')+' · '+(x.enabled?'已启用':'已停用')+'</small></div><span class="integration-status '+(x.lastStatus==='ok'?'ok':x.lastStatus==='error'?'error':'')+'">'+(x.lastStatus==='ok'?'握手成功':x.lastStatus==='error'?'连接失败':'未测试')+'</span></div><p>'+esc(x.url)+'</p>'+(x.note?'<p>'+esc(x.note)+'</p>':'')+'<div class="planner-item-actions"><button class="mini" type="button" data-mcp-test="'+esc(x.id)+'">测试握手</button><button class="mini" type="button" data-mcp-edit="'+esc(x.id)+'">编辑</button><button class="mini danger" type="button" data-mcp-delete="'+esc(x.id)+'">删除</button></div>'+(x.lastMessage?'<small class="integration-last">'+esc(x.lastMessage)+'</small>':'')+(x.tools&&x.tools.length?'<div class="mcp-tool-list">'+x.tools.map(function(t,i){return '<div class="mcp-tool"><strong>'+esc(t.name)+'</strong><small>'+esc(t.description||'')+'</small><textarea rows="2" data-mcp-args="'+i+'">{}</textarea><button class="mini" type="button" data-mcp-call="'+esc(x.id)+'" data-tool-index="'+i+'">调用工具</button></div>';}).join('')+'</div>':'')+(x.lastToolResult?'<pre class="mcp-last-result">'+esc(x.lastToolResult)+'</pre>':'')+'</article>';}).join('')+'</div>':'<div class="blank">还没有登记 MCP 服务。</div>')+
        '<p class="tip">当前页面负责连接信息管理与初始化测试。连接成功并发现工具后，启用的 MCP 工具会提供给支持 function calling 的聊天模型；若模型或服务不支持工具调用，仍可在本页手动测试。</p>';
      openView('MCP','MCP',html);var body=$('#viewBody');
      body.onclick=async function(ev){
        if(ev.target.id==='mcpNew'){editing='';render();$('#mcpForm').hidden=false;$('#mcpName').focus();return;}
        if(ev.target.id==='mcpCancel'){editing='';render();return;}
        var edit=ev.target.closest('[data-mcp-edit]');if(edit){editing=edit.getAttribute('data-mcp-edit');render();$('#mcpForm').hidden=false;var selected=manageList(key).find(function(x){return x.id===editing;});$('#mcpTransport').value=selected&&selected.transport||'streamable';$('#mcpEnabled').value=selected&&selected.enabled===false?'0':'1';return;}
        var del=ev.target.closest('[data-mcp-delete]');if(del&&confirm('删除这个 MCP 服务？')){manageSave(key,manageList(key).filter(function(x){return x.id!==del.getAttribute('data-mcp-delete');}));editing='';render();return;}
        var test=ev.target.closest('[data-mcp-test]');if(test){var item=manageList(key).find(function(x){return x.id===test.getAttribute('data-mcp-test');});if(!item)return;test.disabled=true;test.textContent='测试中…';try{var headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'};if(item.token)headers.Authorization='Bearer '+item.token;var initRes=await fetch(item.url,{method:'POST',headers:headers,body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'LIWU',version:'1.0'}}})});if(!initRes.ok)throw new Error('初始化 HTTP '+initRes.status);var initText=await initRes.text(),initJson;try{initJson=JSON.parse(initText);}catch(_){var initLine=initText.split(/\r?\n/).filter(function(x){return x.indexOf('data:')===0;}).pop();initJson=initLine?JSON.parse(initLine.slice(5).trim()):{};}var sessionId=initRes.headers&&initRes.headers.get('Mcp-Session-Id')||'';var notifyHeaders=Object.assign({},headers);if(sessionId)notifyHeaders['Mcp-Session-Id']=sessionId;notifyHeaders['MCP-Protocol-Version']='2025-03-26';try{await fetch(item.url,{method:'POST',headers:notifyHeaders,body:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})});}catch(_){}var listRes=await fetch(item.url,{method:'POST',headers:notifyHeaders,body:JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/list',params:{}})});if(!listRes.ok)throw new Error('tools/list HTTP '+listRes.status);var listText=await listRes.text(),listJson;try{listJson=JSON.parse(listText);}catch(_){var line=listText.split(/\r?\n/).filter(function(x){return x.indexOf('data:')===0;}).pop();listJson=line?JSON.parse(line.slice(5).trim()):{};}var tools=listJson&&listJson.result&&Array.isArray(listJson.result.tools)?listJson.result.tools:[];var all=manageList(key);all=all.map(function(x){return x.id===item.id?Object.assign({},x,{lastStatus:'ok',lastMessage:'初始化成功，发现 '+tools.length+' 个工具',sessionId:sessionId,protocolVersion:'2025-03-26',tools:tools,lastTestAt:Date.now()}):x;});manageSave(key,all);render();toast('MCP 初始化成功，发现 '+tools.length+' 个工具。');}catch(err){var all=manageList(key);all=all.map(function(x){return x.id===item.id?Object.assign({},x,{lastStatus:'error',lastMessage:String(err.message||err).slice(0,140),lastTestAt:Date.now()}):x;});manageSave(key,all);render();toast('MCP 连接失败，请检查端点、权限或跨域设置。');}return;}
        var call=ev.target.closest('[data-mcp-call]');if(call){var server=manageList(key).find(function(x){return x.id===call.getAttribute('data-mcp-call');});var index=Number(call.getAttribute('data-tool-index'));var tool=server&&server.tools&&server.tools[index];var argsBox=Array.from(body.querySelectorAll('[data-mcp-args]')).find(function(x){return Number(x.getAttribute('data-mcp-args'))===index;});if(!server||!tool||!argsBox)return;var args;try{args=JSON.parse(argsBox.value||'{}');}catch(_){toast('工具参数必须是有效 JSON。');return;}call.disabled=true;call.textContent='调用中…';try{var headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream','MCP-Protocol-Version':server.protocolVersion||'2025-03-26'};if(server.token)headers.Authorization='Bearer '+server.token;if(server.sessionId)headers['Mcp-Session-Id']=server.sessionId;var res=await fetch(server.url,{method:'POST',headers:headers,body:JSON.stringify({jsonrpc:'2.0',id:Date.now(),method:'tools/call',params:{name:tool.name,arguments:args}})});var text=await res.text(),payload;try{payload=JSON.parse(text);}catch(_){var line=text.split(/\r?\n/).filter(function(x){return x.indexOf('data:')===0;}).pop();payload=line?JSON.parse(line.slice(5).trim()):{raw:text};}if(!res.ok)throw new Error('HTTP '+res.status+' '+text.slice(0,150));var result=JSON.stringify(payload.result||payload,null,2);var all=manageList(key);all=all.map(function(x){return x.id===server.id?Object.assign({},x,{lastToolResult:result.slice(0,1800)}):x;});manageSave(key,all);render();toast('工具调用完成。');}catch(err){call.disabled=false;call.textContent='调用工具';toast('工具调用失败：'+String(err.message||err));}return;}
      };
      body.onsubmit=function(ev){if(ev.target.id!=='mcpForm')return;ev.preventDefault();var name=$('#mcpName').value.trim(),url=$('#mcpUrl').value.trim();if(!name||!/^https?:\/\//i.test(url)){toast('请填写名称和有效的 http(s) 地址。');return;}var list=manageList(key),item={id:editing||uid(),name:name,url:url,transport:$('#mcpTransport').value,enabled:$('#mcpEnabled').value==='1',token:$('#mcpToken').value.trim(),note:$('#mcpNote').value.trim(),createdAt:current?current.createdAt:Date.now()},idx=list.findIndex(function(x){return x.id===editing;});if(idx>=0)list[idx]=Object.assign({},list[idx],item);else list.push(item);if(manageSave(key,list)){editing='';render();toast('MCP 服务信息已保存。');}};
    }
    render();
  }
  function viewPlugins(){
    var key='liwu.plugins',editing='';
    function render(){
      var all=manageList(key),current=all.find(function(x){return x.id===editing;});
      var html='<div class="planner-intro"><p class="lead">管理里屋的扩展工具。启用且填写服务地址的插件会作为函数工具提供给支持 function calling 的聊天模型；服务端跨域和权限仍需正确配置。</p><div class="planner-stat"><strong>'+all.filter(function(x){return x.enabled;}).length+'/'+all.length+'</strong><span>已启用</span></div></div>'+
        '<div class="planner-toolbar"><button class="ghost solid" id="pluginNew" type="button">＋ 添加插件</button></div>'+
        '<form class="planner-form" id="pluginForm" '+(editing?'':'hidden')+'><strong>'+(editing?'修改插件':'添加插件')+'</strong><input id="pluginName" maxlength="80" required value="'+esc(current?current.name:'')+'" placeholder="插件名称"><div class="planner-fields"><label>分类<select id="pluginCategory"><option>效率</option><option>创作</option><option>生活</option><option>媒体</option><option>其他</option></select></label><label>状态<select id="pluginEnabled"><option value="1">启用</option><option value="0">停用</option></select></label></div><input id="pluginEndpoint" type="url" value="'+esc(current?current.endpoint:'')+'" placeholder="服务地址（可选）"><div class="planner-fields"><label>请求方式<select id="pluginMethod"><option>POST</option><option>GET</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select></label><label>Bearer Token<input id="pluginToken" type="password" value="'+esc(current?current.token:'')+'" placeholder="可选"></label></div><label>自定义请求头 JSON（可选）<textarea id="pluginHeaders" rows="2">'+esc(current?current.headers:'')+'</textarea></label><label>参数 JSON Schema（可选）<textarea id="pluginSchema" rows="4" placeholder=\'{"type":"object","properties":{"query":{"type":"string"}}}\'>'+esc(current?current.inputSchema:'')+'</textarea></label><textarea id="pluginDescription" rows="3" placeholder="功能说明与使用方式">'+esc(current?current.description:'')+'</textarea><div class="planner-form-actions"><button class="ghost solid" type="submit">保存插件</button><button class="ghost" id="pluginCancel" type="button">取消</button></div></form>'+
        (all.length?'<div class="integration-list">'+all.map(function(x){return '<article class="integration-card"><div class="integration-head"><div><strong>'+esc(x.name)+'</strong><small>'+esc(x.category||'其他')+'</small></div><span class="integration-status '+(x.enabled?'ok':'')+'">'+(x.enabled?'已启用':'已停用')+'</span></div><p>'+esc(x.description||'暂无说明')+'</p>'+(x.endpoint?'<p>'+esc(x.endpoint)+'</p>':'')+'<div class="planner-item-actions"><button class="mini" type="button" data-plugin-toggle="'+esc(x.id)+'">'+(x.enabled?'停用':'启用')+'</button><button class="mini" type="button" data-plugin-edit="'+esc(x.id)+'">编辑</button><button class="mini danger" type="button" data-plugin-delete="'+esc(x.id)+'">删除</button></div></article>';}).join('')+'</div>':'<div class="blank">插件清单还空着。可以先登记你准备接入的扩展。</div>');
      openView('插件','Plugins',html);var body=$('#viewBody');
      body.onclick=function(ev){
        if(ev.target.id==='pluginNew'){editing='';render();$('#pluginForm').hidden=false;$('#pluginName').focus();return;}
        if(ev.target.id==='pluginCancel'){editing='';render();return;}
        var edit=ev.target.closest('[data-plugin-edit]');if(edit){editing=edit.getAttribute('data-plugin-edit');render();$('#pluginForm').hidden=false;var selected=manageList(key).find(function(x){return x.id===editing;});$('#pluginCategory').value=selected&&selected.category||'其他';$('#pluginEnabled').value=selected&&selected.enabled?'1':'0';$('#pluginMethod').value=selected&&selected.method||'POST';return;}
        var toggle=ev.target.closest('[data-plugin-toggle]');if(toggle){var list=manageList(key),item=list.find(function(x){return x.id===toggle.getAttribute('data-plugin-toggle');});if(item){item.enabled=!item.enabled;manageSave(key,list);render();}return;}
        var del=ev.target.closest('[data-plugin-delete]');if(del&&confirm('删除这个插件配置？')){manageSave(key,manageList(key).filter(function(x){return x.id!==del.getAttribute('data-plugin-delete');}));editing='';render();}
      };
      body.onsubmit=function(ev){if(ev.target.id!=='pluginForm')return;ev.preventDefault();var name=$('#pluginName').value.trim();if(!name){toast('请填写插件名称。');return;}var headers=$('#pluginHeaders').value.trim(),schema=$('#pluginSchema').value.trim();if(headers){try{var h=JSON.parse(headers);if(!h||typeof h!=='object'||Array.isArray(h))throw 0;}catch(e){toast('自定义请求头不是有效 JSON。');return;}}if(schema){try{var s=JSON.parse(schema);if(!s||typeof s!=='object'||Array.isArray(s))throw 0;}catch(e){toast('参数 JSON Schema 格式不正确。');return;}}var list=manageList(key),item={id:editing||uid(),name:name,category:$('#pluginCategory').value,enabled:$('#pluginEnabled').value==='1',endpoint:$('#pluginEndpoint').value.trim(),method:$('#pluginMethod').value,token:$('#pluginToken').value.trim(),headers:headers,inputSchema:schema,description:$('#pluginDescription').value.trim(),createdAt:current?current.createdAt:Date.now()},idx=list.findIndex(function(x){return x.id===editing;});if(idx>=0)list[idx]=item;else list.push(item);if(manageSave(key,list)){editing='';render();toast('插件配置已保存。');}};
    }
    render();
  }


  /* ================= 生图室与主动生图 ================= */
  var K_IMAGE_CFG='liwu.imageStudio.config',K_IMAGE_GALLERY='liwu.imageStudio.gallery',K_PROACTIVE='liwu.proactiveImage';
  function imageConfig(){return Object.assign({base:'https://api.openai.com/v1',key:'',model:'gpt-image-1',size:'1024x1024',headers:''},LS.get(K_IMAGE_CFG,{}));}
  function imageGallery(){var a=LS.get(K_IMAGE_GALLERY,[]);return Array.isArray(a)?a:[];}
  function proactiveConfig(){return Object.assign({enabled:false,mode:'keywords',keywords:'想你,晚安,下雨,旅行,约会,想看你,拍照',minMatches:1,cooldown:12,dailyLimit:1,monthlyLimit:6,prompt:''},LS.get(K_PROACTIVE,{}));}
  function compressImageDataUrl(src){return new Promise(function(resolve,reject){var im=new Image();im.onload=function(){try{var sc=Math.min(1,1024/Math.max(im.naturalWidth||im.width,im.naturalHeight||im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round((im.naturalWidth||im.width)*sc));c.height=Math.max(1,Math.round((im.naturalHeight||im.height)*sc));c.getContext('2d').drawImage(im,0,0,c.width,c.height);var q=.82,out=c.toDataURL('image/jpeg',q);while(out.length>850000&&q>.5){q-=.1;out=c.toDataURL('image/jpeg',q);}resolve(out);}catch(e){reject(e);}};im.onerror=function(){reject(new Error('图片解码失败'));};im.src=src;});}
  async function generateStudioImage(prompt,kind,referenceFile){
    var cfg=imageConfig();if(!cfg.base||!cfg.key||!cfg.model)throw new Error('请先填写生图接口地址、Key 和模型。');
    var base=cfg.base.trim().replace(/\/+$/,''),isEdit=!!referenceFile;
    var url=/\/images\/(generations|edits)$/i.test(base)?base:base+(isEdit?'/images/edits':'/images/generations');
    var custom={};if(cfg.headers){custom=JSON.parse(cfg.headers);if(!custom||typeof custom!=='object'||Array.isArray(custom))throw new Error('自定义请求头必须是 JSON 对象。');}
    var headers={'Authorization':'Bearer '+cfg.key},res;
    if(isEdit){
      var form=new FormData();form.append('model',cfg.model);form.append('prompt',prompt);form.append('size',cfg.size||'1024x1024');form.append('image',referenceFile,referenceFile.name||'reference.png');
      Object.keys(custom).forEach(function(k){if(k.toLowerCase()!=='content-type')headers[k]=String(custom[k]);});
      res=await fetch(url,{method:'POST',headers:headers,body:form});
    }else{
      headers['Content-Type']='application/json';Object.keys(custom).forEach(function(k){headers[k]=String(custom[k]);});
      var body={model:cfg.model,prompt:prompt,size:cfg.size||'1024x1024',n:1};if(/^dall-e/i.test(cfg.model))body.response_format='b64_json';
      res=await fetch(url,{method:'POST',headers:headers,body:JSON.stringify(body)});
    }
    if(!res.ok)throw new Error('生图接口返回 '+res.status+'：'+(await res.text()).slice(0,160));
    var json=await res.json(),data=json&&json.data&&json.data[0];if(!data)throw new Error('接口没有返回图片数据。');
    var src=data.b64_json?await compressImageDataUrl('data:image/png;base64,'+data.b64_json):(data.url||'');if(!src)throw new Error('返回结果里没有图片地址。');
    var all=imageGallery(),item={id:uid(),prompt:prompt,src:src,kind:kind||'manual',date:today(),createdAt:Date.now(),pinned:false};
    var pinned=all.filter(function(x){return x.pinned;}),recent=all.filter(function(x){return !x.pinned;});
    all=[item].concat(recent.slice(0,4),pinned);
    if(!LS.set(K_IMAGE_GALLERY,all))throw new Error('本机空间不足，图片未能保存。请先导出备份或整理未锁定作品。');return item;
  }
  function viewImageStudio(){
    var cfg=imageConfig();
    function render(){
      cfg=imageConfig();var all=imageGallery();
      var html='<div class="planner-intro"><p class="lead">配置独立的图像 API，写下画面描述。作品会压缩后保存在本机。</p><div class="planner-stat"><strong>'+all.length+'</strong><span>张作品</span></div></div>'+
      '<form class="planner-form" id="imageConfigForm"><strong>图像 API</strong><label>接口地址<input id="imageBase" value="'+esc(cfg.base)+'"></label><label>API Key<input id="imageKey" type="password" value="'+esc(cfg.key)+'"></label><div class="planner-fields"><label>模型<input id="imageModel" value="'+esc(cfg.model)+'"></label><label>尺寸<select id="imageSize"><option value="1024x1024">1024 × 1024</option><option value="1536x1024">1536 × 1024</option><option value="1024x1536">1024 × 1536</option></select></label></div><label>自定义请求头 JSON（可选）<textarea id="imageHeaders" rows="3">'+esc(cfg.headers)+'</textarea></label><button class="ghost solid" type="submit">保存接口设置</button></form>'+
      '<form class="image-prompt-form" id="imagePromptForm"><strong>生成或编辑一张图片</strong><textarea id="imagePrompt" rows="5" placeholder="描述人物、动作、场景、光线和氛围…"></textarea><label class="field"><span>参考图（可选）</span><input id="imageReference" type="file" accept="image/*"><em class="sub">选择参考图后会调用 images/edits；不选则调用 images/generations。</em></label><div class="image-prompt-foot"><small>已确认的人设外观描述会自动附加。</small><button class="ghost solid" type="submit">生成图片</button></div><p class="tip" id="imageStatus"></p></form>'+
      '<div class="planner-section-head"><div><small>GALLERY</small><h3>作品集</h3></div><span class="tip">最近 4 张</span></div>'+
      (all.length?'<div class="image-gallery">'+all.map(function(x){return '<article class="image-work"><img src="'+esc(x.src)+'" alt="生成作品"><div class="image-work-copy"><small>'+esc(x.date)+(x.kind==='proactive'?' · 主动生成':' · 手动生成')+'</small><p>'+esc(x.prompt)+'</p></div><div class="planner-item-actions"><button class="mini" type="button" data-image-pin="'+esc(x.id)+'">'+(x.pinned?'取消锁定':'锁定记忆')+'</button><button class="mini danger" type="button" data-image-delete="'+esc(x.id)+'">删除</button></div></article>';}).join('')+'</div>':'<div class="blank">作品集还空着。第一次生成后，图片会保存在本机。</div>');
      openView('生图室','Image Studio',html);$('#imageSize').value=cfg.size||'1024x1024';var body=$('#viewBody');
      body.onclick=function(ev){var pin=ev.target.closest('[data-image-pin]');if(pin){var list=imageGallery(),x=list.find(function(a){return a.id===pin.getAttribute('data-image-pin');});if(x){x.pinned=!x.pinned;LS.set(K_IMAGE_GALLERY,list);render();}return;}var del=ev.target.closest('[data-image-delete]');if(del&&confirm('删除这张作品？')){LS.set(K_IMAGE_GALLERY,imageGallery().filter(function(x){return x.id!==del.getAttribute('data-image-delete');}));render();}};
      body.onsubmit=async function(ev){
        if(ev.target.id==='imageConfigForm'){ev.preventDefault();var next={base:$('#imageBase').value.trim(),key:$('#imageKey').value.trim(),model:$('#imageModel').value.trim(),size:$('#imageSize').value,headers:$('#imageHeaders').value.trim()};if(next.headers){try{var obj=JSON.parse(next.headers);if(!obj||typeof obj!=='object'||Array.isArray(obj))throw 0;}catch(e){toast('自定义请求头不是有效 JSON。');return;}}if(LS.set(K_IMAGE_CFG,next))toast('图像 API 设置已保存。');return;}
        if(ev.target.id==='imagePromptForm'){ev.preventDefault();var prompt=$('#imagePrompt').value.trim();if(!prompt){toast('先描述你想生成的画面。');return;}var profile=profileData();if(profile.appearanceConfirmed&&profile.appearance)prompt+='\\n\\nCharacter appearance reference: '+profile.appearance;var status=$('#imageStatus'),btn=ev.target.querySelector('button[type=submit]');btn.disabled=true;status.textContent='正在生成，稍等一会儿…';try{var reference=$('#imageReference').files&&$('#imageReference').files[0];await generateStudioImage(prompt,'manual',reference);render();toast(reference?'参考图编辑完成并保存好了。':'图片生成并保存好了。');}catch(err){status.textContent=String(err.message||err);btn.disabled=false;toast('生成失败，请检查接口设置。');}}
      };
    }
    render();
  }
  function viewProactiveImage(){
    var cfg=proactiveConfig(),profile=profileData();
    function render(){
      cfg=proactiveConfig();profile=profileData();var gallery=imageGallery(),confirmed=!!(profile.appearanceConfirmed&&profile.appearance);
      var todayCount=gallery.filter(function(x){return x.kind==='proactive'&&x.date===today();}).length,monthCount=gallery.filter(function(x){return x.kind==='proactive'&&(x.date||'').slice(0,7)===today().slice(0,7);}).length;
      var html='<div class="planner-intro"><p class="lead">默认关闭。确认宋祁的外观描述后，才允许它在聊天中按规则主动生成画面。</p></div><div class="proactive-status"><strong>'+(cfg.enabled&&confirmed?'主动生图已开启':'主动生图未开启')+'</strong><small>今日 '+todayCount+'/'+cfg.dailyLimit+' 张 · 本月 '+monthCount+'/'+cfg.monthlyLimit+' 张</small></div>'+
      (!confirmed?'<div class="proactive-warning">先到「人设档案」填写外观描述，并勾选确认。</div>':'')+
      '<form class="planner-form" id="proactiveForm"><strong>触发与频率</strong><label class="worldbook-switch"><input id="proactiveEnabled" type="checkbox" '+(cfg.enabled?'checked':'')+' '+(!confirmed?'disabled':'')+'> 开启聊天情境主动生图</label><label>触发方式<select id="proactiveMode"><option value="keywords" '+(cfg.mode==='keywords'?'selected':'')+'>命中关键词时</option><option value="all" '+(cfg.mode==='all'?'selected':'')+'>每次回复后都判断</option></select></label><label>触发关键词<input id="proactiveKeywords" value="'+esc(cfg.keywords)+'"></label><label>触发阈值（命中关键词数）<input id="proactiveMinMatches" type="number" min="1" max="10" value="'+esc(cfg.minMatches)+'"></label><div class="planner-fields"><label>冷却时间（小时）<input id="proactiveCooldown" type="number" min="1" max="168" value="'+esc(cfg.cooldown)+'"></label><label>每日上限<input id="proactiveDaily" type="number" min="0" max="5" value="'+esc(cfg.dailyLimit)+'"></label></div><label>每月上限<input id="proactiveMonthly" type="number" min="0" max="30" value="'+esc(cfg.monthlyLimit)+'"></label><label>画面偏好<textarea id="proactivePrompt" rows="3">'+esc(cfg.prompt)+'</textarea></label><div class="planner-form-actions"><button class="ghost solid" type="submit">保存设置</button><button class="ghost" id="proactiveTest" type="button">测试生成一次</button></div></form><p class="tip">需要先在生图室配置图像 API。自动生成受每日、每月额度和冷却时间限制。</p>';
      openView('主动生图','Proactive Image',html);var body=$('#viewBody');
      body.onsubmit=function(ev){if(ev.target.id!=='proactiveForm')return;ev.preventDefault();var next={enabled:$('#proactiveEnabled').checked,mode:$('#proactiveMode').value,keywords:$('#proactiveKeywords').value.trim(),minMatches:Math.max(1,Math.min(10,Number($('#proactiveMinMatches').value)||1)),cooldown:Math.max(1,Math.min(168,Number($('#proactiveCooldown').value)||12)),dailyLimit:Math.max(0,Math.min(5,Number($('#proactiveDaily').value)||0)),monthlyLimit:Math.max(0,Math.min(30,Number($('#proactiveMonthly').value)||0)),prompt:$('#proactivePrompt').value.trim()};if(next.enabled&&!confirmed){toast('请先确认外观描述。');return;}if(next.enabled&&(!imageConfig().base||!imageConfig().key||!imageConfig().model)){toast('请先配置生图室 API。');return;}if(LS.set(K_PROACTIVE,next)){toast('主动生图设置已保存。');render();}};
      body.onclick=async function(ev){if(ev.target.id!=='proactiveTest')return;var s=cur(),last=s&&s.messages.slice().reverse().find(function(m){return m.role==='user';});if(!last){toast('先去聊天说一句，再回来测试。');return;}try{await generateStudioImage('Create a natural companion image inspired by this conversation. Appearance: '+profile.appearance+'\\nConversation: '+last.content+'\\n'+cfg.prompt,'proactive');toast('测试图片已生成。');}catch(e){toast('测试失败：'+String(e.message||e));}};
    }
    render();
  }
  var proactiveGenerating=false;
  async function maybeProactiveImage(session){
    if(proactiveGenerating)return;
    var cfg=proactiveConfig(),p=profileData(),api=imageConfig();if(!cfg.enabled||!p.appearanceConfirmed||!p.appearance||!api.base||!api.key||!api.model)return;
    var user=session.messages.slice().reverse().find(function(m){return m.role==='user';}),reply=session.messages.slice().reverse().find(function(m){return m.role==='assistant'&&m.content;});if(!user||!reply)return;
    var keys=String(cfg.keywords||'').split(/[,，\n]/).map(function(x){return x.trim().toLowerCase();}).filter(Boolean),hay=(user.content+' '+reply.content).toLowerCase();var matches=keys.filter(function(k){return hay.indexOf(k)>=0;}).length;if(cfg.mode!=='all'&&(!keys.length||matches<Number(cfg.minMatches||1)))return;
    var gallery=imageGallery(),month=today().slice(0,7),dayCount=gallery.filter(function(x){return x.kind==='proactive'&&x.date===today();}).length,monthCount=gallery.filter(function(x){return x.kind==='proactive'&&(x.date||'').slice(0,7)===month;}).length;if(dayCount>=Number(cfg.dailyLimit)||monthCount>=Number(cfg.monthlyLimit))return;
    var last=gallery.filter(function(x){return x.kind==='proactive';}).sort(function(a,b){return (b.createdAt||0)-(a.createdAt||0);})[0];if(last&&Date.now()-(last.createdAt||0)<Number(cfg.cooldown||12)*3600000)return;
    var prompt='Create a natural companion image inspired by this conversation. Preserve character appearance. Avoid text and watermarks.\\nAppearance: '+p.appearance+'\\nUser: '+user.content+'\\nReply: '+reply.content+'\\nStyle: '+(cfg.prompt||'a candid everyday moment, natural light');
    proactiveGenerating=true;
    try{var item=await generateStudioImage(prompt,'proactive');session.messages.push({role:'assistant',content:'我想把刚才这一刻留成一张画面。',image:item.src,kind:'proactive-image',at:Date.now()});session.updatedAt=Date.now();save();renderAll();toast('主动生图完成，已经放进聊天和作品集。');}catch(e){toast('主动生图暂时没成功：'+String(e.message||e));}finally{proactiveGenerating=false;}
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
    var editing='',query='';
    function render(){
      var seeds=(D.memory||[]).map(function(x){return Object.assign({local:false},x);});
      var local=LS.get(K_MEMORY,[]).map(function(x){return Object.assign({local:true},x);});
      var all=seeds.concat(local).sort(function(a,b){return (b.date||'').localeCompare(a.date||'');});
      var shown=all.filter(function(x){return !query||[x.title,x.body,x.date].join(' ').toLowerCase().indexOf(query.toLowerCase())>=0;});
      var current=local.find(function(x){return x.id===editing;});
      var html='<div class="room-intro"><p class="lead">把重要的事留在这里。原有记忆会保留，也可以继续添加自己的记录。</p><div class="room-stat"><strong>'+all.length+'</strong><span>段记忆</span></div></div>'+
        '<div class="diary-tools"><input id="memorySearch" type="search" placeholder="搜索记忆" value="'+esc(query)+'"><button class="ghost solid" id="memoryNew" type="button">＋ 新记忆</button></div>'+
        '<form class="compose diary-compose" id="memoryForm" '+(editing?'':'hidden')+'><div class="diary-compose-head"><strong>'+(editing?'修改记忆':'记下一段记忆')+'</strong><span>仅保存在本机</span></div><input id="memoryTitle" maxlength="80" placeholder="给这段记忆一个标题" value="'+esc(current?current.title:'')+'"><input id="memoryDate" type="date" value="'+esc(current?current.date:today())+'"><textarea id="memoryBody" rows="5" placeholder="这件事为什么值得记住？">'+esc(current?current.body:'')+'</textarea><div class="row"><button class="ghost solid" type="submit">保存记忆</button><button class="ghost" id="memoryCancel" type="button">取消</button></div></form>'+
        (shown.length?'<div class="memory-list">'+shown.map(function(x){return '<article class="item memory-entry"><div class="k"><h4>'+esc(x.title)+'</h4><time>'+esc(x.date||'')+'</time></div><p>'+esc(x.body||'')+'</p>'+(x.local?'<div class="diary-actions"><button class="mini" type="button" data-memory-edit="'+esc(x.id)+'">编辑</button><button class="mini danger" type="button" data-memory-delete="'+esc(x.id)+'">删除</button></div>':'<span class="diary-source">初始记忆</span>')+'</article>';}).join('')+'</div>':'<div class="blank">还没有找到记忆。</div>');
      openView('记忆','Memory',html);
      var body=$('#viewBody');
      body.onclick=function(ev){
        if(ev.target.closest('#memoryNew')){editing='';render();$('#memoryForm').hidden=false;$('#memoryTitle').focus();return;}
        if(ev.target.closest('#memoryCancel')){editing='';render();return;}
        var edit=ev.target.closest('[data-memory-edit]');if(edit){editing=edit.getAttribute('data-memory-edit');render();$('#memoryForm').hidden=false;$('#memoryTitle').focus();return;}
        var del=ev.target.closest('[data-memory-delete]');if(del&&confirm('删除这段记忆？')){LS.set(K_MEMORY,LS.get(K_MEMORY,[]).filter(function(x){return x.id!==del.getAttribute('data-memory-delete');}));editing='';render();toast('记忆已删除。');}
      };
      body.oninput=function(ev){if(ev.target.id==='memorySearch'){var pos=ev.target.selectionStart;query=ev.target.value;render();var el=$('#memorySearch');el.focus();try{el.setSelectionRange(pos,pos);}catch(_){}}};
      body.onsubmit=function(ev){if(ev.target.id!=='memoryForm')return;ev.preventDefault();var title=$('#memoryTitle').value.trim(),bodyText=$('#memoryBody').value.trim();if(!title||!bodyText){toast('标题和内容都要写一点。');return;}var list=LS.get(K_MEMORY,[]),item={id:editing||uid(),title:title,date:$('#memoryDate').value||today(),body:bodyText,updatedAt:Date.now()},idx=list.findIndex(function(x){return x.id===editing;});if(idx>=0)list[idx]=item;else list.unshift(item);if(LS.set(K_MEMORY,list)){editing='';render();toast('记忆收好了。');}};
    }
    render();
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
        '<p class="tip">导出 JSON 含会话、配置、日记、相册、记忆、收藏、语录、世界书、日历、安排、待办、倒计时、心情、账本、健康、经期、学习、课程表、音乐、游戏、窗廊、壁纸、人设、通知、生图作品和主动生图设置。Key 也在里面，别乱发。</p>' +
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
        var data = { v: 14, db: db, cfg: cfg, since: sinceValue(), diary: LS.get(K_DIARY, []), album: LS.get(K_ALBUM, []), memory: LS.get(K_MEMORY, []), worldbooks: LS.get(K_WORLDBOOKS, []), calendar: LS.get(PLANNER_KEYS.calendar, []), schedule: LS.get(PLANNER_KEYS.schedule, []), todo: LS.get(PLANNER_KEYS.todo, []), countdown: simpleList(K_COUNTDOWN), mood: simpleList(K_MOOD), moments: collectionList('liwu.moments'), quotes: collectionList('liwu.quotes'), favorites: collectionList('liwu.favorites'), profile: LS.get(K_PROFILE, {}), notices: LS.get(K_NOTICES, []), noticeRead: LS.get(K_NOTICE_READ, []), ledger: manageList(K_LEDGER), health: manageList(K_HEALTH), period: LS.get(K_PERIOD, {cycleLength:28,periodLength:5,lastStart:'',starts:[]}), study: manageList(K_STUDY), classes: manageList(K_CLASS), music: manageList(K_MUSIC), games: manageList(K_GAMES), window: LS.get(K_WINDOW, {title:'窗边',description:'给今天留一扇窗。',image:''}), windowNotes: manageList(K_WINDOW_NOTES), wallpaper: LS.get('liwu.wallpaper',''), mcpServers: manageList('liwu.mcp.servers'), plugins: manageList('liwu.plugins'), imageStudioConfig: imageConfig(), imageGallery: imageGallery(), proactiveImage: proactiveConfig() };
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
              if (Array.isArray(obj.moments)) LS.set('liwu.moments', obj.moments);
              if (Array.isArray(obj.memory)) LS.set(K_MEMORY, obj.memory);
              if (Array.isArray(obj.quotes)) LS.set('liwu.quotes', obj.quotes);
              if (Array.isArray(obj.favorites)) LS.set('liwu.favorites', obj.favorites);
              if (obj.profile && typeof obj.profile === 'object') LS.set(K_PROFILE, obj.profile);
              if (Array.isArray(obj.notices)) LS.set(K_NOTICES, obj.notices);
              if (Array.isArray(obj.noticeRead)) LS.set(K_NOTICE_READ, obj.noticeRead);
              if (Array.isArray(obj.ledger)) LS.set(K_LEDGER, obj.ledger);
              if (Array.isArray(obj.health)) LS.set(K_HEALTH, obj.health);
              if (obj.period && typeof obj.period === 'object') LS.set(K_PERIOD, obj.period);
              if (Array.isArray(obj.study)) LS.set(K_STUDY, obj.study);
              if (Array.isArray(obj.classes)) LS.set(K_CLASS, obj.classes);
              if (Array.isArray(obj.music)) LS.set(K_MUSIC, obj.music);
              if (Array.isArray(obj.games)) LS.set(K_GAMES, obj.games);
              if (obj.window && typeof obj.window === 'object') LS.set(K_WINDOW, obj.window);
              if (Array.isArray(obj.windowNotes)) LS.set(K_WINDOW_NOTES, obj.windowNotes);
              if (typeof obj.wallpaper === 'string') LS.set('liwu.wallpaper', obj.wallpaper);
              if (obj.imageStudioConfig && typeof obj.imageStudioConfig === 'object') LS.set(K_IMAGE_CFG, obj.imageStudioConfig);
              if (Array.isArray(obj.imageGallery)) LS.set(K_IMAGE_GALLERY, obj.imageGallery);
              if (obj.proactiveImage && typeof obj.proactiveImage === 'object') LS.set(K_PROACTIVE, obj.proactiveImage);
              if (Array.isArray(obj.mcpServers)) LS.set('liwu.mcp.servers', obj.mcpServers);
              if (Array.isArray(obj.plugins)) LS.set('liwu.plugins', obj.plugins);
              if (obj.imageStudioConfig && typeof obj.imageStudioConfig === 'object') LS.set(K_IMAGE_CFG, obj.imageStudioConfig);
              if (Array.isArray(obj.imageGallery)) LS.set(K_IMAGE_GALLERY, obj.imageGallery);
              if (obj.proactiveImage && typeof obj.proactiveImage === 'object') LS.set(K_PROACTIVE, obj.proactiveImage);
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
