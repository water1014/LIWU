/* 里屋 · 3D 桌面（three.js）
   一张平放的桌子，报纸、拍立得、便签、唱片机、工牌摆在上面。
   拖东西：射线打桌面平面，物件跟着交点走；松开就落回去，位置存本机。
   点一下（没拖）：进对应的那一间。
   双击抬头时间：全部回原位。
   报上的字是画在 canvas 纹理上的，内容从 data.js 来。 */

(async function(){
  'use strict';

  var D = window.LIWU || {};
  var NL = String.fromCharCode(10);
  var K_LAYOUT = 'liwu.desk.layout';

  function $(s){ return document.querySelector(s); }

  var canvas = document.getElementById('stage');
  var boot = document.getElementById('boot');
  var modeBtn = document.getElementById('hudMode');

  /* ============ 抬头与底部（先做，不依赖 three） ============ */

  var WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  function p2(n){ return n < 10 ? '0' + n : '' + n; }

  function paintClock(){
    var d = new Date();
    var t = $('#hudTime'), dt = $('#hudDate');
    if (t) t.textContent = p2(d.getHours()) + ':' + p2(d.getMinutes());
    if (dt) dt.textContent = (d.getMonth() + 1) + '月' + d.getDate() + '日 · ' + WEEK[d.getDay()];
  }
  paintClock();
  setInterval(paintClock, 20000);

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
    if (on){
      document.body.classList.add('home');
      refreshTexts();
      fit();
    } else {
      document.body.classList.remove('home');
    }
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

  var ITEMS = [['chat', '说话'], ['diary', '日记'], ['album', '相册'], ['memory', '记忆'], ['settings', '设置']];
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

  /* ============ 主题（先读出来，做纹理要用） ============ */

  var cfgCache = {};
  try{ cfgCache = JSON.parse(localStorage.getItem('liwu.cfg3') || '{}') || {}; }catch(e){}
  var mode = cfgCache.theme === 'night' ? 'night' : 'paper';

  function applyMode(m){
    mode = m;
    document.body.setAttribute('data-theme', m);
    if (modeBtn) modeBtn.textContent = m === 'night' ? '预览：夜晚' : '预览：白天';
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', m === 'night' ? '#14120F' : '#EFE9DC');
    try{
      var c = JSON.parse(localStorage.getItem('liwu.cfg3') || '{}') || {};
      c.theme = m;
      localStorage.setItem('liwu.cfg3', JSON.stringify(c));
    }catch(e){}
  }
  applyMode(mode);

  if (modeBtn) modeBtn.addEventListener('click', function(){
    applyMode(mode === 'night' ? 'paper' : 'night');
    restyle();
  });

  /* ============ 拉 three ============ */

  var CDNS = [
    'https://unpkg.com/three@0.160.0/build/three.module.js',
    'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
    'https://esm.sh/three@0.160.0'
  ];

  var THREE = null;
  for (var ci = 0; ci < CDNS.length; ci++){
    try{
      var lib = await import(CDNS[ci]);
      if (lib && lib.Scene){ THREE = lib; break; }
    }catch(e){}
  }

  if (!THREE){
    if (boot) boot.textContent = '3D 没加载出来。底部那排一样能用。';
    return;
  }

  /* ============ 调色 ============ */

  var P = {
    deskDay: 0xEFE9DC,
    deskNight: 0x1A1815,
    paperDay: 0xFCFAF3,
    paperNight: 0x24211C,
    inkDay: '#2A2620',
    inkNight: '#E7E2D6',
    subDay: '#8A7E68',
    subNight: '#7C7466'
  };

  function ink(){ return mode === 'night' ? P.inkNight : P.inkDay; }
  function sub(){ return mode === 'night' ? P.subNight : P.subDay; }

  /* ============ 渲染器 ============ */

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(mode === 'night' ? P.deskNight : P.deskDay);

  var camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 60);

  /* ============ 灯 ============ */

  var hemi = new THREE.HemisphereLight(0xFFF6E6, 0x8C8272, 0.95);
  scene.add(hemi);

  var key = new THREE.DirectionalLight(0xFFF1D8, 1.25);
  key.position.set(-2.4, 6.5, 3.2);
  key.castShadow = true;
  key.shadow.mapSize.width = 1024;
  key.shadow.mapSize.height = 1024;
  key.shadow.camera.left = -3.2;
  key.shadow.camera.right = 3.2;
  key.shadow.camera.top = 3.4;
  key.shadow.camera.bottom = -3.4;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 18;
  key.shadow.bias = -0.0012;
  scene.add(key);

  /* ============ 桌面 ============ */

  function paperTexture(base, speck){
    var c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    var g = c.getContext('2d');
    g.fillStyle = base;
    g.fillRect(0, 0, 128, 128);
    for (var i = 0; i < 900; i++){
      var x = Math.random() * 128, y = Math.random() * 128;
      g.fillStyle = 'rgba(' + speck + ',' + (0.02 + Math.random() * 0.05).toFixed(3) + ')';
      g.fillRect(x, y, 1, 1);
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(7, 7);
    if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  var deskMat = new THREE.MeshStandardMaterial({
    map: paperTexture('#EFE9DC', '120,100,70'),
    roughness: 0.97,
    metalness: 0
  });

  var desk = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), deskMat);
  desk.rotation.x = -Math.PI / 2;
  desk.receiveShadow = true;
  scene.add(desk);

  /* ============ 画字的东西 ============ */

  function makeCanvas(w, h){
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function tex(c){
    var t = new THREE.CanvasTexture(c);
    if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  function roundRect(g, x, y, w, h, r){
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  var SERIF = 'Noto Serif SC, Songti SC, serif';
  var NUM = 'Cormorant Garamond, Songti SC, Georgia, serif';

  /* ---- 报纸 ---- */

  var paperCanvas = null, paperTex = null;
  var photoBig = null, photoSmall = null;

  function drawPaper(){
    var W = 1024, H = 720;
    var c = paperCanvas || makeCanvas(W, H);
    paperCanvas = c;
    var g = c.getContext('2d');

    g.fillStyle = mode === 'night' ? '#24211C' : '#FCFAF3';
    g.fillRect(0, 0, W, H);

    g.strokeStyle = mode === 'night' ? 'rgba(231,226,214,.18)' : 'rgba(120,100,70,.26)';
    g.lineWidth = 1;

    g.textAlign = 'center';
    g.fillStyle = ink();
    g.font = '500 62px ' + SERIF;
    g.fillText('里屋早报', W / 2, 96);

    g.fillStyle = sub();
    g.font = '400 15px ' + NUM;
    g.fillText('T H E   L I W U   M O R N I N G   P O S T', W / 2, 130);

    g.beginPath(); g.moveTo(56, 158); g.lineTo(W - 56, 158); g.stroke();

    // 两栏
    var colL = 56, colR = 520, colW = 460;

    g.textAlign = 'left';
    g.fillStyle = sub();
    g.font = '400 17px ' + SERIF;
    g.fillText('备忘  NOTES', colL, 196);
    g.fillText('今天  TODAY', colR, 196);

    g.fillStyle = ink();
    var memos = (D.memory || []).slice(0, 4);
    var y = 240;
    for (var i = 0; i < memos.length; i++){
      g.fillStyle = sub();
      g.font = '400 15px ' + SERIF;
      g.fillText('○', colL, y);

      g.fillStyle = ink();
      g.font = '400 21px ' + SERIF;
      g.fillText(String(memos[i].title || '').slice(0, 14), colL + 26, y);

      var body = String(memos[i].body || '').slice(0, 20);
      if (body){
        g.fillStyle = sub();
        g.font = '400 14px ' + SERIF;
        g.fillText(body, colL + 26, y + 26);
      }
      y += 92;
    }

    // 右栏大图
    var iw = 444, ih = 300, ix = colR, iy = 218;
    g.fillStyle = mode === 'night' ? '#2A2620' : '#E7DFCE';
    g.fillRect(ix, iy, iw, ih);

    if (photoBig && photoBig.ok){
      drawCover(g, photoBig.img, ix, iy, iw, ih);
    } else {
      g.fillStyle = sub();
      g.font = '400 18px ' + SERIF;
      g.textAlign = 'center';
      g.fillText('把照片放进来', ix + iw / 2, iy + ih / 2 - 12);
      g.fillText('它就贴在这儿', ix + iw / 2, iy + ih / 2 + 18);
      g.textAlign = 'left';
    }

    g.fillStyle = sub();
    g.font = '400 14px ' + SERIF;
    var capText = (photoBig && photoBig.ok && D.album && D.album[0])
      ? (D.album[0].caption || D.album[0].date || '')
      : '还没有照片';
    g.fillText(capText, ix, iy + ih + 28);

    // 页脚
    g.beginPath(); g.moveTo(56, 612); g.lineTo(W - 56, 612); g.stroke();

    var w = D.weather || {};
    g.fillStyle = ink();
    g.font = 'italic 400 40px ' + NUM;
    g.fillText(w.temp || '—', 56, 672);

    g.fillStyle = sub();
    g.font = '400 16px ' + SERIF;
    g.fillText(w.text || '', 148, 668);

    var c2 = dayCount();
    g.textAlign = 'right';
    g.font = 'italic 400 22px ' + NUM;
    g.fillText(c2 ? ('第 ' + c2 + ' 天') : '第 — 天', W - 56, 668);
    g.textAlign = 'left';

    if (paperTex) paperTex.dispose();
    paperTex = tex(c);
    if (paperMesh) paperMesh.material.map = paperTex, paperMesh.material.needsUpdate = true;
  }

  function drawCover(g, img, x, y, w, h){
    var s = Math.max(w / img.width, h / img.height);
    var dw = img.width * s, dh = img.height * s;
    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    g.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    g.restore();
  }

  /* ---- 拍立得 ---- */

  var polaroidCanvas = null, polaroidTex = null;

  function drawPolaroid(){
    var W = 512, H = 620;
    var c = polaroidCanvas || makeCanvas(W, H);
    polaroidCanvas = c;
    var g = c.getContext('2d');

    g.fillStyle = mode === 'night' ? '#242018' : '#FFFDF7';
    g.fillRect(0, 0, W, H);

    var px = 34, py = 34, pw = W - 68, ph = W - 68;
    g.fillStyle = mode === 'night' ? '#2A2620' : '#E7DFCE';
    g.fillRect(px, py, pw, ph);

    if (photoSmall && photoSmall.ok){
      drawCover(g, photoSmall.img, px, py, pw, ph);
    }

    g.fillStyle = sub();
    g.textAlign = 'center';
    g.font = 'italic 400 30px ' + NUM;
    g.fillText('our room', W / 2, H - 62);
    g.textAlign = 'left';

    if (polaroidTex) polaroidTex.dispose();
    polaroidTex = tex(c);
    if (polaroidMesh) polaroidMesh.material.map = polaroidTex, polaroidMesh.material.needsUpdate = true;
  }

  /* ---- 便签 ---- */

  var noteCanvas = null, noteTex = null;

  function drawNote(){
    var W = 512, H = 600;
    var c = noteCanvas || makeCanvas(W, H);
    noteCanvas = c;
    var g = c.getContext('2d');

    g.fillStyle = mode === 'night' ? '#3E3922' : '#F5E8A4';
    g.fillRect(0, 0, W, H);

    g.strokeStyle = mode === 'night' ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.55)';
    for (var y = 90; y < H - 60; y += 62){
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    }

    g.fillStyle = mode === 'night' ? '#E3D9A8' : '#5C5233';
    g.font = '400 34px ' + SERIF;
    g.fillText('今天想说的话', 44, 74);

    g.fillStyle = mode === 'night' ? '#948A56' : '#8C7C40';
    g.font = '400 24px ' + SERIF;
    g.fillText('写一句 →', 44, H - 46);

    if (noteTex) noteTex.dispose();
    noteTex = tex(c);
    if (noteMesh) noteMesh.material.map = noteTex, noteMesh.material.needsUpdate = true;
  }

  /* ---- 工牌 ---- */

  var tagCanvas = null, tagTex = null;

  function drawTag(){
    var W = 400, H = 520;
    var c = tagCanvas || makeCanvas(W, H);
    tagCanvas = c;
    var g = c.getContext('2d');

    g.fillStyle = mode === 'night' ? '#221F1B' : '#FBF8F0';
    g.fillRect(0, 0, W, H);

    g.strokeStyle = mode === 'night' ? 'rgba(231,226,214,.18)' : 'rgba(120,100,70,.3)';
    g.lineWidth = 3;
    roundRect(g, 136, 26, 128, 34, 17);
    g.stroke();

    g.fillStyle = ink();
    g.textAlign = 'center';
    g.font = '400 58px ' + SERIF;
    g.fillText('里屋', W / 2, 268);

    g.fillStyle = sub();
    g.font = 'italic 400 26px ' + NUM;
    g.fillText('L I W U', W / 2, 322);

    g.strokeStyle = mode === 'night' ? 'rgba(231,226,214,.22)' : 'rgba(120,100,70,.26)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(120, 366); g.lineTo(W - 120, 366); g.stroke();
    g.textAlign = 'left';

    if (tagTex) tagTex.dispose();
    tagTex = tex(c);
    if (tagMesh) tagMesh.material.map = tagTex, tagMesh.material.needsUpdate = true;
  }

  /* ---- 图片预载 ---- */

  function loadPhoto(src, cb){
    if (!src) return;
    var img = new Image();
    img.onload = function(){ cb({ ok: true, img: img }); };
    img.onerror = function(){};
    img.src = src;
  }

  function loadPhotos(){
    var list = D.album || [];
    if (list[0] && list[0].src) loadPhoto(list[0].src, function(o){ photoBig = o; drawPaper(); });
    var second = list[1] || list[0];
    if (second && second.src) loadPhoto(second.src, function(o){ photoSmall = o; drawPolaroid(); });
  }

  /* ============ 桌面上的东西 ============ */

  var things = [];

  function buildPaper(){
    drawPaper();
    var mat = new THREE.MeshStandardMaterial({ map: paperTex, roughness: 0.95, metalness: 0 });
    var m = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.012, 1.83), mat);
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.key = 'memory';
    return m;
  }

  var paperMesh = null, polaroidMesh = null, noteMesh = null, tagMesh = null;

  function buildPolaroid(){
    drawPolaroid();
    var mat = new THREE.MeshStandardMaterial({ map: polaroidTex, roughness: 0.95, metalness: 0 });
    var m = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.014, 0.75), mat);
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.key = 'album';
    return m;
  }

  function buildNote(){
    drawNote();
    var mat = new THREE.MeshStandardMaterial({ map: noteTex, roughness: 0.98, metalness: 0 });
    var m = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.014, 0.66), mat);
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.key = 'diary';
    return m;
  }

  function buildTag(){
    drawTag();
    var mat = new THREE.MeshStandardMaterial({ map: tagTex, roughness: 0.9, metalness: 0 });
    var m = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.016, 0.57), mat);
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.key = 'settings';
    return m;
  }

  function buildVinyl(){
    var g = new THREE.Group();

    var base = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.05, 0.56),
      new THREE.MeshStandardMaterial({ color: mode === 'night' ? 0x242019 : 0xE4DED1, roughness: 0.9 })
    );
    base.position.y = 0.025;
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);

    var disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.012, 40),
      new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.45, metalness: 0.1 })
    );
    disc.position.set(-0.02, 0.056, 0.02);
    disc.castShadow = true;
    g.add(disc);

    var label = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.072, 0.014, 28),
      new THREE.MeshStandardMaterial({ color: 0xB2452F, roughness: 0.8 })
    );
    label.position.set(-0.02, 0.058, 0.02);
    g.add(label);

    var arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.012, 0.016),
      new THREE.MeshStandardMaterial({ color: 0xA39A8A, roughness: 0.6, metalness: 0.3 })
    );
    arm.position.set(0.2, 0.07, -0.16);
    arm.rotation.y = -0.5;
    arm.castShadow = true;
    g.add(arm);

    g.userData.key = 'chat';
    g.userData.spin = disc;
    return g;
  }

  /* ============ 摆位 ============ */

  var HOME = {
    paper: { x: 0, z: -0.95, ry: 0.012 },
    polaroid: { x: -1.15, z: 0.62, ry: -0.062 },
    note: { x: 1.16, z: 0.5, ry: 0.042 },
    vinyl: { x: 1.02, z: 1.72, ry: -0.02 },
    tag: { x: -1.16, z: 1.78, ry: 0.05 }
  };

  var layout = {};
  try{ layout = JSON.parse(localStorage.getItem(K_LAYOUT) || '{}') || {}; }catch(e){ layout = {}; }

  function saveLayout(){ try{ localStorage.setItem(K_LAYOUT, JSON.stringify(layout)); }catch(e){} }

  paperMesh = buildPaper();
  polaroidMesh = buildPolaroid();
  noteMesh = buildNote();
  tagMesh = buildTag();
  var vinylMesh = buildVinyl();

  var registry = [
    { key: 'paper', obj: paperMesh, y: 0.008 },
    { key: 'polaroid', obj: polaroidMesh, y: 0.012 },
    { key: 'note', obj: noteMesh, y: 0.012 },
    { key: 'vinyl', obj: vinylMesh, y: 0 },
    { key: 'tag', obj: tagMesh, y: 0.014 }
  ];

  registry.forEach(function(r){
    var home = HOME[r.key];
    var pos = layout[r.key] || { x: home.x, z: home.z };
    r.obj.position.set(pos.x, r.y, pos.z);
    r.obj.rotation.y = home.ry;
    r.obj.userData.home = home;
    r.obj.userData.baseY = r.y;
    r.obj.userData.regKey = r.key;
    scene.add(r.obj);
    things.push(r.obj);
  });

  /* ============ 灯光/材质跟着日夜变 ============ */

  function restyle(){
    scene.background = new THREE.Color(mode === 'night' ? P.deskNight : P.deskDay);
    deskMat.map.dispose();
    deskMat.map = paperTexture(mode === 'night' ? '#1A1815' : '#EFE9DC', mode === 'night' ? '231,226,214' : '120,100,70');
    deskMat.needsUpdate = true;
    hemi.intensity = mode === 'night' ? 0.42 : 0.95;
    key.intensity = mode === 'night' ? 0.5 : 1.25;
    key.color.setHex(mode === 'night' ? 0xBFCBE0 : 0xFFF1D8);
    vinylMesh.children[0].material.color.setHex(mode === 'night' ? 0x242019 : 0xE4DED1);
    drawPaper(); drawPolaroid(); drawNote(); drawTag();
    render();
  }

  function refreshTexts(){
    drawPaper();
    drawPolaroid();
    render();
  }

  /* ============ 相机 ============ */

  function fit(){
    var w = window.innerWidth, h = window.innerHeight;
    if (!w || !h) return;
    var a = w / h;
    camera.aspect = a;
    camera.fov = a < 0.8 ? 60 : 44;
    camera.updateProjectionMatrix();

    var vFov = camera.fov * Math.PI / 180;
    var hFov = 2 * Math.atan(Math.tan(vFov / 2) * a);
    var needW = 3.9;
    var dist = (needW / 2) / Math.tan(hFov / 2);
    dist = Math.max(dist, 5.2);
    dist = Math.min(dist, 26);

    var pitch = 58 * Math.PI / 180;
    camera.position.set(0, Math.sin(pitch) * dist, Math.cos(pitch) * dist);
    camera.lookAt(0, 0, 0.15);
    renderer.setSize(w, h, false);
    render();
  }

  /* ============ 渲染 ============ */

  var raf = null;
  function render(){
    if (raf) return;
    raf = requestAnimationFrame(function(){
      raf = null;
      renderer.render(scene, camera);
    });
  }

  var spinT = 0;
  function loop(t){
    requestAnimationFrame(loop);
    if (!document.body.classList.contains('home')) return;
    spinT = t * 0.0006;
    vinylMesh.userData.spin.rotation.y = spinT;
    renderer.render(scene, camera);
  }

  /* ============ 拖与点 ============ */

  var ray = new THREE.Raycaster();
  var ndc = new THREE.Vector2();
  var planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  var hitPoint = new THREE.Vector3();

  var dragObj = null;
  var dragOffset = new THREE.Vector3();
  var downX = 0, downY = 0, moved = false;

  function toDesk(x, y){
    ndc.x = (x / window.innerWidth) * 2 - 1;
    ndc.y = -(y / window.innerHeight) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(planeY, hitPoint)) return hitPoint.clone();
    return null;
  }

  function pickThing(x, y){
    ndc.x = (x / window.innerWidth) * 2 - 1;
    ndc.y = -(y / window.innerHeight) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    var hits = ray.intersectObjects(things, true);
    if (!hits.length) return null;
    var o = hits[0].object;
    while (o && !o.userData.regKey) o = o.parent;
    return o || null;
  }

  canvas.addEventListener('pointerdown', function(ev){
    downX = ev.clientX; downY = ev.clientY; moved = false;
    var t = pickThing(ev.clientX, ev.clientY);
    if (!t) return;
    dragObj = t;
    var p = toDesk(ev.clientX, ev.clientY);
    if (p){
      dragOffset.set(t.position.x - p.x, 0, t.position.z - p.z);
    } else {
      dragOffset.set(0, 0, 0);
    }
    try{ canvas.setPointerCapture(ev.pointerId); }catch(e){}
  });

  canvas.addEventListener('pointermove', function(ev){
    if (!dragObj) return;
    var dx = ev.clientX - downX;
    var dy = ev.clientY - downY;
    if (!moved && (Math.abs(dx) > 7 || Math.abs(dy) > 7)){
      moved = true;
      dragObj.position.y = dragObj.userData.baseY + 0.09;
    }
    if (!moved) return;
    var p = toDesk(ev.clientX, ev.clientY);
    if (!p) return;
    dragObj.position.x = Math.max(-1.75, Math.min(1.75, p.x + dragOffset.x));
    dragObj.position.z = Math.max(-2.25, Math.min(2.25, p.z + dragOffset.z));
    render();
  });

  function endDrag(ev){
    if (!dragObj) return;
    var o = dragObj;
    dragObj = null;

    if (moved){
      o.position.y = o.userData.baseY;
      layout[o.userData.regKey] = { x: o.position.x, z: o.position.z };
      saveLayout();
      render();
      return;
    }

    var key = o.userData.key;
    if (key === 'memory'){
      var p = toDesk(ev.clientX, ev.clientY);
      if (p && p.x > 0.05) key = 'album';
      else key = 'memory';
    }
    open(key);
  }

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', function(){
    if (dragObj){ dragObj.position.y = dragObj.userData.baseY; dragObj = null; render(); }
  });

  /* ============ 双击时间复位 ============ */

  var clockEl = $('.clock');
  var lastTap = 0;
  if (clockEl){
    clockEl.addEventListener('click', function(){
      var now = Date.now();
      if (now - lastTap < 420){
        layout = {};
        saveLayout();
        registry.forEach(function(r){
          var h = r.obj.userData.home;
          r.obj.position.set(h.x, r.obj.userData.baseY, h.z);
          r.obj.rotation.y = h.ry;
        });
        render();
        flash('摆回原来的位置了。');
      }
      lastTap = now;
    });
  }

  /* ============ 起飞 ============ */

  window.addEventListener('resize', fit);
  fit();
  loadPhotos();

  setTimeout(function(){
    if (boot) boot.textContent = '';
  }, 1200);

  requestAnimationFrame(loop);

})();
