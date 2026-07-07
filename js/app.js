import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $ = (id)=>document.getElementById(id);
const state = { color:'#ffffff', art:null, scale:1, x:0, y:0, rotation:0 };

function makeStudio(container, options={}){
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, container.clientWidth/container.clientHeight, .1, 100);
  camera.position.set(0, 1.35, 6.2);
  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, preserveDrawingBuffer:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 3.7; controls.maxDistance = 8;
  controls.target.set(0,.75,0); controls.autoRotate = !!options.autoRotate; controls.autoRotateSpeed = 1.2;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x334466, 2.1));
  const key = new THREE.DirectionalLight(0xffffff, 4.0); key.position.set(3,5,4); scene.add(key);
  const rim = new THREE.DirectionalLight(0x78e8ff, 2.0); rim.position.set(-4,3,-3); scene.add(rim);
  const fill = new THREE.PointLight(0xff60dc, 55, 9); fill.position.set(-2,2.2,2.6); scene.add(fill);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(3,96), new THREE.MeshStandardMaterial({color:0x0c0d13, roughness:.55, metalness:0}));
  floor.rotation.x = -Math.PI/2; floor.position.y = -.86; scene.add(floor);

  let mugGroup = new THREE.Group(); scene.add(mugGroup);
  let mugBodyMaterial = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(state.color), roughness:.18, metalness:0, clearcoat:1, clearcoatRoughness:.13, reflectivity:.55 });
  let decalMesh = null, decalMat = new THREE.MeshBasicMaterial({ transparent:true, opacity:0.98, side:THREE.DoubleSide });

  function createFallbackMug(){
    const group = new THREE.Group();
    const points = [];
    const H = 3.0;
    // smoother profile: base small, belly, lip
    const profile = [
      [0.72,-1.45],[0.82,-1.36],[0.92,-1.12],[1.02,-.55],[1.08,.25],[1.04,.88],[.99,1.23],[1.08,1.37],[1.1,1.45]
    ];
    profile.forEach(([r,y])=>points.push(new THREE.Vector2(r,y)));
    const bodyGeo = new THREE.LatheGeometry(points, 160);
    bodyGeo.computeVertexNormals();
    const body = new THREE.Mesh(bodyGeo, mugBodyMaterial); group.add(body);

    const inner = new THREE.Mesh(new THREE.CylinderGeometry(.93,.83,2.72,128,1,true), new THREE.MeshPhysicalMaterial({color:0xf7f7f4, roughness:.28, clearcoat:.8, side:THREE.BackSide}));
    inner.position.y = .02; group.add(inner);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(1.045,.055,18,160), mugBodyMaterial); lip.position.y=1.45; lip.rotation.x=Math.PI/2; group.add(lip);
    const base = new THREE.Mesh(new THREE.TorusGeometry(.72,.045,14,128), mugBodyMaterial); base.position.y=-1.45; base.rotation.x=Math.PI/2; group.add(base);

    const hCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.02,.95,0), new THREE.Vector3(1.82,.72,0), new THREE.Vector3(1.95,.02,0), new THREE.Vector3(1.78,-.65,0), new THREE.Vector3(1.02,-.85,0)
    ]);
    const handleOuter = new THREE.Mesh(new THREE.TubeGeometry(hCurve,96,.145,26,false), mugBodyMaterial); group.add(handleOuter);
    const handleInnerMat = new THREE.MeshPhysicalMaterial({color:0xffffff, roughness:.22, clearcoat:1});
    const hCurve2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.015,.78,.002), new THREE.Vector3(1.55,.54,.002), new THREE.Vector3(1.62,.02,.002), new THREE.Vector3(1.52,-.48,.002), new THREE.Vector3(1.015,-.66,.002)
    ]);
    const handleInner = new THREE.Mesh(new THREE.TubeGeometry(hCurve2,96,.06,18,false), handleInnerMat); group.add(handleInner);

    // decal curved printable area on front
    const rows=18, cols=36, radius=1.103, yMin=-.7, yMax=.75, thetaMin=-.64, thetaMax=.64;
    const verts=[], uvs=[], idx=[];
    for(let r=0;r<=rows;r++){
      const v=r/rows; const y=yMin+(yMax-yMin)*v;
      for(let c=0;c<=cols;c++){
        const u=c/cols; const th=thetaMin+(thetaMax-thetaMin)*u;
        verts.push(Math.sin(th)*radius, y, Math.cos(th)*radius);
        uvs.push(u, 1-v);
      }
    }
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const a=r*(cols+1)+c, b=a+1, d=(r+1)*(cols+1)+c, e=d+1; idx.push(a,d,b,b,d,e);
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.Float32BufferAttribute(verts,3));
    dg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs,2)); dg.setIndex(idx); dg.computeVertexNormals();
    decalMesh = new THREE.Mesh(dg, decalMat); group.add(decalMesh);
    group.rotation.y = -.45;
    return group;
  }

  function makeCanvasTexture(){
    const canvas=document.createElement('canvas'); canvas.width=1024; canvas.height=1024;
    const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,1024,1024);
    if(state.art){
      ctx.save(); ctx.translate(512 + state.x*260, 512 - state.y*260); ctx.rotate(state.rotation*Math.PI/180);
      const s=state.scale; const ratio=state.art.width/state.art.height;
      let w=560*s, h=w/ratio; if(h>760*s){h=760*s; w=h*ratio}
      ctx.drawImage(state.art, -w/2, -h/2, w, h); ctx.restore();
    }else{
      ctx.save(); ctx.fillStyle='rgba(255,255,255,0.0)'; ctx.fillRect(0,0,1024,1024);
      ctx.fillStyle='#111827'; ctx.font='900 80px Arial'; ctx.textAlign='center'; ctx.fillText('MugArt',512,500);
      ctx.font='500 34px Arial'; ctx.fillText('sua arte aqui',512,560); ctx.restore();
    }
    const tex=new THREE.CanvasTexture(canvas); tex.colorSpace=THREE.SRGBColorSpace; tex.needsUpdate=true; return tex;
  }
  function updateDecal(){ if(decalMesh){ decalMat.map = makeCanvasTexture(); decalMat.needsUpdate=true; } }
  function updateColor(hex){ mugBodyMaterial.color.set(hex); }

  const status = $('modelStatus');
  async function loadProfessionalModel(){
    // Para usar um modelo 3D profissional, coloque o arquivo aqui: assets/models/mug.glb
    return new Promise((resolve,reject)=>{
      const loader = new GLTFLoader();
      loader.load('assets/models/mug.glb', (gltf)=>{
        const obj = gltf.scene;
        obj.traverse(child=>{ if(child.isMesh){ child.castShadow=true; child.receiveShadow=true; if(child.material){ child.material.roughness=.22; child.material.needsUpdate=true; } } });
        obj.scale.setScalar(2.35); obj.position.y=-.25; obj.rotation.y=-.35;
        resolve(obj);
      }, undefined, reject);
    });
  }

  loadProfessionalModel().then(obj=>{
    mugGroup.clear(); mugGroup.add(obj);
    if(status) status.textContent='Modelo profissional mug.glb carregado.';
  }).catch(()=>{
    mugGroup.clear(); mugGroup.add(createFallbackMug()); updateDecal();
    if(status) status.textContent='Modelo profissional não encontrado: usando caneca 3D própria. Para qualidade máxima, adicione assets/models/mug.glb.';
  });

  function resize(){ camera.aspect=container.clientWidth/container.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth, container.clientHeight); }
  window.addEventListener('resize', resize);
  function animate(){ requestAnimationFrame(animate); controls.update(); renderer.render(scene,camera); }
  animate();
  return { updateColor, updateDecal, setArt(img){state.art=img; updateDecal();}, renderer, scene, camera };
}

