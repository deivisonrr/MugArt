import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const year = document.getElementById('year');
year.textContent = new Date().getFullYear();

const menuToggle = document.getElementById('menuToggle');
const menu = document.getElementById('menu');
menuToggle.addEventListener('click', () => menu.classList.toggle('active'));
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => menu.classList.remove('active')));

const canvas = document.getElementById('mugCanvas');
const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 1.8, 5.2);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 3.5;
controls.maxDistance = 7;
controls.target.set(0, 0.7, 0);

const ambient = new THREE.AmbientLight(0xffffff, 1.7);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
keyLight.position.set(4, 5, 5);
scene.add(keyLight);

const backLight = new THREE.DirectionalLight(0x88ccff, 1.2);
backLight.position.set(-4, 2, -5);
scene.add(backLight);

function createDefaultTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);

  const grad = ctx.createLinearGradient(260, 100, 760, 420);
  grad.addColorStop(0, '#ff4fa3');
  grad.addColorStop(0.5, '#7c4dff');
  grad.addColorStop(1, '#20d6ff');

  ctx.fillStyle = grad;
  ctx.roundRect(292, 118, 440, 250, 42);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 82px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('MugArt', 512, 250);

  ctx.font = '28px Arial';
  ctx.fillText('Canecas personalizadas', 512, 304);

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

let mugTexture = createDefaultTexture();

const bodyGeometry = new THREE.CylinderGeometry(1.15, 0.95, 2.45, 96, 1, true);
const bodyMaterial = new THREE.MeshStandardMaterial({
  map: mugTexture,
  roughness: 0.38,
  metalness: 0.03,
  side: THREE.DoubleSide
});
const mugBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
mugBody.position.y = 0.8;
scene.add(mugBody);

const insideGeometry = new THREE.CylinderGeometry(1.05, 0.95, 2.38, 96, 1, true);
const insideMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f6fb, roughness: 0.52, side: THREE.BackSide });
const mugInside = new THREE.Mesh(insideGeometry, insideMaterial);
mugInside.position.y = 0.8;
scene.add(mugInside);

const rimGeometry = new THREE.TorusGeometry(1.15, 0.055, 16, 96);
const rimMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
const rim = new THREE.Mesh(rimGeometry, rimMaterial);
rim.rotation.x = Math.PI / 2;
rim.position.y = 2.025;
scene.add(rim);

const bottomGeometry = new THREE.CircleGeometry(0.95, 96);
const bottomMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
const bottom = new THREE.Mesh(bottomGeometry, bottomMaterial);
bottom.rotation.x = -Math.PI / 2;
bottom.position.y = -0.425;
scene.add(bottom);

const handleCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(1.08, 1.55, 0),
  new THREE.Vector3(1.95, 1.45, 0),
  new THREE.Vector3(1.95, 0.55, 0),
  new THREE.Vector3(1.08, 0.45, 0),
]);
const handleGeometry = new THREE.TubeGeometry(handleCurve, 64, 0.12, 18, false);
const handleMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32 });
const handle = new THREE.Mesh(handleGeometry, handleMaterial);
scene.add(handle);

const group = new THREE.Group();
group.add(mugBody, mugInside, rim, bottom, handle);
scene.add(group);

function resizeRenderer() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const width = rect.width;
  const height = 460;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resizeRenderer);
resizeRenderer();

function animate() {
  requestAnimationFrame(animate);
  group.rotation.y += 0.003;
  controls.update();
  renderer.render(scene, camera);
}
animate();

const artUpload = document.getElementById('artUpload');
const resetArt = document.getElementById('resetArt');

function applyImageTexture(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 512;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);

      const maxW = 560;
      const maxH = 330;
      const scale = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (c.width - w) / 2;
      const y = (c.height - h) / 2;

      ctx.drawImage(img, x, y, w, h);
      const texture = new THREE.CanvasTexture(c);
      texture.colorSpace = THREE.SRGBColorSpace;
      bodyMaterial.map = texture;
      bodyMaterial.needsUpdate = true;
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

artUpload.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (file) applyImageTexture(file);
});

resetArt.addEventListener('click', () => {
  mugTexture = createDefaultTexture();
  bodyMaterial.map = mugTexture;
  bodyMaterial.needsUpdate = true;
  artUpload.value = '';
});
