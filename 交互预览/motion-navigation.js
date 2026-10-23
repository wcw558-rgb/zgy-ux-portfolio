/* One document scroller. This file is loaded only by index-motion-preview.html. */
(() => {
  'use strict';
  const page = document.querySelector('.page');
  const header = document.querySelector('.header');
  const nav = document.querySelector('.nav');
  const buttons = [...nav.querySelectorAll('.nav-button')];
  const ids = ['home', 'about', 'work', 'contact'];
  const sections = ids.map(id => document.getElementById(id + '-view'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const initialHash=location.hash||'#home';
  const state = { phase:'idle', target:null, activeSection:'home', origin:null, sequence:0, cancellations:0, completed:0, lastCancel:null };
  const wheelConfig=Object.freeze({threshold:90,gestureGap:200,edgeTolerance:2,linePixels:16});
  const wheel={id:0,lastAt:-Infinity,direction:0,index:-1,amount:0,eligible:false,consumed:false,reason:'idle'};
  let scrollFrame = 0, spyFrame = 0, cancelFade = null, finishScroll = null, revealPending = null, routeMemory = '', workHash = '#work';
  let modalScroll = 0, hadModal = false, initialized = false, historyKey = 0;
  let snapshotTimer=0;
  const height = () => header.getBoundingClientRect().height;
  const keyFor = hash => hash.startsWith('#work') ? 'work' : ids.includes(hash.slice(1)) ? hash.slice(1) : 'home';
  const targetY = element => Math.max(0, element.getBoundingClientRect().top + scrollY - (element.id === 'home-view' ? 0 : height() + (element.matches('.folio-anchor') ? 16 : 0)));
  const maxY = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
  const jump = y => window.scrollTo({top:Math.min(maxY(),Math.max(0,y)),behavior:'instant'});
  const inWork = () => { const r=sections[2].getBoundingClientRect(); return r.top < innerHeight && r.bottom > height(); };
  function sectionBounds(index){
    const section=sections[index],r=section.getBoundingClientRect();
    let start=Math.min(maxY(),targetY(section));
    if(index===2&&window.PortfolioReaderPreview?.getState().mode==='reader'){
      const first=section.querySelector('.folio-reader:not([hidden]) .folio-anchor');
      // The reader's first chapter has its own 16px header offset. Treat that
      // initial landing as the top edge, including the desktop's 8px inset.
      if(first)start=Math.min(maxY(),Math.max(start,targetY(first)));
    }
    return {start,end:Math.min(maxY(),Math.max(start,r.bottom+scrollY-innerHeight))};
  }
  function wheelDestination(index,direction){
    const reader=window.PortfolioReaderPreview?.getState();
    if(index===2&&reader?.mode==='reader'){
      // Each project is a reading stop. Its first page returns to the directory;
      // its last page advances through the projects before reaching Contact.
      if(direction<0)return '#work';
      const order=['robotaxi','crane','ai'],next=order[order.indexOf(reader.project)+1];
      return next?'#work/'+next:'#contact';
    }
    const next=index+direction;
    return next<0||next>=sections.length?null:'#'+ids[next];
  }

  function updateIndicator() {
    const button=buttons[ids.indexOf(state.activeSection)];
    const r=button.getBoundingClientRect(), parent=nav.getBoundingClientRect();
    const indicator=nav.querySelector('.nav-indicator');
    indicator.style.width=r.width+'px';
    indicator.style.transform='translateX('+(r.left-parent.left)+'px)';
  }
  function activate(key) {
    const changed=state.activeSection!==key;
    state.activeSection=key; page.dataset.activeView=key;
    const projectTitle=sections[2].querySelector('.folio-sidebar-title')?.textContent;
    document.title=key==='work'&&window.PortfolioReaderPreview?.getState().mode==='reader'&&projectTitle?projectTitle+' · 钟光英':'钟光英 · '+({home:'Portfolio',about:'About',work:'Works',contact:'Contact'}[key]);
    buttons.forEach((button,i)=>{
      button.setAttribute('aria-pressed',String(ids[i]===key));
      if(ids[i]===key)button.setAttribute('aria-current','location');else button.removeAttribute('aria-current');
    });
    updateIndicator();
    if(changed)window.dispatchEvent(new CustomEvent('portfolio:sectionchange',{detail:{section:key}}));
  }
  function emitSettled(cancelled=false){
    window.dispatchEvent(new CustomEvent('portfolio:motion-settled',{detail:{cancelled,source:state.origin,hash:location.hash}}));
  }
  function cancel(reason='superseded') {
    const busy=state.phase!=='idle';
    ++state.sequence;
    cancelAnimationFrame(scrollFrame);scrollFrame=0;
    if(finishScroll){finishScroll();finishScroll=null;}
    if(cancelFade){cancelFade();cancelFade=null;}
    if(revealPending){revealPending();revealPending=null;}
    if(busy){state.cancellations++;state.lastCancel=reason;}
    state.phase='idle';state.target=null;
    if(busy&&reason!=='superseded'&&reason!=='reader-navigation')emitSettled(true);
    return state.sequence;
  }
  function restore(y) {
    if(state.phase!=='idle')return false;
    jump(y);return true;
  }
  function setHistory(hash,mode) {
    if(mode==='none')return;
    try {
      const saved={...history.state,motionY:scrollY};
      history.replaceState(saved,'',location.href);
      const next={motionKey:++historyKey,motionY:null};
      if(mode==='replace'||location.hash===hash)history.replaceState(next,'',hash);else history.pushState(next,'',hash);
    } catch (_) { /* file:// still supports the rendered sections. */ }
  }
  function storeSpyHash(key) {
    if(document.querySelector('dialog[open]')||state.phase!=='idle')return;
    const hash=key==='work'?workHash:'#'+key;
    if(location.hash===hash){scheduleSnapshot();return;}
    try{history.replaceState({...history.state,motionY:scrollY},'',hash);}catch(_){}
    routeMemory=location.hash+'|'+(history.state?.motionKey||0);
  }
  function saveSnapshot() {
    clearTimeout(snapshotTimer);snapshotTimer=0;
    if(!initialized||state.phase!=='idle'||document.querySelector('dialog[open]'))return;
    try{history.replaceState({...history.state,motionY:scrollY},'',location.href);}catch(_){}
  }
  function scheduleSnapshot(){clearTimeout(snapshotTimer);snapshotTimer=setTimeout(saveSnapshot,150);}
  function syncVisible() {
    spyFrame=0;
    if(!initialized||state.phase!=='idle'||document.querySelector('dialog[open]'))return;
    const line=height()+Math.min(160,(innerHeight-height())*.3);
    let chosen=0;
    sections.forEach((section,i)=>{if(section.getBoundingClientRect().top<=line)chosen=i;});
    activate(ids[chosen]);storeSpyHash(ids[chosen]);
  }
  function queueSpy() {if(!spyFrame)spyFrame=requestAnimationFrame(syncVisible);}
  function fade(element,frames,duration,token) {
    if(!element||reduced.matches)return Promise.resolve();
    return new Promise(resolve=>{
      const animation=element.animate(frames,{duration,easing:'ease-in-out',fill:'both'});
      let settled=false;
      const finish=()=>{if(settled)return;settled=true;animation.cancel();if(token===state.sequence)cancelFade=null;resolve();};
      cancelFade=finish;animation.finished.then(finish,finish);
    });
  }
  function camera(element,token,{animate=true,position=null}={}) {
    return new Promise(resolve=>{
      const done=()=>{if(finishScroll===done)finishScroll=null;resolve();};
      finishScroll=done;
      const destination=()=>Math.min(maxY(),position===null?targetY(element):Math.max(0,position));
      const start=scrollY, end=destination(), distance=end-start;
      if(!animate||reduced.matches||Math.abs(distance)<2){jump(end);done();return;}
      const duration=Math.abs(distance)>innerHeight*2?(element.id==='home-view'?540:660):900;
      const began=performance.now();
      const tick=now=>{
        if(token!==state.sequence){done();return;}
        // Zero velocity and acceleration at both ends soften the camera's
        // hand-off to native scrolling without extending the return to Home.
        const t=Math.min(1,(now-began)/duration),e=t*t*t*(t*(t*6-15)+10);
        jump(start+(destination()-start)*e);
        if(t<1)scrollFrame=requestAnimationFrame(tick);else{scrollFrame=0;done();}
      };
      scrollFrame=requestAnimationFrame(tick);
    });
  }
  const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
  function closeDialogs() {document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());}
  function resolveElement(hash) {
    if(!hash.startsWith('#work/'))return sections[ids.indexOf(keyFor(hash))];
    const reader=window.PortfolioReaderPreview?.getState();
    if(reader?.mode!=='reader')return sections[2];
    return document.querySelector('[data-chapter="'+CSS.escape(reader?.active||'')+'"]')||sections[2];
  }
  async function navigate(hash,{mode='push',animate=true,position=null,source='navigation',landing='start'}={}) {
    if(!/^#(?:home|about|work(?:\/[^\s]*)?|contact)$/.test(hash))hash='#home';
    const previousReader=window.PortfolioReaderPreview?.getState();
    const token=cancel('superseded');state.phase='preparing';state.target=hash;state.origin=source;
    closeDialogs();
    activate(keyFor(hash));
    const [,project,chapter]=hash.split('/');
    const nextProject=['robotaxi','crane','ai'].includes(project)?project:project==='portfolio'?window.PortfolioDocument?.chapters.find(item=>item.id===chapter)?.project:null;
    const sameReader=previousReader?.mode==='reader'&&nextProject===previousReader.project;
    const readerChange=keyFor(hash)==='work'&&inWork()&&!sameReader&&(previousReader?.mode==='reader'||Boolean(nextProject));
    const wheelReaderChange=readerChange&&source==='wheel';
    const current=sections[2].querySelector('.folio-reader:not([hidden]),.work-index:not([hidden])');
    if(readerChange&&animate){await fade(current,[{opacity:1},{opacity:0}],wheelReaderChange?220:130,token);if(token!==state.sequence)return;}
    // Commit the URL and rendered route together; an interrupted fade keeps the old route valid.
    setHistory(hash,mode);
    if(hash.startsWith('#work'))workHash=hash;
    routeMemory=location.hash+'|'+(history.state?.motionKey||0);
    window.dispatchEvent(new CustomEvent('portfolio:viewchange',{detail:{source,hash}}));
    window.dispatchEvent(new CustomEvent('portfolio:route-rendered',{detail:{hash}}));
    const nextContent=sections[2].querySelector('.folio-reader:not([hidden]),.work-index:not([hidden])');
    if(readerChange&&animate&&!reduced.matches&&nextContent){
      const opacity=nextContent.style.opacity;nextContent.style.opacity='0';
      revealPending=()=>{nextContent.style.opacity=opacity;};
    }
    // Replacing a long reader changes document height. Place the next project's
    // first page while it is covered by the crossfade, rather than sweeping
    // backwards through that project or flashing Contact during layout clamp.
    if(wheelReaderChange)jump(targetY(resolveElement(hash)));
    await frame();await frame();
    if(token!==state.sequence)return;
    const target=resolveElement(hash);
    if(source==='wheel'&&position===null){const bounds=sectionBounds(ids.indexOf(keyFor(hash)));position=landing==='end'?bounds.end:bounds.start;}
    if(position===null&&hash==='#work'&&previousReader?.mode==='reader'&&previousReader.indexScroll>=targetY(sections[2]))position=previousReader.indexScroll;
    state.phase='scrolling';
    // The document is never transformed. Only target content receives a subtle camera arrival.
    const arrival=keyFor(hash)==='home'||sameReader?null:keyFor(hash)==='work'?sections[2].querySelector('.folio-reader:not([hidden]),.work-index:not([hidden])'):sections[ids.indexOf(keyFor(hash))].firstElementChild;
    if(revealPending){revealPending();revealPending=null;}
    const arrivalPromise=animate?fade(arrival,[{opacity:readerChange?0:.5,translate:readerChange?'0 0':'0 8px'},{opacity:1,translate:'0 0'}],wheelReaderChange?400:readerChange?170:560,token):Promise.resolve();
    await camera(target,token,{animate,position});await arrivalPromise;
    if(token!==state.sequence)return;
    state.phase='idle';state.target=null;state.completed++;
    try{history.replaceState({...history.state,motionY:scrollY},'',location.href);}catch(_){}
    syncVisible();
    emitSettled();
  }
  function scrollToElement(element,{animate=true}={}) {
    if(!element)return;
    const token=cancel('reader-navigation');state.phase='scrolling';state.target=element.id||element.dataset.chapter;state.origin='reader';
    camera(element,token,{animate}).then(()=>{if(token===state.sequence){state.phase='idle';state.target=null;syncVisible();emitSettled();}});
  }
  window.PortfolioMotionNavigation=Object.freeze({
    navigate,scrollToElement,updateIndicator,captureScroll:()=>scrollY,restore,
    getState:()=>({...state,reducedMotion:reduced.matches,scrollY,activeFrames:scrollFrame?1:0,wheel:{...wheel,config:wheelConfig}}),
    headerHeight:height,isWorkVisible:inWork,
    updateWorkHash(hash){workHash=hash;},
  });
  buttons.forEach((button,i)=>button.addEventListener('click',()=>navigate('#'+ids[i])));
  document.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const anchor=event.target.closest('a[href^="#"]');if(!anchor)return;
    const hash=anchor.getAttribute('href');
    if(!/^#(?:home|about|work(?:\/.*)?|contact)$/.test(hash))return;
    event.preventDefault();navigate(hash,{source:'link'});
  });
  function interrupt(event) {
    if(state.phase==='idle')return;
    if(event.type==='keydown'&&!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' ','Spacebar'].includes(event.key))return;
    if(event.type==='keydown'&&event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    cancel('user-'+event.type);queueSpy();
  }
  function wheelIsNested(target,direction){
    if(target.closest('.folio-sidebar,[data-page-wheel-ignore],input,textarea,select,[contenteditable="true"]'))return true;
    const section=target.closest('[data-view]');
    for(let node=target;node&&node!==section&&node!==document.body;node=node.parentElement){
      const remaining=node.scrollHeight-node.clientHeight;
      if(remaining>2&&/^(auto|scroll|overlay)$/.test(getComputedStyle(node).overflowY)&&
        (direction>0?remaining-node.scrollTop>2:node.scrollTop>2))return true;
    }
    return false;
  }
  function onWheel(event){
    if(!initialized||event.defaultPrevented||event.ctrlKey||event.metaKey)return;
    const factor=event.deltaMode===1?wheelConfig.linePixels:event.deltaMode===2?innerHeight:1;
    const y=event.deltaY*factor,x=event.deltaX*factor,direction=Math.sign(y),now=performance.now();
    if(!Number.isFinite(y)||!direction||Math.abs(x)>Math.abs(y))return;
    const target=event.target instanceof Element?event.target:event.target?.parentElement;
    if(!target)return;
    if(document.querySelector('dialog[open]')||wheelIsNested(target,direction)){
      if(state.phase!=='idle'){cancel('user-nested-wheel');queueSpy();}
      // Record protected input too: its inertia must not become a new page
      // gesture merely because the pointer leaves a popup or sidebar.
      wheel.lastAt=now;wheel.direction=direction;wheel.index=ids.indexOf(state.activeSection);
      wheel.amount=0;wheel.eligible=false;wheel.consumed=true;wheel.reason='protected-scroll';return;
    }
    const fresh=now-wheel.lastAt>wheelConfig.gestureGap;
    const sameDirection=direction===wheel.direction;
    // Inertia from the gesture that launched a camera move belongs to that move.
    // A fresh/reversed input can still interrupt an ordinary navigation.
    if(state.phase!=='idle'){
      wheel.lastAt=now;
      if(event.cancelable&&((wheel.consumed&&!fresh&&sameDirection)||(state.origin==='wheel'&&sameDirection))){
        event.preventDefault();wheel.consumed=true;wheel.reason='transition-tail';return;
      }
      cancel('user-wheel');wheel.eligible=false;wheel.consumed=false;wheel.direction=direction;wheel.amount=0;wheel.reason='interrupted-navigation';queueSpy();return;
    }
    syncVisible();
    const index=ids.indexOf(state.activeSection),bounds=sectionBounds(index);
    const atEdge=direction>0?scrollY>=bounds.end-wheelConfig.edgeTolerance:scrollY<=bounds.start+wheelConfig.edgeTolerance;
    if(fresh||direction!==wheel.direction||(!wheel.consumed&&index!==wheel.index)){
      wheel.id++;wheel.direction=direction;wheel.index=index;wheel.amount=0;wheel.consumed=false;wheel.eligible=atEdge;wheel.reason=atEdge?'edge-at-start':'native-scroll';
    }
    wheel.lastAt=now;
    if(wheel.consumed){if(event.cancelable)event.preventDefault();return;}
    if(!event.cancelable)return;
    if(wheel.eligible&&atEdge){
      event.preventDefault();wheel.amount+=Math.abs(y);
      const destination=wheelDestination(index,direction);
      if(!destination){wheel.reason='first-or-last-page';return;}
      if(wheel.amount>=wheelConfig.threshold){
        wheel.consumed=true;wheel.reason='switched';
        navigate(destination,{source:'wheel',landing:direction<0&&destination!=='#work'?'end':'start'});
      }
      return;
    }
    // Long content keeps native movement. At its boundary, finish this gesture
    // there; only a new gesture may advance to the next major page.
    const crosses=direction>0?scrollY+y>=bounds.end:scrollY+y<=bounds.start;
    if(crosses){event.preventDefault();jump(direction>0?bounds.end:bounds.start);wheel.eligible=false;wheel.reason='edge-reached-in-gesture';}
  }
  window.addEventListener('wheel',onWheel,{passive:false});
  window.addEventListener('touchstart',interrupt,{passive:true});
  window.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'||event.clientX>=document.documentElement.clientWidth)interrupt(event);},{passive:true});
  window.addEventListener('keydown',interrupt);
  window.addEventListener('scroll',queueSpy,{passive:true});
  window.addEventListener('scrollend',saveSnapshot,{passive:true});
  window.addEventListener('resize',()=>{updateIndicator();queueSpy();},{passive:true});
  if('IntersectionObserver'in window){const observer=new IntersectionObserver(queueSpy,{rootMargin:'-56px 0px -25% 0px',threshold:[0,.01,.1,.25,.5,.75,1]});sections.forEach(section=>observer.observe(section));}
  function historyRoute() {
    if(!initialized)return;
    const key=location.hash+'|'+(history.state?.motionKey||0);if(key===routeMemory)return;
    routeMemory=key;
    navigate(location.hash||'#home',{mode:'none',animate:false,position:Number.isFinite(history.state?.motionY)?history.state.motionY:null,source:'history'});
  }
  window.addEventListener('popstate',historyRoute);window.addEventListener('hashchange',historyRoute);
  new MutationObserver(()=>{
    const open=Boolean(document.querySelector('dialog[open]'));
    if(open&&!hadModal){modalScroll=scrollY;cancel('dialog-open');}
    document.documentElement.classList.toggle('motion-dialog-open',open);
    if(!open&&hadModal&&state.phase==='idle')jump(modalScroll);
    hadModal=open;
  }).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  reduced.addEventListener('change',()=>{cancel('motion-preference');queueSpy();});
  if('scrollRestoration'in history)history.scrollRestoration='manual';
  document.addEventListener('DOMContentLoaded',async()=>{
    await document.fonts.ready;await frame();
    initialized=true;
    if(state.sequence===0)navigate(initialHash,{mode:'replace',animate:false,source:'initial'});
    else queueSpy();
    nav.classList.add('is-ready');
  },{once:true});
})();
