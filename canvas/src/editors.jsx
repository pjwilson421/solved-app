import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { I } from './icons.jsx';
import { Modal } from './menu.jsx';
import { loadImage, canvasBlob } from './api.js';
import { LABELS, IMAGE_MODELS, VIDEO_MODELS } from './models.js';
import { Mic } from './nodes.jsx';

export function Lightbox({ node, onClose }) {
  useEffect(() => { const k = e => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
  return createPortal(
    <div className="lightbox" onPointerDown={e => e.target === e.currentTarget && onClose()}>
      <button className="lb-close" onClick={onClose} aria-label="Close">{I.close({ size: 18 })}</button>
      {node.data.kind === 'video' ? <video src={node.data.url} controls autoPlay loop /> : <img src={node.data.url} alt="" />}
    </div>, document.body);
}

export function InfoPanel({ node, source, onClose }) {
  const d = node.data, s = source?.data || {};
  const model = d.modelName || IMAGE_MODELS.find(m => m.key === s.model)?.name || VIDEO_MODELS[s.model]?.name;
  const rows = [
    ['Type', d.kind === 'video' ? 'Video' : 'Image'],
    ['Model', model],
    ['Prompt', d.prompt || s.prompt],
    ['Aspect ratio', d.aspect],
    ['Resolution', s.resolution?.toUpperCase() || s.res],
    ['Duration', s.duration ? s.duration + 's' : null],
    ['Label', LABELS.find(l => l.key === d.label2)?.name],
    ['Rating', d.rating === 1 ? 'Good' : d.rating === -1 ? 'Bad' : null],
    ['Created', d.created ? new Date(d.created).toLocaleString() : null],
    ['References', (s.refs || []).length || null],
  ].filter(r => r[1]);
  return (
    <aside className="info-panel">
      <div className="modal-head"><b>Info</b><button className="ic-btn" onClick={onClose} aria-label="Close">{I.close({ size: 14 })}</button></div>
      {d.url && (d.kind === 'video' ? <video src={d.url} muted className="info-thumb" /> : <img src={d.url} alt="" className="info-thumb" />)}
      <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      {d.url && <a className="chip info-link" href={d.url} target="_blank" rel="noreferrer">Open file</a>}
    </aside>
  );
}

const CROPS = [['Free', null], ['1:1', 1], ['16:9', 16 / 9], ['9:16', 9 / 16], ['4:3', 4 / 3], ['3:4', 3 / 4], ['21:9', 21 / 9]];

// Crop: drag a box over the image, export the region as a new image.
export function CropEditor({ url, onSave, onClose }) {
  const [bmp, setBmp] = useState(null);
  const [err, setErr] = useState('');
  const [ratio, setRatio] = useState(null);
  const [box, setBox] = useState({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
  const wrap = useRef();
  useEffect(() => { loadImage(url).then(setBmp).catch(e => setErr(e.message)); }, [url]);
  const applyRatio = r => {
    setRatio(r);
    if (!r || !bmp) return;
    const ir = bmp.width / bmp.height;
    let w = 0.8, h = (w * ir) / r;
    if (h > 0.9) { h = 0.9; w = (h * r) / ir; }
    setBox({ x: (1 - w) / 2, y: (1 - h) / 2, w, h });
  };
  const drag = (e, mode) => {
    e.preventDefault(); e.stopPropagation();
    const r = wrap.current.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, b0 = { ...box };
    const ir = bmp.width / bmp.height;
    const move = ev => {
      const dx = (ev.clientX - sx) / r.width, dy = (ev.clientY - sy) / r.height;
      let b = { ...b0 };
      if (mode === 'move') { b.x = Math.min(1 - b.w, Math.max(0, b0.x + dx)); b.y = Math.min(1 - b.h, Math.max(0, b0.y + dy)); }
      else {
        b.w = Math.max(0.05, Math.min(1 - b0.x, b0.w + dx));
        b.h = ratio ? (b.w * ir) / ratio : Math.max(0.05, Math.min(1 - b0.y, b0.h + dy));
        if (b.y + b.h > 1) { b.h = 1 - b.y; if (ratio) b.w = (b.h * ratio) / ir; }
      }
      setBox(b);
    };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  };
  const save = async () => {
    const c = document.createElement('canvas');
    c.width = Math.round(box.w * bmp.width); c.height = Math.round(box.h * bmp.height);
    c.getContext('2d').drawImage(bmp, box.x * bmp.width, box.y * bmp.height, c.width, c.height, 0, 0, c.width, c.height);
    onSave(await canvasBlob(c), c.width + ':' + c.height);
    onClose();
  };
  return (
    <Modal title="Crop" onClose={onClose} wide>
      <div className="ed-tools">{CROPS.map(([l, r]) => <button key={l} className={'chip' + (ratio === r ? ' on' : '')} onClick={() => applyRatio(r)}>{l}</button>)}</div>
      <div className="ed-stage">
        {err && <div className="err">{err}</div>}
        {!bmp && !err && <div className="shimmer ed-load"><span>Loading…</span></div>}
        {bmp && (
          <div ref={wrap} className="crop-wrap" style={{ aspectRatio: bmp.width + '/' + bmp.height }}>
            <img src={url} alt="" draggable={false} />
            <div className="crop-box" style={{ left: box.x * 100 + '%', top: box.y * 100 + '%', width: box.w * 100 + '%', height: box.h * 100 + '%' }} onPointerDown={e => drag(e, 'move')}>
              <span className="crop-handle" onPointerDown={e => drag(e, 'size')} />
            </div>
          </div>
        )}
      </div>
      <div className="modal-foot"><button className="chip" onClick={onClose}>Cancel</button><button className="go" disabled={!bmp} onClick={save}>Save crop</button></div>
    </Modal>
  );
}

// Annotate: draw on top of the image, save as a new image (good as a reference for edits).
export function AnnotateEditor({ url, onSave, onClose }) {
  const [bmp, setBmp] = useState(null);
  const [err, setErr] = useState('');
  const [color, setColor] = useState('#e5484d');
  const [size, setSize] = useState(6);
  const cv = useRef();
  const strokes = useRef([]);
  useEffect(() => { loadImage(url).then(setBmp).catch(e => setErr(e.message)); }, [url]);
  const redraw = () => {
    const c = cv.current; if (!c || !bmp) return;
    const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0);
    strokes.current.forEach(s => { g.strokeStyle = s.color; g.lineWidth = s.size; g.lineCap = g.lineJoin = 'round'; g.beginPath(); s.pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); });
  };
  useEffect(() => { if (bmp) { cv.current.width = bmp.width; cv.current.height = bmp.height; redraw(); } }, [bmp]);
  const down = e => {
    const c = cv.current, r = c.getBoundingClientRect(), k = c.width / r.width;
    const s = { color, size: size * k, pts: [] }; strokes.current.push(s);
    const add = ev => { s.pts.push([(ev.clientX - r.left) * k, (ev.clientY - r.top) * k]); redraw(); };
    add(e);
    const up = () => { removeEventListener('pointermove', add); removeEventListener('pointerup', up); };
    addEventListener('pointermove', add); addEventListener('pointerup', up);
  };
  return (
    <Modal title="Annotate" onClose={onClose} wide>
      <div className="ed-tools">
        {['#e5484d', '#1985FF', '#22a55b', '#f5c518', '#ffffff', '#111111'].map(c => <button key={c} className={'swatch' + (c === color ? ' on' : '')} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />)}
        <span className="sb-sep" />
        {[3, 6, 12].map(s => <button key={s} className={'chip' + (s === size ? ' on' : '')} onClick={() => setSize(s)}>{s === 3 ? 'Thin' : s === 6 ? 'Medium' : 'Thick'}</button>)}
        <button className="chip" onClick={() => { strokes.current.pop(); redraw(); }}>Undo</button>
      </div>
      <div className="ed-stage">
        {err && <div className="err">{err}</div>}
        {!bmp && !err && <div className="shimmer ed-load"><span>Loading…</span></div>}
        <canvas ref={cv} className="ann-canvas" style={{ display: bmp ? 'block' : 'none' }} onPointerDown={down} />
      </div>
      <div className="modal-foot"><button className="chip" onClick={onClose}>Cancel</button>
        <button className="go" disabled={!bmp} onClick={async () => { onSave(await canvasBlob(cv.current), bmp.width + ':' + bmp.height); onClose(); }}>Save as new image</button></div>
    </Modal>
  );
}

export const SHORTCUTS = [
  ['Tools', [['Select', 'V'], ['Frame', 'F'], ['Doodle', 'D'], ['Rectangle', 'R'], ['Arrow', 'A'], ['Line', 'L'], ['Ellipse', 'O'], ['Text', 'T'], ['Note', 'N'], ['Cursor chat', '/']]],
  ['Edit', [['Undo', '⌘Z'], ['Redo', '⇧⌘Z'], ['Copy', '⌘C'], ['Copy as PNG', '⇧⌘C'], ['Paste', '⌘V'], ['Duplicate', '⌘D'], ['Select all', '⌘A'], ['Delete', '⌫'], ['Info', 'I'], ['Upload media', '⌘U']]],
  ['View', [['Zoom in', '⌘='], ['Zoom out', '⌘−'], ['Zoom to 100%', '⇧0'], ['Zoom to fit', '⇧1'], ['Zoom to selection', '⇧2'], ['Pan', 'Space + drag'], ['Shortcuts', '⇧/']]],
  ['Boards', [['New board', '⇧⌘O']]],
];
export function ShortcutsModal({ onClose }) {
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose} wide>
      <div className="kb-grid">
        {SHORTCUTS.map(([g, rows]) => (
          <div key={g}><div className="kb-h">{g}</div>{rows.map(([a, k]) => <div key={a} className="kb-row"><span>{a}</span><kbd>{k}</kbd></div>)}</div>
        ))}
      </div>
    </Modal>
  );
}

