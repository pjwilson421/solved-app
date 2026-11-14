import { useState } from 'react';
import { useStore, createBoard, deleteBoard, renameProject, deleteProject, duplicateBoard, moveBoard, updateBoard, ago, boardImages } from './store.js';
import { go } from './nav.js';
import { I } from './icons.jsx';
import { Dropdown, Ask } from './menu.jsx';
import { PreviewCard, useSortSearch, SearchPill } from './Projects.jsx';

export function boardMenu(b, projects, setModal) {
  return () => [
    { label: 'Open in new tab', icon: 'external', onClick: () => window.open(location.pathname + '#/b/' + b.id, '_blank') },
    { label: 'Rename', icon: 'edit', onClick: () => setModal({ title: 'Rename board', value: b.name, done: v => v && updateBoard(b.id, { name: v }) }) },
    { label: 'Duplicate', icon: 'reuse', onClick: () => duplicateBoard(b.id) },
    { label: 'Share', icon: 'link', onClick: () => navigator.clipboard?.writeText(location.origin + location.pathname + '#/b/' + b.id) },
    { label: 'Move', icon: 'move', sub: projects.filter(p => p.id !== b.projectId).map(p => ({ label: p.name, onClick: () => moveBoard(b.id, p.id) })).concat(projects.length < 2 ? [{ label: 'No other projects', disabled: true }] : []) },
    'sep',
    { label: 'Delete', icon: 'trash', danger: true, onClick: () => confirm('Delete board “' + b.name + '”?') && deleteBoard(b.id) },
  ];
}

export function Project({ id }) {
  const { projects, boards } = useStore();
  const p = projects.find(x => x.id === id);
  const [modal, setModal] = useState(null);
  const [all, setAll] = useState(false);
  const [toast, setToast] = useState('');
  const s = useSortSearch(boards.filter(b => all || b.projectId === id));
  if (!p) return <div className="empty">This project no longer exists. <button className="link" onClick={() => go('projects')}>Back to projects</button></div>;
  const imgs = b => boardImages(b).slice(-5).reverse();
  const newBoard = () => go('b/' + createBoard(id).id);
  const flash = t => { setToast(t); setTimeout(() => setToast(''), 2500); };

  return (
    <>
      <header className="topbar">
        <div className="pillgroup crumb">
          <button className="pill-ic" onClick={() => go('projects')} aria-label="Back">{I.back()}</button>
          <span className="sep" />
          <Dropdown className="crumb-name" title="Project actions" items={() => [
            { label: 'New board', icon: 'plus', kbd: '⇧⌘O', onClick: newBoard },
            { label: 'Rename', icon: 'edit', onClick: () => setModal({ title: 'Rename project', value: p.name, done: v => v && renameProject(id, v) }) },
            { label: 'Share', icon: 'link', onClick: () => { navigator.clipboard?.writeText(location.href); flash('Project link copied'); } },
            'sep',
            { label: 'Delete', icon: 'trash', danger: true, onClick: () => { if (confirm('Delete “' + p.name + '” and its boards?')) { deleteProject(id); go('projects'); } } },
          ]}>{p.name} {I.chev({ size: 12 })}</Dropdown>
        </div>
        <div className="top-r">
          <button className="share-btn" onClick={() => { navigator.clipboard?.writeText(location.href); flash('Project link copied'); }}>Share</button>
          <div className="pillgroup">
            <SearchPill s={s} placeholder="Search boards" />
            <Dropdown className="pill-ic" title="Filter" alignRight items={[
              { label: 'Name', checked: s.sort === 'name', onClick: () => s.setSort('name') },
              { label: 'Last edited', checked: s.sort === 'edited', onClick: () => s.setSort('edited') },
              'sep',
              { label: 'Show all boards', checked: all, onClick: () => setAll(a => !a) },
            ]}>{I.list({ size: 15 })}</Dropdown>
            <Dropdown className="pill-ic" title="More options" alignRight items={[
              { label: 'New board', icon: 'plus', kbd: '⇧⌘O', onClick: newBoard },
              { label: 'Rename project', icon: 'edit', onClick: () => setModal({ title: 'Rename project', value: p.name, done: v => v && renameProject(id, v) }) },
            ]}>{I.dots({ size: 15 })}</Dropdown>
          </div>
        </div>
      </header>
      <div className="cards">
        <button className="card card-new" onClick={newBoard} aria-label="New board">{I.plus({ size: 34, sw: 1.8 })}<span className="kbd-hint">⇧⌘O</span></button>
        {s.out.map(b => (
          <PreviewCard key={b.id} title={b.name} sub={(all && b.projectId !== id ? (projects.find(x => x.id === b.projectId)?.name + ' · ') : '') + 'Edited ' + ago(b.edited)} imgs={imgs(b)}
            onOpen={() => go('b/' + b.id)} menu={boardMenu(b, projects, setModal)} />
        ))}
      </div>
      {modal && <Ask title={modal.title} value={modal.value} onDone={modal.done} onClose={() => setModal(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
