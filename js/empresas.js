(() => {
const input=document.getElementById('logoInput'), msg=document.getElementById('fileMessage');
const status=document.getElementById('status'), model=document.getElementById('modelSelect');
const qty=document.getElementById('quantitySelect'), btn=document.getElementById('generateBtn');
const logos=[...document.querySelectorAll('.logo')]; let url='';
const allowed=['image/png','image/jpeg','image/svg+xml'], exts=['png','jpg','jpeg','svg'];
function valid(f){const e=f.name.toLowerCase().split('.').pop();return allowed.includes(f.type)||exts.includes(e)}
input.addEventListener('change',()=>{const f=input.files[0];if(!f)return;
 if(!valid(f)){input.value='';url='';msg.textContent='Formato inválido. Use somente PNG, JPG/JPEG ou SVG.';msg.style.color='#f88';return}
 if(f.size>10*1024*1024){input.value='';url='';msg.textContent='Arquivo muito grande. Limite de 10 MB.';msg.style.color='#f88';return}
 if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(f);logos.forEach(x=>x.src=url);
 msg.textContent='Arquivo: '+f.name;msg.style.color='#999';status.textContent='Prévia atualizada';
});
btn.addEventListener('click',()=>{if(!url){msg.textContent='Envie uma logo em PNG, JPG/JPEG ou SVG.';msg.style.color='#f5c400';return}
 status.textContent='Simulação • '+model.value+' • '+qty.value;btn.textContent='Simulação gerada ✓';
 setTimeout(()=>btn.textContent='Gerar simulação',1600);
});
document.getElementById('quoteForm').addEventListener('submit',e=>{e.preventDefault();
const v=id=>document.getElementById(id).value.trim();
const text=`Olá! Quero um orçamento corporativo da MugArt.%0A%0AEmpresa: ${v('company')}%0ANome: ${v('name')}%0AE-mail: ${v('email')||'Não informado'}%0AWhatsApp: ${v('phone')}%0AModelo: ${model.options[model.selectedIndex].text}%0AQuantidade: ${qty.value}%0ADetalhes: ${v('details')||'Não informado'}`;
window.open('https://wa.me/5511988849236?text='+text,'_blank','noopener');
});
})();