/* Upgrade the legacy templated controls without replacing their existing handlers. */
(function () {
  'use strict';
  function upgrade(root) {
    var nodes = [];
    if (root.nodeType !== 1) return;
    if (root.matches('[data-sv="navi"], [data-sv="gobtn"], [data-sv="proj"], [data-sv="libfile"]')) nodes.push(root);
    root.querySelectorAll('[data-sv="navi"], [data-sv="gobtn"], [data-sv="proj"], [data-sv="libfile"]').forEach(function (el) { nodes.push(el); });
    nodes.forEach(function (el) {
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      if (el.dataset.sv === 'navi') {
        if (el.getAttribute('data-on') === '1') el.setAttribute('aria-current', 'page');
        else el.removeAttribute('aria-current');
      }
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target;
    if (!el || !el.matches('[role="button"]') || el.matches('button,input,textarea,select') || el.isContentEditable) return;
    e.preventDefault(); el.click();
  });
  function start() {
    upgrade(document.body);
    new MutationObserver(function (changes) {
      changes.forEach(function (m) {
        if (m.type === 'attributes') upgrade(m.target);
        else m.addedNodes.forEach(upgrade);
      });
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-on'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
