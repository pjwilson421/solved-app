import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { NodeResizer, NodeToolbar, Position, useReactFlow } from '@xyflow/react';
import { I } from './icons.jsx';
import { Dropdown } from './menu.jsx';
import { IMAGE_MODELS, VIDEO_MODELS, IMAGE_RATIOS, IMAGE_SIZES, LABELS, COLORS, hexOf } from './models.js';

// Board-level actions shared with every node.
export const BoardCtx = createContext(null);
const useBoard = () => useContext(BoardCtx);

const show = v => { v = String(v); return /^\d+k$/.test(v) ? v.toUpperCase() : v.charAt(0).toUpperCase() + v.slice(1); };

function Pill({ value, options, onChange, label }) {
  const cur = options.find(o => (o.value ?? o) === value);
  return (
    <Dropdown className="pill nodrag" title={label}
      items={() => options.map(o => ({ label: show(o.label ?? o), checked: (o.value ?? o) === value, disabled: o.disabled, note: o.disabled ? 'Not connected' : null, onClick: () => onChange(o.value ?? o) }))}>
      {show(cur?.label ?? value)}{I.chev({ size: 12 })}
    </Dropdown>
  );
}

// "+" slot: upload from computer or pick an image already on the board / in the library.
function Picker({ onPick, onClose }) {
  const { media, upload } = useBoard();
  const file = useRef();
  const ref = useRef();
  useEffect(() => {
    const f = e => { if (!ref.current?.contains(e.target)) onClose(); };
    setTimeout(() => addEventListener('pointerdown', f), 0);
    return () => removeEventListener('pointerdown', f);
  }, []);
  const imgs = media().filter(m => m.kind !== 'video');
  return (
    <div ref={ref} className="picker nodrag nowheel">
      <button className="picker-up" onClick={() => file.current.click()}>{I.upload({ size: 14 })} Upload image</button>
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden
        onChange={async e => { const f = e.target.files[0]; if (!f) return; onClose(); const url = await upload(f); if (url) onPick(url); }} />
      {imgs.length > 0 && <div className="picker-label">On this board and in the library</div>}
      <div className="picker-grid">
        {imgs.map(m => <button key={m.id} onClick={() => { onPick(m.url); onClose(); }}><img src={m.url} alt="" /></button>)}
      </div>
    </div>
  );
}

function Slot({ url, label, onSet, onClear }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="slot-wrap">
      {url ? (
        <div className="slot filled">
          <img src={url} alt="" />
          <button className="slot-x nodrag" onClick={onClear} aria-label="Remove">{I.close({ size: 10, sw: 2.4 })}</button>
        </div>
      ) : (
        <button className="slot add nodrag" onClick={() => setOpen(true)} aria-label={'Add ' + (label || 'image')}>{I.plus({ size: 18 })}</button>
      )}
      {label && <div className="slot-label">{label}</div>}
      {open && <Picker onPick={onSet} onClose={() => setOpen(false)} />}
    </div>
  );
}

const Prompt = ({ value, onChange, placeholder }) => (
  <textarea className="field nodrag nowheel" rows={3} value={value || ''} placeholder={placeholder}
    onKeyDown={e => e.stopPropagation()} onChange={e => onChange(e.target.value)} />
);

function NodeMenu({ id, data }) {
  const { act } = useBoard();
  return (
    <Dropdown className="ic-btn nodrag node-more" title="Block actions" alignRight items={() => [
      { label: 'Save as skill', icon: 'skills', disabled: !data.prompt?.trim(), onClick: () => act('saveSkill', id) },
      { label: 'Duplicate', icon: 'copy', kbd: '⌘D', onClick: () => act('duplicate', id) },
      'sep',
      { label: 'Delete', icon: 'trash', kbd: '⌫', danger: true, onClick: () => act('delete', id) },
    ]}>{I.dots({ size: 14 })}</Dropdown>
  );
}

