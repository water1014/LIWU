/* 里屋 · 3D 主页
   一间屋子当门面。点屋里的东西就进去：
     门 / 收音机 → 说话（聊天）
     桌上的书   → 日记
     墙上相框   → 相册
     右边书架   → 记忆
     台灯       → 设置
   3D 只是壳。它崩了、网慢了、手机不支持 WebGL，下面那排照样能用。
   屋子的颜色在 COLORS。 */

(async function(){
  'use strict';

  var tip = document.getElementById('stageTip');
  var dock = document.getElementById('stageDock');
  var canvas = document.getElementById('stage');

  var ITEMS = [
    ['chat', '说话'],
    ['diary', '日记'],
    ['album', '相册'],
    ['memory', '记忆'],
    ['settings', '设置']
  ];

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
      paintDays();
      fit();
      kick();
    } else {
      document.body.classList.remove('home');
    }
  }

  function buildDock(){
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
  }

  buildDock();

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

  /* ---------- 天数 ---------- */

  var dayBoard = null;
  var sceneRef = null;
  var THREE_REF = null;

  function sinceText(){
    var s = '';
    try{ s = JSON.parse(localStorage.getItem('liwu.since') || '""') || ''; }catch(e){}
    if (!s && window.LIWU) s = window.LIWU.since || '';
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
    var hud = document.getElementById('stageDays');
    if (hud) hud.textContent = c ? ('第 ' + c + ' 天') : '';
    if (c) board(c);
    else if (dayBoard && sceneRef){
      sceneRef.remove(dayBoard);
      dayBoard = null;
    }
  }

  function board(n){
    if (!THREE_REF || !sceneRef) return;
    if (dayBoard){
      sceneRef.remove(dayBoard);
      if (dayBoard.material.map) dayBoard.material.map.dispose();
      dayBoard.material.dispose();
      dayBoard = null;
    }
    dayBoard = label('第 ' + n + ' 天', 0.0016);
    dayBoard.position.set(-2.55, 2.72, 1.1);
    sceneRef.add(dayBoard);
    kick();
  }

  setInterval(paintDays, 8000);

  /* ---------- 拉 three ---------- */

  var CDNS = [
    'https://unpkg.com/three@0.160.0/build/three.module.js',
    'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
    'https://esm.sh/three@0.160.0'
  ];

  var THREE = null;
  for (var i = 0; i < CDNS.length; i++){
    try{
      var lib = await import(CDNS[i]);
      if (lib && lib.Scene){ THREE = lib; break; }
    }catch(e){}
  }

  if (!THREE){
    if (tip) tip.textContent = '3D 没加载出来。下面那排一样能用。';
    return;
  }
  THREE_REF = THREE;

  /* ---------- 颜色 ---------- */

  var COLORS = {
    paper: 0xEFEBE2,
    floor: 0xC8BAA3,
    wall: 0xEDE7DB,
    wood: 0xA9814F,
    woodDark: 0x6B4E36,
    cloth: 0x8D8474,
    white: 0xF7F3EA,
    night: 0x4C5A70,
    glow: 0xFFE3B8
  };

  /* ---------- 地基 ---------- */

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.paper);
  sceneRef = scene;

  var camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.05, 60);

  var W = 6, D = 5, H = 3.2;
  var target = new THREE.Vector3(0, 1.02, -0.25);
  var theta = 0.16, phi = 1.26, radius = 2.85;
  var thetaT = theta, phiT = phi, radiusT = radius;

  function mat(color, rough){
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: rough == null ? 0.92 : rough,
      metalness: 0.02,
      side: THREE.DoubleSide
    });
  }
  function glow(color){ return new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide }); }

  /* ---------- 文字牌 ---------- */

  function label(text, unit){
    unit = unit || 0.0018;
    var fs = 60, pad = 34;
    var c = document.createElement('canvas');
    var ctx = c.getContext('2d');
    var font = '500 ' + fs + 'px "Noto Serif SC", "Songti SC", serif';
    ctx.font = font;
    var w = Math.ceil(ctx.measureText(text).width) + pad * 2;
    var h = fs + pad * 2;
    var dpr = 2;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(33,31,28,0.7)';
    ctx.fillText(text, w / 2, h / 2);

    var tex = new THREE.CanvasTexture(c);
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;

    var spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    spr.scale.set(w * unit, h * unit, 1);
    return spr;
  }

  var pickables = [];

  function clickable(obj, key){
    obj.traverse(function(o){ o.userData.room = key; });
    pickables.push(obj);
  }

  function tag(text, x, y, z, unit){
    var s = label(text, unit);
    s.position.set(x, y, z);
    scene.add(s);
  }

  /* ---------- 屋子 ---------- */

  var floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat(COLORS.floor, 0.96));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  var backWall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat(COLORS.wall));
  backWall.position.set(0, H / 2, -D / 2);
  scene.add(backWall);

  var leftWall = new THREE.Mesh(new THREE.PlaneGeometry(D, H), mat(COLORS.wall));
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-W / 2, H / 2, 0);
  scene.add(leftWall);

  var rightWall = new THREE.Mesh(new THREE.PlaneGeometry(D, H), mat(COLORS.wall));
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(W / 2, H / 2, 0);
  scene.add(rightWall);

  var rug = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.3), mat(COLORS.cloth, 1));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.004, 0.25);
  scene.add(rug);

  /* ---------- 灯 ---------- */

  scene.add(new THREE.HemisphereLight(0xFFF8EC, 0x8B8172, 0.95));

  var lampLight = new THREE.PointLight(0xFFC894, 2.1, 5.2, 2);
  lampLight.position.set(0.66, 1.22, -1.9);
  scene.add(lampLight);

  var doorLight = new THREE.PointLight(0xFFDCB0, 0.85, 3.4, 2);
  doorLight.position.set(-2.45, 1.05, 0.9);
  scene.add(doorLight);

  var winLight = new THREE.PointLight(0x94A9C8, 0.7, 4.2, 2);
  winLight.position.set(2.45, 1.75, 0.9);
  scene.add(winLight);

  /* ---------- 门（说话） ---------- */

  var door = new THREE.Group();

  var frame = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.15, 1.02), mat(COLORS.woodDark, 0.85));
  frame.position.set(-2.96, 1.07, 1.1);
  door.add(frame);

  var panel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.0, 0.88), mat(0x5E4632, 0.8));
  panel.position.set(-2.92, 1.0, 1.1);
  door.add(panel);

  var knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), mat(0xC9A66B, 0.35));
  knob.position.set(-2.87, 1.0, 0.72);
  door.add(knob);

  var crack = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.92, 0.045), glow(COLORS.glow));
  crack.position.set(-2.9, 1.0, 1.56);
  door.add(crack);

  scene.add(door);
  clickable(door, 'chat');
  tag('说话', -2.6, 2.32, 1.1, 0.0016);

  /* ---------- 桌子 ---------- */

  var desk = new THREE.Group();
  var top = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.07, 0.86), mat(COLORS.wood, 0.85));
  top.position.set(0.1, 0.74, -1.92);
  desk.add(top);
  var legs = [[-0.7, -0.35], [-0.7, 0.33], [0.9, -0.35], [0.9, 0.33]];
  for (var li = 0; li < legs.length; li++){
    var leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.74, 0.07), mat(COLORS.woodDark, 0.9));
    leg.position.set(0.1 + legs[li][0], 0.37, -1.92 + legs[li][1]);
    desk.add(leg);
  }
  scene.add(desk);

  /* ---------- 书（日记） ---------- */

  var book = new THREE.Group();
  var cover = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.025, 0.3), mat(0x8A3B2C, 0.8));
  cover.position.set(0.0, 0.785, -1.86);
  cover.rotation.y = 0.18;
  book.add(cover);

  var pageL = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.014, 0.27), mat(COLORS.white, 0.95));
  pageL.position.set(-0.1, 0.803, -1.86);
  pageL.rotation.y = 0.18;
  pageL.rotation.z = 0.07;
  book.add(pageL);

  var pageR = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.014, 0.27), mat(COLORS.white, 0.95));
  pageR.position.set(0.1, 0.803, -1.86);
  pageR.rotation.y = 0.18;
  pageR.rotation.z = -0.07;
  book.add(pageR);

  scene.add(book);
  clickable(book, 'diary');
  tag('日记', 0.0, 1.02, -1.8, 0.0014);

  /* ---------- 收音机（说话） ---------- */

  var radio = new THREE.Group();
  var rbody = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.13, 0.19), mat(0x7E6A55, 0.7));
  rbody.position.set(-0.58, 0.845, -1.78);
  radio.add(rbody);
  var rface = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.012), mat(0x4A3C2E, 0.6));
  rface.position.set(-0.58, 0.86, -1.682);
  radio.add(rface);
  var dial = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 14), mat(0xC9A66B, 0.4));
  dial.rotation.x = Math.PI / 2;
  dial.position.set(-0.45, 0.83, -1.68);
  radio.add(dial);
  scene.add(radio);
  clickable(radio, 'chat');
  tag('说话', -0.58, 1.02, -1.72, 0.0014);

  /* ---------- 台灯（设置） ---------- */

  var lamp = new THREE.Group();
  var lbase = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.03, 18), mat(0x4A3C2E, 0.6));
  lbase.position.set(0.66, 0.79, -2.05);
  lamp.add(lbase);
  var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.46, 10), mat(0x6B5A45, 0.5));
  stem.position.set(0.66, 1.03, -2.05);
  lamp.add(stem);
  var shade = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.085, 0.14, 20, 1, true), mat(0xE8DCC4, 0.85));
  shade.position.set(0.66, 1.30, -2.05);
  lamp.add(shade);
  scene.add(lamp);
  clickable(lamp, 'settings');
  tag('设置', 0.66, 1.58, -2.05, 0.0013);

  /* ---------- 相框（相册） ---------- */

  var frames = new THREE.Group();
  var frameXs = [-1.42, -0.94, -0.46];
  for (var fi = 0; fi < frameXs.length; fi++){
    var f = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.43, 0.03), mat(COLORS.woodDark, 0.8));
    f.position.set(frameXs[fi], 1.86, -2.475);
    frames.add(f);
    var pic = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.36), mat(0xD9D2C2, 0.95));
    pic.position.set(frameXs[fi], 1.86, -2.455);
    frames.add(pic);
  }
  scene.add(frames);
  clickable(frames, 'album');
  tag('相册', -0.94, 2.28, -2.4, 0.0014);

  /* ---------- 书架（记忆） ---------- */

  var shelf = new THREE.Group();
  var sx = 2.62;

  var sA = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.72, 0.04), mat(COLORS.wood, 0.9));
  sA.position.set(sx, 0.86, -2.06);
  shelf.add(sA);

  var sB = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.72, 0.04), mat(COLORS.wood, 0.9));
  sB.position.set(sx, 0.86, -0.26);
  shelf.add(sB);

  var sBack = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.72, 1.84), mat(0x8E6C46, 0.95));
  sBack.position.set(sx + 0.16, 0.86, -1.16);
  shelf.add(sBack);

  var shelfYs = [0.06, 0.55, 1.02, 1.49];
  for (var si = 0; si < shelfYs.length; si++){
    var bd = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 1.84), mat(COLORS.wood, 0.9));
    bd.position.set(sx, shelfYs[si], -1.16);
    shelf.add(bd);
  }

  var bookColors = [0x8A3B2C, 0x6E7A5A, 0x4B5A6B, 0xA9814F, 0x7A6A5A, 0x9C7B4F];
  for (var bi = 0; bi < 18; bi++){
    var bh = 0.16 + Math.random() * 0.12;
    var bw = 0.028 + Math.random() * 0.03;
    var bk = new THREE.Mesh(new THREE.BoxGeometry(0.22, bh, bw), mat(bookColors[bi % bookColors.length], 0.85));
    var layer = 1 + Math.floor(bi / 7);
    var baseY = shelfYs[Math.min(layer, shelfYs.length - 1)];
    bk.position.set(sx - 0.02, baseY + bh / 2 + 0.02, -1.98 + (bi % 7) * 0.24 + Math.random() * 0.04);
    shelf.add(bk);
  }

  scene.add(shelf);
  clickable(shelf, 'memory');
  tag('记忆', 2.32, 2.16, -1.16, 0.0014);

  /* ---------- 窗（装饰） ---------- */

  var glass = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 1.24), mat(COLORS.night, 0.4));
  glass.rotation.y = -Math.PI / 2;
  glass.position.set(2.985, 1.74, 0.86);
  scene.add(glass);

  var winMat = mat(0x6B4E36, 0.85);
  var wtop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 1.22), winMat);
  wtop.position.set(2.97, 2.12, 0.86);
  scene.add(wtop);
  var wbottom = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 1.22), winMat);
  wbottom.position.set(2.97, 1.36, 0.86);
  scene.add(wbottom);
  var wv = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.3, 0.06), winMat);
  wv.position.set(2.97, 1.74, 0.86);
  scene.add(wv);
  var wh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 1.22), winMat);
  wh.position.set(2.97, 1.74, 0.86);
  scene.add(wh);

  tag('窗外', 2.82, 2.5, 0.86, 0.0012);

  /* ---------- 墙上那句话 ---------- */

  var hero = label('屋子不大，够两个人住。', 0.0016);
  hero.position.set(0, 2.62, -2.46);
  scene.add(hero);

  /* ---------- 相机 ---------- */

  function fit(){
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.fov = camera.aspect < 1 ? 76 : 54;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    kick();
  }

  function updateCamera(){
    var sp = Math.sin(phi) * radius;
    camera.position.set(
      target.x + sp * Math.sin(theta),
      target.y + Math.cos(phi) * radius,
      target.z + sp * Math.cos(theta)
    );
    camera.lookAt(target);
  }

  /* ---------- 渲染 ---------- */

  var running = false;

  function settled(){
    return Math.abs(thetaT - theta) < 0.0004 &&
           Math.abs(phiT - phi) < 0.0004 &&
           Math.abs(radiusT - radius) < 0.0006;
  }

  function frame(){
    if (!document.body.classList.contains('home')){ running = false; return; }
    theta += (thetaT - theta) * 0.16;
    phi += (phiT - phi) * 0.16;
    radius += (radiusT - radius) * 0.16;
    if (settled()){ theta = thetaT; phi = phiT; radius = radiusT; }
    updateCamera();
    renderer.render(scene, camera);
    if (settled()){ running = false; return; }
    requestAnimationFrame(frame);
  }

  function kick(){
    if (running) return;
    if (!document.body.classList.contains('home')) return;
    running = true;
    requestAnimationFrame(frame);
  }

  /* ---------- 交互 ---------- */

  var raycaster = new THREE.Raycaster();
  var ndc = new THREE.Vector2();

  function findKey(obj){
    var o = obj;
    while (o){
      if (o.userData && o.userData.room) return o.userData.room;
      o = o.parent;
    }
    return null;
  }

  function pickAt(x, y){
    ndc.x = (x / window.innerWidth) * 2 - 1;
    ndc.y = -(y / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    var hits = raycaster.intersectObjects(pickables, true);
    for (var i = 0; i < hits.length; i++){
      var k = findKey(hits[i].object);
      if (k) return k;
    }
    return null;
  }

  var pointers = new Map();
  var moved = false;
  var lastX = 0, lastY = 0;
  var pinchStart = 0;
  var pinchRadius = 0;

  function onDown(ev){
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    moved = false;
    lastX = ev.clientX;
    lastY = ev.clientY;
    if (pointers.size === 2){
      var pts = Array.from(pointers.values());
      pinchStart = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchRadius = radiusT;
    }
  }

  function onMove(ev){
    if (!pointers.has(ev.pointerId)) return;
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

    if (pointers.size === 2 && pinchStart > 0){
      var two = Array.from(pointers.values());
      var dist = Math.hypot(two[0].x - two[1].x, two[0].y - two[1].y);
      radiusT = Math.min(3.35, Math.max(1.7, pinchRadius * (pinchStart / Math.max(dist, 1))));
      kick();
      return;
    }

    var dx = ev.clientX - lastX;
    var dy = ev.clientY - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
    lastX = ev.clientX;
    lastY = ev.clientY;

    thetaT = Math.max(-0.82, Math.min(0.82, thetaT - dx * 0.0042));
    phiT = Math.max(0.92, Math.min(1.46, phiT - dy * 0.0032));
    kick();
  }

  function onUp(ev){
    var had = pointers.has(ev.pointerId);
    pointers.delete(ev.pointerId);
    if (pointers.size < 2) pinchStart = 0;
    if (!had) return;
    if (!moved && pointers.size === 0){
      var key = pickAt(ev.clientX, ev.clientY);
      if (key) open(key);
    }
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', function(ev){ pointers.delete(ev.pointerId); });

  canvas.addEventListener('wheel', function(ev){
    ev.preventDefault();
    radiusT = Math.min(3.35, Math.max(1.7, radiusT + ev.deltaY * 0.0012));
    kick();
  }, { passive: false });

  window.addEventListener('resize', fit);

  /* ---------- 开门 ---------- */

  fit();
  updateCamera();
  renderer.render(scene, camera);
  paintDays();

  setTimeout(function(){
    if (tip) tip.textContent = '';
  }, 1800);

})();
