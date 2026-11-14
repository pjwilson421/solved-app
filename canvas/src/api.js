// Server calls. Same routes the classic Studio uses (api/hf-*.js, api/claude.js).
async function api(path, body) {
  const r = await fetch('/studio/api' + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(b.error || 'Request failed (' + r.status + ')'); e.status = r.status; throw e; }
  return b;
}

export async function uploadFile(file) {
  const type = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
  const u = await api('/hf-upload', { content_type: type });
  const put = await fetch(u.upload_url, { method: 'PUT', headers: { 'Content-Type': type, ...u.upload_headers }, body: file, credentials: 'omit' });
  if (!put.ok) throw new Error('Upload failed.');
  return u.public_url;
}

async function poll(requestId) {
  const deadline = Date.now() + 22 * 60 * 1000;
  let failures = 0;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, failures ? 8000 : 3000));
    let s;
    try { s = await api('/hf-status?id=' + encodeURIComponent(requestId)); failures = 0; }
    catch (e) { if (e.status === 401) throw e; if (++failures > 10) throw new Error('Status checks failed.'); continue; }
    if (s.status === 'completed') { if (!s.url) throw new Error('No file came back.'); return s; }
    if (['failed', 'nsfw', 'canceled', 'cancelled'].includes(s.status)) throw new Error(s.status === 'nsfw' ? 'Blocked by the model’s content filter.' : 'Generation ' + s.status + '.');
  }
  throw new Error('Timed out.');
}

// Submit once, then poll. Returns { requestId, done: Promise<{url,kind}> } so the request id can be saved.
export async function generateImage({ prompt, references = [], aspect = '16:9', resolution = '2k', quality = 'high' }) {
  const j = await api('/hf-generate', { model: 'gpt_image_2_5', prompt, references, aspect, resolution, quality });
  return j.request_id;
}
export async function generateVideo({ model, prompt, image_url, last_image_url, duration, ratio, resolution, sound }) {
  const j = await api('/hf-video', { model, prompt, image_url, last_image_url, duration, ratio, resolution, sound });
  return j.request_id;
}
export { poll };

export async function claude(messages, max_tokens = 1500) {
  const j = await api('/claude', { messages, max_tokens });
  return j.text || '';
}
