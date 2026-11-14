// Local project/board store. Saved in this browser under one key.
import { useSyncExternalStore } from 'react';

const KEY = 'solved-canvas-v1';
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const DEFAULT_SETTINGS = { minimap: false, snap: false, scrollZoom: false, regions: true, downloadFormat: 'original', theme: 'light' };
const newPage = (name = 'Page 1') => ({ id: uid(), name, nodes: [], viewport: null });

function migrate(d) {
  d.settings = { ...DEFAULT_SETTINGS, ...(d.settings || {}) };
  d.skills = d.skills || [];
  d.projects = (d.projects || []).map(p => ({ assets: [], ...p }));
  d.boards = (d.boards || []).map(b => {
    if (b.pages) return { regions: [], ...b };
    const page = { ...newPage(), nodes: b.nodes || [], viewport: b.viewport || null };
    const { nodes, viewport, ...rest } = b;
    return { ...rest, pages: [page], pageId: page.id, regions: [] };
  });
  return d;
}

function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.projects) return migrate(d); } catch (e) {}
  return migrate({ projects: [], boards: [] });
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
const touch = (projects, pid) => projects.map(p => p.id === pid ? { ...p, edited: Date.now() } : p);

export function useStore() {
  return useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => state);
}
export const getState = () => state;

/* settings & skills */
export const setSetting = (k, v) => commit({ ...state, settings: { ...state.settings, [k]: v } });
export const addSkill = s => commit({ ...state, skills: [{ id: uid(), ...s }, ...state.skills] });
export const deleteSkill = id => commit({ ...state, skills: state.skills.filter(s => s.id !== id) });

/* projects */
export function createProject(name = 'Untitled project') {
  const p = { id: uid(), name, edited: Date.now(), assets: [] };
  commit({ ...state, projects: [p, ...state.projects] });
  return p;
}
export const renameProject = (id, name) => commit({ ...state, projects: state.projects.map(p => p.id === id ? { ...p, name, edited: Date.now() } : p) });
export const deleteProject = id => commit({ ...state, projects: state.projects.filter(p => p.id !== id), boards: state.boards.filter(b => b.projectId !== id) });
export function duplicateProject(id) {
  const p = state.projects.find(x => x.id === id); if (!p) return;
  const np = { ...p, id: uid(), name: p.name + ' copy', edited: Date.now() };
  const boards = state.boards.filter(b => b.projectId === id).map(b => ({ ...JSON.parse(JSON.stringify(b)), id: uid(), projectId: np.id }));
  commit({ ...state, projects: [np, ...state.projects], boards: [...boards, ...state.boards] });
}
export function addAssets(projectId, items) {
  commit({ ...state, projects: state.projects.map(p => p.id === projectId
    ? { ...p, assets: [...items.filter(i => !p.assets.some(a => a.url === i.url)).map(i => ({ id: uid(), added: Date.now(), ...i })), ...p.assets] } : p) });
}
export const removeAsset = (projectId, id) => commit({ ...state, projects: state.projects.map(p => p.id === projectId ? { ...p, assets: p.assets.filter(a => a.id !== id) } : p) });

/* boards */
export function createBoard(projectId, name = 'Untitled') {
  const page = newPage();
  const b = { id: uid(), projectId, name, edited: Date.now(), pages: [page], pageId: page.id, regions: [] };
  commit({ ...state, boards: [b, ...state.boards], projects: touch(state.projects, projectId) });
  return b;
}
export function updateBoard(id, patch) {
  const b = state.boards.find(x => x.id === id); if (!b) return;
  commit({ ...state, boards: state.boards.map(x => x.id === id ? { ...x, ...patch, edited: Date.now() } : x), projects: touch(state.projects, b.projectId) });
}
export function updatePage(boardId, pageId, patch) {
  const b = state.boards.find(x => x.id === boardId); if (!b) return;
  updateBoard(boardId, { pages: b.pages.map(p => p.id === pageId ? { ...p, ...patch } : p) });
}
export function addPage(boardId) {
  const b = state.boards.find(x => x.id === boardId); if (!b) return;
  const p = newPage('Page ' + (b.pages.length + 1));
  updateBoard(boardId, { pages: [...b.pages, p], pageId: p.id });
  return p;
}
export function deletePage(boardId, pageId) {
  const b = state.boards.find(x => x.id === boardId); if (!b || b.pages.length < 2) return;
  const pages = b.pages.filter(p => p.id !== pageId);
  updateBoard(boardId, { pages, pageId: b.pageId === pageId ? pages[0].id : b.pageId });
}
export function movePage(boardId, pageId, dir) {
  const b = state.boards.find(x => x.id === boardId); if (!b) return;
  const i = b.pages.findIndex(p => p.id === pageId), j = i + dir;
  if (j < 0 || j >= b.pages.length) return;
  const pages = [...b.pages]; [pages[i], pages[j]] = [pages[j], pages[i]];
  updateBoard(boardId, { pages });
}
export function duplicatePage(boardId, pageId) {
  const b = state.boards.find(x => x.id === boardId); if (!b) return;
  const src = b.pages.find(p => p.id === pageId);
  const p = { ...JSON.parse(JSON.stringify(src)), id: uid(), name: src.name + ' copy' };
  updateBoard(boardId, { pages: [...b.pages, p], pageId: p.id });
}
export function duplicateBoard(id, projectId) {
  const b = state.boards.find(x => x.id === id); if (!b) return;
  const nb = { ...JSON.parse(JSON.stringify(b)), id: uid(), projectId: projectId || b.projectId, name: projectId ? b.name : b.name + ' copy', edited: Date.now() };
  commit({ ...state, boards: [nb, ...state.boards], projects: touch(state.projects, nb.projectId) });
  return nb;
}
export const moveBoard = (id, projectId) => updateBoard(id, { projectId });
export const deleteBoard = id => commit({ ...state, boards: state.boards.filter(b => b.id !== id) });

export const allNodes = b => (b?.pages || []).flatMap(p => p.nodes || []);
export const boardImages = b => allNodes(b).filter(n => n.type === 'result' && n.data.url && n.data.kind !== 'video').map(n => n.data.url);

export function ago(t) {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return m + (m === 1 ? ' minute ago' : ' minutes ago');
  const h = Math.round(m / 60); if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
  const d = Math.round(h / 24); return d + (d === 1 ? ' day ago' : ' days ago');
}
