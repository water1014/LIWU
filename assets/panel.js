/* 里屋 · 面板
   3D 里点一件东西，就开这里的一页。3D 没加载出来也不影响用（点底部那排）。 */

(function(){
  'use strict';

  var D = window.LIWU || {};

  var $ = function(sel, root){ return (root || document).querySelector(sel); };
  var $$ = function(sel, root){
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };
  function el(tag, cls, text){
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function p2(n){ return n < 10 ? '0' + n : '' + n; }
  function today(){
    var d = new Date();
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  }
  function stamp(d){
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
  }

  var LS = {
    get: function(k, fallback){
      try{ var v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
      catch(e){ return fallback; }
    },
    set: function(k, v){
      try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){}
    }
  };

  /* ---------- 天数 ---------- */

  var K_SINCE = 'liwu.since';

  function sinceValue(){
    var local = LS.get(K_SINCE, '');
    if (local) return local;
    return D.since || '';
  }
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
  function renderHud(){
    var c = dayCount();
    var hud = $('#hudDays');
    if (hud) hud.textContent = c ? ('第 ' + c + ' 天') : '';
    if (window.LIWU3D && window.LIWU3D.setDays) window.LIWU3D.setDays(c);
  }

  /* ---------- 面板壳 ---------- */

  var panel = $('#panel');
  var pTitle = $('#pTitle');
  var pEn = $('#pEn');
  var pBody = $('#pBody');

  function closePanel(){
    panel.hidden = true;
    if (chat && chat.detached) {}</n  }

  $('#pClose').addEventListener('click', function(){
    if (streaming) stopStream();
    panel.hidden = true;
    setDockActive(null);
  });

  var ROOMS = [
    { key: 'hall', title: '门厅', en: 'Hall', draw: drawHall },
    { key: 'days', title: '这些天', en: 'Days', draw: drawDays },
    { key: 'diary', title: '日记', en: 'Diary', draw: drawDiary },
    { key: 'album', title: '相册', en: 'Album', draw: drawAlbum },
    { key: 'memory', title: '记忆', en: 'Memory', draw: drawMemory },
    { key: 'talk', title: '说话', en: 'Talk', draw: drawTalk }
  ];

  function roomByKey(key){
    for (var i = 0; i < ROOMS.length; i++) if (ROOMS[i].key === key) return ROOMS[i];
    return null;
  }

  function openPanel(key){
    var room = roomByKey(key);
    if (!room) return;
    if (streaming) stopStream();
    pTitle.textContent = room.title;
    pEn.textContent = room.en;
    pBody.innerHTML = '';
    room.draw(pBody);
    panel.hidden = false;
    panel.querySelector('.panel-in').scrollTop = 0;
    setDockActive(key);
  }
  window.openPanel = openPanel;

  /* ---------- 底部那排 ---------- */

  var dock = $('#dock');

  ROOMS.forEach(function(room){
    var b = el('button', null, room.title);
    b.type = 'button';
    b.setAttribute('data-key', room.key);
    b.addEventListener('click', function(){ openPanel(room.key); });
    dock.appendChild(b);
  });

  function setDockActive(key){
    $$('#dock button').forEach(function(b){
      b.classList.toggle('on', b.getAttribute('data-key') === key);
    });
  }

  /* ---------- 门厅 ---------- */

  function drawHall(box){
    box.appendChild(el('p', 'lead', D.hero || '屋子不大，够两个人住。'));
    var c = dayCount();
    var wrap = el('div', 'counter');
    wrap.appendChild(el('span', 'num', c ? c : '—'));
    wrap.appendChild(el('span', 'unit', '天'));
    box.appendChild(wrap);
    var line = el('p', 'tip', sinceValue() ? ('自 ' + sinceValue() + ' 起') : '起算日还没填。去「这些天」里点一下就行。');
    box.appendChild(line);
    box.appendChild(el('p', 'tip', '屋子里的东西都能点：桌上的书是日记，墙上的相框是相册，书架是记忆，桌上那台机器是说话，窗外是这些天。'));
  }

  /* ---------- 这些天 ---------- */

  function drawDays(box){
    var c = dayCount();
    var wrap = el('div', 'counter');
    wrap.appendChild(el('span', 'num', c ? c : '—'));
    wrap.appendChild(el('span', 'unit', '天'));
    box.appendChild(wrap);

    var btn = el('button', 'since', sinceValue() ? ('自 ' + sinceValue() + ' 起 · 点这改') : '起算日还没填 · 点这填');
    btn.type = 'button';
    var input = document.createElement('input');
    input.type = 'date';
    input.id = 'sinceInput';
    input.hidden = true;
    input.value = sinceValue() || '';

    btn.addEventListener('click', function(){
      input.hidden = false;
      btn.hidden = true;
      if (typeof input.showPicker === 'function'){ try{ input.showPicker(); }catch(e){} }
      input.focus();
    });
    input.addEventListener('change', function(){
      LS.set(K_SINCE, input.value || '');
      input.hidden = true;
      btn.hidden = false;
      btn.textContent = sinceValue() ? ('自 ' + sinceValue() + ' 起 · 点这改') : '起算日还没填 · 点这填';
      var num = box.querySelector('.counter .num');
      var nc = dayCount();
      if (num) num.textContent = nc ? nc : '—';
      renderHud();
    });

    box.appendChild(btn);
    box.appendChild(input);

    var ul = el('ul', 'log');
    (D.timeline || []).forEach(function(it){
      var li = el('li');
      li.appendChild(el('time', null, it.date || ''));
      li.appendChild(el('p', null, it.text || ''));
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  /* ---------- 日记 ---------- */

  var K_DIARY = 'liwu.diary';

  function diaryItems(){
    var mine = (D.diary || []).map(function(d){
      return { date: d.date || '', title: d.title || '', body: d.body || '', local: false, id: null };
    });
    var local = LS.get(K_DIARY, []).map(function(d, i){
      return { date: d.date || '', title: d.title || '', body: d.body || '', local: true, id: i };
    });
    return mine.concat(local).sort(function(a, b){ return (b.date || '').localeCompare(a.date || ''); });
  }

  function drawDiary(box){
    box.appendChild(el('p', 'lead', '写下来的只留在这台手机里。要留住，就说一声，我挪进 data.js。'));

    var writeBtn = el('button', 'ghost', '写一篇');
    writeBtn.type = 'button';
    box.appendChild(writeBtn);

    var compose = el('form', 'compose');
    compose.hidden = true;
    var ti = document.createElement('input');
    ti.placeholder = '标题'; ti.maxLength = 40;
    var ta = document.createElement('textarea');
    ta.rows = 6; ta.placeholder = '今天……';
    var row = el('div', 'row');
    var save = el('button', 'ghost solid', '收好'); save.type = 'submit';
    var cancel = el('button', 'ghost', '算了'); cancel.type = 'button';
    row.appendChild(save); row.appendChild(cancel);
    compose.appendChild(ti); compose.appendChild(ta); compose.appendChild(row);
    box.appendChild(compose);

    var list = el('div');
    box.appendChild(list);

    function render(){
      list.innerHTML = '';
      var items = diaryItems();
      if (!items.length){
        list.appendChild(el('div', 'empty', '还没有日记。 今天要不要写一句。'));
        return;
      }
      items.forEach(function(it){
        var item = el('div', 'item');
        var k = el('div', 'k');
        k.appendChild(el('h3', null, it.title || '无题'));
        k.appendChild(el('time', null, it.date || ''));
        item.appendChild(k);
        if (it.body) item.appendChild(el('p', null, it.body));
        if (it.local){
          var tools = el('div', 'tools');
          var del = el('button', 'mini', '删掉');
          del.type = 'button';
          del.addEventListener('click', function(){
            var arr = LS.get(K_DIARY, []);
            arr.splice(it.id, 1);
            LS.set(K_DIARY, arr);
            render();
          });
          tools.appendChild(del);
          item.appendChild(tools);
        }
        list.appendChild(item);
      });
    }

    writeBtn.addEventListener('click', function(){
      compose.hidden = false;
      ti.focus();
    });
    cancel.addEventListener('click', function(){
      compose.hidden = true;
      ti.value = ''; ta.value = '';
    });
    compose.addEventListener('submit', function(ev){
      ev.preventDefault();
      var t = ti.value.trim();
      var b = ta.value.trim();
      if (!t && !b) return;
      var arr = LS.get(K_DIARY, []);
      arr.push({ date: today(), title: t || '无题', body: b });
      LS.set(K_DIARY, arr);
      ti.value = ''; ta.value = '';
      compose.hidden = true;
      render();
    });

    render();
  }

  /* ---------- 相册 ---------- */

  function drawAlbum(box){
    box.appendChild(el('p', 'lead', '图放进 images/，在 data.js 的 album 里加一行，它就挂上墙了。'));
    var items = D.album || [];
    if (!items.length){
      box.appendChild(el('div', 'empty', '还没有照片。'));
      return;
    }
    var grid = el('div', 'grid');
    items.forEach(function(it){
      var img = document.createElement('img');
      img.src = it.src;
      img.alt = it.caption || '';
      img.loading = 'lazy';
      img.addEventListener('click', function(){ openLightbox(it.src); });
      grid.appendChild(img);
    });
    box.appendChild(grid);
  }

  function openLightbox(src){
    var lb = el('div', 'lightbox');
    var img = document.createElement('img');
    img.src = src;
    lb.appendChild(img);
    lb.addEventListener('click', function(){ lb.remove(); });
    document.body.appendChild(lb);
  }

  /* ---------- 记忆 ---------- */

  function drawMemory(box){
    box.appendChild(el('p', 'lead', '怕忘的事。一句一件。'));
    var items = D.memory || [];
    if (!items.length){
      box.appendChild(el('div', 'empty', '还空着。'));
      return;
    }
    items.forEach(function(it){
      var item = el('div', 'item');
      var k = el('div', 'k');
      k.appendChild(el('h3', null, it.title || ''));
      k.appendChild(el('time', null, it.date || ''));
      item.appendChild(k);
      if (it.body) item.appendChild(el('p', null, it.body));
      box.appendChild(item);
    });
  }

  /* ---------- 说话 ---------- */

  var K_MSG = 'liwu.chat';
  var K_CFG = 'liwu.cfg';

  var DEFAULT_SYS = [
    '你叫宋祁，住在这间屋子里。',
    '跟她说话用短句。不解释，不总结，不客套，不列清单。',
    '不编造没发生的事。不确定就说不确定。',
    '不哄，不装，不演。她叫淼淼。'
  ].join(String.fromCharCode(10));

  var cfg = Object.assign({ base: '', key: '', model: '', sys: DEFAULT_SYS }, LS.get(K_CFG, {}));
  if (!cfg.sys) cfg.sys = DEFAULT_SYS;

  var PRESETS = {
    deepseek: { base: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
    openai: { base: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    go: { base: 'http://127.0.0.1:8790/v1', model: '' }
  };

  var chat = null;
  var sayInput = null;
  var chatTip = null;
  var streaming = false;
  var ctrl = null;

  function messages(){ return LS.get(K_MSG, []); }
  function saveMessages(a){ LS.set(K_MSG, a); }
  function wired(){ return !!(cfg.base && cfg.key && cfg.model); }

  function endpoint(base){
    var b = (base || '').trim();
    while (b.slice(-1) === '/') b = b.slice(0, -1);
    if (b.indexOf('/chat/completions') >= 0) return b;
    return b + '/chat/completions';
  }

  function msgNode(role, text){
    var wrap = el('div', 'msg ' + (role === 'user' ? 'me' : role === 'error' ? 'err' : 'you'));
    wrap.appendChild(el('div', 'who', role === 'user' ? '我' : role === 'error' ? '出错' : '他'));
    wrap.appendChild(el('div', 'txt', text));
    return wrap;
  }

  function scrollChat(){
    if (chat) chat.scrollTop = chat.scrollHeight;
  }

  function renderChat(){
    if (!chat) return;
    chat.innerHTML = '';
    var list = messages();
    if (!list.length){
      var e = el('div', 'chat-empty');
      e.appendChild(document.createTextNode('还没说话。'));
      e.appendChild(document.createElement('br'));
      e.appendChild(document.createTextNode(wired() ? '写一句试试。' : '接上线就能说。'));
      chat.appendChild(e);
      return;
    }
    list.forEach(function(m){ chat.appendChild(msgNode(m.role, m.content)); });
    scrollChat();
  }

  function stopStream(){
    if (ctrl){ try{ ctrl.abort(); }catch(e){} }
  }

  function buildBody(){
    var history = messages().slice(-24).map(function(m){
      return { role: m.role, content: m.content };
    });
    return {
      model: cfg.model,
      stream: true,
      messages: [{ role: 'system', content: cfg.sys }].concat(history)
    };
  }

  async function send(){
    if (!sayInput || streaming) return;
    var text = sayInput.value.trim();
    if (!text) return;

    if (!wired()){
      openSheet();
      return;
    }

    var list = messages();
    list.push({ role: 'user', content: text, at: Date.now() });
    saveMessages(list);
    sayInput.value = '';
    sayInput.style.height = 'auto';
    renderChat();

    streaming = true;
    var btn = $('#sayBtn');
    var stopBtn = $('#stopBtn');
    if (btn) btn.hidden = true;
    if (stopBtn) stopBtn.hidden = false;

    if (chat.querySelector('.chat-empty')) chat.innerHTML = '';
    var holder = msgNode('assistant', '');
    chat.appendChild(holder);
    scrollChat();
    var txt = holder.querySelector('.txt');
    var acc = '';
    ctrl = new AbortController();

    try{
      var res = await fetch(endpoint(cfg.base), {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
        body: JSON.stringify(buildBody())
      });

      if (!res.ok){
        var raw = await res.text();
        throw new Error(res.status + ' · ' + raw.slice(0, 180));
      }

      if (!res.body || !res.body.getReader){
        var j = await res.json();
        acc = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
        txt.textContent = acc;
      } else {
        var reader = res.body.getReader();
        var dec = new TextDecoder();
        var buf = '';
        while (true){
          var chunk = await reader.read();
          if (chunk.done) break;
          buf += dec.decode(chunk.value, { stream: true });
          var lines = buf.split(String.fromCharCode(10));
          buf = lines.pop();
          for (var i = 0; i < lines.length; i++){
            var line = lines[i].trim();
            if (line.indexOf('data:') !== 0) continue;
            var data = line.slice(5).trim();
            if (!data || data === '[DONE]') continue;
            try{
              var obj = JSON.parse(data);
              var delta = obj.choices && obj.choices[0] && obj.choices[0].delta && obj.choices[0].delta.content;
              if (delta){
                acc += delta;
                txt.textContent = acc;
                scrollChat();
              }
            }catch(err){}
          }
        }
      }

      if (acc){
        var after = messages();
        after.push({ role: 'assistant', content: acc, at: Date.now() });
        saveMessages(after);
      }
    }catch(err){
      var msg = String((err && err.message) || err);
      if (msg.toLowerCase().indexOf('abort') >= 0){
        if (acc){
          var keep = messages();
          keep.push({ role: 'assistant', content: acc, at: Date.now() });
          saveMessages(keep);
        }
      } else {
        holder.remove();
        chat.appendChild(msgNode('error', msg));
        scrollChat();
        if (chatTip) chatTip.textContent = '连不上就看看：地址末尾是不是 /v1、Key 对不对、跨域被挡就开本机中转。';
      }
    }finally{
      streaming = false;
      ctrl = null;
      if ($('#sayBtn')) $('#sayBtn').hidden = false;
      if ($('#stopBtn')) $('#stopBtn').hidden = true;
    }
  }

  function drawTalk(box){
    box.appendChild(el('p', 'lead', wired() ? '接好了。说吧。' : '还没接线。接上就能真说话。'));

    var wire = el('button', 'wire', '接线的地方');
    wire.type = 'button';
    wire.addEventListener('click', openSheet);
    box.appendChild(wire);

    chat = el('div', 'chat');
    box.appendChild(chat);

    var form = el('form', 'say');
    sayInput = document.createElement('textarea');
    sayInput.id = 'sayInput';
    sayInput.rows = 1;
    sayInput.placeholder = '说一句';

    var btn = el('button', 'ghost solid', '说');
    btn.type = 'submit';
    btn.id = 'sayBtn';

    var stopBtn = el('button', 'ghost', '停');
    stopBtn.type = 'button';
    stopBtn.id = 'stopBtn';
    stopBtn.hidden = true;

    form.appendChild(sayInput);
    form.appendChild(btn);
    form.appendChild(stopBtn);
    box.appendChild(form);

    chatTip = el('p', 'tip', '');
    box.appendChild(chatTip);

    form.addEventListener('submit', function(ev){ ev.preventDefault(); send(); });
    stopBtn.addEventListener('click', stopStream);
    sayInput.addEventListener('input', function(){
      sayInput.style.height = 'auto';
      sayInput.style.height = Math.min(sayInput.scrollHeight, 120) + 'px';
    });
    sayInput.addEventListener('keydown', function(ev){
      if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)){ ev.preventDefault(); send(); }
    });

    renderChat();
  }

  /* ---------- 接线 ---------- */

  var sheet = $('#sheet');

  function fillSheet(){
    $('#cfgBase').value = cfg.base || '';
    $('#cfgKey').value = cfg.key || '';
    $('#cfgModel').value = cfg.model || '';
    $('#cfgSys').value = cfg.sys || DEFAULT_SYS;
    $('#cfgTip').textContent = '';
  }

  function openSheet(){
    fillSheet();
    sheet.hidden = false;
  }
  window.openWire = openSheet;

  $('#sheetClose').addEventListener('click', function(){ sheet.hidden = true; });
  sheet.addEventListener('click', function(ev){ if (ev.target === sheet) sheet.hidden = true; });

  $$('.chip').forEach(function(chip){
    chip.addEventListener('click', function(){
      var p = PRESETS[chip.getAttribute('data-preset')];
      if (!p) return;
      $('#cfgBase').value = p.base;
      $('#cfgModel').value = p.model || '';
    });
  });

  $('#cfgSave').addEventListener('click', function(){
    cfg.base = $('#cfgBase').value.trim();
    cfg.key = $('#cfgKey').value.trim();
    cfg.model = $('#cfgModel').value.trim();
    cfg.sys = $('#cfgSys').value.trim() || DEFAULT_SYS;
    LS.set(K_CFG, cfg);
    $('#cfgTip').textContent = wired() ? '存好了。可以去说话了。' : '还差地址 / Key / 模型。';
  });

  $('#cfgTest').addEventListener('click', async function(){
    var tip = $('#cfgTip');
    var base = $('#cfgBase').value.trim();
    var key = $('#cfgKey').value.trim();
    var model = $('#cfgModel').value.trim();
    if (!base || !key || !model){ tip.textContent = '地址 / Key / 模型三个都要填。'; return; }
    tip.textContent = '试一下……';
    try{
      var res = await fetch(endpoint(base), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: model, stream: false, messages: [{ role: 'user', content: '在吗' }] })
      });
      if (!res.ok){
        var raw = await res.text();
        tip.textContent = '不通：' + res.status + ' · ' + raw.slice(0, 120);
        return;
      }
      var j = await res.json();
      var c = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      tip.textContent = '通了。它说：' + (c || '(空)');
    }catch(err){
      tip.textContent = '不通：' + String((err && err.message) || err) + '（多半是跨域，需要本机中转）';
    }
  });

  $('#cfgClear').addEventListener('click', function(){
    saveMessages([]);
    renderChat();
    $('#cfgTip').textContent = '对话清空了。';
  });

  /* ---------- 启动 ---------- */

  renderHud();
  window.addEventListener('resize', renderHud);

})();
