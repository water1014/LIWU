/* 里屋 · 3D
   用 three.js 搭一间真的屋子：地板、墙、一扇开着缝的门、书桌、台灯、书架、窗。
   点哪件东西，就开对应的那一页（交给 assets/panel.js）。
   屋子本体的颜色在 COLORS 里，想换墙色 / 木色改这里。 */

(async function(){
  'use strict';

  const boot = document.getElementById('boot');
  const canvas = document.getElementById('stage');

  const CDNS = [
    'https://unpkg.com/three@0.160.0/build/three.module.js',
    'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
    'https://esm.sh/three@0.160.0'
  ];

  let THREE = null;
  for (let i = 0; i < CDNS.length; i++){
    try{
      const lib = await import(CDNS[i]);
      if (lib && lib.Scene){ THREE = lib; break; }
    }catch(e){}
  }

  if (!THREE){
    if (boot) boot.textContent = '3D 没加载出来。下面那排照样能点。';
    return;
  }

  /* ---------- 颜色 ---------- */

  const COLORS = {
    paper: 0xEFEBE2,
    floor: 0xC8BAA3,
    wall: 0xEDE7DB,
    wood: 0xA9814F,
    woodDark: 0x6B4E36,
    cloth: 0x8D8474,
    paperWhite: 0xF7F3EA,
    night: 0x4C5A70,
    glow: 0xFFE3B8
  };

  /* ---------- 基础 ---------- */

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.paper);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.05, 60);

  const W = 6, D = 5, H = 3.2;
  const target = new THREE.Vector3(0, 1.02, -0.25);

  let theta = 0.16, phi = 1.26, radius = 2.85;
  let thetaT = theta, phiT = phi, radiusT = radius;

  /* ---------- 材料 ---------- */

  function mat(color, rough){
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: rough == null ? 0.92 : rough,
      metalness: 0.02,
      side: THREE.DoubleSide
    });
  }

  function glowMat(color){
    return new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
  }

  /* ---------- 标签 ---------- */

  function makeLabel(text, unit){
    unit = unit || 0.0018;
    const fs = 60;
    const pad = 34;
    const c = document.createElement('canvas');
    let ctx = c.getContext('2d');
    const font = '500 ' + fs + 'px "Noto Serif SC", "Songti SC", serif';
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
    const h = fs + pad * 2;
    const dpr = 2;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(33,31,28,0.72)';
    ctx.fillText(text, w / 2, h / 2);

    const tex = new THREE.CanvasTexture(c);
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;

    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    spr.scale.set(w * unit, h * unit, 1);
    return spr;
  }

  /* ---------- 屋子 ---------- */

  const pickables = [];

  function clickable(obj, key){
    obj.traverse(function(o){ o.userData.room = key; });
    pickables.push(obj);
    return obj;
  }

  function labelAt(text, x, y, z, unit){
    const s = makeLabel(text, unit);
    s.position.set(x, y, z);
    scene.add(s);
    return s;
  }

  // 地板
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat(COLORS.floor, 0.95));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // 后墙 / 左墙 / 右墙
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat(COLORS.wall));
  backWall.position.set(0, H / 2, -D / 2);
  scene.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(D, H), mat(COLORS.wall));
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-W / 2, H / 2, 0);
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(D, H), mat(COLORS.wall));
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(W / 2, H / 2, 0);
  scene.add(rightWall);

  // 地毯
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.3), mat(COLORS.cloth, 1));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.004, 0.25);
  scene.add(rug);

  /* ---------- 灯 ---------- */

  scene.add(new THREE.HemisphereLight(0xFFF8EC, 0x8B8172, 0.95));

  const lampLight = new THREE.PointLight(0xFFC894, 2.1, 5.2, 2);
  lampLight.position.set(0.62, 1.22, -1.85);
  scene.add(lampLight);

  const doorLight = new THREE.PointLight(0xFFDCB0, 0.85, 3.4, 2);
  doorLight.position.set(-2.45, 1.05, 0.85);
  scene.add(doorLight);

  const winLight = new THREE.PointLight(0x94A9C8, 0.7, 4.2, 2);
  winLight.position.set(2.45, 1.75, 0.9);
  scene.add(winLight);

  /* ---------- 门（门厅） ---------- */

  const doorGroup = new THREE.Group();

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.15, 1.02), mat(COLORS.woodDark, 0.85));
  frame.position.set(-2.96, 1.07, 1.1);
  doorGroup.add(frame);

  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.0, 0.88), mat(0x5E4632, 0.8));
  panel.position.set(-2.92, 1.0, 1.1);
  doorGroup.add(panel);

  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), mat(0xC9A66B, 0.35));
  knob.position.set(-2.87, 1.0, 0.72);
  doorGroup.add(knob);

  const crack = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.92, 0.045), glowMat(COLORS.glow));
  crack.position.set(-2.9, 1.0, 1.56);
  doorGroup.add(crack);

  scene.add(doorGroup);
  clickable(doorGroup, 'hall');
  labelAt('门厅', -2.62, 2.32, 1.1, 0.0017);

  /* ---------- 书桌 ---------- */

  const desk = new THREE.Group();

  const top = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.07, 0.86), mat(COLORS.wood, 0.85));
  top.position.set(0.1, 0.74, -1.92);
  desk.add(top);

  const legPos = [[-0.7, -0.35], [-0.7, 0.33], [0.9, -0.35], [0.9, 0.33]];
  for (let i = 0; i < legPos.length; i++){
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.74, 0.07), mat(COLORS.woodDark, 0.9));
    leg.position.set(0.1 + legPos[i][0], 0.37, -1.92 + legPos[i][1]);
    desk.add(leg);
  }

  scene.add(desk);

  /* ---------- 书（日记） ---------- */

  const book = new THREE.Group();

  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.025, 0.3), mat(0x8A3B2C, 0.8));
  cover.position.set(0.0, 0.785, -1.86);
  cover.rotation.y = 0.18;
  book.add(cover);

  const pageL = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.014, 0.27), mat(COLORS.paperWhite, 0.95));
  pageL.position.set(-0.1, 0.803, -1.86);
  pageL.rotation.y = 0.18;
  pageL.rotation.z = 0.07;
  book.add(pageL);

  const pageR = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.014, 0.27), mat(COLORS.paperWhite, 0.95));
  pageR.position.set(0.1, 0.803, -1.86);
  pageR.rotation.y = 0.18;
  pageR.rotation.z = -0.07;
  book.add(pageR);

  scene.add(book);
  clickable(book, 'diary');
  labelAt('日记', 0.0, 1.02, -1.8, 0.0015);

  /* ---------- 收音机（说话） ---------- */

  const radio = new THREE.Group();

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.13, 0.19), mat(0x7E6A55, 0.7));
  body.position.set(-0.58, 0.845, -1.78);
  radio.add(body);

  const face = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.012), mat(0x4A3C2E, 0.6));
  face.position.set(-0.58, 0.86, -1.682);
  radio.add(face);

  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 14), mat(0xC9A66B, 0.4));
  dial.rotation.x = Math.PI / 2;
  dial.position.set(-0.45, 0.83, -1.68);
  radio.add(dial);

  scene.add(radio);
  clickable(radio, 'talk');
  labelAt('说话', -0.58, 1.02, -1.72, 0.0015);

  /* ---------- 台灯 ---------- */

  const lamp = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.03, 18), mat(0x4A3C2E, 0.6));
  base.position.set(0.66, 0.79, -2.05);
  lamp.add(base);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.46, 10), mat(0x6B5A45, 0.5));
  stem.position.set(0.66, 1.03, -2.05);
  lamp.add(stem);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.085, 0.14, 20, 1, true), mat(0xE8DCC4, 0.85));
  shade.position.set(0.66, 1.30, -2.05);
  lamp.add(shade);
  scene.add(lamp);

  /* ---------- 相框（相册） ---------- */

  const frames = new THREE.Group();
  const frameXs = [-1.42, -0.94, -0.46];
  for (let i = 0; i < frameXs.length; i++){
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.43, 0.03), mat(COLORS.woodDark, 0.8));
    f.position.set(frameXs[i], 1.86, -2.475);
    frames.add(f);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.36), mat(0xD9D2C2, 0.95));
    pic.position.set(frameXs[i], 1.86, -2.455);
    frames.add(pic);
  }
  scene.add(frames);
  clickable(frames, 'album');
  labelAt('相册', -0.94, 2.28, -2.4, 0.0015);

  /* ---------- 书架（记忆） ---------- */

  const shelf = new THREE.Group();
  const shelfX = 2.62;

  const sideA = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.72, 0.04), mat(COLORS.wood, 0.9));
  sideA.position.set(shelfX, 0.86, -2.06);
  shelf.add(sideA);

  const sideB = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.72, 0.04), mat(COLORS.wood, 0.9));
  sideB.position.set(shelfX, 0.86, -0.26);
  shelf.add(sideB);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.72, 1.84), mat(0x8E6C46, 0.95));
  back.position.set(shelfX + 0.16, 0.86, -1.16);
  shelf.add(back);

  const shelfYs = [0.06, 0.55, 1.02, 1.49];
  for (let i = 0; i < shelfYs.length; i++){
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 1.84), mat(COLORS.wood, 0.9));
    board.position.set(shelfX, shelfYs[i], -1.16);
    shelf.add(board);
  }

  const bookColors = [0x8A3B2C, 0x6E7A5A, 0x4B5A6B, 0xA9814F, 0x7A6A5A, 0x9C7B4F];
  for (let i = 0; i < 18; i++){
    const bh = 0.16 + Math.random() * 0.12;
    const bw = 0.028 + Math.random() * 0.03;
    const bk = new THREE.Mesh(new THREE.BoxGeometry(0.22, bh, bw), mat(bookColors[i % bookColors.length], 0.85));
    const layer = 1 + Math.floor(i / 7);
    const baseY = shelfYs[Math.min(layer, shelfYs.length - 1)];
    bk.position.set(shelfX - 0.02, baseY + bh / 2 + 0.02, -1.98 + (i % 7) * 0.24 + Math.random() * 0.04);
    shelf.add(bk);
  }

  scene.add(shelf);
  clickable(shelf, 'memory');
  labelAt('记忆', 2.35, 2.16, -1.16, 0.0015);

  /* ---------- 窗（这些天） ---------- */

  const winGroup = new THREE.Group();

  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 1.24), mat(COLORS.night, 0.4));
  glass.rotation.y = -Math.PI / 2;
  glass.position.set(2.985, 1.74, 0.86);
  winGroup.add(glass);

  const winFrameMat = mat(0x6B4E36, 0.85);
  const bars = [
    [0.0, 1.36, 0.03, 0.06],
    [0.0, 2.12, 0.03, 0.06]
  ];
  for (let i = 0; i < bars.length; i++){
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 1.22), winFrameMat);
    b.position.set(2.97, bars[i][1], 0.86);
    winGroup.add(b);
  }
  const vbar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.3, 0.06), winFrameMat);
  vbar.position.set(2.97, 1.74, 0.86);
  winGroup.add(vbar);

  const hbar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 1.22), winFrameMat);
  hbar.position.set(2.97, 1.74, 0.86);
  winGroup.add(hbar);

  scene.add(winGroup);
  clickable(winGroup, 'days');
  labelAt('这些天', 2.8, 2.52, 0.86, 0.0015);

  /* ---------- 墙上一句话 ---------- */

  const heroSprite = makeLabel('屋子不大，够两个人住。', 0.0016);
  heroSprite.position.set(0, 2.62, -2.46);
  scene.add(heroSprite);

  /* ---------- 天数牌（挂在门边） ---------- */

  let daySprite = null;

  function setDays(n){
    if (daySprite){
      scene.remove(daySprite);
      if (daySprite.material.map) daySprite.material.map.dispose();
      daySprite.material.dispose();
      daySprite = null;
    }
    if (!n) return;
    daySprite = makeLabel('第 ' + n + ' 天', 0.0016);
    daySprite.position.set(-2.55, 2.72, 1.1);
    scene.add(daySprite);
    kick();
  }

  window.LIWU3D = { setDays: setDays };

  /* ---------- 相机 ---------- */

  function fit(){
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.fov = camera.aspect < 1 ? 76 : 54;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    kick();
  }

  function updateCamera(){
    const sp = Math.sin(phi) * radius;
    camera.position.set(
      target.x + sp * Math.sin(theta),
      target.y + Math.cos(phi) * radius,
      target.z + sp * Math.cos(theta)
    );
    camera.lookAt(target);
  }

  /* ---------- 渲染 ---------- */

  let running = false;

  function settled(){
    return Math.abs(thetaT - theta) < 0.0004 &&
           Math.abs(phiT - phi) < 0.0004 &&
           Math.abs(radiusT - radius) < 0.0006;
  }

  function frame(){
    theta += (thetaT - theta) * 0.16;
    phi += (phiT - phi) * 0.16;
    radius += (radiusT - radius) * 0.16;
    if (settled()){
      theta = thetaT; phi = phiT; radius = radiusT;
    }
    updateCamera();
    renderer.render(scene, camera);
    if (settled()){ running = false; return; }
    requestAnimationFrame(frame);
  }

  function kick(){
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  }

  /* ---------- 交互 ---------- */

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function findRoom(obj){
    let o = obj;
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
    const hits = raycaster.intersectObjects(pickables, true);
    for (let i = 0; i < hits.length; i++){
      const key = findRoom(hits[i].object);
      if (key) return key;
    }
    return null;
  }

  const pointers = new Map();
  let dragging = false;
  let moved = false;
  let lastX = 0, lastY = 0;
  let pinchStart = 0;
  let pinchRadius = 0;

  function onDown(ev){
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    dragging = true;
    moved = false;
    lastX = ev.clientX;
    lastY = ev.clientY;
    if (pointers.size === 2){
      const pts = Array.from(pointers.values());
      pinchStart = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchRadius = radiusT;
    }
  }

  function onMove(ev){
    if (!pointers.has(ev.pointerId)) return;
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

    if (pointers.size === 2 && pinchStart > 0){
      const pts = Array.from(pointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = pinchStart / Math.max(dist, 1);
      radiusT = Math.min(3.35, Math.max(1.7, pinchRadius * ratio));
      kick();
      return;
    }

    const dx = ev.clientX - lastX;
    const dy = ev.clientY - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
    lastX = ev.clientX;
    lastY = ev.clientY;

    thetaT = Math.max(-0.82, Math.min(0.82, thetaT - dx * 0.0042));
    phiT = Math.max(0.92, Math.min(1.46, phiT - dy * 0.0032));
    kick();
  }

  function onUp(ev){
    const had = pointers.has(ev.pointerId);
    pointers.delete(ev.pointerId);
    if (pointers.size < 2) pinchStart = 0;
    if (!had) return;
    if (!moved && pointers.size === 0){
      const key = pickAt(ev.clientX, ev.clientY);
      if (key && window.openPanel) window.openPanel(key);
    }
    if (pointers.size === 0) dragging = false;
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', function(ev){
    pointers.delete(ev.pointerId);
    if (pointers.size === 0) dragging = false;
  });

  canvas.addEventListener('wheel', function(ev){
    ev.preventDefault();
    radiusT = Math.min(3.35, Math.max(1.7, radiusT + ev.deltaY * 0.0012));
    kick();
  }, { passive: false });

  window.addEventListener('resize', fit);

  /* ---------- 启动 ---------- */

  fit();
  updateCamera();
  renderer.render(scene, camera);

  setTimeout(function(){
    if (boot){
      boot.style.opacity = '0';
      setTimeout(function(){ if (boot) boot.hidden = true; }, 700);
    }
  }, 260);

})();
