/* Local, once-per-node motion for index-motion-preview.html. */
(() => {
  'use strict';
  if (!document.documentElement.classList.contains('motion-preview') || window.PortfolioMotionEffects) return;

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canAnimate = typeof Element.prototype.animate === 'function' && 'IntersectionObserver' in window;
  // One entrance rhythm for all four pages; timing is maintained here only.
  const entranceTiming = Object.freeze({ duration: 800, stagger: 140, easing: 'cubic-bezier(.32,0,.2,1)' });
  const records = new Map();
  const floating = new Map();
  const iconPrepared = new WeakSet();
  const artPrepared = new WeakSet();
  const initialRoute = location.hash;
  const openedBelowHome = /^#(?:about|work|contact)(?:\/|$)/.test(initialRoute);
  let serial = 0;
  let scanFrame = 0;
  let started = false;
  let magnetMeasureFrame = 0;
  let entranceObserver;
  let floatObserver;

  function measureSettledLetters() {
    if (magnetMeasureFrame) return;
    magnetMeasureFrame = requestAnimationFrame(() => {
      magnetMeasureFrame = 0;
      // Refresh the existing letter-anchor cache without fitting/scaling the
      // composition again. Icon/portrait finishes do not affect anchor boxes.
      window.dispatchEvent(new Event('scroll'));
    });
  }

  function finish(record) {
    if (record.animation) {
      const animation = record.animation;
      record.animation = null;
      animation.onfinish = null;
      animation.oncancel = null;
      animation.cancel();
    }
    record.state = 'complete';
    if (record.kind === 'home-title') measureSettledLetters();
    if (record.kind === 'home-icon') {
      const layer = record.element.querySelector('.motion-icon-float');
      if (layer) updateFloat(layer, floating.get(layer) || false);
    }
  }

  function reveal(record) {
    if (record.entered) return;
    // The embedded headline font controls the original scene's ready state.
    // Start the intro only once that scene can actually be painted.
    if (record.kind.startsWith('home-') && !record.element.closest('.composition')?.classList.contains('is-ready')) return;
    if (!canAnimate || motionQuery.matches || !record.element.isConnected) {
      record.entered = true;
      entranceObserver?.unobserve(record.element);
      finish(record);
      return;
    }
    // All section entrances wait for the same camera hand-off. The initial
    // Home intro instead follows its existing font/scene readiness check.
    const deferred = !record.kind.startsWith('home-') && (window.PortfolioMotionNavigation?.getState().phase || 'idle') !== 'idle';
    if (deferred && record.animation) return;
    if (!deferred) {
      record.entered = true;
      entranceObserver?.unobserve(record.element);
    }
    record.state = deferred ? 'queued' : 'running';
    try {
      const frames = [
        { opacity: 0, transform: record.from },
        { opacity: 1, transform: record.to }
      ];
      if (!record.animation) record.animation = record.element.animate(frames, {
        duration: record.duration,
        delay: record.delay,
        easing: entranceTiming.easing,
        fill: 'both'
      });
      record.animation.onfinish = () => finish(record);
      record.animation.oncancel = () => { record.animation = null; record.state = 'complete'; };
      if (deferred) {
        record.animation.pause();
        record.animation.currentTime = 0;
      } else {
        record.animation.play();
      }
    } catch (_) {
      // Original styles remain visible if animation support is incomplete.
      record.entered = true;
      entranceObserver?.unobserve(record.element);
      finish(record);
    }
  }

  function register(element, kind, order, from, skip) {
    if (!element || records.has(element)) return;
    const record = {
      id: ++serial, element, kind, duration: entranceTiming.duration, delay: order * entranceTiming.stagger, from,
      to: kind === 'home-portrait' ? 'translate3d(0,0,0) scale(1)' : kind.startsWith('home-') ? 'translate3d(0,0,0)' : 'none',
      entered: false, state: 'waiting', animation: null
    };
    records.set(element, record);
    if (skip || !canAnimate || motionQuery.matches) {
      record.entered = true;
      finish(record);
    } else {
      entranceObserver.observe(element);
    }
  }

  function wrapPositioned(element, className) {
    if (!element) return null;
    if (element.parentElement?.classList.contains(className)) return element.parentElement;
    const layer = document.createElement('div');
    layer.className = className;
    element.before(layer);
    layer.append(element);
    return layer;
  }

  function updateFloat(layer, visible) {
    floating.set(layer, visible);
    const entrance = records.get(layer.parentElement);
    layer.classList.toggle('is-motion-visible', visible && entrance?.state === 'complete' && !document.hidden && !motionQuery.matches);
  }

  function prepareHome() {
    const home = document.querySelector('#home-view');
    if (!home) return;
    const portrait = wrapPositioned(home.querySelector('.portrait'), 'motion-portrait-layer');
    const title = wrapPositioned(home.querySelector('.portfolio'), 'motion-title-layer');
    register(title, 'home-title', 0, 'translate3d(0,24px,0)', openedBelowHome);
    register(portrait, 'home-portrait', 0, 'translate3d(0,0,0) scale(.96)', openedBelowHome);
    home.querySelectorAll('[data-magnetic]').forEach((anchor, index) => {
      if (iconPrepared.has(anchor)) return;
      const item = anchor.querySelector('.magnetic-item');
      if (!item) return;
      iconPrepared.add(anchor);
      const enter = document.createElement('div');
      const float = document.createElement('div');
      enter.className = 'motion-icon-enter';
      float.className = 'motion-icon-float';
      float.style.setProperty('--motion-float-distance', [5, 7, 4, 6, 8, 5, 7, 6][index % 8] + 'px');
      float.style.setProperty('--motion-float-duration', [5.2, 4.6, 5.7, 4.9, 6, 4.4, 5.5, 4.8][index % 8] + 's');
      // Start at rest after the entrance, avoiding a second moving transform
      // while the icon is still fading in.
      float.style.setProperty('--motion-float-phase', '0s');
      while (item.firstChild) float.append(item.firstChild);
      enter.append(float);
      item.append(enter);
      register(enter, 'home-icon', index + 1, 'translate3d(0,22px,0)', openedBelowHome);
      floating.set(float, false);
      floatObserver?.observe(anchor);
    });
  }

  function prepareDirectory(root) {
    root.querySelectorAll('.directory-project').forEach((project, index) => {
      const art = project.querySelector('.directory-art');
      if (art && !artPrepared.has(art)) {
        artPrepared.add(art);
        const layer = document.createElement('div');
        layer.className = 'motion-directory-art';
        while (art.firstChild) layer.append(art.firstChild);
        art.append(layer);
      }
      const arrow = project.querySelector('.directory-action svg');
      if (arrow && arrow.getAttribute('viewBox') !== '0 0 36 24') {
        arrow.setAttribute('viewBox', '0 0 36 24');
        arrow.querySelector('path')?.setAttribute('d', 'M3 12h30M27 6l6 6-6 6');
      }
      register(project, 'work-card', index + 1, 'translate3d(0,30px,0) scale(.98)');
    });
    register(root.querySelector('#works-heading'), 'work-title', 0, 'translate3d(0,24px,0)');
  }

  function revealSettledContent() {
    const top = document.querySelector('.header')?.getBoundingClientRect().bottom || 0;
    records.forEach(record => {
      if (record.entered || record.kind.startsWith('home-') || !record.element.isConnected || !record.element.getClientRects().length) return;
      const bounds = record.element.getBoundingClientRect();
      if (bounds.bottom > top && bounds.top < innerHeight) reveal(record);
    });
  }

  function scan() {
    scanFrame = 0;
    prepareHome();
    document.querySelectorAll('#about-view .about-section').forEach((section, index) => {
      register(section, 'about-block', index, 'translate3d(0,16px,0)');
    });
    const work = document.querySelector('#work-view');
    if (work) prepareDirectory(work);
    const contact = document.querySelector('#contact-view');
    if (contact) {
      register(contact.querySelector('.contact-heading-wrap'), 'contact-title', 0, 'translate3d(0,24px,0)');
      register(contact.querySelector('.contact-native-description'), 'contact-description', 1, 'translate3d(0,16px,0)');
      register(contact.querySelector('.contact-qr-trigger'), 'contact-qr', 2, 'translate3d(0,16px,0)');
      contact.querySelectorAll('.contact-native-copy').forEach((button, index) => {
        register(button, 'contact-detail', 3 + index, 'translate3d(0,16px,0)');
      });
    }
  }

  function scheduleScan() {
    if (!scanFrame) scanFrame = requestAnimationFrame(scan);
  }

  function syncMotionPreference() {
    if (motionQuery.matches) {
      records.forEach(record => {
        entranceObserver?.unobserve(record.element);
        record.entered = true;
        finish(record);
      });
    }
    floating.forEach((visible, layer) => updateFloat(layer, visible));
  }

  function getState() {
    const targets = [...records.values()].filter(record => record.element.isConnected).map(record => Object.freeze({
      id: record.id,
      kind: record.kind,
      duration: record.duration,
      delay: record.delay,
      entered: record.entered,
      state: record.state
    }));
    return Object.freeze({
      started,
      timing: entranceTiming,
      reducedMotion: motionQuery.matches,
      supported: canAnimate,
      targets: Object.freeze(targets),
      floating: Object.freeze([...floating].filter(([layer]) => layer.isConnected).map(([layer, visible]) => Object.freeze({
        visible,
        running: layer.classList.contains('is-motion-visible'),
        distance: layer.style.getPropertyValue('--motion-float-distance'),
        duration: layer.style.getPropertyValue('--motion-float-duration')
      })))
    });
  }

  Object.defineProperty(window, 'PortfolioMotionEffects', {
    value: Object.freeze({ getState }), writable: false, configurable: false
  });

  function start() {
    if (started) return;
    started = true;
    if (canAnimate) {
      entranceObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const record = records.get(entry.target);
            if (record) reveal(record);
          }
        });
      }, { threshold: .08 });
      floatObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const layer = entry.target.querySelector('.motion-icon-float');
          if (layer) updateFloat(layer, entry.isIntersecting);
        });
      }, { threshold: 0 });
    }
    scan();
    const composition = document.querySelector('#home-view .composition');
    if (composition && !composition.classList.contains('is-ready') && canAnimate) {
      const readyObserver = new MutationObserver(() => {
        if (!composition.classList.contains('is-ready')) return;
        readyObserver.disconnect();
        records.forEach(record => {
          if (!record.entered && record.kind.startsWith('home-')) {
            entranceObserver.unobserve(record.element);
            entranceObserver.observe(record.element);
          }
        });
      });
      readyObserver.observe(composition, { attributes: true, attributeFilter: ['class'] });
    }
    const delayedRoots = [document.querySelector('#work-view'), document.querySelector('#contact-view')].filter(Boolean);
    const observer = new MutationObserver(scheduleScan);
    delayedRoots.forEach(root => observer.observe(root, { childList: true, subtree: true }));
    window.addEventListener('portfolio:route-rendered', scheduleScan);
    document.addEventListener('portfolio:route-rendered', scheduleScan);
    window.addEventListener('portfolio:motion-settled', revealSettledContent);
    document.addEventListener('visibilitychange', () => {
      floating.forEach((visible, layer) => updateFloat(layer, visible));
    });
    motionQuery.addEventListener('change', syncMotionPreference);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
