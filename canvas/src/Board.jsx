import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, ReactFlowProvider, Background, BackgroundVariant, MiniMap, useNodesState, useReactFlow, useViewport } from '@xyflow/react';
import {
  useStore, updateBoard, updatePage, addPage, deletePage, movePage, duplicatePage, duplicateBoard, createBoard,
  addAssets, addSkill, setSetting, uid,
} from './store.js';
import { go } from './nav.js';
import { I } from './icons.jsx';
import { BoardCtx, nodeTypes } from './nodes.jsx';
import { generateImage, generateVideo, poll, uploadFile, downloadUrl, convert, palette } from './api.js';
import { Chat, askClaude } from './Chat.jsx';
import { Menu, Dropdown, Ask } from './menu.jsx';
import { Lightbox, InfoPanel, CropEditor, AnnotateEditor, ShortcutsModal, UsageModal, CursorChat } from './editors.jsx';
import { IMAGE_MODELS, VIDEO_MODELS, AUDIO_MODELS, IMAGE_RATIOS, COLORS, LABELS, PRESETS, nearestRatio, hexOf } from './models.js';

const RESULT_W = 360;
const ratioOf = a => { const [w, h] = String(a || '16:9').split(':').map(Number); return h / w || 9 / 16; };
const SHAPES = [['doodle', 'Doodle', 'D'], ['rect', 'Rectangle', 'R'], ['arrow', 'Arrow', 'A'], ['line', 'Line', 'L'], ['ellipse', 'Ellipse', 'O'], ['triangle', 'Triangle'], ['diamond', 'Diamond']];
const DRAW_TOOLS = ['frame', ...SHAPES.map(s => s[0])];
const isTyping = () => /input|textarea|select/i.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
const strip = ns => ns.map(({ selected, dragging, resizing, ...n }) => n);
const NC = 'Not connected';

export function Board({ id }) {
  const { boards, projects, settings } = useStore();
  const board = boards.find(b => b.id === id);
  useEffect(() => { document.body.classList.toggle('dark', settings.theme === 'dark'); }, [settings.theme]);
  if (!board) return <div className="empty">This board no longer exists. <button className="link" onClick={() => go('projects')}>Back to projects</button></div>;
  const page = board.pages.find(p => p.id === board.pageId) || board.pages[0];
  const project = projects.find(p => p.id === board.projectId);
  return <ReactFlowProvider key={board.id + page.id}><Canvas board={board} page={page} project={project} settings={settings} /></ReactFlowProvider>;
}