export function ImageNode({ id, data, selected }) {
  const { updateNodeData } = useReactFlow();
  const { run } = useBoard();
  const set = p => updateNodeData(id, p);
  const refs = data.refs || [];
  const [adv, setAdv] = useState(false);
  return (
    <div className={'node gen' + (selected ? ' sel' : '')}>
      <div className="node-head">
        <div>
          <div className="node-title">{data.title || 'Create image'}</div>
          <Pill value={data.model || 'gpt_image_2_5'} label="Model" onChange={v => set({ model: v })}
            options={IMAGE_MODELS.map(m => ({ value: m.key, label: m.name, disabled: !m.on }))} />
        </div>
        <NodeMenu id={id} data={data} />
      </div>
      <div className="label">References</div>
      <div className="tray">
        {refs.map((u, i) => <Slot key={u + i} url={u} onClear={() => set({ refs: refs.filter((_, j) => j !== i) })} />)}
        {refs.length < 16 && <Slot onSet={u => set({ refs: [...refs, u] })} />}
      </div>
      <div className="label">Instruction</div>
      <Prompt value={data.prompt} onChange={v => set({ prompt: v })} placeholder="Describe the image…" />
      <button className="adv nodrag" onClick={() => setAdv(a => !a)}>Advanced <span className={'adv-chev' + (adv ? ' on' : '')}>{I.right({ size: 12 })}</span></button>
      {adv && (
        <div className="adv-body nodrag">
          <div><b>Quality</b><span>Higher takes longer.</span></div>
          <Pill value={data.quality || 'high'} options={[{ value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'xhigh', label: 'Extra high' }]} onChange={v => set({ quality: v })} label="Quality" />
        </div>
      )}
      <div className="node-foot">
        <div className="pills">
          <Pill value={data.aspect || '16:9'} options={IMAGE_RATIOS} onChange={v => set({ aspect: v })} label="Aspect ratio" />
          <Pill value={data.resolution || '2k'} options={IMAGE_SIZES} onChange={v => set({ resolution: v })} label="Resolution" />
        </div>
        <button className="go nodrag" disabled={!data.prompt?.trim()} onClick={() => run(id)}>Create</button>
      </div>
      {data.error && <div className="err">{data.error}</div>}
    </div>
  );
}

export function VideoNode({ id, data, selected }) {
  const { updateNodeData } = useReactFlow();
  const { run } = useBoard();
  const set = p => updateNodeData(id, p);
  const model = VIDEO_MODELS[data.model]?.on ? data.model : 'kling3';
  const m = VIDEO_MODELS[model];
  const durations = Array.from({ length: m.max - m.min + 1 }, (_, i) => ({ value: m.min + i, label: m.min + i + 's' }));
  const ready = data.prompt?.trim() && (!m.needsFrame || data.start);
  return (
    <div className={'node gen' + (selected ? ' sel' : '')}>
      <div className="node-head">
        <div><div className="node-title">Create video</div>
          <Pill value={model} label="Model" onChange={v => set({ model: v, duration: VIDEO_MODELS[v].min })}
            options={Object.entries(VIDEO_MODELS).map(([k, v]) => ({ value: k, label: v.name, disabled: !v.on }))} />
        </div>
        <NodeMenu id={id} data={data} />
      </div>
      {m.needsFrame && (
        <>
          <div className="label">Frames</div>
          <div className="tray">
            <Slot url={data.start} label="Start" onSet={u => set({ start: u })} onClear={() => set({ start: null })} />
            <Slot url={data.end} label="End" onSet={u => set({ end: u })} onClear={() => set({ end: null })} />
          </div>
        </>
      )}
      <div className="label">Instruction</div>
      <Prompt value={data.prompt} onChange={v => set({ prompt: v })} placeholder="Describe the shot and camera move…" />
      <div className="node-foot">
        <div className="pills">
          <Pill value={data.duration || m.min} options={durations} onChange={v => set({ duration: v })} label="Duration" />
          {!m.needsFrame && <Pill value={data.ratio || '16:9'} options={m.ratios} onChange={v => set({ ratio: v })} label="Aspect ratio" />}
          {!m.needsFrame && <Pill value={data.res || '1080p'} options={m.res} onChange={v => set({ res: v })} label="Resolution" />}
          <Pill value={data.sound === 'on' ? 'on' : 'off'} options={[{ value: 'on', label: 'Sound' }, { value: 'off', label: 'No sound' }]} onChange={v => set({ sound: v })} label="Sound" />
        </div>
        <button className="go nodrag" disabled={!ready} onClick={() => run(id)}>Create</button>
      </div>
      {m.needsFrame && !data.start && <div className="hint">Add a start frame.</div>}
      {data.error && <div className="err">{data.error}</div>}
    </div>
  );
}

