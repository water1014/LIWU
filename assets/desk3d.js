/* 里屋 · 3D 桌面（three.js）
   桌面就是一页杂志封面。上面压着五样东西：拍立得、便签、唱片机、工牌、一张小卡。
   东西能拖，位置存本机；点一下进对应那间；双击抬头时间全部复位。 */

(async function(){
  'use strict';

  var D = window.LIWU || {};
  var K_LAYOUT = 'liwu.desk.layout';
  var $ = function(s){ return document.querySelector(s); };
  var p2 = function(n){ return n < 10 ? '0' + n : '' + n; };

  var canvas = document.getElementById('stage');
  var boot = document.getElementById('boot');
  var modeBtn = $('#hudMode');

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

  /* ---------- 跳转 ---------- */

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
      if (THREE){
        drawPoster(); drawPolaroid(); drawNote(); drawTag(); drawMemo();
        fit();
      }
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

  /* ---------- 日夜 ---------- */

  var cfg = {};
  try{ cfg = JSON.parse(localStorage.getItem('liwu.cfg3') || '{}') || {}; }catch(e){}
  var mode = cfg.theme === 'night' ? 'night' : 'paper';

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

  /* ---------- three ---------- */

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

  var ink = function(){ return mode === 'night' ? '#E7E2D6' : '#2A2620'; };
  var sub = function(){ return mode === 'night' ? '#7F776A' : '#8A7E68'; };
  var bgc = function(){ return mode === 'night' ? '#1B1916' : '#F7F3E9'; };

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(mode === 'night' ? 0x14120F : 0xE6E0D2);

  var camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 60);

  var hemi = new THREE.HemisphereLight(0xFFF6E6, 0x8C8272, 0.95);
  scene.add(hemi);

  var key = new THREE.DirectionalLight(0xFFF1D8, 1.25);
  key.position.set(-2.2, 6.2, 3.4);
  key.castShadow = true;
  key.shadow.mapSize.width = 1024;
  key.shadow.mapSize.height = 1024;
  key.shadow.camera.left = -3.6;
  key.shadow.camera.right = 3.6;
  key.shadow.camera.top = 4.2;
  key.shadow.camera.bottom = -4.2;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 22;
  key.shadow.bias = -0.0012;
  scene.add(key);

  /* ---------- 画布工具 ---------- */

  var SERIF = 'Noto Serif SC, Songti SC, serif';
  var NUM = 'Cormorant Garamond, Songti SC, Georgia, serif';
  var RED = '#8A3B2C';

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
  function cover(g, img, x, y, w, h){
    var s = Math.max(w / img.width, h / img.height);
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s);
    g.restore();
  }
  function line(g, x1, y1, x2, y2){
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  }

  /* ================= 封面（桌面就是这一页） ================= */

  var coverCanvas = null, coverTex = null, coverMesh = null;
  var shotBig = null, shotSmall = null;

  var PW = 3.3, PH = 5.8;

  function drawPoster(){
    var W = 1000, H = 1760;
    var c = coverCanvas || makeCanvas(W, H);
    coverCanvas = c;
    var g = c.getContext('2d');

    g.fillStyle = bgc();
    g.fillRect(0, 0, W, H);

    g.strokeStyle = mode === 'night' ? 'rgba(231,226,214,.16)' : 'rgba(120,100,70,.24)';
    g.lineWidth = 2;

    /* 刊头 */
    g.textAlign = 'left';
    g.fillStyle = ink();
    g.font = '500 112px ' + SERIF;
    g.fillText('里屋', 76, 196);

    g.fillStyle = RED;
    g.fillRect(80, 224, 48, 4);

    g.fillStyle = sub();
    g.font = '400 19px ' + NUM;
    g.fillText('L I W U', 146, 228);

    g.textAlign = 'right';
    g.fillStyle = ink();
    g.font = 'italic 400 27px ' + NUM;
    g.fillText('VOL. 01', W - 76, 132);
    g.fillStyle = sub();
    g.font = '400 17px ' + NUM;
    g.fillText('2026 · 11', W - 76, 164);
    g.font = '400 16px ' + SERIF;
    g.fillText('一本关于两个人的刊物', W - 76, 198);
    g.textAlign = 'left';

    line(g, 76, 266, W - 76, 266);

    /* 封面主图 */
    var ix = 76, iy = 306, iw = W - 152, ih = 742;
    g.fillStyle = mode === 'night' ? '#2A2620' : '#E2DAC8';
    g.fillRect(ix, iy, iw, ih);

    if (shotBig && shotBig.ok){
      cover(g, shotBig.img, ix, iy, iw, ih);
    } else {
      g.fillStyle = sub();
      g.textAlign = 'center';
      g.font = '400 24px ' + SERIF;
      g.fillText('封面空着', ix + iw / 2, iy + ih / 2 - 14);
      g.font = '400 18px ' + SERIF;
      g.fillText('放一张图进 images/，它就上封面', ix + iw / 2, iy + ih / 2 + 28);
      g.textAlign = 'left';
    }

    g.fillStyle = sub();
    g.font = '400 14px ' + NUM;
    g.textAlign = 'right';
    g.fillText('COVER', W - 88, iy + 30);
    g.textAlign = 'left';

    /* 封面语 */
    g.fillStyle = ink();
    g.font = '400 54px ' + SERIF;
    g.fillText(D.hero || '屋子不大，够两个人住。', 76, 1142);

    var capText = (shotBig && shotBig.ok && D.album && D.album[0])
      ? (D.album[0].caption || D.album[0].date || '')
      : '';
    g.fillStyle = sub();
    g.font = '400 19px ' + SERIF;
    g.fillText(capText, 76, 1184);

    line(g, 76, 1218, W - 76, 1218);

    /* 目录 */
    g.fillStyle = sub();
    g.font = '400 15px ' + SERIF;
    g.fillText('目 录   C O N T E N T S', 76, 1258);

    var memos = (D.memory || []).slice(0, 3);
    var y = 1312;
    for (var i = 0; i < memos.length; i++){
      g.fillStyle = ink();
      g.font = '400 27px ' + SERIF;
      g.fillText(String(memos[i].title || '').slice(0, 12), 76, y);
      g.fillStyle = sub();
      g.textAlign = 'right';
      g.font = 'italic 400 22px ' + NUM;
      g.fillText('0' + (i + 1), W - 76, y);
      g.textAlign = 'left';
      y += 50;
    }

    /* 页脚 */
    var w = D.weather || {};
    line(g, 76, 1610, W - 76, 1610);
    g.fillStyle = sub();
    g.font = '400 18px ' + NUM;
    g.fillText((w.temp || '—') + '    ' + (w.text || ''), 76, 1652);
    var dc = dayCount();
    g.textAlign = 'right';
    g.font = 'italic 400 20px ' + NUM;
    g.fillText(dc ? ('第 ' + dc + ' 天') : '第 — 天', W - 76, 1652);
    g.textAlign = 'left';

    if (coverTex) coverTex.dispose();
    coverTex = tex(c);

    if (!coverMesh){
      coverMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(PW, PH),
        new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.96, metalness: 0 })
      );
      coverMesh.rotation.x = -Math.PI / 2;
      coverMesh.receiveShadow = true;
      coverMesh.position.y = 0;
      scene.add(coverMesh);
    } else {
      coverMesh.material.map = coverTex;
      coverMesh.material.needsUpdate = true;
    }
  }

  /* ================= 小东西 ================= */

  var polC, polT, noteC, noteT, tagC, tagT, memC, memT;

  function drawPolaroid(){
    var W = 512, H = 620;
    var c = polC || makeCanvas(W, H); polC = c;
    var g = c.getContext('2d');
    g.fillStyle = mode === 'night' ? '#262117' : '#FFFDF7';
    g.fillRect(0, 0, W, H);
    var p = 34, s = W - 68;
    g.fillStyle = mode === 'night' ? '#2A2620' : '#E7DFCE';
    g.fillRect(p, p, s, s);
    if (shotSmall && shotSmall.ok) cover(g, shotSmall.img, p, p, s, s);
    g.fillStyle = sub();
    g.textAlign = 'center';
    g.font = 'italic 400 30px ' + NUM;
    g.fillText('our room', W / 2, H - 60);
    g.textAlign = 'left';
    if (polT) polT.dispose();
    polT = tex(c);
    if (polFace){ polFace.material.map = polT; polFace.material.needsUpdate = true; }
  }

  function drawNote(){
    var W = 512, H = 580;
    var c = noteC || makeCanvas(W, H); noteC = c;
    var g = c.getContext('2d');
    g.fillStyle = mode === 'night' ? '#3E3922' : '#F5E8A4';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = mode === 'night' ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.6)';
    for (var y = 96; y < H - 70; y += 60) line(g, 0, y, W, y);
    g.fillStyle = mode === 'night' ? '#E3D9A8' : '#5C5233';
    g.font = '400 34px ' + SERIF;
    g.fillText('今天想说的话', 44, 74);
    g.fillStyle = mode === 'night' ? '#948A56' : '#8C7C40';
    g.font = '400 23px ' + SERIF;
    g.fillText('写一句 →', 44, H - 44);
    if (noteT) noteT.dispose();
    noteT = tex(c);
    if (noteFace){ noteFace.material.map = noteT; noteFace.material.needsUpdate = true; }
  }

  function drawTag(){
    var W = 400, H = 520;
    var c = tagC || makeCanvas(W, H); tagC = c;
    var g = c.getContext('2d');
    g.fillStyle = mode === 'night' ? '#221F1B' : '#FBF8F0';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = mode === 'night' ? 'rgba(231,226,214,.2)' : 'rgba(120,100,70,.32)';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(W / 2, 44, 26, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = ink();
    g.textAlign = 'center';
    g.font = '400 56px ' + SERIF;
    g.fillText('里屋', W / 2, 262);
    g.fillStyle = sub();
    g.font = 'italic 400 24px ' + NUM;
    g.fillText('L I W U', W / 2, 312);
    g.textAlign = 'left';
    if (tagT) tagT.dispose();
    tagT = tex(c);
    if (tagFace){ tagFace.material.map = tagT; tagFace.material.needsUpdate = true; }
  }

  function drawMemo(){
    var W = 460, H = 560;
    var c = memC || makeCanvas(W, H); memC = c;
    var g = c.getContext('2d');
    g.fillStyle = mode === 'night' ? '#1F1C18' : '#EDE6D7';
    g.fillRect(0, 0, W, H);
    g.fillStyle = sub();
    g.font = '400 22px ' + SERIF;
    g.fillText('记   M E M O R Y', 44, 74);
    g.strokeStyle = mode === 'night' ? 'rgba(231,226,214,.12)' : 'rgba(120,100,70,.22)';
    g.lineWidth = 1;
    for (var y = 120; y < H - 90; y += 38) line(g, 44, y, W - 44, y);
    g.fillStyle = sub();
    g.font = '400 16px ' + SERIF;
    g.fillText('怕忘的事，一句一件。', 44, H - 44);
    if (memT) memT.dispose();
    memT = tex(c);
    if (memFace){ memFace.material.map = memT; memFace.material.needsUpdate = true; }
  }

  /* ---------- 造物件 ---------- */

  var polFace = null, noteFace = null, tagFace = null, memFace = null;
  var vinylMesh = null;
  var things = [];

  function sheet(w, h, th, texture, tint){
    var g = new THREE.Group();
    var body = new THREE.Mesh(
      new THREE.BoxGeometry(w, th, h),
      new THREE.MeshStandardMaterial({ color: tint, roughness: 0.95 })
    );
    body.castShadow = true; body.receiveShadow = true;
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

  function buildVinyl(){
    var g = new THREE.Group();
    var base = new THREE.Mesh(
      new THREE.BoxGeometry(0.74, 0.05, 0.58),
      new THREE.MeshStandardMaterial({ color: mode === 'night' ? 0x242019 : 0xE4DED1, roughness: 0.9 })
    );
    base.position.y = 0.025; base.castShadow = true; base.receiveShadow = true;
    g.add(base);

    var disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.23, 0.23, 0.012, 40),
      new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.45, metalness: 0.1 })
    );
    disc.position.set(-0.05, 0.056, 0.02); disc.castShadow = true;
    g.add(disc);

    var lab = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 0.016, 28),
      new THREE.MeshStandardMaterial({ color: 0xB2452F, roughness: 0.8 })
    );
    lab.position.set(-0.05, 0.058, 0.02);
    g.add(lab);

    var arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.27, 0.012, 0.016),
      new THREE.MeshStandardMaterial({ color: 0xA39A8A, roughness: 0.6, metalness: 0.3 })
    );
    arm.position.set(0.21, 0.072, -0.17);
    arm.rotation.y = -0.5; arm.castShadow = true;
    g.add(arm);

    g.userData.key = 'chat';
    g.userData.spin = disc;
    g.userData.baseBox = base;
    return g;
  }

  drawPolaroid(); drawNote(); drawTag(); drawMemo();

  var polMesh = sheet(0.62, 0.75, 0.01, polT, mode === 'night' ? 0x262117 : 0xFFFDF7);
  polFace = polMesh.userData.face; polMesh.userData.key = 'album';

  var noteMesh = sheet(0.56, 0.64, 0.014, noteT, mode === 'night' ? 0x3E3922 : 0xF5E8A4);
  noteFace = noteMesh.userData.face; noteMesh.userData.key = 'diary';

  var tagMesh = sheet(0.42, 0.55, 0.016, tagT, mode === 'night' ? 0x221F1B : 0xFBF8F0);
  tagFace = tagMesh.userData.face; tagMesh.userData.key = 'settings';

  var memMesh = sheet(0.44, 0.54, 0.008, memT, mode === 'night' ? 0x1F1C18 : 0xEDE6D7);
  memFace = memMesh.userData.face; memMesh.userData.key = 'memory';

  vinylMesh = buildVinyl();

  drawPoster();

  /* ---------- 摆位 ---------- */

  var HOME = {
    polaroid: { x: -0.92, z: -1.62, ry: -0.09 },
    note: { x: 0.92, z: -1.42, ry: 0.06 },
    vinyl: { x: 0.86, z: 0.62, ry: -0.03 },
    tag: { x: -0.92, z: 1.15, ry: 0.07 },
    memo: { x: 0.05, z: 2.05, ry: -0.05 }
  };

  var layout = {};
  try{ layout = JSON.parse(localStorage.getItem(K_LAYOUT) || '{}') || {}; }catch(e){ layout = {}; }
  function saveLayout(){ try{ localStorage.setItem(K_LAYOUT, JSON.stringify(layout)); }catch(e){} }

  function place(key, obj, y){
    var home = HOME[key];
    var pos = layout[key] || { x: home.x, z: home.z };
    obj.position.set(pos.x, y, pos.z);
    obj.rotation.y = home.ry;
    obj.userData.home = home;
    obj.userData.baseY = y;
    obj.userData.regKey = key;
    scene.add(obj);
    things.push(obj);
  }

  place('polaroid', polMesh, 0.004);
  place('note', noteMesh, 0.006);
  place('vinyl', vinylMesh, 0);
  place('tag', tagMesh, 0.008);
  place('memo', memMesh, 0.002);

  /* ---------- 换色 ---------- */

  function restyle(){
    scene.background = new THREE.Color(mode === 'night' ? 0x14120F : 0xE6E0D2);
    hemi.intensity = mode === 'night' ? 0.45 : 0.95;
    key.intensity = mode === 'night' ? 0.55 : 1.25;
    key.color.setHex(mode === 'night' ? 0xBFCBE0 : 0xFFF1D8);
    vinylMesh.userData.baseBox.material.color.setHex(mode === 'night' ? 0x242019 : 0xE4DED1);
    drawPoster(); drawPolaroid(); drawNote(); drawTag(); drawMemo();
    render();
  }

  if (modeBtn) modeBtn.addEventListener('click', function(){
    applyMode(mode === 'night' ? 'paper' : 'night');
    restyle();
  });

  /* ---------- 相机 ---------- */

  function fit(){
    var w = window.innerWidth, h = window.innerHeight;
    if (!w || !h) return;
    var a = w / h;
    camera.aspect = a;
    camera.fov = a < 0.8 ? 62 : 46;
    camera.updateProjectionMatrix();

    var vFov = camera.fov * Math.PI / 180;
    var hFov = 2 * Math.atan(Math.tan(vFov / 2) * a);
    var needW = PW + 0.3;
    var dist = (needW / 2) / Math.tan(hFov / 2);
    dist = Math.max(dist, 5.2);
    dist = Math.min(dist, 30);

    var pitch = 60 * Math.PI / 180;
    camera.position.set(0, Math.sin(pitch) * dist, Math.cos(pitch) * dist);
    camera.lookAt(0, 0, 0.15);
    renderer.setSize(w, h, false);
    render();
  }

  var raf = null;
  function render(){
    if (raf) return;
    raf = requestAnimationFrame(function(){ raf = null; renderer.render(scene, camera); });
  }

  function loop(t){
    requestAnimationFrame(loop);
    if (!document.body.classList.contains('home')) return;
    if (vinylMesh) vinylMesh.userData.spin.rotation.y = t * 0.0006;
    renderer.render(scene, camera);
  }

  /* ---------- 拖与点 ---------- */

  var ray = new THREE.Raycaster();
  var ndc = new THREE.Vector2();
  var planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  var hp = new THREE.Vector3();

  var dragObj = null;
  var off = new THREE.Vector3();
  var downX = 0, downY = 0, moved = false;

  function toDesk(x, y){
    ndc.x = (x / window.innerWidth) * 2 - 1;
    ndc.y = -(y / window.innerHeight) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(planeY, hp)) return hp.clone();
    return null;
  }

  function pick(x, y){
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
    var t = pick(ev.clientX, ev.clientY);
    if (!t) return;
    dragObj = t;
    var p = toDesk(ev.clientX, ev.clientY);
    if (p) off.set(t.position.x - p.x, 0, t.position.z - p.z);
    else off.set(0, 0, 0);
    try{ canvas.setPointerCapture(ev.pointerId); }catch(e){}
  });

  canvas.addEventListener('pointermove', function(ev){
    if (!dragObj) return;
    if (!moved && (Math.abs(ev.clientX - downX) > 7 || Math.abs(ev.clientY - downY) > 7)){
      moved = true;
      dragObj.position.y = dragObj.userData.baseY + 0.1;
    }
    if (!moved) return;
    var p = toDesk(ev.clientX, ev.clientY);
    if (!p) return;
    dragObj.position.x = Math.max(-1.6, Math.min(1.6, p.x + off.x));
    dragObj.position.z = Math.max(-2.7, Math.min(2.7, p.z + off.z));
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

  /* ---------- 双击时间复位 ---------- */

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

  /* ---------- 起 ---------- */

  function loadPhoto(src, cb){
    if (!src) return;
    var img = new Image();
    img.onload = function(){ cb({ ok: true, img: img }); };
    img.src = src;
  }

  var list = D.album || [];
  if (list[0] && list[0].src) loadPhoto(list[0].src, function(o){ shotBig = o; drawPoster(); render(); });
  var second = list[1] || list[0];
  if (second && second.src) loadPhoto(second.src, function(o){ shotSmall = o; drawPolaroid(); render(); });

  window.addEventListener('resize', fit);
  fit();

  setTimeout(function(){ if (boot) boot.textContent = ''; }, 1200);
  requestAnimationFrame(loop);

})();
