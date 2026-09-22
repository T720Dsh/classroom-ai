// dialogue.js — Galgame 对话框 + 状态机
import * as THREE from 'three';

const STATE = {
  CLOSED: 'closed',
  OPENING: 'opening',
  READY: 'ready',
  GENERATING: 'generating',
  TYPING: 'typing',
  ERROR: 'error',
};

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
    this.thinkingEl = document.getElementById('dialogue-thinking');
    this.retryBtn = document.getElementById('dialogue-retry');

    this.state = STATE.CLOSED;
    this.active = false;
    this.currentNpc = null;
    this.onSubmit = null;
    this.onRetry = null;

    this.camGoalPos = null;
    this.camGoalLook = null;
    this.turnTarget = new THREE.Object3D();

    this._typeTimer = null;
    this._typeText = '';
    this._typeIdx = 0;
    this._requestId = 0;
    this._lastText = '';

    this._bind();
  }

  _bind() {
    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') this._submit();
      if (e.key === 'Escape') this.close();
    });
    this.closeBtn.addEventListener('click', () => this.close());
    if (this.retryBtn) {
      this.retryBtn.addEventListener('click', () => {
        if (this.onRetry) this.onRetry();
      });
    }
    // Click on text skips typewriter
    this.textEl.addEventListener('click', () => {
      if (this.state === STATE.TYPING) this._finishType();
    });
  }

  _submit() {
    if (this.state !== STATE.READY) return;
    const text = this.input.value.trim();
    if (!text || !this.onSubmit) return;
    this.input.value = '';
    this.onSubmit(text);
  }

  open(npc, playerPos) {
    this.active = true;
    this.currentNpc = npc;
    this.state = STATE.OPENING;
    this.nameEl.textContent = npc.name;
    this._lastText = '';
    this._cancelType();
    this.box.classList.remove('hidden');
    this.textEl.textContent = '';
    this.continueEl.classList.add('hidden');
    this.inputRow.classList.add('hidden');
    this._showThinking(false);
    this._showRetry(false);
    this.input.disabled = false;

    const npcPos = npc.group.position;
    this.camGoalPos = playerPos.clone();
    this.camGoalLook = npcPos.clone();
    this.camGoalLook.y = 1.5;

    if (document.pointerLockElement) document.exitPointerLock();
  }

  /** Show the opening line immediately (no typewriter delay for opener). */
  showOpening(text) {
    this.textEl.textContent = text;
    this._lastText = text;
    this.state = STATE.READY;
    this.inputRow.classList.remove('hidden');
    this.continueEl.classList.remove('hidden');
    setTimeout(() => this.input.focus(), 80);
  }

  /** Begin generating state: show thinking animation, disable input. */
  setGenerating() {
    this.state = STATE.GENERATING;
    this.inputRow.classList.add('hidden');
    this.continueEl.classList.add('hidden');
    this._showRetry(false);
    this._showThinking(true);
    this.input.disabled = true;
    this._requestId++;
  }

  /** Show NPC reply with typewriter effect. */
  showReply(text) {
    this._cancelType();
    this._showThinking(false);
    this._showRetry(false);
    this._lastText = text;
    this.state = STATE.TYPING;
    this._typeText = text;
    this._typeIdx = 0;
    this.textEl.textContent = '';
    this._typeStep();
  }

  _typeStep() {
    if (this.state !== STATE.TYPING) return;
    this._typeIdx++;
    this.textEl.textContent = this._typeText.slice(0, this._typeIdx);
    if (this._typeIdx < this._typeText.length) {
      this._typeTimer = setTimeout(() => this._typeStep(), 35);
    } else {
      this._finishType();
    }
  }

  _finishType() {
    this._cancelType();
    this.textEl.textContent = this._typeText;
    this.state = STATE.READY;
    this.input.disabled = false;
    this.inputRow.classList.remove('hidden');
    this.continueEl.classList.remove('hidden');
    setTimeout(() => this.input.focus(), 50);
  }

  _cancelType() {
    if (this._typeTimer) {
      clearTimeout(this._typeTimer);
      this._typeTimer = null;
    }
  }

  /** Show error state with retry button. */
  showError(msg) {
    this._cancelType();
    this._showThinking(false);
    this.state = STATE.ERROR;
    this.textEl.textContent = msg || '（耳机里传来电流声……再试一次？）';
    this.input.disabled = true;
    this.inputRow.classList.add('hidden');
    this._showRetry(true);
  }

  _showThinking(on) {
    if (!this.thinkingEl) return;
    this.thinkingEl.classList.toggle('hidden', !on);
  }

  _showRetry(on) {
    if (!this.retryBtn) return;
    this.retryBtn.classList.toggle('hidden', !on);
  }

  close() {
    this._cancelType();
    this._requestId++; // invalidate pending requests
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    this.player.yaw = Math.atan2(-direction.x, -direction.z);
    this.player.pitch = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1));
    this.state = STATE.CLOSED;
    this.active = false;
    this.currentNpc = null;
    this.box.classList.add('hidden');
    this.camGoalPos = null;
    this.camGoalLook = null;
    this.input.disabled = false;
    this.input.value = '';
    document.getElementById('game-canvas').requestPointerLock();
  }

  update(dt) {
    if (this.camGoalPos) {
      this.camera.position.copy(this.camGoalPos);
      this.turnTarget.position.copy(this.camera.position);
      this.turnTarget.lookAt(this.camGoalLook);
      this.camera.quaternion.slerp(this.turnTarget.quaternion, Math.min(1, dt * 3));
    }
  }
}
