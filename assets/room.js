/* 里屋 · 靠窗的书桌（自己搭的第二版）
   新增：书柜、地毯、墙上一张画、窗台杯子、下雨、相框里的照片、便签上的字、
         以及桌上几样瞎想的：沙漏、玻璃罐（装折起来的纸条）、一只趴着的小猫。
   没有后处理，所以不虚。天色跟着真实时间。 */

(async function(){
  'use strict';

  var D = window.LIWU || {};
  var $ = function(s){ return document.querySelector(s); };
  var p2 = function(n){ return n < 10 ? '0' + n : '' + n; };

  var canvas = document.getElementById('stage');
  var boot = document.getElementById('boot');
  var modeBtn = $('#hudMode');

  var WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  function paintClock(){
    var d = new Date();
    var t = $('#hudTime'), dt = $('#hudDate');
    if (t) t.textContent = p2(d.getHours()) + ':' + p2(d.getMinutes());
    if (dt) dt.textContent = (d.getMonth() + 1) + '月' + d.getDate() + '日 · ' + WEEK[d.getDay()];
  }
  paintClock();
  setInterval(paintClock, 20000);

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
    if (on){ document.body.classList.add('home'); fit(); }
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

  var cfg = {};
  try{ cfg = JSON.parse(localStorage.getItem('liwu.cfg3') || '{}') || {}; }catch(e){}
  var night = cfg.theme === 'night';

  function applyMode(isNight){
    night = !!isNight;
    document.body.setAttribute('data-theme', night ? 'night' : 'paper');
    if (modeBtn) modeBtn.textContent = night ? '预览：夜晚' : '预览：白天';
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', night ? '#0E1015' : '#E8E1D3');
    try{
      var c = JSON.parse(localStorage.getItem('liwu.cfg3') || '{}') || {};
      c.theme = night ? 'night' : 'paper';
      localStorage.setItem('liwu.cfg3', JSON.stringify(c));
    }catch(e){}
    if (THREE) syncSky();
  }
  applyMode(night);

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

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 60);

  function M(c, r, m){
    return new THREE.MeshStandardMaterial({ color: c, roughness: r == null ? 0.92 : r, metalness: m || 0 });
  }
  function canvasTex(w, h, draw){
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c);
    if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { c: c, t: t };
  }

  /* ---------- 天色 ---------- */

  var KF = [
    { h: 0,  skyA: 0x0A1220, skyB: 0x1C2740, sea: 0x15233A, sun: 0x35507A, sunI: 0.28, hemi: 0x3D4E68, hemiI: 0.34, wall: 0x2A2A32, light: 0.35 },
    { h: 5,  skyA: 0x25314A, skyB: 0x6E6A78, sea: 0x2C3A4E, sun: 0xB98A6A, sunI: 0.55, hemi: 0x6A6A78, hemiI: 0.5,  wall: 0x494850, light: 0.5 },
    { h: 7,  skyA: 0x8FA9C2, skyB: 0xE6D9C6, sea: 0x7E99A8, sun: 0xFFD6A8, sunI: 1.5,  hemi: 0xD9D3C6, hemiI: 0.75, wall: 0xE6DFD2, light: 0.6 },
    { h: 12, skyA: 0xA8C6DB, skyB: 0xF2EADB, sea: 0x9FBCC4, sun: 0xFFF3DC, sunI: 2.3,  hemi: 0xFFF1DC, hemiI: 0.9,  wall: 0xEDE6D8, light: 0 },
    { h: 17, skyA: 0xD9B68C, skyB: 0xF6DFBE, sea: 0xB6A88E, sun: 0xFFC98C, sunI: 1.9,  hemi: 0xF2DCC0, hemiI: 0.8,  wall: 0xE8DCC6, light: 0.3 },
    { h: 19, skyA: 0x5A4A5C, skyB: 0xC08A6E, sea: 0x4A4652, sun: 0xE0956A, sunI: 0.8,  hemi: 0x7A6A6A, hemiI: 0.55, wall: 0x6A5E5A, light: 1.1 },
    { h: 22, skyA: 0x101828, skyB: 0x24304A, sea: 0x1A2740, sun: 0x3A5478, sunI: 0.32, hemi: 0x3D4E68, hemiI: 0.36, wall: 0x2C2C34, light: 1.4 },
    { h: 24, skyA: 0x0A1220, skyB: 0x1C2740, sea: 0x15233A, sun: 0x35507A, sunI: 0.28, hemi: 0x3D4E68, hemiI: 0.34, wall: 0x2A2A32, light: 0.35 }
  ];

  function lerpCol(out, h1, h2, t){
    var a = new THREE.Color(h1), b = new THREE.Color(h2);
    out.copy(a).lerp(b, t);
    return out;
  }

  function sample(h){
    h = ((h % 24) + 24) % 24;
    var i = 0;
    for (i = 0; i < KF.length - 1; i++) if (h >= KF[i].h && h <= KF[i + 1].h) break;
    if (i > KF.length - 2) i = KF.length - 2;
    var a = KF[i], b = KF[i + 1];
    var t = (h - a.h) / Math.max(0.0001, b.h - a.h);
    var o = {};
    ['skyA', 'skyB', 'sea', 'sun', 'hemi', 'wall'].forEach(function(k){
      o[k] = lerpCol(new THREE.Color(), a[k], b[k], t);
    });
    o.sunI = a.sunI + (b.sunI - a.sunI) * t;
    o.hemiI = a.hemiI + (b.hemiI - a.hemiI) * t;
    o.light = a.light + (b.light - a.light) * t;
    return o;
  }

  /* ---------- 灯 ---------- */

  var hemi = new THREE.HemisphereLight(0xFFF1DC, 0x8A7F70, 0.9);
  scene.add(hemi);

  var sun = new THREE.DirectionalLight(0xFFF3DC, 2.2);
  sun.position.set(0.4, 3.4, -4.2);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.left = -2.8;
  sun.shadow.camera.right = 2.8;
  sun.shadow.camera.top = 3.0;
  sun.shadow.camera.bottom = -1.0;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 14;
  sun.shadow.bias = -0.0012;
  scene.add(sun);

  var lampLight = new THREE.PointLight(0xFFC489, 0, 2.6, 2);
  lampLight.position.set(-0.72, 1.12, -1.0);
  scene.add(lampLight);

  /* ---------- 房间 ---------- */

  var RW = 3.8, RD = 3.2, RH = 2.5;
  var WALLZ = -RD / 2 + 0.1;

  var floorMat = M(0xC6B096, 0.95);
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 0.2);
  floor.receiveShadow = true;
  scene.add(floor);

  var wallMat = M(0xEDE6D8, 0.98);
  var backWall = new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), wallMat);
  backWall.position.set(0, RH / 2, WALLZ);
  backWall.receiveShadow = true;
  scene.add(backWall);

  var sideMat = M(0xE7DFD0, 0.98);
  var leftWall = new THREE.Mesh(new THREE.PlaneGeometry(RD, RH), sideMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-RW / 2, RH / 2, 0.2);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  var rightWall = new THREE.Mesh(new THREE.PlaneGeometry(RD, RH), sideMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(RW / 2, RH / 2, 0.2);
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  // 地毯
  var rugMat = M(0xA89880, 1);
  var rug = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.5), rugMat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.004, 0.55);
  rug.receiveShadow = true;
  scene.add(rug);

  /* ---------- 窗外的天 ---------- */

  var skyCv = document.createElement('canvas');
  skyCv.width = 16; skyCv.height = 256;
  var skyTex = new THREE.CanvasTexture(skyCv);
  if ('colorSpace' in skyTex) skyTex.colorSpace = THREE.SRGBColorSpace;

  function paintSky(s){
    var g = skyCv.getContext('2d');
    var grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#' + s.skyA.getHexString());
    grd.addColorStop(1, '#' + s.skyB.getHexString());
    g.fillStyle = grd;
    g.fillRect(0, 0, 16, 256);
    skyTex.needsUpdate = true;
  }

  var skyMat = new THREE.MeshBasicMaterial({ map: skyTex });
  var sky = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.8), skyMat);
  sky.position.set(0, 1.45, WALLZ - 0.95);
  scene.add(sky);

  var seaMat = new THREE.MeshBasicMaterial({ color: 0x9FBCC4 });
  var sea = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.05), seaMat);
  sea.position.set(0, 0.55, WALLZ - 0.9);
  scene.add(sea);

  var sandMat = new THREE.MeshBasicMaterial({ color: 0xDFD2B8 });
  var sand = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.45), sandMat);
  sand.position.set(0, 0.02, WALLZ - 0.88);
  scene.add(sand);

  var hillMat = new THREE.MeshBasicMaterial({ color: 0x9AA0A0 });
  var hill = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.16), hillMat);
  hill.position.set(0, 1.02, WALLZ - 0.92);
  scene.add(hill);

  var cloudMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.5 });
  var clouds = [];
  for (var c2 = 0; c2 < 4; c2++){
    var cl = new THREE.Mesh(new THREE.CircleGeometry(0.2, 14), cloudMat);
    cl.position.set(-1.7 + c2 * 1.15, 2.12 - (c2 % 2) * 0.15, WALLZ - 0.98);
    cl.scale.set(2.4, 0.7, 1);
    scene.add(cl);
    clouds.push(cl);
  }

  /* ---------- 雨（窗外） ---------- */

  var rainMat = new THREE.MeshBasicMaterial({ color: 0xC8D8E4, transparent: true, opacity: 0.42 });
  var rainGroup = new THREE.Group();
  var drops = [];
  for (var ri = 0; ri < 46; ri++){
    var dp = new THREE.Mesh(new THREE.PlaneGeometry(0.006, 0.14), rainMat);
    dp.position.set(-1.8 + Math.random() * 3.6, 0.4 + Math.random() * 1.9, WALLZ - 0.6 - Math.random() * 0.3);
    dp.rotation.z = 0.12;
    rainGroup.add(dp);
    drops.push(dp);
  }
  scene.add(rainGroup);

  /* ---------- 窗 ---------- */

  var WY = 1.45, WW = 1.7, WH = 1.15;
  var frameMat = M(0xF7F3EA, 0.9);
  var fz = WALLZ + 0.012;

  function bar(w, h, x, y, z){
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), frameMat);
    m.position.set(x, y, z);
    m.castShadow = true;
    scene.add(m);
  }
  bar(WW + 0.16, 0.08, 0, WY + WH / 2, fz);
  bar(WW + 0.16, 0.08, 0, WY - WH / 2, fz);
  bar(0.08, WH, -WW / 2, WY, fz);
  bar(0.08, WH, WW / 2, WY, fz);
  bar(0.05, WH, 0, WY, fz);

  var sill = new THREE.Mesh(new THREE.BoxGeometry(WW + 0.3, 0.06, 0.22), M(0xF2EDE2, 0.9));
  sill.position.set(0, WY - WH / 2 - 0.04, fz + 0.1);
  sill.castShadow = true;
  sill.receiveShadow = true;
  scene.add(sill);

  // 窗台：一盆小绿植 + 一只杯子
  var pot = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.04, 0.072, 14), M(0xB9A183, 0.9));
  pot.position.set(0.62, WY - WH / 2 + 0.0, fz + 0.1);
  pot.castShadow = true;
  scene.add(pot);
  var leaf = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 10), M(0x6F7F5A, 0.95));
  leaf.position.set(0.62, WY - WH / 2 + 0.098, fz + 0.1);
  leaf.scale.set(1, 1.3, 1);
  leaf.castShadow = true;
  scene.add(leaf);

  var cup = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.085, 16), M(0xF4F0E6, 0.6));
  cup.position.set(-0.55, WY - WH / 2 + 0.045, fz + 0.1);
  cup.castShadow = true;
  scene.add(cup);
  var cupH = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.007, 8, 14), M(0xF4F0E6, 0.6));
  cupH.position.set(-0.508, WY - WH / 2 + 0.05, fz + 0.1);
  cupH.rotation.y = Math.PI / 2;
  scene.add(cupH);

  // 窗帘
  var curtainMat = M(0xF1E7D6, 0.98);
  var curL = new THREE.Mesh(new THREE.PlaneGeometry(0.42, WH + 0.3), curtainMat);
  curL.position.set(-WW / 2 - 0.12, WY + 0.02, fz + 0.14);
  curL.castShadow = true;
  scene.add(curL);
  var curR = new THREE.Mesh(new THREE.PlaneGeometry(0.42, WH + 0.3), curtainMat);
  curR.position.set(WW / 2 + 0.12, WY + 0.02, fz + 0.14);
  curR.castShadow = true;
  scene.add(curR);

  /* ---------- 墙上一张画 ---------- */

  var artTex = canvasTex(256, 192, function(g, w, h){
    g.fillStyle = '#F6F1E4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#9FB6C0'; g.fillRect(0, h * 0.55, w, h * 0.45);
    g.fillStyle = '#D9C7A8'; g.fillRect(0, h * 0.82, w, h * 0.18);
    g.fillStyle = '#E8B87C';
    g.beginPath(); g.arc(w * 0.72, h * 0.42, 22, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(60,50,40,.35)'; g.lineWidth = 2;
    g.strokeRect(1, 1, w - 2, h - 2);
  });
  var art = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.32), new THREE.MeshStandardMaterial({ map: artTex.t, roughness: 0.95 }));
  art.position.set(-1.24, 1.72, WALLZ + 0.02);
  scene.add(art);
  var artFrame = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.36, 0.02), M(0x6B4E36, 0.85));
  artFrame.position.set(-1.24, 1.72, WALLZ + 0.005);
  artFrame.castShadow = true;
  scene.add(artFrame);

  /* ---------- 书柜（靠右墙） ---------- */

  var shelfMat = M(0xA9814F, 0.9);
  var shelf = new THREE.Group();
  var shW = 0.28, shH = 1.15, shD = 0.95;
  var shX = RW / 2 - 0.2, shZ = WALLZ + 1.0;

  function shBox(w, h, d, x, y, z){
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), shelfMat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    shelf.add(m);
  }
  shBox(shW, shH, 0.04, shX, shH / 2, shZ - shD / 2);
  shBox(shW, shH, 0.04, shX, shH / 2, shZ + shD / 2);
  shBox(0.03, shH, shD, shX + shW / 2, shH / 2, shZ);
  [0.04, 0.42, 0.8, shH - 0.02].forEach(function(y){
    shBox(shW, 0.03, shD, shX, y, shZ);
  });

  var bcols2 = [0x8A3B2C, 0x4B5A6B, 0x6E7A5A, 0xA9814F, 0x7A6A5A];
  for (var si = 0; si < 12; si++){
    var bh2 = 0.16 + Math.random() * 0.08;
    var b2 = new THREE.Mesh(new THREE.BoxGeometry(0.19, bh2, 0.035 + Math.random() * 0.02), M(bcols2[si % bcols2.length], 0.9));
    var layer2 = Math.floor(si / 4);
    var by2 = [0.04, 0.42, 0.8][Math.min(layer2, 2)] + bh2 / 2 + 0.02;
    b2.position.set(shX, by2, shZ - 0.38 + (si % 4) * 0.24);
    b2.castShadow = true;
    shelf.add(b2);
  }
  scene.add(shelf);

  /* ---------- 书桌 ---------- */

  var DW = 1.8, DD = 0.78, DH = 0.74;
  var dz = WALLZ + 0.5;

  var deskTop = new THREE.Mesh(new THREE.BoxGeometry(DW, 0.06, DD), M(0xB08A5E, 0.85));
  deskTop.position.set(0, DH, dz);
  deskTop.castShadow = true;
  deskTop.receiveShadow = true;
  scene.add(deskTop);

  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function(p){
    var lg = new THREE.Mesh(new THREE.BoxGeometry(0.07, DH, 0.07), M(0x8A6A46, 0.9));
    lg.position.set(p[0] * (DW / 2 - 0.08), DH / 2, dz + p[1] * (DD / 2 - 0.07));
    lg.castShadow = true;
    scene.add(lg);
  });

  /* ---------- 桌上的东西 ---------- */

  var things = [];
  function put(obj, key){
    obj.traverse(function(o){ o.userData.key = key; });
    scene.add(obj);
    things.push(obj);
  }

  // 笔记本 → 日记
  var book = new THREE.Group();
  var bCover = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.016, 0.26), M(0x8A3B2C, 0.85));
  bCover.position.y = 0.01; bCover.castShadow = true;
  book.add(bCover);
  var pgL = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.012, 0.24), M(0xF7F3E8, 0.96));
  pgL.position.set(-0.082, 0.023, 0); pgL.rotation.z = 0.035; pgL.castShadow = true;
  book.add(pgL);
  var pgR = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.012, 0.24), M(0xF7F3E8, 0.96));
  pgR.position.set(0.082, 0.023, 0); pgR.rotation.z = -0.035; pgR.castShadow = true;
  book.add(pgR);
  book.position.set(-0.5, DH + 0.03, dz + 0.1);
  book.rotation.y = 0.2;
  put(book, 'diary');

  // 相框（里面放照片）→ 相册
  var shotImg = null;
  var photoTex = canvasTex(220, 280, function(g, w, h){
    g.fillStyle = '#E4DCCC'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#9FB6C0'; g.fillRect(0, h * 0.52, w, h * 0.48);
    g.fillStyle = '#D9C7A8'; g.fillRect(0, h * 0.78, w, h * 0.22);
    g.fillStyle = '#EBBE86';
    g.beginPath(); g.arc(w * 0.68, h * 0.4, 26, 0, Math.PI * 2); g.fill();
  });
  function repaintPhoto(){
    var g = photoTex.c.getContext('2d');
    var w = 220, h = 280;
    if (shotImg){
      var s = Math.max(w / shotImg.width, h / shotImg.height);
      g.clearRect(0, 0, w, h);
      g.save();
      g.beginPath(); g.rect(0, 0, w, h); g.clip();
      g.drawImage(shotImg, (w - shotImg.width * s) / 2, (h - shotImg.height * s) / 2, shotImg.width * s, shotImg.height * s);
      g.restore();
    }
    photoTex.t.needsUpdate = true;
  }
  var photo = new THREE.Group();
  var pFrame = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.33, 0.02), M(0x6B4E36, 0.85));
  pFrame.castShadow = true;
  photo.add(pFrame);
  var pCard = new THREE.Mesh(new THREE.PlaneGeometry(0.215, 0.275), new THREE.MeshStandardMaterial({ map: photoTex.t, roughness: 0.95 }));
  pCard.position.z = 0.012;
  photo.add(pCard);
  var pLeg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.17, 0.01), M(0x6B4E36, 0.9));
  pLeg.position.set(0, -0.07, -0.08);
  pLeg.rotation.x = 0.3;
  photo.add(pLeg);
  photo.position.set(0.58, DH + 0.18, dz - 0.16);
  photo.rotation.y = -0.2;
  put(photo, 'album');

  var firstShot = (D.album && D.album[0] && D.album[0].src) || '';
  if (firstShot){
    var im = new Image();
    im.onload = function(){ shotImg = im; repaintPhoto(); };
    im.src = firstShot;
  }

  // 收音机 → 说话
  var radio = new THREE.Group();
  var rBody = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.13, 0.15), M(0x7E6A55, 0.75));
  rBody.position.y = 0.065; rBody.castShadow = true;
  radio.add(rBody);
  var rFace = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.055, 0.012), M(0x4A3C2E, 0.7));
  rFace.position.set(-0.02, 0.075, 0.078);
  radio.add(rFace);
  var rKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.018, 12), M(0xC9A66B, 0.5));
  rKnob.rotation.x = Math.PI / 2;
  rKnob.position.set(0.09, 0.065, 0.08);
  radio.add(rKnob);
  radio.position.set(0.24, DH + 0.03, dz + 0.2);
  radio.rotation.y = -0.32;
  put(radio, 'chat');

  // 一叠书 → 记忆
  var stack = new THREE.Group();
  var bcols = [0x6E7A5A, 0x8A3B2C, 0x4B5A6B];
  for (var bi = 0; bi < 3; bi++){
    var bk = new THREE.Mesh(new THREE.BoxGeometry(0.25 - bi * 0.018, 0.034, 0.18 - bi * 0.012), M(bcols[bi], 0.9));
    bk.position.y = 0.017 + bi * 0.036;
    bk.rotation.y = 0.07 * (bi + 1);
    bk.castShadow = true;
    stack.add(bk);
  }
  stack.position.set(-0.74, DH + 0.03, dz - 0.12);
  put(stack, 'memory');

  // 台灯 → 设置
  var lamp = new THREE.Group();
  var lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.024, 16), M(0x4A3C2E, 0.7));
  lBase.position.y = 0.012; lBase.castShadow = true;
  lamp.add(lBase);
  var lStem = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.36, 10), M(0x6B5A45, 0.6));
  lStem.position.y = 0.2;
  lamp.add(lStem);
  var lShade = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.11, 18, 1, true), M(0xE8DCC4, 0.85));
  lShade.position.y = 0.4;
  lamp.add(lShade);
  lamp.position.set(-0.78, DH + 0.03, dz + 0.22);
  put(lamp, 'settings');

  /* ---------- 瞎想的几样 ---------- */

  // 沙漏
  var hour = new THREE.Group();
  var hGlass = M(0xE8EFF2, 0.3, 0.1);
  var hTop = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.07, 14), hGlass);
  hTop.position.y = 0.055;
  hTop.castShadow = true;
  hour.add(hTop);
  var hBot = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.07, 14), hGlass);
  hBot.position.y = -0.015;
  hBot.rotation.z = Math.PI;
  hBot.castShadow = true;
  hour.add(hBot);
  var hSand = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.04, 12), M(0xD8B87A, 0.95));
  hSand.position.y = -0.028;
  hour.add(hSand);
  var hBase1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.008, 14), M(0x6B4E36, 0.85));
  hBase1.position.y = 0.093;
  hour.add(hBase1);
  var hBase2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.008, 14), M(0x6B4E36, 0.85));
  hBase2.position.y = -0.053;
  hour.add(hBase2);
  hour.position.set(0.04, DH + 0.11, dz + 0.26);
  scene.add(hour);

  // 玻璃罐，里面塞着折起来的纸条（记忆的另一种装法）
  var jar = new THREE.Group();
  var jarGlass = new THREE.MeshStandardMaterial({ color: 0xEAF1F0, roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.38 });
  var jarBody = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.16, 18, 1, true), jarGlass);
  jarBody.position.y = 0.08;
  jar.add(jarBody);
  var jarBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.006, 18), jarGlass);
  jarBottom.position.y = 0.003;
  jar.add(jarBottom);
  var jarLid = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.014, 18), M(0x8A6A46, 0.8));
  jarLid.position.y = 0.163;
  jarLid.castShadow = true;
  jar.add(jarLid);
  for (var ni = 0; ni < 5; ni++){
    var note = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.026, 0.032), M(ni % 2 ? 0xF6E8B8 : 0xF0E2D2, 0.95));
    note.position.set(-0.02 + Math.random() * 0.04, 0.02 + ni * 0.024, -0.02 + Math.random() * 0.04);
    note.rotation.set(Math.random(), Math.random(), Math.random());
    jar.add(note);
  }
  jar.position.set(0.42, DH + 0.03, dz + 0.26);
  scene.add(jar);

  // 趴着的小猫
  var cat = new THREE.Group();
  var furM = M(0x8C7B66, 0.98);
  var catBody = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), furM);
  catBody.scale.set(1.7, 0.78, 1.0);
  catBody.castShadow = true;
  cat.add(catBody);
  var catHead = new THREE.Mesh(new THREE.SphereGeometry(0.058, 16, 12), furM);
  catHead.position.set(0.13, 0.03, 0);
  catHead.castShadow = true;
  cat.add(catHead);
  var earL = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.03, 8), furM);
  earL.position.set(0.115, 0.082, 0.028);
  cat.add(earL);
  var earR = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.03, 8), furM);
  earR.position.set(0.115, 0.082, -0.028);
  cat.add(earR);
  var tail = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.008, 0.14, 8), furM);
  tail.position.set(-0.15, 0.01, 0.05);
  tail.rotation.z = Math.PI / 2.2;
  tail.rotation.y = 0.5;
  cat.add(tail);
  cat.position.set(-0.2, DH + 0.09, dz - 0.2);
  cat.rotation.y = -0.5;
  scene.add(cat);

  /* ---------- 天色同步 ---------- */

  var lastPaint = -1;
  var wet = String((D.weather || {}).text || '').indexOf('雨') >= 0;

  function syncSky(){
    var h = new Date().getHours() + new Date().getMinutes() / 60;
    if (night) h = 21.5;
    var s = sample(h);

    if (Math.abs(h - lastPaint) > 0.05){
      paintSky(s);
      lastPaint = h;
    }

    seaMat.color.copy(s.sea);
    sandMat.color.copy(s.sea).lerp(new THREE.Color(0xDFD2B8), night ? 0.15 : 0.75);
    hillMat.color.copy(s.sea).lerp(new THREE.Color(0x8A8F92), 0.5);
    cloudMat.opacity = night ? 0.12 : 0.5;
    cloudMat.color.setHex(night ? 0x8899AA : 0xFFFFFF);

    hemi.color.copy(s.hemi);
    hemi.intensity = s.hemiI;
    sun.color.copy(s.sun);
    sun.intensity = s.sunI;

    wallMat.color.copy(s.wall);
    sideMat.color.copy(s.wall).lerp(new THREE.Color(0x000000), 0.06);
    floorMat.color.setHex(night ? 0x2A2318 : 0xC6B096);
    rugMat.color.setHex(night ? 0x2C2620 : 0xA89880);
    frameMat.color.setHex(night ? 0xD8D2C6 : 0xF7F3EA);
    curtainMat.color.setHex(night ? 0x3A3630 : 0xF1E7D6);

    lampLight.intensity = s.light * 1.7;
    scene.background = s.skyB.clone().lerp(new THREE.Color(0x000000), 0.15);

    rainGroup.visible = wet && !night;

    render();
  }

  /* ---------- 相机 ---------- */

  var center = new THREE.Vector3(0, 0.98, dz - 0.05);
  var radius = 3.7, pitch = 0.40;
  var yawT = 0, yawNow = 0;
  var camPos = new THREE.Vector3();
  var camLook = new THREE.Vector3();
  var posT = new THREE.Vector3();
  var lookT = new THREE.Vector3();
  var pushing = false;

  function computeCam(){
    camPos.set(
      center.x + Math.sin(yawNow) * radius * Math.cos(pitch),
      center.y + Math.sin(pitch) * radius,
      center.z + Math.cos(yawNow) * radius * Math.cos(pitch)
    );
    camLook.copy(center);
  }

  function fit(){
    var w = window.innerWidth, h = window.innerHeight;
    if (!w || !h) return;
    var a = w / h;
    camera.aspect = a;
    camera.fov = a < 0.8 ? 56 : 44;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    radius = a < 0.8 ? 3.8 : 3.0;
    computeCam();
    if (!pushing){ camera.position.copy(camPos); camera.lookAt(camLook); }
    render();
  }

  var raf = null;
  function render(){
    if (raf) return;
    raf = requestAnimationFrame(function(){ raf = null; renderer.render(scene, camera); });
  }

  var t0 = 0;
  function loop(now){
    requestAnimationFrame(loop);
    if (!document.body.classList.contains('home')) return;
    if (!t0) t0 = now || 1;
    var t = ((now || 0) - t0) / 1000;

    curL.rotation.z = Math.sin(t * 0.7) * 0.035;
    curR.rotation.z = -Math.sin(t * 0.7 + 0.6) * 0.035;

    for (var i = 0; i < clouds.length; i++){
      clouds[i].position.x += 0.0016;
      if (clouds[i].position.x > 2.5) clouds[i].position.x = -2.5;
    }

    if (rainGroup.visible){
      for (var j = 0; j < drops.length; j++){
        drops[j].position.y -= 1.5 * 0.016;
        if (drops[j].position.y < 0.1){
          drops[j].position.y = 2.0;
          drops[j].position.x = -1.8 + Math.random() * 3.6;
        }
      }
    }

    var br = 1 + Math.sin(t * 1.4) * 0.012;
    cat.scale.set(1, br, 1);

    if (!pushing){
      yawNow += (yawT - yawNow) * 0.10;
      computeCam();
      camera.position.lerp(camPos, 0.16);
      camLook.lerp(center, 0.16);
      camera.lookAt(camLook);
    }
    renderer.render(scene, camera);
  }

  /* ---------- 拖与点 ---------- */

  var ray = new THREE.Raycaster();
  var ndc = new THREE.Vector2();
  var downX = 0, dragging = false, movedFar = false;

  function pick(x, y){
    ndc.x = (x / window.innerWidth) * 2 - 1;
    ndc.y = -(y / window.innerHeight) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    var hits = ray.intersectObjects(things, true);
    return hits.length ? hits[0].object : null;
  }

  canvas.addEventListener('pointerdown', function(ev){
    downX = ev.clientX; dragging = true; movedFar = false;
    try{ canvas.setPointerCapture(ev.pointerId); }catch(e){}
  });

  canvas.addEventListener('pointermove', function(ev){
    if (!dragging) return;
    var dx = ev.clientX - downX;
    if (Math.abs(dx) > 5) movedFar = true;
    yawT = Math.max(-0.42, Math.min(0.42, yawT - dx * 0.0018));
    downX = ev.clientX;
    render();
  });

  canvas.addEventListener('pointerup', function(ev){
    dragging = false;
    if (movedFar) return;
    var o = pick(ev.clientX, ev.clientY);
    if (!o) return;
    var key = o.userData.key;
    if (!key) return;

    var p = new THREE.Vector3();
    o.getWorldPosition(p);
    posT.copy(p).add(new THREE.Vector3(0, 0.15, 0.5));
    lookT.copy(p);

    pushing = true;
    var n = 0;
    (function goIn(){
      n++;
      camera.position.lerp(posT, 0.22);
      camera.lookAt(lookT);
      renderer.render(scene, camera);
      if (n < 8) requestAnimationFrame(goIn);
      else { pushing = false; open(key); }
    })();
  });

  canvas.addEventListener('pointercancel', function(){ dragging = false; });

  var clockEl = $('.clock');
  var lastTap = 0;
  if (clockEl){
    clockEl.addEventListener('click', function(){
      var now = Date.now();
      if (now - lastTap < 420){ yawT = 0; flash('回到桌子前面。'); }
      lastTap = now;
    });
  }

  if (modeBtn) modeBtn.addEventListener('click', function(){ applyMode(!night); });

  computeCam();
  camera.position.copy(camPos);
  camera.lookAt(camLook);

  window.addEventListener('resize', fit);
  fit();
  syncSky();
  setInterval(syncSky, 60000);

  setTimeout(function(){ if (boot) boot.textContent = ''; }, 900);
  requestAnimationFrame(loop);

})();
