/* Preview adapter derived by prepare-preview.py. Production source is unchanged. */
(() => {
  'use strict';
  const source = window.PortfolioDocument;
  const media = window.PortfolioMedia;
  if (!source || !media || !Array.isArray(source.pages)) return;
  let dialog = null;
  let scroller = null;
  let origin = null;
  let restore = false;
  const imageUrl = value => encodeURI(value);

  function buildDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.id = 'full-portfolio-dialog';
    dialog.className = 'full-portfolio-dialog';
    dialog.setAttribute('aria-labelledby', 'full-portfolio-title');
    dialog.innerHTML = '<header class="full-portfolio-header"><h2 id="full-portfolio-title">完整版作品集</h2><div class="full-portfolio-actions"><a class="full-portfolio-download"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/></svg><span>下载原稿 PDF</span></a><button class="full-portfolio-close" type="button" aria-label="关闭完整版作品集"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div></header><div class="full-portfolio-scroll" tabindex="0" aria-label="完整版作品集原稿，向下滚动浏览"><div class="full-portfolio-document"></div></div>';
    const download = dialog.querySelector('.full-portfolio-download');
    download.href = imageUrl(source.pdf);
    download.download = '钟光英-完整版作品集.pdf';
    scroller = dialog.querySelector('.full-portfolio-scroll');
    const documentElement = dialog.querySelector('.full-portfolio-document');
    const fragments = document.createDocumentFragment();
    source.pages.forEach((page, pageIndex) => {
      const pageMedia = media[page.file];
      if (!pageMedia || !Array.isArray(pageMedia.tiles)) return;
      const sheet = document.createElement('section');
      sheet.className = 'full-portfolio-sheet';
      sheet.dataset.sourcePage = page.id;
      sheet.setAttribute('aria-label', page.title || page.file.replace(/\.png$/i, ''));
      pageMedia.tiles.forEach((tile, tileIndex) => {
        const image = document.createElement('img');
        image.className = 'full-portfolio-tile';
        image.width = tile.width;
        image.height = tile.height;
        image.decoding = 'async';
        image.loading = pageIndex === 0 && tileIndex === 0 ? 'eager' : 'lazy';
        image.alt = tileIndex === 0 ? `作品集原稿：${page.title || page.file.replace(/\.png$/i, '')}` : `${page.title || '作品集原稿'}（续）`;
        image.src = imageUrl(tile.small || tile.src);
        if (tile.small && tile.smallWidth) {
          image.srcset = `${imageUrl(tile.small)} ${tile.smallWidth}w, ${imageUrl(tile.src)} ${tile.width}w`;
          image.sizes = '(min-width: 1534px) 1440px, calc(96vw - 32px)';
        }
        sheet.append(image);
      });
      fragments.append(sheet);
    });
    documentElement.append(fragments);
    document.body.append(dialog);
    dialog.querySelector('.full-portfolio-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rectangle = dialog.getBoundingClientRect();
      if (event.clientX < rectangle.left || event.clientX > rectangle.right || event.clientY < rectangle.top || event.clientY > rectangle.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (!origin) return;
      const saved = origin;
      origin = null;
      if (!restore || location.hash !== saved.hash || saved.view?.hidden) return;
      window.PortfolioMotionNavigation.restore(saved.scroll);
      if (saved.trigger?.isConnected) saved.trigger.focus({ preventScroll: true });
    });
  }

  function open(trigger) {
    buildDialog();
    if (dialog.open) return;
    const view = document.querySelector('#work-view');
    origin = { trigger, view, scroll: window.scrollY, hash: location.hash };
    restore = true;
    dialog.showModal();
    scroller.scrollTop = 0;
    dialog.querySelector('.full-portfolio-close').focus({ preventScroll: true });
  }

  function routeChanged() {
    if (!dialog?.open || !origin) return;
    if (location.hash !== origin.hash || origin.view?.hidden) {
      restore = false;
      dialog.close();
    }
  }

  document.addEventListener('click', event => {
    const link = event.target.closest?.('.directory-pdf-link');
    if (!link) return;
    event.preventDefault();
    open(link);
  });
  window.addEventListener('portfolio:viewchange', routeChanged);
  window.addEventListener('hashchange', routeChanged);
})();
