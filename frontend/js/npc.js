// npc.js — 10 个 AI 角色
// 使用 Soldier.glb（人形 + 骨骼动画）+ 面部表情贴图
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
let sharedGLTF = null;
let loadPromise = null;

export function loadCharacterModel() {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve) => {
    loader.load('/static/assets/characters/Soldier.glb',
      (gltf) => { sharedGLTF = gltf; resolve(gltf); },
      undefined,
      (err) => { console.warn('GLB load failed, fallback to procedural', err); resolve(null); }
    );
  });
  return loadPromise;
}

// 面部表情贴图（canvas 绘制）
function makeFaceTexture(expression) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);

  // 肤色底
  ctx.fillStyle = '#f0c8a0';
  ctx.beginPath(); ctx.arc(128, 128, 110, 0, Math.PI*2); ctx.fill();

  ctx.strokeStyle = '#222';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';

  if (expression === 'happy') {
    // 笑眼 ^ ^
    ctx.beginPath(); ctx.arc(90, 110, 20, Math.PI*1.1, Math.PI*1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(166, 110, 20, Math.PI*1.1, Math.PI*1.9); ctx.stroke();
    // 笑嘴
    ctx.beginPath(); ctx.arc(128, 160, 35, 0.2, Math.PI-0.2); ctx.stroke();
  } else if (expression === 'angry') {
    // 怒眉
    ctx.beginPath(); ctx.moveTo(65, 95); ctx.lineTo(105, 110); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(191, 95); ctx.lineTo(151, 110); ctx.stroke();
    // 瞪眼
    ctx.beginPath(); ctx.arc(90, 120, 10, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(166, 120, 10, 0, Math.PI*2); ctx.fill();
    // 撇嘴
    ctx.beginPath(); ctx.arc(128, 175, 25, Math.PI+0.3, -0.3); ctx.stroke();
  } else if (expression === 'surprised') {
    // 圆眼
    ctx.beginPath(); ctx.arc(90, 115, 18, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(166, 115, 18, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(90, 115, 7, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(166, 115, 7, 0, Math.PI*2); ctx.fill();
    // O 嘴
    ctx.beginPath(); ctx.arc(128, 165, 18, 0, Math.PI*2); ctx.stroke();
  } else if (expression === 'sad') {
    // 垂眉
    ctx.beginPath(); ctx.moveTo(65, 110); ctx.lineTo(105, 95); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(191, 110); ctx.lineTo(151, 95); ctx.stroke();
    // 闭眼
    ctx.beginPath(); ctx.arc(90, 125, 15, Math.PI*0.1, Math.PI*0.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(166, 125, 15, Math.PI*0.1, Math.PI*0.9); ctx.stroke();
    // 哭嘴
    ctx.beginPath(); ctx.arc(128, 180, 25, Math.PI+0.3, -0.3); ctx.stroke();
  } else {
    // neutral
    ctx.beginPath(); ctx.arc(90, 115, 8, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(166, 115, 8, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(105, 165); ctx.lineTo(151, 165); ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

// 10 个 NPC
export const NPC_DEFS = [
  { id: 'teacher_wang', name: '王老师', pos: [-2.2, 0, -3.0], shirt: 0x2c3e50, pants: 0x1a252f, role: 'teacher' },
  { id: 'li_ming',      name: '李明',   pos: [-0.9, 0, -0.4], shirt: 0xc0392b, pants: 0x2c3e50, role: 'student' },
  { id: 'zhang_xue',    name: '张雪',   pos: [0.9, 0, -0.4],  shirt: 0x2980b9, pants: 0xf0f0f0, role: 'student' },
  { id: 'chen_hao',     name: '陈浩',   pos: [2.7, 0, -0.4],  shirt: 0x27ae60, pants: 0x34495e, role: 'student' },
  { id: 'lin_qing',     name: '林青',   pos: [-2.7, 0, 1.0],  shirt: 0x8e44ad, pants: 0x2c3e50, role: 'student' },
  { id: 'wang_fang',    name: '王芳',   pos: [-0.9, 0, 1.0],  shirt: 0xe91e63, pants: 0xf0f0f0, role: 'student' },
  { id: 'zhao_lei',     name: '赵磊',   pos: [4.5, 0, 2.4],   shirt: 0xf39c12, pants: 0x2c3e50, role: 'student' },
  { id: 'sun_jie',      name: '孙杰',   pos: [-4.5, 0, 2.4],  shirt: 0x16a085, pants: 0x34495e, role: 'student' },
  { id: 'zhou_min',     name: '周敏',   pos: [0.9, 0, 2.4],   shirt: 0x9b59b6, pants: 0xf0f0f0, role: 'student' },
  { id: 'wu_peng',      name: '吴鹏',   pos: [4.5, 0, 3.8],   shirt: 0x34495e, pants: 0x1a1a1a, role: 'student' },
];

// Fallback 简陋人形
class ProceduralFallback {
  constructor(def) {
    this.group = new THREE.Group();
    const shirt = new THREE.MeshStandardMaterial({ color: def.shirt, roughness: 0.8 });
    const pants = new THREE.MeshStandardMaterial({ color: def.pants, roughness: 0.8 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22,0.55,4,12), shirt);
    torso.position.y = 1.05; this.group.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16,16,16),
      new THREE.MeshStandardMaterial({ color: 0xe0ac69 }));
    head.position.y = 1.55; this.group.add(head);
    this.mixer = null;
  }
  setPosition(p) { this.group.position.set(p[0], p[1], p[2]); }
  setExpression() {}
  playIdle() {}
  faceTo() {}
  update() {}
}

export class NPC {
  constructor(def, gltf) {
    this.id = def.id;
    this.name = def.name;
    this.role = def.role;
    this.def = def;
    this.group = new THREE.Group();
    this.mixer = null;
    this.faceMesh = null;
    this._targetYaw = 0;
    this._expression = 'neutral';
    this._faceTextures = {};

    if (gltf) {
      this._build(gltf, def);
    } else {
      this.fallback = new ProceduralFallback(def);
      this.group = this.fallback.group;
    }
    this.setPosition(def.pos);
  }

  _build(gltf, def) {
    const model = gltf.scene.clone(true);
    model.scale.setScalar(1.0);

    // 染色：直接给所有材质上角色色（skinned mesh 的 mesh position 都是 0，不能按位置分）
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => {
            m.color = new THREE.Color(def.shirt);
            m.metalness = 0.1;
            m.roughness = 0.8;
            m.side = THREE.DoubleSide;
          });
        }
      }
    });

    // 添加面部表情平面
    this._faceTextures = {
      neutral: makeFaceTexture('neutral'),
      happy: makeFaceTexture('happy'),
      angry: makeFaceTexture('angry'),
      surprised: makeFaceTexture('surprised'),
      sad: makeFaceTexture('sad'),
    };
    const faceMat = new THREE.MeshBasicMaterial({
      map: this._faceTextures.neutral,
      transparent: true,
    });
    this.faceMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.25), faceMat);
    this.faceMesh.position.set(0, 1.55, 0.14);
    model.add(this.faceMesh);

    this.group.add(model);

    // 动画
    this.mixer = new THREE.AnimationMixer(model);
    this.clips = {};
    gltf.animations.forEach((c) => { this.clips[c.name.toLowerCase()] = c; });
    this.playIdle();

    // 交互标记
    this.group.traverse((o) => {
      if (o.isMesh) {
        o.userData.interactive = true;
        o.userData.kind = 'npc';
        o.userData.npcId = this.id;
        o.userData.label = `和${this.name}说话`;
      }
    });
  }

  setPosition(p) {
    this.group.position.set(p[0], p[1], p[2]);
  }

  playIdle() {
    if (!this.mixer) return;
    const clip = this.clips['idle'] || this.clips['walk'] || Object.values(this.clips)[0];
    if (clip) this.mixer.clipAction(clip).play();
  }

  setExpression(expr) {
    if (!this.faceMesh || !this._faceTextures[expr]) return;
    this._expression = expr;
    this.faceMesh.material.map = this._faceTextures[expr];
    this.faceMesh.material.needsUpdate = true;
  }

  guessExpression(text) {
    if (/[！?？]|哇|卧槽|绝了|什么/.test(text)) this.setExpression('surprised');
    else if (/滚|安静|别动|停下|谁干的|出去|罚/.test(text)) this.setExpression('angry');
    else if (/哈哈|笑|嘿|不错|好呀|好啊/.test(text)) this.setExpression('happy');
    else if (/唉|累|烦|难过|可怜/.test(text)) this.setExpression('sad');
    else this.setExpression('neutral');
  }

  faceTo(point) {
    const dx = point.x - this.group.position.x;
    const dz = point.z - this.group.position.z;
    this._targetYaw = Math.atan2(dx, dz);
  }

  update(dt) {
    if (this.mixer) this.mixer.update(dt);
    let dy = this._targetYaw - this.group.rotation.y;
    while (dy > Math.PI) dy -= Math.PI*2;
    while (dy < -Math.PI) dy += Math.PI*2;
    this.group.rotation.y += dy * Math.min(1, dt*5);
  }
}

export async function buildAllNPCs(scene) {
  const gltf = await loadCharacterModel();
  const npcs = {};
  for (const def of NPC_DEFS) {
    const npc = new NPC(def, gltf);
    scene.add(npc.group);
    npcs[def.id] = npc;
  }
  return npcs;
}
