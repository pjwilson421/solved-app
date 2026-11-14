import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@xyflow/react/dist/style.css';
import './styles.css';
import { Sidebar } from './Sidebar.jsx';
import { Projects } from './Projects.jsx';
import { Project } from './Project.jsx';
import { Board } from './Board.jsx';

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
