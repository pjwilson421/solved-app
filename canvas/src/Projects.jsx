import { useState } from 'react';
import { useStore, createProject, ago, deleteProject } from './store.js';
import { go } from './nav.js';
import { I } from './icons.jsx';

export function Projects() {
  const { projects, boards } = useStore();
  const [grid, setGrid] = useState(false);
  const newProject = () => go('p/' + createProject().id);
  const count = id => boards.filter(b => b.projectId === id).length;
  const thumbs = id => boards.filter(b => b.projectId === id).flatMap(b => b.nodes.filter(n => n.type === 'result' && n.data.url && n.data.kind !== 'video').map(n => n.data.url)).slice(0, 5);

  return (
    <>
      <header className="topbar">
        <h1 className="page-title">Projects</h1>
        <div className="pillgroup">
          <button className={'pill-ic' + (grid ? ' on' : '')} onClick={() => setGrid(true)} aria-label="Grid view">{I.grid()}</button>
          <button className={'pill-ic' + (!grid ? ' on' : '')} onClick={() => setGrid(false)} aria-label="List view">{I.list()}</button>
        </div>
      </header>
      {grid ? (
        <div className="cards">
          <button className="card card-new" onClick={newProject}>{I.plus({ size: 34, sw: 1.8 })}</button>
          {projects.map(p => <PreviewCard key={p.id} title={p.name} sub={'Edited ' + ago(p.edited)} imgs={thumbs(p.id)} onOpen={() => go('p/' + p.id)} />)}
        </div>
      ) : (
        <div className="table">
          <div className="tr th"><span>Name</span><span>Boards</span><span>Edited</span><span /></div>
          <button className="tr new" onClick={newProject}>{I.plus({ size: 14 })}<span>New project</span></button>
          {projects.map(p => (
            <div className="tr row" key={p.id} onClick={() => go('p/' + p.id)}>
              <span className="strong">{p.name}</span>
              <span>{count(p.id)}</span>
              <span>{ago(p.edited)}</span>
              <span className="row-act">
                <button className="ic-btn" aria-label="Delete project" onClick={e => { e.stopPropagation(); if (confirm('Delete “' + p.name + '” and its boards?')) deleteProject(p.id); }}>{I.trash({ size: 14 })}</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function PreviewCard({ title, sub, imgs = [], onOpen, onDelete }) {
  const slot = i => imgs[i] ? <img src={imgs[i]} alt="" /> : null;
  return (
    <div className="card" role="button" tabIndex={0} onClick={onOpen} onKeyDown={e => e.key === 'Enter' && onOpen()}>
      <div className="card-head">
        <div>
          <div className="card-title">{title}</div>
          <div className="card-sub">{sub}</div>
        </div>
        {onDelete && <button className="ic-btn card-del" aria-label="Delete" onClick={e => { e.stopPropagation(); onDelete(); }}>{I.trash({ size: 14 })}</button>}
      </div>
      <div className="card-prev">
        <div className="pv big">{slot(0)}</div>
        <div className="pv">{slot(1)}</div><div className="pv">{slot(2)}</div>
        <div className="pv">{slot(3)}</div><div className="pv">{slot(4)}</div>
      </div>
    </div>
  );
}