function Canvas({ board, page, project, settings }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(page.nodes || []);
  const rf = useReactFlow();
  const { zoom } = useViewport();
  const [tool, setTool] = useState('select');
  const [shape, setShape] = useState('rect');
  const [color, setColor] = useState('auto');
  const [panel, setPanel] = useState('chat');
  const [toast, setToast] = useState('');
  const [menu, setMenu] = useState(null);
  const [modal, setModal] = useState(null);
  const [infoId, setInfoId] = useState(null);
  const [regionsOpen, setRegionsOpen] = useState(false);
  const [cursorChat, setCursorChat] = useState(null);
  const [draft, setDraft] = useState(null);
  const nodesRef = useRef(nodes); nodesRef.current = nodes;
  const mouse = useRef({ x: innerWidth / 2, y: innerHeight / 2 });
  const fileRef = useRef();
  const clip = useRef(null);
  const hist = useRef({ past: [], future: [], last: JSON.stringify(strip(page.nodes || [])), skip: false });
  const say = useCallback(t => { setToast(t); clearTimeout(say.t); say.t = setTimeout(() => setToast(''), 3500); }, []);

  /* ---------- persistence + undo ---------- */
  useEffect(() => {
    const t = setTimeout(() => {
      const clean = strip(nodes);
      updatePage(board.id, page.id, { nodes: clean });
      const snap = JSON.stringify(clean), h = hist.current;
      if (h.skip) { h.skip = false; h.last = snap; return; }
      if (snap !== h.last) { h.past.push(h.last); if (h.past.length > 80) h.past.shift(); h.future = []; h.last = snap; }
    }, 350);
    return () => clearTimeout(t);
  }, [nodes]);
  const undo = () => { const h = hist.current; if (!h.past.length) return; h.future.push(h.last); const s = h.past.pop(); h.last = s; h.skip = true; setNodes(JSON.parse(s)); };
  const redo = () => { const h = hist.current; if (!h.future.length) return; h.past.push(h.last); const s = h.future.pop(); h.last = s; h.skip = true; setNodes(JSON.parse(s)); };

  /* ---------- helpers ---------- */
  const getNode = id => nodesRef.current.find(n => n.id === id);
  const selected = () => nodesRef.current.filter(n => n.selected);
  const single = () => nodesRef.current.filter(n => n.selected).length === 1;
  const patch = (nid, p) => setNodes(ns => ns.map(n => n.id === nid ? { ...n, data: { ...n.data, ...p } } : n));
  const patchMany = (ids, p) => setNodes(ns => ns.map(n => ids.includes(n.id) ? { ...n, data: { ...n.data, ...p } } : n));
  const absPos = n => rf.getInternalNode(n.id)?.internals.positionAbsolute || n.position;
  const sizeOf = n => ({ w: n.measured?.width || n.width || 340, h: n.measured?.height || n.height || 300 });
  const viewCenter = () => {
    const r = document.querySelector('.board-flow').getBoundingClientRect();
    const chat = document.querySelector('.chat');
    const right = chat ? chat.getBoundingClientRect().left : r.right;
    return rf.screenToFlowPosition({ x: r.left + (right - r.left) / 2, y: r.top + r.height / 2 - 40 });
  };
  const center = (dx = 0, dy = 0) => { const p = viewCenter(); return { x: p.x - 170 + dx, y: p.y - 160 + dy }; };
  const add = (type, data = {}, position, extra = {}) => {
    const n = { id: uid(), type, position: position || center(), data, ...extra };
    setNodes(ns => [...ns.map(x => ({ ...x, selected: false })), { ...n, selected: true }]);
    return n;
  };
  // Right of a node, moved down past anything already sitting there.
  const rightOf = (n, gap = 48, w = 360, h = 300) => {
    const p = absPos(n); const x = p.x + sizeOf(n).w + gap; let y = p.y;
    for (let i = 0; i < 40; i++) {
      const hit = nodesRef.current.find(o => { if (o.id === n.id || o.type === 'frame') return false; const q = absPos(o), s = sizeOf(o); return q.x < x + w && q.x + s.w > x && q.y < y + h && q.y + s.h > y; });
      if (!hit) break;
      y = absPos(hit).y + sizeOf(hit).h + 32;
    }
    return { x, y };
  };
  // Fit view, keeping content clear of the side panel.
  const fit = (opts = {}) => rf.fitView({ padding: 0.2, duration: 300, maxZoom: 1, ...opts }).then(() => {
    if (!document.querySelector('.chat')) return;
    const vp = rf.getViewport(); rf.setViewport({ ...vp, x: vp.x - 166 }, { duration: 150 });
  });
  const freeSpot = () => {
    const ns = nodesRef.current.filter(n => !n.parentId);
    if (!ns.length) return center();
    return { x: Math.min(...ns.map(n => n.position.x)), y: Math.max(...ns.map(n => n.position.y + sizeOf(n).h)) + 80 };
  };

  /* ---------- generation ---------- */
  const track = useCallback(async (resultId, requestId) => {
    try { const s = await poll(requestId); patch(resultId, { status: 'done', url: s.url, kind: s.kind, requestId: null }); }
    catch (e) { patch(resultId, { status: 'error', error: e.message, requestId: null }); }
  }, []);
  useEffect(() => {
    nodesRef.current.filter(n => n.type === 'result' && n.data.status === 'pending' && n.data.requestId).forEach(n => track(n.id, n.data.requestId));
    if (!page.viewport && nodesRef.current.length) setTimeout(() => fit({ duration: 0 }), 60);
  }, []);

  const placeResult = (src, aspect) => {
    const p = absPos(src), w = sizeOf(src).w;
    const sib = nodesRef.current.filter(n => n.type === 'result' && n.data.source === src.id);
    const y = sib.length ? Math.max(...sib.map(n => absPos(n).y + (n.measured?.height || RESULT_W * ratioOf(n.data.aspect) + 30))) + 32 : p.y;
    return { x: p.x + w + 48, y };
  };

  const run = async (nid, override) => {
    const src = override || getNode(nid);
    if (!src) return;
    const d = src.data, isVideo = src.type === 'video';
    const aspect = isVideo ? (d.model === 'seedance' ? d.ratio || '16:9' : d.startAspect || '16:9') : d.aspect || '16:9';
    const modelName = isVideo ? VIDEO_MODELS[d.model || 'kling3']?.name : IMAGE_MODELS.find(m => m.key === (d.model || 'gpt_image_2_5'))?.name;
    const res = { id: uid(), type: 'result', position: placeResult(src, aspect), width: RESULT_W,
      data: { status: 'pending', source: src.id, aspect, kind: isVideo ? 'video' : 'image', title: d.title || (isVideo ? 'Video' : 'Image'), modelName, prompt: d.prompt, created: Date.now() } };
    setNodes(ns => [...ns.map(n => n.id === src.id ? { ...n, data: { ...n.data, error: null } } : n), res]);
    try {
      const requestId = isVideo
        ? await generateVideo({ model: d.model || 'kling3', prompt: d.prompt, image_url: d.start || undefined, last_image_url: d.end || undefined,
            duration: d.duration || (d.model === 'seedance' ? 4 : 3), ratio: d.ratio || '16:9', resolution: d.res || '1080p', sound: d.sound || 'off' })
        : await generateImage({ prompt: d.prompt, references: d.refs || [], aspect, resolution: d.resolution || '2k', quality: d.quality || 'high' });
      patch(res.id, { requestId });
      track(res.id, requestId);
    } catch (e) {
      setNodes(ns => ns.filter(n => n.id !== res.id).map(n => n.id === src.id ? { ...n, data: { ...n.data, error: e.message } } : n));
      say(e.message);
    }
  };

  // Image block fed by a result image; optionally runs straight away.
  const fromImage = (rid, data, runNow) => {
    const r = getNode(rid); if (!r) return;
    const n = add('image', { refs: [r.data.url], prompt: '', aspect: nearestRatio(r.data.aspect), resolution: '2k', ...data }, rightOf(r));
    if (runNow) setTimeout(() => run(n.id, n), 30);
    return n;
  };

  const upload = async file => { try { return await uploadFile(file); } catch (e) { say(e.message); return null; } };
  const uploadToBoard = async (file, pos) => {
    if (file.type.startsWith('video/')) return say('Video upload isn’t supported yet. Upload images.');
    let aspect = '1:1';
    try { const b = await createImageBitmap(file); aspect = b.width + ':' + b.height; } catch (e) {}
    const n = add('result', { status: 'pending', kind: 'image', aspect, title: file.name.replace(/\.[^.]+$/, ''), created: Date.now() }, pos || center(), { width: RESULT_W });
    const url = await upload(file);
    if (url) patch(n.id, { status: 'done', url }); else setNodes(ns => ns.filter(x => x.id !== n.id));
  };
  const saveBlobAsResult = async (rid, blob, aspect, title) => {
    const r = getNode(rid);
    const n = add('result', { status: 'pending', kind: 'image', aspect, title, created: Date.now() }, rightOf(r), { width: RESULT_W });
    const url = await upload(new File([blob], title + '.png', { type: 'image/png' }));
    if (url) patch(n.id, { status: 'done', url }); else setNodes(ns => ns.filter(x => x.id !== n.id));
  };

  const media = () => [
    ...nodesRef.current.filter(n => n.type === 'result' && n.data.url).map(n => ({ id: n.id, url: n.data.url, kind: n.data.kind })).reverse(),
    ...(project?.assets || []).map(a => ({ id: 'lib-' + a.id, url: a.url, kind: a.kind })),
  ].filter((m, i, a) => a.findIndex(x => x.url === m.url) === i);

  /* ---------- frames ---------- */
  const frameSelection = () => {
    const sel = selected().filter(n => !n.parentId && n.type !== 'frame');
    if (!sel.length) return say('Select something to frame.');
    const boxes = sel.map(n => { const p = absPos(n), s = sizeOf(n); return [p.x, p.y, p.x + s.w, p.y + s.h]; });
    const pad = 32, x0 = Math.min(...boxes.map(b => b[0])) - pad, y0 = Math.min(...boxes.map(b => b[1])) - pad - 24;
    const x1 = Math.max(...boxes.map(b => b[2])) + pad, y1 = Math.max(...boxes.map(b => b[3])) + pad;
    const f = { id: uid(), type: 'frame', position: { x: x0, y: y0 }, width: x1 - x0, height: y1 - y0, zIndex: -1, data: { title: 'Frame', color }, selected: true };
    const ids = sel.map(n => n.id);
    setNodes(ns => [f, ...ns.map(n => ids.includes(n.id) ? { ...n, parentId: f.id, selected: false, position: { x: n.position.x - x0, y: n.position.y - y0 } } : { ...n, selected: false })]);
  };
  const onNodeDragStop = (_, __, dragged) => {
    const frames = nodesRef.current.filter(n => n.type === 'frame');
    if (!frames.length) return;
    const ids = dragged.filter(n => n.type !== 'frame').map(n => n.id);
    setNodes(ns => {
      const out = ns.map(n => {
        if (!ids.includes(n.id)) return n;
        const p = absPos(n), s = sizeOf(n), cx = p.x + s.w / 2, cy = p.y + s.h / 2;
        const f = frames.find(fr => { const fp = absPos(fr), fs = sizeOf(fr); return cx > fp.x && cx < fp.x + fs.w && cy > fp.y && cy < fp.y + fs.h; });
        if (f && n.parentId !== f.id) { const fp = absPos(f); return { ...n, parentId: f.id, position: { x: p.x - fp.x, y: p.y - fp.y } }; }
        if (!f && n.parentId) { const { parentId, ...rest } = n; return { ...rest, position: p }; }
        return n;
      });
      return [...out.filter(n => n.type === 'frame'), ...out.filter(n => n.type !== 'frame')];
    });
  };

  /* ---------- clipboard ---------- */
  const copyNodes = ids => {
    const ns = nodesRef.current.filter(n => ids.includes(n.id));
    clip.current = { at: Date.now(), nodes: strip(ns).map(n => ({ ...n, position: absPos(n), parentId: undefined })) };
    const urls = ns.map(n => n.data.url).filter(Boolean);
    navigator.clipboard?.writeText(urls.join('\n') || ns.map(n => n.data.prompt || n.data.text || '').join('\n')).catch(() => {});
    say('Copied ' + ns.length + (ns.length === 1 ? ' item' : ' items'));
  };
  const pasteNodes = at => {
    if (!clip.current) return false;
    const src = clip.current.nodes, minX = Math.min(...src.map(n => n.position.x)), minY = Math.min(...src.map(n => n.position.y));
    const base = at || { x: minX + 40, y: minY + 40 };
    const fresh = src.map(n => ({ ...JSON.parse(JSON.stringify(n)), id: uid(), selected: true, position: { x: base.x + n.position.x - minX, y: base.y + n.position.y - minY } }));
    setNodes(ns => [...ns.map(n => ({ ...n, selected: false })), ...fresh]);
    return true;
  };
  const copyPng = async id => {
    try { const b = await convert(getNode(id).data.url, 'image/png'); await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); say('Copied as PNG'); }
    catch (e) { say('Couldn’t copy the image: ' + e.message); }
  };
  const pasteFromSystem = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const it of items) { const t = it.types.find(x => x.startsWith('image/')); if (t) { const b = await it.getType(t); return uploadToBoard(new File([b], 'Pasted.png', { type: t }), rf.screenToFlowPosition(mouse.current)); } }
    } catch (e) {}
    if (!pasteNodes(rf.screenToFlowPosition(mouse.current))) say('Nothing to paste.');
  };
  useEffect(() => {
    const onPaste = e => {
      if (isTyping()) return;
      const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'));
      if (files.length) { e.preventDefault(); files.forEach(f => uploadToBoard(f, rf.screenToFlowPosition(mouse.current))); return; }
      if (clip.current) { e.preventDefault(); pasteNodes(); }
    };
    addEventListener('paste', onPaste);
    return () => removeEventListener('paste', onPaste);
  }, []);

  /* ---------- timeline ---------- */
  const toTimeline = ids => {
    const items = ids.map(getNode).filter(n => n?.data?.url).map(n => ({ url: n.data.url, kind: n.data.kind }));
    if (!items.length) return;
    const tl = nodesRef.current.find(n => n.type === 'timeline');
    if (tl) { patch(tl.id, { clips: [...(tl.data.clips || []), ...items] }); rf.fitView({ nodes: [{ id: tl.id }], duration: 300, maxZoom: 1, padding: 0.4 }); say('Added to timeline'); }
    else add('timeline', { clips: items }, rightOf(getNode(ids[ids.length - 1])));
  };

  /* ---------- actions ---------- */
  const act = (name, id, arg) => {
    const n = id ? getNode(id) : null;
    const sel = selected();
    const targets = n && n.selected ? sel.map(x => x.id) : id ? [id] : sel.map(x => x.id);
    switch (name) {
      case 'color': return patchMany(targets, { color: arg });
      case 'label': return patchMany(targets, { label2: arg });
      case 'rate': return patch(id, { rating: n.data.rating === arg ? 0 : arg });
      case 'frameSelection': return frameSelection();
      case 'download': return targets.map(getNode).filter(x => x?.data.url).forEach(x => downloadUrl(x.data.url, x.data.title || 'solved', x.data.kind === 'video' ? 'original' : settings.downloadFormat).catch(e => say(e.message)));
      case 'fullsize': return setModal({ kind: 'lightbox', id });
      case 'info': return setInfoId(id);
      case 'rerun': { const s = getNode(n.data.source); return s ? run(s.id) : say('The block that made this was deleted.'); }
      case 'reuse': { const s = getNode(n.data.source); if (!s) return say('The block that made this was deleted.'); return add(s.type, { ...s.data, error: null }, rightOf(n)); }
      case 'annotate': return setModal({ kind: 'annotate', id });
      case 'crop': return setModal({ kind: 'crop', id });
      case 'modifyRun': return fromImage(id, { prompt: arg, title: 'Modify image' }, true);
      case 'modify': return fromImage(id, { title: 'Modify image' });
      case 'createImage': return fromImage(id, {});
      case 'createVideo': return add('video', { model: arg || 'kling3', start: n.data.url, startAspect: nearestRatio(n.data.aspect), prompt: '', duration: 5 }, rightOf(n));
      case 'blend': {
        const urls = targets.map(getNode).filter(x => x?.type === 'result' && x.data.url && x.data.kind !== 'video').map(x => x.data.url);
        return add('image', { title: 'Latent blend', refs: urls, prompt: PRESETS.blend, aspect: nearestRatio(n?.data.aspect), resolution: '2k' }, rightOf(n || sel[sel.length - 1]));
      }
      case 'reframe': { const cur = nearestRatio(n.data.aspect); return fromImage(id, { title: 'Reframe', prompt: PRESETS.reframe, aspect: cur === '9:16' ? '16:9' : '9:16' }); }
      case 'upscale': return fromImage(id, { title: 'Upscale', prompt: PRESETS.upscale, resolution: '4k', quality: 'xhigh' }, true);
      case 'removeBg': return fromImage(id, { title: 'Remove background', prompt: PRESETS.removeBg }, true);
      case 'depth': return fromImage(id, { title: 'Depth map', prompt: PRESETS.depth }, true);
      case 'palette': say('Extracting palette…'); return palette(n.data.url).then(colors => add('palette', { colors }, rightOf(n))).catch(e => say(e.message));
      case 'transform': {
        if (arg === 'flipX') return patch(id, { flipX: !n.data.flipX });
        if (arg === 'flipY') return patch(id, { flipY: !n.data.flipY });
        if (arg === 'rotate') { const [w, h] = (n.data.aspect || '1:1').split(':'); return setNodes(ns => ns.map(x => x.id === id ? { ...x, width: RESULT_W, height: undefined, data: { ...x.data, rotate: ((x.data.rotate || 0) + 90) % 360, aspect: h + ':' + w } } : x)); }
        return patch(id, { flipX: false, flipY: false, rotate: 0 });
      }
      case 'timeline': return toTimeline(targets);
      case 'copy': return copyNodes(targets);
      case 'copyPng': return copyPng(id);
      case 'copyLink': navigator.clipboard?.writeText(n.data.url); return say('Link copied');
      case 'newTab': return window.open(n.data.url, '_blank', 'noopener');
      case 'library': addAssets(project.id, targets.map(getNode).filter(x => x?.data.url).map(x => ({ url: x.data.url, kind: x.data.kind }))); return say('Added to asset library');
      case 'saveSkill': { const d = n.data; addSkill({ name: (d.title && d.title !== 'Create image' ? d.title + ': ' : '') + d.prompt.slice(0, 40), type: n.type, prompt: d.prompt, aspect: d.aspect, resolution: d.resolution, model: d.model, duration: d.duration }); setPanel('skills'); return say('Saved as skill'); }
      case 'duplicate': {
        const ns = targets.map(getNode).filter(Boolean);
        const fresh = ns.map(x => ({ ...JSON.parse(JSON.stringify(strip([x])[0])), id: uid(), parentId: undefined, selected: true, position: { x: absPos(x).x + 40, y: absPos(x).y + 40 } }));
        return setNodes(all => [...all.map(x => ({ ...x, selected: false })), ...fresh]);
      }
      case 'delete': return rf.deleteElements({ nodes: targets.map(i => ({ id: i })) });
      case 'front': return setNodes(ns => ns.map(x => targets.includes(x.id) ? { ...x, zIndex: (x.zIndex || 0) + 10 } : x));
      case 'back': return setNodes(ns => ns.map(x => targets.includes(x.id) ? { ...x, zIndex: (x.zIndex || 0) - 10 } : x));
      case 'unframe': return setNodes(ns => ns.filter(x => x.id !== id).map(x => x.parentId === id ? { ...x, parentId: undefined, position: absPos(x) } : x));
    }
  };

  const colorSub = ids => COLORS.map(c => ({ label: c.name, checked: ids.length === 1 && (getNode(ids[0])?.data.color || 'auto') === c.key, onClick: () => patchMany(ids, { color: c.key }) }));

  // Luma's image right-click menu, item for item.
  const imageMenu = id => {
    const n = getNode(id); if (!n) return [];
    const isImg = n.data.kind !== 'video';
    const imgCount = selected().filter(x => x.type === 'result' && x.data.kind !== 'video').length;
    return [
      { label: 'Create video', icon: 'video', sub: [
        { label: 'Scenes', onClick: () => openCursorChat('Plan video scenes from this image: ') },
        ...Object.entries(VIDEO_MODELS).map(([k, m]) => ({ label: m.name, disabled: !m.on || !isImg, note: !m.on ? NC : null, onClick: () => act('createVideo', id, k) })),
      ] },
      isImg && { label: 'Create image', icon: 'image', sub: [
        { label: 'Scenes', onClick: () => openCursorChat('Plan image scenes based on this image: ') },
        ...IMAGE_MODELS.map(m => ({ label: m.name, disabled: !m.on, note: !m.on ? NC : null, onClick: () => act('createImage', id) })),
      ] },
      isImg && { label: 'Modify image', icon: 'edit', sub: IMAGE_MODELS.map(m => ({ label: m.name, disabled: !m.on, note: !m.on ? NC : null, onClick: () => act('modify', id) })) },
      isImg && { label: 'Latent blend', icon: 'blend', note: imgCount > 1 ? imgCount + ' images' : null, onClick: () => act('blend', id) },
      isImg && { label: 'Reframe', icon: 'reframe', onClick: () => act('reframe', id) },
      isImg && { label: 'Upscale', icon: 'upscale', onClick: () => act('upscale', id) },
      isImg && { label: 'Extract layers', icon: 'layers', disabled: true, note: NC },
      isImg && { label: 'Open in layer editor', icon: 'layers', disabled: true, note: NC },
      { label: 'Open in timeline', icon: 'timeline', onClick: () => act('timeline', id) },
      isImg && { label: 'More actions', icon: 'dots', sub: [
        { label: 'Depth map', icon: 'depth', onClick: () => act('depth', id) },
        { label: 'Convert to vector', icon: 'vector', disabled: true, note: NC },
        { label: 'Remove background', icon: 'scissors', onClick: () => act('removeBg', id) },
        { label: 'Extract palette', icon: 'palette', onClick: () => act('palette', id) },
        { label: 'Media transform', icon: 'transform', sub: [
          { label: 'Flip horizontal', onClick: () => act('transform', id, 'flipX') },
          { label: 'Flip vertical', onClick: () => act('transform', id, 'flipY') },
          { label: 'Rotate 90°', onClick: () => act('transform', id, 'rotate') },
          { label: 'Reset', onClick: () => act('transform', id, 'reset') },
        ] },
      ] },
      'sep',
      { label: 'Labels', icon: 'tag', sub: LABELS.map(l => ({ label: l.name, checked: n.data.label2 === l.key, onClick: () => act('label', id, n.data.label2 === l.key ? null : l.key) })) },
      { label: 'Color', icon: 'palette', sub: colorSub(n.selected ? selected().map(x => x.id) : [id]) },
      'sep',
      { label: 'Copy', icon: 'copy', sub: [
        { label: 'Copy all (' + (n.selected ? selected().length : 1) + ')', kbd: '⌘C', onClick: () => act('copy', id) },
        isImg && { label: 'Copy as PNG', kbd: '⇧⌘C', onClick: () => act('copyPng', id) },
      ] },
      { label: 'Copy link', icon: 'link', onClick: () => act('copyLink', id) },
      { label: isImg ? 'Open image in new tab' : 'Open video in new tab', icon: 'external', onClick: () => act('newTab', id) },
      { label: isImg ? 'Download image' : 'Download video', icon: 'download', onClick: () => act('download', id) },
      { label: 'Add to asset library', icon: 'star', sub: [{ label: 'As files…', onClick: () => act('library', id) }] },
      { label: 'Export to…', icon: 'share', sub: [{ label: 'Dropbox', disabled: true, note: NC }, { label: 'Google Drive', disabled: true, note: NC }] },
      'sep',
      { label: 'Info', icon: 'info', kbd: 'I', onClick: () => act('info', id) },
      { label: 'Delete', icon: 'trash', kbd: '⌫', danger: true, onClick: () => act('delete', id) },
    ];
  };

  const nodeMenu = n => {
    if (n.type === 'result' && n.data.url) return imageMenu(n.id);
    const ids = n.selected ? selected().map(x => x.id) : [n.id];
    return [
      n.type === 'frame' && { label: 'Remove frame (keep contents)', icon: 'frame', onClick: () => act('unframe', n.id) },
      n.type !== 'frame' && { label: 'Create frame', icon: 'frame', onClick: () => { setNodes(ns => ns.map(x => ({ ...x, selected: ids.includes(x.id) }))); setTimeout(frameSelection, 30); } },
      { label: 'Color', icon: 'palette', sub: colorSub(ids) },
      (n.type === 'image' || n.type === 'video') && { label: 'Save as skill', icon: 'skills', disabled: !n.data.prompt?.trim(), onClick: () => act('saveSkill', n.id) },
      'sep',
      { label: 'Copy', icon: 'copy', kbd: '⌘C', onClick: () => copyNodes(ids) },
      { label: 'Duplicate', icon: 'reuse', kbd: '⌘D', onClick: () => act('duplicate', n.id) },
      { label: 'Bring to front', onClick: () => act('front', n.id) },
      { label: 'Send to back', onClick: () => act('back', n.id) },
      'sep',
      { label: 'Delete', icon: 'trash', kbd: '⌫', danger: true, onClick: () => act('delete', n.id) },
    ];
  };

  const addBlockAt = (type, data, pos) => add(type, type === 'image' ? { prompt: '', refs: [], aspect: '16:9', resolution: '2k', ...data } : { model: 'kling3', prompt: '', duration: 5, ...data }, pos);

  const paneMenu = pos => [
    { label: 'Create image', icon: 'image', sub: [
      { label: 'Scenes', onClick: () => openCursorChat('Plan image scenes: ') },
      ...IMAGE_MODELS.map(m => ({ label: m.name, disabled: !m.on, note: !m.on ? NC : null, onClick: () => addBlockAt('image', {}, pos) })),
    ] },
    { label: 'Create video', icon: 'video', sub: [
      { label: 'Scenes', onClick: () => openCursorChat('Plan video scenes: ') },
      ...Object.entries(VIDEO_MODELS).map(([k, m]) => ({ label: m.name, disabled: !m.on, note: !m.on ? NC : null, onClick: () => addBlockAt('video', { model: k, duration: m.min }, pos) })),
    ] },
    { label: 'Create audio', icon: 'audio', sub: AUDIO_MODELS.map(m => ({ label: m.name, disabled: true, note: NC })) },
    'sep',
    { label: 'New frame', icon: 'frame', kbd: 'F', onClick: () => add('frame', { title: 'Frame', color }, pos, { width: 480, height: 320, zIndex: -1 }) },
    { label: 'New timeline', icon: 'timeline', onClick: () => add('timeline', { clips: [] }, pos) },
    { label: 'New layer editor', icon: 'layers', disabled: true, note: NC },
    { label: 'Upload media', icon: 'upload', kbd: '⌘U', onClick: () => fileRef.current.click() },
    { label: 'Paste', icon: 'copy', kbd: '⌘V', onClick: pasteFromSystem },
    { label: 'Cursor chat', icon: 'chat', kbd: '/', onClick: () => openCursorChat() },
  ];

  const selectionMenu = () => {
    const sel = selected(), ids = sel.map(n => n.id), imgs = sel.filter(n => n.type === 'result' && n.data.url && n.data.kind !== 'video');
    return [
      { label: 'Create frame', icon: 'frame', onClick: frameSelection },
      imgs.length > 1 && { label: 'Latent blend', icon: 'blend', note: imgs.length + ' images', onClick: () => act('blend', imgs[0].id) },
      sel.some(n => n.data.url) && { label: 'Open in timeline', icon: 'timeline', onClick: () => toTimeline(sel.filter(n => n.data.url).map(n => n.id)) },
      { label: 'Labels', icon: 'tag', sub: LABELS.map(l => ({ label: l.name, onClick: () => patchMany(ids, { label2: l.key }) })) },
      { label: 'Color', icon: 'palette', sub: colorSub(ids) },
      'sep',
      { label: 'Copy', icon: 'copy', kbd: '⌘C', onClick: () => copyNodes(ids) },
      { label: 'Duplicate', icon: 'reuse', kbd: '⌘D', onClick: () => act('duplicate') },
      imgs.length > 0 && { label: 'Download', icon: 'download', onClick: () => act('download') },
      imgs.length > 0 && { label: 'Add to asset library', icon: 'star', onClick: () => act('library') },
      'sep',
      { label: 'Delete', icon: 'trash', kbd: '⌫', danger: true, onClick: () => act('delete') },
    ];
  };

  const openMenu = (items, x, y) => setMenu({ items, x, y });

  /* ---------- cursor chat & chat blocks ---------- */
  const placeBlocks = (blocks, at, runNow) => {
    if (!blocks.length) return 0;
    const base = at || freeSpot();
    const made = blocks.map((b, i) => {
      const pos = { x: base.x + i * 380, y: base.y };
      return b.type === 'video'
        ? { id: uid(), type: 'video', position: pos, data: { model: 'seedance', prompt: b.prompt || '', duration: Math.min(30, Math.max(4, Number(b.duration) || 5)), ratio: '16:9', res: '1080p' } }
        : { id: uid(), type: 'image', position: pos, data: { prompt: b.prompt || '', refs: [], aspect: IMAGE_RATIOS.includes(b.aspect) ? b.aspect : '16:9', resolution: '2k' } };
    });
    setNodes(ns => [...ns.map(n => ({ ...n, selected: false })), ...made]);
    setTimeout(() => fit({ nodes: made.map(m => ({ id: m.id })), padding: 0.3 }), 80);
    if (runNow) setTimeout(() => made.forEach(m => run(m.id, m)), 60);
    return made.length;
  };
  const openCursorChat = (prefix = '') => setCursorChat({ x: Math.min(mouse.current.x, innerWidth - 340), y: Math.min(mouse.current.y, innerHeight - 60), prefix, at: rf.screenToFlowPosition(mouse.current) });
  const sendCursorChat = async (text, at) => {
    say('Thinking…');
    try {
      const { reply, blocks } = await askClaude(board, nodesRef.current, [{ role: 'user', content: text }]);
      const made = placeBlocks(blocks, at, false);
      say(made ? reply + ' · Added ' + made + (made === 1 ? ' block' : ' blocks') : reply);
    } catch (e) { say('Couldn’t reach Claude: ' + e.message); }
  };

  /* ---------- drawing (frames + shapes) ---------- */
  const drawDown = e => {
    if (e.button !== 0) return;
    const start = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const pts = [[e.clientX, e.clientY]];
    const s0 = { x: e.clientX, y: e.clientY };
    const t = tool;
    setDraft({ x: s0.x, y: s0.y, w: 0, h: 0, pts: [], x0: s0.x, y0: s0.y, x1: s0.x, y1: s0.y });
    const move = ev => { pts.push([ev.clientX, ev.clientY]); setDraft({ x: Math.min(s0.x, ev.clientX), y: Math.min(s0.y, ev.clientY), w: Math.abs(ev.clientX - s0.x), h: Math.abs(ev.clientY - s0.y), pts: [...pts], x0: s0.x, y0: s0.y, x1: ev.clientX, y1: ev.clientY }); };
    const up = ev => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); setDraft(null);
      const end = rf.screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      let x = Math.min(start.x, end.x), y = Math.min(start.y, end.y), w = Math.abs(end.x - start.x), h = Math.abs(end.y - start.y);
      if (t === 'doodle') {
        if (pts.length < 2) return;
        const fp = pts.map(p => rf.screenToFlowPosition({ x: p[0], y: p[1] }));
        x = Math.min(...fp.map(p => p.x)); y = Math.min(...fp.map(p => p.y));
        w = Math.max(8, Math.max(...fp.map(p => p.x)) - x); h = Math.max(8, Math.max(...fp.map(p => p.y)) - y);
        add('shape', { shape: 'doodle', color, points: fp.map(p => [+((p.x - x) / w * 100).toFixed(1), +((p.y - y) / h * 100).toFixed(1)]) }, { x, y }, { width: w, height: h });
        return;
      }
      const tiny = w < 6 && h < 6;
      if (t === 'frame') { if (tiny) { w = 480; h = 320; } add('frame', { title: 'Frame', color }, { x, y }, { width: w, height: h, zIndex: -1 }); setTool('select'); return; }
      const data = { shape: t, color };
      if (t === 'line' || t === 'arrow') {
        if (tiny) { w = 160; h = 8; data.dir = [0, 50, 100, 50]; }
        else { data.dir = [end.x >= start.x ? 0 : 100, end.y >= start.y ? 0 : 100, end.x >= start.x ? 100 : 0, end.y >= start.y ? 100 : 0]; w = Math.max(w, 8); h = Math.max(h, 8); }
      } else if (tiny) { w = 160; h = 110; }
      add('shape', data, { x, y }, { width: w, height: h });
      setTool('select');
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  };

  /* ---------- regions ---------- */
  const addRegion = () => {
    const sel = selected();
    const save = () => updateBoard(board.id, { regions: [...(board.regions || []), { id: uid(), name: 'Region ' + ((board.regions || []).length + 1), viewport: rf.getViewport() }] });
    if (sel.length) { rf.fitView({ nodes: sel.map(n => ({ id: n.id })), padding: 0.2, maxZoom: 1.5 }); setTimeout(save, 30); } else save();
    setRegionsOpen(true); say('Region saved');
  };

  /* ---------- keyboard ---------- */
  const keyRef = useRef(); keyRef.current = e => {
    if (isTyping() || modal || cursorChat) return;
    const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
    if (mod && k === 'z') { e.preventDefault(); return e.shiftKey ? redo() : undo(); }
    if (mod && k === 'y') { e.preventDefault(); return redo(); }
    if (mod && k === 'c') { const s = selected(); if (!s.length) return; e.preventDefault(); if (e.shiftKey && s[0].data.url) return copyPng(s[0].id); return copyNodes(s.map(n => n.id)); }
    if (mod && k === 'd') { e.preventDefault(); return act('duplicate'); }
    if (mod && k === 'a') { e.preventDefault(); return setNodes(ns => ns.map(n => ({ ...n, selected: true }))); }
    if (mod && k === 'u') { e.preventDefault(); return fileRef.current.click(); }
    if (mod && e.shiftKey && k === 'o') { e.preventDefault(); return go('b/' + createBoard(board.projectId).id); }
    if (mod && (e.key === '=' || e.key === '+')) { e.preventDefault(); return rf.zoomIn({ duration: 150 }); }
    if (mod && e.key === '-') { e.preventDefault(); return rf.zoomOut({ duration: 150 }); }
    if (mod) return;
    if (e.shiftKey && e.code === 'Digit0') return rf.zoomTo(1, { duration: 200 });
    if (e.shiftKey && e.code === 'Digit1') return fit();
    if (e.shiftKey && e.code === 'Digit2') { const s = selected(); return s.length && rf.fitView({ nodes: s.map(n => ({ id: n.id })), padding: 0.2, duration: 300 }); }
    if (e.shiftKey && (e.key === '?' || e.code === 'Slash')) return setModal({ kind: 'shortcuts' });
    if (e.key === '/') { e.preventDefault(); return openCursorChat(); }
    if (e.key === 'Escape') { setTool('select'); setNodes(ns => ns.map(n => n.selected ? { ...n, selected: false } : n)); return; }
    if (k === 'i') { const s = selected(); if (s[0]?.type === 'result') setInfoId(s[0].id); return; }
    const map = { v: 'select', f: 'frame', t: 'text', n: 'note', d: 'doodle', r: 'rect', a: 'arrow', l: 'line', o: 'ellipse' };
    if (map[k] && !e.shiftKey) { setTool(map[k]); if (SHAPES.some(s => s[0] === map[k])) setShape(map[k]); }
  };
  useEffect(() => { const f = e => keyRef.current(e); addEventListener('keydown', f); return () => removeEventListener('keydown', f); }, []);

  /* ---------- toolbar ---------- */
  const pickTool = t => {
    if (t === 'upload') return fileRef.current.click();
    if (t === 'image') { addBlockAt('image', {}); return setTool('select'); }
    if (t === 'video') { addBlockAt('video', {}); return setTool('select'); }
    setTool(t);
  };
  const onPaneClick = e => {
    setMenu(null);
    if (tool === 'text' || tool === 'note') { add(tool, { text: '', autofocus: true, color }, rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })); setTool('select'); }
  };
  const onDrop = e => {
    e.preventDefault();
    const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    [...e.dataTransfer.files].filter(f => /^image\/(png|jpe?g|webp)$/.test(f.type)).forEach((f, i) => uploadToBoard(f, { x: pos.x + i * 40, y: pos.y + i * 40 }));
  };

  const singleResult = (() => { const s = nodes.filter(n => n.selected); return s.length === 1 && s[0].type === 'result' && s[0].data.url ? s[0] : null; })();
  const ctx = useMemo(() => ({}), []);
  Object.assign(ctx, { run, media, upload, act, imageMenu, single, openMenu, say });

  const lightboxNode = modal?.kind === 'lightbox' && getNode(modal.id);
  const editNode = (modal?.kind === 'crop' || modal?.kind === 'annotate') && getNode(modal.id);
  const infoNode = infoId && getNode(infoId);

  const boardMenu = () => [
    { label: project?.name || 'Project', icon: 'folder', onClick: () => go('p/' + board.projectId) },
    { label: 'Rename board', icon: 'edit', onClick: () => setModal({ kind: 'ask', title: 'Rename board', value: board.name, done: v => v && updateBoard(board.id, { name: v }) }) },
    { label: 'New board', icon: 'plus', kbd: '⇧⌘O', onClick: () => go('b/' + createBoard(board.projectId).id) },
    { label: 'Duplicate board', icon: 'reuse', onClick: () => { const nb = duplicateBoard(board.id); go('b/' + nb.id); } },
    { label: 'Board usage', icon: 'info', onClick: () => setModal({ kind: 'usage' }) },
    'sep',
    ...board.pages.map((p, i) => ({ label: p.name, icon: p.id === page.id ? 'check' : 'page', sub: [
      { label: 'Open', onClick: () => updateBoard(board.id, { pageId: p.id }) },
      { label: 'Rename', onClick: () => setModal({ kind: 'ask', title: 'Rename page', value: p.name, done: v => v && updatePage(board.id, p.id, { name: v }) }) },
      { label: 'Duplicate', onClick: () => duplicatePage(board.id, p.id) },
      { label: 'Move up', disabled: i === 0, onClick: () => movePage(board.id, p.id, -1) },
      { label: 'Move down', disabled: i === board.pages.length - 1, onClick: () => movePage(board.id, p.id, 1) },
      { label: 'Delete', danger: true, disabled: board.pages.length < 2, onClick: () => confirm('Delete “' + p.name + '”?') && deletePage(board.id, p.id) },
    ] })),
    { label: 'New page', icon: 'plus', onClick: () => addPage(board.id) },
  ];
  const zoomMenu = () => [
    { label: 'Zoom in', kbd: '⌘=', onClick: () => rf.zoomIn({ duration: 150 }) },
    { label: 'Zoom out', kbd: '⌘−', onClick: () => rf.zoomOut({ duration: 150 }) },
    { label: 'Zoom to 100%', kbd: '⇧0', onClick: () => rf.zoomTo(1, { duration: 200 }) },
    { label: 'Zoom to fit', kbd: '⇧1', onClick: () => fit() },
    { label: 'Zoom to selection', kbd: '⇧2', disabled: !selected().length, onClick: () => rf.fitView({ nodes: selected().map(n => ({ id: n.id })), padding: 0.2, duration: 300 }) },
    'sep',
    { label: 'Show minimap', checked: settings.minimap, onClick: () => setSetting('minimap', !settings.minimap) },
    { label: 'Regions', checked: regionsOpen, onClick: () => setRegionsOpen(o => !o) },
    { label: 'Use scroll wheel for zoom', checked: settings.scrollZoom, onClick: () => setSetting('scrollZoom', !settings.scrollZoom) },
  ];
  const settingsMenu = () => [
    { label: 'Keyboard shortcuts', icon: 'keyboard', kbd: '⇧/', onClick: () => setModal({ kind: 'shortcuts' }) },
    { label: 'Show minimap', checked: settings.minimap, onClick: () => setSetting('minimap', !settings.minimap) },
    { label: 'Regions', checked: settings.regions, onClick: () => setSetting('regions', !settings.regions) },
    { label: 'Always snap', checked: settings.snap, onClick: () => setSetting('snap', !settings.snap) },
    { label: 'Download format', icon: 'download', sub: [['original', 'Original'], ['png', 'PNG'], ['jpg', 'JPG']].map(([k, l]) => ({ label: l, checked: settings.downloadFormat === k, onClick: () => setSetting('downloadFormat', k) })) },
    { label: 'Theme', icon: 'sun', sub: [['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => ({ label: l, checked: settings.theme === k, onClick: () => setSetting('theme', k) })) },
    'sep',
    { label: 'Classic studio', icon: 'external', onClick: () => window.open('/studio/classic', '_blank') },
  ];

  return (
    <BoardCtx.Provider value={ctx}>
      <div className={'board' + (tool !== 'select' ? ' placing' : '')} onDragOver={e => e.preventDefault()} onDrop={onDrop}
        onPointerMove={e => { mouse.current = { x: e.clientX, y: e.clientY }; }}>
        <div className="board-flow">
          <ReactFlow
            nodes={nodes} onNodesChange={onNodesChange} nodeTypes={nodeTypes}
            defaultViewport={page.viewport || { x: 80, y: 80, zoom: 0.8 }}
            onMoveEnd={(_, vp) => updatePage(board.id, page.id, { viewport: vp })}
            onPaneClick={onPaneClick}
            onPaneContextMenu={e => { e.preventDefault(); openMenu(paneMenu(rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })), e.clientX, e.clientY); }}
            onNodeContextMenu={(e, n) => { e.preventDefault(); openMenu(nodeMenu(getNode(n.id)), e.clientX, e.clientY); }}
            onSelectionContextMenu={e => { e.preventDefault(); openMenu(selectionMenu(), e.clientX, e.clientY); }}
            onNodeDragStop={onNodeDragStop}
            minZoom={0.05} maxZoom={6}
            panOnScroll={!settings.scrollZoom} zoomOnScroll={settings.scrollZoom} zoomOnPinch
            selectionOnDrag={tool === 'select'} panOnDrag={[1, 2]}
            snapToGrid={settings.snap} snapGrid={[24, 24]}
            deleteKeyCode={['Backspace', 'Delete']} proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.4} color="var(--dots)" />
            {settings.minimap && <MiniMap pannable zoomable position="bottom-left" style={{ bottom: 52, left: 4 }} nodeColor={n => n.type === 'frame' ? 'rgba(25,133,255,.15)' : '#c8c8c8'} />}
          </ReactFlow>
          {DRAW_TOOLS.includes(tool) && <div className="draw-layer" onPointerDown={drawDown} />}
          {draft && (
            <svg className="draft">
              {tool === 'doodle' ? <polyline points={draft.pts.map(p => p.join(',')).join(' ')} />
                : tool === 'line' || tool === 'arrow' ? <line x1={draft.x0} y1={draft.y0} x2={draft.x1} y2={draft.y1} />
                : tool === 'ellipse' ? <ellipse cx={draft.x + draft.w / 2} cy={draft.y + draft.h / 2} rx={draft.w / 2} ry={draft.h / 2} />
                : <rect x={draft.x} y={draft.y} width={draft.w} height={draft.h} rx={tool === 'frame' ? 14 : 2} />}
            </svg>
          )}
        </div>

        <div className="bd-top-left">
          <button className="bd-back" onClick={() => go('p/' + board.projectId)} aria-label="Back to project">{I.back({ size: 16 })}</button>
          <Dropdown className="bd-title" title="Board menu" items={boardMenu}>
            <b>{board.name}</b><span> / {page.name}</span>{I.chev({ size: 12 })}
          </Dropdown>
        </div>

        <div className="bd-top-right">
          {singleResult && (
            <div className="pillgroup rate">
              <span>Rate?</span>
              <button className={'pill-ic' + (singleResult.data.rating === 1 ? ' on' : '')} onClick={() => act('rate', singleResult.id, 1)} aria-label="Rate good">{I.up({ size: 15 })}</button>
              <button className={'pill-ic' + (singleResult.data.rating === -1 ? ' on' : '')} onClick={() => act('rate', singleResult.id, -1)} aria-label="Rate bad">{I.down({ size: 15 })}</button>
            </div>
          )}
          <Dropdown className="round-btn" title="Settings" items={settingsMenu} alignRight>{I.gear({ size: 16 })}</Dropdown>
          <button className="share-btn" onClick={() => { navigator.clipboard?.writeText(location.href); say('Board link copied'); }}>Share</button>
        </div>

        {nodes.length === 0 && (
          <div className="bd-empty">
            <div>Start with an idea.</div>
            <span>Right-click the canvas, use the toolbar below, drop in an image, or press / to ask.</span>
          </div>
        )}

        <div className="toolbar" role="toolbar">
          <button className={'tb' + (tool === 'select' ? ' on' : '')} onClick={() => pickTool('select')} title="Select (V)" aria-label="Select">{I.pointer({ size: 18 })}</button>
          <span className="tb-sep" />
          <button className="tb" onClick={() => pickTool('image')} title="Create image" aria-label="Create image">{I.image({ size: 18 })}</button>
          <button className="tb" onClick={() => pickTool('video')} title="Create video" aria-label="Create video">{I.video({ size: 18 })}</button>
          <Dropdown className="tb" title="Create audio" up items={() => AUDIO_MODELS.map(m => ({ label: m.name, disabled: true, note: NC }))}>{I.audio({ size: 18 })}</Dropdown>
          <span className="tb-sep" />
          <button className={'tb' + (tool === 'frame' ? ' on' : '')} onClick={() => pickTool('frame')} title="Frame (F)" aria-label="Frame">{I.frame({ size: 18 })}</button>
          <Dropdown className={'tb' + (SHAPES.some(s => s[0] === tool) ? ' on' : '')} title="Shapes" up
            items={() => SHAPES.map(([k, l, kb]) => ({ label: l, icon: k, kbd: kb, onClick: () => { setShape(k); setTool(k); } }))}>
            {I[shape]({ size: 18 })}
          </Dropdown>
          <button className={'tb' + (tool === 'text' ? ' on' : '')} onClick={() => pickTool('text')} title="Text (T)" aria-label="Text">{I.text({ size: 18 })}</button>
          <button className={'tb' + (tool === 'note' ? ' on' : '')} onClick={() => pickTool('note')} title="Note (N)" aria-label="Note">{I.note({ size: 18 })}</button>
          <Dropdown className="tb" title="Color" up items={() => COLORS.map(c => ({ label: c.name, checked: color === c.key, onClick: () => { setColor(c.key); const s = selected(); if (s.length) patchMany(s.map(n => n.id), { color: c.key }); } }))}>
            <span className="dot big" style={{ background: hexOf(color) || 'var(--ink)' }} />
          </Dropdown>
          <span className="tb-sep" />
          <button className="tb" onClick={() => pickTool('upload')} title="Upload media (⌘U)" aria-label="Upload media">{I.plus({ size: 18 })}</button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden
            onChange={e => { [...e.target.files].forEach((f, i) => uploadToBoard(f, center(i * 40, i * 40))); e.target.value = ''; }} />
        </div>

        <div className="bl">
          {settings.regions && (
            <div className="pillgroup small">
              <button className={'pill-ic' + (regionsOpen ? ' on' : '')} onClick={() => setRegionsOpen(o => !o)} title="View regions" aria-label="View regions">{I.list({ size: 15 })}</button>
              <button className="pill-ic" onClick={addRegion} title="Create region from selection" aria-label="Create region">{I.pin({ size: 15 })}</button>
            </div>
          )}
          <div className="zoombar">
            <button onClick={() => rf.zoomOut({ duration: 150 })} aria-label="Zoom out">−</button>
            <Dropdown className="zv" title="Zoom options" up items={zoomMenu}>{Math.round(zoom * 100)}%</Dropdown>
            <button onClick={() => rf.zoomIn({ duration: 150 })} aria-label="Zoom in">+</button>
          </div>
        </div>
        {regionsOpen && (
          <div className="regions">
            <div className="regions-h"><b>Regions</b><button className="ic-btn" onClick={() => setRegionsOpen(false)} aria-label="Close">{I.close({ size: 12 })}</button></div>
            {!(board.regions || []).length && <div className="assets-empty">Select something and press the pin to save a region.</div>}
            {(board.regions || []).map(r => (
              <div key={r.id} className="region" onClick={() => rf.setViewport(r.viewport, { duration: 400 })}>
                <span>{r.name}</span>
                <button className="ic-btn" onClick={e => { e.stopPropagation(); setModal({ kind: 'ask', title: 'Rename region', value: r.name, done: v => v && updateBoard(board.id, { regions: board.regions.map(x => x.id === r.id ? { ...x, name: v } : x) }) }); }} aria-label="Rename">{I.edit({ size: 12 })}</button>
                <button className="ic-btn" onClick={e => { e.stopPropagation(); updateBoard(board.id, { regions: board.regions.filter(x => x.id !== r.id) }); }} aria-label="Delete">{I.trash({ size: 12 })}</button>
              </div>
            ))}
          </div>
        )}

        {!panel && (
          <div className="pillgroup br">
            <button className="pill-ic" onClick={() => setPanel('chat')} title="Chat" aria-label="Chat">{I.chat({ size: 16 })}</button>
            <button className="pill-ic" onClick={() => setPanel('assets')} title="Assets" aria-label="Assets">{I.image({ size: 16 })}</button>
            <button className="pill-ic" onClick={() => setPanel('skills')} title="Skills" aria-label="Skills">{I.skills({ size: 16 })}</button>
          </div>
        )}
        {panel && (
          <Chat board={board} project={project} nodesRef={nodesRef} tab={panel} setTab={setPanel} onClose={() => setPanel(null)}
            placeBlocks={placeBlocks}
            addFromSkill={s => addBlockAt(s.type === 'video' ? 'video' : 'image', { prompt: s.prompt, ...(s.aspect && { aspect: s.aspect }), ...(s.resolution && { resolution: s.resolution }), ...(s.model && { model: s.model }), ...(s.duration && { duration: s.duration }) })}
            addFromUrl={a => add('result', { status: 'done', url: a.url, kind: a.kind, aspect: '16:9', title: 'From library', created: Date.now() }, center(), { width: RESULT_W })} />
        )}

        {infoNode && <div className="info-wrap" style={{ right: panel ? 344 : 12 }}><InfoPanel node={infoNode} source={getNode(infoNode.data.source)} onClose={() => setInfoId(null)} /></div>}
        {menu && <Menu items={menu.items} x={menu.x} y={menu.y} onClose={() => setMenu(null)} />}
        {lightboxNode && <Lightbox node={lightboxNode} onClose={() => setModal(null)} />}
        {editNode && modal.kind === 'crop' && <CropEditor url={editNode.data.url} onClose={() => setModal(null)} onSave={(b, a) => saveBlobAsResult(editNode.id, b, a, 'Cropped')} />}
        {editNode && modal.kind === 'annotate' && <AnnotateEditor url={editNode.data.url} onClose={() => setModal(null)} onSave={(b, a) => saveBlobAsResult(editNode.id, b, a, 'Annotated')} />}
        {modal?.kind === 'shortcuts' && <ShortcutsModal onClose={() => setModal(null)} />}
        {modal?.kind === 'usage' && <UsageModal board={board} onClose={() => setModal(null)} />}
        {modal?.kind === 'ask' && <Ask title={modal.title} value={modal.value} onDone={modal.done} onClose={() => setModal(null)} />}
        {cursorChat && <CursorChat x={cursorChat.x} y={cursorChat.y} onClose={() => setCursorChat(null)} onSend={t => sendCursorChat(cursorChat.prefix + t, cursorChat.at)} />}
        {toast && <div className="toast">{toast}</div>}
      </div>
    </BoardCtx.Provider>
  );
}
