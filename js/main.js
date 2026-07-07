import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const logoUrl = 'assets/logo.png';

const menuBtn = document.getElementById('menuBtn');
const nav = document.querySelector('.nav');
menuBtn?.addEventListener('click', () => nav.classList.toggle('open'));
nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('show');
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

function createLabelTexture(src = logoUrl, cb){
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,1024,1024);
    const maxW = 760;
    const ratio = img.width / img.height;
    const w = maxW;
    const h = w / ratio;
    ctx.drawImage(img, (1024-w)/2, (1024-h)/2, w, h);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    cb(texture);
  };
  img.src = src;
}

function makeMugScene(canvas, options = {}){
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
  camera.position.set(0, 1.1, 6.2);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 3.7;
  controls.maxDistance = 8.2;
  controls.enablePan = false;
  controls.target.set(0, .65, 0);

  scene.add(new THREE.AmbientLight(0xffffff, .86));
  const key = new THREE.DirectionalLight(0xffffff, 3.0); key.position.set(4, 6, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0x16c7e9, 1.3); fill.position.set(-4, 2, 3); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xff4f86, 1.3); rim.position.set(3, 1.5, -3); scene.add(rim);

  const group = new THREE.Group(); scene.add(group);
  const mugMaterial = new THREE.MeshPhysicalMaterial({ color: options.color || 0xffffff, roughness:.24, metalness:0, clearcoat:1, clearcoatRoughness:.12, reflectivity:.55 });
  const insideMaterial = new THREE.MeshPhysicalMaterial({ color: 0xf9fbff, roughness:.22, clearcoat:.9 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.12, 2.35, 96, 1, true), mugMaterial);
  body.position.y = .66; group.add(body);

  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.05, .08, 96), mugMaterial);
  bottom.position.y = -.54; group.add(bottom);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.28, .055, 18, 112), insideMaterial);
  rim.rotation.x = Math.PI / 2; rim.position.y = 1.84; group.add(rim);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.02, .18, 96, 1, true), insideMaterial);
  inner.position.y = 1.75; group.add(inner);

  const handle = new THREE.Group();
  const h1 = new THREE.Mesh(new THREE.TorusGeometry(.58, .095, 22, 72, Math.PI * 1.55), mugMaterial);
  h1.rotation.set(0, Math.PI / 2, Math.PI * .02);
  h1.position.set(1.23, .68, 0); handle.add(h1);
  const capTop = new THREE.Mesh(new THREE.SphereGeometry(.13, 28, 16), mugMaterial); capTop.position.set(1.25, 1.27, 0); handle.add(capTop);
  const capBot = new THREE.Mesh(new THREE.SphereGeometry(.13, 28, 16), mugMaterial); capBot.position.set(1.25, .06, 0); handle.add(capBot);
  group.add(handle);

  const decalGeo = new THREE.PlaneGeometry(1.42, 1.12, 1, 1);
  let decalMat = new THREE.MeshBasicMaterial({ transparent:false, color:0xffffff });
  const decal = new THREE.Mesh(decalGeo, decalMat);
  decal.position.set(0, .68, 1.135);
  decal.rotation.x = -0.02;
  group.add(decal);
  createLabelTexture(logoUrl, texture => { decal.material.map = texture; decal.material.needsUpdate = true; });

  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.95, .14, 128), new THREE.MeshPhysicalMaterial({ color:0x08090d, roughness:.35, metalness:.25, clearcoat:.6 }));
  saucer.position.y = -.68; scene.add(saucer);
  const cyanRing = new THREE.Mesh(new THREE.TorusGeometry(1.9, .018, 8, 128), new THREE.MeshBasicMaterial({ color:0x16c7e9 }));
  cyanRing.rotation.x = Math.PI/2; cyanRing.position.y = -.57; scene.add(cyanRing);
  const pinkRing = new THREE.Mesh(new THREE.TorusGeometry(1.72, .014, 8, 128), new THREE.MeshBasicMaterial({ color:0xff4f86 }));
  pinkRing.rotation.x = Math.PI/2; pinkRing.position.y = -.47; scene.add(pinkRing);
  const yellowRing = new THREE.Mesh(new THREE.TorusGeometry(1.55, .014, 8, 128), new THREE.MeshBasicMaterial({ color:0xffd21f }));
  yellowRing.rotation.x = Math.PI/2; yellowRing.position.y = -.38; scene.add(yellowRing);

  function resize(){
    const rect = canvas.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / Math.max(1, rect.height);
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas);
  resize();

  function setColor(hex){ mugMaterial.color.set(hex); }
  function setImage(file){
    const reader = new FileReader();
    reader.onload = e => createLabelTexture(e.target.result, texture => { decal.material.map = texture; decal.material.needsUpdate = true; });
    reader.readAsDataURL(file);
  }
  function reset(){
    camera.position.set(0, 1.1, 6.2); controls.target.set(0,.65,0); controls.update(); group.rotation.set(0,0,0);
  }
  function animate(){
    requestAnimationFrame(animate);
    controls.update();
    if (options.autoRotate && !prefersReduced) group.rotation.y += .006;
    cyanRing.rotation.z += .006; pinkRing.rotation.z -= .004; yellowRing.rotation.z += .003;
    renderer.render(scene, camera);
  }
  animate();
  return { setColor, setImage, reset };
}

const heroCanvas = document.getElementById('heroMug');
if (heroCanvas) makeMugScene(heroCanvas, { autoRotate:true });

const viewerCanvas = document.getElementById('mug3d');
let viewer;
if (viewerCanvas) viewer = makeMugScene(viewerCanvas, { autoRotate:false });

document.getElementById('artUpload')?.addEventListener('change', e => {
  const file = e.target.files?.[0];
  if (!file || !viewer) return;
  viewer.setImage(file);
  const text = encodeURIComponent('Olá! Quero fazer um orçamento de caneca personalizada. Já escolhi uma arte e quero enviar para vocês.');
  document.getElementById('budgetBtn').href = `https://wa.me/5511988849236?text=${text}`;
});
document.getElementById('resetView')?.addEventListener('click', () => viewer?.reset());
document.querySelectorAll('.color-dot').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.color-dot').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    viewer?.setColor(btn.dataset.color);
  });
});
