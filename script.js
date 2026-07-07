import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const state = { art:null, scale:1, x:0, y:0, rot:0, color:'#ffffff' };
const viewers = [];

function createRoundedRectTexture(text='MugArt', sub='Sua arte aqui'){
  const c=document.createElement('canvas'); c.width=1024; c.height=1024; const g=c.getContext('2d');
  g.clearRect(0,0,c.width,c.height);
  g.fillStyle='rgba(255,255,255,0)'; g.fillRect(0,0,c.width,c.height);
  g.save(); g.translate(c.width/2,c.height/2); g.rotate(state.rot*Math.PI/180); g.scale(state.scale,state.scale); g.translate(state.x*280,state.y*-280);
  if(state.art){
    const img=state.art; const r=Math.min(760/img.width,520/img.height); const w=img.width*r; const h=img.height*r;
    g.drawImage(img,-w/2,-h/2,w,h);
  }else{
    const grad=g.createLinearGradient(-360,-230,360,230); grad.addColorStop(0,'#ff3f9a'); grad.addColorStop(.52,'#ffd33d'); grad.addColorStop(1,'#25d9ff');
    g.fillStyle=grad; roundRect(g,-350,-210,700,420,44); g.fill();
    g.fillStyle='#07101a'; g.font='900 92px Inter, Arial'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(text,0,-22);
    g.font='700 36px Inter, Arial'; g.fillText(sub,0,70);
  }
  g.restore();
  const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=8; tex.needsUpdate=true; return tex;
}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}

function makeMugMesh(){
  const group = new THREE.Group();
  group.rotation.y = -0.35;

  // Medidas proporcionais a uma caneca padrão 11oz: altura 3.8, boca 1.42, base 1.17.
  const H=3.8;
  const profile = [
    new THREE.Vector2(1.17,-H/2+0.10),
    new THREE.Vector2(1.22,-H/2+0.02),
    new THREE.Vector2(1.31,-H/2+0.18),
    new THREE.Vector2(1.36,-H/2+0.78),
    new THREE.Vector2(1.39,-0.40),
    new THREE.Vector2(1.42,0.55),
    new THREE.Vector2(1.45,H/2-0.24),
    new THREE.Vector2(1.43,H/2-0.08),
    new THREE.Vector2(1.38,H/2+0.02),
  ];
  const porcelain = new THREE.MeshPhysicalMaterial({
    color:new THREE.Color(state.color), roughness:.27, metalness:0, clearcoat:1, clearcoatRoughness:.16,
    reflectivity:.75, side:THREE.DoubleSide
  });
  const outerGeo = new THREE.LatheGeometry(profile, 160);
  outerGeo.computeVertexNormals();
  const outer = new THREE.Mesh(outerGeo, porcelain);
  outer.castShadow=outer.receiveShadow=true;
  group.add(outer);

  // interior escuro/sombreado para parecer caneca real, não bloco sólido
  const innerProfile = [
    new THREE.Vector2(1.14,H/2-0.10), new THREE.Vector2(1.12,H/2-0.34),
    new THREE.Vector2(1.05,H/2-0.78), new THREE.Vector2(.92,H/2-1.02)
  ];
  const innerMat = new THREE.MeshPhysicalMaterial({color:'#f7f7f3', roughness:.36, clearcoat:.7, side:THREE.DoubleSide});
  const inner = new THREE.Mesh(new THREE.LatheGeometry(innerProfile,160), innerMat);
  group.add(inner);

  // rim superior e pé inferior arredondados
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.385,.07,24,160), porcelain);
  rim.rotation.x=Math.PI/2; rim.position.y=H/2-0.04; group.add(rim);
  const foot = new THREE.Mesh(new THREE.TorusGeometry(1.12,.075,20,140), porcelain);
  foot.rotation.x=Math.PI/2; foot.position.y=-H/2+0.09; group.add(foot);

  // fundo interno levemente visível
  const insideBottom = new THREE.Mesh(new THREE.CircleGeometry(.86,96), innerMat);
  insideBottom.rotation.x=-Math.PI/2; insideBottom.position.y=H/2-1.05; group.add(insideBottom);

  // alça oval, com proporção de caneca 11oz
  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(1.43,1.05,-.02),
    new THREE.Vector3(2.18,.85,-.02),
    new THREE.Vector3(2.16,-.82,-.02),
    new THREE.Vector3(1.34,-1.05,-.02)
  );
  const handle = new THREE.Mesh(new THREE.TubeGeometry(curve,96,.145,22,false), porcelain);
  handle.castShadow=handle.receiveShadow=true; group.add(handle);
  const c1 = new THREE.Mesh(new THREE.SphereGeometry(.235,32,18), porcelain); c1.scale.set(1.05,.72,.8); c1.position.set(1.40,1.05,-.02); group.add(c1);
  const c2 = c1.clone(); c2.position.set(1.32,-1.05,-.02); group.add(c2);

  // decal curvo na frente
  const decal = new THREE.Mesh(makeCurvedDecalGeometry(), new THREE.MeshBasicMaterial({map:createRoundedRectTexture(), transparent:true, side:THREE.DoubleSide, depthWrite:false}));
  decal.renderOrder=5; group.add(decal); group.userData.decal = decal; group.userData.porcelain = porcelain;
  return group;
}

