// physics.js — cannon-es 物理世界
import * as CANNON from 'cannon-es';

export class PhysicsWorld {
  constructor() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;

    this.groundMat = new CANNON.Material('ground');
    this.propMat = new CANNON.Material('prop');
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.groundMat, this.propMat, {
      friction: 0.4, restitution: 0.3,
    }));

    this.dynamicBodies = []; // { body, mesh }
    this.grabbed = null;      // { body, mesh }
  }

  addGround(width, depth) {
    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
      material: this.groundMat,
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);
    return groundBody;
  }

  addWall(x, z, w, d) {
    const body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(w/2, 2, d/2)),
      material: this.groundMat,
    });
    body.position.set(x, 1, z);
    this.world.addBody(body);
    return body;
  }

  addDynamicBox(mesh, { mass = 1, position, halfExtents = [0.2,0.2,0.2] }) {
    const body = new CANNON.Body({
      mass,
      shape: new CANNON.Box(new CANNON.Vec3(...halfExtents)),
      position: new CANNON.Vec3(position.x, position.y, position.z),
      material: this.propMat,
    });
    this.world.addBody(body);
    const entry = { body, mesh };
    this.dynamicBodies.push(entry);
    mesh.userData.physics = entry;
    return entry;
  }

  grab(entry) {
    if (!entry) return;
    this.grabbed = entry;
    entry.body.type = CANNON.Body.KINEMATIC;
    entry.body.velocity.setZero();
  }

  moveGrabbed(targetPos) {
    if (!this.grabbed) return;
    const b = this.grabbed.body;
    b.position.set(targetPos.x, targetPos.y, targetPos.z);
    b.velocity.setZero();
  }

  release(throwVelocity) {
    if (!this.grabbed) return;
    const b = this.grabbed.body;
    b.type = CANNON.Body.DYNAMIC;
    b.wakeUp();
    if (throwVelocity) {
      b.velocity.set(throwVelocity.x, throwVelocity.y, throwVelocity.z);
      b.angularVelocity.set(
        (Math.random()-0.5)*5,
        (Math.random()-0.5)*5,
        (Math.random()-0.5)*5
      );
    }
    this.grabbed = null;
  }

  step(dt) {
    this.world.step(1/60, dt, 3);
    for (const e of this.dynamicBodies) {
      e.mesh.position.copy(e.body.position);
      e.mesh.quaternion.copy(e.body.quaternion);
    }
  }
}
