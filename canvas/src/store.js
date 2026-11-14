// Local project/board store. Saved in this browser under one key.
import { useSyncExternalStore } from 'react';

const KEY = 'solved-canvas-v1';
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.projects) return d; } catch (e) {}
  return { projects: [], boards: [] };
}

let state = load();
const subs = new Set();
let saveTimer = null;
function commit(next) {
  state = next;
  subs.forEach(f => f());
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }, 250);
}

export function useStore() {
  return useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => state);
}
export const getState = () => state;

export function createProject(name = 'Untitled project') {
  const p = { id: uid(), name, edited: Date.now() };
  commit({ ...state, projects: [p, ...state.projects] });
  return p;
}
export function renameProject(id, name) {
  commit({ ...state, projects: state.projects.map(p => p.id === id ? { ...p, name, edited: Date.now() } : p) });
}
export function deleteProject(id) {
  commit({ projects: state.projects.filter(p => p.id !== id), boards: state.boards.filter(b => b.projectId !== id) });
}
export function createBoard(projectId, name = 'Untitled') {
  const b = { id: uid(), projectId, name, edited: Date.now(), nodes: [], viewport: null };
  commit({
    ...state,
    boards: [b, ...state.boards],
    projects: state.projects.map(p => p.id === projectId ? { ...p, edited: Date.now() } : p),
  });
  return b;
}
export function updateBoard(id, patch) {
  let projectId;
  const boards = state.boards.map(b => {
    if (b.id !== id) return b;
    projectId = b.projectId;
    return { ...b, ...patch, edited: Date.now() };
  });
  commit({ ...state, boards, projects: state.projects.map(p => p.id === projectId ? { ...p, edited: Date.now() } : p) });
}
export function deleteBoard(id) {
  commit({ ...state, boards: state.boards.filter(b => b.id !== id) });
}
export { uid };

export function ago(t) {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return m + (m === 1 ? ' minute ago' : ' minutes ago');
  const h = Math.round(m / 60); if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
  const d = Math.round(h / 24); return d + (d === 1 ? ' day ago' : ' days ago');
}

// Every finished image/video on a board, newest first.
export function boardMedia(board) {
  return (board?.nodes || [])
    .filter(n => n.type === 'result' && n.data.url)
    .map(n => ({ id: n.id, url: n.data.url, kind: n.data.kind }))
    .reverse();
}
