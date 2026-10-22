(() => {
  'use strict';
  const view = document.querySelector('#about-view');
  if (!view) return;
  const layout = view.querySelector('.about-layout');
  // Accepted laptop composition: every desktop screen fits this same board.
  const board = Object.freeze({width:1480.8125, height:815});
  const cards = [...view.querySelectorAll('.portfolio-internship')];
  let frame = 0;

  function updateLayout() {
    frame = 0;
    view.classList.remove('is-fitted', 'is-measuring');
    if (view.hidden) return;
    const expanded = Boolean(view.querySelector('details[open]'));
    view.classList.toggle('is-expanded', expanded);
    const fitted = innerWidth > 900;
    view.classList.toggle('is-board-fitted', fitted);
    view.style.removeProperty('--about-profile-height');
    if (fitted) {
      const availableWidth = Math.max(1, view.clientWidth - 48);
      // Leave a little more breathing room above and below the composition.
      const availableHeight = Math.max(1, view.clientHeight - 48);
      const scale = Math.min(availableWidth / board.width, availableHeight / board.height);
      const x = (view.clientWidth - board.width * scale) / 2;
      const y = (view.clientHeight - board.height * scale) / 2;
      view.style.setProperty('--about-board-scale', scale);
      view.style.setProperty('--about-board-x', x + 'px');
      view.style.setProperty('--about-board-y', y + 'px');
      // Keep enlarged details inside the visible page at every board scale.
      // Subtracting the two rects cancels the main navigation's page animation.
      const boardTop = layout.getBoundingClientRect().top;
      cards.forEach(card => {
        const bottom = y + card.getBoundingClientRect().bottom - boardTop;
        const visibleHeight = Math.max(80, Math.min(view.clientHeight * .6, view.clientHeight - bottom - 12));
        card.style.setProperty('--internship-popover-height', visibleHeight / scale + 'px');
      });
      view.scrollTop = 0;
      return;
    }
    ['--about-board-scale', '--about-board-x', '--about-board-y'].forEach(name => view.style.removeProperty(name));
    cards.forEach(card => card.style.removeProperty('--internship-popover-height'));
  }
  function scheduleLayout() {
    if (!frame) frame = requestAnimationFrame(updateLayout);
  }
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleLayout);
    observer.observe(layout);
    observer.observe(view);
  }
  new MutationObserver(scheduleLayout).observe(view, {attributes:true, attributeFilter:['hidden']});
  view.addEventListener('toggle', scheduleLayout, true);
  view.addEventListener('load', scheduleLayout, true);
  window.addEventListener('resize', scheduleLayout, {passive:true});
  window.visualViewport?.addEventListener('resize', scheduleLayout, {passive:true});
  document.fonts.ready.then(scheduleLayout);
  scheduleLayout();
})();
