import { useState } from 'react';
import { useStore, createBoard, deleteBoard, renameProject, ago } from './store.js';
import { go } from './nav.js';
import { I } from './icons.jsx';
import { PreviewCard } from './Projects.jsx';

export function Project({ id }) {
  const { projects, boards } = useStore();
  const p = projects.find(x => x.id === id);
  const [editing, setEditing] = useState(false);
  if (!p) return <div className="empty">This project no longer exists. <button className="link" onClick={() => go('projects')}>Back to projects</button></div>;
  const list = boards.filter(b => b.projectId === id);
  const imgs = b => b.nodes.filter(n => n.type === 'result' && n.data.url && n.data.kind !== 'video').map(n => n.data.url).slice(-5).reverse();
  const newBoard = () => go('b/' + createBoard(id).id);

  return (
    <>
      <header className="topbar">
        <div className="pillgroup crumb">
          <button className="pill-ic" onClick={() => go('projects')} aria-label="Back">{I.back()}</button>
          <span className="sep" />
          {editing ? (
            <input className="crumb-input" autoFocus defaultValue={p.name}
              onBlur={e => { renameProject(id, e.target.value.trim() || p.name); setEditing(false); }}
              onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} />
          ) : (
            <button className="crumb-name" onClick={() => setEditing(true)} title="Rename">{p.name}</button>
          )}
        </div>
      </header>
      <div className="cards">
        <button className="card card-new" onClick={newBoard} aria-label="New board">{I.plus({ size: 34, sw: 1.8 })}</button>
        {list.map(b => (
          <PreviewCard key={b.id} title={b.name} sub={'Edited ' + ago(b.edited)} imgs={imgs(b)}
            onOpen={() => go('b/' + b.id)}
            onDelete={() => { if (confirm('Delete board “' + b.name + '”?')) deleteBoard(b.id); }} />
        ))}
      </div>
    </>
  );
}
