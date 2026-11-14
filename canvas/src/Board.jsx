import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, ReactFlowProvider, Background, BackgroundVariant, useNodesState, useReactFlow, useViewport } from '@xyflow/react';
import { useStore, getState, updateBoard, uid } from './store.js';
import { go } from './nav.js';
import { I } from './icons.jsx';
import { BoardCtx, nodeTypes } from './nodes.jsx';
import { generateImage, generateVideo, poll, uploadFile } from './api.js';
import { Chat } from './Chat.jsx';

const RESULT_W = 360;
const ratioOf = a => { const [w, h] = String(a || '16:9').split(':').map(Number); return h / w || 9 / 16; };

export function Board({ id }) {
  const { boards, projects } = useStore();
  const board = boards.find(b => b.id === id);
  if (!board) return <div className="empty">This board no longer exists. <button className="link" onClick={() => go('projects')}>Back to projects</button></div>;
  const project = projects.find(p => p.id === board.projectId);
  return <ReactFlowProvider><Canvas key={id} board={board} project={project} /></ReactFlowProvider>;
}

function Canvas({ board, project }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(board.nodes || []);
  const rf = useReactFlow();
  const { zoom } = useViewport();
  const [tool, setTool] = useState('select');
  const [chatOpen, setChatOpen] = useState(true);
  const [toast, setToast] = useState('');
  const [renaming, setRenaming] = useState(false);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const fileRef = useRef();
  const say = t => { setToast(t); clearTimeout(say.t); say.t = setTimeout(() => setToast(''), 4000); };

  // Save the board whenever nodes change.
  useEffect(() => {
    const t = setTimeout(() => updateBoard(board.id, { nodes: nodes.map(({ selected, dragging, resizing, ...n }) => n) }), 400);
    return () => clearTimeout(t);
  }, [nodes, board.id]);

  const patch = (nid, p) => setNodes(ns => ns.map(n => n.id === nid ? { ...n, data: { ...n.data, ...p } } : n));
  const center = (dx = 0, dy = 0) => {
    const r = document.querySelector('.board-flow').getBoundingClientRect();
    const chat = document.querySelector('.chat');
    const right = chat ? chat.getBoundingClientRect().left : r.right;
    const p = rf.screenToFlowPosition({ x: r.left + (right - r.left) / 2, y: r.top + r.height / 2 - 40 });
    return { x: p.x - 170 + dx, y: p.y - 160 + dy };
  };
  const add = (type, data = {}, position, extra = {}) => {
    const n = { id: uid(), type, position: position || center(), data, ...extra };
    setNodes(ns => [...ns.map(x => ({ ...x, selected: false })), { ...n, selected: true }]);
    return n;
  };

  const track = useCallback(async (resultId, requestId) => {
    try {
      const s = await poll(requestId);
      patch(resultId, { status: 'done', url: s.url, kind: s.kind, requestId: null });
    } catch (e) {
      patch(resultId, { status: 'error', error: e.message, requestId: null });
    }
  }, []);

  // Below everything already on the board (used for blocks the chat adds).
  const freeSpot = (i = 0) => {
    const ns = nodesRef.current;
    if (!ns.length) return center(i * 380);
    const left = Math.min(...ns.map(n => n.position.x));
    const bottom = Math.max(...ns.map(n => n.position.y + (n.measured?.height || 300)));
    return { x: left + i * 380, y: bottom + 80 };
  };

  // Fit on first open of a board that has content but no saved view.
  useEffect(() => { if (!board.viewport && nodesRef.current.length) setTimeout(() => rf.fitView({ padding: 0.15, maxZoom: 1 }), 50); }, []);

  // Resume anything still generating from a previous visit.
  useEffect(() => {
    nodesRef.current.filter(n => n.type === 'result' && n.data.status === 'pending' && n.data.requestId).forEach(n => track(n.id, n.data.requestId));
  }, []);

  const placeResult = (src, aspect) => {
    const w = src.measured?.width || 340;
    const siblings = nodesRef.current.filter(n => n.type === 'result' && n.data.source === src.id);
    const y = siblings.length
      ? Math.max(...siblings.map(n => n.position.y + (n.measured?.height || RESULT_W * ratioOf(n.data.aspect)))) + 32
      : src.position.y;
    return { x: src.position.x + w + 48, y };
  };

  const run = async nid => {
    const src = nodesRef.current.find(n => n.id === nid);
    if (!src) return;
    const d = src.data;
    const isVideo = src.type === 'video';
    const aspect = isVideo ? (d.model === 'seedance' ? d.ratio || '16:9' : d.startAspect || '16:9') : d.aspect || '16:9';
    const res = add('result', { status: 'pending', source: nid, aspect, kind: isVideo ? 'video' : 'image', label: isVideo ? 'Video' : 'Image' }, placeResult(src, aspect), { width: RESULT_W });
    setNodes(ns => ns.map(n => n.id === nid ? { ...n, selected: true, data: { ...n.data, error: null } } : { ...n, selected: n.id === nid }));
    try {
      const requestId = isVideo
        ? await generateVideo({
            model: d.model || 'kling3', prompt: d.prompt, image_url: d.start || undefined, last_image_url: d.end || undefined,
            duration: d.duration || (d.model === 'seedance' ? 4 : 3), ratio: d.ratio || '16:9', resolution: d.res || '1080p', sound: d.sound || 'off',
          })
        : await generateImage({ prompt: d.prompt, references: d.refs || [], aspect, resolution: d.resolution || '2k', quality: d.quality || 'high' });
      patch(res.id, { requestId });
      track(res.id, requestId);
    } catch (e) {
      setNodes(ns => ns.filter(n => n.id !== res.id).map(n => n.id === nid ? { ...n, data: { ...n.data, error: e.message } } : n));
    }
  };

  const spawnFrom = (rid, kind) => {
    const r = nodesRef.current.find(n => n.id === rid);
    if (!r) return;
    const pos = { x: r.position.x + (r.measured?.width || RESULT_W) + 48, y: r.position.y };
    if (kind === 'image') add('image', { refs: [r.data.url], prompt: '' }, pos);
    else add('video', { model: 'kling3', start: r.data.url, startAspect: r.data.aspect, prompt: '', duration: 5 }, pos);
  };

  const upload = async file => {
    try { return await uploadFile(file); }
    catch (e) { say(e.message); return null; }
  };

  const uploadToBoard = async file => {
    let aspect = '1:1';
    try { const b = await createImageBitmap(file); aspect = b.width + ':' + b.height; } catch (e) {}
    const n = add('result', { status: 'pending', kind: 'image', aspect, label: file.name.replace(/\.[^.]+$/, '') }, center(), { width: RESULT_W });
    const url = await upload(file);
    if (url) patch(n.id, { status: 'done', url });
    else setNodes(ns => ns.filter(x => x.id !== n.id));
  };

  const media = () => nodesRef.current.filter(n => n.type === 'result' && n.data.url).map(n => ({ id: n.id, url: n.data.url, kind: n.data.kind })).reverse();

  const pickTool = t => {
    if (t === 'upload') return fileRef.current.click();
    if (t === 'image') { add('image', { prompt: '', refs: [], aspect: '16:9', resolution: '2k' }); return setTool('select'); }
    if (t === 'video') { add('video', { model: 'kling3', prompt: '', duration: 5 }); return setTool('select'); }
    setTool(t);
  };

  const onPaneClick = e => {
    if (tool === 'text' || tool === 'note') {
      const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      add(tool, { text: '', autofocus: true }, p);
      setTool('select');
    }
  };

  const onDrop = e => {
    e.preventDefault();
    [...e.dataTransfer.files].filter(f => /^image\/(png|jpe?g|webp)$/.test(f.type)).forEach(uploadToBoard);
  };

  // Shift+1 fits everything, like Luma.
  useEffect(() => {
    const k = e => {
      if (/input|textarea/i.test(document.activeElement?.tagName)) return;
      if (e.shiftKey && e.code === 'Digit1') rf.fitView({ padding: 0.15, duration: 300, maxZoom: 1 });
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === 'v') setTool('select');
        if (e.key === 't') setTool('text');
        if (e.key === 'n') setTool('note');
      }
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [rf]);

  const ctx = useMemo(() => ({ run, spawnFrom, media, upload }), []);
  // ctx functions read nodesRef, so a stable object is fine.
  Object.assign(ctx, { run, spawnFrom, media, upload });

  const tools = [
    ['select', 'pointer', 'Select (V)'], 'sep',
    ['image', 'image', 'Create image'], ['video', 'video', 'Create video'], 'sep',
    ['text', 'text', 'Text (T)'], ['note', 'note', 'Note (N)'], ['upload', 'upload', 'Upload image'],
  ];

  return (
    <BoardCtx.Provider value={ctx}>
      <div className={'board' + (tool === 'text' || tool === 'note' ? ' placing' : '')} onDragOver={e => e.preventDefault()} onDrop={onDrop}>
        <div className="board-flow">
          <ReactFlow
            nodes={nodes} onNodesChange={onNodesChange} nodeTypes={nodeTypes}
            defaultViewport={board.viewport || { x: 80, y: 80, zoom: 0.8 }}
            onMoveEnd={(_, vp) => updateBoard(board.id, { viewport: vp })}
            onPaneClick={onPaneClick}
            minZoom={0.1} maxZoom={4} panOnScroll zoomOnPinch selectionOnDrag={tool === 'select'} panOnDrag={[1, 2]}
            deleteKeyCode={['Backspace', 'Delete']} proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.4} color="rgba(0,0,0,.16)" />
          </ReactFlow>
        </div>

        <div className="bd-top-left">
          <button className="bd-back" onClick={() => go('p/' + board.projectId)} aria-label="Back to project">{I.back({ size: 16 })}</button>
          <span className="bd-crumb"><b>{project?.name || 'Project'}</b> / </span>
          {renaming ? (
            <input className="bd-name-input" autoFocus defaultValue={board.name}
              onBlur={e => { updateBoard(board.id, { name: e.target.value.trim() || board.name }); setRenaming(false); }}
              onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} />
          ) : <button className="bd-name" onClick={() => setRenaming(true)}>{board.name}</button>}
        </div>

        {nodes.length === 0 && (
          <div className="bd-empty">
            <div>Start with an idea.</div>
            <span>Add a Create image block from the toolbar, drop in an image, or ask in the chat.</span>
          </div>
        )}

        <div className="toolbar" role="toolbar">
          {tools.map((t, i) => t === 'sep' ? <span key={i} className="tb-sep" /> : (
            <button key={t[0]} className={'tb' + (tool === t[0] ? ' on' : '')} onClick={() => pickTool(t[0])} title={t[2]} aria-label={t[2]}>
              {I[t[1]]({ size: 18 })}
            </button>
          ))}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden
            onChange={e => { [...e.target.files].forEach(uploadToBoard); e.target.value = ''; }} />
        </div>

        <div className="zoombar">
          <button onClick={() => rf.zoomOut({ duration: 150 })} aria-label="Zoom out">−</button>
          <button className="zv" onClick={() => rf.fitView({ padding: 0.15, duration: 300, maxZoom: 1 })} title="Fit (Shift+1)">{Math.round(zoom * 100)}%</button>
          <button onClick={() => rf.zoomIn({ duration: 150 })} aria-label="Zoom in">+</button>
        </div>

        {!chatOpen && (
          <button className="chat-fab" onClick={() => setChatOpen(true)} aria-label="Open chat">{I.chat({ size: 18 })}</button>
        )}
        {chatOpen && <Chat board={board} nodesRef={nodesRef} onClose={() => setChatOpen(false)} add={add} run={run} freeSpot={freeSpot} reveal={() => setTimeout(() => rf.fitView({ padding: 0.15, duration: 300, maxZoom: 1 }), 80)} />}

        {toast && <div className="toast">{toast}</div>}
      </div>
    </BoardCtx.Provider>
  );
}
