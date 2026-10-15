// Size image previews from the actual output, never the current generation picker.
(function () {
  const dimensions = new Map();
  const watched = new WeakMap();
  function measure(src) {
    if (!dimensions.has(src)) dimensions.set(src, new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve(image.naturalWidth && image.naturalHeight ? [image.naturalWidth, image.naturalHeight] : null);
      image.onerror = () => { dimensions.delete(src); resolve(null); };
      image.src = src;
    }));
    return dimensions.get(src);
  }
  function inspect(element) {
    const background = element.style.backgroundImage;
    const match = /^url\(["']?(.*?)["']?\)$/.exec(background || '');
    if (!match || !match[1]) return;
    let frame = element.parentElement;
    // Template conditionals can add a wrapper between the image and its frame.
    while (frame && !frame.style.aspectRatio && frame !== document.body) {
      if (!/^(SC-|TEMPLATE)/.test(frame.tagName)) return;
      frame = frame.parentElement;
    }
    if (!frame || !frame.style.aspectRatio) return; // Leave tiny reference chips alone.
    const src = match[1];
    if (watched.get(element) === src && frame.style.getPropertyPriority('aspect-ratio') === 'important') return;
    watched.set(element, src);
    measure(src).then(size => {
      if (!size || !element.isConnected || element.style.backgroundImage !== background) return;
      const ratio = size[0] + ' / ' + size[1];
      const card = frame.parentElement, gallery = card?.parentElement;
      if (gallery && (gallery.classList.contains('character-sheet-grid') || gallery.style.gridTemplateColumns.includes('repeat('))) {
        gallery.classList.add('equal-height-gallery');
        card.classList.add('equal-height-card');
        frame.classList.add('equal-height-image');
        card.style.setProperty('--image-ratio', String(size[0] / size[1]));
        // Match empty/add cards to the same image height.
        for (const sibling of gallery.children) {
          sibling.classList.add('equal-height-card');
          const empty = sibling.querySelector('[data-sv="newbox"]');
          if (empty) empty.classList.add('equal-height-image');
        }
      }
      if (frame.style.aspectRatio !== ratio || frame.style.getPropertyPriority('aspect-ratio') !== 'important') frame.style.setProperty('aspect-ratio', ratio, 'important');
      if (element.style.backgroundSize !== 'contain') element.style.backgroundSize = 'contain';
      element.style.backgroundRepeat = 'no-repeat';
      element.style.backgroundPosition = 'center';
    });
  }
  function scan(root) {
    if (root.nodeType !== 1) return;
    inspect(root);
    root.querySelectorAll('[style*="background-image"]').forEach(inspect);
  }
  function start() {
    scan(document.body);
    new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'childList') record.addedNodes.forEach(scan);
        else { inspect(record.target); record.target.querySelectorAll('[style*="background-image"]').forEach(inspect); }
      }
    }).observe(document.body, {subtree:true,childList:true,attributes:true,attributeFilter:['style']});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
