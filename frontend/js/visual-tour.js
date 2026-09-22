// Browser visual QA route. Open /?visualTour=1 to sweep several view angles
// while walking through clear aisles. It is never enabled during normal play.
export function createVisualTour(player) {
  const segments = [
    { name:'中央环视', from:[0,2.5,0], to:[0,2.5,-Math.PI*2], seconds:6 },
    { name:'中央过道前行', from:[0,2.5,0], to:[0,-2.7,0], seconds:5 },
    { name:'前方转向右墙', from:[0,-2.7,0], to:[0,-2.7,-Math.PI/2], seconds:2 },
    { name:'讲台前横移', from:[0,-2.7,-Math.PI/2], to:[5.4,-2.7,-Math.PI/2], seconds:5 },
    { name:'侧过道转身', from:[5.4,-2.7,-Math.PI/2], to:[5.4,-2.7,-Math.PI], seconds:2 },
    { name:'侧过道走向后墙', from:[5.4,-2.7,-Math.PI], to:[5.4,3.8,-Math.PI], seconds:6 },
    { name:'后方环视', from:[5.4,3.8,-Math.PI], to:[5.4,3.8,-Math.PI*3], seconds:6 },
  ];
  const badge = document.createElement('div');
  badge.id = 'visual-tour-status';
  Object.assign(badge.style, {
    position:'fixed', right:'12px', top:'12px', zIndex:'100',
    padding:'8px 12px', background:'rgba(17,31,47,.86)', color:'#fff',
    font:'13px sans-serif', borderRadius:'7px', pointerEvents:'none'
  });
  document.body.appendChild(badge);
  document.getElementById('start-menu').classList.add('hidden');
  document.getElementById('help-overlay').classList.add('hidden');
  let elapsed = 0;
  let darkFrames = 0, sampledFrames = 0, frame = 0;
  const update = (dt) => {
    elapsed += dt;
    let t = elapsed, segment = segments.at(-1);
    for (const candidate of segments) {
      segment = candidate;
      if (t <= candidate.seconds) break;
      t -= candidate.seconds;
    }
    const f = Math.min(1, t / segment.seconds);
    const [x,z,yaw] = segment.from.map((v,i) => v + (segment.to[i]-v)*f);
    player.position.set(x, 1.6, z);
    player.yaw = yaw;
    player.pitch = Math.sin(elapsed*0.7)*0.13;
    player.update(0);
    badge.textContent = `${segment.name} · x ${player.position.x.toFixed(1)} z ${player.position.z.toFixed(1)} · 朝向 ${(yaw*180/Math.PI).toFixed(0)}° · 暗帧 ${darkFrames}/${sampledFrames}`;
  };
  update.inspect = (renderer) => {
    if (++frame % 15) return;
    const gl = renderer.getContext();
    const pixel = new Uint8Array(4);
    let total = 0;
    for (const fx of [0.25,0.5,0.75]) {
      for (const fy of [0.25,0.5,0.75]) {
        gl.readPixels(Math.floor(gl.drawingBufferWidth*fx), Math.floor(gl.drawingBufferHeight*fy),
          1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
        total += (pixel[0]+pixel[1]+pixel[2])/3;
      }
    }
    sampledFrames++;
    if (total/9 < 45) darkFrames++;
  };
  return update;
}
