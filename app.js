let games=[];
let luminReady=false;
const fallbackGames=[
{name:"Neon Runner",category:"Action"},{name:"Void Drift",category:"Arcade"},{name:"Blockforge",category:"Strategy"},{name:"Night Shift",category:"Puzzle"}
];
const PAGE_SIZE=40;
let currentPage=1;
let currentFilter="All";
let currentQuery="";
let hasNextPage=false;
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const settingsKey="vanta-settings";
let settings=JSON.parse(localStorage.getItem(settingsKey)||"{}");
const defaults={startup:true,skip:false,leave:true,reduce:false,anim:80,wisp:""};
settings={...defaults,...settings};

function save(){localStorage.setItem(settingsKey,JSON.stringify(settings))}
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2200)}
window.VANTA_TOAST=toast;
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
async function card(g){
  let img=""; try{if(g.image_token) img=await Lumin.getImageUrl(g.image_token)}catch{}
  const name=escapeHtml(g.name||"Game"), cat=escapeHtml(g.category||"Game");
  const art=img?`<img src="${img}" alt="" loading="lazy">`:`<span>${escapeHtml((g.name||"GAME").slice(0,10).toUpperCase())}</span>`;
  return `<article class="game-card" data-id="${escapeHtml(g.id||g.name)}" data-name="${name.toLowerCase()}" data-cat="${cat}" tabindex="0">
    <div class="game-art ${img?"has-image":"art1"}">${art}
      <button class="card-fs-btn" title="Fullscreen" data-id="${escapeHtml(g.id||g.name)}">⛶</button>
    </div>
    <div class="game-info"><b>${name}</b><small>${cat}</small><br><span class="tag">${cat}</span></div>
  </article>`;
}
function renderPager(){
  const wrap=$("#gamesPager");
  if(!wrap)return;
  if(currentQuery){wrap.innerHTML="";return}
  wrap.innerHTML=`<button class="outline-btn" id="pagePrev" ${currentPage<=1?"disabled":""}>← PREV</button><span class="page-num">PAGE ${currentPage}</span><button class="outline-btn" id="pageNext" ${hasNextPage?"":"disabled"}>NEXT →</button>`;
  $("#pagePrev")?.addEventListener("click",()=>gotoPage(currentPage-1));
  $("#pageNext")?.addEventListener("click",()=>gotoPage(currentPage+1));
}
async function gotoPage(p){
  if(p<1)return;
  currentPage=p;
  await loadGames();
  window.scrollTo({top:0,behavior:settings.reduce?"auto":"smooth"});
}
async function render(list=games){
  const filtered=currentFilter==="All"?list:list.filter(g=>(g.category||"")===currentFilter);
  const html=filtered.length?(await Promise.all(filtered.map(card))).join(""):'<div class="lumin-loading">No games found.</div>';
  $("#allGames").innerHTML=html;
  const featured=list.slice(0,4);
  $("#featuredGames").innerHTML=featured.length?(await Promise.all(featured.map(card))).join(""):'<div class="lumin-loading">No games available.</div>';
  $$(".game-card").forEach(c=>c.addEventListener("click",e=>{if(e.target.closest(".card-fs-btn"))return; playGame(c.dataset.id)}));
  $$(".card-fs-btn").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();playGame(b.dataset.id,{fullscreen:true})}));
  renderPager();
}
async function loadGames(){
  if(!luminReady)return;
  $("#allGames").innerHTML='<div class="lumin-loading">Loading Lumin games...</div>';
  try{
    const opts={page:currentPage,limit:PAGE_SIZE};
    if(currentQuery)opts.q=currentQuery;
    const result=await Lumin.getGames(opts);
    games=result.games||[];
    hasNextPage=typeof result.hasMore==="boolean"?result.hasMore:(typeof result.totalPages==="number"?currentPage<result.totalPages:games.length>=PAGE_SIZE);
    await render(games);
  }catch(e){console.error("LuminSDK:",e); games=fallbackGames; hasNextPage=false; await render(games); toast("Lumin could not connect; showing demo games")}
}
async function playGame(id,opts={}){
  if(!luminReady)return toast("Lumin is still loading");
  try{
    const result=await Lumin.getGameUrl(id);
    if(opts.blank)return openBlankWindow(result.url);
    const overlay=document.createElement("div"); overlay.className="game-overlay";
    overlay.innerHTML=`<div class="game-frame-wrap"><div class="game-frame-head"><b>VANTA</b><div class="frame-actions"><button class="frame-btn" id="gameFsBtn" title="Fullscreen">⛶</button><button class="frame-btn" id="gameBlankBtn" title="Open in blank tab">⧉</button><button class="game-close">×</button></div></div><iframe allow="autoplay; fullscreen; pointer-lock; gamepad" allowfullscreen></iframe></div>`;
    document.body.appendChild(overlay);
    const wrap=overlay.querySelector(".game-frame-wrap"), frame=overlay.querySelector("iframe");
    frame.src=result.url;
    overlay.querySelector(".game-close").onclick=()=>overlay.remove();
    overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.remove()});
    overlay.querySelector("#gameFsBtn").onclick=()=>toggleFullscreen(wrap);
    overlay.querySelector("#gameBlankBtn").onclick=()=>{openBlankWindow(result.url);overlay.remove()};
    if(opts.fullscreen)setTimeout(()=>toggleFullscreen(wrap),120);
  }catch(e){console.error(e);toast("Couldn't launch that game")}
}
function toggleFullscreen(el){
  if(document.fullscreenElement)return document.exitFullscreen();
  (el.requestFullscreen||el.webkitRequestFullscreen)?.call(el);
}
function openBlankWindow(url){
  const w=window.open("about:blank","_blank");
  if(!w)return toast("Allow popups to open a blank fullscreen tab");
  w.document.write(`<!DOCTYPE html><html><head><title>VANTA</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#000}iframe{position:fixed;inset:0;width:100%;height:100%;border:0}</style></head><body><iframe src="${url}" allow="autoplay; fullscreen; pointer-lock; gamepad" allowfullscreen></iframe><script>document.querySelector("iframe").addEventListener("load",()=>{try{document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen()}catch(e){}});<\/script></body></html>`);
  w.document.close();
}
function bindFilters(){
  $$(".chip").forEach(c=>c.addEventListener("click",()=>{
    $$(".chip").forEach(x=>x.classList.remove("active")); c.classList.add("active");
    currentFilter=c.dataset.filter; render(games);
  }));
}
async function initLumin(){
  try{
    await Lumin.init({headless:true}); luminReady=true;
    await loadGames();
    try{
      const cats=await Lumin.getCategories();
      if(cats.categories?.length){
        $("#chips").innerHTML='<button class="chip active" data-filter="All">All</button>'+cats.categories.slice(0,12).map(c=>`<button class="chip" data-filter="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join(""); bindFilters();
      }
    }catch{}
  }catch(e){console.error("LuminSDK:",e); games=fallbackGames; hasNextPage=false; await render(games); toast("Lumin could not connect; showing demo games")}
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
  $("#wispUrl").value=settings.wisp||"";
  document.body.classList.toggle("reduce-motion",settings.reduce);
}
$("#startupToggle").onchange=e=>{settings.startup=e.target.checked;save()};
$("#skipStartup").onchange=e=>{settings.skip=e.target.checked;save()};
$("#leaveConfirm").onchange=e=>{settings.leave=e.target.checked;save();toast(e.target.checked?"Leave confirmation enabled":"Leave confirmation disabled")};
$("#reduceMotion").onchange=e=>{settings.reduce=e.target.checked;save();applySettings()};
$("#animRange").oninput=e=>{settings.anim=+e.target.value;save()};
$("#wispUrl").onchange=e=>{settings.wisp=e.target.value.trim();save()};
$("#wispApply").onclick=()=>{
  settings.wisp=$("#wispUrl").value.trim();save();
  window.VantaProxy?.reset();
  toast(settings.wisp?"Wisp endpoint updated":"Using the default Wisp endpoint");
};
$("#proxyReset").onclick=async()=>{
  toast("Resetting proxy...");
  await window.VantaProxy?.hardReset();
  toast("Proxy reset. If it still hangs, close every tab of this site and reopen it.");
};
if("serviceWorker" in navigator){
  navigator.serviceWorker.addEventListener("message",e=>{
    if(e.data?.type==="vanta-sw-corrupt"){
      window.VantaProxy?.hardReset();
      toast("Proxy storage was corrupted — reset automatically. Press GO again.");
    }
  });
}
$("#resetSettings").onclick=()=>{settings={...defaults};save();applySettings();toast("Settings reset")};

let searchDebounce=null;
$("#globalSearch").addEventListener("input",e=>{
  const q=e.target.value.trim();
  clearTimeout(searchDebounce);
  searchDebounce=setTimeout(async()=>{
    currentQuery=q; currentPage=1;
    if(q){
      page("games");
      if(luminReady){
        try{const r=await Lumin.getGames({page:1,limit:PAGE_SIZE,q});games=r.games||[];hasNextPage=false;await render(games);return}catch{}
      }
      render(games.filter(g=>(g.name+" "+(g.category||"")).toLowerCase().includes(q.toLowerCase())));
    } else {
      await loadGames();
    }
  },250);
});

function normalizeUrl(v){
  v=v.trim(); if(!v)return "";
  if(!/^https?:\/\//i.test(v))v="https://"+v;
  try{return new URL(v).href}catch{return ""}
}
function searchOrUrl(v){
  v=v.trim(); if(!v)return "";
  const looksLikeUrl=/^https?:\/\//i.test(v)||(/^[^\s]+\.[a-z]{2,}(\/|$)/i.test(v));
  return looksLikeUrl?normalizeUrl(v):"https://duckduckgo.com/?q="+encodeURIComponent(v);
}
function goProxy(){
  const u=searchOrUrl($("#proxyUrl").value);
  if(!u)return toast("Enter a website URL or a search");
  if(!window.VantaProxy)return toast("Proxy failed to load");
  window.VantaProxy.launch(u);
}
$("#proxyGo").onclick=goProxy;
$("#proxyUrl").addEventListener("keydown",e=>{if(e.key==="Enter")goProxy()});
$$(".quick-grid button").forEach(b=>b.onclick=()=>{page("proxy");$("#proxyUrl").value=b.dataset.url;goProxy()});

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
