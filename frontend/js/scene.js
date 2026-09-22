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

  // ---------- 灯光 ----------
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = null;
  scene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const hemi = new THREE.HemisphereLight(0xfff5e0, 0x886644, 0.8);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.0);
  sun.position.set(6, 10, 5);
  scene.add(sun);

  // ---------- 地板（厚板，不发黑） ----------
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM.width, 0.1, ROOM.depth),
    Flat(0xc9a876)
  );
  floor.position.y = -0.05;
  scene.add(floor);

  // 地砖缝线
  const grid = new THREE.GridHelper(ROOM.width, 14, 0xa08050, 0xa08050);
  grid.position.y = 0.005;
  scene.add(grid);

  // ---------- 天花板（厚板） ----------
  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM.width, 0.1, ROOM.depth),
    Flat(0xf0f0f0)
  );
  ceiling.position.y = ROOM.height + 0.05;
  scene.add(ceiling);

  // 吊顶方格线
  for (let i = -3; i <= 3; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(ROOM.width, 0.01, 0.02), Flat(0xcccccc));
    line.position.set(0, ROOM.height - 0.01, i * 1.5);
    scene.add(line);
  }

  // ---------- 墙（厚板，实心，绝不发黑） ----------
  const wallThick = 0.2;
  const wallColor = 0xf5f0e8;
  const mkWallBox = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), Flat(wallColor));
    m.position.set(x, y, z);
    scene.add(m);
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
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.04), Flat(0x8b5a2b));
    b.position.set(x, 0.06, z);
    scene.add(b);
  };
  mkBase(ROOM.width, 0, -ROOM.depth/2 + 0.02);
  mkBase(ROOM.width, 0, ROOM.depth/2 - 0.02);
  // 左右踢脚线
  const baseL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, ROOM.depth), Flat(0x8b5a2b));
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
  }
  // 黑板擦
  const eraser = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.08), M(0x333333));
  eraser.position.set(1.2, 0.95, -ROOM.depth/2+0.12);
  scene.add(eraser);

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
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.1, 12), M(0xc0392b));
  cup.position.set(2.7, 0.84, -3.6);
  scene.add(cup);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), M(0x2980b9));
  globe.position.set(2.5, 0.9, -3.8);
  scene.add(globe);

  // ---------- 学生桌椅（修正高度：桌面 0.75m，椅面 0.45m） ----------
  const cols = [-4.5, -2.7, -0.9, 0.9, 2.7, 4.5];
  const rows = [-1.8, -0.4, 1.0, 2.4, 3.8];
  const deskTopMat = M(0xd4a76a);
  const deskEdgeMat = M(0x8b5a2b);  // 桌面边缘包边
  const legMat = M(0x444444);
  const chairSeatMat = M(0x6b8caf);
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
      // 桌腿
      for (const [dx,dz] of [[-0.42,-0.22],[0.42,-0.22],[-0.42,0.22],[0.42,0.22]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.75,0.04), legMat);
        leg.position.set(dx, 0.375, dz); desk.add(leg);
      }
      // 桌肚里的书
      const bookColors = [0xc0392b, 0x2980b9, 0x27ae60, 0xf39c12];
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.32,0.05,0.24),
        M(bookColors[Math.floor(Math.random()*4)]));
      book.position.set(0, 0.70, 0);
      desk.add(book);
      // 桌面笔记本
      const nb = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.01,0.15), M(0xffe082));
      nb.position.set(0.15, 0.775, 0.1);
      desk.add(nb);
      desk.position.set(x, 0, z);
      scene.add(desk);
      mark(top, 'desk', '拉开抽屉看看');
      interactables.push(top); pickables.push(top);
      staticColliders.push({ minX: x-0.48, maxX: x+0.48, minZ: z-0.3, maxZ: z+0.3 });

      // 椅子：椅面 0.45m，靠背 0.4m 高
      const chair = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45,0.05,0.45), chairSeatMat);
      seat.position.y = 0.45; chair.add(seat);
      // 椅腿
      for (const [dx,dz] of [[-0.19,-0.19],[0.19,-0.19],[-0.19,0.19],[0.19,0.19]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.45,0.03), legMat);
        leg.position.set(dx, 0.225, dz); chair.add(leg);
      }
      // 靠背
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.45,0.45,0.04), chairSeatMat);
      back.position.set(0, 0.69, 0.21); chair.add(back);
      chair.position.set(x, 0, z + 0.6);
      scene.add(chair);
      mark(seat, 'chair', '踢翻 / 抓起椅子');
      interactables.push(seat); pickables.push(seat);
      const chairBody = physics.addDynamicBox(chair, {
        mass: 3,
        position: new THREE.Vector3(x, 0.45, z+0.6),
        halfExtents: [0.25, 0.45, 0.25],
      });
      chairBody.body.sleep();
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

  // ---------- 窗户（带窗框和窗帘） ----------
  for (const wz of [-3, 0, 3]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 1.7), M(0xffffff));
    frame.position.set(-ROOM.width/2+0.02, 1.8, wz);
    scene.add(frame);
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.6, 1.5),
      new THREE.MeshLambertMaterial({ color:0xaad4ff, transparent:true, opacity:0.5 }));
    win.position.set(-ROOM.width/2+0.04, 1.8, wz);
    scene.add(win);
    const curtain = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.7, 0.5), M(0xd4a7c9));
    curtain.position.set(-ROOM.width/2+0.1, 1.8, wz-0.65);
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

  // ---------- 植物 ----------
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.15,0.3,12), M(0xb85450));
  pot.position.set(-6.2, 0.15, 4.5);
  scene.add(pot);
  const plant = new THREE.Mesh(new THREE.SphereGeometry(0.25,12,12), M(0x2e7d32));
  plant.position.set(-6.2, 0.55, 4.5);
  scene.add(plant);

  return { interactables, pickables, staticColliders, dynamicProps, ROOM };
}
