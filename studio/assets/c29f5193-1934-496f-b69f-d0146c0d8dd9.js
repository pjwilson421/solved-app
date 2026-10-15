// Higgsfield client for SOLVED Studio — runs through the viewer's claude.ai Higgsfield connector.
// No API keys: calls use the signed-in viewer's own Higgsfield account and credits.
(function () {
  const SERVER = 'Higgsfield';
  const KEY = 'solved-hf2';
  const DEF = { model: 'gpt_image_2_5', quality: 'high', resolution: '1k', account: '', enabled: true };
  const store = {
    get() { try { return { ...DEF, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch (e) { return { ...DEF }; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  };
  let cfg = store.get();
  let mcp = null, ready = false, live = false, lastError = '';
  const jobByUrl = new Map(); // result URL -> job_id, so earlier generations can be reused as references
  const mediaBySrc = new Map(); // reference src -> media_id (avoid re-uploading)
  const emit = () => window.dispatchEvent(new Event('solved-hf'));
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // Resolve the mcp capability once; the page renders without it and lights up when it arrives.
  (async () => {
    try { mcp = window.claude && window.claude.use ? await window.claude.use('mcp') : null; } catch (e) { mcp = null; }
    ready = true; emit();
  })();

  function friendly(e) {
    const c = e && e.code;
    if (c === 'server_not_connected' || c === 'selection_required') return 'Add Higgsfield in claude.ai Settings → Connectors';
    if (c === 'needs_reauth') return 'Reconnect Higgsfield in claude.ai Settings → Connectors';
    if (c === 'not_in_manifest' || c === 'approval_required' || c === 'consent_required') return 'Higgsfield isn’t allowed for this page yet — allow it when asked';
    if (c === 'blocked_by_policy') return 'Your organization blocks this Higgsfield tool';
    if (c === 'not_granted' || c === 'capability_disabled' || c === 'capability_removed') return 'Open this page inside Claude to use Higgsfield';
    if (c === 'server_unavailable') return 'Higgsfield didn’t answer — try again';
    if (c === 'tool_error') return 'Higgsfield: ' + String(e.message || 'request failed').slice(0, 160);
    return (e && e.message) || 'Higgsfield request failed';
  }
  async function call(tool, input) {
    if (!mcp) throw new Error(ready ? 'Open this page inside Claude to use Higgsfield' : 'Higgsfield is still loading — try again in a moment');
    try {
      const r = await mcp.callTool(SERVER, tool, input, { cache: false });
      let p = r && r.payload;
      if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) {} }
      return p;
    } catch (e) {
      const err = new Error(friendly(e)); err.code = e && e.code; lastError = err.message; live = false; emit(); throw err;
    }
  }

  // ---- references ----
  async function refToMedia(src) {
    if (!src) return null;
    if (jobByUrl.has(src)) return jobByUrl.get(src);
    if (mediaBySrc.has(src)) return mediaBySrc.get(src);
    let id = null;
    if (/^https:\/\//.test(src)) {
      const r = await call('media_import_url', { url: src, type: 'image' });
      id = r && (r.media_id || r.id);
    } else {
      const blob = await (await fetch(src)).blob();
      const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/png';
      const ext = (type.split('/')[1] || 'png').replace('jpeg', 'jpg');
      const r = await call('media_upload', { filename: 'reference.' + ext, content_type: type });
      const u = r && r.uploads && r.uploads[0];
      if (!u || !u.upload_url) throw new Error('Higgsfield didn’t return an upload slot');
      let res;
      try { res = await fetch(u.upload_url, { method: 'PUT', headers: { 'Content-Type': u.content_type || type, 'If-None-Match': '*' }, body: blob }); }
      catch (e) { throw new Error('This browser couldn’t upload the reference image to Higgsfield'); }
      if (!res.ok) throw new Error('Reference upload failed (' + res.status + ')');
      await call('media_confirm', { type: 'image', media_id: u.media_id });
      id = u.media_id;
    }
    if (id) mediaBySrc.set(src, id);
    return id;
  }

  // ---- generation ----
  const ASPECTS = ['auto', '1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16', '21:9', '4:5', '5:4'];
  async function generate({ prompt, references = [], aspect, onStatus, model, quality, resolution } = {}) {
    if (!aspect) aspect = cfg.ratio || '1:1';   // the prompt bar's ratio is the default when a view doesn't force one
    const medias = [], skipped = [];
    for (const r of references.filter(Boolean).slice(0, 8)) {
      try { const id = await refToMedia(r); if (id) medias.push({ value: id, role: 'image_references' }); }
      catch (e) { skipped.push(e.message); }
    }
    if (skipped.length && !medias.length && references.length) onStatus && onStatus('references skipped');
    // per-call settings win over the stored defaults, so each page can carry its own
    const params = {
      model: model || cfg.model || DEF.model,
      prompt: String(prompt || 'Editorial photograph').slice(0, 5000),
      aspect_ratio: ASPECTS.includes(aspect) ? aspect : '1:1',
      quality: quality || cfg.quality || 'high', resolution: resolution || cfg.resolution || '1k',
      count: 1, use_unlim: false   // one image per request; the app only ever uses one
    };
    if (medias.length) params.medias = medias;
    const sub = await call('generate_image_batch', { context: 'SOLVED Studio campaign image generation', requests: [{ index: 0, params }] });
    const job = sub && ((sub.jobs && sub.jobs[0]) || (sub.results && sub.results[0]) || sub);
    const jobId = job && (job.job_id || job.id);
    if (!jobId) throw new Error('Higgsfield: ' + ((job && (job.error || job.message)) || (sub && (sub.error || sub.message)) || 'the request wasn’t accepted'));
    onStatus && onStatus('queued');
    const t0 = Date.now();
    for (;;) {
      if (Date.now() - t0 > 6 * 60 * 1000) throw new Error('Higgsfield timed out after 6 minutes');
      const w = await call('jobs_wait', { jobs: [{ index: 0, job_id: jobId }], timeout_seconds: 15 });
      const j = w && w.jobs && w.jobs[0];
      const st = j && j.status;
      onStatus && onStatus(st || 'working');
      if (st === 'completed') {
        const url = j.result_url || (j.results && (j.results.rawUrl || j.results.url));
        if (!url) throw new Error('Higgsfield returned no image');
        jobByUrl.set(url, jobId);
        live = true; lastError = ''; emit();
        return url;
      }
      if (['failed', 'nsfw', 'canceled', 'cancelled', 'error'].includes(st)) throw new Error('Higgsfield generation ' + (st === 'nsfw' ? 'was blocked by moderation' : st));
      if (w && w.all_terminal && !st) throw new Error('Higgsfield lost track of the job');
      if (w && w.poll_after_seconds) await sleep(Math.min(5000, w.poll_after_seconds * 1000));
    }
  }

  async function test() {
    const b = await call('balance', {});
    live = true; lastError = '';
    cfg = { ...cfg, credits: b && b.credits, plan: b && b.subscription_plan_type }; store.set(cfg); emit();
    return b;
  }

  window.SOLVED_HF = {
    get: () => ({ ...cfg, available: !!mcp, ready, live, lastError }),
    set: v => { cfg = { ...cfg, ...v }; store.set(cfg); emit(); },
    connected: () => !!mcp && cfg.enabled !== false,
    generate, test,
    disconnect: () => { cfg = { ...cfg, enabled: false }; store.set(cfg); emit(); }
  };
  window.SOLVED_IMAGE_GEN = opts => {
    if (!window.SOLVED_HF.connected()) return Promise.reject(new Error(mcp ? 'Higgsfield is turned off — open HIGGSFIELD in the sidebar' : 'Open this page inside Claude to use Higgsfield'));
    return generate(opts);
  };
})();
