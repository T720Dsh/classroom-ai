// main.js — 入口
import * as THREE from 'three';
import { buildClassroom } from './scene.js?v=17';
import { PhysicsWorld } from './physics.js?v=17';
import { Player } from './player.js?v=17';
import { buildAllNPCs } from './npc.js?v=17';
import { Dialogue } from './dialogue.js?v=17';
import { Audio } from './audio.js?v=17';
import { createVisualTour } from './visual-tour.js';
import * as CANNON from 'cannon-es';

// ---------- 基础 ----------
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;
THREE.ColorManagement.enabled = false;
window.__renderer = renderer;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 100);
window.__camera = camera;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- 系统 ----------
const physics = new PhysicsWorld();
const room = buildClassroom(scene, physics);
window.__scene = scene; // debug
const player = new Player(camera, canvas, room.staticColliders, room.ROOM);
const qaParams = new URLSearchParams(location.search);
const visualTour = qaParams.has('visualTour') ? createVisualTour(player) : null;
const chairCheck = qaParams.has('chairCheck');
if (chairCheck) {
  player.yaw = 2.08;
  player.pitch = -0.78;
  player.update(0);
  document.getElementById('start-menu').classList.add('hidden');
  document.getElementById('help-overlay').classList.add('hidden');
}
window.__player = player;
player.setDynamicColliders(() => {
  const blocks = [];
  for (const npc of Object.values(npcs)) {
    const { x, z } = npc.group.position;
    blocks.push({ minX:x-0.31, maxX:x+0.31, minZ:z-0.31, maxZ:z+0.31 });
  }
  for (const prop of room.dynamicProps) {
    const { x, z } = prop.body.position;
    // Ignore chairs being held above the player's head.
    if (prop.body.position.y > 1.7) continue;
    blocks.push({ minX:x-0.25, maxX:x+0.25, minZ:z-0.25, maxZ:z+0.25 });
  }
  return blocks;
});
const dialogue = new Dialogue(camera, player);
const audio = new Audio();

const speechLayer = document.getElementById('speech-layer');
const bubbles = [];
const eventToast = document.getElementById('event-toast');
let eventToastTimer = null;
function showEventToast(speaker, line, duration = 8500) {
  document.getElementById('event-speaker').textContent = speaker;
  document.getElementById('event-line').textContent = line;
  eventToast.classList.remove('hidden');
  clearTimeout(eventToastTimer);
  if (duration) eventToastTimer = setTimeout(() => eventToast.classList.add('hidden'), duration);
}

let npcs = {};
let sessionId = null;

