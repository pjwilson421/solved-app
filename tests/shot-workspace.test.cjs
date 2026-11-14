const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const memory = new Map();
const storage = {
  getItem: key => memory.get(key) || null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: key => memory.delete(key),
};
class ComponentState {
  setState(change, done) {
    const updates = typeof change === 'function' ? change(this.state) : change;
    if (updates) this.state = { ...this.state, ...updates };
    done?.();
  }
}
const requests = [];
const context = vm.createContext({
  console,
  DCLogic: ComponentState,
  React: { createRef: () => ({ current: null }) },
  localStorage: storage,
  sessionStorage: { getItem: () => null, removeItem() {} },
  indexedDB: { open: () => ({}) },
  window: {
    scrollTo() {},
    __solved: { current: 'legacy', registry: () => [{ id: 'legacy', created: 0 }], get: storage.getItem, set: storage.setItem },
    SOLVED_HF: {
      get: () => ({ ready: true }),
      connected: () => true,
      video: async request => { requests.push(request); return 'local-video.mp4'; },
    },
  },
  document: {},
  setTimeout: () => {},
  clearInterval() {},
  fetch: async () => ({ ok: false }),
  Image: class {},
  FileReader: class {},
  Blob,
  URL,
});
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'studio/classic.html'), 'utf8');
assert.equal(html, fs.readFileSync(path.join(root, 'studio-src/app-template.html'), 'utf8'));
const script = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
vm.runInContext(script + '\nglobalThis.Studio = Component;', context);

async function check() {
  const app = new context.Studio();
  const example = 'data:image/png;base64,';
  const first = { n: 9, name: 'Approach', desc: 'Walk along the pavilion', fields: { move: 'Track' } };
  const second = { n: 14, name: 'Exit', desc: 'Leave the pavilion', fields: {} };
  app.state = {
    ...app.state, pLoaded: true, sLoaded: true, gallery: [], videos: [], uploads: [], edits: [], deliveries: [], timeline: [], covers: {},
    items: { ...app.state.items, KEYFRAMES: [first, second] },
    kfImg: { '9-start': example + 'A', '14-main': example + 'B', '14-end': example + 'oldEnd' },
  };
  for (const page of ['BRIEF', 'IMAGES', 'TALENT', 'PRODUCT', 'LOCATION', 'WARDROBE', 'SETDESIGN', 'STORYBOARDS', 'KEYFRAMES', 'VIDEOS', 'EDITING', 'DELIVERY', 'LIBRARY']) {
    app.openWorkspace(page);
    assert.equal(app.renderVals().workspacePage, page);
  }

  app.openWorkspace('IMAGES');
  app.state.gallery = [
    { uid: 'new', status: 'done', prompt: 'End frame alternative', src: example + 'newEnd', aspect: '16:9' },
    { uid: 'old', status: 'done', prompt: 'Start frame alternative', src: example + 'other', aspect: '16:9' },
  ];
  let view = app.renderVals();
  assert.equal(view.x.selectedImage, example + 'newEnd');
  view.x.gal[1].select();
  assert.equal(app.renderVals().x.selectedImage, example + 'other');
  view.x.gal[0].menuItems.find(entry => entry.id === 'assign').click();
  let assignment = app.renderVals().workspace.assignment;
  assert.equal(assignment.disabled, true);
  assignment.setShot({ target: { value: '14' } });
  app.renderVals().workspace.assignment.setSlot({ target: { value: 'end' } });
  assignment = app.renderVals().workspace.assignment;
  assert.equal(assignment.existing, example + 'oldEnd');
  assignment.save();
  assert.equal(app.endFrameSrc(14), example + 'newEnd');
  assert.equal(app.endFrameSrc(9), '');
  assert.equal(app.frameSrc(9), example + 'A');
  assert.match(app.renderVals().workspaceAssignmentStatus, /Exit/);

  app.openWorkspace('STORYBOARDS', 14);
  let workspace = app.renderVals().workspace;
  assert.equal(workspace.title, 'Exit');
  assert.equal(workspace.legacyBoard, true);
  app.setKf('14-board', example + 'sketch');
  workspace = app.renderVals().workspace;
  assert.equal(workspace.board, example + 'sketch');
  assert.equal(app.frameSrc(14), example + 'B');
  workspace.fields.find(field => field.label === 'Camera move').set({ target: { value: 'Pan' } });
  workspace.openFrames();
  workspace = app.renderVals().workspace;
  assert.equal(workspace.title, 'Exit');
  assert.deepEqual(Array.from(workspace.slots, slot => slot.src), [example + 'B', example + 'newEnd']);
  workspace.openVideo();
  assert.equal(app.state.page, 'VIDEOS');
  assert.equal(app.state.workspaceShot, 14);
  assert.equal(app.state.videos.length, 1);
  const video = app.state.videos[0];
  assert.equal(video.frameN, 14);
  assert.match(video.prompt, /Pan/);
  app.videoFromFrame(14, false);
  assert.equal(app.state.videos.length, 1);
  await app.runVideo(video.uid);
  assert.equal(requests[0].image, example + 'B');
  assert.equal(requests[0].lastImage, example + 'newEnd');

  app.setKf('14-end', example + 'later');
  view = app.renderVals();
  assert.equal(view.x.vids[0].canUseLatest, true);
  view.x.vids[0].useLatest();
  assert.equal(app.state.videos[0].end, example + 'later');
  assert.equal(app.state.videos[0].url, 'local-video.mp4');

  context.window.claude = { complete: async () => JSON.stringify([{ name: 'New beat', desc: 'A new shot.' }]) };
  app.openWorkspace('STORYBOARDS', 14);
  await app.writeFrames(true);
  assert.deepEqual(Array.from(app.state.items.KEYFRAMES, shot => shot.n), [9, 14, 15]);
  assert.equal(app.frameSrc(14), example + 'B');
  assert.equal(app.state.kfImg['14-board'], example + 'sketch');
  console.log('Passed workspace navigation, gallery assignment, legacy frames, storyboard isolation, video handoff, and append from brief.');
}
check().catch(error => { console.error(error); process.exitCode = 1; });