function makeCurvedDecalGeometry(){
  const W=1.72, YH=1.45, segX=44, segY=12, R=1.456, thetaSpan=W/R;
  const pos=[], uv=[], idx=[];
  for(let iy=0; iy<=segY; iy++){
    const v=iy/segY; const y=(v-.5)*YH+.12;
    for(let ix=0; ix<=segX; ix++){
      const u=ix/segX; const theta=(u-.5)*thetaSpan; const x=R*Math.sin(theta); const z=R*Math.cos(theta)+.012;
      pos.push(x,y,z); uv.push(u,1-v);
    }
  }
  for(let iy=0; iy<segY; iy++) for(let ix=0; ix<segX; ix++){
    const a=iy*(segX+1)+ix,b=a+1,c=a+(segX+1),d=c+1; idx.push(a,c,b,b,c,d);
  }
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
}

function initViewer(el, opts={}){
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38,1,.1,100); camera.position.set(0,0.3,opts.close?6.2:7);
  const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true}); renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; el.appendChild(renderer.domElement);
  const amb = new THREE.HemisphereLight(0xffffff,0x172034,1.3); scene.add(amb);
  const key = new THREE.DirectionalLight(0xffffff,3.4); key.position.set(4,5,5); key.castShadow=true; scene.add(key);
  const fill = new THREE.DirectionalLight(0x95eaff,1.4); fill.position.set(-4,2,3); scene.add(fill);
  const back = new THREE.PointLight(0xff3f9a,1.6,10); back.position.set(-2.8,1.8,-2.5); scene.add(back);
  const mug = makeMugMesh(); mug.scale.setScalar(opts.scale||1); scene.add(mug);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.3,96), new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.22})); shadow.rotation.x=-Math.PI/2; shadow.position.y=-2.08; scene.add(shadow);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping=true; controls.dampingFactor=.055; controls.enablePan=false; controls.minDistance=4.8; controls.maxDistance=9.5; controls.target.set(0,0,0);

  function resize(){const r=el.getBoundingClientRect(); renderer.setSize(r.width,r.height,false); camera.aspect=r.width/r.height; camera.updateProjectionMatrix();}
  window.addEventListener('resize',resize); resize();
  function animate(){requestAnimationFrame(animate); if(!controls.dragging && opts.auto){mug.rotation.y += .004;} controls.update(); renderer.render(scene,camera);} animate();
  const api={mug, update(){mug.userData.porcelain.color.set(state.color); const tex=createRoundedRectTexture(); const mat=mug.userData.decal.material; mat.map.dispose(); mat.map=tex; mat.needsUpdate=true;}};
  viewers.push(api); return api;
}

initViewer(document.getElementById('heroViewer'),{auto:true,scale:1.05});
initViewer(document.getElementById('studioViewer'),{auto:false,close:true,scale:1.12});

const updateAll=()=>viewers.forEach(v=>v.update());
document.getElementById('artInput').addEventListener('change',e=>{const f=e.target.files?.[0]; if(!f)return; const img=new Image(); img.onload=()=>{state.art=img; updateAll();}; img.src=URL.createObjectURL(f);});
for(const [id,key,parse=Number] of [['scaleRange','scale'],['xRange','x'],['yRange','y'],['rotRange','rot']]) document.getElementById(id).addEventListener('input',e=>{state[key]=parse(e.target.value); updateAll();});
document.querySelectorAll('.color').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.color').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); state.color=btn.dataset.color; updateAll();}));
