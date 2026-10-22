(() => {
  'use strict';
  const view = document.querySelector('#work-view');
  const doc = window.PortfolioDocument;
  const media = window.PortfolioMedia;
  if (!view || !doc || !media) return;
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const url = p => encodeURI(p);
  const projects = [
    {id:'robotaxi',title:'智行伴随',tags:['毕业设计项目','AI出行','HMI设计'],image:'作品展示/智行伴随/界面设计图/猜你想问.png',art:'作品展示/独立界面高清稿/小智-原稿欢迎.png'},
    {id:'crane',title:'三一起重机人机界面优化',tags:['校企合作','界面优化','眼动实验'],image:'作品展示/三一起重机/起重机优化界面.png',art:'作品展示/独立界面高清稿/三一起重机-设备元素.png'},
    {id:'ai',title:'AI如何驱动设计?',tags:['AI协作','设计探索','网页开发'],image:media['AI如何驱动设计 · UX作品集 · 可编辑 · 思源黑体.png'].tiles[0].small}
  ];
  const dialog = document.querySelector('#work-image-dialog');
  const zoomImage = dialog.querySelector('.work-zoom-image');
  const state = { mode:'index',project:null,indexScroll:0,active:null,frame:0,zoomItems:[],zoomIndex:0,zoomTrigger:null,zoomScroll:0,restore:true,toast:0 };
  view.innerHTML = '<section class="work-index" id="work-index" aria-labelledby="works-heading"></section><article class="folio-reader" id="folio-reader" hidden aria-label="完整作品集原稿"></article>';
  const index = view.querySelector('#work-index');
  const reader = view.querySelector('#folio-reader');
  const contact=document.querySelector('#contact-view');
  if(contact)window.PortfolioContact.mount(contact);
  index.innerHTML = window.PortfolioDirectory.render();

  function navigationGroups(project) {
    const all=doc.chapters.filter(c=>c.project===project);
    const merged=project==='robotaxi'?{3:{title:'用户研究',last:5},10:{title:'界面设计',last:13},14:{title:'设计规范',last:15}}:project==='crane'?{6:{title:'实验结果',last:7},9:{title:'界面优化设计',last:11}}:project==='ai'?{2:{title:'IP形象探索',last:3},4:{title:'界面检查与修改',last:5}}:{};
    const result=[];
    for(let i=0;i<all.length;i++){
      const n=i+1,m=merged[n];
      if(m){const items=all.slice(i,m.last);result.push({id:items[0].id,title:m.title,ids:items.map(c=>c.id)});i=m.last-1;}
      else result.push({id:all[i].id,title:all[i].title,ids:[all[i].id]});
    }
    return result;
  }
  function buildReader(projectId) {
    if(state.project===projectId)return;
    state.project=projectId;
    const project=projects.find(p=>p.id===projectId);
    const next=projects[(projects.indexOf(project)+1)%projects.length];
    const nav= navigationGroups(projectId);
    reader.setAttribute('aria-label',project.title+'原稿');
    reader.innerHTML=`<div class="folio-layout"><aside class="folio-sidebar"><button class="folio-toc-toggle" type="button" data-toggle-toc aria-expanded="false" aria-controls="folio-project-nav" aria-label="展开项目目录"><span aria-hidden="true">☰</span><span>目录</span></button><a class="folio-back" href="#work"><span aria-hidden="true">←</span><span class="folio-back-label">返回目录</span></a><p class="folio-sidebar-title">${esc(project.title)}</p><nav class="folio-chapters" id="folio-project-nav" aria-label="当前项目章节">${nav.map(g=>`<a href="#work/${projectId}/${g.id}" data-section-link="${g.id}">${esc(g.title)}</a>`).join('')}</nav></aside><div class="folio-main"><div class="folio-document">${doc.pages.filter(p=>p.project===projectId).map(page=>{
      const m=media[page.file],chapters=doc.chapters.filter(c=>c.sourceFile===page.file),hotspots=doc.hotspots.filter(h=>h.sourceFile===page.file);
      return `<section class="folio-sheet" data-sheet="${page.id}" aria-label="${esc(page.title)}">${chapters.map(c=>`<span class="folio-anchor" id="folio-${c.id}" data-chapter="${c.id}" style="top:${c.topPercent}%" aria-hidden="true"></span>`).join('')}<div class="folio-tiles">${m.tiles.map((tile,i)=>`<img class="folio-tile" src="${url(tile.small)}" srcset="${url(tile.small)} ${tile.smallWidth}w, ${url(tile.src)} ${tile.width}w" sizes="(max-width:760px) calc(100vw - 66px), calc(100vw - 180px)" width="${tile.width}" height="${tile.height}" alt="${i===0?esc('作品集原稿：'+page.title):''}" loading="lazy" decoding="async">`).join('')}</div>${hotspots.map(h=>`<button class="folio-hotspot" type="button" data-hotspot="${h.id}" style="left:${h.rect[0]}%;top:${h.rect[1]}%;width:${h.rect[2]}%;height:${h.rect[3]}%" aria-label="放大查看：${esc(h.title)}"><span aria-hidden="true">放大 ↗</span></button>`).join('')}</section>`;
    }).join('')}</div><footer class="folio-project-footer"><a href="#work/${next.id}" class="folio-next"><span>继续浏览下一个项目</span><strong>${esc(next.title)} ↗</strong></a><button type="button" data-project-top>回到顶部 ↑</button></footer></div></div>`;
    state.active=doc.chapters.find(c=>c.project===projectId).id;
    setChapter(state.active);
  }
  function setChapter(id) {
    const chapter=doc.chapters.find(c=>c.id===id&&c.project===state.project);
    if(!chapter)return;
    state.active=chapter.id;
    const group=navigationGroups(state.project).find(g=>g.ids.includes(id));
    reader.querySelectorAll('[data-section-link]').forEach(a=>{
      if(a.dataset.sectionLink===group.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');
    });
  }
  function scrollChapter(id) {
    const a=reader.querySelector(`[data-chapter="${CSS.escape(id)}"]`);if(!a)return;
    view.scrollTo({top:Math.max(0,a.getBoundingClientRect().top-view.getBoundingClientRect().top+view.scrollTop-16),behavior:'auto'});
    setChapter(id);updateReading();
  }
  function updateReading() {
    state.frame=0;
    if(view.hidden||state.mode!=='reader')return;
    const cutoff=view.getBoundingClientRect().top+24;
    let current=doc.chapters.find(c=>c.project===state.project).id;
    reader.querySelectorAll('[data-chapter]').forEach(a=>{if(a.getBoundingClientRect().top<=cutoff)current=a.dataset.chapter;});
    setChapter(current);
  }
  function closeForRoute() { if(dialog.open){state.restore=false;dialog.close();} }
  function showIndex() {
    state.mode='index';reader.hidden=true;index.hidden=false;view.scrollTop=state.indexScroll;document.title='钟光英 · Works';
  }
  function route() {
    closeForRoute();
    if(!location.hash.startsWith('#work'))return;
    const [,key,detail]=location.hash.split('/');
    if(key==='portfolio'&&detail==='portfolio-end'){location.hash='#contact';return;}
    if(!key){showIndex();return;}
    const aliases={robotaxi:{overview:'robotaxi-01',research:'robotaxi-03',experiment:'robotaxi-06',design:'robotaxi-10'},crane:{overview:'crane-01',research:'crane-04',design:'crane-09'}};
    let projectId=key,target;
    if(key==='portfolio'){
      const c=doc.chapters.find(c=>c.id===detail&&projects.some(p=>p.id===c.project));
      if(!c){showIndex();return;}projectId=c.project;target=c.id;
    }else{
      if(!projects.some(p=>p.id===projectId)){showIndex();return;}
      const first=doc.chapters.find(c=>c.project===projectId).id;
      target=aliases[projectId]?.[detail]||detail||first;
      if(!doc.chapters.some(c=>c.id===target&&c.project===projectId))target=first;
    }
    if(state.mode==='index')state.indexScroll=view.scrollTop;
    state.mode='reader';index.hidden=true;reader.hidden=false;buildReader(projectId);
    const sidebar=reader.querySelector('.folio-sidebar');sidebar.classList.remove('is-open');sidebar.querySelector('[data-toggle-toc]').setAttribute('aria-expanded','false');
    document.title=projects.find(p=>p.id===projectId).title+' · 钟光英';
    requestAnimationFrame(()=>scrollChapter(target));
  }

  function showImage(n) {
    state.zoomIndex=(n+state.zoomItems.length)%state.zoomItems.length;
    const h=state.zoomItems[state.zoomIndex];if(!h)return;
    const image=h.image;
    dialog.classList.remove('is-native');
    zoomImage.removeAttribute('width');zoomImage.removeAttribute('height');zoomImage.src=url(image.src);zoomImage.alt=h.title;
    dialog.querySelector('#work-image-title').textContent=h.title;
    dialog.querySelector('[data-zoom-count]').textContent=`${state.zoomIndex+1} / ${state.zoomItems.length}`;
    dialog.querySelector('#work-image-resolution').textContent=`原始素材 ${image.width} × ${image.height} px${h.resolutionNote?' · '+h.resolutionNote:''}`;
    const native=dialog.querySelector('[data-native-size]');native.setAttribute('aria-pressed','false');native.textContent='原尺寸查看';
    dialog.querySelector('[data-original-image]').href=url(image.src);
    dialog.querySelector('.work-zoom-stage').scrollTo(0,0);
    if(!dialog.open)dialog.showModal();
  }
  function openImage(h,trigger,list) {
    state.zoomTrigger=trigger;state.zoomScroll=view.scrollTop;state.restore=true;
    state.zoomItems=list||doc.hotspots.filter(x=>x.project===h.project);
    showImage(state.zoomItems.findIndex(x=>x.id===h.id));
  }
  view.addEventListener('click',e=>{
    const link=e.target.closest('[data-section-link]');
    if(link){
      const sidebar=reader.querySelector('.folio-sidebar');sidebar.classList.remove('is-open');sidebar.querySelector('[data-toggle-toc]').setAttribute('aria-expanded','false');
      if(location.hash===link.getAttribute('href')){e.preventDefault();scrollChapter(link.dataset.sectionLink);}return;
    }
    const button=e.target.closest('button');if(!button)return;
    if(button.dataset.hotspot){const h=doc.hotspots.find(x=>x.id===button.dataset.hotspot);if(h)openImage(h,button);}
    if(button.hasAttribute('data-toggle-toc')){const on=reader.querySelector('.folio-sidebar').classList.toggle('is-open');button.setAttribute('aria-expanded',String(on));button.setAttribute('aria-label',on?'收起项目目录':'展开项目目录');}
    if(button.hasAttribute('data-project-top')){view.scrollTo({top:0,behavior:'auto'});setChapter(doc.chapters.find(c=>c.project===state.project).id);try{history.replaceState(null,'','#work/'+state.project);}catch{}}
  });
  dialog.querySelector('[data-close-work-image]').addEventListener('click',()=>dialog.close());
  dialog.querySelectorAll('[data-zoom-step]').forEach(b=>b.addEventListener('click',()=>showImage(state.zoomIndex+Number(b.dataset.zoomStep))));
  dialog.querySelector('[data-native-size]').addEventListener('click',e=>{const on=dialog.classList.toggle('is-native');e.currentTarget.setAttribute('aria-pressed',String(on));e.currentTarget.textContent=on?'适应窗口':'原尺寸查看';});
  dialog.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();showImage(state.zoomIndex+(e.key==='ArrowRight'?1:-1));}});
  dialog.addEventListener('click',e=>{const r=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))dialog.close();});
  dialog.addEventListener('close',()=>{if(state.restore&&state.mode==='reader'&&!view.hidden){view.scrollTop=state.zoomScroll;state.zoomTrigger?.focus({preventScroll:true});}zoomImage.removeAttribute('src');});
  view.addEventListener('scroll',()=>{if(state.mode==='index')state.indexScroll=view.scrollTop;else if(!state.frame)state.frame=requestAnimationFrame(updateReading);},{passive:true});
  window.addEventListener('resize',()=>{if(state.mode==='reader'&&!view.hidden)requestAnimationFrame(updateReading);},{passive:true});
  window.addEventListener('portfolio:viewchange',route);
  route();
})();
