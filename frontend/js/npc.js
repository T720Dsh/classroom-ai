// Volumetric characters: no camera-facing face planes or shared skeletons.
import * as THREE from 'three';

const material = color => new THREE.MeshStandardMaterial({ color, roughness: 0.82 });
const skin = material(0xe8b992);
const ink = material(0x2b3039);
const white = material(0xfffcf4);
export const NPC_DEFS = [
  { id:'teacher_wang', name:'王老师', pos:[-1.2,0,-3.0], shirt:0x425c76, pants:0x27394f, role:'teacher' },
  { id:'li_ming', name:'李明', pos:[-1.8,0,-1.0], shirt:0xcf6355, pants:0x35445a, role:'student' },
  { id:'zhang_xue', name:'张雪', pos:[1.8,0,-1.0], shirt:0x5589be, pants:0x39475e, role:'student' },
  { id:'chen_hao', name:'陈浩', pos:[3.6,0,-0.1], shirt:0x48a980, pants:0x384455, role:'student' },
  { id:'lin_qing', name:'林青', pos:[-3.6,0,0.4], shirt:0x9672b0, pants:0x35445a, role:'student' },
  { id:'wang_fang', name:'王芳', pos:[-1.8,0,1.1], shirt:0xd76e99, pants:0x48546b, role:'student' },
  { id:'zhao_lei', name:'赵磊', pos:[3.6,0,2.0], shirt:0xd6a448, pants:0x35445a, role:'student' },
  { id:'sun_jie', name:'孙杰', pos:[-3.6,0,2.4], shirt:0x4daaa1, pants:0x39475e, role:'student' },
  { id:'zhou_min', name:'周敏', pos:[1.8,0,3.1], shirt:0xae79bc, pants:0x48546b, role:'student' },
  { id:'wu_peng', name:'吴鹏', pos:[3.6,0,4.1], shirt:0x5f768d, pants:0x35445a, role:'student' },
];
function part(group, shape, mat, x,y,z) {
  const mesh = new THREE.Mesh(shape, mat);
  mesh.position.set(x,y,z);
  group.add(mesh);
  return mesh;
}
function limb(group, a,b,r,mat) {
  const p = new THREE.Vector3(...a), q = new THREE.Vector3(...b);
  const delta = q.clone().sub(p);
  const mesh = part(group, new THREE.CylinderGeometry(r,r*0.9,delta.length(),10),mat,
    (a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
}
export class NPC {
  constructor(def) {
    this.id=def.id; this.name=def.name; this.role=def.role; this.def=def;
    this.group=new THREE.Group(); this._targetYaw=0; this._time=Math.random()*10;
    this._build(def); this.setPosition(def.pos);
  }
  _build(def) {
    const g=this.group, shirt=material(def.shirt), pants=material(def.pants);
    const hair=material(def.role==='teacher' ? 0x51494b : [0x332e36,0x513d37,0x282d3a][NPC_DEFS.indexOf(def)%3]);
    const shoes=material(0x29313e), trim=material(def.role==='teacher' ? 0xc7dceb : 0xf5f0df);
    for(const side of [-1,1]) {
      part(g,new THREE.SphereGeometry(0.115,14,10),shoes,side*0.115,0.085,0.065).scale.set(1,0.55,1.5);
      limb(g,[side*0.12,0.14,0],[side*0.12,0.79,0],0.095,pants);
      limb(g,[side*0.265,1.35,0],[side*0.32,0.94,0.035],0.078,shirt);
      part(g,new THREE.SphereGeometry(0.073,12,10),skin,side*0.325,0.90,0.045);
    }
    part(g,new THREE.CapsuleGeometry(0.245,0.43,6,16),shirt,0,1.16,0);
    part(g,new THREE.CylinderGeometry(0.075,0.08,0.16,12),skin,0,1.48,0);
    part(g,new THREE.SphereGeometry(0.202,24,16),skin,0,1.68,0.015);
    this.brows=[];
    for(const side of [-1,1]) {
      part(g,new THREE.SphereGeometry(0.052,12,10),skin,side*0.195,1.67,0.02);
      part(g,new THREE.SphereGeometry(0.032,12,10),white,side*0.078,1.71,0.186);
      part(g,new THREE.SphereGeometry(0.016,12,10),ink,side*0.078,1.71,0.215);
      this.brows.push(part(g,new THREE.BoxGeometry(0.073,0.012,0.015),hair,side*0.079,1.76,0.191));
    }
    part(g,new THREE.SphereGeometry(0.037,12,10),skin,0,1.635,0.215).scale.set(0.8,1.2,1.2);
    this.mouth=part(g,new THREE.TorusGeometry(0.034,0.006,6,14,Math.PI),material(0x944f56),0,1.576,0.187);
    this.mouth.rotation.z=Math.PI;
    part(g,new THREE.SphereGeometry(0.205,24,12,0,Math.PI*2,0,Math.PI*0.46),hair,0,1.69,0.015);
    part(g,new THREE.SphereGeometry(0.155,18,10),hair,0,1.84,-0.038).scale.set(1.15,0.38,0.8);
    if(def.role==='teacher') {
      part(g,new THREE.BoxGeometry(0.073,0.3,0.012),trim,0,1.20,0.245);
      for(const side of [-1,1]) part(g,new THREE.TorusGeometry(0.055,0.008,6,16),ink,side*0.078,1.71,0.222);
      part(g,new THREE.BoxGeometry(0.055,0.008,0.012),ink,0,1.71,0.225);
    } else {
      for(const side of [-1,1]) {
        const collar=part(g,new THREE.BoxGeometry(0.12,0.045,0.015),trim,side*0.063,1.416,0.19);
        collar.rotation.z=side*0.35;
      }
      part(g,new THREE.BoxGeometry(0.067,0.042,0.012),trim,-0.12,1.275,0.224);
    }
    g.traverse(o=>{ if(o.isMesh) Object.assign(o.userData,{
      interactive:true,kind:'npc',npcId:this.id,label:`和${this.name}说话`
    });});
  }
  setPosition(p){ this.group.position.set(p[0],p[1],p[2]); }
  playIdle(){}
  setExpression(expr){
    this.mouth.rotation.z=expr==='sad'?0:Math.PI;
    this.mouth.scale.setScalar(expr==='surprised'?1.45:1);
    this.brows[0].rotation.z=expr==='angry'?-0.3:0;
    this.brows[1].rotation.z=expr==='angry'?0.3:0;
  }
  guessExpression(text){
    if(/滚|安静|别动|停下|谁干的|出去|罚/.test(text)) this.setExpression('angry');
    else if(/哈哈|笑|嘿|不错|好呀|好啊/.test(text)) this.setExpression('happy');
    else if(/唉|累|烦|难过|可怜/.test(text)) this.setExpression('sad');
    else if(/[！?？]|哇|什么/.test(text)) this.setExpression('surprised');
    else this.setExpression('neutral');
  }
  faceTo(point){this._targetYaw=Math.atan2(point.x-this.group.position.x,point.z-this.group.position.z);}
  update(dt){
    this._time+=dt;
    let dy=this._targetYaw-this.group.rotation.y;
    while(dy>Math.PI)dy-=Math.PI*2;
    while(dy<-Math.PI)dy+=Math.PI*2;
    this.group.rotation.y+=dy*Math.min(1,dt*5);
    this.group.scale.y=1+Math.sin(this._time*1.7)*0.004;
  }
}
export async function buildAllNPCs(scene){
  const npcs={};
  for(const def of NPC_DEFS){const npc=new NPC(def);scene.add(npc.group);npcs[def.id]=npc;}
  return npcs;
}
