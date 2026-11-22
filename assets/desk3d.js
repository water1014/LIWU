/* 里屋 · 3D 桌面（three.js）
   一张平放的桌子。桌上摆着一本杂志、一张压在杂志下的旧纸、一张拍立得、一张便签、一台唱片机、一张工牌。
   拖东西：射线打桌面平面，物件跟着交点走；松开落回去，位置存本机。
   点一下（没拖）：进对应那一间。双击抬头时间：全部回原位。 */

(async function(){
  'use strict';

  var D = window.LIWU || {};
  var K_LAYOUT = 'liwu.desk.layout';

  function $(s){ return document.querySelector(s); }
  function p2(n){ return n < 10 ? '0' + n : '' + n; }

  var canvas = document.getElementById('stage');
  var boot = document.getElementById('boot');
  var modeBtn = $('#hudMode');

  /* ============ 抬头 / 底部 / 跳转（不依赖 three） ============ */

  var WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

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
      redrawAll();
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

  var NAV = [['chat', '说话'], ['diary', '日记'], ['album', '相册'], ['memory', '记忆'], ['settings', '设置']];
  (function buildDock(){
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

  /* ============ 日夜 ============ */

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

  /* ============ three ============ */

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

  function ink(){ return mode === 'night' ? '#E7E2D6' : '#2A2620'; }
  function sub(){ return mode === 'night' ? '#7C7466' : '#8A7E68'; }
  function paperBG(){ return mode === 'night' ? '#24211C' : '#FCFAF3'; }

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(mode === 'night' ? 0x14120F : 0xEFE9DC);

  var camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 60);

  var hemi = new THREE.HemisphereLight(0xFFF6E6, 0x8C8272, 0.95);
  scene.add(hemi);

  var key = new THREE.DirectionalLight(0xFFF1D8, 1.3);
  key.position.set(-2.6, 6.4, 3.0);
  key.castShadow = true;
  key.shadow.mapSize.width = 1024;
  key.shadow.mapSize.height = 1024;
  key.shadow.camera.left = -3.4;
  key.shadow.camera.right = 3.4;
  key.shadow.camera.top = 3.6;
  key.shadow.camera.bottom = -3.6;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 20;
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
      g.fillStyle = 'rgba(' + speck + ',' + (0.02 + Math.random() * 0.05).toFixed(3) + ')';
      g.fillRect(Math.random() * 128, Math.random() * 128, 1, 1);
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(7, 7);
    if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  var deskMat = new THREE.MeshStandardMaterial({
    map: paperTexture('#EFE9DC', '120,100,70'),
    roughness: 0.97, metalness: 0
  });

  var desk = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), deskMat);
  desk.rotation.x = -Math.PI / 2;
  desk.receiveShadow = true;
  scene.add(desk);

  /* ============ 画布工具 ============ */

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
  function drawCover(g, img, x, y, w, h){
    var s = Math.max(w / img.width, h / img.height);
    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    g.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s);
    g.restore();
  }

  var SERIF = 'Noto Serif SC, Songti SC, serif';
  var NUM = 'Cormorant Garamond, Songti SC, Georgia, serif';
  var RED = '#8A3B2C';

  var cover = null, coverTex = null;
  var shotBig = null, shotSmall = null;

  /* ---- 杂志封面 ---- */

  function drawMagazine(){
    var W = 760, H = 1014;
    var c = cover || makeCanvas(W, H);
    cover = c;
    var g = c.getContext('2d');

    g.fillStyle = paperBG();
    g.fillRect(0, 0, W, H);

    g.textAlign = 'left';
    g.fillStyle = ink();
    g.font = '500 76px ' + SERIF;
    g.fillText('里屋', 54, 118);

    g.fillStyle = RED;
    g.fillRect(54, 134, 34, 3);

    g.fillStyle = sub();
    g.font = '400 14px ' + NUM;
    g.fillText('L I W U   —   A   S M A L L   R O O M', 100, 140);

    g.textAlign = 'right';
    g.fillStyle = ink();
    g.font = 'italic 400 19px ' + NUM;
    g.fillText('VOL. 01', W - 54, 94);
    g.fillStyle = sub();
    g.font = '400 13px ' + NUM;
    g.fillText('2026 · 11', W - 54, 118);
    g.textAlign = 'left';

    g.strokeStyle = mode === 'night' ? 'rgba(231,226,214,.2)' : 'rgba(120,100,70,.28)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(54, 168); g.lineTo(W - 54, 168); g.stroke();

    var ix = 54, iy = 192, iw = W - 108, ih = 512;
    g.fillStyle = mode === 'night' ? '#2A2620' : '#E4DCCC';
    g.fillRect(ix, iy, iw, ih);

    if (shotBig && shotBig.ok){
      drawCover(g, shotBig.img, ix, iy, iw, ih);
    } else {
      g.fillStyle = sub();
      g.textAlign = 'center';
      g.font = '400 19px ' + SERIF;
      g.fillText('封面还空着', ix + iw / 2, iy + ih / 2 - 8);
      g.font = '400 14px ' + SERIF;
      g.fillText('放一张图进去，它就上封面', ix + iw / 2, iy + ih / 2 + 26);
      g.textAlign = 'left';
    }

    g.fillStyle = ink();
    g.font = '400 33px ' + SERIF;
    g.fillText(D.hero || '屋子不大，够两个人住。', 54, 776);

    var capText = (shotBig && shotBig.ok && D.album && D.album[0])
      ? (D.album[0].caption || D.album[0].date || '')
      : '本期封面';
    g.fillStyle = sub();
    g.font = '400 14px ' + SERIF;
    g.fillText(capText, 54, 808);

    g.beginPath(); g.moveTo(54, 842); g.lineTo(W - 54, 842); g.stroke();

    g.fillStyle = sub();
    g.font = '400 13px ' + SERIF;
    g.fillText('本期要目   IN THIS ISSUE', 54, 874);

    var memos = (D.memory || []).slice(0, 3);
    var y = 912;
    for (var i = 0; i < memos.length; i++){
      g.fillStyle = ink();
      g.font = '400 19px ' + SERIF;
      g.fillText(String(memos[i].title || '').slice(0, 13), 54, y);
      g.fillStyle = sub();
      g.textAlign = 'right';
      g.font = 'italic 400 17px ' + NUM;
      g.fillText('0' + (i + 1), W - 54, y);
      g.textAlign = 'left';
      y += 30;
    }

    var w = D.weather || {};
    g.strokeStyle = mode === 'night' ? 'rgba(231,226,214,.2)' : 'rgba(120,100,70,.28)';
    g.beginPath(); g.moveTo(54, 986); g.lineTo(W - 54, 986); g.stroke();
    g.fillStyle = sub();
    g.font = '400 13px ' + NUM;
    g.fillText((w.temp || '—') + '   ' + (w.text || ''), 54, 1008);
    var dc = dayCount();
    g.textAlign = 'right';
    g.font = 'italic 400 15px ' + NUM;
    g.fillText(dc ? ('第 ' + dc + ' 天') : '第 — 天', W - 54, 1008);
    g.textAlign = 'left';

    if (coverTex) coverTex.dispose();
    coverTex = tex(c);
    if (magFace) { magFace.material.map = coverTex; magFace.material.needsUpdate = true; }
  }

  /* ---- 压在下头的旧纸（记忆） ---- */

  var underCanvas = null, underTex = null;

  function drawUnder(){
    var W = 760, H = 1014;
    var c = underCanvas || makeCanvas(W, H);
    underCanvas = c;
    var g = c.getContext('2d');

    g.fillStyle = mode === 'night' ? '#1F1C18' : '#EDE6D7';
    g.fillRect(0, 0, W, H);

    g.fillStyle = sub();
    g.font = '400 20px ' + SERIF;
    g.fillText('记   M E M O R Y', 54, 120);

    g.strokeStyle = mode === 'night' ? 'rgba(231,226,214,.12)' : 'rgba(120,100,70,.22)';
    for (var y = 170; y < H - 130; y += 46){
      g.beginPath(); g.moveTo(54, y); g.lineTo(W - 54, y); g.stroke();
    }

    g.fillStyle = sub();
    g.font = '400 15px ' + SERIF;
    g.fillText('怕忘的事，一句一件。', 54, H - 66);

    if (underTex) underTex.dispose();
    underTex = tex(c);
    if (underFace) { underFace.material.map = underTex; underFace.material.needsUpdate = true; }
  }

  /* ---- 拍立得 ---- */

  var polCanvas = null, polTex = null;

  function drawPolaroid(){
    var W = 512, H = 620;
    var c = polCanvas || makeCanvas(W, H);
    polCanvas = c;
    var g = c.getContext('2d');

    g.fillStyle = mode === 'night' ? '#242018' : '#FFFDF7';
    g.fillRect(0, 0, W, H);

    var px = 34, py = 34, pw = W - 68, ph = W - 68;
    g.fillStyle = mode === 'night' ? '#2A2620' : '#E7DFCE';
    g.fillRect(px, py, pw, ph);

    if (shotSmall && shotSmall.ok) drawCover(g, shotSmall.img, px, py, pw, ph);

    g.fillStyle = sub();
    g.textAlign = 'center';
    g.font = 'italic 400 30px ' + NUM;
    g.fillText('our room', W / 2, H - 62);
    g.textAlign = 'left';

    if (polTex) polTex.dispose();
    polTex = tex(c);
    if (polFace) { polFace.material.map = polTex; polFace.material.needsUpdate = true; }
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

    g.strokeStyle = mode === 'night' ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.6)';
    for (var y = 96; y < H - 70; y += 62){
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
    if (noteFace) { noteFace.material.map = noteTex; noteFace.material.needsUpdate = true; }
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

    g.strokeStyle = mode === 'night' ? 'rgba(231,226,214,.2)' : 'rgba(120,100,70,.32)';
    g.lineWidth = 3;
    roundRect(g, 136, 26, 128, 34, 17);
    g.stroke();

    g.fillStyle = ink();
    g.textAlign = 'center';
    g.font = '400 58px ' + SERIF;
    g.fillText('里屋', W / 2, 262);

    g.fillStyle = sub();
    g.font = 'italic 400 26px ' + NUM;
    g.fillText('L I W U', W / 2, 316);

    g.strokeStyle = mode === 'night' ? 'rgba(231,226,214,.22)' : 'rgba(120,100,70,.26)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(120, 360); g.lineTo(W - 120, 360); g.stroke();
    g.textAlign = 'left';

    if (tagTex) tagTex.dispose();
    tagTex = tex(c);
    if (tagFace) { tagFace.material.map = tagTex; tagFace.material.needsUpdate = true; }
  }

  /* ============ 物件 ============ */

  var magMesh = null, magFace = null;
  var underMesh = null, underFace = null;
  var polMesh = null, polFace = null;
  var noteMesh = null, noteFace = null;
  var tagMesh = null, tagFace = null;
  var vinylMesh = null;

  function sheet(w, h, th, texture, tint){
    var g = new THREE.Group();

    var body = new THREE.Mesh(
      new THREE.BoxGeometry(w, th, h),
      new THREE.MeshStandardMaterial({ color: tint, roughness: 0.95 })
    );
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    var face = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 })
    );
    face.rotation.x = -Math.PI / 2;
    face.position.y = th / 2 + 0.0015;
    face.receiveShadow = true;
    g.add(face);

    g.userData.face = face;
    return g;
  }

  drawMagazine();
  drawUnder();
  drawPolaroid();
  drawNote();
  drawTag();

  magMesh = sheet(1.5, 2.0, 0.012, coverTex, mode === 'night' ? 0x24211C : 0xFCFAF3);
  magFace = magMesh.userData.face;
  magMesh.userData.key = 'album';
  scene.add(magMesh);

  underMesh = sheet(1.44, 1.94, 0.008, underTex, mode === 'night' ? 0x1F1C18 : 0xEDE6D7);
  underFace = underMesh.userData.face;
  underMesh.userData.key = 'memory';
  scene.add(underMesh);

  polMesh = sheet(0.62, 0.75, 0.01, polTex, mode === 'night' ? 0x242018 : 0xFFFDF7);
  polFace = polMesh.userData.face;
  polMesh.userData.key = 'album';
  scene.add(polMesh);

  noteMesh = sheet(0.56, 0.66, 0.014, noteTex, mode === 'night' ? 0x3E3922 : 0xF5E8A4);
  noteFace = noteMesh.userData.face;
  noteMesh.userData.key = 'diary';
  scene.add(noteMesh);

  tagMesh = sheet(0.44, 0.57, 0.016, tagTex, mode === 'night' ? 0x221F1B : 0xFBF8F0);
  tagFace = tagMesh.userData.face;
  tagMesh.userData.key = 'settings';
  scene.add(tagMesh);

  vinylMesh = (function(){
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
    disc.position.set(-0.04, 0.056, 0.02);
    disc.castShadow = true;
    g.add(disc);

    var label = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.072, 0.016, 28),
      new THREE.MeshStandardMaterial({ color: 0xB2452F, roughness: 0.8 })
    );
    label.position.set(-0.04, 0.058, 0.02);
    g.add(label);

    var arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.012, 0.016),
      new THREE.MeshStandardMaterial({ color: 0xA39A8A, roughness: 0.6, metalness: 0.3 })
    );
    arm.position.set(0.2, 0.072, -0.16);
    arm.rotation.y = -0.5;
    arm.castShadow = true;
    g.add(arm);

    g.userData.key = 'chat';
    g.userData.spin = disc;
    g.userData.baseBox = base;
    return g;
  })();
  scene.add(vinylMesh);

  /* ============ 摆位 ============ */

  var HOME = {
    mag: { x: 0, z: 0.02, ry: 0.008 },
    under: { x: 0.04, z: 0.07, ry: 0.07 },
    polaroid: { x: -1.26, z: -1.42, ry: -0.07 },
    note: { x: 1.22, z: -1.45, ry: 0.05 },
    vinyl: { x: 1.04, z: 1.56, ry: -0.02 },
    tag: { x: -1.22, z: 1.5, ry: 0.06 }
  };

  var layout = {};
  try{ layout = JSON.parse(localStorage.getItem(K_LAYOUT) || '{}') || {}; }catch(e){ layout = {}; }
  function saveLayout(){ try{ localStorage.setItem(K_LAYOUT, JSON.stringify(layout)); }catch(e){} }

  var things = [];

  function place(key, obj, y){
    var home = HOME[key];
    var pos = layout[key] || { x: home.x, z: home.z };
    obj.position.set(pos.x, y, pos.z);
    obj.rotation.y = home.ry;
    obj.userData.home = home;
    obj.userData.baseY = y;
    obj.userData.regKey = key;
    things.push(obj);
  }

  place('under', underMesh, 0.002);
  place('mag', magMesh, 0.01);
  place('polaroid', polMesh, 0.004);
  place('note', noteMesh, 0.006);
  place('vinyl', vinylMesh, 0);
  place('tag', tagMesh, 0.008);

  /* ============ 重绘 / 换肤色 ============ */

  function redrawAll(){
    drawMagazine(); drawUnder(); drawPolaroid(); drawNote(); drawTag();
    render();
  }

  function restyle(){
    scene.background = new THREE.Color(mode === 'night' ? 0x14120F : 0xEFE9DC);
    deskMat.map.dispose();
    deskMat.map = paperTexture(mode === 'night' ? '#14120F' : '#EFE9DC', mode === 'night' ? '231,226,214' : '120,100,70');
    deskMat.needsUpdate = true;
    hemi.intensity = mode === 'night' ? 0.45 : 0.95;
    key.intensity = mode === 'night' ? 0.55 : 1.3;
    key.color.setHex(mode === 'night' ? 0xBFCBE0 : 0xFFF1D8);
    vinylMesh.userData.baseBox.material.color.setHex(mode === 'night' ? 0x242019 : 0xE4DED1);
    redrawAll();
  }

  if (modeBtn) modeBtn.addEventListener('click', function(){
    applyMode(mode === 'night' ? 'paper' : 'night');
    restyle();
  });

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
    var needW = 3.7;
    var dist = (needW / 2) / Math.tan(hFov / 2);
    dist = Math.max(dist, 5.4);
    dist = Math.min(dist, 26);

    var pitch = 57 * Math.PI / 180;
    camera.position.set(0, Math.sin(pitch) * dist, Math.cos(pitch) * dist);
    camera.lookAt(0, 0, 0.1);
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

  function loop(t){
    requestAnimationFrame(loop);
    if (!document.body.classList.contains('home')) return;
    if (vinylMesh) vinylMesh.userData.spin.rotation.y = t * 0.0006;
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
    if (p) dragOffset.set(t.position.x - p.x, 0, t.position.z - p.z);
    else dragOffset.set(0, 0, 0);
    try{ canvas.setPointerCapture(ev.pointerId); }catch(e){}
  });

  canvas.addEventListener('pointermove', function(ev){
    if (!dragObj) return;
    var dx = ev.clientX - downX;
    var dy = ev.clientY - downY;
    if (!moved && (Math.abs(dx) > 7 || Math.abs(dy) > 7)){
      moved = true;
      dragObj.position.y = dragObj.userData.baseY + 0.1;
    }
    if (!moved) return;
    var p = toDesk(ev.clientX, ev.clientY);
    if (!p) return;
    dragObj.position.x = Math.max(-1.8, Math.min(1.8, p.x + dragOffset.x));
    dragObj.position.z = Math.max(-2.3, Math.min(2.3, p.z + dragOffset.z));
    render();
  });

  canvas.addEventListener('pointerup', function(){
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
    open(o.userData.key);
  });

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
        things.forEach(function(o){
          var h = o.userData.home;
          o.position.set(h.x, o.userData.baseY, h.z);
          o.rotation.y = h.ry;
        });
        render();
        flash('摆回原来的位置了。');
      }
      lastTap = now;
    });
  }

  /* ============ 起飞 ============ */

  function loadPhoto(src, cb){
    if (!src) return;
    var img = new Image();
    img.onload = function(){ cb({ ok: true, img: img }); };
    img.src = src;
  }

  var list = D.album || [];
  if (list[0] && list[0].src) loadPhoto(list[0].src, function(o){ shotBig = o; drawMagazine(); render(); });
  var second = list[1] || list[0];
  if (second && second.src) loadPhoto(second.src, function(o){ shotSmall = o; drawPolaroid(); render(); });

  window.addEventListener('resize', fit);
  fit();

  setTimeout(function(){ if (boot) boot.textContent = ''; }, 1200);

  requestAnimationFrame(loop);

})();
