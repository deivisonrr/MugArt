import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

const state = {
  artImage: null,
  artTexture: null,
  scale: 1,
  x: 0,
  y: 0,
  rot: 0,
  accent: '#ffffff',
  roughness: 0.22,
};

const isLocalFile = location.protocol === 'file:';
const CDN_READY = !isLocalFile;

function makeLabelCanvas(text = 'Sua arte aqui') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,1024,1024);
  ctx.save();
  ctx.translate(512 + state.x * 1024, 520 - state.y * 1024);
  ctx.rotate(state.rot * Math.PI / 180);
  const boxW = 560 * state.scale; const boxH = 480 * state.scale;
  if (state.artImage) {
    const img = state.artImage;
    const ratio = Math.min(boxW / img.width, boxH / img.height);
    const w = img.width * ratio; const h = img.height * ratio;
    ctx.drawImage(img, -w/2, -h/2, w, h);
  } else {
    ctx.strokeStyle = '#168fd9'; ctx.setLineDash([18,12]); ctx.lineWidth = 8;
    ctx.strokeRect(-boxW/2, -boxH/2, boxW, boxH);
    ctx.setLineDash([]);
    ctx.fillStyle = '#111'; ctx.font = '700 74px Arial'; ctx.textAlign='center';
    ctx.fillText('Sua', 0, -50);
    ctx.fillStyle = '#ff3d72'; ctx.font = '900 100px Arial'; ctx.fillText('arte', 0, 52);
    ctx.fillStyle = '#00a7c8'; ctx.font = '800 78px Arial'; ctx.fillText('aqui', 0, 136);
  }
  ctx.restore();
  return canvas;
}

function buildStudio(canvas, opts = {}) {
  const scene = new THREE.Scene();
  scene.background = null;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true, preserveDrawingBuffer:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0.1, 1.2, 6.2);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, .55, 0);
  controls.minDistance = 3.2; controls.maxDistance = 8.5;
  controls.enablePan = false;
  if (opts.passive) { controls.enabled = false; }

  const hemi = new THREE.HemisphereLight(0xffffff, 0x4a321f, 1.8); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 4.2); key.position.set(-4,6,5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x8feeff, 2.5); rim.position.set(4,3,-4); scene.add(rim);
  const fill = new THREE.PointLight(0xffd7aa, 2.1, 7); fill.position.set(0,1.2,3); scene.add(fill);

  const group = new THREE.Group(); scene.add(group);

  const porcelain = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: state.roughness,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    transmission: 0,
  });
  const accentMat = new THREE.MeshPhysicalMaterial({color: state.accent, roughness: state.roughness, clearcoat:1, clearcoatRoughness:.08});
  const innerMat = accentMat;

  // Realistic 11oz mug: lathe profile with subtle taper and rounded lips.
  const pts = [];
  pts.push(new THREE.Vector2(0.78, 0.02));
  pts.push(new THREE.Vector2(0.86, 0.10));
  pts.push(new THREE.Vector2(0.91, 0.24));
  pts.push(new THREE.Vector2(0.95, 0.70));
  pts.push(new THREE.Vector2(0.98, 1.35));
  pts.push(new THREE.Vector2(1.02, 1.88));
  pts.push(new THREE.Vector2(1.05, 2.15));
  pts.push(new THREE.Vector2(1.12, 2.25));
  pts.push(new THREE.Vector2(1.08, 2.34));
  pts.push(new THREE.Vector2(0.96, 2.40));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 128), porcelain);
  body.castShadow = true; body.receiveShadow = true; group.add(body);

  // hollow dark/colored inside
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(.88,.78,.08,128), innerMat);
  inner.position.y = 2.36; inner.rotation.x = Math.PI; group.add(inner);
  const insideWall = new THREE.Mesh(new THREE.CylinderGeometry(.92,.78,.42,128,1,true), innerMat);
  insideWall.position.y = 2.18; group.add(insideWall);

  // Front art decal: slightly in front of cylinder, follows perspective enough for mockup.
  const labelTexture = new THREE.CanvasTexture(makeLabelCanvas());
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  const labelMat = new THREE.MeshBasicMaterial({ map: labelTexture, transparent:true, depthWrite:false });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.48,1.32,1,1), labelMat);
  label.position.set(0,1.12,1.065); label.renderOrder = 5; group.add(label);

  // Handle as thick torus elliptical curve: organic, not bucket-like.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.03,1.88,.02),
    new THREE.Vector3(1.68,1.76,.02),
    new THREE.Vector3(1.86,1.24,.02),
    new THREE.Vector3(1.76,.72,.02),
    new THREE.Vector3(1.04,.62,.02),
  ]);
  const handle = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, .14, 24, false), accentMat);
  handle.castShadow = true; group.add(handle);
  const hCap1 = new THREE.Mesh(new THREE.SphereGeometry(.18,32,16), accentMat); hCap1.position.set(1.03,1.88,.02); group.add(hCap1);
  const hCap2 = new THREE.Mesh(new THREE.SphereGeometry(.18,32,16), accentMat); hCap2.position.set(1.04,.62,.02); group.add(hCap2);

  // Table and studio background
  const tableMat = new THREE.MeshStandardMaterial({color:0x8b5a32, roughness:.45});
  const table = new THREE.Mesh(new THREE.CylinderGeometry(2.35,2.55,.16,96), tableMat);
  table.position.y = -0.08; table.receiveShadow = true; group.add(table);
  const ringMat = new THREE.MeshBasicMaterial({color:0x00c7e8});
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45,.018,8,160), ringMat);
  ring.rotation.x = Math.PI/2; ring.position.y = .015; group.add(ring);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14,8), new THREE.MeshStandardMaterial({color:0x2b1d12, roughness:.65}));
  floor.position.y = -.18; floor.rotation.x = -Math.PI/2; scene.add(floor);

  const bg = new THREE.Mesh(new THREE.PlaneGeometry(14,8), new THREE.MeshBasicMaterial({color:0xefe4d5, transparent:true, opacity:.16}));
  bg.position.set(0,2.4,-4.2); scene.add(bg);

  group.position.y = opts.hero ? -.45 : -.25;
  group.rotation.y = opts.hero ? -.35 : 0;

  function refreshLabel() {
    const c = makeLabelCanvas();
    labelTexture.image = c; labelTexture.needsUpdate = true;
  }
  function setAccent(color){
    state.accent = color; accentMat.color.set(color); innerMat.color.set(color);
  }
  function setGloss(rough){
    state.roughness = rough; porcelain.roughness = rough; accentMat.roughness = rough; innerMat.roughness = rough;
  }
  function resize(){
    const rect = canvas.getBoundingClientRect();
    renderer.setSize(rect.width || 600, rect.height || 400, false);
    camera.aspect = (rect.width || 600)/(rect.height || 400); camera.updateProjectionMatrix();
  }
  function animate(){
    requestAnimationFrame(animate);
    if (opts.hero) group.rotation.y += .004;
    controls.update();
    renderer.render(scene,camera);
  }
  window.addEventListener('resize', resize); resize(); animate();
  return { refreshLabel, setAccent, setGloss, renderer, scene, camera, controls, group };
}

