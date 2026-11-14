import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@xyflow/react/dist/style.css';
import './styles.css';
import { Sidebar } from './Sidebar.jsx';
import { Projects } from './Projects.jsx';
import { Project } from './Project.jsx';
import { Board } from './Board.jsx';
import { useStore, createBoard } from './store.js';

// Hash routes: #/projects · #/p/<projectId> · #/b/<boardId>
function useRoute() {
  const read = () => (location.hash.replace(/^#\/?/, '') || 'projects').split('/');
  const [r, setR] = useState(read);
  useEffect(() => { const f = () => setR(read()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return r;
}
import { go } from './nav.js';

function App() {
  const [view, id] = useRoute();
  const { settings } = useStore();
  useEffect(() => { document.body.classList.toggle('dark', settings.theme === 'dark'); }, [settings.theme]);
  useEffect(() => {
    if (view !== 'p' || !id) return;
    const k = e => { if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'o') { e.preventDefault(); go('b/' + createBoard(id).id); } };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [view, id]);
  if (view === 'b' && id) return <Board id={id} />;
  return (
    <div className="shell">
      <Sidebar active={view === 'p' ? 'projects' : view} />
      <main className="main">
        {view === 'p' && id ? <Project id={id} /> : <Projects />}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
