// Local HTML needs a Blob URL because Chrome may ignore download on file: PDFs.
(() => {
  'use strict';

  if (window.location.protocol !== 'file:') return;

  const selector = 'a.about-portfolio-download, a.full-portfolio-download';
  const scriptURL = document.currentScript?.src;
  const dataURL = scriptURL
    ? new URL('portfolio-download-local.js', scriptURL).href
    : new URL('作品展示/portfolio-download-local.js', document.baseURI).href;
  const chunkLength = 262144; // A multiple of four keeps each base64 chunk valid.
  const busyLinks = new WeakSet();
  const errorMessages = new WeakMap();
  let dataPromise;
  let blobPromise;

  function validateData(data) {
    if (!data || typeof data.base64 !== 'string' || !data.base64.length ||
        data.base64.length % 4 !== 0 || !/^[a-f\d]{64}$/i.test(data.sha256 || '') ||
        !Number.isSafeInteger(data.byteLength) || data.byteLength <= 0) {
      throw new Error('Invalid local portfolio download data.');
    }
    return data;
  }

  function loadData() {
    if (dataPromise) return dataPromise;
    dataPromise = new Promise((resolve, reject) => {
      if (window.PortfolioPDFDownloadData) {
        try {
          resolve(validateData(window.PortfolioPDFDownloadData));
        } catch (error) {
          reject(error);
        }
        return;
      }
      const script = document.createElement('script');
      script.src = dataURL;
      script.async = true;
      script.onload = () => {
        try {
          resolve(validateData(window.PortfolioPDFDownloadData));
        } catch (error) {
          script.remove();
          reject(error);
        }
      };
      script.onerror = () => {
        script.remove();
        reject(new Error('The local portfolio download data could not be loaded.'));
      };
      document.head.append(script);
    }).catch(error => {
      dataPromise = undefined;
      throw error;
    });
    return dataPromise;
  }

  function getPDFBlob() {
    if (blobPromise) return blobPromise;
    blobPromise = loadData().then(async data => {
      const chunks = [];
      let byteLength = 0;
      for (let offset = 0, count = 0; offset < data.base64.length; offset += chunkLength) {
        const binary = atob(data.base64.slice(offset, offset + chunkLength));
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }
        chunks.push(bytes);
        byteLength += bytes.length;
        // Let the preparing label paint while decoding a large local PDF.
        if (++count % 8 === 0) await new Promise(resolve => setTimeout(resolve, 0));
      }
      if (byteLength !== data.byteLength || !chunks[0] ||
          String.fromCharCode(...chunks[0].subarray(0, 5)) !== '%PDF-') {
        throw new Error('The local portfolio PDF is incomplete.');
      }
      return new Blob(chunks, { type: 'application/pdf' });
    }).catch(error => {
      blobPromise = undefined;
      throw error;
    });
    return blobPromise;
  }

  function showError(link) {
    let status = errorMessages.get(link);
    if (!status) {
      status = document.createElement('span');
      status.className = 'attachment-download-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.style.cssText = 'display:block;margin-top:8px;font-size:.875em;color:inherit;';
      link.insertAdjacentElement('afterend', status);
      errorMessages.set(link, status);
    }
    status.textContent = '暂时无法准备下载，请确认本地下载文件完整后重试。';
  }

  async function download(link) {
    if (busyLinks.has(link)) return;
    busyLinks.add(link);
    const label = link.querySelector('span');
    const labelText = label?.textContent;
    const previousBusy = link.getAttribute('aria-busy');
    const status = errorMessages.get(link);
    if (status) status.textContent = '';
    link.setAttribute('aria-busy', 'true');
    if (label) label.textContent = '正在准备下载…';

    try {
      const blob = await getPDFBlob();
      const objectURL = URL.createObjectURL(blob);
      const temporaryLink = document.createElement('a');
      temporaryLink.href = objectURL;
      temporaryLink.download = link.download || '完整作品集.pdf';
      temporaryLink.hidden = true;
      document.body.append(temporaryLink);
      try {
        temporaryLink.click();
      } finally {
        temporaryLink.remove();
        setTimeout(() => URL.revokeObjectURL(objectURL), 60000);
      }
    } catch (_) {
      showError(link);
    } finally {
      if (label) label.textContent = labelText;
      if (previousBusy === null) link.removeAttribute('aria-busy');
      else link.setAttribute('aria-busy', previousBusy);
      busyLinks.delete(link);
    }
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey ||
        event.metaKey || event.shiftKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const link = target?.closest(selector);
    if (!link) return;
    event.preventDefault();
    void download(link);
  });
})();