const hero = buildStudio(document.getElementById('heroCanvas'), {hero:true, passive:true});
const studio = buildStudio(document.getElementById('studioCanvas'));

const upload = document.getElementById('artUpload');
upload?.addEventListener('change', (e)=>{
  const file = e.target.files?.[0];
  if(!file) return;
  const img = new Image();
  img.onload = ()=>{ state.artImage = img; hero.refreshLabel(); studio.refreshLabel(); };
  img.src = URL.createObjectURL(file);
});

['artScale','artX','artY','artRotation'].forEach(id=>{
  document.getElementById(id)?.addEventListener('input', e=>{
    if(id==='artScale') state.scale = parseFloat(e.target.value);
    if(id==='artX') state.x = parseFloat(e.target.value);
    if(id==='artY') state.y = parseFloat(e.target.value);
    if(id==='artRotation') state.rot = parseFloat(e.target.value);
    hero.refreshLabel(); studio.refreshLabel();
  });
});

document.getElementById('resetArt')?.addEventListener('click', ()=>{
  state.scale=1; state.x=0; state.y=0; state.rot=0;
  document.getElementById('artScale').value=1; document.getElementById('artX').value=0; document.getElementById('artY').value=0; document.getElementById('artRotation').value=0;
  hero.refreshLabel(); studio.refreshLabel();
});

document.querySelectorAll('.swatch').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.swatch').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    hero.setAccent(btn.dataset.color); studio.setAccent(btn.dataset.color);
  });
});

document.getElementById('glossMode')?.addEventListener('click',()=>{
  document.getElementById('glossMode').classList.add('active'); document.getElementById('matteMode').classList.remove('active');
  hero.setGloss(.22); studio.setGloss(.22);
});
document.getElementById('matteMode')?.addEventListener('click',()=>{
  document.getElementById('matteMode').classList.add('active'); document.getElementById('glossMode').classList.remove('active');
  hero.setGloss(.72); studio.setGloss(.72);
});
document.getElementById('resetView')?.addEventListener('click',()=>{
  studio.camera.position.set(.1,1.2,6.2); studio.controls.target.set(0,.55,0); studio.controls.update();
});
document.getElementById('capturePreview')?.addEventListener('click',()=>{
  const link = document.createElement('a');
  link.download = 'preview-caneca-mugart.png';
  link.href = document.getElementById('studioCanvas').toDataURL('image/png');
  link.click();
});

if (isLocalFile) {
  console.warn('Abra pelo GitHub Pages ou por um servidor local. Three.js via import module pode não funcionar em arquivo local file://.');
}
