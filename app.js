const API = "/.netlify/functions/videos";
const VIDEO_API = "/.netlify/functions/video";
const feed = document.querySelector("#feed");
const uploadDialog = document.querySelector("#uploadDialog");
const uploadForm = document.querySelector("#uploadForm");
const uploadStatus = document.querySelector("#uploadStatus");
let allVideos = [];
let activeFilter = "all";

function toast(message){
  const el=document.querySelector("#toast"); el.textContent=message; el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),2200);
}
function safeText(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function videoUrl(id){return `${VIDEO_API}?id=${encodeURIComponent(id)}`;}

async function loadVideos(){
  feed.innerHTML='<div class="loading-card">Memuat video ShekaPoi...</div>';
  try{
    const res=await fetch(API);
    if(!res.ok) throw new Error("Server belum siap");
    const data=await res.json();
    allVideos=Array.isArray(data.videos)?data.videos:[];
    renderFeed();
  }catch(err){
    feed.innerHTML='<div class="empty-state"><h3>Belum terhubung ke server</h3><p>Deploy folder project ini ke Netlify agar feed online aktif.</p></div>';
  }
}
function renderFeed(){
  const query=(document.querySelector("#searchInput")?.value||"").toLowerCase();
  let videos=allVideos.filter(v=>(v.caption+" "+v.creator).toLowerCase().includes(query));
  if(activeFilter==="liked") videos=videos.filter(v=>localStorage.getItem("like-"+v.id)==="1");
  if(!videos.length){feed.innerHTML='<div class="empty-state"><h3>Belum ada video di sini</h3><p>Jadilah kreator pertama di ShekaPoi.</p></div>';return;}
  feed.innerHTML=videos.map((v,i)=>{
    const liked=localStorage.getItem("like-"+v.id)==="1";
    return `<article class="video-card" style="animation-delay:${Math.min(i*70,350)}ms">
      <video src="${videoUrl(v.id)}" controls playsinline preload="metadata"></video><div class="video-shade"></div>
      <div class="video-info"><div class="creator">@${safeText(v.creator||"Kreator")}</div><p class="caption">${safeText(v.caption||"Video ShekaPoi")}</p></div>
      <div class="video-actions">
        <button class="action-btn ${liked?"liked":""}" data-like="${safeText(v.id)}" aria-label="Sukai">${liked?"♥":"♡"}</button><span class="action-count">${liked?"Disukai":"Suka"}</span>
        <button class="action-btn" data-share="${safeText(v.id)}" aria-label="Bagikan">↗</button><span class="action-count">Bagikan</span>
      </div></article>`;
  }).join("");
}
feed.addEventListener("click",e=>{
  const like=e.target.closest("[data-like]");
  const share=e.target.closest("[data-share]");
  if(like){
    const id=like.dataset.like,key="like-"+id;
    localStorage.getItem(key)==="1"?localStorage.removeItem(key):localStorage.setItem(key,"1");
    renderFeed();
  }
  if(share){
    const url=location.origin+videoUrl(share.dataset.share);
    if(navigator.share) navigator.share({title:"ShekaPoi",url}).catch(()=>{});
    else navigator.clipboard?.writeText(url).then(()=>toast("Link video disalin"));
  }
});
document.querySelector("#openUpload").addEventListener("click",()=>uploadDialog.showModal());
document.querySelector("#closeUpload").addEventListener("click",()=>uploadDialog.close());
document.querySelector("#refreshBtn").addEventListener("click",loadVideos);
document.querySelector("#themeToggle").addEventListener("click",()=>document.body.classList.toggle("light"));
document.querySelector("#searchToggle").addEventListener("click",()=>document.querySelector("#searchPanel").classList.toggle("hidden"));
document.querySelector("#searchInput").addEventListener("input",renderFeed);
document.querySelector("#closeProfile").addEventListener("click",()=>document.querySelector("#profileDialog").close());

document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.remove("active"));btn.classList.add("active");
  if(btn.dataset.tab==="saved"){activeFilter="liked";renderFeed();}
  else if(btn.dataset.tab==="profile"){document.querySelector("#profileDialog").showModal();}
  else{activeFilter="all";renderFeed();if(btn.dataset.tab==="explore")document.querySelector("#searchPanel").classList.remove("hidden");}
}));

uploadForm.addEventListener("submit",async e=>{
  e.preventDefault();
  const file=document.querySelector("#videoFile").files[0];
  if(!file){uploadStatus.textContent="Pilih video terlebih dahulu.";return;}
  if(!file.type.startsWith("video/")){uploadStatus.textContent="File harus berupa video.";return;}
  if(file.size>4*1024*1024){uploadStatus.textContent="Ukuran video maksimal 4 MB untuk fungsi Netlify versi ini.";return;}
  const btn=document.querySelector("#uploadSubmit");btn.disabled=true;uploadStatus.textContent="Mengunggah video...";
  try{
    const body=new FormData(uploadForm);
    const res=await fetch(API,{method:"POST",body});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||"Upload gagal");
    uploadStatus.textContent="Video berhasil dipublikasikan!";
    uploadForm.reset();await loadVideos();
    setTimeout(()=>{uploadDialog.close();uploadStatus.textContent="";toast("Video berhasil diunggah!");},900);
  }catch(err){uploadStatus.textContent=err.message;}
  finally{btn.disabled=false;}
});

loadVideos();