export function UsageModal({ board, onClose }) {
  const all = board.pages.flatMap(p => p.nodes);
  const res = all.filter(n => n.type === 'result');
  const rows = [
    ['Pages', board.pages.length],
    ['Images generated', res.filter(n => n.data.kind !== 'video' && n.data.source).length],
    ['Videos generated', res.filter(n => n.data.kind === 'video' && n.data.source).length],
    ['Uploads', res.filter(n => !n.data.source).length],
    ['Failed', res.filter(n => n.data.status === 'error').length],
    ['Blocks', all.filter(n => n.type === 'image' || n.type === 'video').length],
  ];
  return (
    <Modal title="Board usage" onClose={onClose}>
      <div className="usage">{rows.map(([k, v]) => <div key={k}><b>{v}</b><span>{k}</span></div>)}</div>
    </Modal>
  );
}

export function CursorChat({ x, y, onSend, onClose }) {
  const [t, setT] = useState('');
  return createPortal(
    <div className="cursor-chat" style={{ left: x, top: y }}>
      <input autoFocus value={t} placeholder="Ask or create…" onChange={e => setT(e.target.value)}
        onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') onClose(); if (e.key === 'Enter' && t.trim()) { onSend(t.trim()); onClose(); } }}
        onBlur={() => !t && onClose()} />
      <Mic onText={s => setT(v => (v ? v + ' ' : '') + s)} />
    </div>, document.body);
}
