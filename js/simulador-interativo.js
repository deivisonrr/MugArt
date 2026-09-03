(() => {
  const input = document.getElementById("logoInput");
  const canvas = document.getElementById("mugCanvas");
  const ctx = canvas.getContext("2d");
  const model = document.getElementById("modelSelect");
  const scale = document.getElementById("logoScale");
  const rotation = document.getElementById("logoRotation");
  const status = document.getElementById("simStatus");
  const msg = document.getElementById("fileMessage");
  const reset = document.getElementById("resetSimulation");
  const download = document.getElementById("downloadSimulation");
  const center = document.getElementById("centerSimulation");

  const products = {
    branca: { src:"assets/caneca-branca.png", area:{x:.50,y:.525,w:.29,h:.30} },
    preta:  { src:"assets/caneca-preta.png",  area:{x:.50,y:.525,w:.29,h:.30} },
    rosa:   { src:"assets/caneca-rosa.png",   area:{x:.50,y:.525,w:.29,h:.30} },
    azul:   { src:"assets/caneca-azul.png",   area:{x:.50,y:.525,w:.29,h:.30} },
    magica: { src:"assets/caneca-magica.png", area:{x:.50,y:.525,w:.29,h:.30} }
  };

  let logo = null;
  let mug = new Image();
  let objectUrl = "";
  let dragging = false;
  let pointerOffset = {x:0,y:0};
  let logoState = {x:.5,y:.525,scale:1,rotation:0};

  function currentProduct(){ return products[model.value] || products.branca; }

  function loadMug(){
    mug = new Image();
    mug.onload = draw;
    mug.onerror = () => status.textContent = "Erro ao carregar o produto.";
    mug.src = currentProduct().src;
    status.textContent = "Carregando modelo...";
  }

  function resetState(){
    const a=currentProduct().area;
    logoState={x:a.x,y:a.y,scale:1,rotation:0};
    scale.value=100;
    rotation.value=0;
    draw();
  }

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    const bg=ctx.createLinearGradient(0,0,0,canvas.height);
    bg.addColorStop(0,"#ffffff");
    bg.addColorStop(1,"#f4f6f9");
    ctx.fillStyle=bg;
    ctx.fillRect(0,0,canvas.width,canvas.height);

    if(!mug.naturalWidth)return;

    const ratio=Math.min(canvas.width*.82/mug.naturalWidth,canvas.height*.88/mug.naturalHeight,1);
    const mw=mug.naturalWidth*ratio, mh=mug.naturalHeight*ratio;
    const mx=(canvas.width-mw)/2, my=(canvas.height-mh)/2;
    ctx.drawImage(mug,mx,my,mw,mh);

    if(logo){
      const a=currentProduct().area;
      const maxW=mw*a.w;
      const maxH=mh*a.h;
      const fit=Math.min(maxW/logo.naturalWidth,maxH/logo.naturalHeight);
      const lw=logo.naturalWidth*fit*(logoState.scale);
      const lh=logo.naturalHeight*fit*(logoState.scale);
      const lx=mx+mw*logoState.x;
      const ly=my+mh*logoState.y;

      ctx.save();
      ctx.translate(lx,ly);
      ctx.rotate(logoState.rotation*Math.PI/180);
      ctx.globalAlpha=.97;
      ctx.drawImage(logo,-lw/2,-lh/2,lw,lh);
      ctx.restore();

      // Área de impressão apenas durante a edição, bem discreta.
      if(dragging){
        ctx.save();
        ctx.strokeStyle="rgba(20,30,45,.25)";
        ctx.setLineDash([5,5]);
        ctx.strokeRect(mx+mw*(a.x-a.w/2),my+mh*(a.y-a.h/2),mw*a.w,mh*a.h);
        ctx.restore();
      }
    }
  }

  function canvasPoint(ev){
    const r=canvas.getBoundingClientRect();
    return {
      x:(ev.clientX-r.left)*(canvas.width/r.width),
      y:(ev.clientY-r.top)*(canvas.height/r.height)
    };
  }

  function startDrag(ev){
    if(!logo)return;
    ev.preventDefault();
    const p=canvasPoint(ev);
    const r=canvas.getBoundingClientRect();
    const cx=canvas.width*logoState.x;
    const cy=canvas.height*logoState.y;
    pointerOffset={x:p.x-cx,y:p.y-cy};
    dragging=true;
    canvas.setPointerCapture?.(ev.pointerId);
    draw();
  }

  function moveDrag(ev){
    if(!dragging)return;
    ev.preventDefault();
    const p=canvasPoint(ev);
    logoState.x=(p.x-pointerOffset.x)/canvas.width;
    logoState.y=(p.y-pointerOffset.y)/canvas.height;

    const a=currentProduct().area;
    logoState.x=Math.max(a.x-a.w*.42,Math.min(a.x+a.w*.42,logoState.x));
    logoState.y=Math.max(a.y-a.h*.42,Math.min(a.y+a.h*.42,logoState.y));
    draw();
  }

  function endDrag(){
    if(!dragging)return;
    dragging=false;
    status.textContent="Arte posicionada na caneca";
    draw();
  }

  input.addEventListener("change",()=>{
    const file=input.files?.[0];
    if(!file)return;
    const ext=file.name.toLowerCase().split(".").pop();
    const ok=["png","jpg","jpeg","svg"].includes(ext) &&
      ["image/png","image/jpeg","image/svg+xml"].includes(file.type);
    if(!ok){
      input.value="";
      logo=null;
      msg.textContent="Formato inválido. Use PNG, JPG/JPEG ou SVG.";
      msg.className="file-message error";
      draw();
      return;
    }
    if(file.size>10*1024*1024){
      input.value="";
      logo=null;
      msg.textContent="Arquivo muito grande. Limite de 10 MB.";
      msg.className="file-message error";
      draw();
      return;
    }
    if(objectUrl)URL.revokeObjectURL(objectUrl);
    objectUrl=URL.createObjectURL(file);
    logo=new Image();
    logo.onload=()=>{
      msg.textContent=`Arte carregada: ${file.name}`;
      msg.className="file-message success";
      resetState();
      status.textContent="Arraste sua arte sobre a caneca";
    };
    logo.src=objectUrl;
  });

  scale.addEventListener("input",()=>{
    logoState.scale=Number(scale.value)/100;
    draw();
  });

  rotation.addEventListener("input",()=>{
    logoState.rotation=Number(rotation.value);
    draw();
  });

  model.addEventListener("change",()=>{
    loadMug();
    resetState();
    status.textContent="Modelo alterado";
  });

  canvas.addEventListener("pointerdown",startDrag);
  canvas.addEventListener("pointermove",moveDrag);
  canvas.addEventListener("pointerup",endDrag);
  canvas.addEventListener("pointercancel",endDrag);
  canvas.addEventListener("pointerleave",()=>{ if(dragging) draw(); });

  center.addEventListener("click",()=>{
    const a=currentProduct().area;
    logoState.x=a.x;
    logoState.y=a.y;
    draw();
    status.textContent="Arte centralizada";
  });

  reset.addEventListener("click",()=>{
    resetState();
    status.textContent=logo ? "Simulação redefinida" : "Carregando modelo...";
  });

  download.addEventListener("click",()=>{
    if(!logo){
      status.textContent="Envie uma arte antes de salvar.";
      return;
    }
    const a=document.createElement("a");
    a.download="mugart-simulacao.png";
    a.href=canvas.toDataURL("image/png");
    a.click();
  });

  loadMug();
})();