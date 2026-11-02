// 3D version of the whiteboard box: same drawing (a plain cuboid, HAZARD inside, four risk arrows),
// built in three.js over the real footage. It only shows on the model chapter and turns to face each worker.
import * as THREE from 'three';

await document.fonts.load('800 100px "Barlow Condensed"').catch(()=>{});

const COL={A:0x3b8cff,B:0x22c55e,C:0xff5a4f,D:0xb06cff};
const canvas=document.getElementById('gl');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setClearColor(0x000000,0);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(38,1,.1,500);

// box proportions follow the whiteboard drawing: wide, a bit shallower than tall
const W=10,H=7.2,Dp=5.4;
const root=new THREE.Group();scene.add(root);

// edges as thin glowing tubes so they read like a marker line, not a 1px wire
const edgeMat=new THREE.MeshBasicMaterial({color:0xeef3fa});
const corners=[];for(const x of[-1,1])for(const y of[-1,1])for(const z of[-1,1])corners.push(new THREE.Vector3(x*W/2,y*H/2,z*Dp/2));
for(let a=0;a<8;a++)for(let b=a+1;b<8;b++){
  const d=corners[a].clone().sub(corners[b]);const n=[d.x!==0,d.y!==0,d.z!==0].filter(Boolean).length;if(n!==1)continue;
  const len=d.length(),m=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,len,10),edgeMat);
  m.position.copy(corners[a]).add(corners[b]).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());root.add(m);
}
// one face per worker, lit in their colour: A top, B bottom, C left, D right (as on the whiteboard)
const faces={};
const FACE={A:{s:[W,Dp],p:[0,H/2,0],r:[-Math.PI/2,0,0]},B:{s:[W,Dp],p:[0,-H/2,0],r:[Math.PI/2,0,0]},
  C:{s:[Dp,H],p:[-W/2,0,0],r:[0,-Math.PI/2,0]},D:{s:[Dp,H],p:[W/2,0,0],r:[0,Math.PI/2,0]}};
for(const k in FACE){const f=FACE[k];
  const m=new THREE.Mesh(new THREE.PlaneGeometry(...f.s),new THREE.MeshBasicMaterial({color:COL[k],transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
  m.position.set(...f.p);m.rotation.set(...f.r);root.add(m);faces[k]=m;}
// a faint glass front and back so the box reads as solid
for(const z of[-1,1]){const m=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshBasicMaterial({color:0x8fb4e3,transparent:true,opacity:.05,side:THREE.DoubleSide,depthWrite:false}));m.position.z=z*Dp/2;root.add(m);}

function tex(draw,w,h){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
const label=new THREE.Sprite(new THREE.SpriteMaterial({depthTest:false,map:tex((x,w,h)=>{x.textAlign='center';x.textBaseline='middle';
  x.shadowColor='#ff4d3d';x.shadowBlur=24;x.fillStyle='#ff5a48';x.font='800 150px "Barlow Condensed",sans-serif';x.fillText('HAZARD',w/2,h/2-28);
  x.shadowBlur=0;x.fillStyle='#fff';x.font='600 44px "Barlow Condensed",sans-serif';x.fillText('W O R K I N G   A T   H E I G H T',w/2,h/2+70);},1024,320)}));
label.scale.set(7.6,2.4,1);root.add(label);

// the four risk arrows
const DIR={A:new THREE.Vector3(0,1,0),B:new THREE.Vector3(0,-1,0),C:new THREE.Vector3(-1,0,0),D:new THREE.Vector3(1,0,0)};
const arms={};
for(const k of'ABCD'){
  const dir=DIR[k],col=COL[k],g=new THREE.Group(),mat=new THREE.MeshBasicMaterial({color:col,transparent:true});
  const half=k==='A'||k==='B'?H/2:W/2,from=half+5.2,to=half+.35,len=from-to;
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.26,.26,len-1.1,14),mat);shaft.position.y=(len-1.1)/2;
  const head=new THREE.Mesh(new THREE.ConeGeometry(.85,1.6,24),mat);head.position.y=len-.6;
  const run=new THREE.Mesh(new THREE.SphereGeometry(.2,12,10),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true}));
  const inner=new THREE.Group();inner.add(shaft,head,run);inner.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().negate());
  g.add(inner);g.position.copy(dir.clone().multiplyScalar(from));root.add(g);
  const hex='#'+col.toString(16).padStart(6,'0');
  const spr=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthTest:false,map:tex((x,w,h)=>{x.textAlign='center';x.textBaseline='middle';
    x.fillStyle=hex;x.shadowColor=hex;x.shadowBlur=26;x.font='800 200px "Barlow Condensed",sans-serif';x.fillText(k,w/2,120);
    x.shadowBlur=0;x.font='600 40px "Barlow Condensed",sans-serif';x.fillText('R I S K',w/2,262);},256,300)}));
  spr.scale.set(3.8,4.4,1);spr.position.copy(dir.clone().multiplyScalar(from+1.9));root.add(spr);
  arms[k]={g,inner,run,spr,mat,len,show:0};
}

