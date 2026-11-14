import { useEffect, useRef, useState } from 'react';
import { I } from './icons.jsx';
import { claude } from './api.js';
import { IMAGE_RATIOS } from './nodes.jsx';

const GUIDE = `You are the creative assistant inside SOLVED Studio, a production board for a commercial creative director.
The board holds "Create image" blocks (GPT Image 2.5) and "Create video" blocks (Kling 3.0 image-to-video, Seedance 2.5 text-to-video).
Reply ONLY with JSON, no code fences:
{"reply": "<short, direct answer in plain sentences>", "blocks": [ {"type":"image","prompt":"<detailed shot prompt>","aspect":"16:9"} | {"type":"video","model":"seedance","prompt":"<shot + camera move>","duration":5} ]}
Use "blocks" only when the user asks you to create, generate, make, or plan shots/images/videos; otherwise return an empty array.
Aspect must be one of: ${IMAGE_RATIOS.join(', ')}. Write prompts like a cinematographer: subject, action, setting, lens, lighting, color, mood. Keep "reply" under 60 words.`;

function parse(text) {
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  try { return JSON.parse(text.slice(s, e + 1)); } catch (err) { return { reply: text, blocks: [] }; }
}

export function Chat({ board, nodesRef, onClose, add, run, freeSpot, reveal }) {
  const key = 'solved-canvas-chat-' + board.id;
  const [tab, setTab] = useState('chat');
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
    const onBoard = nodesRef.current.filter(n => n.type === 'image' || n.type === 'video' || n.type === 'note' || n.type === 'text')
      .map(n => '- ' + n.type + ': ' + (n.data.prompt || n.data.text || '').slice(0, 200)).filter(l => !l.endsWith(': ')).slice(0, 30).join('\n');
    const history = next.slice(-12).filter(m => !m.error).map(m => ({ role: m.role, content: m.content }));
    while (history.length && history[0].role !== 'user') history.shift();
    history[0] = { role: 'user', content: GUIDE + '\n\nBoard "' + board.name + '" currently has:\n' + (onBoard || '(nothing yet)') + '\n\n---\n' + history[0].content };
    try {
      const out = parse(await claude(history));
      const blocks = Array.isArray(out.blocks) ? out.blocks.slice(0, 8) : [];
      const made = [];
      const base = freeSpot(0);
      blocks.forEach((b, i) => {
        const pos = { x: base.x + i * 380, y: base.y };
        const n = b.type === 'video'
          ? add('video', { model: 'seedance', prompt: b.prompt || '', duration: Math.min(30, Math.max(4, Number(b.duration) || 5)), ratio: '16:9', res: '1080p' }, pos)
          : add('image', { prompt: b.prompt || '', refs: [], aspect: IMAGE_RATIOS.includes(b.aspect) ? b.aspect : '16:9', resolution: '2k' }, pos);
        made.push(n.id);
      });
      if (made.length) reveal();
      if (!askFirst) setTimeout(() => made.forEach(run), 50);
      const note = made.length ? '\n\n' + (askFirst ? 'Added ' + made.length + (made.length === 1 ? ' block' : ' blocks') + ' to the board. Press Create on each to generate.' : 'Generating ' + made.length + '…') : '';
      setMsgs(m => [...m, { role: 'assistant', content: (out.reply || '').trim() + note }]);
    } catch (e) {
      setMsgs(m => [...m, { role: 'assistant', content: 'Couldn’t reach Claude: ' + e.message, error: true }]);
    } finally { setBusy(false); }
  };

  const media = nodesRef.current.filter(n => n.type === 'result' && n.data.url).reverse();

  return (
    <aside className="chat">
      <div className="chat-tabs">
        <div className="seg">
          <button className={tab === 'chat' ? 'on' : ''} onClick={() => setTab('chat')}>Chat</button>
          <button className={tab === 'assets' ? 'on' : ''} onClick={() => setTab('assets')}>Assets</button>
        </div>
        <button className="ic-btn" onClick={onClose} aria-label="Minimize">{I.chev({ size: 16 })}</button>
      </div>

      {tab === 'chat' ? (
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
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <div className="composer-row">
              <button className={'chip' + (askFirst ? '' : ' on')} onClick={() => setAskFirst(a => !a)}
                title="When on, blocks the chat adds start generating right away">
                {askFirst ? 'Ask before spending' : 'Generate automatically'}
              </button>
              <button className="send" disabled={!text.trim() || busy} onClick={send} aria-label="Send">{I.send({ size: 16, sw: 2 })}</button>
            </div>
          </div>
        </>
      ) : (
        <div className="assets">
          {media.length === 0 && <div className="chat-empty"><div>Nothing generated on this board yet.</div></div>}
          <div className="assets-grid">
            {media.map(n => (
              <a key={n.id} href={n.data.url} target="_blank" rel="noreferrer" className="asset">
                {n.data.kind === 'video' ? <video src={n.data.url} muted /> : <img src={n.data.url} alt="" />}
              </a>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
