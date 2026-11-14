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

// Same-origin copy of a remote file (see api/media.js).
export const mediaUrl = (url, name) => '/studio/api/media?url=' + encodeURIComponent(url) + (name ? '&name=' + encodeURIComponent(name) : '');
export async function loadBlob(url) {
  if (url.startsWith('blob:') || url.startsWith('data:')) return (await fetch(url)).blob();
  const r = await fetch(mediaUrl(url));
  if (!r.ok) throw new Error('Could not load the image.');
  return r.blob();
}
export async function loadImage(url) {
  const bmp = await createImageBitmap(await loadBlob(url));
  return bmp;
}
export function canvasBlob(canvas, type = 'image/png', q = 0.92) {
  return new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('Export failed.')), type, q));
}
export async function convert(url, type) {
  const bmp = await loadImage(url);
  const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
  const g = c.getContext('2d'); if (type === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
  g.drawImage(bmp, 0, 0);
  return canvasBlob(c, type);
}
export async function downloadUrl(url, name, format = 'original') {
  let blob;
  if (format === 'png') blob = await convert(url, 'image/png');
  else if (format === 'jpg') blob = await convert(url, 'image/jpeg');
  else blob = await loadBlob(url);
  const ext = format !== 'original' ? format : (blob.type.split('/')[1] || 'bin').replace('jpeg', 'jpg').replace('quicktime', 'mov');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = (name || 'solved').replace(/[^\w.-]+/g, '-').slice(0, 60) + '.' + ext;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
// Dominant colors (simple median-ish bucketing).
export async function palette(url, n = 6) {
  const bmp = await loadImage(url);
  const c = document.createElement('canvas'); const s = 80; c.width = s; c.height = Math.round(s * bmp.height / bmp.width) || s;
  const g = c.getContext('2d'); g.drawImage(bmp, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height).data, buckets = new Map();
  for (let i = 0; i < d.length; i += 4) {
    const k = (d[i] >> 5) + ',' + (d[i + 1] >> 5) + ',' + (d[i + 2] >> 5);
    const b = buckets.get(k) || [0, 0, 0, 0]; b[0] += d[i]; b[1] += d[i + 1]; b[2] += d[i + 2]; b[3]++; buckets.set(k, b);
  }
  const hex = v => Math.round(v).toString(16).padStart(2, '0');
  const picked = [];
  [...buckets.values()].sort((a, b) => b[3] - a[3]).forEach(b => {
    const rgb = [b[0] / b[3], b[1] / b[3], b[2] / b[3]];
    if (picked.length < n && picked.every(p => Math.hypot(p[0] - rgb[0], p[1] - rgb[1], p[2] - rgb[2]) > 48)) picked.push(rgb);
  });
  return picked.map(p => '#' + p.map(hex).join(''));
}
