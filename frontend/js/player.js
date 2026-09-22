// player.js — 第一人称控制器
import * as THREE from 'three';

const EYE_HEIGHT = 1.6;
const SPEED = 3.0;        // m/s
const PLAYER_RADIUS = 0.3;
const PLAYER_HEIGHT = 1.7;

export class Player {
  constructor(camera, domElement, colliders, room) {
    this.camera = camera;
    this.dom = domElement;
    this.colliders = colliders;
    this.room = room;

    this.yaw = 0;
    this.pitch = 0;
    this.keys = {};
    this.locked = false;

    this.position = new THREE.Vector3(0, EYE_HEIGHT, 2.5); // 出生点
    this.velocity = new THREE.Vector3();

    this._bind();
  }

  _bind() {
    document.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
    document.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    this.dom.addEventListener('click', () => {
      if (!this.locked && !this._chatOpen) {
        this.dom.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.locked = (document.pointerLockElement === this.dom);
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      const sx = 0.0022, sy = 0.0022;
      this.yaw   -= e.movementX * sx;
      this.pitch -= e.movementY * sy;
      const lim = Math.PI / 2 - 0.05;
      this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
    });
  }

  setChatOpen(open) {
    this._chatOpen = open;
    if (open && this.locked) {
      document.exitPointerLock();
    } else if (!open) {
      this.dom.requestPointerLock();
    }
  }

  _collide(newPos) {
    // 检查与 AABB 碰撞盒
    const r = PLAYER_RADIUS;
    for (const c of this.colliders) {
      if (
        newPos.x + r > c.minX && newPos.x - r < c.maxX &&
        newPos.z + r > c.minZ && newPos.z - r < c.maxZ
      ) {
        return true;
      }
    }
    // 房间边界
    const hw = this.room.width / 2 - 0.2;
    const hd = this.room.depth / 2 - 0.2;
    if (newPos.x < -hw || newPos.x > hw || newPos.z < -hd || newPos.z > hd) {
      return true;
    }
    return false;
  }

  update(dt) {
    // 方向向量（基于 yaw）
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right   = new THREE.Vector3(-forward.z, 0, forward.x);

    const move = new THREE.Vector3();
    if (this.keys['KeyW']) move.add(forward);
    if (this.keys['KeyS']) move.sub(forward);
    if (this.keys['KeyD']) move.add(right);
    if (this.keys['KeyA']) move.sub(right);
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(SPEED * dt);

    // 分轴碰撞（滑动）
    const tryPos = this.position.clone();
    tryPos.x += move.x;
    if (!this._collide(tryPos)) this.position.x = tryPos.x;
    tryPos.copy(this.position);
    tryPos.z += move.z;
    if (!this._collide(tryPos)) this.position.z = tryPos.z;

    // 相机同步
    this.camera.position.copy(this.position);
    const lookDir = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    this.camera.lookAt(this.camera.position.clone().add(lookDir));
  }

  get forwardVector() {
    return new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      0,
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    ).normalize();
  }
}
