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
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
  camera.position.set(0.15, 1.25, 5.2);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 3.2;
  controls.maxDistance = 7.0;
  controls.target.set(0,.52,0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x111827, 2.0));
  const key = new THREE.DirectionalLight(0xffffff, 4.8);
  key.position.set(3.5,5.5,4.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024,1024);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x8df4ff, 1.9);
  fill.position.set(-4,2,-2.5);
  scene.add(fill);
  const pink = new THREE.PointLight(0xff3d72, 2.0, 7);
  pink.position.set(-2.4,.4,2.7);
  scene.add(pink);

  const group = new THREE.Group();
  group.rotation.y = -0.22;
  scene.add(group);

  const mugColor = new THREE.Color(opts.color || '#ffffff');
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color:mugColor,
    roughness:.18,
    metalness:0,
    clearcoat:1,
    clearcoatRoughness:.06,
    reflectivity:.85,
    sheen:0.15
  });
  const insideMat = new THREE.MeshPhysicalMaterial({ color:mugColor, roughness:.24, clearcoat:.9, clearcoatRoughness:.08 });
  const shadowMat = new THREE.MeshStandardMaterial({ color:0x030408, roughness:.55, metalness:.15 });

  // Corpo em LatheGeometry: perfil curvo, borda fina e base menor. Parece caneca, não balde.
  const profile = [
    new THREE.Vector2(0.82, -1.03),
    new THREE.Vector2(0.98, -0.99),
    new THREE.Vector2(1.06, -0.82),
    new THREE.Vector2(1.10, -0.38),
    new THREE.Vector2(1.13, 0.18),
    new THREE.Vector2(1.16, 0.72),
    new THREE.Vector2(1.20, 0.96),
    new THREE.Vector2(1.24, 1.04)
  ];
  const bodyGeo = new THREE.LatheGeometry(profile, 160);
  bodyGeo.computeVertexNormals();
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = .58;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(.82,.96,.12,160), bodyMat);
  bottom.position.y = -0.48;
  bottom.castShadow = true;
  group.add(bottom);

  const rimOuter = new THREE.Mesh(new THREE.TorusGeometry(1.225,.043,24,160), bodyMat);
  rimOuter.rotation.x=Math.PI/2;
  rimOuter.position.y=1.63;
  rimOuter.castShadow=true;
  group.add(rimOuter);

  const rimInner = new THREE.Mesh(new THREE.TorusGeometry(.91,.026,18,140), insideMat);
  rimInner.rotation.x=Math.PI/2;
  rimInner.position.y=1.615;
  group.add(rimInner);

  const coffeeHole = new THREE.Mesh(new THREE.CylinderGeometry(.89,.84,.055,144), new THREE.MeshStandardMaterial({color:0x151820,roughness:.5}));
  coffeeHole.position.y = 1.595;
  group.add(coffeeHole);

  // Alça mais orgânica usando TubeGeometry com curva Bezier.
  class HandleCurve extends THREE.Curve {
    getPoint(t) {
      const a = new THREE.Vector3(1.12, 1.18, 0);
      const b = new THREE.Vector3(1.72, .92, 0);
      const c = new THREE.Vector3(1.72, .04, 0);
      const d = new THREE.Vector3(1.10, -.18, 0);
      return new THREE.Vector3().copy(a).multiplyScalar((1-t)**3)
        .add(new THREE.Vector3().copy(b).multiplyScalar(3*(1-t)**2*t))
        .add(new THREE.Vector3().copy(c).multiplyScalar(3*(1-t)*t*t))
        .add(new THREE.Vector3().copy(d).multiplyScalar(t**3));
    }
  }
  const handleGeo = new THREE.TubeGeometry(new HandleCurve(), 96, .105, 28, false);
  const handle = new THREE.Mesh(handleGeo, bodyMat);
  handle.castShadow=true;
  group.add(handle);

  const joinTop = new THREE.Mesh(new THREE.SphereGeometry(.16,32,16), bodyMat);
  joinTop.scale.set(1,.65,.55); joinTop.position.set(1.105,1.18,0); group.add(joinTop);
  const joinBottom = new THREE.Mesh(new THREE.SphereGeometry(.15,32,16), bodyMat);
  joinBottom.scale.set(1,.65,.55); joinBottom.position.set(1.085,-.18,0); group.add(joinBottom);

  // Brilhos sutis para aparência de porcelana.
  const shineMat = new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:.18, depthWrite:false});
  const shine = new THREE.Mesh(new THREE.PlaneGeometry(.18,1.15), shineMat);
  shine.position.set(-.62,.72,1.08);
  shine.rotation.z = -.08;
  group.add(shine);
  const shine2 = new THREE.Mesh(new THREE.PlaneGeometry(.08,.75), shineMat);
  shine2.position.set(-.42,.82,1.095);
  shine2.rotation.z = -.08;
  group.add(shine2);

  const texture = opts.logoDecal ? new THREE.TextureLoader().load(logoUrl) : makeTextTexture();
  texture.colorSpace = THREE.SRGBColorSpace;
  const decalMat = new THREE.MeshBasicMaterial({ map:texture, transparent:true, side:THREE.DoubleSide, depthWrite:false });
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.35,.86), decalMat);
  decal.position.set(0,.55,1.142);
  decal.rotation.x = THREE.MathUtils.degToRad(-2);
  group.add(decal);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.68,1.86,.18,160), shadowMat);
  base.position.y=-.77;
  base.receiveShadow=true;
  group.add(base);
  const neon1 = new THREE.Mesh(new THREE.TorusGeometry(1.68,.018,10,160), new THREE.MeshBasicMaterial({color:0xffd20a}));
  neon1.rotation.x=Math.PI/2; neon1.position.y=-.65; group.add(neon1);
  const neon2 = new THREE.Mesh(new THREE.TorusGeometry(1.83,.018,10,160), new THREE.MeshBasicMaterial({color:0x00c7e8}));
  neon2.rotation.x=Math.PI/2; neon2.position.y=-.84; group.add(neon2);
  const neon3 = new THREE.Mesh(new THREE.TorusGeometry(1.76,.014,10,160), new THREE.MeshBasicMaterial({color:0xff3d72}));
  neon3.rotation.x=Math.PI/2; neon3.position.y=-.74; group.add(neon3);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(2.15,160), new THREE.ShadowMaterial({opacity:.28}));
  floor.rotation.x=-Math.PI/2;
  floor.position.y=-.89;
  floor.receiveShadow=true;
  scene.add(floor);

  function resize(){ const r=canvas.getBoundingClientRect(); renderer.setSize(r.width,r.height,false); camera.aspect=r.width/r.height; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  let auto = opts.autoRotate ?? true;
  function animate(){ requestAnimationFrame(animate); if(auto){ group.rotation.y += .0035; } controls.update(); renderer.render(scene,camera); }
  animate();

  return {
    scene, camera, renderer, controls, group, bodyMat, insideMat, decal, decalMat, texture,
    setColor(hex){ bodyMat.color.set(hex); insideMat.color.set(hex); },
    setTexture(tex){ decalMat.map = tex; decalMat.needsUpdate = true; },
    reset(){ group.rotation.set(0,-0.22,0); camera.position.set(0.15,1.25,5.2); controls.target.set(0,.52,0); controls.update(); }
  };
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
