/* Wheel gestures use the existing main navigation; long pages keep native scroll. */
(() => {
  'use strict';
  if (window.PortfolioPageWheel) return;

  const page = document.querySelector('.page');
  const buttons = [...document.querySelectorAll('.header .nav-button')];
  const ids = ['home-view', 'about-view', 'work-view', 'contact-view'];
  const views = ids.map(id => document.getElementById(id));
  if (!page || buttons.length !== 4 || views.some(view => !view)) return;

  const config = Object.freeze({ threshold: 90, gestureGap: 200, cooldown: 700, edgeTolerance: 2, linePixels: 16, exitDuration: 160, enterDuration: 320, travel: 18 });
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  const gesture = { active: false, id: 0, lastAt: -Infinity, direction: 0, amount: 0, index: -1, eligible: false, consumed: false, reason: 'idle' };
  const state = { lockedUntil: 0, pending: false, phase: 'idle', ownNavigation: false, token: 0, switches: 0, lastFrom: null, lastTo: null };

  function activeIndex() {
    const index = buttons.findIndex(button => button.getAttribute('aria-pressed') === 'true');
    return index >= 0 && !views[index].hidden ? index : views.findIndex(view => !view.hidden);
  }

  function elementFor(node) {
    return node instanceof Element ? node : node?.parentElement;
  }

  function editable(element) {
    return Boolean(element && (element.isContentEditable || element.closest('input,textarea,select,[role="textbox"],[contenteditable]:not([contenteditable="false"])')));
  }

  function metrics(element) {
    const max = Math.max(0, element.scrollHeight - element.clientHeight);
    const overflow = max > config.edgeTolerance ? getComputedStyle(element).overflowY : '';
    return { top: element.scrollTop, max, scrollable: max > config.edgeTolerance && /^(auto|scroll|overlay)$/.test(overflow) };
  }

  function atEdge(element, direction) {
    const m = metrics(element);
    return !m.scrollable || (direction > 0 ? m.max - m.top <= config.edgeTolerance : m.top <= config.edgeTolerance);
  }

  function childCanScroll(element, view, direction) {
    // A future nested scroller must get its own native wheel movement first.
    for (let node = element; node && node !== view && node !== page; node = node.parentElement) {
      if (!view.contains(node)) continue;
      const m = metrics(node);
      if (m.scrollable && (direction > 0 ? m.max - m.top > config.edgeTolerance : m.top > config.edgeTolerance)) return true;
    }
    return false;
  }

  function block(reason) {
    gesture.eligible = false;
    gesture.amount = 0;
    gesture.reason = reason;
  }

  function startGesture(now, index, direction) {
    gesture.active = true;
    gesture.id += 1;
    gesture.direction = direction;
    gesture.amount = 0;
    gesture.index = index;
    gesture.consumed = false;
    gesture.eligible = index >= 0 && direction !== 0 && atEdge(views[index], direction);
    gesture.reason = gesture.eligible ? 'edge-at-start' : 'native-scroll';
    // A gesture that starts during the lock is never replayed when it expires.
    if (now < state.lockedUntil || state.pending) block('cooldown-at-start');
  }

  function positionDestination(index, direction, token, attempt = 0) {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        if (token !== state.token || activeIndex() !== index || views[index].hidden) { resolve(false); return; }
        // Let the existing route and layout handlers finish their queued frames.
        if (attempt < 1) {
          resolve(positionDestination(index, direction, token, attempt + 1));
          return;
        }
        views[index].scrollTop = direction > 0 ? 0 : Math.max(0, views[index].scrollHeight - views[index].clientHeight);
        resolve(true);
      });
    });
  }

  function stopAnimations() {
    animations.forEach(animation => animation.cancel());
    animations.clear();
  }

  function cancelTransition(reason) {
    state.token += 1;
    state.pending = false;
    state.phase = 'idle';
    stopAnimations();
    if (gesture.active) { block(reason); gesture.consumed = true; }
  }

  function animate(view, keyframes, duration, paused = false) {
    if (reducedMotion.matches || typeof view.animate !== 'function') return null;
    try {
      const animation = view.animate(keyframes, { duration, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)', fill: 'both' });
      animations.add(animation);
      // Attach the rejection handler immediately, including while paused/hidden.
      const done = animation.finished.then(() => true, () => false);
      if (paused) { animation.pause(); animation.currentTime = 0; }
      return { animation, done };
    } catch (_) { return null; } // Older engines still use the normal navigation.
  }

  async function runTransition(index, next, direction, token) {
    try {
      state.phase = 'outgoing';
      const outgoing = animate(views[index], [
        { opacity: 1, transform: 'translate3d(0,0,0)' },
        { opacity: 0, transform: `translate3d(0,${-direction * config.travel}px,0)` }
      ], config.exitDuration);
      if (outgoing && !(await outgoing.done)) return;
      if (token !== state.token || activeIndex() !== index) return;
      if (document.querySelector('dialog[open]')) { cancelTransition('dialog-open'); return; }

      // Hold the first frame before hidden is removed so the destination cannot
      // flash fully opaque while its route and scroll position are settling.
      const incoming = animate(views[next], [
        { opacity: 0, transform: `translate3d(0,${direction * config.travel}px,0)` },
        { opacity: 1, transform: 'translate3d(0,0,0)' }
      ], config.enterDuration, true);
      state.phase = 'incoming';
      state.ownNavigation = true;
      try {
        // Entering Works from Contact always invokes its main #work directory.
        state.switches += 1;
        buttons[next].click();
      } finally { state.ownNavigation = false; }
      if (outgoing) { outgoing.animation.cancel(); animations.delete(outgoing.animation); }
      if (!(await positionDestination(next, direction, token))) return;
      if (token !== state.token || document.querySelector('dialog[open]')) return;
      if (incoming) {
        if (reducedMotion.matches) incoming.animation.cancel();
        else { incoming.animation.play(); await incoming.done; }
      }
    } finally {
      if (token === state.token) {
        stopAnimations();
        state.pending = false;
        state.phase = 'idle';
      }
    }
  }

  function switchPage(event, index, direction, now) {
    const next = index + direction;
    if (next < 0 || next >= views.length) { block('first-or-last-page'); return; }
    if (!event.cancelable) { block('non-cancelable'); return; }

    // This is the only preventDefault: all other wheel events retain native scroll.
    event.preventDefault();
    gesture.consumed = true;
    gesture.reason = 'switched';
    state.lockedUntil = now + config.cooldown;
    state.pending = true;
    state.lastFrom = ids[index];
    state.lastTo = ids[next];
    const token = ++state.token;
    runTransition(index, next, direction, token).catch(() => {
      if (token === state.token) cancelTransition('transition-error');
    });
  }

  function onWheel(event) {
    const now = performance.now();
    const index = activeIndex();
    if (index < 0) return;
    const view = views[index];
    const factor = event.deltaMode === 1 ? config.linePixels : event.deltaMode === 2 ? Math.max(1, view.clientHeight) : 1;
    const y = event.deltaY * factor;
    const x = event.deltaX * factor;
    const direction = Math.sign(y);
    const fresh = !gesture.active || now - gesture.lastAt > config.gestureGap;
    if (fresh) startGesture(now, index, direction);
    gesture.lastAt = now;

    const target = elementFor(event.target);
    if (document.querySelector('dialog[open]')) { block('dialog-open'); return; }
    if (target?.closest('.folio-sidebar,[data-page-wheel-ignore]')) { block('sidebar-or-opt-out'); return; }
    if (event.ctrlKey || event.metaKey) { block('modifier'); return; }
    if (!Number.isFinite(y) || !Number.isFinite(x) || !direction || Math.abs(x) > Math.abs(y)) { block('horizontal-or-empty'); return; }
    if (editable(target) || editable(elementFor(document.activeElement))) { block('editable'); return; }
    if (event.defaultPrevented) { block('already-handled'); return; }
    if (gesture.consumed || state.pending) return;
    if (now < state.lockedUntil) { block('cooldown'); return; }
    if (gesture.index !== index) { block('view-changed'); return; }
    if (gesture.direction !== direction) { block('direction-changed'); return; }
    if (!gesture.eligible) return;
    if (childCanScroll(target, view, direction)) { block('nested-scroll'); return; }
    if (!atEdge(view, direction)) { block('left-edge'); return; }

    // Eligibility is captured on the first event. Reaching an edge mid-gesture
    // cannot arm navigation; a new gesture after the idle gap is required.
    gesture.amount += Math.abs(y);
    if (gesture.amount >= config.threshold) switchPage(event, index, direction, now);
  }

  function onViewChange() {
    if (state.ownNavigation) return;
    cancelTransition('external-navigation');
  }

  function onBlur() {
    cancelTransition('blur');
  }

  buttons.forEach(button => button.addEventListener('click', () => {
    if (!state.ownNavigation) cancelTransition('manual-navigation');
  }, { capture: true }));
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('portfolio:viewchange', onViewChange);
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', () => { if (document.hidden) onBlur(); });
  new MutationObserver(() => {
    if (state.pending && document.querySelector('dialog[open]')) cancelTransition('dialog-open');
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });

  // Read-only diagnostics for local interaction QA; no product UI or routing API.
  window.PortfolioPageWheel = Object.freeze({
    config,
    getState() {
      return {
        activeView: ids[activeIndex()] || null,
        gestureId: gesture.id,
        direction: gesture.direction,
        accumulatedPixels: gesture.amount,
        eligibleAtStart: gesture.eligible,
        consumed: gesture.consumed,
        reason: gesture.reason,
        lockRemainingMs: Math.max(0, Math.ceil(state.lockedUntil - performance.now())),
        pending: state.pending,
        phase: state.phase,
        activeAnimations: animations.size,
        reducedMotion: reducedMotion.matches,
        switches: state.switches,
        lastFrom: state.lastFrom,
        lastTo: state.lastTo
      };
    }
  });
})();
