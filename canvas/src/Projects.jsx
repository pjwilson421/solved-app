import { useState } from 'react';
import { useStore, createProject, createBoard, ago, deleteProject, renameProject, duplicateProject, boardImages, setSetting } from './store.js';
import { go } from './nav.js';
import { I } from './icons.jsx';
import { Menu, Dropdown, Ask } from './menu.jsx';
import { ShortcutsModal } from './editors.jsx';

export function useSortSearch(list, key = 'name') {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('edited');
  const [searching, setSearching] = useState(false);
  const out = list.filter(x => !q || x.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : b.edited - a.edited);
  return { out, q, setQ, sort, setSort, searching, setSearching };
}

export function SearchPill({ s, placeholder }) {
  return s.searching ? (
    <input className="search-input" autoFocus placeholder={placeholder} value={s.q} onChange={e => s.setQ(e.target.value)}
      onBlur={() => !s.q && s.setSearching(false)} onKeyDown={e => e.key === 'Escape' && (s.setQ(''), s.setSearching(false))} />
  ) : <button className="pill-ic" onClick={() => s.setSearching(true)} title={placeholder} aria-label={placeholder}>{I.search({ size: 15 })}</button>;
}

export function Projects() {
  const { projects, boards, settings } = useStore();
  const [grid, setGrid] = useState(false);
  const [menu, setMenu] = useState(null);
  const [modal, setModal] = useState(null);
  const s = useSortSearch(projects);
  const newProject = () => go('p/' + createProject().id);
  const count = id => boards.filter(b => b.projectId === id).length;
  const thumbs = id => boards.filter(b => b.projectId === id).flatMap(boardImages).slice(-5).reverse();
  const rowMenu = p => [
    { label: 'Open', icon: 'folder', onClick: () => go('p/' + p.id) },
    { label: 'New board', icon: 'plus', onClick: () => go('b/' + createBoard(p.id).id) },
    { label: 'Rename', icon: 'edit', onClick: () => setModal({ title: 'Rename project', value: p.name, done: v => v && renameProject(p.id, v) }) },
    { label: 'Duplicate', icon: 'reuse', onClick: () => duplicateProject(p.id) },
    'sep',
    { label: 'Delete', icon: 'trash', danger: true, onClick: () => confirm('Delete “' + p.name + '” and its boards?') && deleteProject(p.id) },
  ];
  const ctx = (e, p) => { e.preventDefault(); setMenu({ items: rowMenu(p), x: e.clientX, y: e.clientY }); };

  return (
    <>
      <header className="topbar">
        <h1 className="page-title">Projects</h1>
        <div className="top-r">
          <div className="pillgroup">
            <button className={'pill-ic' + (grid ? ' on' : '')} onClick={() => setGrid(true)} aria-label="Grid view">{I.grid()}</button>
            <button className={'pill-ic' + (!grid ? ' on' : '')} onClick={() => setGrid(false)} aria-label="List view">{I.list()}</button>
          </div>
          <div className="pillgroup">
            <SearchPill s={s} placeholder="Search projects" />
            <Dropdown className="pill-ic" title="Sort" alignRight items={[
              { label: 'Name', checked: s.sort === 'name', onClick: () => s.setSort('name') },
              { label: 'Last edited', checked: s.sort === 'edited', onClick: () => s.setSort('edited') },
            ]}>{I.list({ size: 15 })}</Dropdown>
            <Dropdown className="pill-ic" title="More options" alignRight items={() => [
              { label: 'New project', icon: 'plus', onClick: newProject },
              { label: 'Keyboard shortcuts', icon: 'keyboard', onClick: () => setModal({ kind: 'keys' }) },
              { label: 'Theme', icon: 'sun', sub: [['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => ({ label: l, checked: settings.theme === k, onClick: () => setSetting('theme', k) })) },
            ]}>{I.dots({ size: 15 })}</Dropdown>
          </div>
        </div>
      </header>
      {grid ? (
        <div className="cards">
          <button className="card card-new" onClick={newProject} aria-label="New project">{I.plus({ size: 34, sw: 1.8 })}</button>
          {s.out.map(p => <PreviewCard key={p.id} title={p.name} sub={'Edited ' + ago(p.edited)} imgs={thumbs(p.id)} onOpen={() => go('p/' + p.id)} menu={() => rowMenu(p)} />)}
        </div>
      ) : (
        <div className="table">
          <div className="tr th"><span>Name</span><span>Boards</span><span>Edited</span><span /></div>
          <button className="tr new" onClick={newProject}>{I.plus({ size: 14 })}<span>New project</span></button>
          {s.out.map(p => (
            <div className="tr row" key={p.id} onClick={() => go('p/' + p.id)} onContextMenu={e => ctx(e, p)}>
              <span className="strong">{p.name}</span>
              <span>{count(p.id)}</span>
              <span>{ago(p.edited)}</span>
              <span className="row-act" onClick={e => e.stopPropagation()}>
                <Dropdown className="ic-btn" title="Project actions" alignRight items={() => rowMenu(p)}>{I.dots({ size: 14 })}</Dropdown>
              </span>
            </div>
          ))}
        </div>
      )}
      {menu && <Menu {...menu} onClose={() => setMenu(null)} />}
      {modal?.kind === 'keys' && <ShortcutsModal onClose={() => setModal(null)} />}
      {modal?.title && <Ask title={modal.title} value={modal.value} onDone={modal.done} onClose={() => setModal(null)} />}
    </>
  );
}

export function PreviewCard({ title, sub, imgs = [], onOpen, menu }) {
  const [at, setAt] = useState(null);
  const slot = i => imgs[i] ? <img src={imgs[i]} alt="" /> : null;
  return (
    <div className="card" role="button" tabIndex={0} onClick={onOpen} onKeyDown={e => e.key === 'Enter' && onOpen()}
      onContextMenu={e => { if (!menu) return; e.preventDefault(); setAt({ x: e.clientX, y: e.clientY }); }}>
      <div className="card-head">
        <div>
          <div className="card-title">{title}</div>
          <div className="card-sub">{sub}</div>
        </div>
        {menu && <span className="card-del" onClick={e => e.stopPropagation()}><Dropdown className="ic-btn" title="Actions" alignRight items={menu}>{I.dots({ size: 14 })}</Dropdown></span>}
      </div>
      <div className="card-prev">
        <div className="pv big">{slot(0)}</div>
        <div className="pv">{slot(1)}</div><div className="pv">{slot(2)}</div>
        <div className="pv">{slot(3)}</div><div className="pv">{slot(4)}</div>
      </div>
      {at && <span onClick={e => e.stopPropagation()}><Menu items={menu()} x={at.x} y={at.y} onClose={() => setAt(null)} /></span>}
    </div>
  );
}
