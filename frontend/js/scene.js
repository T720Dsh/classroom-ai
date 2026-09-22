// scene.js — 教室场景（实心墙版，彻底解决黑屏）
import * as THREE from 'three';

export const ROOM = { width: 14, depth: 10, height: 3.6 };

// 受光材质（桌椅等小物件用）
function M(color, opts = {}) {
  return new THREE.MeshLambertMaterial({ color, ...opts });
}

// 纯色材质（墙/地板/天花板用，不受光照影响，绝不发黑）
function Flat(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color, ...opts });
}

function surfaceTexture(kind) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = kind === 'wood' ? '#d6aa71' : '#81b6d4';
  ctx.fillRect(0, 0, 256, 256);
  // Fine repeatable grain/weave, visible on every desk and chair face.
  for (let i = 0; i < 256; i++) {
    const wave = Math.sin(i * 0.13) * 3 + Math.sin(i * 0.041) * 5;
    ctx.strokeStyle = kind === 'wood'
      ? (i % 5 === 0 ? 'rgba(99,57,28,.25)' : 'rgba(255,239,198,.15)')
      : (i % 4 === 0 ? 'rgba(31,82,116,.18)' : 'rgba(232,249,255,.12)');
    ctx.lineWidth = i % 5 === 0 ? 1.4 : 0.7;
    ctx.beginPath();
    if (kind === 'wood') {
      ctx.moveTo(0, i + wave);
      ctx.bezierCurveTo(75, i - wave, 170, i + wave, 256, i - wave);
    } else {
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
    }
    ctx.stroke();
    if (kind !== 'wood' && i % 4 === 0) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function noticeTexture(title, subtitle, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 320;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fffdf4'; ctx.fillRect(0,0,512,320);
  ctx.fillStyle = color; ctx.fillRect(0,0,512,58);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 31px sans-serif';
  ctx.fillText(title, 28, 39);
  ctx.fillStyle = '#47566c'; ctx.font = '25px sans-serif';
  ctx.fillText(subtitle, 28, 112);
  for(let i=0;i<4;i++) {
    ctx.fillStyle = [color,'#82b6a2','#dfa76f','#88a9d4'][i];
    ctx.fillRect(30,147+i*39,22,22);
    ctx.fillStyle = '#bac5c8';
    ctx.fillRect(66,155+i*39,390-i*37,6);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function mark(mesh, kind, label, extra = {}) {
  mesh.userData.interactive = true;
  mesh.userData.kind = kind;
  mesh.userData.label = label;
  Object.assign(mesh.userData, extra);
}

export function buildClassroom(scene, physics) {
  const interactables = [];
  const staticColliders = [];
  const pickables = [];
  const interactive = (mesh, kind, label) => {
    mark(mesh, kind, label);
    interactables.push(mesh);
    pickables.push(mesh);
  };

  // ---------- 灯光 ----------
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = null;
  scene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const hemi = new THREE.HemisphereLight(0xfff5e0, 0x886644, 0.8);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.0);
  sun.position.set(6, 10, 5);
  scene.add(sun);
  physics.addGround(ROOM.width, ROOM.depth);

  // ---------- 地板（厚板，不发黑） ----------
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM.width, 0.1, ROOM.depth),
    Flat(0xe8c89a)
  );
  floor.position.y = -0.05;
  scene.add(floor);
  interactive(floor, 'surface', '蹲下查看地砖');

  // 地砖缝线
  const grid = new THREE.GridHelper(ROOM.width, 14, 0xa08050, 0xa08050);
  grid.position.y = 0.005;
  scene.add(grid);

  // ---------- 天花板（厚板） ----------
  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM.width, 0.1, ROOM.depth),
    Flat(0xffffff)
  );
  ceiling.position.y = ROOM.height + 0.05;
  scene.add(ceiling);
  interactive(ceiling, 'surface', '抬头查看天花板');

  // Diffuse ceiling panels remain luminous at every camera angle.
  for (const lx of [-4.5, 0, 4.5]) {
    for (const lz of [-2.5, 1.5]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.035, 0.55), Flat(0xfff8df));
      panel.position.set(lx, ROOM.height - 0.04, lz);
      scene.add(panel);
      const lamp = new THREE.PointLight(0xfff4da, 0.22, 5.5);
      lamp.position.set(lx, ROOM.height - 0.4, lz);
      scene.add(lamp);
    }
  }

  // 吊顶方格线
  for (let i = -3; i <= 3; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(ROOM.width, 0.01, 0.02), Flat(0xcccccc));
    line.position.set(0, ROOM.height - 0.01, i * 1.5);
    scene.add(line);
  }

  // ---------- 墙（厚板，实心，绝不发黑） ----------
  const wallThick = 0.2;
  const wallColor = 0xfffaf0;
  const mkWallBox = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), Flat(wallColor));
    m.position.set(x, y, z);
    scene.add(m);
    interactive(m, 'surface', '敲了敲墙壁');
  };
  // 后墙（z=-5）
  mkWallBox(ROOM.width + wallThick*2, ROOM.height, wallThick, 0, ROOM.height/2, -ROOM.depth/2 - wallThick/2);
  // 前墙（z=5）
  mkWallBox(ROOM.width + wallThick*2, ROOM.height, wallThick, 0, ROOM.height/2, ROOM.depth/2 + wallThick/2);
  // 左墙（x=-7）
  mkWallBox(wallThick, ROOM.height, ROOM.depth, -ROOM.width/2 - wallThick/2, ROOM.height/2, 0);
  // 右墙（x=7）
  mkWallBox(wallThick, ROOM.height, ROOM.depth, ROOM.width/2 + wallThick/2, ROOM.height/2, 0);

  // 踢脚线
  const mkBase = (w, x, z) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.04), Flat(0xa0724a));
    b.position.set(x, 0.06, z);
    scene.add(b);
  };
  mkBase(ROOM.width, 0, -ROOM.depth/2 + 0.02);
  mkBase(ROOM.width, 0, ROOM.depth/2 - 0.02);
  // 左右踢脚线
  const baseL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, ROOM.depth), Flat(0xa0724a));
  baseL.position.set(-ROOM.width/2 + 0.02, 0.06, 0);
  scene.add(baseL);
  const baseR = baseL.clone();
  baseR.position.x = ROOM.width/2 - 0.02;
  scene.add(baseR);

  // 物理墙
  physics.addWall(0, -ROOM.depth/2, ROOM.width, 0.2);
  physics.addWall(0, ROOM.depth/2, ROOM.width, 0.2);
  physics.addWall(-ROOM.width/2, 0, 0.2, ROOM.depth);
  physics.addWall(ROOM.width/2, 0, 0.2, ROOM.depth);
  staticColliders.push(
    { minX: -ROOM.width/2, maxX: ROOM.width/2, minZ: ROOM.depth/2-0.15, maxZ: ROOM.depth/2+0.15 },
    { minX: -ROOM.width/2, maxX: ROOM.width/2, minZ: -ROOM.depth/2-0.15, maxZ: -ROOM.depth/2+0.15 },
    { minX: -ROOM.width/2-0.15, maxX: -ROOM.width/2+0.15, minZ: -ROOM.depth/2, maxZ: ROOM.depth/2 },
    { minX: ROOM.width/2-0.15, maxX: ROOM.width/2+0.15, minZ: -ROOM.depth/2, maxZ: ROOM.depth/2 },
  );

  // ---------- 黑板 ----------
  const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.7, 0.08), M(0x6b4423));
  boardFrame.position.set(-0.5, 1.7, -ROOM.depth/2 + 0.04);
  scene.add(boardFrame);
  const board = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.5, 0.06), M(0x2a6b4a));
  board.position.set(-0.5, 1.7, -ROOM.depth/2 + 0.07);
  scene.add(board);
  mark(board, 'blackboard', '在黑板上乱涂');
  interactables.push(board); pickables.push(board);

  // 粉笔槽
  const tray = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.06, 0.15), M(0xcccccc));
  tray.position.set(-0.5, 0.9, -ROOM.depth/2 + 0.1);
  scene.add(tray);

  // 粉笔
  for (let i = 0; i < 4; i++) {
    const chalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.1, 8),
      M(i%2 ? 0xffffff : 0xff6b6b)
    );
    chalk.rotation.z = Math.PI/2;
    chalk.position.set(-1+i*0.15, 0.95, -ROOM.depth/2+0.12);
    scene.add(chalk);
    interactive(chalk, 'prop', '拿起一支粉笔');
  }
  // 黑板擦
  const eraser = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.08), M(0x333333));
  eraser.position.set(1.2, 0.95, -ROOM.depth/2+0.12);
  scene.add(eraser);
  interactive(eraser, 'prop', '拿起黑板擦');

  // ---------- 时钟 ----------
  const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 24), M(0xffffff));
  clock.rotation.x = Math.PI/2;
  clock.position.set(3.5, 2.7, -ROOM.depth/2+0.05);
  scene.add(clock);
  mark(clock, 'clock', '看一眼时间');
  interactables.push(clock); pickables.push(clock);
  const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.01), M(0x222222));
  hourHand.position.set(3.5, 2.75, -ROOM.depth/2+0.08);
  hourHand.rotation.z = Math.PI/4;
  scene.add(hourHand);
  const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.18, 0.01), M(0xc62828));
  minHand.position.set(3.5, 2.75, -ROOM.depth/2+0.08);
  minHand.rotation.z = -Math.PI/6;
  scene.add(minHand);

  // ---------- 投影仪 + 幕布 ----------
  const projector = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.35), M(0x222222));
  projector.position.set(0, ROOM.height-0.2, -2);
  scene.add(projector);
  mark(projector, 'projector', '摆弄投影仪');
  interactables.push(projector); pickables.push(projector);

  // ---------- 讲台 ----------
  const podium = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.15, 0.65), M(0x8b5a2b));
  podium.position.set(-2.2, 0.575, -3.4);
  scene.add(podium);
  mark(podium, 'podium', '翻讲台');
  interactables.push(podium); pickables.push(podium);
  staticColliders.push({ minX: -2.65, maxX: -1.75, minZ: -3.75, maxZ: -3.05 });

  const podiumBook = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.22), M(0x2980b9));
  podiumBook.position.set(-2.2, 1.17, -3.4);
  scene.add(podiumBook);
  interactive(podiumBook, 'prop', '翻看讲台上的课本');

  // ---------- 老师讲台 ----------
  const tDesk = new THREE.Group();
  const tTop = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.75), M(0x8b5a2b));
  tTop.position.y = 0.78;
  tDesk.add(tTop);
  for (const [dx,dz] of [[-0.65,-0.3],[0.65,-0.3],[-0.65,0.3],[0.65,0.3]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.78,0.05), M(0x555555));
    leg.position.set(dx, 0.39, dz); tDesk.add(leg);
  }
  tDesk.position.set(2.5, 0, -3.6);
  scene.add(tDesk);
  mark(tTop, 'teacher_desk', '翻老师的教案');
  interactables.push(tTop); pickables.push(tTop);
  staticColliders.push({ minX: 1.75, maxX: 3.25, minZ: -4.0, maxZ: -3.15 });

  const notebook = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.02, 0.18), M(0xffd54f));
  notebook.position.set(2.3, 0.82, -3.6);
  scene.add(notebook);
  interactive(notebook, 'prop', '翻看老师的笔记');
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.1, 12), M(0xc0392b));
  cup.position.set(2.7, 0.84, -3.6);
  scene.add(cup);
  interactive(cup, 'prop', '碰了碰老师的水杯');
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), M(0x2980b9));
  globe.position.set(2.5, 0.9, -3.8);
  scene.add(globe);
  interactive(globe, 'prop', '转动小地球仪');

  // ---------- 学生桌椅（修正高度：桌面 0.75m，椅面 0.45m） ----------
  const cols = [-4.5, -2.7, -0.9, 0.9, 2.7, 4.5];
  const rows = [-1.8, -0.4, 1.0, 2.4, 3.8];
  const deskTopMat = new THREE.MeshStandardMaterial({ map: surfaceTexture('wood'), roughness: 0.78 });
  const deskEdgeMat = M(0xa0724a);  // 桌面边缘包边
  const legMat = M(0x555555);
  const chairSeatMat = new THREE.MeshStandardMaterial({ map: surfaceTexture('fabric'), roughness: 0.91 });
  const screwMat = M(0xc7cbd0);
  const dynamicProps = [];

  for (const z of rows) {
    for (const x of cols) {
      // 桌子：桌面 0.75m 高
      const desk = new THREE.Group();
      // 桌面
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.04, 0.6), deskTopMat);
      top.position.y = 0.75;
      desk.add(top);
      // 桌面前缘包边（深木色）
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.04, 0.03), deskEdgeMat);
      edge.position.set(0, 0.75, 0.29);
      desk.add(edge);
      // Continuous rim, paired screws, lower book tray and ruled notebook.
      const rearEdge = edge.clone();
      rearEdge.position.z = -0.29;
      desk.add(rearEdge);
      for (const sx of [-0.39, 0.39]) {
        for (const sz of [-0.235, 0.235]) {
          const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.003, 8), screwMat);
          screw.position.set(sx, 0.774, sz);
          desk.add(screw);
        }
      }
      // 桌腿
      for (const [dx,dz] of [[-0.42,-0.22],[0.42,-0.22],[-0.42,0.22],[0.42,0.22]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.75,0.04), legMat);
        leg.position.set(dx, 0.375, dz); desk.add(leg);
      }
      const tray = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.018, 0.44), deskEdgeMat);
      tray.position.y = 0.54;
      desk.add(tray);
      // 桌肚里的书
      const bookColors = [0xc0392b, 0x2980b9, 0x27ae60, 0xf39c12];
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.32,0.05,0.24),
        M(bookColors[Math.floor(Math.random()*4)]));
      book.position.set(0, 0.70, 0);
      desk.add(book);
      interactive(book, 'prop', '翻看课桌里的书');
      // 桌面笔记本
      const nb = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.01,0.15), M(0xffe082));
      nb.position.set(0.15, 0.775, 0.1);
      desk.add(nb);
      interactive(nb, 'prop', '翻看桌面的笔记本');
      for (let line = 0; line < 4; line++) {
        const rule = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.002, 0.003), M(0x7296b3));
        rule.position.set(0.15, 0.782, 0.05 + line * 0.027);
        desk.add(rule);
      }
      const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.24, 8), M(0xe29348));
      pencil.rotation.z = Math.PI / 2;
      pencil.position.set(-0.19, 0.779, -0.13);
      desk.add(pencil);
      interactive(pencil, 'prop', '拿起桌上的铅笔');
      desk.position.set(x, 0, z);
      scene.add(desk);
      mark(top, 'desk', '拉开抽屉看看');
      interactables.push(top); pickables.push(top);
      staticColliders.push({ minX: x-0.48, maxX: x+0.48, minZ: z-0.3, maxZ: z+0.3 });

      // 椅子：椅面 0.45m，靠背 0.4m 高
      const chair = new THREE.Group();
      const chairVisual = new THREE.Group();
      chairVisual.position.y = -0.45; // physics body rotates about its center, not the feet
      chair.add(chairVisual);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45,0.05,0.45), chairSeatMat);
      seat.position.y = 0.45; chairVisual.add(seat);
      // 椅腿
      for (const [dx,dz] of [[-0.19,-0.19],[0.19,-0.19],[-0.19,0.19],[0.19,0.19]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.45,0.03), legMat);
        leg.position.set(dx, 0.225, dz); chairVisual.add(leg);
      }
      // 靠背
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.45,0.45,0.04), chairSeatMat);
      back.position.set(0, 0.69, 0.21); chairVisual.add(back);
      const backBorder = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.04, 0.055), deskEdgeMat);
      backBorder.position.set(0, 0.89, 0.21);
      chairVisual.add(backBorder);
      for (const sx of [-0.19, 0.19]) {
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), screwMat);
        rivet.position.set(sx, 0.48, -0.205);
        chairVisual.add(rivet);
      }
      chair.position.set(x, 0.45, z + 0.6);
      scene.add(chair);
      mark(seat, 'chair', '踢翻 / 抓起椅子');
      mark(back, 'chair', '踢翻 / 抓起椅子');
      interactables.push(seat, back); pickables.push(seat, back);
      const chairBody = physics.addDynamicBox(chair, {
        mass: 3,
        position: new THREE.Vector3(x, 0.45, z+0.6),
        halfExtents: [0.25, 0.45, 0.25],
      });
      chairBody.body.sleep();
      seat.userData.physics = chairBody;
      back.userData.physics = chairBody;
      dynamicProps.push(chairBody);
    }
  }

  // ---------- 书架 ----------
  const shelf = new THREE.Group();
  for (let lv = 0; lv < 4; lv++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(2.2,0.05,0.35), M(0x6b4423));
    b.position.y = 0.3 + lv*0.5;
    shelf.add(b);
    for (let i = 0; i < 9; i++) {
      const colors = [0xc0392b,0x2980b9,0x27ae60,0xf39c12,0x8e44ad,0x16a085];
      const bookMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13,0.4,0.25),
        M(colors[Math.floor(Math.random()*colors.length)]));
      bookMesh.position.set(-0.95+i*0.23, 0.55+lv*0.5, 0);
      shelf.add(bookMesh);
      interactive(bookMesh, 'prop', '从书架抽出一本书');
    }
  }
  shelf.position.set(-5.5, 0, ROOM.depth/2-0.25);
  scene.add(shelf);
  mark(shelf, 'bookshelf', '在书架上翻找');
  interactables.push(shelf); pickables.push(shelf);
  staticColliders.push({ minX: -6.7, maxX: -4.3, minZ: ROOM.depth/2-0.45, maxZ: ROOM.depth/2-0.05 });

  // ---------- 门 ----------
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.2, 1.1), M(0x5a3a1b));
  doorFrame.position.set(ROOM.width/2-0.02, 1.1, -2.8);
  scene.add(doorFrame);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.08,2.05,0.95), M(0x7a4a2b));
  door.position.set(ROOM.width/2-0.08, 1.02, -2.8);
  door.userData.open = false;
  scene.add(door);
  mark(door, 'door', '开门 / 关门');
  interactables.push(door); pickables.push(door);

  // 门把手
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.05,12,12), M(0xc0c0c0));
  handle.position.set(ROOM.width/2-0.15, 1.0, -2.4);
  scene.add(handle);

  // Side-wall teaching displays give the right aisle readable landmarks.
  for (const [z, title, sub, color] of [
    [0.15, '今日课程', '数学 · 语文 · 科学', '#4c8ba1'],
    [2.85, '班级公告', '保持整洁  自由提问', '#75a884'],
  ]) {
    const border = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.25, 1.94), M(0x9a704d));
    border.position.set(ROOM.width/2-0.055, 1.88, z);
    scene.add(border);
    const display = new THREE.Mesh(new THREE.PlaneGeometry(1.82, 1.13),
      new THREE.MeshBasicMaterial({ map:noticeTexture(title,sub,color), side:THREE.DoubleSide }));
    display.rotation.y = -Math.PI/2;
    display.position.set(ROOM.width/2-0.102, 1.88, z);
    scene.add(display);
    mark(display, 'poster', `查看${title}`);
    interactables.push(display); pickables.push(display);
  }

  // ---------- 窗户（带窗框和窗帘） ----------
  for (const wz of [-3, 0, 3]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.025, 1.63, 1.53), Flat(0xb3d7ec));
    win.position.set(-ROOM.width/2+0.09, 1.8, wz);
    scene.add(win);
    for(const y of [0.96,1.8,2.64]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.055,0.055,1.66),M(0xf0f3ed));
      rail.position.set(-ROOM.width/2+0.125,y,wz); scene.add(rail);
    }
    for(const z of [wz-0.8,wz,wz+0.8]) {
      const stile = new THREE.Mesh(new THREE.BoxGeometry(0.055,1.72,0.055),M(0xf0f3ed));
      stile.position.set(-ROOM.width/2+0.125,1.8,z); scene.add(stile);
    }
    const curtain = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.7, 0.5), M(0xd4a7c9));
    curtain.position.set(-ROOM.width/2+0.17, 1.8, wz-0.65);
    scene.add(curtain);
    mark(win, 'window', '看窗外');
    interactables.push(win); pickables.push(win);
  }

  // ---------- 公告栏 ----------
  const board2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 0.05), M(0x8b5a2b));
  board2.position.set(-ROOM.width/2+0.05, 1.8, 1.5);
  scene.add(board2);
  for (let i = 0; i < 3; i++) {
    const paper = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.01),
      M([0xffffff,0xffe082,0x90caf9][i]));
    paper.position.set(-ROOM.width/2+0.08, 1.9-i*0.35, 1.2+i*0.3);
    scene.add(paper);
  }

  // ---------- 垃圾桶 ×2 ----------
  for (const [tx,tz] of [[6.0,4.5],[5.8,-4.0]]) {
    const trash = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.17,0.45,16), M(0x7f8c8d));
    trash.position.set(tx, 0.225, tz);
    scene.add(trash);
    mark(trash, 'trash', '踢一脚垃圾桶');
    interactables.push(trash); pickables.push(trash);
  }

  // ---------- 扫帚 ----------
  const broom = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,1.4,8), M(0xa0522d));
  broom.position.set(6.2, 0.7, 4.0);
  broom.rotation.z = 0.2;
  scene.add(broom);
  mark(broom, 'broom', '拿起扫帚挥舞');
  interactables.push(broom); pickables.push(broom);

  // ---------- 空调 ----------
  const ac = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.3), M(0xffffff));
  ac.position.set(0, 3.1, ROOM.depth/2-0.15);
  scene.add(ac);
  interactive(ac, 'prop', '调节空调');

  // ---------- 海报 ----------
  for (const [px,pz,color] of [
    [-3, ROOM.depth/2-0.02, 0xe74c3c],
    [-1, ROOM.depth/2-0.02, 0x3498db],
    [1, ROOM.depth/2-0.02, 0x2ecc71],
    [3, ROOM.depth/2-0.02, 0xf39c12],
  ]) {
    const poster = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.9,0.02), M(color));
    poster.position.set(px, 1.7, pz);
    scene.add(poster);
    mark(poster, 'poster', '看看海报');
    interactables.push(poster); pickables.push(poster);
  }
  const dutyFrame = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.18, 0.055), M(0x9a704d));
  dutyFrame.position.set(5.15, 1.83, ROOM.depth/2-0.055);
  scene.add(dutyFrame);
  const dutyBoard = new THREE.Mesh(new THREE.PlaneGeometry(1.63, 1.06),
    new THREE.MeshBasicMaterial({ map:noticeTexture('值日安排','保持教室明亮整洁','#d79b65'),
      side:THREE.DoubleSide }));
  dutyBoard.rotation.y = Math.PI;
  dutyBoard.position.set(5.15, 1.83, ROOM.depth/2-0.096);
  scene.add(dutyBoard);
  mark(dutyBoard, 'poster', '查看值日安排');
  interactables.push(dutyBoard); pickables.push(dutyBoard);

  // ---------- 植物 ----------
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.15,0.3,12), M(0xb85450));
  pot.position.set(-6.2, 0.15, 4.5);
  scene.add(pot);
  const plant = new THREE.Mesh(new THREE.SphereGeometry(0.25,12,12), M(0x2e7d32));
  plant.position.set(-6.2, 0.55, 4.5);
  scene.add(plant);
  interactive(plant, 'prop', '轻触窗边绿植');

  return { interactables, pickables, staticColliders, dynamicProps, ROOM };
}
