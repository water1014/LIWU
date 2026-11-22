/* 里屋 · 窗台接线
   场景是 windowsill/index.html（同域 iframe）。这里做三件事：
   1. 把它自带的季节/天气/灵动岛藏掉，只留场景（点东西弹出的卡片保留，那是它的玩法）
   2. 用它的 fuyue 口子把我们的话喂进去
   3. 抬头、底部导航、主题、开面板 */

(function(){
  'use strict';

  var D = window.LIWU || {};
  var $ = function(s){ return document.querySelector(s); };
  var p2 = function(n){ return n < 10 ? '0' + n : '' + n; };

  var scene = document.getElementById('scene');
  var boot = document.getElementById('boot');
  var modeBtn = $('#hudMode');
  var lookUp = $('#lookUp');

  /* ---------- 抬头 ---------- */

  var WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  function paintClock(){
    var d = new Date();
    var t = $('#hudTime'), dt = $('#hudDate');
    if (t) t.textContent = p2(d.getHours()) + ':' + p2(d.getMinutes());
    if (dt) dt.textContent = (d.getMonth() + 1) + '月' + d.getDate() + '日 · ' + WEEK[d.getDay()];
  }
  paintClock();
  setInterval(paintClock, 20000);

  /* ---------- 跳转 ---------- */

  var fromHome = false;

  function open(key){
    if (!key) return;
    fromHome = false;
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
    if (on) document.body.classList.add('home');
    else document.body.classList.remove('home');
  }

  function flash(text){
    var old = document.querySelector('.desk-flash');
    if (old) old.remove();
    var d = document.createElement('div');
    d.className = 'desk-flash';
    d.textContent = text;
    document.getElementById('desk-wrap').appendChild(d);
    setTimeout(function(){ d.style.opacity = '0'; }, 1300);
    setTimeout(function(){ d.remove(); }, 1900);
  }

  var hudMenu = $('#hudMenu');
  if (hudMenu) hudMenu.addEventListener('click', function(){
    var b = document.getElementById('menuBtn');
    if (b) b.click();
  });

  var homeBtn = document.querySelector('.drawer-nav [data-view="home"]');
  if (homeBtn) homeBtn.addEventListener('click', function(){ setHome(true); });

  var backBtn = document.getElementById('viewBack');
  if (backBtn) backBtn.addEventListener('click', function(){
    if (fromHome){ fromHome = false; setTimeout(function(){ setHome(true); }, 20); }
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && fromHome){ fromHome = false; setTimeout(function(){ setHome(true); }, 20); }
  });

  var NAV = [['chat', '说话'], ['diary', '日记'], ['album', '相册'], ['memory', '记忆'], ['settings', '设置']];
  (function(){
    var dock = document.getElementById('deskDock');
    if (!dock) return;
    for (var i = 0; i < NAV.length; i++){
      (function(it){
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = it[1];
        b.addEventListener('click', function(){ open(it[0]); });
        dock.appendChild(b);
      })(NAV[i]);
    }
  })();

  /* ---------- 主题 ---------- */

  var cfg = {};
  try{ cfg = JSON.parse(localStorage.getItem('liwu.cfg3') || '{}') || {}; }catch(e){}
  var mode = cfg.theme === 'night' ? 'night' : 'paper';

  function applyMode(m){
    mode = m;
    document.body.setAttribute('data-theme', m);
    if (modeBtn) modeBtn.textContent = m === 'night' ? '预览：夜晚' : '预览：白天';
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', m === 'night' ? '#0E1015' : '#E8E1D3');
    try{
      var c = JSON.parse(localStorage.getItem('liwu.cfg3') || '{}') || {};
      c.theme = m;
      localStorage.setItem('liwu.cfg3', JSON.stringify(c));
    }catch(e){}
    pushNight(m === 'night');
  }

  if (modeBtn) modeBtn.addEventListener('click', function(){
    applyMode(mode === 'night' ? 'paper' : 'night');
  });

  applyMode(mode);

  /* ---------- 和场景对话 ---------- */

  var HIDE = ['side', 'wxp', 'cWx', 'cLab', 'island', 'homebar', 'cView'];

  function cleanUI(){
    try{
      var doc = scene.contentDocument;
      if (!doc) return;
      if (!doc.getElementById('liwu-hide')){
        var st = doc.createElement('style');
        st.id = 'liwu-hide';
        st.textContent = HIDE.map(function(id){ return '#' + id; }).join(',') + '{display:none !important}';
        (doc.head || doc.documentElement).appendChild(st);
      }
    }catch(e){}
  }

  function inner(){
    try{ return scene.contentWindow; }catch(e){ return null; }
  }

  function pushNight(night){
    var w = inner();
    if (!w) return;
    try{
      if (w.fuyue && w.fuyue.setAuto) w.fuyue.setAuto(false);
      if (w.__fy && w.__fy.set) w.__fy.set({ tod: night ? 'night' : 'day' });
    }catch(e){}
  }

  function feed(){
    var w = inner();
    if (!w || !w.fuyue) return false;

    var memos = (D.memory || []).slice(0, 3).map(function(x){ return x.title || ''; });
    var wt = D.weather || {};
    var wet = String(wt.text || '').indexOf('雨') >= 0;

    try{
      if (w.fuyue.setAuto) w.fuyue.setAuto(true);
      if (w.fuyue.setClock) w.fuyue.setClock(null);
      if (w.fuyue.setNotes && memos.length) w.fuyue.setNotes(memos);
      if (w.fuyue.setSpace) w.fuyue.setSpace(D.hero || '屋子不大，够两个人住。');
      if (w.fuyue.setBookPage){
        w.fuyue.setBookPage({
          left: '今天也写了一点点。',
          right: '你回来的时候，灯我留着。',
          title: '里屋',
          pages: ['01', '02']
        });
      }
      if (w.fuyue.setWeather) w.fuyue.setWeather({ wind: 0.22, rain: wet ? 0.32 : 0, snow: 0, thunder: 0 });
    }catch(e){}

    return true;
  }

  function waitScene(tries){
    cleanUI();
    if (feed()){
      if (boot){ boot.style.opacity = '0'; setTimeout(function(){ if (boot) boot.textContent = ''; }, 800); }
      return;
    }
    if (tries <= 0){
      if (boot) boot.textContent = '窗台还在下载。底部那排一样能用。';
      return;
    }
    setTimeout(function(){ waitScene(tries - 1); }, 500);
  }

  if (scene){
    scene.addEventListener('load', function(){ setTimeout(function(){ waitScene(30); }, 300); });
    setTimeout(function(){ waitScene(30); }, 1500);
  }

  if (lookUp){
    lookUp.addEventListener('click', function(){
      var doc = null;
      try{ doc = scene.contentDocument; }catch(e){}
      var b = doc && doc.getElementById('cView');
      if (b){ b.click(); return; }
      flash('窗外还在加载。');
    });
  }

  var clockEl = $('.clock');
  var lastTap = 0;
  if (clockEl){
    clockEl.addEventListener('click', function(){
      var now = Date.now();
      if (now - lastTap < 420){
        var doc = null;
        try{ doc = scene.contentDocument; }catch(e){}
        var b = doc && doc.getElementById('back');
        if (b) b.click(); else flash('已经在桌前了。');
      }
      lastTap = now;
    });
  }

  window.LIWU_SCENE = { open: open, setHome: setHome, feed: feed };

})();
