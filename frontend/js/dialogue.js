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
    this.turnTarget = new THREE.Object3D();

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
    // Keep the viewpoint at the player's collision-safe position. Moving the
    // camera through desks or other characters caused close-up clipping.
    this.camGoalPos = playerPos.clone();
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
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    this.player.yaw = Math.atan2(-direction.x, -direction.z);
    this.player.pitch = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1));
    this.active = false;
    this.currentNpc = null;
    this.box.classList.add('hidden');
    this.camGoalPos = null;
    this.camGoalLook = null;
    document.getElementById('game-canvas').requestPointerLock();
  }

  update(dt) {
    if (this.camGoalPos) {
      this.camera.position.copy(this.camGoalPos);
      this.turnTarget.position.copy(this.camera.position);
      this.turnTarget.lookAt(this.camGoalLook);
      this.camera.quaternion.slerp(this.turnTarget.quaternion, Math.min(1, dt*3));
    }
  }
}
