// dialogue.js — Galgame 对话框 + 相机取景
import * as THREE from 'three';

export class Dialogue {
  constructor(camera, player) {
    this.camera = camera;
    this.player = player;
    this.box = document.getElementById('dialogue-box');
    this.nameEl = document.getElementById('dialogue-name');
    this.textEl = document.getElementById('dialogue-text');
    this.inputRow = document.getElementById('dialogue-input-row');
    this.input = document.getElementById('dialogue-input');
    this.continueEl = document.getElementById('dialogue-continue');
    this.closeBtn = document.getElementById('dialogue-close');

    this.active = false;
    this.currentNpc = null;
    this.onSubmit = null;

    this.camGoalPos = null;
    this.camGoalLook = null;

    this._bind();
  }

  _bind() {
    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') this._submit();
      if (e.key === 'Escape') this.close();
    });
    this.closeBtn.addEventListener('click', () => this.close());
  }

  _submit() {
    const text = this.input.value.trim();
    if (!text || !this.onSubmit) return;
    this.input.value = '';
    this.onSubmit(text);
  }

  open(npc, playerPos) {
    this.active = true;
    this.currentNpc = npc;
    this.nameEl.textContent = npc.name;
    this.textEl.textContent = '';
    this.inputRow.classList.add('hidden');
    this.continueEl.classList.add('hidden');
    this.box.classList.remove('hidden');

    const npcPos = npc.group.position;
    const dx = playerPos.x - npcPos.x;
    const dz = playerPos.z - npcPos.z;
    const len = Math.sqrt(dx*dx + dz*dz) || 1;
    this.camGoalPos = new THREE.Vector3(
      npcPos.x + (dx/len)*1.8,
      1.6,
      npcPos.z + (dz/len)*1.8
    );
    this.camGoalLook = npcPos.clone();
    this.camGoalLook.y = 1.5;

    if (document.pointerLockElement) document.exitPointerLock();
  }

  showLine(text, { allowInput = true } = {}) {
    this.textEl.textContent = '';
    let i = 0;
    const tick = () => {
      if (!this.active) return;
      this.textEl.textContent = text.slice(0, ++i);
      if (i < text.length) {
        setTimeout(tick, 30);
      } else {
        if (allowInput) {
          this.inputRow.classList.remove('hidden');
          this.continueEl.classList.remove('hidden');
          setTimeout(() => this.input.focus(), 50);
        }
      }
    };
    tick();
  }

  close() {
    this.active = false;
    this.currentNpc = null;
    this.box.classList.add('hidden');
    this.camGoalPos = null;
    this.camGoalLook = null;
    document.getElementById('game-canvas').requestPointerLock();
  }

  update(dt) {
    if (this.camGoalPos) {
      this.camera.position.lerp(this.camGoalPos, Math.min(1, dt*3));
      this.camera.lookAt(this.camGoalLook);
    }
  }
}