const studio = makeStudio($('viewer3d'));
makeStudio($('heroScene'), { autoRotate:true });

$('mugColor')?.addEventListener('input', e=>{ state.color=e.target.value; studio.updateColor(state.color); });
['artScale','artX','artY','artRotation'].forEach(id=>$(id)?.addEventListener('input', e=>{ const key={artScale:'scale',artX:'x',artY:'y',artRotation:'rotation'}[id]; state[key]=parseFloat(e.target.value); studio.updateDecal(); }));
$('artUpload')?.addEventListener('change', e=>{
  const file=e.target.files?.[0]; if(!file) return;
  const url=URL.createObjectURL(file); const img=new Image(); img.onload=()=>{studio.setArt(img); URL.revokeObjectURL(url);}; img.src=url;
  const msg=encodeURIComponent('Olá, quero um orçamento de caneca personalizada pela MugArt. Já testei minha arte no mockup 3D do site.');
  $('whatsBtn').href=`https://wa.me/5511988849236?text=${msg}`;
});
$('resetBtn')?.addEventListener('click',()=>{
  state.scale=1; state.x=0; state.y=0; state.rotation=0; state.color='#ffffff';
  $('artScale').value=1; $('artX').value=0; $('artY').value=0; $('artRotation').value=0; $('mugColor').value='#ffffff';
  studio.updateColor(state.color); studio.updateDecal();
});
