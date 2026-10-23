/* Preserve the existing floating details; animate opacity/translate, never a fixed height. */
(() => {
  'use strict';
  const cards=[...document.querySelectorAll('.portfolio-internship')],running=new Map();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function change(card,open){
    if(!open&&card.classList.contains('is-detail-closing'))return;
    const content=card.querySelector('.portfolio-internship-content');
    const interrupted=running.has(card)?getComputedStyle(content):null;
    const fromOpacity=interrupted?interrupted.opacity:open?0:1;
    const fromTranslate=interrupted?interrupted.translate:open?'0 -6px':'0 0';
    const previous=running.get(card);if(previous)previous.cancel();running.delete(card);
    card.classList.remove('is-detail-closing');
    if(open){cards.forEach(other=>{if(other!==card&&other.open)change(other,false);});card.open=true;}
    else if(!card.open)return;
    if(reduced.matches){card.open=open;return;}
    if(!open)card.classList.add('is-detail-closing');
    const animation=content.animate([{opacity:fromOpacity,translate:fromTranslate},{opacity:open?1:0,translate:open?'0 0':'0 -4px'}],{duration:300,easing:'ease-in-out'});
    running.set(card,animation);
    animation.finished.then(()=>{if(running.get(card)!==animation)return;running.delete(card);if(!open)card.open=false;card.classList.remove('is-detail-closing');animation.cancel();},()=>{});
  }
  cards.forEach(card=>{
    const content=card.querySelector('.portfolio-internship-content');content.setAttribute('data-page-wheel-ignore','');
    card.querySelector('summary').addEventListener('click',event=>{event.preventDefault();change(card,!card.open||card.classList.contains('is-detail-closing'));});
    card.addEventListener('pointerleave',event=>{if(['mouse','pen'].includes(event.pointerType))change(card,false);});
    card.addEventListener('focusout',event=>{if(event.relatedTarget&&!card.contains(event.relatedTarget))change(card,false);});
  });
  document.addEventListener('pointerdown',event=>cards.forEach(card=>{if(!card.contains(event.target))change(card,false);}));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]'))cards.forEach(card=>{if(card.open){if(card.contains(document.activeElement))card.querySelector('summary').focus({preventScroll:true});change(card,false);}});});
  window.addEventListener('portfolio:sectionchange',event=>{if(event.detail.section!=='about')cards.forEach(card=>change(card,false));});
})();
