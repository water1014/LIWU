/* 里屋 · 桌面交互
   东西能拖。拖到哪存在这台手机里，下次打开还在。
   双击抬头中间的时间 → 全部复位到原来的位置（拖乱了用这个）。 */

(function(){
  'use strict';

  var D = window.LIWU || {};
  var K_LAYOUT = 'liwu.desk.layout';

  function $(s){ return document.querySelector(s); }

  var plane = $('#plane');
  var modeBtn = $('#hudMode');

  /* ---------- 时间 ---------- */

  var WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  function p2(n){ return n < 10 ? '0' + n : '' + n; }

  function paintClock(){
    var d = new Date();
    var t = $('#hudTime');
    var dt = $('#hudDate');
    if (t) t.textContent = p2(d.getHours()) + ':' + p2(d.getMinutes());
    if (dt) dt.textContent = (d.getMonth() + 1) + '月' + d.getDate() + '日 · ' + WEEK[d.getDay()];
  }

  paintClock();
  setInterval(paintClock, 20000);

  /* ---------- 天数 ---------- */

  function sinceText(){
    var s = '';
    try{ s = JSON.parse(localStorage.getItem('liwu.since') || '""') || ''; }catch(e){}
    if (!s && D.since) s = D.since;
    return s;
  }

  function dayCount(){
    var s = sinceText();
    if (!s) return null;
    var a = new Date(s + 'T00:00:00');
    if (isNaN(a.getTime())) return null;
    var n = new Date();
    var b = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    var c = Math.floor((b - a) / 86400000) + 1;
    return c > 0 ? c : null;
  }

  function paintDays(){
    var c = dayCount();
    var el = $('#deskDays');
    if (el) el.textContent = c ? ('第 ' + c + ' 天') : '第 — 天';
  }

  /* ---------- 天气 / 备忘 / 图 ---------- */

  function esc(v){
    return String(v == null ? '' : v)
      .split('&').join('&amp;')
      .split('<').join('&lt;')
      .split('>').join('&gt;');
  }

  function paintWeather(){
    var w = D.weather || {};
    var t = $('#hudTemp');
    var s = $('#hudWeather');
    if (t) t.textContent = w.temp || '—';
    if (s) s.textContent = w.text || '';
  }

  function paintMemo(){
    var ul = $('#memoList');
    if (!ul) return;
    var items = (D.memory || []).slice(0, 4);
    if (!items.length){ ul.innerHTML = '<li><b>还空着</b></li>'; return; }
    ul.innerHTML = items.map(function(it){
      var sub = String(it.body || '').slice(0, 15);
      return '<li><b>' + esc(it.title || '') + '</b>' + (sub ? '<i>' + esc(sub) + '</i>' : '') + '</li>';
    }).join('');
  }

  function paintPhotos(){
    var list = D.album || [];
    var shot = $('#featureShot');
    var cap = $('#featureCap');
    var ph1 = $('#ph1');
    if (shot && list.length && list[0].src){
      shot.style.backgroundImage = 'url("' + list[0].src + '")';
      shot.innerHTML = '';
    }
    if (cap){
      cap.textContent = (list.length && list[0].src)
        ? (list[0].caption || list[0].date || '')
        : '还没有照片';
    }
    if (ph1){
      var second = list[1] || list[0];
      if (second && second.src) ph1.style.backgroundImage = 'url("' + second.src + '")';
    }
  }

  /* ---------- 进去 ---------- */

  var fromHome = false;

  function open(key){
    if (!key) return;
    if (key === 'chat'){
      document.body.classList.remove('home');
      var inp = document.getElementById('input');
      if (inp) setTimeout(function(){ inp.focus(); }, 140);
      return;
    }
    var btn = document.querySelector('.drawer-nav [data-view="' + key + '"]');
    if (!btn) return;
    fromHome = true;
    document.body.classList.remove('home');
    setTimeout(function(){ btn.click(); }, 30);
  }

  function setHome(on){
    if (on){ document.body.classList.add('home'); refresh(); }
    else { document.body.classList.remove('home'); }
  }

  /* ---------- 拖动 ---------- */

  var layout = {};
  try{ layout = JSON.parse(localStorage.getItem(K_LAYOUT) || '{}') || {}; }catch(e){ layout = {}; }

  function saveLayout(){
    try{ localStorage.setItem(K_LAYOUT, JSON.stringify(layout)); }catch(e){}
  }

  var dragging = false;

  function bind(el, key){
    if (!el) return;
    var start = null;

    if (layout[key]){
      el.style.setProperty('--tx', layout[key].x + 'px');
      el.style.setProperty('--ty', layout[key].y + 'px');
    }

    el.addEventListener('pointerdown', function(ev){
      if (ev.button != null && ev.button !== 0) return;
      start = {
        x: ev.clientX, y: ev.clientY,
        ox: (layout[key] && layout[key].x) || 0,
        oy: (layout[key] && layout[key].y) || 0,
        moved: false,
        target: ev.target
      };
      try{ el.setPointerCapture(ev.pointerId); }catch(e){}
    });

    el.addEventListener('pointermove', function(ev){
      if (!start) return;
      var dx = ev.clientX - start.x;
      var dy = ev.clientY - start.y;
      if (!start.moved && (Math.abs(dx) > 7 || Math.abs(dy) > 7)){
        start.moved = true;
        dragging = true;
        el.classList.add('lifting');
      }
      if (start.moved){
        layout[key] = { x: start.ox + dx, y: start.oy + dy };
        el.style.setProperty('--tx', layout[key].x + 'px');
        el.style.setProperty('--ty', layout[key].y + 'px');
      }
    });

    el.addEventListener('pointerup', function(){
      if (!start) return;
      var moved = start.moved;
      var target = start.target;
      start = null;
      dragging = false;
      el.classList.remove('lifting');

      if (moved){ saveLayout(); return; }

      var hit = (target && target.closest) ? target.closest('[data-open]') : null;
      if (hit && el.contains(hit)){ open(hit.getAttribute('data-open')); return; }
      var own = el.getAttribute('data-open');
      if (own) open(own);
    });

    el.addEventListener('pointercancel', function(){
      start = null;
      dragging = false;
      el.classList.remove('lifting');
    });
  }

  bind($('.paper'), 'paper');
  bind($('.polaroid'), 'polaroid');
  bind($('.note'), 'note');
  bind($('.vinyl-wrap'), 'vinyl');
  bind($('.tag'), 'tag');

  /* ---------- 双击时间，全部复位 ---------- */

  var clockEl = $('.clock');
  var lastTap = 0;
  if (clockEl){
    clockEl.addEventListener('click', function(){
      var now = Date.now();
      if (now - lastTap < 420){
        layout = {};
        saveLayout();
        var all = document.querySelectorAll('.thing');
        for (var i = 0; i < all.length; i++){
          all[i].style.removeProperty('--tx');
          all[i].style.removeProperty('--ty');
        }
        flash('摆回原来的位置了。');
      }
      lastTap = now;
    });
  }

  function flash(text){
    var old = document.querySelector('.desk-flash');
    if (old) old.remove();
    var d = document.createElement('div');
    d.className = 'desk-flash';
    d.textContent = text;
    d.style.cssText = 'position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 74px);z-index:95;text-align:center;font-size:10.5px;letter-spacing:.16em;color:rgba(74,67,56,.55);pointer-events:none;transition:opacity .4s';
    document.getElementById('desk-wrap').appendChild(d);
    setTimeout(function(){ d.style.opacity = '0'; }, 1200);
    setTimeout(function(){ d.remove(); }, 1800);
  }

  /* ---------- 主题胶囊 ---------- */

  function readCfg(){
    var c = {};
    try{ c = JSON.parse(localStorage.getItem('liwu.cfg3') || '{}') || {}; }catch(e){}
    return c;
  }

  function setTheme(t){
    document.body.setAttribute('data-theme', t);
    if (modeBtn) modeBtn.textContent = t === 'night' ? '预览：夜晚' : '预览：白天';
    var m = document.querySelector('meta[name=theme-color]');
    if (m) m.setAttribute('content', t === 'night' ? '#1A1815' : '#EFE9DC');
    var c = readCfg();
    c.theme = t;
    try{ localStorage.setItem('liwu.cfg3', JSON.stringify(c)); }catch(e){}
  }

  if (modeBtn){
    modeBtn.addEventListener('click', function(){
      setTheme(document.body.getAttribute('data-theme') === 'night' ? 'paper' : 'night');
    });
  }

  (function initTheme(){
    var c = readCfg();
    setTheme(c.theme === 'night' ? 'night' : 'paper');
  })();

  /* ---------- 视差 ---------- */

  var raf = null, idle = null;

  function resetTilt(){ if (plane) plane.style.transform = ''; }

  window.addEventListener('pointermove', function(ev){
    if (!document.body.classList.contains('home')) return;
    if (dragging) return;
    if (raf) return;
    raf = requestAnimationFrame(function(){
      raf = null;
      if (!plane) return;
      var x = (ev.clientX / window.innerWidth - 0.5) * 2;
      var y = (ev.clientY / window.innerHeight - 0.5) * 2;
      plane.style.transform = 'rotateX(' + (-y * 2.2).toFixed(2) + 'deg) rotateY(' + (x * 2.6).toFixed(2) + 'deg)';
    });
    if (idle) clearTimeout(idle);
    idle = setTimeout(resetTilt, 1600);
  }, { passive: true });

  window.addEventListener('pointerup', function(){
    if (idle) clearTimeout(idle);
    idle = setTimeout(resetTilt, 600);
  }, { passive: true });

  /* ---------- 抬头按钮 / 底部那排 / 回来 ---------- */

  var hudMenu = $('#hudMenu');
  if (hudMenu){
    hudMenu.addEventListener('click', function(){
      var b = document.getElementById('menuBtn');
      if (b) b.click();
    });
  }

  var homeBtn = document.querySelector('.drawer-nav [data-view="home"]');
  if (homeBtn) homeBtn.addEventListener('click', function(){ setHome(true); });

  var backBtn = document.getElementById('viewBack');
  if (backBtn) backBtn.addEventListener('click', function(){
    if (fromHome){ fromHome = false; setTimeout(function(){ setHome(true); }, 20); }
  });

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && fromHome){
      fromHome = false;
      setTimeout(function(){ setHome(true); }, 20);
    }
  });

  var ITEMS = [
    ['chat', '说话'],
    ['diary', '日记'],
    ['album', '相册'],
    ['memory', '记忆'],
    ['settings', '设置']
  ];

  (function buildDock(){
    var dock = document.getElementById('deskDock');
    if (!dock) return;
    for (var i = 0; i < ITEMS.length; i++){
      (function(it){
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = it[1];
        b.addEventListener('click', function(){ open(it[0]); });
        dock.appendChild(b);
      })(ITEMS[i]);
    }
  })();

  /* ---------- 刷新 ---------- */

  function refresh(){
    paintClock();
    paintDays();
    paintWeather();
    paintMemo();
    paintPhotos();
  }

  refresh();
  setInterval(paintDays, 10000);

  window.LIWU_DESK = { refresh: refresh, setHome: setHome, open: open };

})();
