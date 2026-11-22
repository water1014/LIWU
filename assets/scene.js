/* 里屋 · 窗台场景的外壳
   场景用老师的（已去掉景深），外面这层全是我们的：
   顶部时间、右下“抬头”、底部五间房、点东西开我们自己的页。 */

(function(){
  'use strict';

  var D = window.LIWU || {};
  var $ = function(s){ return document.querySelector(s); };
  var p2 = function(n){ return n < 10 ? '0' + n : '' + n; };

  var wrap = document.getElementById('desk-wrap');
  var boot = document.getElementById('boot');
  var modeBtn = $('#hudMode');

  var WEEK = ['周日','周一','周二','周三','周四','周五','周六'];
  function paintClock(){
    var d = new Date(), t = $('#hudTime'), dt = $('#hudDate');
    if (t) t.textContent = p2(d.getHours()) + ':' + p2(d.getMinutes());
    if (dt) dt.textContent = (d.getMonth()+1) + '月' + d.getDate() + '日 · ' + WEEK[d.getDay()];
  }
  paintClock();
  setInterval(paintClock, 20000);

  /* ---------- 把场景装进来 ---------- */

  var frame = document.createElement('iframe');
  frame.id = 'scene';
  frame.src = 'windowsill/index.html';
  frame.setAttribute('allow', 'autoplay; fullscreen; accelerometer; gyroscope');
  frame.setAttribute('scrolling', 'no');
  frame.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;border:0;background:#0E1015;opacity:0;transition:opacity .7s ease;z-index:0;';
  wrap.insertBefore(frame, wrap.firstChild);

  var ready = false;
  frame.addEventListener('load', function(){
    frame.style.opacity = '1';
    if (boot) boot.textContent = '';
    // 藏掉它自带的控件，只留场景
    try{
      var d = frame.contentDocument;
      var s = d.createElement('style');
      s.textContent = [
        '#side,#wxp,#cWx,#cLab,#island,#homebar,#cView,#view,#hint,.hint,.tips,.tip,.toast,.panel,.ctrl,.bar,#ui,#hud',
        '{display:none!important}',
        'html,body{margin:0;padding:0;overflow:hidden;background:#0E1015}',
        'canvas{display:block}'
      ].join('');
      (d.head || d.documentElement).appendChild(s);
    }catch(e){}
    ready = true;
    feed(0);
  });

  /* ---------- 把我们的话喂进去 ---------- */

  function days(){
    var since = D.since || localStorage.getItem('liwu.since') || '';
    if (!since) return '';
    var t = Date.parse(String(since).replace(/\./g, '-'));
    if (isNaN(t)) return '';
    var n = Math.floor((Date.now() - t) / 86400000);
    return n >= 0 ? String(n) : '';
  }

  function feed(times){
    if (times > 40) return;
    var w = null;
    try{ w = frame.contentWindow; }catch(e){}
    if (w && w.fuyue){
      try{
        var f = w.fuyue;
        if (f.setSpace) f.setSpace('屋子不大，够两个人住。');
        if (f.setNotes) f.setNotes([
          { text: (D.hero || '屋子不大'), who: '里屋' },
          { text: '第 ' + (days() || '—') + ' 天', who: '' },
          { text: '外面在下雨', who: '' }
        ]);
        if (f.setWeather) f.setWeather({ rain: true, wind: 0.4, snow: false, thunder: false });
        return;
      }catch(e){}
    }
    setTimeout(function(){ feed(times + 1); }, 400);
  }

  /* ---------- 我们的层 ---------- */

  var fromHome = false;
  function open(key){
    if (!key) return;
    fromHome = false;
    if (key === 'chat'){
      document.body.classList.remove('home');
      var inp = document.getElementById('input');
      if (inp) setTimeout(function(){ inp.focus(); }, 160);
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

  var NAV = [['chat','说话'],['diary','日记'],['album','相册'],['memory','记忆'],['settings','设置']];
  var dock = document.getElementById('deskDock');
  if (dock && !dock.childNodes.length){
    for (var i = 0; i < NAV.length; i++){
      (function(it){
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = it[1];
        b.addEventListener('click', function(){ open(it[0]); });
        dock.appendChild(b);
      })(NAV[i]);
    }
  }

  // 右下角：抬头看窗外（交给它自己的接口，不自己实现）
  var up = document.createElement('button');
  up.type = 'button';
  up.className = 'pill up-btn';
  up.textContent = '抬头看窗外';
  up.addEventListener('click', function(){
    try{
      var w = frame.contentWindow;
      if (w && w.__fy && w.__fy.set) w.__fy.set({ view: 'window' });
      else if (w && w.fuyue && w.fuyue.lookUp) w.fuyue.lookUp();
    }catch(e){}
  });
  wrap.appendChild(up);

  if (modeBtn) modeBtn.style.display = 'none';

})();
