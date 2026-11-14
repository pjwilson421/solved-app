import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { I } from './icons.jsx';

/* Item: { label, icon, kbd, onClick, disabled, note, sub: Item[], checked, danger } | 'sep' */

function List({ items, x, y, onClose, level = 0, alignRight, px = 0 }) {
  const ref = useRef();
  const [pos, setPos] = useState({ left: x, top: y });
  const [open, setOpen] = useState(-1);
  const [subY, setSubY] = useState(0);
  useLayoutEffect(() => {
    const r = ref.current.getBoundingClientRect();
    let left = alignRight ? x - r.width : x, top = y;
    if (left + r.width > innerWidth - 8) left = level ? px - r.width - 4 : innerWidth - r.width - 8;
    if (top + r.height > innerHeight - 8) top = Math.max(8, innerHeight - r.height - 8);
    setPos({ left: Math.max(8, left), top });
  }, [x, y]);
  return (
    <div ref={ref} className="cm" style={pos} role="menu" onContextMenu={e => e.preventDefault()}>
      {items.filter(Boolean).map((it, i) => it === 'sep' ? <div key={i} className="cm-sep" /> : (
        <button key={i} role="menuitem" className={'cm-item' + (it.disabled ? ' off' : '') + (open === i ? ' open' : '') + (it.danger ? ' danger' : '')}
          onMouseEnter={e => { if (it.sub) { setOpen(i); setSubY(e.currentTarget.getBoundingClientRect().top - 6); } else setOpen(-1); }}
          onClick={e => {
            if (it.disabled) return;
            if (it.sub) { setOpen(i); setSubY(e.currentTarget.getBoundingClientRect().top - 6); return; }
            onClose(); it.onClick?.();
          }}>
          <span className="cm-ic">{it.checked != null ? (it.checked ? I.check({ size: 14 }) : null) : it.icon ? I[it.icon]?.({ size: 14 }) : null}</span>
          <span className="cm-label">{it.label}</span>
          {it.note && <span className="cm-note">{it.note}</span>}
          {it.kbd && <span className="cm-kbd">{it.kbd}</span>}
          {it.sub && <span className="cm-arrow">{I.right({ size: 12 })}</span>}
        </button>
      ))}
      {open > -1 && items.filter(Boolean)[open]?.sub && (
        <List items={items.filter(Boolean)[open].sub} x={pos.left + (ref.current?.offsetWidth || 220) + 4} y={subY} onClose={onClose} level={level + 1} px={pos.left} />
      )}
    </div>
  );
}

// Floating menu at a point. Closes on outside click / Escape.
export function Menu({ items, x, y, onClose, alignRight }) {
  useEffect(() => {
    const down = e => { if (!e.target.closest('.cm')) onClose(); };
    const key = e => { if (e.key === 'Escape') onClose(); };
    setTimeout(() => addEventListener('pointerdown', down), 0);
    addEventListener('keydown', key);
    return () => { removeEventListener('pointerdown', down); removeEventListener('keydown', key); };
  }, [onClose]);
  return createPortal(<div className="cm-layer"><List items={items} x={x} y={y} onClose={onClose} alignRight={alignRight} /></div>, document.body);
}

// A button that opens a menu below (or above) itself.
export function Dropdown({ items, children, className, title, up, alignRight }) {
  const [at, setAt] = useState(null);
  const ref = useRef();
  const toggle = () => {
    if (at) return setAt(null);
    const r = ref.current.getBoundingClientRect();
    setAt({ x: alignRight ? r.right : r.left, y: up ? r.top - 8 - 40 * (typeof items === 'function' ? items() : items).length : r.bottom + 6 });
  };
  return (
    <>
      <button ref={ref} className={className} onClick={toggle} title={title} aria-label={title} aria-haspopup="menu">{children}</button>
      {at && <Menu items={typeof items === 'function' ? items() : items} x={at.x} y={Math.max(8, at.y)} onClose={() => setAt(null)} alignRight={alignRight} />}
    </>
  );
}

// Small modal shell.
export function Modal({ title, onClose, children, wide }) {
  useEffect(() => { const k = e => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [onClose]);
  return createPortal(
    <div className="modal-bg" onPointerDown={e => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-label={title}>
        <div className="modal-head"><b>{title}</b><button className="ic-btn" onClick={onClose} aria-label="Close">{I.close({ size: 14 })}</button></div>
        {children}
      </div>
    </div>, document.body);
}

// Simple prompt dialog (rename etc.)
export function Ask({ title, value = '', label, onDone, onClose, options }) {
  const [v, setV] = useState(value);
  return (
    <Modal title={title} onClose={onClose}>
      {options ? (
        <div className="ask-list">{options.map(o => <button key={o.value} className="ask-opt" onClick={() => { onDone(o.value); onClose(); }}>{o.label}</button>)}</div>
      ) : (
        <form onSubmit={e => { e.preventDefault(); onDone(v.trim()); onClose(); }}>
          {label && <div className="ask-label">{label}</div>}
          <input className="ask-input" autoFocus value={v} onChange={e => setV(e.target.value)} onFocus={e => e.target.select()} />
          <div className="modal-foot"><button type="button" className="chip" onClick={onClose}>Cancel</button><button className="go">Save</button></div>
        </form>
      )}
    </Modal>
  );
}
