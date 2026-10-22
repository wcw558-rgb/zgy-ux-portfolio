(() => {
  'use strict';
  const view = document.querySelector('#about-view');
  const cards = [...document.querySelectorAll('.portfolio-internship')];
  if (!view || !cards.length) return;
  const close = card => { if (card.open) card.open = false; };
  cards.forEach(card => {
    card.querySelector('.portfolio-internship-content').setAttribute('data-page-wheel-ignore', '');
    card.addEventListener('toggle', () => {
      if (card.open) cards.forEach(other => { if (other !== card) close(other); });
    });
    card.addEventListener('pointerleave', event => {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') close(card);
    });
    card.addEventListener('focusout', event => {
      if (event.relatedTarget && !card.contains(event.relatedTarget)) close(card);
    });
  });
  document.addEventListener('pointerdown', event => {
    cards.forEach(card => { if (!card.contains(event.target)) close(card); });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
    cards.forEach(card => {
      if (!card.open) return;
      const returnFocus = card.contains(document.activeElement);
      close(card);
      if (returnFocus) card.querySelector('summary').focus({preventScroll:true});
    });
  });
  window.addEventListener('portfolio:viewchange', () => {
    if (view.hidden) cards.forEach(close);
  });
})();
