let games=[];
let luminReady=false;
const fallbackGames=[
{name:"Neon Runner",category:"Action"},{name:"Void Drift",category:"Arcade"},{name:"Blockforge",category:"Strategy"},{name:"Night Shift",category:"Puzzle"}
];
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const settingsKey="vanta-settings";
let settings=JSON.parse(localStorage.getItem(settingsKey)||"{}");
const defaults={startup:true,skip:false,leave:true,reduce:false,anim:80};
settings={...defaults,...settings};

function save(){localStorage.setItem(settingsKey,JSON.stringify(settings))}
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2200)}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
async function card(g){
  let img=""; try{if(g.image_token) img=await Lumin.getImageUrl(g.image_token)}catch{}
  const name=escapeHtml(g.name||"Game"), cat=escapeHtml(g.category||"Game");
  const art=img?`<img src="${img}" alt="" loading="lazy">`:`<span>${escapeHtml((g.name||"GAME").slice(0,10).toUpperCase())}</span>`;
  return `<article class="game-card" data-id="${escapeHtml(g.id||g.name)}" data-name="${name.toLowerCase()}" data-cat="${cat}" tabindex="0"><div class="game-art ${img?"has-image":"art1"}">${art}</div><div class="game-info"><b>${name}</b><small>${cat}</small><br><span class="tag">${cat}</span></div></article>`;
}
async function render(list=games){
  const html=list.length?(await Promise.all(list.map(card))).join(""):'<div class="lumin-loading">No games found.</div>';
  $("#allGames").innerHTML=html;
  const featured=list.slice(0,4);
  $("#featuredGames").innerHTML=featured.length?(await Promise.all(featured.map(card))).join(""):'<div class="lumin-loading">No games available.</div>';
  $$(".game-card").forEach(c=>c.addEventListener("click",()=>playGame(c.dataset.id)));
}
async function playGame(id){
  if(!luminReady)return toast("Lumin is still loading");
  try{
    const result=await Lumin.getGameUrl(id);
    const overlay=document.createElement("div"); overlay.className="game-overlay";
    overlay.innerHTML=`<div class="game-frame-wrap"><div class="game-frame-head"><b>VANTA</b><button class="game-close">×</button></div><iframe allow="autoplay; fullscreen; pointer-lock; gamepad" allowfullscreen></iframe></div>`;
    document.body.appendChild(overlay); overlay.querySelector("iframe").src=result.url;
    overlay.querySelector(".game-close").onclick=()=>overlay.remove(); overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.remove()});
  }catch(e){console.error(e);toast("Couldn't launch that game")}
}
function bindFilters(){
  $$(".chip").forEach(c=>c.addEventListener("click",async()=>{
    $$(".chip").forEach(x=>x.classList.remove("active")); c.classList.add("active");
    if(c.dataset.filter==="All") return render(games);
    render(games.filter(g=>(g.category||"")===c.dataset.filter));
  }));
}
async function initLumin(){
  try{
    await Lumin.init({headless:true}); luminReady=true;
    const result=await Lumin.getGames({page:1,limit:40}); games=result.games||[]; await render(games);
    try{
      const cats=await Lumin.getCategories();
      if(cats.categories?.length){
        $("#chips").innerHTML='<button class="chip active" data-filter="All">All</button>'+cats.categories.slice(0,12).map(c=>`<button class="chip" data-filter="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join(""); bindFilters();
      }
    }catch{}
  }catch(e){console.error("LuminSDK:",e); games=fallbackGames; await render(games); toast("Lumin could not connect; showing demo games")}
}
function page(name){
  $$(".page").forEach(p=>p.classList.toggle("active",p.id===name));
  $$(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.page===name));
  history.replaceState(null,"","#"+name);
  document.querySelector(".sidebar")?.classList.remove("open");
  window.scrollTo({top:0,behavior:settings.reduce?"auto":"smooth"});
}
$$("[data-page]").forEach(b=>b.addEventListener("click",()=>page(b.dataset.page)));
$$("[data-page-jump]").forEach(b=>b.addEventListener("click",()=>page(b.dataset.pageJump)));
$("#mobileMenu").addEventListener("click",()=>$(".sidebar").classList.toggle("open"));

function applySettings(){
  $("#startupToggle").checked=settings.startup; $("#skipStartup").checked=settings.skip;
  $("#leaveConfirm").checked=settings.leave; $("#reduceMotion").checked=settings.reduce;
  $("#animRange").value=settings.anim;
  document.body.classList.toggle("reduce-motion",settings.reduce);
}
$("#startupToggle").onchange=e=>{settings.startup=e.target.checked;save()};
$("#skipStartup").onchange=e=>{settings.skip=e.target.checked;save()};
$("#leaveConfirm").onchange=e=>{settings.leave=e.target.checked;save();toast(e.target.checked?"Leave confirmation enabled":"Leave confirmation disabled")};
$("#reduceMotion").onchange=e=>{settings.reduce=e.target.checked;save();applySettings()};
$("#animRange").oninput=e=>{settings.anim=+e.target.value;save()};
$("#resetSettings").onclick=()=>{settings={...defaults};save();applySettings();toast("Settings reset")};

$("#globalSearch").addEventListener("input",e=>{
  const q=e.target.value.trim().toLowerCase();
  if(q){page("games"); if(luminReady){Lumin.getGames({page:1,limit:40,q}).then(r=>render(r.games||[])).catch(()=>render(games.filter(g=>(g.name+" "+(g.category||"")).toLowerCase().includes(q))))}else render(games.filter(g=>(g.name+" "+(g.category||"")).toLowerCase().includes(q)))}
  else render();
});

function normalizeUrl(v){
  v=v.trim(); if(!v)return "";
  if(!/^https?:\/\//i.test(v))v="https://"+v;
  try{return new URL(v).href}catch{return ""}
}
$("#proxyGo").onclick=()=>{
  const u=normalizeUrl($("#proxyUrl").value);
  if(!u)return toast("Enter a valid website URL");
  toast("Proxy backend not configured — opening direct preview");
  window.open(u,"_blank","noopener,noreferrer");
};
$$(".quick-grid button").forEach(b=>b.onclick=()=>{page("proxy");$("#proxyUrl").value=b.dataset.url});

window.addEventListener("beforeunload",e=>{
  if(settings.leave){e.preventDefault();e.returnValue=""}
});

function startup(){
  const el=$("#startup");
  if(!settings.startup || (settings.skip && sessionStorage.getItem("vantaSeen"))){el.remove();return}
  let p=0;const bar=$("#loaderBar"),txt=$("#loadingText");
  const words=["INITIALIZING...","LOADING LIBRARY...","STARTING VANTA...","READY"];
  const timer=setInterval(()=>{
    p+=Math.floor(Math.random()*8)+5;if(p>100)p=100;
    bar.style.width=p+"%";txt.textContent=words[p<45?0:p<75?1:p<99?2:3];
    if(p===100){clearInterval(timer);sessionStorage.setItem("vantaSeen","1");setTimeout(()=>{el.style.opacity="0";el.style.transition=".55s ease";setTimeout(()=>el.remove(),550)},280)}
  },70);
}
applySettings();startup();initLumin();
const hash=location.hash.replace("#","");
if(["home","games","proxy","settings"].includes(hash))page(hash);
