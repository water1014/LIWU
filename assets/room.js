/* 里屋 · 靠窗的书桌
   自己搭的：一间小屋、一张木桌、一扇开着的窗、窗外一片海。
   没后处理、没景深、没贴图——所以不虚。天色跟着真实时间走。
   横向拖动 = 环顾；点桌上的东西 = 镜头推过去，然后开那一页；双击时间 = 回正。 */

(async function(){
  'use strict';

  var D = window.LIWU || {};
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

  /* ---------- 主题 ---------- */

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

  /* ---------- 天色的几档 ---------- */

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

  var cA = new THREE.Color(), cB = new THREE.Color(), cT = new THREE.Color();

  function lerpHex(target, h1, h2, t){
    cA.setHex(h1); cB.setHex(h2);
    target.copy(cA).lerp(cB, t);
    return target;
  }

  function sample(h){
    h = ((h % 24) + 24) % 24;
    var i = 0;
    for (i = 0; i < KF.length - 1; i++) if (h >= KF[i].h && h <= KF[i + 1].h) break;
    if (i > KF.length - 2) i = KF.length - 2;
    var a = KF[i], b = KF[i + 1];
    var t = (h - a.h) / Math.max(0.0001, b.h - a.h);
    return {
      skyA: lerpHex(new THREE.Color(), a.skyA, b.skyA, t),
      skyB: lerpHex(new THREE.Color(), a.skyB, b.skyB, t),
      sea: lerpHex(new THREE.Color(), a.sea, b.sea, t),
      sun: lerpHex(new THREE.Color(), a.sun, b.sun, t),
      hemi: lerpHex(new THREE.Color(), a.hemi, b.hemi, t),
      wall: lerpHex(new THREE.Color(), a.wall, b.wall, t),
      sunI: a.sunI + (b.sunI - a.sunI) * t,
      hemiI: a.hemiI + (b.hemiI - a.hemiI) * t,
      light: a.light + (b.light - a.light) * t
    };
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
  lampLight.position.set(-0.72, 1.12, -1.1);
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

  /* ---------- 窗外的天 ---------- */

  function skyCanvas(){
    var c = document.createElement('canvas');
    c.width = 16; c.height = 256;
    skyCanvas.c = c;
    return c;
  }
  var skyCv = skyCanvas();
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
  var sky = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.6), skyMat);
  sky.position.set(0, 1.45, WALLZ - 0.9);
  scene.add(sky);

  var seaMat = new THREE.MeshBasicMaterial({ color: 0x9FBCC4 });
  var sea = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.0), seaMat);
  sea.position.set(0, 0.55, WALLZ - 0.86);
  scene.add(sea);

  var sandMat = new THREE.MeshBasicMaterial({ color: 0xDFD2B8 });
  var sand = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.42), sandMat);
  sand.position.set(0, 0.03, WALLZ - 0.84);
  scene.add(sand);

  // 远处一条山
  var hillMat = new THREE.MeshBasicMaterial({ color: 0x9AA0A0 });
  var hill = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.16), hillMat);
  hill.position.set(0, 1.02, WALLZ - 0.88);
  scene.add(hill);

  // 云
  var cloudMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.55 });
  var clouds = [];
  for (var ci2 = 0; ci2 < 4; ci2++){
    var cl = new THREE.Mesh(new THREE.CircleGeometry(0.2, 14), cloudMat);
    cl.position.set(-1.6 + ci2 * 1.1, 2.15 - (ci2 % 2) * 0.14, WALLZ - 0.95);
    cl.scale.set(2.4, 0.7, 1);
    scene.add(cl);
    clouds.push(cl);
  }

  /* ---------- 窗 ---------- */

  var WX = 0, WY = 1.45, WW = 1.7, WH = 1.15;
  var frameMat = M(0xF7F3EA, 0.9);
  var fz = WALLZ + 0.01;

  function bar(w, h, x, y, z){
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), frameMat);
    m.position.set(x, y, z);
    m.castShadow = true;
    scene.add(m);
    return m;
  }
  bar(WW + 0.16, 0.08, WX, WY + WH / 2, fz);
  bar(WW + 0.16, 0.08, WX, WY - WH / 2, fz);
  bar(0.08, WH, WX - WW / 2, WY, fz);
  bar(0.08, WH, WX + WW / 2, WY, fz);
  bar(0.05, WH, WX, WY, fz);

  // 窗台板
  var sill = new THREE.Mesh(new THREE.BoxGeometry(WW + 0.3, 0.06, 0.22), M(0xF2EDE2, 0.9));
  sill.position.set(WX, WY - WH / 2 - 0.04, fz + 0.1);
  sill.castShadow = true;
  sill.receiveShadow = true;
  scene.add(sill);

  // 窗台上的小盆栽
  var pot = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.075, 14), M(0xB9A183, 0.9));
  pot.position.set(0.62, WY - WH / 2 + 0.0, fz + 0.1);
  pot.castShadow = true;
  scene.add(pot);
  var leaf = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), M(0x6F7F5A, 0.95));
  leaf.position.set(0.62, WY - WH / 2 + 0.1, fz + 0.1);
  leaf.scale.set(1, 1.3, 1);
  leaf.castShadow = true;
  scene.add(leaf);

  // 窗帘（两片，会轻轻摆）
  var curtainMat = M(0xF1E7D6, 0.98);
  var curL = new THREE.Mesh(new THREE.PlaneGeometry(0.42, WH + 0.3), curtainMat);
  curL.position.set(WX - WW / 2 - 0.12, WY + 0.02, fz + 0.14);
  curL.castShadow = true;
  scene.add(curL);
  var curR = new THREE.Mesh(new THREE.PlaneGeometry(0.42, WH + 0.3), curtainMat);
  curR.position.set(WX + WW / 2 + 0.12, WY + 0.02, fz + 0.14);
  curR.castShadow = true;
  scene.add(curR);

  /* ---------- 书桌 ---------- */

  var DW = 1.8, DD = 0.78, DH = 0.74;
  var dz = WALLZ + 0.5;

  var deskTop = new THREE.Mesh(new THREE.BoxGeometry(DW, 0.06, DD), M(0xB08A5E, 0.85));
  deskTop.position.set(0, DH, dz);
  deskTop.castShadow = true;
  deskTop.receiveShadow = true;
  scene.add(deskTop);

  var legPos = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (var li = 0; li < legPos.length; li++){
    var lg = new THREE.Mesh(new THREE.BoxGeometry(0.07, DH, 0.07), M(0x8A6A46, 0.9));
    lg.position.set(legPos[li][0] * (DW / 2 - 0.08), DH / 2, dz + legPos[li][1] * (DD / 2 - 0.07));
    lg.castShadow = true;
    scene.add(lg);
  }

  /* ---------- 桌上的五件 ---------- */

  var things = [];
  function put(obj, key){
    obj.traverse(function(o){ o.userData.key = key; });
    scene.add(obj);
    things.push(obj);
  }

  // 摊开的笔记本 → 日记
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

  // 相框 → 相册
  var photo = new THREE.Group();
  var pFrame = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.33, 0.02), M(0x6B4E36, 0.85));
  pFrame.castShadow = true;
  photo.add(pFrame);
  var pCard = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.27), M(0xE4DCCC, 0.95));
  pCard.position.z = 0.012;
  photo.add(pCard);
  var pLeg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.17, 0.01), M(0x6B4E36, 0.9));
  pLeg.position.set(0, -0.07, -0.08);
  pLeg.rotation.x = 0.3;
  photo.add(pLeg);
  photo.position.set(0.58, DH + 0.18, dz - 0.16);
  photo.rotation.y = -0.2;
  put(photo, 'album');

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
  radio.position.set(0.22, DH + 0.03, dz + 0.2);
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
  stack.position.set(-0.72, DH + 0.03, dz - 0.1);
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

  /* ---------- 天色同步 ---------- */

  var lastPaint = -1;

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
    frameMat.color.setHex(night ? 0xD8D2C6 : 0xF7F3EA);
    curtainMat.color.setHex(night ? 0x3A3630 : 0xF1E7D6);

    lampLight.intensity = s.light * 1.6;
    scene.background = s.skyB.clone().lerp(new THREE.Color(0x000000), 0.15);

    render();
  }

  /* ---------- 相机 ---------- */

  var center = new THREE.Vector3(0, 0.98, dz - 0.05);
  var radius = 3.6, pitch = 0.40;
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
    radius = a < 0.8 ? 3.7 : 2.9;
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

    // 窗帘、云、波光
    curL.rotation.z = Math.sin(t * 0.7) * 0.035;
    curR.rotation.z = -Math.sin(t * 0.7 + 0.6) * 0.035;
    for (var i = 0; i < clouds.length; i++){
      clouds[i].position.x += 0.0016;
      if (clouds[i].position.x > 2.4) clouds[i].position.x = -2.4;
    }

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

  /* ---------- 双击时间回正 ---------- */

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

  /* ---------- 起 ---------- */

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