// ---------- API ----------
async function api(path, body) {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function fetchState() {
  try {
    const r = await fetch('/api/state');
    const s = await r.json();
    document.getElementById('mode-badge').textContent =
      s.llm_mode === 'local' ? '本地 LLM' :
      s.llm_mode === 'openai' ? `LLM: ${s.model}` : 'MOCK（未配 LLM）';
  } catch {
    document.getElementById('mode-badge').textContent = '后端未启动';
  }
}

// ---------- 射线 ----------
const raycaster = new THREE.Raycaster();
raycaster.far = 2.6;
const center = new THREE.Vector2(0,0);
let hovered = null;

function getAllPickables() {
  const arr = [...room.pickables];
  for (const id in npcs) arr.push(npcs[id].group);
  return arr;
}

function pick() {
  raycaster.setFromCamera(center, camera);
  const targets = getAllPickables();
  const hits = raycaster.intersectObjects(targets, true);
  if (!hits.length) { hovered = null; setHover(null); return; }
  let obj = hits[0].object;
  while (obj && !obj.userData.interactive) obj = obj.parent;
  if (obj && obj.userData.interactive) {
    hovered = obj;
    setHover({ object: obj, distance: hits[0].distance });
  } else {
    hovered = null; setHover(null);
  }
}

function setHover(hit) {
  const hint = document.getElementById('interact-hint');
  const label = document.getElementById('interact-label');
  const cross = document.getElementById('crosshair');
  if (!hit) { hint.classList.add('hidden'); cross.classList.remove('active','hover-npc'); return; }
  const ud = hit.object.userData;
  label.textContent = ud.label || '交互';
  hint.classList.remove('hidden');
  cross.classList.add(ud.kind === 'npc' ? 'hover-npc' : 'active');
}

// ---------- 气泡 ----------
function showBubble(npc, text, ms = 4500) {
  for (let i = bubbles.length-1; i >= 0; i--) {
    if (bubbles[i].npc === npc) { bubbles[i].el.remove(); bubbles.splice(i,1); }
  }
  const el = document.createElement('div');
  el.className = 'speech-bubble';
  el.textContent = text;
  speechLayer.appendChild(el);
  const b = { el, npc, expire: performance.now() + ms };
  bubbles.push(b);
  setTimeout(() => { el.remove(); const i = bubbles.indexOf(b); if (i>=0) bubbles.splice(i,1); }, ms);
}

function updateBubbles() {
  for (const b of bubbles) {
    const pos = new THREE.Vector3();
    b.npc.group.getWorldPosition(pos);
    pos.y += 2.2;
    pos.project(camera);
    b.el.style.left = `${(pos.x*0.5+0.5)*window.innerWidth}px`;
    b.el.style.top = `${(-pos.y*0.5+0.5)*window.innerHeight}px`;
    b.el.style.opacity = pos.z > 1 ? 0 : 1;
  }
}

// ---------- 事件 ----------
function triggerEvent(desc, sfx) {
  if (sfx && audio[sfx]) audio[sfx]();
  showEventToast('教室', '大家注意到了动静，正在回应…', 0);
  api('/api/event', { session_id: sessionId, event: desc }).then(res => {
    if (res.error) { eventToast.classList.add('hidden'); return; }
    sessionId = res.session_id;
    const npc = npcs[res.responder];
    if (!npc) { eventToast.classList.add('hidden'); return; }
    npc.faceTo(player.position);
    npc.guessExpression(res.line);
    showBubble(npc, res.line);
    showEventToast(npc.name, res.line);
  }).catch(e => {
    eventToast.classList.add('hidden');
    console.warn('event', e);
  });
}

// ---------- 对话 ----------
const OPENERS = {
  teacher_wang: '这位同学，你是哪个班的？怎么跑到我们教室来了？',
  li_ming: '我去，你谁啊？新来的？',
  zhang_xue: '同学你好，请问你找哪位？',
  chen_hao: '哟！新来的？要不要一起打球？',
  lin_qing: '……（抬头看了你一眼，又低头看书）',
  wang_fang: '你好呀，有什么事吗？',
  zhao_lei: '嘿哥们，新来的？想不想搞点事？',
  sun_jie: '啊？你好……我刚在看数学书。',
  zhou_min: '哇，你这件衣服好好看，哪买的？',
  wu_peng: '……（看了你一眼，没说话）',
};

function startDialogue(npc) {
  audio.click();
  dialogue.open(npc, player.position);
  npc.faceTo(player.position);
  npc.setExpression('neutral');
  dialogue.showLine(OPENERS[npc.id] || '你好。', { allowInput: true });

  dialogue.onSubmit = async (text) => {
    audio.click();
    dialogue.showLine('……', { allowInput: false });
    npc.setExpression('thinking');
    try {
      const res = await api('/api/chat', { session_id: sessionId, npc: npc.id, text });
      sessionId = res.session_id;
      npc.guessExpression(res.reply);
      dialogue.showLine(res.reply, { allowInput: true });
    } catch (e) {
      dialogue.showLine('（耳机里传来电流声……）', { allowInput: true });
    }
  };
}

// ---------- 交互 ----------
function doInteract() {
  if (!hovered) return;
  const ud = hovered.userData;

  if (ud.kind === 'npc') {
    const npc = npcs[ud.npcId];
    if (npc) startDialogue(npc);
    return;
  }

  switch (ud.kind) {
    case 'chair':
      if (ud.physics) {
        const b = ud.physics.body;
        b.wakeUp();
        const dir = player.forwardVector;
        b.applyImpulse(
          new CANNON.Vec3(dir.x*4, 1.2, dir.z*4),
          new CANNON.Vec3(0, 0.27, 0)
        );
        triggerEvent('玩家一脚踢翻了一把椅子，"哐当"一声巨响。', 'chairFall');
      }
      break;
    case 'desk': triggerEvent('玩家拉开一张课桌的抽屉，翻找里面的东西。', 'knock'); break;
    case 'blackboard': triggerEvent('玩家拿起粉笔在黑板上乱涂乱画。', 'knock'); break;
    case 'door':
      ud.open = !ud.open;
      hovered.rotation.y = ud.open ? Math.PI/2 : 0;
      triggerEvent(ud.open ? '玩家一把推开了教室门，门"砰"地撞到墙上。' : '玩家把教室门关上了。', 'knock');
      break;
    case 'podium': triggerEvent('玩家爬到讲台上翻老师的讲义。', 'knock'); break;
    case 'teacher_desk': triggerEvent('玩家趁老师不在翻讲桌上的教案。', 'knock'); break;
    case 'bookshelf': triggerEvent('玩家走到书架前一本一本抽出来翻。', 'knock'); break;
    case 'trash': triggerEvent('玩家一脚把垃圾桶踢翻，垃圾撒了一地。', 'knock'); break;
    case 'broom': triggerEvent('玩家抄起扫帚挥舞起来。', 'knock'); break;
    case 'window': triggerEvent('玩家走到窗边往外看。', null); break;
    case 'clock': triggerEvent('玩家抬头看了看墙上的钟。', null); break;
    case 'projector': triggerEvent('玩家摆弄投影仪，灯泡闪了闪。', 'knock'); break;
    case 'poster': triggerEvent('玩家盯着墙上的海报看了一会儿。', null); break;
    default: triggerEvent(`玩家${ud.label || '观察了教室里的东西'}。`, null);
  }
}

// ---------- 抓/扔 ----------
let grabbing = false;
canvas.addEventListener('mousedown', (e) => {
  if (dialogue.active) return;
  if (e.button !== 0 || !hovered) return;
  const ud = hovered.userData;
  if (ud.physics) {
    physics.grab(ud.physics);
    grabbing = true;
  }
});
window.addEventListener('mouseup', () => {
  if (grabbing) {
    const v = player.forwardVector.clone().multiplyScalar(5);
    v.y = 1;
    physics.release(new CANNON.Vec3(v.x, v.y, v.z));
    triggerEvent('玩家抓起一把椅子扔了出去，椅子撞在地上。', 'chairFall');
    grabbing = false;
  }
});

// ---------- 键盘 ----------
document.addEventListener('keydown', (e) => {
  if (dialogue.active && document.activeElement === dialogue.input) return;

  if (e.code === 'KeyE') { doInteract(); audio.startBGM(); }
  if (e.code === 'KeyT' || e.code === 'Enter') {
    audio.startBGM();
    if (hovered && hovered.userData.kind === 'npc') {
      startDialogue(npcs[hovered.userData.npcId]);
    } else if (!dialogue.active) {
      const p = player.position;
      let best = null, bd = Infinity;
      for (const id in npcs) {
        const d = npcs[id].group.position.distanceToSquared(p);
        if (d < bd) { bd = d; best = npcs[id]; }
      }
      if (best) startDialogue(best);
    }
  }
  if (e.code === 'Escape' && dialogue.active) dialogue.close();
  if (e.code === 'KeyM') {
    const m = audio.toggleMute();
    document.getElementById('mute-btn').textContent = m ? '🔇' : '🔊';
  }
});

document.getElementById('help-close').addEventListener('click', () => {
  document.getElementById('help-overlay').classList.add('hidden');
  audio.startBGM();
});
document.getElementById('help-btn').addEventListener('click', () => {
  document.getElementById('help-overlay').classList.remove('hidden');
});
document.getElementById('mute-btn').addEventListener('click', () => {
  const m = audio.toggleMute();
  document.getElementById('mute-btn').textContent = m ? '🔇' : '🔊';
});

// ---------- 开始菜单 ----------
document.getElementById('start-btn').addEventListener('click', () => {
  document.getElementById('start-menu').classList.add('hidden');
  audio.startBGM();
  canvas.requestPointerLock();
});

// ---------- 主循环 ----------
const clock = new THREE.Clock();
async function init() {
  npcs = await buildAllNPCs(scene);
  fetchState();
  if (!visualTour && !chairCheck) setTimeout(() => document.getElementById('help-overlay').classList.remove('hidden'), 400);
}
init();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (!dialogue.active) player.update(dt);
  if (visualTour) visualTour(dt);
  pick();
  for (const id in npcs) npcs[id].update(dt);
  dialogue.update(dt);
  updateBubbles();
  physics.step(dt);

  if (grabbing && physics.grabbed) {
    const ahead = camera.position.clone().add(player.forwardVector.clone().multiplyScalar(1.5));
    ahead.y = camera.position.y;
    physics.moveGrabbed(ahead);
  }

  renderer.render(scene, camera);
  if (visualTour) visualTour.inspect(renderer);
}
animate();
