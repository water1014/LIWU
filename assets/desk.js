/* 里屋 · 桌面交互
   抬头的时间、拍立得里的图、备忘、天数、主题切换，还有“点东西就进去”。 */

(function(){
  'use strict';

  var D = window.LIWU || {};
  var NL = String.fromCharCode(10);

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

  /* ---------- 天气 ---------- */

  function paintWeather(){
    var w = D.weather || {};
    var t = $('#hudTemp');
    var s = $('#hudWeather');
    if (t) t.textContent = w.temp || '—';
    if (s) s.textContent = w.text || '';
  }

  /* ---------- 备忘 ---------- */

  function paintMemo(){
    var ul = $('#memoList');
    if (!ul) return;
    var items = (D.memory || []).slice(0, 4);
    if (!items.length){
      ul.innerHTML = '<li><b>还空着</b></li>';
      return;
    }
    ul.innerHTML = items.map(function(it){
      var sub = String(it.body || '').slice(0, 16);
      return '<li><b>' + esc(it.title || '') + '</b>' + (sub ? '<i>' + esc(sub) + '</i>' : '') + '</li>';
    }).join('');
  }

  function esc(v){
    return String(v == null ? '' : v)
      .split('&').join('&amp;')
      .split('<').join('&lt;')
      .split('>').join('&gt;');
  }

  /* ---------- 图 ---------- */

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
    if (on){
      document.body.classList.add('home');
      refresh();
    } else {
      document.body.classList.remove('home');
    }
  }

  document.addEventListener('click', function(ev){
    var hit = ev.target.closest && ev.target.closest('[data-open]');
    if (!hit) return;
    var key = hit.getAttribute('data-open');
    if (key) open(key);
  });

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
      var now = document.body.getAttribute('data-theme') === 'night' ? 'paper' : 'night';
      setTheme(now);
    });
  }

  (function initTheme(){
    var c = readCfg();
    setTheme(c.theme === 'night' ? 'night' : 'paper');
  })();

  /* ---------- 视差：手一动，桌子微微歪一下 ---------- */

  var raf = null;
  var idle = null;

  function tilt(x, y){
    if (!plane) return;
    var rx = (-y * 2.4).toFixed(2);
    var ry = (x * 2.8).toFixed(2);
    plane.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
  }

  function reset(){
    if (plane) plane.style.transform = '';
  }

  window.addEventListener('pointermove', function(ev){
    if (!document.body.classList.contains('home')) return;
    if (raf) return;
    raf = requestAnimationFrame(function(){
      raf = null;
      var x = (ev.clientX / window.innerWidth - 0.5) * 2;
      var y = (ev.clientY / window.innerHeight - 0.5) * 2;
      tilt(x, y);
    });
    if (idle) clearTimeout(idle);
    idle = setTimeout(reset, 1400);
  }, { passive: true });

  window.addEventListener('pointerup', function(){
    if (idle) clearTimeout(idle);
    idle = setTimeout(reset, 500);
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

  /* ---------- 刷新一遍 ---------- */

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
