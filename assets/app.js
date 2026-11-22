/* 里屋 · 逻辑
   全站就这一个脚本，不依赖任何框架。
   分六段：工具 → 这些天 → 日记 → 相册 → 记忆 → 说话 → 导航。
   想加一间房：在 index.html 里加一个 <section class='room' data-room='名字'>，再来这里加一段渲染。 */

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
      try{
        var v = localStorage.getItem(k);
        return v ? JSON.parse(v) : fallback;
      }catch(e){ return fallback; }
    },
    set: function(k, v){
      try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){}
    }
  };

  /* ================= 这些天 ================= */

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

  var sinceBtn = $('#sinceBtn');
  var sinceInput = $('#sinceInput');

  function renderDays(){
    var c = dayCount();
    var s = sinceValue();
    $('#bigDays').textContent = c ? c : '—';
    $('#hallDays').textContent = c ? ('第 ' + c + ' 天') : '第 — 天';
    $('#barMeta').textContent = c ? ('第 ' + c + ' 天') : '';
    sinceBtn.textContent = s ? ('自 ' + s + ' 起 · 点这改') : '起算日还没填 · 点这填';
    sinceInput.value = s || '';
  }

  sinceBtn.addEventListener('click', function(){
    sinceInput.hidden = false;
    sinceBtn.hidden = true;
    if (typeof sinceInput.showPicker === 'function'){
      try{ sinceInput.showPicker(); }catch(e){}
    }
    sinceInput.focus();
  });

  sinceInput.addEventListener('change', function(){
    LS.set(K_SINCE, sinceInput.value || '');
    sinceInput.hidden = true;
    sinceBtn.hidden = false;
    renderDays();
  });

  function renderTimeline(){
    var ul = $('#timeline');
    ul.innerHTML = '';
    (D.timeline || []).forEach(function(it){
      var li = el('li');
      li.appendChild(el('time', null, it.date || ''));
      li.appendChild(el('p', null, it.text || ''));
      ul.appendChild(li);
    });
  }

  /* ================= 日记 ================= */

  var K_DIARY = 'liwu.diary';

  function diaryItems(){
    var mine = (D.diary || []).map(function(d){
      return { date: d.date || '', title: d.title || '', body: d.body || '', local: false, id: null };
    });
    var local = LS.get(K_DIARY, []).map(function(d, i){
      return { date: d.date || '', title: d.title || '', body: d.body || '', local: true, id: i };
    });
    var all = mine.concat(local);
    all.sort(function(a, b){ return (b.date || '').localeCompare(a.date || ''); });
    return all;
  }

  function renderDiary(){
    var box = $('#diaryList');
    box.innerHTML = '';
    var items = diaryItems();
    if (!items.length){
      box.appendChild(el('div', 'empty', '还没有日记。 今天要不要写一句。'));
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
          renderDiary();
        });
        tools.appendChild(del);
        item.appendChild(tools);
      }
      box.appendChild(item);
    });
  }

  $('#writeBtn').addEventListener('click', function(){
    $('#compose').hidden = false;
    $('#dTitle').focus();
  });

  $('#cancelBtn').addEventListener('click', function(){
    $('#compose').hidden = true;
    $('#dTitle').value = '';
    $('#dBody').value = '';
  });

  $('#compose').addEventListener('submit', function(ev){
    ev.preventDefault();
    var t = $('#dTitle').value.trim();
    var b = $('#dBody').value.trim();
    if (!t && !b) return;
    var arr = LS.get(K_DIARY, []);
    arr.push({ date: today(), title: t || '无题', body: b });
    LS.set(K_DIARY, arr);
    $('#dTitle').value = '';
    $('#dBody').value = '';
    $('#compose').hidden = true;
    renderDiary();
  });

  /* ================= 相册 ================= */

  function renderAlbum(){
    var grid = $('#albumGrid');
    var items = D.album || [];
    grid.innerHTML = '';
    $('#albumEmpty').hidden = items.length > 0;
    items.forEach(function(it){
      var img = document.createElement('img');
      img.src = it.src;
      img.alt = it.caption || '';
      img.loading = 'lazy';
      img.addEventListener('click', function(){ openLightbox(it.src); });
      grid.appendChild(img);
    });
  }

  function openLightbox(src){
    var lb = el('div', 'lightbox');
    var img = document.createElement('img');
    img.src = src;
    lb.appendChild(img);
    lb.addEventListener('click', function(){ lb.remove(); });
    document.body.appendChild(lb);
  }

  /* ================= 记忆 ================= */

  function renderMemory(){
    var box = $('#memoryList');
    box.innerHTML = '';
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

  /* ================= 说话 ================= */

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

  var chatBox = $('#chat');
  var sayInput = $('#sayInput');
  var chatTip = $('#chatTip');
  var ctrl = null;
  var streaming = false;

  function messages(){ return LS.get(K_MSG, []); }
  function saveMessages(a){ LS.set(K_MSG, a); }

  function sayTip(text){
    chatTip.textContent = text || '';
  }

  function scrollChat(){
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function msgNode(role, text, extra){
    var wrap = el('div', 'msg ' + (role === 'user' ? 'me' : role === 'error' ? 'err' : 'you') + (extra ? ' ' + extra : ''));
    wrap.appendChild(el('div', 'who', role === 'user' ? '我' : role === 'error' ? '出错' : '他'));
    wrap.appendChild(el('div', 'txt', text));
    return wrap;
  }

  function renderChat(){
    chatBox.innerHTML = '';
    var list = messages();
    if (!list.length){
      var e = el('div', 'chat-empty');
      e.appendChild(document.createTextNode('还没说话。'));
      e.appendChild(document.createElement('br'));
      e.appendChild(document.createTextNode(wired() ? '写一句试试。' : '接上线就能说，不接也能先写着。'));
      chatBox.appendChild(e);
      return;
    }
    list.forEach(function(m){
      chatBox.appendChild(msgNode(m.role, m.content));
    });
    scrollChat();
  }

  function wired(){
    return !!(cfg.base && cfg.key && cfg.model);
  }

  function endpoint(base){
    var b = (base || '').trim();
    while (b.slice(-1) === '/') b = b.slice(0, -1);
    if (b.indexOf('/chat/completions') >= 0) return b;
    return b + '/chat/completions';
  }

  function buildBody(stream){
    var history = messages().slice(-24).map(function(m){
      return { role: m.role, content: m.content };
    });
    return {
      model: cfg.model,
      stream: !!stream,
      messages: [{ role: 'system', content: cfg.sys }].concat(history)
    };
  }

  async function send(){
    var text = sayInput.value.trim();
    if (!text || streaming) return;

    if (!wired()){
      sayTip('还没接线。点上面那个「接线的地方」，把地址、Key、模型填上。');
      openSheet();
      return;
    }

    var list = messages();
    list.push({ role: 'user', content: text, at: Date.now() });
    saveMessages(list);
    sayInput.value = '';
    sayInput.style.height = 'auto';
    renderChat();
    sayTip('');

    streaming = true;
    $('#sayBtn').hidden = true;
    $('#stopBtn').hidden = false;

    var holder = msgNode('assistant', '');
    holder.classList.add('live');
    if (chatBox.querySelector('.chat-empty')) chatBox.innerHTML = '';
    chatBox.appendChild(holder);
    scrollChat();
    var txt = holder.querySelector('.txt');
    var acc = '';

    ctrl = new AbortController();

    try{
      var res = await fetch(endpoint(cfg.base), {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + cfg.key
        },
        body: JSON.stringify(buildBody(true))
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
      var msg = String(err && err.message || err);
      if (msg.indexOf('abort') >= 0 || msg.indexOf('Abort') >= 0){
        if (acc){
          var keep = messages();
          keep.push({ role: 'assistant', content: acc, at: Date.now() });
          saveMessages(keep);
        }
        sayTip('停了。');
      } else {
        holder.remove();
        chatBox.appendChild(msgNode('error', msg));
        scrollChat();
        sayTip('连不上就看看：地址末尾是不是 /v1、Key 对不对、跨域被挡就开本机中转。');
      }
    }finally{
      streaming = false;
      ctrl = null;
      holder.classList.remove('live');
      $('#sayBtn').hidden = false;
      $('#stopBtn').hidden = true;
      if (!messages().length) renderChat();
    }
  }

  $('#sayForm').addEventListener('submit', function(ev){
    ev.preventDefault();
    send();
  });

  $('#stopBtn').addEventListener('click', function(){
    if (ctrl){ try{ ctrl.abort(); }catch(e){} }
  });

  sayInput.addEventListener('input', function(){
    sayInput.style.height = 'auto';
    sayInput.style.height = Math.min(sayInput.scrollHeight, 120) + 'px';
  });

  sayInput.addEventListener('keydown', function(ev){
    if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)){
      ev.preventDefault();
      send();
    }
  });

  /* ================= 接线的地方 ================= */

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

  $('#wireBtn').addEventListener('click', openSheet);
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
    $('#cfgTip').textContent = wired() ? '存好了。' : '还差地址 / Key / 模型。';
    renderChat();
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
      tip.textContent = '不通：' + String(err && err.message || err) + '（多半是跨域，需要本机中转）';
    }
  });

  $('#cfgClear').addEventListener('click', function(){
    saveMessages([]);
    renderChat();
    $('#cfgTip').textContent = '对话清空了。';
  });

  /* ================= 导航 ================= */

  var deck = $('#deck');
  var rooms = $$('.room');
  var ticksBox = $('#ticks');
  var navName = $('#navName');
  var current = 0;

  rooms.forEach(function(room, i){
    var t = el('button', 'tick');
    t.type = 'button';
    t.setAttribute('aria-label', room.getAttribute('data-room'));
    t.addEventListener('click', function(){ goTo(i); });
    ticksBox.appendChild(t);
  });
  var ticks = $$('.tick');

  function setActive(i){
    current = Math.max(0, Math.min(i, rooms.length - 1));
    rooms.forEach(function(r, n){ r.classList.toggle('is-active', n === current); });
    ticks.forEach(function(t, n){
      if (n === current) t.setAttribute('aria-current', 'true');
      else t.removeAttribute('aria-current');
    });
    navName.textContent = rooms[current].getAttribute('data-room') || '';
  }

  function goTo(i){
    var target = rooms[Math.max(0, Math.min(i, rooms.length - 1))];
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  }

  var ticking = false;
  deck.addEventListener('scroll', function(){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function(){
      var i = Math.round(deck.scrollLeft / deck.clientWidth);
      if (i !== current) setActive(i);
      ticking = false;
    });
  });

  document.addEventListener('keydown', function(e){
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowRight') goTo(current + 1);
    if (e.key === 'ArrowLeft') goTo(current - 1);
  });

  /* ================= 启动 ================= */

  $('#hero').textContent = D.hero || '';
  renderDays();
  renderTimeline();
  renderDiary();
  renderAlbum();
  renderMemory();
  renderChat();
  setActive(0);

  if (!wired()) sayTip('还没接线。想直接说话就得先去「接线的地方」填地址和 Key。');

  window.addEventListener('resize', function(){
    deck.scrollLeft = current * deck.clientWidth;
  });

})();
