import { useEffect, useRef, useState } from 'react';
import { I } from './icons.jsx';
import { claude } from './api.js';
import { IMAGE_RATIOS } from './models.js';
import { Mic } from './nodes.jsx';
import { useStore, removeAsset, deleteSkill } from './store.js';

const GUIDE = `You are the creative assistant inside SOLVED Studio, a production board for a commercial creative director.
The board holds "Create image" blocks (GPT Image 2.5) and "Create video" blocks (Kling 3.0 image-to-video, Seedance 2.5 text-to-video).
Reply ONLY with JSON, no code fences:
{"reply": "<short, direct answer in plain sentences>", "blocks": [ {"type":"image","prompt":"<detailed shot prompt>","aspect":"16:9"} | {"type":"video","model":"seedance","prompt":"<shot + camera move>","duration":5} ]}
Use "blocks" only when the user asks you to create, generate, make, or plan shots/images/videos/scenes; otherwise return an empty array.
Aspect must be one of: ${IMAGE_RATIOS.join(', ')}. Write prompts like a cinematographer: subject, action, setting, lens, lighting, color, mood. Keep "reply" under 60 words.`;

function parse(text) {
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  try { return JSON.parse(text.slice(s, e + 1)); } catch (err) { return { reply: text, blocks: [] }; }
}

// One round-trip to Claude. history: [{role, content}] ending with the user's message.
export async function askClaude(board, nodes, history) {
  const onBoard = nodes.filter(n => ['image', 'video', 'note', 'text'].includes(n.type))
    .map(n => '- ' + n.type + ': ' + (n.data.prompt || n.data.text || '').slice(0, 200)).filter(l => !l.endsWith(': ')).slice(0, 30).join('\n');
  const h = history.slice(-12).filter(m => !m.error).map(m => ({ role: m.role, content: m.content }));
  while (h.length && h[0].role !== 'user') h.shift();
  h[0] = { role: 'user', content: GUIDE + '\n\nBoard "' + board.name + '" currently has:\n' + (onBoard || '(nothing yet)') + '\n\n---\n' + h[0].content };
  const out = parse(await claude(h));
  return { reply: (out.reply || '').trim(), blocks: Array.isArray(out.blocks) ? out.blocks.slice(0, 8) : [] };
}

export function Chat({ board, project, nodesRef, tab, setTab, onClose, placeBlocks, addFromSkill, addFromUrl }) {
  const { skills } = useStore();
  const key = 'solved-canvas-chat-' + board.id;
  const [msgs, setMsgs] = useState(() => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; } });
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [askFirst, setAskFirst] = useState(true);
  const end = useRef();

  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(msgs.slice(-40))); } catch (e) {} end.current?.scrollIntoView({ block: 'end' }); }, [msgs]);

  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    const next = [...msgs, { role: 'user', content: t }];
    setMsgs(next); setText(''); setBusy(true);
    try {
      const { reply, blocks } = await askClaude(board, nodesRef.current, next);
      const made = placeBlocks(blocks, null, !askFirst);
      const note = made ? '\n\n' + (askFirst ? 'Added ' + made + (made === 1 ? ' block' : ' blocks') + ' to the board. Press Create on each to generate.' : 'Generating ' + made + '…') : '';
      setMsgs(m => [...m, { role: 'assistant', content: reply + note }]);
    } catch (e) {
      setMsgs(m => [...m, { role: 'assistant', content: 'Couldn’t reach Claude: ' + e.message, error: true }]);
    } finally { setBusy(false); }
  };

  const media = nodesRef.current.filter(n => n.type === 'result' && n.data.url).reverse();
  const library = project?.assets || [];

  return (
    <aside className="chat">
      <div className="chat-tabs">
        <div className="seg">
          {['chat', 'assets', 'skills'].map(t => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}
        </div>
        <button className="ic-btn" onClick={onClose} aria-label="Minimize">{I.chev({ size: 16 })}</button>
      </div>

      {tab === 'chat' && (
        <>
          <div className="chat-head">
            <span>Chat</span>
            {msgs.length > 0 && <button className="chip" onClick={() => setMsgs([])}>New chat</button>}
          </div>
          <div className="chat-body">
            {msgs.length === 0 && (
              <div className="chat-empty">
                <img src="/studio/assets/solved-puzzle.svg" alt="" width="30" height="29" />
                <div>Start with an idea.</div>
              </div>
            )}
            {msgs.map((m, i) => <div key={i} className={'msg ' + m.role + (m.error ? ' error' : '')}>{m.content}</div>)}
            {busy && <div className="msg assistant typing"><i /><i /><i /></div>}
            <div ref={end} />
          </div>
          <div className="composer">
            <textarea rows={2} value={text} placeholder="What do you want to do?" onChange={e => setText(e.target.value)}
              onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <div className="composer-row">
              <button className={'chip' + (askFirst ? '' : ' on')} onClick={() => setAskFirst(a => !a)}
                title="When off, blocks the chat adds start generating right away">
                {askFirst ? 'Ask before spending' : 'Generate automatically'}
              </button>
              <div className="composer-r">
                <Mic onText={s => setText(v => (v ? v + ' ' : '') + s)} />
                <button className="send" disabled={!text.trim() || busy} onClick={send} aria-label="Send">{I.send({ size: 16, sw: 2 })}</button>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'assets' && (
        <div className="assets">
          <div className="assets-h">Asset library</div>
          {library.length === 0 && <div className="assets-empty">Right-click any image → Add to asset library.</div>}
          <div className="assets-grid">
            {library.map(a => (
              <div key={a.id} className="asset" onClick={() => addFromUrl(a)} title="Add to board">
                {a.kind === 'video' ? <video src={a.url} muted /> : <img src={a.url} alt="" />}
                <button className="asset-x" onClick={e => { e.stopPropagation(); removeAsset(project.id, a.id); }} aria-label="Remove from library">×</button>
              </div>
            ))}
          </div>
          <div className="assets-h">On this page</div>
          {media.length === 0 && <div className="assets-empty">Nothing generated on this page yet.</div>}
          <div className="assets-grid">
            {media.map(n => (
              <a key={n.id} href={n.data.url} target="_blank" rel="noreferrer" className="asset">
                {n.data.kind === 'video' ? <video src={n.data.url} muted /> : <img src={n.data.url} alt="" />}
              </a>
            ))}
          </div>
        </div>
      )}

      {tab === 'skills' && (
        <div className="assets">
          <div className="assets-h">Skills</div>
          {skills.length === 0 && <div className="assets-empty">Save any block’s prompt and settings from its ⋯ menu → Save as skill. Click a skill to add it to the board.</div>}
          {skills.map(s => (
            <div key={s.id} className="skill" onClick={() => addFromSkill(s)} role="button" tabIndex={0}>
              <span className="skill-ic">{I[s.type === 'video' ? 'video' : 'image']({ size: 14 })}</span>
              <span className="skill-t"><b>{s.name}</b><span>{s.prompt}</span></span>
              <button className="ic-btn" onClick={e => { e.stopPropagation(); deleteSkill(s.id); }} aria-label="Delete skill">{I.trash({ size: 13 })}</button>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
