import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { NodeResizer, useReactFlow } from '@xyflow/react';
import { I } from './icons.jsx';

// Board-level actions shared with every node.
export const BoardCtx = createContext(null);
const useBoard = () => useContext(BoardCtx);

export const IMAGE_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4', '3:2', '2:3', '21:9'];
export const IMAGE_SIZES = ['1k', '2k', '4k'];
export const VIDEO_MODELS = {
  kling3: { name: 'Kling 3.0', min: 3, max: 15, needsFrame: true },
  seedance: { name: 'Seedance 2.5', min: 4, max: 30, needsFrame: false, ratios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'], res: ['480p', '720p', '1080p'] },
};

const show = v => { v = String(v); return /^\d+k$/.test(v) ? v.toUpperCase() : v.charAt(0).toUpperCase() + v.slice(1); };

function Pill({ value, options, onChange, label }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pill-wrap nodrag">
      <button className="pill" onClick={() => setOpen(o => !o)} aria-label={label}>
        {show(options.find(o => (o.value ?? o) === value)?.label ?? value)}{I.chev({ size: 12 })}
      </button>
      {open && (
        <div className="menu" onMouseLeave={() => setOpen(false)}>
          {options.map(o => (
            <button key={o.value ?? o} className={'menu-item' + ((o.value ?? o) === value ? ' on' : '')}
              onClick={() => { onChange(o.value ?? o); setOpen(false); }}>{show(o.label ?? o)}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// "+" slot: upload from computer or pick an image already on the board.
function Picker({ onPick, onClose }) {
  const { media, upload } = useBoard();
  const file = useRef();
  const imgs = media().filter(m => m.kind !== 'video');
  return (
    <div className="picker nodrag nowheel" onMouseLeave={onClose}>
      <button className="picker-up" onClick={() => file.current.click()}>{I.upload({ size: 14 })} Upload image</button>
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden
        onChange={async e => { const f = e.target.files[0]; if (!f) return; onClose(); const url = await upload(f); if (url) onPick(url); }} />
      {imgs.length > 0 && <div className="picker-label">On this board</div>}
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

function Prompt({ value, onChange, placeholder }) {
  return (
    <textarea className="field nodrag nowheel" rows={3} value={value || ''} placeholder={placeholder}
      onChange={e => onChange(e.target.value)} />
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
      <div className="node-head"><div><div className="node-title">Create image</div><div className="node-sub">GPT Image 2.5</div></div></div>
      <div className="label">References</div>
      <div className="tray">
        {refs.map((u, i) => <Slot key={u + i} url={u} onClear={() => set({ refs: refs.filter((_, j) => j !== i) })} />)}
        {refs.length < 16 && <Slot onSet={u => set({ refs: [...refs, u] })} />}
      </div>
      <div className="label">Instruction</div>
      <Prompt value={data.prompt} onChange={v => set({ prompt: v })} placeholder="Describe the image…" />
      <button className="adv nodrag" onClick={() => setAdv(a => !a)}>Advanced {I.right({ size: 12 })}</button>
      {adv && (
        <div className="adv-body nodrag">
          <span>Quality</span>
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
  const model = data.model || 'kling3';
  const m = VIDEO_MODELS[model];
  const durations = Array.from({ length: m.max - m.min + 1 }, (_, i) => ({ value: m.min + i, label: m.min + i + 's' }));
  const ready = data.prompt?.trim() && (!m.needsFrame || data.start);
  return (
    <div className={'node gen' + (selected ? ' sel' : '')}>
      <div className="node-head">
        <div><div className="node-title">Create video</div>
          <Pill value={model} options={Object.entries(VIDEO_MODELS).map(([k, v]) => ({ value: k, label: v.name }))}
            onChange={v => set({ model: v, duration: VIDEO_MODELS[v].min })} label="Model" />
        </div>
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

export function ResultNode({ id, data, selected }) {
  const { deleteElements } = useReactFlow();
  const { spawnFrom } = useBoard();
  const [w, h] = (data.aspect || '16:9').split(':').map(Number);
  const pending = data.status === 'pending';
  return (
    <div className={'result' + (selected ? ' sel' : '')}>
      <NodeResizer isVisible={selected} keepAspectRatio minWidth={160} lineClassName="rz-line" handleClassName="rz-handle" />
      {data.label && <div className="result-label">{data.label}</div>}
      <div className="result-frame" style={{ aspectRatio: w + '/' + h }}>
        {pending && <div className="shimmer"><span>Generating…</span></div>}
        {data.status === 'error' && <div className="result-err">{data.error || 'Failed'}</div>}
        {data.url && (data.kind === 'video'
          ? <video src={data.url} controls loop playsInline className="nodrag" />
          : <img src={data.url} alt="" draggable={false} />)}
      </div>
      {data.url && (
        <div className="result-bar nodrag">
          {data.kind !== 'video' && <button onClick={() => spawnFrom(id, 'image')} title="Use as reference">{I.image({ size: 14 })}<span>Reference</span></button>}
          {data.kind !== 'video' && <button onClick={() => spawnFrom(id, 'video')} title="Animate">{I.video({ size: 14 })}<span>Animate</span></button>}
          <a href={data.url} target="_blank" rel="noreferrer" download title="Download">{I.download({ size: 14 })}</a>
          <button onClick={() => deleteElements({ nodes: [{ id }] })} title="Delete">{I.trash({ size: 14 })}</button>
        </div>
      )}
    </div>
  );
}

export function TextNode({ id, data, selected }) {
  const { updateNodeData } = useReactFlow();
  const ref = useRef();
  useEffect(() => { if (data.autofocus) { ref.current?.focus(); updateNodeData(id, { autofocus: false }); } }, []);
  return (
    <div className={'textnode' + (selected ? ' sel' : '')}>
      <textarea ref={ref} className="nodrag nowheel" value={data.text || ''} placeholder="Type something"
        rows={Math.max(1, (data.text || '').split('\n').length)}
        onChange={e => updateNodeData(id, { text: e.target.value })} />
    </div>
  );
}

export function NoteNode({ id, data, selected }) {
  const { updateNodeData } = useReactFlow();
  return (
    <div className={'note' + (selected ? ' sel' : '')}>
      <textarea className="nodrag nowheel" value={data.text || ''} placeholder="Note"
        autoFocus={data.autofocus} onChange={e => updateNodeData(id, { text: e.target.value })} />
    </div>
  );
}

export const nodeTypes = { image: ImageNode, video: VideoNode, result: ResultNode, text: TextNode, note: NoteNode };
