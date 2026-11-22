/* 里屋 · 靠窗的书桌（three.js）
   一桌、一窗、窗外一片天。左右拖着看，点桌上的东西镜头推过去。
   桌上不放字：东西只是东西，文字点开后在网页里看，所以不会糊。 */

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
  var pushed = false;

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
    if (on){
      document.body.classList.add('home');
      pushed = false;
      if (THREE){ fit(); }
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
    if (meta) meta.setAttribute('content', m === 'night' ? '#0E1015' : '#E8E1D3');
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

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.05, 80);

  function C(hex){ return new THREE.Color(hex); }
  function mat(c, r, m){
    return new THREE.MeshStandardMaterial({ color: c, roughness: r == null ? 0.9 : r, metalness: m || 0 });
  }

  /* ---------- 灯 ---------- */

  var hemi = new THREE.HemisphereLight(0xFFF1DC, 0x8A7F70, 0.85);
  scene.add(hemi);

  var sunLight = new THREE.DirectionalLight(0xFFE7C2, 2.2);
  sunLight.position.set(2.6, 3.2, -3.4);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.left = -3;
  sunLight.shadow.camera.right = 3;
  sunLight.shadow.camera.top = 3;
  sunLight.shadow.camera.bottom = -1;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 12;
  sunLight.shadow.bias = -0.001;
  scene.add(sunLight);

  var lampLight = new THREE.PointLight(0xFFC892, 0, 3.2, 2);
  lampLight.position.set(-0.78, 1.22, -1.32);
  scene.add(lampLight);

  /* ---------- 房间 ---------- */

  var RW = 4.2, RD = 3.4, RH = 2.6;

  var floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), mat(0xC9B89C, 0.95));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 0.2);
  floor.receiveShadow = true;
  scene.add(floor);

  var backWall = new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), mat(0xEDE6D8, 0.98));
  backWall.position.set(0, RH / 2, -RD / 2 + 0.2);
  backWall.receiveShadow = true;
  scene.add(backWall);

  var leftWall = new THREE.Mesh(new THREE.PlaneGeometry(RD, RH), mat(0xE7DFD0, 0.98));
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-RW / 2, RH / 2, 0.2);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  var rightWall = new THREE.Mesh(new THREE.PlaneGeometry(RD, RH), mat(0xE7DFD0, 0.98));
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(RW / 2, RH / 2, 0.2);
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  /* ---------- 窗 ---------- */

  var WX = 0.95, WY = 1.58, WW = 1.5, WH = 1.25;

  // 窗外：天空
  function skyTexture(){
    var c = document.createElement('canvas');
    c.width = 8; c.height = 256;
    var g = c.getContext('2d');
    var grd = g.createLinearGradient(0, 0, 0, 256);
    if (mode === 'night'){
      grd.addColorStop(0, '#0C1424');
      grd.addColorStop(0.55, '#1B2A45');
      grd.addColorStop(1, '#2C3B55');
    } else {
      grd.addColorStop(0, '#A9C6DA');
      grd.addColorStop(0.55, '#CFDDE4');
      grd.addColorStop(1, '#EDE6D6');
    }
    g.fillStyle = grd;
    g.fillRect(0, 0, 8, 256);
    var t = new THREE.CanvasTexture(c);
    if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  var skyMat = new THREE.MeshBasicMaterial({ map: skyTexture() });
  var sky = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), skyMat);
  sky.position.set(WX, WY + 0.1, -RD / 2 - 0.6);
  scene.add(sky);

  // 海
  var seaMat = new THREE.MeshBasicMaterial({ color: mode === 'night' ? 0x213247 : 0x9FBCC4 });
  var sea = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.1), seaMat);
  sea.position.set(WX, WY - 0.55, -RD / 2 - 0.58);
  scene.add(sea);

  // 沙滩
  var sandMat = new THREE.MeshBasicMaterial({ color: mode === 'night' ? 0x2A2620 : 0xDFD2B8 });
  var sand = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.35), sandMat);
  sand.position.set(WX, WY - 0.93, -RD / 2 - 0.56);
  scene.add(sand);

  // 窗框
  var frameMat = mat(0xF7F3EA, 0.9);
  var fz = -RD / 2 + 0.2 + 0.005;

  var fT = new THREE.Mesh(new THREE.BoxGeometry(WW + 0.14, 0.07, 0.05), frameMat);
  fT.position.set(WX, WY + WH / 2, fz);
  fT.castShadow = true;
  scene.add(fT);

  var fB = new THREE.Mesh(new THREE.BoxGeometry(WW + 0.14, 0.07, 0.05), frameMat);
  fB.position.set(WX, WY - WH / 2, fz);
  fB.castShadow = true;
  scene.add(fB);

  var fL = new THREE.Mesh(new THREE.BoxGeometry(0.07, WH, 0.05), frameMat);
  fL.position.set(WX - WW / 2, WY, fz);
  fL.castShadow = true;
  scene.add(fL);

  var fR = new THREE.Mesh(new THREE.BoxGeometry(0.07, WH, 0.05), frameMat);
  fR.position.set(WX + WW / 2, WY, fz);
  fR.castShadow = true;
  scene.add(fR);

  var fM = new THREE.Mesh(new THREE.BoxGeometry(0.05, WH, 0.04), frameMat);
  fM.position.set(WX, WY, fz);
  scene.add(fM);

  var fH = new THREE.Mesh(new THREE.BoxGeometry(WW, 0.04, 0.04), frameMat);
  fH.position.set(WX, WY + 0.18, fz);
  scene.add(fH);

  // 窗台板
  var sill = new THREE.Mesh(new THREE.BoxGeometry(WW + 0.24, 0.06, 0.2), mat(0xF2EDE2, 0.9));
  sill.position.set(WX, WY - WH / 2 - 0.04, fz + 0.09);
  sill.castShadow = true;
  sill.receiveShadow = true;
  scene.add(sill);

  // 窗台上一个小花盆
  var pot = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.08, 14), mat(0xB9A183, 0.9));
  pot.position.set(WX + 0.5, WY - WH / 2 + 0.0, fz + 0.09);
  pot.castShadow = true;
  scene.add(pot);

  var leaf = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mat(0x6F7F5A, 0.95));
  leaf.position.set(WX + 0.5, WY - WH / 2 + 0.1, fz + 0.09);
  leaf.scale.set(1, 1.2, 1);
  leaf.castShadow = true;
  scene.add(leaf);

  /* ---------- 书桌 ---------- */

  var desk = new THREE.Group();
  var DW = 1.9, DD = 0.82, DH = 0.75;
  var dx = -0.05, dz = -RD / 2 + 0.62;

  var top = new THREE.Mesh(new THREE.BoxGeometry(DW, 0.06, DD), mat(0xB08A5E, 0.85));
  top.position.set(dx, DH, dz);
  top.castShadow = true;
  top.receiveShadow = true;
  desk.add(top);

  var legPos = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (var i = 0; i < legPos.length; i++){
    var lg = new THREE.Mesh(new THREE.BoxGeometry(0.07, DH, 0.07), mat(0x8A6A46, 0.9));
    lg.position.set(dx + legPos[i][0] * (DW / 2 - 0.08), DH / 2, dz + legPos[i][1] * (DD / 2 - 0.07));
    lg.castShadow = true;
    desk.add(lg);
  }
  scene.add(desk);

  /* ---------- 桌上的东西 ---------- */

  var things = [];

  function addThing(obj, key){
    obj.userData.key = key;
    obj.traverse(function(o){ o.userData.key = key; });
    scene.add(obj);
    things.push(obj);
    return obj;
  }

  // 摊开的笔记本 → 日记
  var book = new THREE.Group();
  var bCover = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.018, 0.26), mat(0x8A3B2C, 0.85));
  bCover.position.set(0, 0.012, 0);
  bCover.castShadow = true;
  book.add(bCover);
  var pl = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.014, 0.24), mat(0xF7F3E8, 0.95));
  pl.position.set(-0.083, 0.028, 0);
  pl.rotation.z = 0.05;
  pl.castShadow = true;
  book.add(pl);
  var pr = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.014, 0.24), mat(0xF7F3E8, 0.95));
  pr.position.set(0.083, 0.028, 0);
  pr.rotation.z = -0.05;
  pr.castShadow = true;
  book.add(pr);
  book.position.set(dx - 0.5, DH + 0.03, dz + 0.12);
  book.rotation.y = 0.16;
  addThing(book, 'diary');

  // 相框 → 相册
  var frameG = new THREE.Group();
  var fr = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.022), mat(0x6B4E36, 0.85));
  fr.castShadow = true;
  frameG.add(fr);
  var pic = new THREE.Mesh(new THREE.PlaneGeometry(0.23, 0.29), mat(0xE4DCCC, 0.95));
  pic.position.z = 0.013;
  frameG.add(pic);
  var stand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.012), mat(0x6B4E36, 0.9));
  stand.position.set(0, -0.1, -0.09);
  stand.rotation.x = 0.32;
  frameG.add(stand);
  frameG.position.set(dx + 0.62, DH + 0.2, dz - 0.22);
  frameG.rotation.y = -0.22;
  addThing(frameG, 'album');

  // 收音机 → 说话
  var radio = new THREE.Group();
  var rb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.16), mat(0x7E6A55, 0.75));
  rb.position.y = 0.07;
  rb.castShadow = true;
  radio.add(rb);
  var rf = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.012), mat(0x4A3C2E, 0.7));
  rf.position.set(-0.02, 0.08, 0.083);
  radio.add(rf);
  var knob = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 12), mat(0xC9A66B, 0.5));
  knob.rotation.x = Math.PI / 2;
  knob.position.set(0.1, 0.07, 0.085);
  radio.add(knob);
  radio.position.set(dx + 0.3, DH + 0.03, dz + 0.18);
  radio.rotation.y = -0.3;
  addThing(radio, 'chat');

  // 一叠书 → 记忆
  var stack = new THREE.Group();
  var cols = [0x6E7A5A, 0x8A3B2C, 0x4B5A6B];
  for (var b = 0; b < 3; b++){
    var bk = new THREE.Mesh(new THREE.BoxGeometry(0.26 - b * 0.02, 0.035, 0.19 - b * 0.015), mat(cols[b], 0.9));
    bk.position.set(0, 0.02 + b * 0.038, 0);
    bk.rotation.y = 0.06 * (b + 1);
    bk.castShadow = true;
    stack.add(bk);
  }
  stack.position.set(dx - 0.72, DH + 0.03, dz - 0.16);
  addThing(stack, 'memory');

  // 台灯 → 设置
  var lamp = new THREE.Group();
  var lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.025, 16), mat(0x4A3C2E, 0.7));
  lBase.position.y = 0.012;
  lBase.castShadow = true;
  lamp.add(lBase);
  var lStem = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.4, 10), mat(0x6B5A45, 0.6));
  lStem.position.y = 0.22;
  lamp.add(lStem);
  var lShade = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.065, 0.12, 18, 1, true), mat(0xE8DCC4, 0.85));
  lShade.position.y = 0.44;
  lamp.add(lShade);
  lamp.position.set(dx - 0.86, DH + 0.03, dz + 0.24);
  addThing(lamp, 'settings');

  /* ---------- 相机 ---------- */

  var ORBIT = { yaw: 0, pitch: 0.12, dist: 2.15 };
  var center = new THREE.Vector3(0, 1.05, -1.05);
  var yawT = 0, yawNow = 0;
  var camPos = new THREE.Vector3();
  var camLook = new THREE.Vector3();
  var posT = new THREE.Vector3();
  var lookT = new THREE.Vector3();

  function computeCam(){
    var y = yawNow;
    var sp = Math.sin(ORBIT.pitch);
    camPos.set(
      center.x + Math.sin(y) * ORBIT.dist * Math.cos(ORBIT.pitch),
      center.y + Math.sin(ORBIT.pitch) * ORBIT.dist * 2.2,
      center.z + Math.cos(y) * ORBIT.dist * Math.cos(ORBIT.pitch)
    );
    camLook.copy(center);
  }

  function fit(){
    var w = window.innerWidth, h = window.innerHeight;
    if (!w || !h) return;
    var a = w / h;
    camera.aspect = a;
    camera.fov = a < 0.8 ? 58 : 44;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    center.set(0, 1.05, -1.05);
    ORBIT.dist = a < 0.8 ? 2.5 : 2.15;
    posT.copy(camPos);
    lookT.copy(camLook);
    render();
  }

  /* ---------- 渲染 ---------- */

  var raf = null;
  function render(){
    if (raf) return;
    raf = requestAnimationFrame(function(){ raf = null; renderer.render(scene, camera); });
  }

  function loop(){
    requestAnimationFrame(loop);
    if (!document.body.classList.contains('home')) return;
    yawNow += (yawT - yawNow) * 0.12;
    computeCam();
    camera.position.lerp(camPos, 0.14);
    camLook.lerp(center, 0.14);
    camera.lookAt(camLook);
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
    downX = ev.clientX;
    dragging = true;
    movedFar = false;
    try{ canvas.setPointerCapture(ev.pointerId); }catch(e){}
  });

  canvas.addEventListener('pointermove', function(ev){
    if (!dragging) return;
    var dx = ev.clientX - downX;
    if (Math.abs(dx) > 5) movedFar = true;
    yawT = Math.max(-0.55, Math.min(0.55, yawT + (ev.clientX - downX) * -0.0022));
    downX = ev.clientX;
    render();
  });

  canvas.addEventListener('pointerup', function(ev){
    dragging = false;
    if (movedFar) return;
    var o = pick(ev.clientX, ev.clientY);
    if (!o) return;
    var ob = o;
    while (ob && !ob.userData) ob = ob.parent;
    var key = o.userData.key;
    if (!key) return;

    // 镜头往那个东西推一下，再开门
    var p = new THREE.Vector3();
    o.getWorldPosition(p);
    posT.copy(p).add(new THREE.Vector3(0, 0.16, 0.62));
    lookT.copy(p);
    var t0 = 0;
    function goIn(){
      t0 += 0.05;
      camera.position.lerp(posT, 0.18);
      camera.lookAt(lookT);
      renderer.render(scene, camera);
      if (t0 < 0.45) requestAnimationFrame(goIn);
      else open(key);
    }
    goIn();
  });

  canvas.addEventListener('pointercancel', function(){ dragging = false; });

  /* ---------- 双击时间，镜头归位 ---------- */

  var clockEl = $('.clock');
  var lastTap = 0;
  if (clockEl){
    clockEl.addEventListener('click', function(){
      var now = Date.now();
      if (now - lastTap < 420){
        yawT = 0;
        yawNow = 0;
        center.set(0, 1.05, -1.05);
        flash('回到桌子前面。');
      }
      lastTap = now;
    });
  }

  /* ---------- 日夜 ---------- */

  function restyle(){
    var day = mode !== 'night';
    scene.background = C(day ? 0xE8E1D3 : 0x0E1015);
    hemi.intensity = day ? 0.85 : 0.35;
    hemi.color.setHex(day ? 0xFFF1DC : 0x6C7A93);
    sunLight.intensity = day ? 2.2 : 0.55;
    sunLight.color.setHex(day ? 0xFFE7C2 : 0x8FA6C6);
    lampLight.intensity = day ? 0 : 1.6;

    skyMat.map.dispose();
    skyMat.map = skyTexture();
    skyMat.needsUpdate = true;

    seaMat.color.setHex(day ? 0x9FBCC4 : 0x213247);
    sandMat.color.setHex(day ? 0xDFD2B8 : 0x2A2620);

    backWall.material.color.setHex(day ? 0xEDE6D8 : 0x232028);
    leftWall.material.color.setHex(day ? 0xE7DFD0 : 0x1E1C22);
    rightWall.material.color.setHex(day ? 0xE7DFD0 : 0x1E1C22);
    floor.material.color.setHex(day ? 0xC9B89C : 0x1A1713);
    frameMat.color.setHex(day ? 0xF7F3EA : 0xD8D2C6);

    render();
  }

  if (modeBtn) modeBtn.addEventListener('click', function(){
    applyMode(mode === 'night' ? 'paper' : 'night');
    restyle();
  });

  /* ---------- 起 ---------- */

  scene.background = C(mode === 'night' ? 0x0E1015 : 0xE8E1D3);
  computeCam();
  camera.position.copy(camPos);
  camera.lookAt(center);

  window.addEventListener('resize', fit);
  fit();
  restyle();

  setTimeout(function(){ if (boot) boot.textContent = ''; }, 1000);
  requestAnimationFrame(loop);

})();