export function Mic({ onText }) {
  const [on, setOn] = useState(false);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const start = () => {
    const r = new SR(); r.lang = 'en-US'; r.interimResults = false;
    r.onresult = e => onText(e.results[0][0].transcript); r.onend = () => setOn(false); r.onerror = () => setOn(false);
    setOn(true); r.start();
  };
  return <button className={'mini-ic' + (on ? ' rec' : '')} onClick={start} title="Voice input" aria-label="Voice input">{I.mic({ size: 14 })}</button>;
}

export function ResultNode({ id, data, selected }) {
  const { act, imageMenu, single, openMenu } = useBoard();
  const [w, h] = (data.aspect || '16:9').split(':').map(Number);
  const [ask, setAsk] = useState('');
  const pending = data.status === 'pending';
  const label = LABELS.find(l => l.key === data.label2);
  const color = hexOf(data.color);
  const tf = [data.flipX && 'scaleX(-1)', data.flipY && 'scaleY(-1)', data.rotate && `rotate(${data.rotate}deg)`].filter(Boolean).join(' ');
  const showBars = selected && single() && data.url;
  const isImg = data.kind !== 'video';
  const submit = () => { if (ask.trim()) { act('modifyRun', id, ask.trim()); setAsk(''); } };
  return (
    <div className={'result' + (selected ? ' sel' : '')}>
      <NodeResizer isVisible={selected} keepAspectRatio minWidth={160} lineClassName="rz-line" handleClassName="rz-handle" />
      <NodeToolbar isVisible={!!showBars} position={Position.Top} offset={34} className="sel-bar">
        <Dropdown className="sb-btn" title="Color" items={() => COLORS.map(c => ({ label: c.name, checked: (data.color || 'auto') === c.key, onClick: () => act('color', id, c.key) }))}>
          <span className="dot" style={{ background: color || 'transparent', borderColor: color || 'rgba(0,0,0,.35)' }} />
        </Dropdown>
        <Dropdown className="sb-btn" title="Label" items={() => LABELS.map(l => ({ label: l.name, checked: data.label2 === l.key, onClick: () => act('label', id, data.label2 === l.key ? null : l.key) }))}>{I.tag({ size: 15 })}</Dropdown>
        <span className="sb-sep" />
        <button className="sb-btn" title="Create frame" onClick={() => act('frameSelection')}>{I.frame({ size: 15 })}</button>
        <button className="sb-btn" title="Download" onClick={() => act('download', id)}>{I.download({ size: 15 })}</button>
        <button className="sb-btn" title="Full size" onClick={() => act('fullsize', id)}>{I.expand({ size: 15 })}</button>
        <button className="sb-btn" title="Info (I)" onClick={() => act('info', id)}>{I.info({ size: 15 })}</button>
      </NodeToolbar>
      <NodeToolbar isVisible={!!showBars} position={Position.Bottom} offset={14} className="sel-bar-wrap">
        <div className="sel-bar">
          <button className="sb-btn" title="Rerun" disabled={!data.source} onClick={() => act('rerun', id)}>{I.rerun({ size: 15 })}</button>
          <button className="sb-btn" title="Reuse settings" disabled={!data.source} onClick={() => act('reuse', id)}>{I.reuse({ size: 15 })}</button>
          {isImg && <span className="sb-sep" />}
          {isImg && <button className="sb-btn" title="Annotate" onClick={() => act('annotate', id)}>{I.pen({ size: 15 })}</button>}
          {isImg && <button className="sb-btn" title="Crop" onClick={() => act('crop', id)}>{I.crop({ size: 15 })}</button>}
          <button className="sb-btn" title="More actions" onClick={e => { const r = e.currentTarget.getBoundingClientRect(); openMenu(imageMenu(id), r.left, r.bottom + 8); }}>{I.dots({ size: 15 })}</button>
        </div>
        {isImg && (
          <div className="sel-bar ask nodrag">
            <input value={ask} placeholder="Type a change…" onChange={e => setAsk(e.target.value)} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') submit(); }} />
            <Mic onText={t => setAsk(a => (a ? a + ' ' : '') + t)} />
            {ask.trim() && <button className="mini-go" onClick={submit} aria-label="Run">{I.send({ size: 13, sw: 2 })}</button>}
          </div>
        )}
      </NodeToolbar>
      <div className="result-top">
        <span className="result-label">{data.title || (data.kind === 'video' ? 'Video' : 'Image')}</span>
        <span className="result-model">{data.modelName || ''}</span>
      </div>
      <div className="result-frame" style={{ aspectRatio: w + '/' + h, ...(color ? { background: color } : {}) }}>
        {pending && <div className="shimmer"><span>Generating…</span></div>}
        {data.status === 'error' && <div className="result-err">{data.error || 'Failed'}</div>}
        {data.url && (data.kind === 'video'
          ? <video src={data.url} controls loop playsInline className="nodrag" style={{ transform: tf || undefined }} />
          : <img src={data.url} alt="" draggable={false} style={{ transform: tf || undefined }} />)}
        {label && <span className="badge" style={{ background: label.color }}>{label.name}</span>}
      </div>
    </div>
  );
}

