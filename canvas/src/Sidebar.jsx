import { I } from './icons.jsx';
import { go } from './nav.js';

export function Sidebar({ active }) {
  const Item = ({ id, icon, label, to }) => (
    <button className={'nav' + (active === id ? ' on' : '')} onClick={() => go(to || id)}>
      {I[icon]({ size: 16 })}<span>{label}</span>
    </button>
  );
  return (
    <aside className="side">
      <div className="side-head">
        <img src="/studio/assets/solved-puzzle.svg" alt="" width="22" height="21" />
        <span className="wordmark">Solved</span>
      </div>
      <nav className="side-nav">
        <Item id="projects" icon="folder" label="Projects" />
      </nav>
      <div className="side-foot">
        <a className="nav" href="/studio/classic.html">{I.clock({ size: 16 })}<span>Classic studio</span></a>
      </div>
    </aside>
  );
}
