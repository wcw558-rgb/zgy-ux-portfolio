/* Fit the existing board in its own normal-flow section; never reset document scroll. */
(() => {
  'use strict';
  const view=document.querySelector('#about-view'),layout=view.querySelector('.about-portfolio-layout');
  const cards=[...view.querySelectorAll('.portfolio-internship')];
  const board={width:1480.8125,height:815};let pending=0;
  function fit(){
    pending=0;
    const desktop=innerWidth>900;view.classList.toggle('is-board-fitted',desktop);
    view.classList.remove('is-fitted','is-measuring');
    if(desktop){
      const availableHeight=Math.max(1,innerHeight-56-48),scale=Math.min((innerWidth-48)/board.width,availableHeight/board.height);
      view.style.setProperty('--about-board-scale',scale);
      view.style.setProperty('--about-board-x',(innerWidth-board.width*scale)/2+'px');
      view.style.setProperty('--about-board-y','24px');
      view.style.setProperty('--motion-about-height',board.height*scale+48+'px');
      cards.forEach(card=>card.style.setProperty('--internship-popover-height',Math.max(100,Math.min(innerHeight*.6,innerHeight-card.getBoundingClientRect().bottom-12))/scale+'px'));
    }else{
      ['--about-board-scale','--about-board-x','--about-board-y','--motion-about-height'].forEach(name=>view.style.removeProperty(name));
      cards.forEach(card=>card.style.removeProperty('--internship-popover-height'));
    }
  }
  function schedule(){if(!pending)pending=requestAnimationFrame(fit);}
  if('ResizeObserver'in window)new ResizeObserver(schedule).observe(layout);
  window.addEventListener('resize',schedule,{passive:true});window.visualViewport?.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('portfolio:sectionchange',schedule);view.addEventListener('toggle',schedule,true);
  view.addEventListener('load',schedule,true);document.fonts.ready.then(schedule);schedule();
})();
