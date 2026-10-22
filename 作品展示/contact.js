(() => {
  'use strict';
  const qrSource = '关于我/微信二维码.jpg';
  const copyIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>';
  window.PortfolioContact = {
    mount(element) {
      if (!element || element.dataset.contactMounted) return;
      element.dataset.contactMounted = 'true';
      element.innerHTML = `<section class="contact-native" aria-labelledby="contact-native-title">
        <div class="contact-heading-wrap">
          <span class="contact-ghost" aria-hidden="true">THANKS</span>
          <h1 id="contact-native-title"><span>THANK YOU</span><span>FOR WATCHING</span></h1>
        </div>
        <p class="contact-native-description">感谢阅读，期待与您的进一步交流。</p>
        <div class="contact-native-details">
          <button type="button" class="contact-qr-trigger" aria-label="放大微信二维码" aria-haspopup="dialog">
            <span class="contact-qr-window"><img src="${encodeURI(qrSource)}" alt="钟光英的微信二维码" width="658" height="842"></span>
            <span class="contact-qr-label">微信二维码 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m14.5 14.5 5 5M7 10h6M10 7v6"/></svg></span>
          </button>
          <div class="contact-native-links">
            <button type="button" class="contact-native-copy" data-contact-value="13148872416" data-contact-label="电话" aria-label="复制电话 131-4887-2416"><span class="contact-native-kind">Tel</span><span class="contact-native-value">131-4887-2416</span>${copyIcon}<span class="contact-copy-hint">点击复制</span></button>
            <button type="button" class="contact-native-copy" data-contact-value="13148872416@163.com" data-contact-label="邮箱" aria-label="复制邮箱 13148872416@163.com"><span class="contact-native-kind">Email</span><span class="contact-native-value">13148872416@163.com</span>${copyIcon}<span class="contact-copy-hint">点击复制</span></button>
          </div>
        </div>
        <p class="contact-native-status" role="status" aria-live="polite" aria-atomic="true"></p>
      </section>`;
      const dialog = document.createElement('dialog');
      dialog.className = 'contact-zoom-dialog';
      dialog.setAttribute('aria-labelledby', 'contact-zoom-title');
      dialog.innerHTML = `<div class="contact-zoom-toolbar"><h2 id="contact-zoom-title">微信二维码</h2><button type="button" class="contact-zoom-close" aria-label="关闭二维码大图"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><div class="contact-zoom-body"><img src="${encodeURI(qrSource)}" alt="钟光英的完整高清微信二维码，扫码添加好友" width="658" height="842"></div><p class="contact-zoom-caption">扫码添加微信</p>`;
      document.body.append(dialog);
      const trigger = element.querySelector('.contact-qr-trigger');
      const status = element.querySelector('.contact-native-status');
      let timer, savedScroll = 0, zoomWasOpen = false;
      function announce(message) {
        clearTimeout(timer);
        status.textContent = message;
        timer = setTimeout(() => { status.textContent = ''; }, 2600);
      }
      async function copy(value) {
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(value);
            return true;
          }
        } catch (_) { /* Local-file browsers can reject the Clipboard API. */ }
        const previous = document.activeElement;
        const scroll = element.scrollTop;
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.readOnly = true;
        textarea.setAttribute('aria-label', '待复制的联系方式');
        textarea.className = 'contact-copy-buffer';
        document.body.append(textarea);
        textarea.focus({ preventScroll: true });
        textarea.select();
        textarea.setSelectionRange(0, value.length);
        let success = false;
        try { success = document.execCommand('copy'); } catch (_) { /* Status below describes failure. */ }
        textarea.remove();
        if (previous && previous.isConnected) previous.focus({ preventScroll: true });
        element.scrollTop = scroll;
        return success;
      }
      element.querySelectorAll('[data-contact-value]').forEach(button => {
        button.addEventListener('click', async () => {
          const success = await copy(button.dataset.contactValue);
          announce(success ? `${button.dataset.contactLabel}已复制` : '暂时无法自动复制，请选中联系方式复制');
          button.classList.toggle('is-copied', success);
          setTimeout(() => button.classList.remove('is-copied'), 1800);
        });
      });
      trigger.addEventListener('click', () => {
        savedScroll = element.scrollTop;
        dialog.showModal();
        zoomWasOpen = true;
        dialog.querySelector('.contact-zoom-close').focus({ preventScroll: true });
      });
      dialog.querySelector('.contact-zoom-close').addEventListener('click', () => dialog.close());
      dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const box = dialog.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
      });
      dialog.addEventListener('close', () => {
        if (!zoomWasOpen) return;
        zoomWasOpen = false;
        if (element.hidden) return;
        element.scrollTop = savedScroll;
        trigger.focus({ preventScroll: true });
      });
      window.addEventListener('portfolio:viewchange', () => {
        if (element.hidden && dialog.open) dialog.close();
        if (element.hidden) { clearTimeout(timer); status.textContent = ''; }
      });
    }
  };
})();