// camera: the whiteboard's three-quarter view; each worker's view looks at their face of the box
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const VIEW={all:{p:V(12,7,52),t:V(-3.5,.6,0)},
  A:{p:V(-8,31,22),t:V(8,1,0)},B:{p:V(-8,-24,25),t:V(8,-1,0)},C:{p:V(-32,6,19),t:V(5,0,6.5)},D:{p:V(23,6,31),t:V(9,0,-9)}};
const cam={p:VIEW.all.p.clone(),t:VIEW.all.t.clone(),from:null,ft:null,to:null,tt:null,t0:0,dur:1};
camera.position.copy(cam.p);camera.lookAt(cam.t);
const ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
function fly(v,d=1.8){cam.from=camera.position.clone();cam.ft=cam.t.clone();cam.to=VIEW[v].p.clone();cam.tt=VIEW[v].t.clone();cam.t0=performance.now();cam.dur=d*1000;}

const clock=new THREE.Clock();
let state={id:'',step:0,worker:null},lastView='all',enteredAt=0;
window.onDeck=s=>{if(s.id==='s2'&&state.id!=='s2')enteredAt=clock.getElapsedTime();state=s;canvas.style.transitionDelay=s.id==='s2'?'1.3s':'0s';canvas.style.opacity=s.id==='s2'?1:0;const v=s.worker||'all';if(v!==lastView){fly(v);lastView=v;}};
canvas.style.transition='opacity .9s';canvas.style.transitionDelay='0s';
if(window.deckState)window.onDeck(window.deckState);

function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
addEventListener('resize',resize);resize();

// click a letter or arrow in 3D to open that worker
const ray=new THREE.Raycaster(),ms=new THREE.Vector2();
canvas.style.pointerEvents='auto';
function hit(e){ms.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(ms,camera);
  for(const k of'ABCD'){const a=arms[k];if(a.show<.9)continue;if(ray.intersectObjects([a.spr,...a.inner.children],false).length)return k;}return null;}
canvas.addEventListener('pointermove',e=>canvas.style.cursor=hit(e)?'pointer':'default');
canvas.addEventListener('click',e=>{const k=hit(e);if(k)window.deck.worker(k);});

(function tick(){
  const t=clock.getElapsedTime(),now=performance.now();
  if(cam.to){const k=Math.min(1,(now-cam.t0)/cam.dur),e=ease(k);camera.position.lerpVectors(cam.from,cam.to,e);cam.t.lerpVectors(cam.ft,cam.tt,e);if(k>=1)cam.to=null;}
  const sway=lastView==='all'?1:.35;
  camera.lookAt(cam.t.x+Math.sin(t*.3)*.25*sway,cam.t.y+Math.cos(t*.25)*.15*sway,cam.t.z);
  root.rotation.y=Math.sin(t*.22)*.06*sway;
  const s2=state.id==='s2',w=state.worker;
  for(const [n,k] of [...'ABCD'].entries()){
    const a=arms[k],want=s2&&t-enteredAt>.5+n*.6?1:0;a.show+=(want-a.show)*.07;
    const dim=w&&w!==k?.18:1;a.g.scale.setScalar(Math.max(.001,a.show));
    a.mat.opacity=dim;a.spr.material.opacity=a.show*dim;a.run.material.opacity=.9*dim;
    a.run.position.y=((t*.6+n*.25)%1)*(a.len-1.2);
    const fo=!s2||t-enteredAt<1.1+n*.6?0:w?(w===k?.62:.04):.28;
    faces[k].material.opacity+=(fo-faces[k].material.opacity)*.08;
  }
  renderer.render(scene,camera);requestAnimationFrame(tick);
})();
