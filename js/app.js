import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const logoUrl = './assets/logo.png';
const whatsapp = '5511988849236';

function makeTextTexture(text = 'Sua arte aqui') {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 640;
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  ctx.fillStyle = 'rgba(255,255,255,0.0)'; ctx.fillRect(0,0,c.width,c.height);
  ctx.strokeStyle = '#00a9cf'; ctx.setLineDash([18,12]); ctx.lineWidth = 6; ctx.strokeRect(70,70,884,500);
  ctx.font = '900 92px Inter, Arial'; ctx.textAlign = 'center';
  ctx.fillStyle = '#111'; ctx.fillText('Sua arte',512,290);
  ctx.fillStyle = '#ff3d72'; ctx.fillText('aqui',512,400);
  ctx.font = '42px Inter, Arial'; ctx.fillStyle = '#ffd20a'; ctx.fillText('♥',260,430);
  ctx.fillStyle = '#00c7e8'; ctx.fillText('✦',750,180);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true; return tex;
}

function createMugScene(canvas, opts = {}) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 100); camera.position.set(0,1.2,5.6);
  const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 3.2; controls.maxDistance = 7.5; controls.target.set(0,.45,0);
  scene.add(new THREE.AmbientLight(0xffffff, 1.9));
  const key = new THREE.DirectionalLight(0xffffff, 4.2); key.position.set(3,5,4); scene.add(key);
  const rim = new THREE.DirectionalLight(0x00c7e8, 2.4); rim.position.set(-4,2,-3); scene.add(rim);
  const pink = new THREE.PointLight(0xff3d72, 2.2, 7); pink.position.set(-2,-.2,2.8); scene.add(pink);

  const group = new THREE.Group(); scene.add(group);
  const mugColor = new THREE.Color(opts.color || '#ffffff');
  const bodyMat = new THREE.MeshPhysicalMaterial({ color:mugColor, roughness:.28, metalness:0, clearcoat:1, clearcoatRoughness:.08, transmission:0, ior:1.55 });
  const insideMat = new THREE.MeshPhysicalMaterial({ color:mugColor, roughness:.34, clearcoat:.85 });
  const darkMat = new THREE.MeshStandardMaterial({ color:0x0a0b10, roughness:.48 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.18,1.03,2.05,96,1,true), bodyMat); body.position.y=.55; group.add(body);
  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(1.03,1.0,.08,96), bodyMat); bottom.position.y=-.5; group.add(bottom);
  const rimTop = new THREE.Mesh(new THREE.TorusGeometry(1.18,.045,20,128), bodyMat); rimTop.rotation.x=Math.PI/2; rimTop.position.y=1.585; group.add(rimTop);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(.95,.87,.11,96), insideMat); inner.position.y=1.55; group.add(inner);
  const innerDark = new THREE.Mesh(new THREE.CylinderGeometry(.86,.82,.035,96), darkMat); innerDark.position.y=1.615; group.add(innerDark);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.62,.105,24,80), bodyMat); handle.scale.set(.70,1.18,.23); handle.rotation.y=Math.PI/2; handle.position.set(1.19,.55,0); group.add(handle);
  const handleCut = new THREE.Mesh(new THREE.TorusGeometry(.38,.035,16,64), new THREE.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:.04})); handleCut.scale.set(.74,1.2,.18); handleCut.rotation.y=Math.PI/2; handleCut.position.set(1.205,.55,0); group.add(handleCut);

  const texture = opts.logoDecal ? new THREE.TextureLoader().load(logoUrl) : makeTextTexture();
  texture.colorSpace = THREE.SRGBColorSpace;
  const decalMat = new THREE.MeshBasicMaterial({ map:texture, transparent:true, side:THREE.DoubleSide });
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.45,.9), decalMat); decal.position.set(0,.58,1.071); group.add(decal);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.75,1.9,.18,128), new THREE.MeshStandardMaterial({color:0x050509,roughness:.35,metalness:.25})); base.position.y=-.75; group.add(base);
  const neon1 = new THREE.Mesh(new THREE.TorusGeometry(1.72,.018,10,120), new THREE.MeshBasicMaterial({color:0xffd20a})); neon1.rotation.x=Math.PI/2; neon1.position.y=-.63; group.add(neon1);
  const neon2 = new THREE.Mesh(new THREE.TorusGeometry(1.82,.018,10,120), new THREE.MeshBasicMaterial({color:0x00c7e8})); neon2.rotation.x=Math.PI/2; neon2.position.y=-.83; group.add(neon2);

  function resize(){ const r=canvas.getBoundingClientRect(); renderer.setSize(r.width,r.height,false); camera.aspect=r.width/r.height; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  let auto = opts.autoRotate ?? true;
  function animate(){ requestAnimationFrame(animate); if(auto && !controls.userData?.dragging){ group.rotation.y += .004; } controls.update(); renderer.render(scene,camera); }
  animate();

  return { scene, camera, renderer, controls, group, bodyMat, insideMat, decal, decalMat, texture, setColor(hex){ bodyMat.color.set(hex); insideMat.color.set(hex); }, setTexture(tex){ decalMat.map = tex; decalMat.needsUpdate = true; }, reset(){ group.rotation.set(0,0,0); camera.position.set(0,1.2,5.6); controls.target.set(0,.45,0); } };
}

const heroCanvas = document.querySelector('#hero3d');
const studioCanvas = document.querySelector('#studio3d');
const hero = createMugScene(heroCanvas, { logoDecal:true, autoRotate:true });
const studio = createMugScene(studioCanvas, { autoRotate:false });

const artUpload = document.querySelector('#artUpload');
const scaleControl = document.querySelector('#scaleControl');
const xControl = document.querySelector('#xControl');
const yControl = document.querySelector('#yControl');
const rotControl = document.querySelector('#rotControl');
const resetBtn = document.querySelector('#resetBtn');
const whatsBtn = document.querySelector('#whatsBtn');

function updateWhats(){
  const msg = encodeURIComponent('Olá, quero fazer um orçamento de caneca personalizada. Já montei uma prévia no site da MugArt.');
  whatsBtn.href = `https://wa.me/${whatsapp}?text=${msg}`;
}
updateWhats();

function applyDecalControls(){
  studio.decal.scale.set(Number(scaleControl.value), Number(scaleControl.value), 1);
  studio.decal.position.x = Number(xControl.value) * .38;
  studio.decal.position.y = .58 + Number(yControl.value) * .38;
  studio.decal.rotation.z = THREE.MathUtils.degToRad(Number(rotControl.value));
}
[scaleControl,xControl,yControl,rotControl].forEach(el=>el.addEventListener('input',applyDecalControls));

artUpload.addEventListener('change', (e)=>{
  const file = e.target.files?.[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width=1024; c.height=640;
      const ctx = c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height);
      const ratio = Math.min(820/img.width, 470/img.height);
      const w=img.width*ratio, h=img.height*ratio;
      ctx.drawImage(img,(c.width-w)/2,(c.height-h)/2,w,h);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      studio.setTexture(tex); updateWhats();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

document.querySelectorAll('.swatches button').forEach(btn=>{
  btn.style.background = btn.dataset.color;
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.swatches button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    studio.setColor(btn.dataset.color);
    hero.setColor(btn.dataset.color);
  });
});
resetBtn.addEventListener('click',()=>{ studio.reset(); scaleControl.value=1; xControl.value=0; yControl.value=0; rotControl.value=0; applyDecalControls(); studio.setTexture(makeTextTexture()); });

// fallback notice if CDN fails won't run, but page remains visible.
