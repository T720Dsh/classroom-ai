// dialogue.js — Galgame 对话框 + 相机取景
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

    this.active = false;
    this.currentNpc = null;
    this.onSubmit = null;

    // 相机取景用的过渡
    this.camGoalPos = null;
    this.camGoalLook = null;
    this.playerFrozen = false;

    this._bind();
  }

  _bind() {
    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') this._submit();
      if (e.key === 'Escape') this.close();
    });
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

    // 相机取景：站在 NPC 面前 2 米，看着 NPC
    const npcPos = npc.group.position;
    const dx = playerPos.x - npcPos.x;
    const dz = playerPos.z - npcPos.z;
    const len = Math.sqrt(dx*dx + dz*dz) || 1;
    // 玩家视角位置 = NPC 前方 1.8m
    this.camGoalPos = new (npc.group.position.constructor)(
      npcPos.x + (dx/len)*1.8,
      1.6,
      npcPos.z + (dz/len)*1.8
    );
    this.camGoalLook = npcPos.clone();
    this.camGoalLook.y = 1.5;

    this.playerFrozen = true;
    if (document.pointerLockElement) document.exitPointerLock();
  }

  showLine(text, { allowInput = true } = {}) {
    // 打字机效果
    this.textEl.textContent = '';
    let i = 0;
    const tick = () => {
      if (!this.active) return;
      this.textEl.textContent = text.slice(0, ++i);
      if (i < text.length) {
        setTimeout(tick, 35);
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
    this.playerFrozen = false;
    this.camGoalPos = null;
    this.camGoalLook = null;
  }

  update(dt) {
    if (this.camGoalPos) {
      // 平滑相机动画
      this.camera.position.lerp(this.camGoalPos, Math.min(1, dt*3));
      if (this.camGoalLook) {
        const look = this.camera.position.clone().add(this.camera.getWorldDirection(new (this.camera.position.constructor)()));
        // 简单：直接 lookAt
        this.camera.lookAt(this.camGoalLook);
      }
    }
  }
}
