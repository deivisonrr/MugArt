
(function(){
"use strict";
const S={days:7,from:null,to:null,orders:[],products:[],items:[],revenueChart:null,statusChart:null};
const $=s=>document.querySelector(s);
const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v||0));
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const dateOnly=d=>new Date(d).toISOString().slice(0,10);
const startOfDay=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x};
const endOfDay=d=>{const x=new Date(d);x.setHours(23,59,59,999);return x};
function range(days){const to=endOfDay(new Date());const from=startOfDay(new Date());from.setDate(from.getDate()-days+1);return{from,to}}
function orderDate(o){return new Date(o.created_at||o.date||o.data_pedido||0)}
function orderTotal(o){return Number(o.total_amount??o.total??o.valor_total??o.amount??0)}
function payStatus(o){return String(o.payment_status||o.status_pagamento||o.payment?.status||o.status||"").toLowerCase()}
function orderStatus(o){return String(o.status||o.order_status||"pendente").toLowerCase()}
function isPaid(o){return ["paid","approved","pago","aprovado","payment_approved","concluido","completed"].some(x=>payStatus(o).includes(x))}
function customer(o){return o.customer_name||o.cliente_nome||o.customer?.name||o.user_email||o.email||"Cliente"}
async function safeSelect(table,select="*",builder){let q=mugartSupabase.from(table).select(select);if(builder)q=builder(q);const r=await q;return r.error?{data:[],error:r.error}:r}
async function load(){
 const r=S.from&&S.to?{from:startOfDay(S.from),to:endOfDay(S.to)}:range(S.days);
 const fromIso=r.from.toISOString(),toIso=r.to.toISOString();
 const [ordersR,productsR,itemsR]=await Promise.all([
  safeSelect("orders","*"),
  safeSelect("products","*"),
  safeSelect("order_items","*")
 ]);
 S.orders=(ordersR.data||[]).filter(o=>{const d=orderDate(o);return d>=r.from&&d<=r.to});
 S.products=productsR.data||[];
 S.items=itemsR.data||[];
 render(r);
}
function render(r){
 const paid=S.orders.filter(isPaid),revenue=paid.reduce((a,o)=>a+orderTotal(o),0);
 const today=paid.filter(o=>dateOnly(orderDate(o))===dateOnly(new Date()));
 const pending=S.orders.filter(o=>!isPaid(o)&&!["cancelado","cancelled"].includes(orderStatus(o)));
 const low=S.products.filter(p=>Number(p.stock||0)<=Number(p.min_stock??5));
 const now=Date.now();
 const promos=S.products.filter(p=>Number(p.old_price||0)>Number(p.price||0)&&(!p.offer_starts_at||new Date(p.offer_starts_at).getTime()<=now)&&(!p.offer_ends_at||new Date(p.offer_ends_at).getTime()>=now));
 $("#kpiRevenue").textContent=money(revenue);$("#kpiOrders").textContent=S.orders.length;$("#kpiTicket").textContent=money(paid.length?revenue/paid.length:0);
 $("#kpiToday").textContent=money(today.reduce((a,o)=>a+orderTotal(o),0));$("#todayOrders").textContent=`${today.length} pedido(s)`;
 $("#kpiPending").textContent=pending.length;$("#kpiLowStock").textContent=low.length;$("#kpiPromotions").textContent=promos.length;$("#kpiProducts").textContent=S.products.filter(p=>p.active).length;
 $("#sidebarPending").textContent=pending.length;$("#sidebarPending").classList.toggle("hidden",!pending.length);
 renderRevenue(r,paid);renderStatus();renderProducts();renderStock(low);renderPromotions();renderOrders();
 $("#lastUpdate").textContent=new Date().toLocaleString("pt-BR");
}
function renderRevenue(r,paid){
 const labels=[],values=[];let d=new Date(r.from);
 while(d<=r.to){const key=dateOnly(d);labels.push(d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}));values.push(paid.filter(o=>dateOnly(orderDate(o))===key).reduce((a,o)=>a+orderTotal(o),0));d.setDate(d.getDate()+1)}
 S.revenueChart?.destroy();S.revenueChart=new Chart($("#revenueChart"),{type:"line",data:{labels,datasets:[{label:"Receita",data:values,tension:.35,fill:true}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>money(v)}}}}})
}
function renderStatus(){
 const map={};S.orders.forEach(o=>{const k=orderStatus(o);map[k]=(map[k]||0)+1});
 S.statusChart?.destroy();S.statusChart=new Chart($("#statusChart"),{type:"doughnut",data:{labels:Object.keys(map),datasets:[{data:Object.values(map)}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}}}})
}
function renderProducts(){
 const productsById=Object.fromEntries(S.products.map(p=>[String(p.id),p]));const map={};
 S.items.forEach(i=>{const id=String(i.product_id||i.produto_id||"");if(!id)return;map[id]??={qty:0,revenue:0};map[id].qty+=Number(i.quantity||i.quantidade||1);map[id].revenue+=Number(i.total||i.subtotal||i.unit_price*i.quantity||0)});
 const rows=Object.entries(map).sort((a,b)=>b[1].qty-a[1].qty).slice(0,8);
 $("#bestProducts").innerHTML=rows.length?rows.map(([id,x])=>`<tr><td>${esc(productsById[id]?.name||"Produto")}</td><td>${x.qty}</td><td>${money(x.revenue)}</td></tr>`).join(""):'<tr><td colspan="3" class="dash-empty">Sem vendas no período.</td></tr>';
}
function renderStock(rows){$("#stockAlerts").innerHTML=rows.length?rows.slice(0,8).map(p=>`<div class="dash-list-item"><div><strong>${esc(p.name)}</strong><small>SKU ${esc(p.sku||"-")}</small></div><span class="dash-status">${Number(p.stock||0)} un.</span></div>`).join(""):'<div class="dash-empty">Nenhum alerta de estoque.</div>'}
function renderPromotions(){const now=Date.now();const rows=S.products.filter(p=>Number(p.old_price||0)>Number(p.price||0)).sort((a,b)=>new Date(a.offer_ends_at||"2999")-new Date(b.offer_ends_at||"2999")).slice(0,8);$("#promotionList").innerHTML=rows.length?rows.map(p=>{const start=p.offer_starts_at?new Date(p.offer_starts_at).getTime():null,end=p.offer_ends_at?new Date(p.offer_ends_at).getTime():null;const label=start&&start>now?"Agendada":end&&end<now?"Encerrada":"Ativa";return`<div class="dash-list-item"><div><strong>${esc(p.name)}</strong><small>${money(p.old_price)} → ${money(p.price)}</small></div><span class="dash-status">${label}</span></div>`}).join(""):'<div class="dash-empty">Nenhuma promoção cadastrada.</div>'}
function renderOrders(){const rows=[...S.orders].sort((a,b)=>orderDate(b)-orderDate(a)).slice(0,12);$("#latestOrders").innerHTML=rows.length?rows.map(o=>`<tr><td>#${esc(o.order_number||o.numero||String(o.id||"").slice(0,8))}</td><td>${esc(customer(o))}</td><td>${orderDate(o).toLocaleDateString("pt-BR")}</td><td>${esc(payStatus(o)||"-")}</td><td>${esc(orderStatus(o))}</td><td>${money(orderTotal(o))}</td></tr>`).join(""):'<tr><td colspan="6" class="dash-empty">Nenhum pedido no período.</td></tr>'}
function bind(){
 document.querySelectorAll(".period-btn").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".period-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");S.days=Number(b.dataset.period);S.from=S.to=null;load()}));
 $("#refreshDashboard").addEventListener("click",load);
 $("#applyCustomPeriod").addEventListener("click",()=>{if(!$("#dateStart").value||!$("#dateEnd").value)return alert("Informe as duas datas.");S.from=new Date($("#dateStart").value+"T00:00:00");S.to=new Date($("#dateEnd").value+"T23:59:59");document.querySelectorAll(".period-btn").forEach(x=>x.classList.remove("active"));load()});
}
document.addEventListener("DOMContentLoaded",async()=>{if(!window.mugartSupabase)return alert("Supabase não carregou.");bind();await load();setInterval(load,300000)});
})();
