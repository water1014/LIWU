/* 里屋 · 靠窗书桌 v29
   这版不是加东西，是加质感：木纹、接触阴影、环境光反射、软影、纱帘竖纹、灯晕、种子化的倒角。
   镜头加了一点呼吸，推镜更缓。 */

(function(){
  'use strict';
  var boot = document.getElementById('boot');
  function fail(m){ if(boot){ boot.textContent = m; boot.style.opacity = '1'; } }
  function ok(){ if(boot) boot.textContent = ''; }

  var CDNS = [
    'https://cdn.staticfile.net/three.js/0.160.0/three.module.min.js',
    'https://cdn.bootcdn.net/ajax/libs/three.js/0.160.0/three.module.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'
  ];
  function withTimeout(p, ms){
    return Promise.race([p, new Promise(function(_, j){ setTimeout(function(){ j(new Error('t')); }, ms); })]);
  }
  async function loadThree(){
    for (var i = 0; i < CDNS.length; i++){
      try{ var lib = await withTimeout(import(CDNS[i]), 5000); if (lib && lib.Scene) return lib; }catch(e){}
      fail('正在拿 3D 库（第 ' + (i+1) + ' 个）…');
    }
    return null;
  }
  loadThree().then(function(T){
    if (!T){ fail('3D 库没下来。底部那排还能用。'); return; }
    try{ init(T); }catch(e){ fail('场景出错：' + (e && e.message ? e.message : e)); }
  });

  function init(THREE){

  var D = window.LIWU || {};
  var $ = function(s){ return document.querySelector(s); };
  var p2 = function(n){ return n < 10 ? '0' + n : '' + n; };
  var canvas = document.getElementById('stage');
  var modeBtn = $('#hudMode');
  var WEEK = ['周日','周一','周二','周三','周四','周五','周六'];

  function paintClock(){
    var d = new Date(), t = $('#hudTime'), dt = $('#hudDate');
    if (t) t.textContent = p2(d.getHours()) + ':' + p2(d.getMinutes());
    if (dt) dt.textContent = (d.getMonth()+1) + '月' + d.getDate() + '日 · ' + WEEK[d.getDay()];
  }
  paintClock(); setInterval(paintClock, 20000);

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
    d.className = 'desk-flash'; d.textContent = text;
    document.getElementById('desk-wrap').appendChild(d);
    setTimeout(function(){ d.style.opacity = '0'; }, 1300);
    setTimeout(function(){ d.remove(); }, 1900);
  }

  var hudMenu = $('#hudMenu');
  if (hudMenu) hudMenu.addEventListener('click', function(){ var b = document.getElementById('menuBtn'); if (b) b.click(); });
  var homeBtn = document.querySelector('.drawer-nav [data-view="home"]');
  if (homeBtn) homeBtn.addEventListener('click', function(){ setHome(true); });
  var backBtn = document.getElementById('viewBack');
  if (backBtn) backBtn.addEventListener('click', function(){ if (fromHome){ fromHome = false; setTimeout(function(){ setHome(true); }, 20); } });

  var NAV = [['chat','说话'],['diary','日记'],['album','相册'],['memory','记忆'],['settings','设置']];
  var dock = document.getElementById('deskDock');
  if (dock && !dock.childNodes.length){
    for (var i = 0; i < NAV.length; i++){
      (function(it){
        var b = document.createElement('button');
        b.type = 'button'; b.textContent = it[1];
        b.addEventListener('click', function(){ open(it[0]); });
        dock.appendChild(b);
      })(NAV[i]);
    }
  }

  var cfg = {};
  try{ cfg = JSON.parse(localStorage.getItem('liwu.cfg3') || '{}') || {}; }catch(e){}
  var night = cfg.theme === 'night';

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.05, 40);

  function canvasTex(w, h, draw){
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c);
    if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { c: c, t: t };
  }
  function M(c, r, m){ return new THREE.MeshStandardMaterial({ color: c, roughness: r == null ? 0.92 : r, metalness: m || 0 }); }

  /* 环境反射：一张灰白渐变，让金属和玻璃有东西可反 */
  var envT = canvasTex(128, 64, function(g, w, h){
    var gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#6E7684'); gr.addColorStop(0.5, '#B8B4AC'); gr.addColorStop(1, '#4A443C');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,246,225,0.55)';
    g.beginPath(); g.ellipse(w*0.3, h*0.22, 26, 12, 0, 0, Math.PI*2); g.fill();
  });
  envT.t.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = envT.t;

  /* 木纹 */
  var woodT = canvasTex(256, 256, function(g, w, h){
    g.fillStyle = '#C6A176'; g.fillRect(0, 0, w, h);
    for (var i = 0; i < 80; i++){
      var y = Math.random() * h;
      g.strokeStyle = 'rgba(112,80,48,' + (0.05 + Math.random() * 0.13) + ')';
      g.lineWidth = 0.5 + Math.random() * 1.9;
      g.beginPath(); g.moveTo(0, y);
      for (var x = 0; x <= w; x += 14) g.lineTo(x, y + Math.sin(x * 0.05 + i) * 3.2);
      g.stroke();
    }
    for (var k = 0; k < 2400; k++){
      g.fillStyle = 'rgba(88,60,34,' + (Math.random() * 0.07) + ')';
      g.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6);
    }
  });
  woodT.t.wrapS = woodT.t.wrapT = THREE.RepeatWrapping;
  woodT.t.repeat.set(2.2, 1.6);

  /* 接触阴影（贴地的一团暗） */
  var blobT = canvasTex(64, 64, function(g, w, h){
    var gr = g.createRadialGradient(32, 32, 1, 32, 32, 30);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)');
    gr.addColorStop(0.55, 'rgba(0,0,0,0.22)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  function blob(x, z, r, op){
    var m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({
      map: blobT.t, transparent: true, depthWrite: false, opacity: op == null ? 0.5 : op
    }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.0016, z);
    scene.add(m);
    return m;
  }

  /* 灯晕 */
  var glowT = canvasTex(64, 64, function(g, w, h){
    var gr = g.createRadialGradient(32, 32, 1, 32, 32, 31);
    gr.addColorStop(0, 'rgba(255,214,150,0.9)');
    gr.addColorStop(0.4, 'rgba(255,196,120,0.32)');
    gr.addColorStop(1, 'rgba(255,180,100,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });

  /* ---------- 天色 ---------- */
  var KF = [
    { h: 0,  skyA: 0x0A1220, skyB: 0x1C2740, sea: 0x15233A, sun: 0x35507A, sunI: 0.36, hemi: 0x3D4E68, hemiI: 0.44, desk: 0x3A2E22, light: 0.5 },
    { h: 5,  skyA: 0x25314A, skyB: 0x6E6A78, sea: 0x2C3A4E, sun: 0xB98A6A, sunI: 0.7,  hemi: 0x6A6A78, hemiI: 0.58, desk: 0x4A3828, light: 0.6 },
    { h: 7,  skyA: 0x8FA9C2, skyB: 0xE6D9C6, sea: 0x7E99A8, sun: 0xFFD6A8, sunI: 1.8,  hemi: 0xD9D3C6, hemiI: 0.9,  desk: 0x9A7550, light: 0.7 },
    { h: 12, skyA: 0xA8C6DB, skyB: 0xF2EADB, sea: 0x9FBCC4, sun: 0xFFF3DC, sunI: 2.6,  hemi: 0xFFF1DC, hemiI: 1.05, desk: 0xB08A5E, light: 0 },
    { h: 17, skyA: 0xD9B68C, skyB: 0xF6DFBE, sea: 0xB6A88E, sun: 0xFFC98C, sunI: 2.2,  hemi: 0xF2DCC0, hemiI: 0.95, desk: 0xAC8760, light: 0.4 },
    { h: 19, skyA: 0x5A4A5C, skyB: 0xC08A6E, sea: 0x4A4652, sun: 0xE0956A, sunI: 0.95, hemi: 0x7A6A6A, hemiI: 0.62, desk: 0x6A5038, light: 1.35 },
    { h: 22, skyA: 0x101828, skyB: 0x24304A, sea: 0x1A2740, sun: 0x3A5478, sunI: 0.4,  hemi: 0x3D4E68, hemiI: 0.46, desk: 0x3C3024, light: 1.6 },
    { h: 24, skyA: 0x0A1220, skyB: 0x1C2740, sea: 0x15233A, sun: 0x35507A, sunI: 0.36, hemi: 0x3D4E68, hemiI: 0.44, desk: 0x3A2E22, light: 0.5 }
  ];
  function lerpCol(out, a1, b1, t){ out.copy(new THREE.Color(a1)).lerp(new THREE.Color(b1), t); return out; }
  function sample(h){
    h = ((h % 24) + 24) % 24;
    var i = 0;
    for (i = 0; i < KF.length - 1; i++) if (h >= KF[i].h && h <= KF[i+1].h) break;
    if (i > KF.length - 2) i = KF.length - 2;
    var a = KF[i], b = KF[i+1], o = {};
    var t = (h - a.h) / Math.max(0.0001, b.h - a.h);
    ['skyA','skyB','sea','sun','hemi','desk'].forEach(function(k){ o[k] = lerpCol(new THREE.Color(), a[k], b[k], t); });
    o.sunI = a.sunI + (b.sunI - a.sunI) * t;
    o.hemiI = a.hemiI + (b.hemiI - a.hemiI) * t;
    o.light = a.light + (b.light - a.light) * t;
    return o;
  }

  var hemi = new THREE.HemisphereLight(0xFFF1DC, 0x6A5E50, 0.9);
  scene.add(hemi);

  var sun = new THREE.DirectionalLight(0xFFF3DC, 2.2);
  sun.position.set(0.6, 2.3, -2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.left = -1.4; sun.shadow.camera.right = 1.4;
  sun.shadow.camera.top = 1.4; sun.shadow.camera.bottom = -1.4;
  sun.shadow.camera.near = 0.2; sun.shadow.camera.far = 8;
  sun.shadow.bias = -0.0009;
  if ('radius' in sun.shadow) sun.shadow.radius = 3.5;
  scene.add(sun);

  // 窗边一盏补光，让帘子和窗台不死
  var fill = new THREE.DirectionalLight(0xDCE6F0, 0.5);
  fill.position.set(-1.6, 1.4, 1.2);
  scene.add(fill);

  var lampLight = new THREE.PointLight(0xFFC489, 0, 2.0, 2);
  lampLight.position.set(-0.55, 0.4, 0.26);
  scene.add(lampLight);

  /* ---------- 桌面 ---------- */
  var DW = 1.62, DD = 1.18;
  var deskMat = new THREE.MeshStandardMaterial({ map: woodT.t, color: 0xFFFFFF, roughness: 0.72, metalness: 0.02 });
  var deskTop = new THREE.Mesh(new THREE.BoxGeometry(DW, 0.05, DD), deskMat);
  deskTop.position.set(0, -0.025, 0);
  deskTop.receiveShadow = true; deskTop.castShadow = true;
  scene.add(deskTop);

  var edgeMat = new THREE.MeshStandardMaterial({ map: woodT.t, color: 0x9A7A54, roughness: 0.8 });
  var edge = new THREE.Mesh(new THREE.BoxGeometry(DW + 0.06, 0.04, 0.07), edgeMat);
  edge.position.set(0, -0.045, DD / 2 + 0.02);
  edge.castShadow = true;
  scene.add(edge);

  /* ---------- 窗外 ---------- */
  var skyCv = document.createElement('canvas');
  skyCv.width = 16; skyCv.height = 256;
  var skyTex = new THREE.CanvasTexture(skyCv);
  if ('colorSpace' in skyTex) skyTex.colorSpace = THREE.SRGBColorSpace;
  function paintSky(s){
    var g = skyCv.getContext('2d');
    var grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#' + s.skyA.getHexString());
    grd.addColorStop(1, '#' + s.skyB.getHexString());
    g.fillStyle = grd; g.fillRect(0, 0, 16, 256);
    skyTex.needsUpdate = true;
  }
  var SKYZ = -2.05;
  var sky = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6), new THREE.MeshBasicMaterial({ map: skyTex }));
  sky.position.set(0, 1.0, SKYZ); scene.add(sky);

  var seaMat = new THREE.MeshBasicMaterial({ color: 0x9FBCC4 });
  var sea = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.9), seaMat);
  sea.position.set(0, 0.42, SKYZ + 0.01); scene.add(sea);

  var sandMat = new THREE.MeshBasicMaterial({ color: 0xDFD2B8 });
  var sand = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.35), sandMat);
  sand.position.set(0, 0, SKYZ + 0.02); scene.add(sand);

  var hillMat = new THREE.MeshBasicMaterial({ color: 0x9AA0A0 });
  var hill = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.13), hillMat);
  hill.position.set(0, 0.82, SKYZ + 0.015); scene.add(hill);

  // 海面亮带（反光）
  var glintMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.18 });
  var glint = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.05), glintMat);
  glint.position.set(0, 0.66, SKYZ + 0.012); scene.add(glint);

  var cloudMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.5 });
  var clouds = [];
  for (var c2 = 0; c2 < 4; c2++){
    var cl = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), cloudMat);
    cl.position.set(-1.6 + c2 * 1.05, 1.55 - (c2 % 2) * 0.12, SKYZ + 0.02);
    cl.scale.set(2.2, 0.65, 1); scene.add(cl); clouds.push(cl);
  }

  /* ---------- 雨 ---------- */
  var rainMat = new THREE.MeshBasicMaterial({ color: 0xC8D8E4, transparent: true, opacity: 0.4 });
  var rainGroup = new THREE.Group();
  var drops = [];
  for (var ri = 0; ri < 44; ri++){
    var dp = new THREE.Mesh(new THREE.PlaneGeometry(0.006, 0.13), rainMat);
    dp.position.set(-1.6 + Math.random() * 3.2, 0.3 + Math.random() * 1.7, SKYZ + 0.1 + Math.random() * 0.25);
    dp.rotation.z = 0.11; rainGroup.add(dp); drops.push(dp);
  }
  scene.add(rainGroup);

  /* ---------- 窗 ---------- */
  var WZ = -0.60, WY = 0.78, WW = 1.26, WH = 0.92;
  var frameMat = M(0xF7F3EA, 0.85);
  function bar(w, h, x, y, z){
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), frameMat);
    m.position.set(x, y, z); m.castShadow = true; scene.add(m);
  }
  bar(WW + 0.14, 0.07, 0, WY + WH / 2, WZ);
  bar(WW + 0.14, 0.07, 0, WY - WH / 2, WZ);
  bar(0.07, WH, -WW / 2, WY, WZ);
  bar(0.07, WH, WW / 2, WY, WZ);
  bar(0.035, WH, 0, WY, WZ);

  var sill = new THREE.Mesh(new THREE.BoxGeometry(WW + 0.24, 0.05, 0.19), M(0xF2EDE2, 0.9));
  sill.position.set(0, WY - WH / 2 - 0.03, WZ + 0.09);
  sill.castShadow = true; sill.receiveShadow = true; scene.add(sill);

  var pot = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.037, 0.066, 16), M(0xB9A183, 0.9));
  pot.position.set(0.46, WY - WH / 2 + 0.02, WZ + 0.09); pot.castShadow = true; scene.add(pot);
  var leaf = new THREE.Mesh(new THREE.SphereGeometry(0.056, 14, 12), M(0x6F7F5A, 0.95));
  leaf.position.set(0.46, WY - WH / 2 + 0.11, WZ + 0.09); leaf.scale.set(1, 1.25, 1); leaf.castShadow = true; scene.add(leaf);

  var cupMat = new THREE.MeshStandardMaterial({ color: 0xF4F0E6, roughness: 0.35 });
  var cup = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.032, 0.078, 20), cupMat);
  cup.position.set(-0.42, WY - WH / 2 + 0.055, WZ + 0.09); cup.castShadow = true; scene.add(cup);
  var cupH = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 10, 16), cupMat);
  cupH.position.set(-0.385, WY - WH / 2 + 0.06, WZ + 0.09 * 1); cupH.rotation.y = Math.PI / 2; scene.add(cupH);

  /* 纱帘：竖条纹贴图，看着有褶皱 */
  var curtainT = canvasTex(128, 32, function(g, w, h){
    for (var x = 0; x < w; x++){
      var v = 0.5 + 0.5 * Math.sin(x * 0.42);
      v = v * v;
      var r = Math.round(206 + 44 * v), gg = Math.round(198 + 42 * v), b = Math.round(182 + 40 * v);
      g.fillStyle = 'rgb(' + r + ',' + gg + ',' + b + ')';
      g.fillRect(x, 0, 1, h);
    }
  });
  var curtainMat = new THREE.MeshStandardMaterial({ map: curtainT.t, color: 0xFFFFFF, roughness: 0.98, side: THREE.DoubleSide });
  var curL = new THREE.Mesh(new THREE.PlaneGeometry(0.36, WH + 0.26), curtainMat);
  curL.position.set(-WW / 2 - 0.1, WY + 0.02, WZ + 0.11); curL.castShadow = true; scene.add(curL);
  var curR = new THREE.Mesh(new THREE.PlaneGeometry(0.36, WH + 0.26), curtainMat);
  curR.position.set(WW / 2 + 0.1, WY + 0.02, WZ + 0.11); curR.castShadow = true; scene.add(curR);

  /* ---------- 桌上 ---------- */
  var things = [];
  function put(obj, key){ obj.traverse(function(o){ o.userData.key = key; }); scene.add(obj); things.push(obj); }

  // 笔记本
  var book = new THREE.Group();
  var bCover = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.016, 0.24), M(0x8A3B2C, 0.8));
  bCover.position.y = 0.008; bCover.castShadow = true; book.add(bCover);
  var pageMat = M(0xF7F3E8, 0.95);
  var pgL = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.012, 0.22), pageMat);
  pgL.position.set(-0.077, 0.021, 0); pgL.rotation.z = 0.035; pgL.castShadow = true; book.add(pgL);
  var pgR = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.012, 0.22), pageMat);
  pgR.position.set(0.077, 0.021, 0); pgR.rotation.z = -0.035; pgR.castShadow = true; book.add(pgR);
  book.position.set(-0.33, 0.02, 0.14); book.rotation.y = 0.18;
  put(book, 'diary'); blob(-0.33, 0.14, 0.19, 0.42);

  // 相框
  var shotImg = null;
  var photoTex = canvasTex(256, 320, function(g, w, h){
    g.fillStyle = '#E4DCCC'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#9FB6C0'; g.fillRect(0, h * 0.52, w, h * 0.48);
    g.fillStyle = '#D9C7A8'; g.fillRect(0, h * 0.78, w, h * 0.22);
    g.fillStyle = '#EBBE86';
    g.beginPath(); g.arc(w * 0.68, h * 0.4, 28, 0, Math.PI * 2); g.fill();
  });
  function repaintPhoto(){
    var g = photoTex.c.getContext('2d'), w = 256, h = 320;
    if (shotImg){
      var s = Math.max(w / shotImg.width, h / shotImg.height);
      g.clearRect(0, 0, w, h); g.save();
      g.beginPath(); g.rect(0, 0, w, h); g.clip();
      g.drawImage(shotImg, (w - shotImg.width * s) / 2, (h - shotImg.height * s) / 2, shotImg.width * s, shotImg.height * s);
      g.restore();
    }
    photoTex.t.needsUpdate = true;
  }
  var photo = new THREE.Group();
  var pFrame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.30, 0.018), M(0x6B4E36, 0.8));
  pFrame.castShadow = true; photo.add(pFrame);
  var pCard = new THREE.Mesh(new THREE.PlaneGeometry(0.195, 0.25), new THREE.MeshStandardMaterial({ map: photoTex.t, roughness: 0.9 }));
  pCard.position.z = 0.011; photo.add(pCard);
  var pLeg = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.15, 0.01), M(0x6B4E36, 0.85));
  pLeg.position.set(0, -0.065, -0.07); pLeg.rotation.x = 0.3; photo.add(pLeg);
  photo.position.set(0.34, 0.155, -0.12); photo.rotation.y = -0.22;
  put(photo, 'album'); blob(0.34, -0.12, 0.15, 0.34);

  var firstShot = (D.album && D.album[0] && D.album[0].src) || '';
  if (firstShot){ var im = new Image(); im.onload = function(){ shotImg = im; repaintPhoto(); }; im.src = firstShot; }

  // 收音机
  var radio = new THREE.Group();
  var rBody = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.11, 0.13), M(0x7E6A55, 0.7));
  rBody.position.y = 0.055; rBody.castShadow = true; radio.add(rBody);
  var rFace = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.048, 0.012), new THREE.MeshStandardMaterial({ color: 0x3A2F24, roughness: 0.45 }));
  rFace.position.set(-0.018, 0.065, 0.068); radio.add(rFace);
  var rKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.016, 14), new THREE.MeshStandardMaterial({ color: 0xC9A66B, roughness: 0.35, metalness: 0.6 }));
  rKnob.rotation.x = Math.PI / 2; rKnob.position.set(0.078, 0.055, 0.07); radio.add(rKnob);
  radio.position.set(0.14, 0.02, 0.30); radio.rotation.y = -0.3;
  put(radio, 'chat'); blob(0.14, 0.30, 0.14, 0.4);

  // 一叠书
  var stack = new THREE.Group();
  var bcols = [0x6E7A5A, 0x8A3B2C, 0x4B5A6B];
  for (var bi = 0; bi < 3; bi++){
    var bk = new THREE.Mesh(new THREE.BoxGeometry(0.23 - bi * 0.016, 0.03, 0.17 - bi * 0.011), M(bcols[bi], 0.85));
    bk.position.y = 0.015 + bi * 0.032; bk.rotation.y = 0.07 * (bi + 1); bk.castShadow = true; stack.add(bk);
  }
  stack.position.set(-0.58, 0.02, -0.20);
  put(stack, 'memory'); blob(-0.58, -0.20, 0.15, 0.4);

  // 台灯
  var lamp = new THREE.Group();
  var metalMat = new THREE.MeshStandardMaterial({ color: 0x4A3C2E, roughness: 0.4, metalness: 0.55 });
  var lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.078, 0.022, 20), metalMat);
  lBase.position.y = 0.011; lBase.castShadow = true; lamp.add(lBase);
  var lStem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.32, 12), metalMat);
  lStem.position.y = 0.17; lamp.add(lStem);
  var lShade = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.052, 0.10, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xE8DCC4, roughness: 0.8, side: THREE.DoubleSide }));
  lShade.position.y = 0.35; lamp.add(lShade);
  lamp.position.set(-0.55, 0.02, 0.26);
  put(lamp, 'settings'); blob(-0.55, 0.26, 0.13, 0.4);

  var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT.t, color: 0xFFC489, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.position.set(-0.55, 0.37, 0.26);
  glow.scale.set(0.42, 0.42, 1);
  scene.add(glow);

  /* ---------- 沙漏、罐子、猫 ---------- */
  var hour = new THREE.Group();
  var hGlass = new THREE.MeshStandardMaterial({ color: 0xE8EFF2, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.55 });
  var hTop = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.062, 16), hGlass);
  hTop.position.y = 0.05; hTop.castShadow = true; hour.add(hTop);
  var hBot = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.062, 16), hGlass);
  hBot.position.y = -0.014; hBot.rotation.z = Math.PI; hBot.castShadow = true; hour.add(hBot);
  var hSand = new THREE.Mesh(new THREE.ConeGeometry(0.027, 0.036, 14), M(0xD8B87A, 0.95));
  hSand.position.y = -0.025; hour.add(hSand);
  var hB1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.007, 18), metalMat);
  hB1.position.y = 0.084; hour.add(hB1);
  var hB2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.007, 18), metalMat);
  hB2.position.y = -0.048; hour.add(hB2);
  hour.position.set(0.0, 0.11, -0.34);
  scene.add(hour); blob(0.0, -0.34, 0.08, 0.34);

  var jar = new THREE.Group();
  var jarGlass = new THREE.MeshStandardMaterial({ color: 0xEAF1F0, roughness: 0.08, metalness: 0.02, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
  var jarBody = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.058, 0.14, 22, 1, true), jarGlass);
  jarBody.position.y = 0.07; jar.add(jarBody);
  var jarBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.006, 22), jarGlass);
  jarBottom.position.y = 0.003; jar.add(jarBottom);
  var jarLid = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.013, 22), M(0x8A6A46, 0.7));
  jarLid.position.y = 0.143; jarLid.castShadow = true; jar.add(jarLid);
  for (var ni = 0; ni < 5; ni++){
    var note = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.024, 0.03), M(ni % 2 ? 0xF6E8B8 : 0xF0E2D2, 0.95));
    note.position.set(-0.018 + Math.random() * 0.036, 0.018 + ni * 0.021, -0.018 + Math.random() * 0.036);
    note.rotation.set(Math.random(), Math.random(), Math.random());
    jar.add(note);
  }
  jar.position.set(0.54, 0.02, 0.18);
  scene.add(jar); blob(0.54, 0.18, 0.1, 0.36);

  var cat = new THREE.Group();
  var furM = new THREE.MeshStandardMaterial({ color: 0x8C7B66, roughness: 0.98 });
  var catBody = new THREE.Mesh(new THREE.SphereGeometry(0.078, 20, 14), furM);
  catBody.scale.set(1.7, 0.75, 1.0); catBody.castShadow = true; cat.add(catBody);
  var catHead = new THREE.Mesh(new THREE.SphereGeometry(0.052, 20, 14), furM);
  catHead.position.set(0.12, 0.026, 0); catHead.castShadow = true; cat.add(catHead);
  var earL = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.027, 10), furM);
  earL.position.set(0.106, 0.072, 0.025); cat.add(earL);
  var earR = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.027, 10), furM);
  earR.position.set(0.106, 0.072, -0.025); cat.add(earR);
  var tail = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.007, 0.12, 10), furM);
  tail.position.set(-0.13, 0.008, 0.045); tail.rotation.z = Math.PI / 2.2; tail.rotation.y = 0.5; cat.add(tail);
  cat.position.set(-0.14, 0.075, 0.44); cat.rotation.y = -0.45;
  scene.add(cat); blob(-0.14, 0.44, 0.13, 0.4);

  /* ---------- 天色同步 ---------- */
  var lastPaint = -1;
  var wet = String((D.weather || {}).text || '').indexOf('雨') >= 0;

  function syncSky(){
    var h = new Date().getHours() + new Date().getMinutes() / 60;
    if (night) h = 21.5;
    var s = sample(h);
    if (Math.abs(h - lastPaint) > 0.05){ paintSky(s); lastPaint = h; }

    seaMat.color.copy(s.sea);
    sandMat.color.copy(s.sea).lerp(new THREE.Color(0xDFD2B8), night ? 0.15 : 0.75);
    hillMat.color.copy(s.sea).lerp(new THREE.Color(0x8A8F92), 0.5);
    glintMat.opacity = night ? 0.05 : 0.2;
    cloudMat.opacity = night ? 0.12 : 0.5;
    cloudMat.color.setHex(night ? 0x8899AA : 0xFFFFFF);

    hemi.color.copy(s.hemi); hemi.intensity = s.hemiI;
    sun.color.copy(s.sun); sun.intensity = s.sunI;
    fill.intensity = night ? 0.12 : 0.5;

    deskMat.color.copy(s.desk).lerp(new THREE.Color(0xFFFFFF), 0.62);
    edgeMat.color.copy(s.desk).lerp(new THREE.Color(0xFFFFFF), 0.3);
    frameMat.color.setHex(night ? 0xD8D2C6 : 0xF7F3EA);
    curtainMat.color.setHex(night ? 0x6A6258 : 0xFFFFFF);

    lampLight.intensity = s.light * 1.8;
    glow.material.opacity = Math.min(0.5, s.light * 0.34);
    scene.background = s.skyB.clone().lerp(new THREE.Color(0x000000), 0.3);
    rainGroup.visible = wet && !night;
    render();
  }

  /* ---------- 相机 ---------- */
  var center = new THREE.Vector3(0, 0.16, 0.02);
  var radius = 2.45, pitch = 0.63;
  var yawT = 0, yawNow = 0;
  var camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  var posT = new THREE.Vector3(), lookT = new THREE.Vector3();
  var pushing = false;

  function computeCam(){
    camPos.set(
      center.x + Math.sin(yawNow) * radius * Math.cos(pitch),
      center.y + Math.sin(pitch) * radius,
      center.z + Math.cos(yawNow) * radius * Math.cos(pitch)
    );
    camLook.copy(center);
  }
  function render(){ renderer.render(scene, camera); }

  function fit(){
    var w = window.innerWidth, h = window.innerHeight;
    if (!w || !h) return;
    var a = w / h;
    camera.aspect = a;
    camera.fov = a < 0.8 ? 62 : 48;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    radius = a < 0.62 ? 2.9 : (a < 0.8 ? 2.55 : 2.1);
    computeCam();
    if (!pushing){ camera.position.copy(camPos); camera.lookAt(camLook); }
    render();
  }

  var t0 = 0;
  function loop(now){
    requestAnimationFrame(loop);
    var home = document.body.classList.contains('home');
    if (!t0) t0 = now || 1;
    var t = ((now || 0) - t0) / 1000;
    if (!home) return;

    curL.rotation.z = Math.sin(t * 0.7) * 0.032;
    curR.rotation.z = -Math.sin(t * 0.7 + 0.6) * 0.032;
    for (var i = 0; i < clouds.length; i++){
      clouds[i].position.x += 0.0014;
      if (clouds[i].position.x > 2.2) clouds[i].position.x = -2.2;
    }
    if (rainGroup.visible){
      for (var j = 0; j < drops.length; j++){
        drops[j].position.y -= 0.024;
        if (drops[j].position.y < -0.05){
          drops[j].position.y = 1.9;
          drops[j].position.x = -1.6 + Math.random() * 3.2;
        }
      }
    }
    cat.scale.set(1, 1 + Math.sin(t * 1.4) * 0.012, 1);
    if (glow.material.opacity > 0.01) glow.material.opacity += Math.sin(t * 2.2) * 0.0008;

    if (!pushing){
      // 极轻的呼吸：像人坐在桌前会微微动
      var idle = Math.sin(t * 0.24) * 0.012;
      yawNow += (yawT + idle - yawNow) * 0.08;
      computeCam();
      camera.position.lerp(camPos, 0.10);
      camLook.lerp(center, 0.10);
      camera.lookAt(camLook);
    }
    renderer.render(scene, camera);
  }

  /* ---------- 拖与点 ---------- */
  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
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
    yawT = Math.max(-0.36, Math.min(0.36, yawT - dx * 0.0016));
    downX = ev.clientX;
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
    posT.copy(p).add(new THREE.Vector3(0, 0.09, 0.38));
    lookT.copy(p);
    pushing = true;
    var n = 0;
    (function goIn(){
      n++;
      camera.position.lerp(posT, 0.14);
      camera.lookAt(lookT);
      renderer.render(scene, camera);
      if (n < 16) requestAnimationFrame(goIn);
      else { pushing = false; open(key); }
    })();
  });
  canvas.addEventListener('pointercancel', function(){ dragging = false; });

  var clockEl = $('.clock'), lastTap = 0;
  if (clockEl) clockEl.addEventListener('click', function(){
    var now = Date.now();
    if (now - lastTap < 420){ yawT = 0; flash('回到桌子前面。'); }
    lastTap = now;
  });

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
    syncSky();
  }
  if (modeBtn) modeBtn.addEventListener('click', function(){ applyMode(!night); });

  computeCam();
  camera.position.copy(camPos);
  camera.lookAt(camLook);
  window.addEventListener('resize', fit);
  fit();
  applyMode(night);
  setInterval(syncSky, 60000);
  ok();
  requestAnimationFrame(loop);

  }
})();