export function FrameNode({ id, data, selected }) {
  const { updateNodeData } = useReactFlow();
  const color = hexOf(data.color);
  return (
    <div className={'framenode' + (selected ? ' sel' : '')} style={color ? { background: color + '22', borderColor: color + '88' } : undefined}>
      <NodeResizer isVisible={selected} minWidth={120} minHeight={80} lineClassName="rz-line" handleClassName="rz-handle" />
      <input className="frame-title nodrag" value={data.title ?? 'Frame'} onChange={e => updateNodeData(id, { title: e.target.value })} onKeyDown={e => e.stopPropagation()} />
    </div>
  );
}

export function ShapeNode({ id, data, selected }) {
  const c = hexOf(data.color) || 'currentColor';
  const s = data.shape;
  const mid = 'ah-' + id.replace(/[^\w-]/g, '');
  let el;
  if (s === 'rect') el = <rect x="1" y="1" width="98" height="98" rx="2" />;
  else if (s === 'ellipse') el = <ellipse cx="50" cy="50" rx="49" ry="49" />;
  else if (s === 'triangle') el = <path d="M50 1 99 99H1Z" />;
  else if (s === 'diamond') el = <path d="M50 1 99 50 50 99 1 50Z" />;
  else if (s === 'line' || s === 'arrow') { const [x1, y1, x2, y2] = data.dir || [0, 100, 100, 0]; el = <line x1={x1} y1={y1} x2={x2} y2={y2} markerEnd={s === 'arrow' ? `url(#${mid})` : undefined} />; }
  else if (s === 'doodle') el = <polyline points={(data.points || []).map(p => p.join(',')).join(' ')} />;
  return (
    <div className={'shapenode' + (selected ? ' sel' : '')}>
      <NodeResizer isVisible={selected} minWidth={8} minHeight={8} lineClassName="rz-line" handleClassName="rz-handle" />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" stroke={c} strokeLinecap="round" strokeLinejoin="round">
        <defs><marker id={mid} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" markerUnits="strokeWidth" orient="auto"><path d="M0 0 10 5 0 10Z" fill={c} stroke="none" /></marker></defs>
        <g strokeWidth="2.5" style={{ vectorEffect: 'non-scaling-stroke' }}>{el}</g>
      </svg>
    </div>
  );
}

