// SOLVED Studio — Higgsfield + Claude client for the hosted (Vercel) build.
// All API keys live on the server (Vercel env vars). The browser only talks to /studio/api/*.
(function () {
  const API = '/studio/api';
  const KEY = 'solved-hf2';
  const PASS = 'solved-studio-pass';
  const DEF = { model: 'server', quality: 'high', resolution: '1k', account: '', enabled: true };
  const store = {
    get() { try { return { ...DEF, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch (e) { return { ...DEF }; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  };
  let cfg = store.get(), live = false, lastError = '';
  const mediaBySrc = new Map();
  const emit = () => window.dispatchEvent(new Event('solved-hf'));
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  let askPass = null;
  function pass() { try { return localStorage.getItem(PASS) || ''; } catch (e) { return ''; } }
  async function api(path, body, method) {
    const res = await fetch(API + path, {
      method: method || (body ? 'POST' : 'GET'),
      headers: { 'Content-Type': 'application/json', 'x-studio-pass': pass() },
      body: body ? JSON.stringify(body) : undefined
    });
    let data = null; try { data = await res.json(); } catch (e) {}
    if (res.status === 401) {
      askPass = askPass || new Promise(ok => setTimeout(() => { const p = window.prompt('SOLVED Studio password'); if (p) { try { localStorage.setItem(PASS, p); } catch (e) {} } askPass = null; ok(!!p); }, 0));
      if (await askPass) return api(path, body, method);
    }
    if (!res.ok) { const err = new Error((data && data.error) || ('Request failed (' + res.status + ')')); lastError = err.message; emit(); throw err; }
    return data;
  }

  async function blobToDataUrl(src) {
    if (/^data:/.test(src)) return src;
    const blob = (window.__resourceBlobs && window.__resourceBlobs[src.split('#')[0]]) || await (await fetch(src)).blob();
    return await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(blob); });
  }
  async function refToUrl(src) {
    if (!src) return null;
    if (/^https:\/\//.test(src)) return src;
    if (!mediaBySrc.has(src)) mediaBySrc.set(src, (async () => (await api('/hf-upload', { dataUrl: await blobToDataUrl(src) })).url)().catch(e => { mediaBySrc.delete(src); throw e; }));
    return mediaBySrc.get(src);
  }

  async function generate({ prompt, references = [], aspect = '1:1', onStatus } = {}) {
    const urls = [];
    for (const r of references.filter(Boolean).slice(0, 4)) { try { const u = await refToUrl(r); if (u) urls.push(u); } catch (e) {} }
    const sub = await api('/hf-generate', { prompt: String(prompt || 'Editorial photograph').slice(0, 5000), aspect_ratio: aspect, references: urls });
    onStatus && onStatus('queued');
    const t0 = Date.now();
    for (;;) {
      if (Date.now() - t0 > 6 * 60 * 1000) throw new Error('Higgsfield timed out after 6 minutes');
      await sleep(3000);
      const s = await api('/hf-status?id=' + encodeURIComponent(sub.request_id));
      onStatus && onStatus(s.status || 'working');
      if (s.status === 'completed') { if (!s.url) throw new Error('Higgsfield returned no image'); live = true; lastError = ''; emit(); return s.url; }
      if (['failed', 'nsfw', 'canceled', 'cancelled'].includes(s.status)) throw new Error('Higgsfield generation ' + (s.status === 'nsfw' ? 'was blocked by moderation' : s.status));
    }
  }
  async function test() { const b = await api('/health'); live = !!b.higgsfield; cfg = { ...cfg, credits: null, plan: 'API' }; store.set(cfg); emit(); return b; }

  window.SOLVED_HF = {
    get: () => ({ ...cfg, available: true, ready: true, live, lastError }),
    set: v => { cfg = { ...cfg, ...v }; store.set(cfg); emit(); },
    connected: () => cfg.enabled !== false,
    generate, test,
    disconnect: () => { cfg = { ...cfg, enabled: false }; store.set(cfg); emit(); }
  };
  window.SOLVED_IMAGE_GEN = opts => window.SOLVED_HF.connected() ? generate(opts) : Promise.reject(new Error('Higgsfield is turned off — open HIGGSFIELD in the sidebar'));

  // Claude (vision + text) through the server
  window.claude = window.claude || {};
  window.claude.complete = async ({ messages, max_tokens }) => (await api('/claude', { messages, max_tokens })).text;
  setTimeout(() => { test().catch(() => {}); }, 0);
})();
