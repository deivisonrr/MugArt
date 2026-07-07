import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
const actions = document.querySelector('.top-actions');
menuToggle?.addEventListener('click', () => {
  nav.classList.toggle('open');
  actions.classList.toggle('open');
});

const container = document.getElementById('viewer3d');
const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 1.25, 5.2);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.2;
controls.minDistance = 3.1;
controls.maxDistance = 7;
controls.target.set(0, 0.5, 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 2.5));
const key = new THREE.DirectionalLight(0xffffff, 4);
key.position.set(4, 6, 5);
scene.add(key);
const pink = new THREE.PointLight(0xff3f78, 3, 10);
pink.position.set(-3, 2, 3);
scene.add(pink);
const blue = new THREE.PointLight(0x00d8ff, 2.5, 10);
blue.position.set(3, 2, 2);
scene.add(blue);

const mugGroup = new THREE.Group();
scene.add(mugGroup);

const mugMaterial = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.28, metalness: 0.03, clearcoat: 1, clearcoatRoughness: 0.18 });
const insideMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.5 });

const outerGeo = new THREE.CylinderGeometry(1.12, 0.94, 1.9, 96, 1, true);
const mug = new THREE.Mesh(outerGeo, mugMaterial);
mug.position.y = 0.45;
mugGroup.add(mug);

const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.94, 0.9, 0.08, 96), mugMaterial);
bottom.position.y = -0.54;
mugGroup.add(bottom);

const rim = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.045, 18, 96), mugMaterial);
rim.position.y = 1.42;
mugGroup.add(rim);

const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.94, 0.86, 1.72, 96, 1, true), insideMaterial);
inner.position.y = 0.5;
inner.scale.set(1, 1, 1);
mugGroup.add(inner);

const handle = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.105, 22, 72, Math.PI * 1.45), mugMaterial);
handle.rotation.z = Math.PI / 2;
handle.position.set(1.08, 0.48, 0);
handle.scale.set(1, 1.22, 1);
mugGroup.add(handle);

const decalCanvas = document.createElement('canvas');
decalCanvas.width = 1024;
decalCanvas.height = 1024;
const ctx = decalCanvas.getContext('2d');
const decalTexture = new THREE.CanvasTexture(decalCanvas);
decalTexture.colorSpace = THREE.SRGBColorSpace;

const decal = new THREE.Mesh(
  new THREE.PlaneGeometry(1.35, 1.05),
  new THREE.MeshBasicMaterial({ map: decalTexture, transparent: true, side: THREE.DoubleSide })
);
decal.position.set(0, 0.48, 1.02);
decal.rotation.x = 0;
mugGroup.add(decal);

const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.12, 96), new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.4 }));
floor.position.y = -0.65;
scene.add(floor);
const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.018, 12, 96), new THREE.MeshBasicMaterial({ color: 0xffd400 }));
ring1.position.y = -0.57; ring1.rotation.x = Math.PI / 2; scene.add(ring1);
const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.014, 12, 96), new THREE.MeshBasicMaterial({ color: 0x00d8ff }));
ring2.position.y = -0.49; ring2.rotation.x = Math.PI / 2; scene.add(ring2);

function drawDefaultLogo() {
  ctx.clearRect(0, 0, 1024, 1024);
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, 1024, 1024);
    const scale = Math.min(760 / img.width, 760 / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (1024 - w) / 2, (1024 - h) / 2, w, h);
    decalTexture.needsUpdate = true;
  };
  img.src = 'assets/logo.png';
}
drawDefaultLogo();

const upload = document.getElementById('artUpload');
upload?.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, 1024, 1024);
      ctx.fillStyle = 'rgba(255,255,255,0)';
      ctx.fillRect(0, 0, 1024, 1024);
      const scale = Math.min(900 / img.width, 820 / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (1024 - w) / 2, (1024 - h) / 2, w, h);
      decalTexture.needsUpdate = true;
      controls.autoRotate = false;
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

document.querySelectorAll('.color').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.color').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mugMaterial.color.set(btn.dataset.color);
  });
});

document.getElementById('resetView')?.addEventListener('click', () => {
  camera.position.set(0, 1.25, 5.2);
  controls.target.set(0, 0.5, 0);
  controls.update();
});

document.getElementById('autoRotate')?.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
});

function resize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', resize);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