export function TimelineNode({ id, data, selected }) {
  const { updateNodeData } = useReactFlow();
  const clips = data.clips || [];
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const set = p => updateNodeData(id, p);
  const cur = clips[Math.min(i, clips.length - 1)];
  useEffect(() => {
    if (playing && cur && cur.kind !== 'video') { const t = setTimeout(() => i < clips.length - 1 ? setI(i + 1) : setPlaying(false), 2000); return () => clearTimeout(t); }
  }, [playing, i]);
  const swap = (a, b) => { const n = [...clips]; [n[a], n[b]] = [n[b], n[a]]; set({ clips: n }); };
  return (
    <div className={'node timeline' + (selected ? ' sel' : '')}>
      <div className="node-head"><div><div className="node-title">Timeline</div><div className="node-sub">{clips.length} {clips.length === 1 ? 'clip' : 'clips'}</div></div></div>
      <div className="tl-screen">
        {cur ? (cur.kind === 'video'
          ? <video key={i} src={cur.url} controls autoPlay={playing} className="nodrag" onEnded={() => i < clips.length - 1 ? setI(i + 1) : setPlaying(false)} />
          : <img src={cur.url} alt="" />)
          : <div className="tl-empty">Use “Open in timeline” on any image or video.</div>}
      </div>
      <div className="tl-strip nodrag nowheel">
        {clips.map((c, j) => (
          <div key={j} className={'tl-clip' + (j === i ? ' on' : '')} onClick={() => { setI(j); setPlaying(false); }}>
            {c.kind === 'video' ? <video src={c.url} muted /> : <img src={c.url} alt="" />}
            <div className="tl-act">
              <button onClick={e => { e.stopPropagation(); if (j > 0) swap(j - 1, j); }} aria-label="Move left">‹</button>
              <button onClick={e => { e.stopPropagation(); set({ clips: clips.filter((_, k) => k !== j) }); setI(0); }} aria-label="Remove">×</button>
              <button onClick={e => { e.stopPropagation(); if (j < clips.length - 1) swap(j, j + 1); }} aria-label="Move right">›</button>
            </div>
          </div>
        ))}
      </div>
      {clips.length > 1 && <button className="chip nodrag tl-play" onClick={() => { setI(0); setPlaying(true); }}>Play all</button>}
    </div>
  );
}

export function PaletteNode({ data, selected }) {
  const { say } = useBoard();
  return (
    <div className={'node palettenode' + (selected ? ' sel' : '')}>
      <div className="node-title">Palette</div>
      <div className="swatches">
        {(data.colors || []).map(c => (
          <button key={c} className="sw nodrag" style={{ background: c }} title={'Copy ' + c} onClick={() => { navigator.clipboard?.writeText(c); say('Copied ' + c); }}>
            <span>{c}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function TextNode({ id, data, selected }) {
  const { updateNodeData } = useReactFlow();
  const ref = useRef();
  useEffect(() => { if (data.autofocus) { ref.current?.focus(); updateNodeData(id, { autofocus: false }); } }, []);
  return (
    <div className={'textnode' + (selected ? ' sel' : '')}>
      <textarea ref={ref} className="nodrag nowheel" value={data.text || ''} placeholder="Type something" style={{ color: hexOf(data.color) || undefined }}
        rows={Math.max(1, (data.text || '').split('\n').length)}
        onKeyDown={e => e.stopPropagation()}
        onChange={e => updateNodeData(id, { text: e.target.value })} />
    </div>
  );
}

export function NoteNode({ id, data, selected }) {
  const { updateNodeData } = useReactFlow();
  const c = hexOf(data.color);
  return (
    <div className={'note' + (selected ? ' sel' : '')} style={c ? { background: c + '33' } : undefined}>
      <textarea className="nodrag nowheel" value={data.text || ''} placeholder="Note"
        autoFocus={data.autofocus} onKeyDown={e => e.stopPropagation()} onChange={e => updateNodeData(id, { text: e.target.value })} />
    </div>
  );
}

export const nodeTypes = {
  image: ImageNode, video: VideoNode, result: ResultNode, text: TextNode, note: NoteNode,
  frame: FrameNode, shape: ShapeNode, timeline: TimelineNode, palette: PaletteNode,
};
