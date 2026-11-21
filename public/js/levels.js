// The six mini-games. Each one calls onFinish(correct, total) when the last round is done.
import { html, useEffect, useMemo, useRef, useState } from "../vendor/preact-htm.js";
import { Sprite } from "./sprites.js";
import { sfx } from "./sfx.js";
import { api } from "./api.js";

// ---------- shared pieces ----------
export function Book({ book, scale = 4, small = false }) {
  return html`<span class=${"book" + (small ? " small" : "")}>
    <${Sprite} name=${"book_" + book.color} scale=${scale} /><span class="book-title">${book.title}</span>
  </span>`;
}

function Villager({ who, text }) {
  return html`<div class="say-row">
    <div class="avatar"><${Sprite} name=${who} scale=${4} /></div>
    <div class="say villager"><span class="say-tag">VILLAGER</span>${text}</div>
  </div>`;
}

function Orb({ text, tag = "ORB", tone = "" }) {
  return html`<div class="say-row orb-side">
    <div class=${"say orb " + tone}><span class="say-tag">${tag}</span>${text}</div>
    <div class="avatar orb-av"><${Sprite} name="orb" scale=${4} /></div>
  </div>`;
}

function Page({ book, lines, highlight = -1 }) {
  return html`<div class="page">
    <div class="page-head"><${Sprite} name=${"book_" + book.color} scale=${2} /> ${book.title}</div>
    ${lines.map((l, i) => html`<p class=${i === highlight ? "hl" : ""}>${l}</p>`)}
  </div>`;
}

function Feedback({ good, title, children, onNext, last }) {
  useEffect(() => { sfx(good ? "pinOk" : "pinBad"); }, []);
  const btn = useRef(null);
  useEffect(() => { btn.current && btn.current.focus(); }, []);
  return html`<div class=${"feedback " + (good ? "good" : "bad")} role="status">
    <div class="fb-title">${good ? "✔ " : "✘ "}${title}</div>
    <div class="fb-body">${children}</div>
    <button class="pbtn blue" ref=${btn} onClick=${onNext}>${last ? "See results" : "Next ▸"}</button>
  </div>`;
}

function useRounds(level, onFinish) {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const total = level.rounds.length;
  const next = (gotIt) => {
    const s = score + (gotIt ? 1 : 0);
    if (i + 1 >= total) onFinish(s, total);
    else { setScore(s); setI(i + 1); }
  };
  return { i, score, total, round: level.rounds[i], next, last: i + 1 >= total };
}

export function RoundBar({ i, total, score }) {
  return html`<div class="roundbar">
    <span>Round ${i + 1} / ${total}</span>
    <span class="dots">${Array.from({ length: total }, (_, k) => html`<i class=${k < i ? "done" : k === i ? "now" : ""}></i>`)}</span>
    <span>Score: ${score}</span>
  </div>`;
}

// ---------- Level 1: true or made up ----------
export function TruthLevel({ level, books, onFinish }) {
  const { i, score, total, round, next, last } = useRounds(level, onFinish);
  const [pick, setPick] = useState(null);
  useEffect(() => setPick(null), [i]);
  const book = books[round.book];
  const right = pick !== null && pick === round.true;
  return html`<div class="stage">
    <${RoundBar} i=${i} total=${total} score=${score} />
    <${Villager} who=${round.who} text=${round.q} />
    <${Orb} text=${round.orb} tag="ORB (didn't read any book)" />
    <div class="check-label">📖 What the real book says:</div>
    <${Page} book=${book} lines=${[book.pages[round.page]]} highlight=${0} />
    ${pick === null
      ? html`<div class="choices two">
          <button class="pbtn green lg" onClick=${() => setPick(true)}>✔ True</button>
          <button class="pbtn red lg" onClick=${() => setPick(false)}>✘ Made up</button>
        </div>`
      : html`<${Feedback} key=${i} good=${right} last=${last} onNext=${() => { setPick(null); next(right); }}
          title=${right ? "Well spotted!" : "Not quite!"}>
          ${round.true ? "Orb's answer matches the book. This time it was lucky." : `Orb made that up! The book says: “${book.pages[round.page]}”`}
        <//>`}
  </div>`;
}

// ---------- Level 2: find the right book ----------
export function FindBookLevel({ level, books, onFinish }) {
  const { i, score, total, round, next, last } = useRounds(level, onFinish);
  const [pick, setPick] = useState(null);
  const [left, setLeft] = useState(level.seconds);
  useEffect(() => { setPick(null); setLeft(level.seconds); }, [i]);
  useEffect(() => {
    if (pick !== null) return undefined;
    if (left <= 0) { setPick("timeout"); return undefined; }
    const t = setTimeout(() => { setLeft(left - 1); if (left <= 4) sfx("tick"); }, 1000);
    return () => clearTimeout(t);
  }, [left, pick]);
  const target = books[round.book];
  const right = pick === round.book;
  return html`<div class="stage">
    <${RoundBar} i=${i} total=${total} score=${score} />
    <div class="timer" aria-label=${`${left} seconds left`}><i style=${`width:${(left / level.seconds) * 100}%`} class=${left <= 4 ? "low" : ""}></i><span>${left}s</span></div>
    <${Villager} who=${round.who} text=${round.q} />
    ${pick === null && html`<div class="check-label">Which book has the answer?</div>
      <div class="shelf">${round.choices.map((id) => html`<button class="shelf-book" onClick=${() => { sfx("click"); setPick(id); }}>
        <${Book} book=${books[id]} scale=${6} /></button>`)}</div>`}
    ${pick !== null && html`
      ${right && html`<${Page} book=${target} lines=${target.pages} highlight=${round.page} />
        <${Orb} text=${html`${target.pages[round.page]} <span class="src">📖 ${target.title}</span>`} tag="ORB (read the book!)" tone="good" />`}
      <${Feedback} key=${i} good=${right} last=${last} onNext=${() => { setPick(null); setLeft(level.seconds); next(right); }}
        title=${right ? "Right book!" : pick === "timeout" ? "Time's up!" : "Wrong shelf!"}>
        ${right ? "Orb read the right book, so its answer is correct, and it shows the source."
          : html`The answer was in <b>${target.title}</b>: “${target.pages[round.page]}”`}
      <//>`}
  </div>`;
}

// ---------- Level 3: keywords + real search ----------
const SMALL = new Set("a an the is are was were be do does did to of in on at for with by from and or but what which who when where why how can could should would will it this that i you my your long take".split(" "));

export function KeywordLevel({ level, books, onFinish }) {
  const { i, score, total, round, next, last } = useRounds(level, onFinish);
  const [sel, setSel] = useState([]);
  const [res, setRes] = useState(null);
  const [tries, setTries] = useState(0);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => { setSel([]); setRes(null); setTries(0); setNote(""); }, [i]);
  const tiles = round.q.replace(/[?.!,]/g, "").split(" ");
  const won = res && res.results[0] && res.results[0].id === round.book && res.results[0].score > 0;
  const toggle = (w) => {
    sfx("click");
    if (SMALL.has(w.toLowerCase())) setNote(`“${w}” is a tiny word. Search mostly ignores words like that.`);
    else setNote("");
    setSel((s) => (s.includes(w) ? s.filter((x) => x !== w) : s.length < 3 ? [...s, w] : s));
    setRes(null);
  };
  const go = async () => {
    setLoading(true);
    try {
      const r = await api.search(sel.join(" "));
      setRes(r);
      setTries((t) => t + 1);
      const ok = r.results[0] && r.results[0].id === round.book && r.results[0].score > 0;
      sfx(ok ? "unlock" : "pinBad");
    } catch (e) { setNote(e.message); }
    setLoading(false);
  };
  const max = res ? Math.max(1, ...res.results.map((r) => r.score)) : 1;
  return html`<div class="stage">
    <${RoundBar} i=${i} total=${total} score=${score} />
    <${Villager} who=${round.who} text=${round.q} />
    <div class="check-label">Tap the important words (up to 3):</div>
    <div class="tiles">${tiles.map((w) => html`<button class=${"tile" + (sel.includes(w) ? " on" : "") + (SMALL.has(w.toLowerCase()) ? " tiny" : "")}
        aria-pressed=${sel.includes(w)} disabled=${won} onClick=${() => toggle(w)}>${w}</button>`)}</div>
    ${note && html`<div class="tip">${note}</div>`}
    ${!won && html`<div class="choices"><button class="pbtn blue lg" disabled=${!sel.length || loading} onClick=${go}>
      ${loading ? "Searching…" : "🔍 Search"}</button></div>`}
    ${res && html`<div class="scores" aria-label="Search results">
      ${res.ignored.length > 0 && html`<div class="tip">Ignored tiny words: ${res.ignored.join(", ")}</div>`}
      ${res.results.map((r, k) => html`<div class=${"score-row" + (k === 0 ? " top" : "") + (r.id === round.book ? " target" : "")}>
        <${Book} book=${books[r.id]} scale=${2} small />
        <div class="bar"><i style=${`width:${(r.score / max) * 100}%`}></i></div>
        <span class="num">${r.score}</span>
        <span class="matched">${r.matched.map((m) => html`<em>${m}</em>`)}</span>
      </div>`)}
    </div>`}
    ${res && !won && html`<div class="tip bad">The wrong book came first. Try different words!</div>`}
    ${won && html`<${Feedback} key=${i} good=${tries === 1} last=${last} onNext=${() => { const ok = tries === 1; setSel([]); setRes(null); setTries(0); setNote(""); next(ok); }}
        title=${tries === 1 ? "First try! The right book won." : "Got it! (first try earns the point)"}>
      <b>${books[round.book].title}</b> scored highest because it contains your words: ${res.results[0].matched.join(", ")}.
    <//>`}
  </div>`;
}

// ---------- Level 4: slice the scroll ----------
const TOPIC_COLORS = ["#ffd23f", "#6ee7ff", "#ff6fae", "#3ddc84"];

export function SliceLevel({ level, onFinish }) {
  const { i, score, total, round, next, last } = useRounds(level, onFinish);
  const [cuts, setCuts] = useState([]);
  const [checked, setChecked] = useState(null);
  const [firstTry, setFirstTry] = useState(true);
  useEffect(() => { setCuts([]); setChecked(null); setFirstTry(true); }, [i]);
  const pieces = useMemo(() => {
    const out = [];
    let cur = [];
    round.lines.forEach((l, k) => { cur.push(l); if (cuts.includes(k) || k === round.lines.length - 1) { out.push(cur); cur = []; } });
    return out;
  }, [cuts, round]);
  const toggle = (k) => { sfx("click"); setChecked(null); setCuts((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k].sort())); };
  const correct = cuts.length === round.cuts.length && round.cuts.every((c) => cuts.includes(c));
  const check = async () => {
    const docs = pieces.map((p, k) => ({ id: String(k), text: p.join(" ") }));
    let got = null;
    try {
      const r = await api.search(round.test, docs);
      got = r.results[0] && r.results[0].score > 0 ? pieces[Number(r.results[0].id)] : null;
    } catch { got = null; }
    setChecked({ ok: correct, got });
    if (!correct) setFirstTry(false);
    sfx(correct ? "unlock" : "pinBad");
  };
  // which topic does each line belong to? (shown after checking)
  const topicOf = (k) => { let t = 0; round.cuts.forEach((c) => { if (k > c) t++; }); return t; };
  return html`<div class="stage">
    <${RoundBar} i=${i} total=${total} score=${score} />
    <div class="check-label">📜 ${round.title}: click the gaps to cut (✂). Cut where the topic changes.</div>
    <div class="scroll">
      ${round.lines.map((l, k) => html`
        <p style=${checked ? `border-left:6px solid ${TOPIC_COLORS[topicOf(k)]}` : ""}>${l}</p>
        ${k < round.lines.length - 1 && html`<button class=${"gap" + (cuts.includes(k) ? " cut" : "")} aria-pressed=${cuts.includes(k)}
            aria-label=${`Cut after line ${k + 1}`} disabled=${checked && checked.ok} onClick=${() => toggle(k)}>
          ${cuts.includes(k) ? html`<${Sprite} name="scissors" scale=${2} /> <span>CUT</span>` : html`<span>+ cut here</span>`}
        </button>`}`)}
    </div>
    <div class="tip">You have ${pieces.length} piece${pieces.length > 1 ? "s" : ""}. ${checked ? `Topics: ${round.topics.join(" · ")}` : ""}</div>
    ${!(checked && checked.ok) && html`<div class="choices"><button class="pbtn blue lg" onClick=${check}>✂ Check my cuts</button></div>`}
    ${checked && html`<div class="test-box">
      <div class="check-label">Test question: “${round.test}”</div>
      <${Orb} tag="ORB GOT THIS PIECE" tone=${checked.ok ? "good" : "bad"}
        text=${checked.got ? checked.got.join(" ") : "(nothing matched)"} />
    </div>`}
    ${checked && !checked.ok && html`<div class="tip bad">That piece is ${checked.got && checked.got.length > 3 ? "too big and messy" : "not quite right"}. Each piece should be about ONE topic: ${round.topics.join(", ")}. Move your cuts and check again!</div>`}
    ${checked && checked.ok && html`<${Feedback} key=${i} good=${firstTry} last=${last} onNext=${() => { const ok = firstTry; setCuts([]); setChecked(null); setFirstTry(true); next(ok); }}
        title=${firstTry ? "Perfect chunks!" : "Fixed it! (first try earns the point)"}>
      Each piece is about one topic, so Orb got a clean piece with just the answer.
    <//>`}
  </div>`;
}

// ---------- Level 5: catch the fake sentence ----------
export function FakeLevel({ level, books, onFinish }) {
  const { i, score, total, round, next, last } = useRounds(level, onFinish);
  const [pick, setPick] = useState(null);
  useEffect(() => setPick(null), [i]);
  const book = books[round.book];
  const right = pick === round.fake;
  return html`<div class="stage">
    <${RoundBar} i=${i} total=${total} score=${score} />
    <div class="check-label">📖 The page Orb read:</div>
    <${Page} book=${book} lines=${round.pages.map((n) => book.pages[n])} />
    <div class="check-label">💬 Orb's answer. Tap the sentence that's NOT on the page:</div>
    <div class="sentences">${round.answer.map((s, k) => html`<button
        class=${"sentence" + (pick !== null && k === round.fake ? " fake" : "") + (pick === k && k !== round.fake ? " wrongpick" : "")}
        disabled=${pick !== null} onClick=${() => { sfx("click"); setPick(k); }}>${s}</button>`)}</div>
    ${pick !== null && html`<${Feedback} key=${i} good=${right} last=${last} onNext=${() => { setPick(null); next(right); }}
        title=${right ? "Caught the fake!" : "That one is on the page!"}>
      “${round.answer[round.fake]}” is not on the page. Orb guessed it. A good answer only uses the source.
    <//>`}
  </div>`;
}

// ---------- Level 6: build your own oracle ----------
export function BuildLevel({ level, onFinish }) {
  const [notes, setNotes] = useState(level.templates[0].text);
  const [taught, setTaught] = useState(false);
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState(0);
  const [refused, setRefused] = useState(0);
  const [err, setErr] = useState("");
  const pieces = useMemo(() => notes.split("\n").flatMap((l) => l.trim().split(/(?<=[.!?])\s+/)).map((s) => s.trim()).filter((s) => s.length >= 3), [notes]);
  const done = found >= 3 && refused >= 1;
  const ask = async (e) => {
    e.preventDefault();
    if (!q.trim() || loading) return;
    setLoading(true); setErr(""); sfx("send");
    try {
      const r = await api.ask(notes, q.trim());
      setRes({ ...r, q: q.trim() });
      if (r.found) setFound((n) => n + 1); else setRefused((n) => n + 1);
      sfx(r.found ? "reply" : "meow");
      setQ("");
    } catch (ex) { setErr(ex.message); }
    setLoading(false);
  };
  const max = res ? Math.max(1, ...res.ranked.map((r) => r.score)) : 1;
  return html`<div class="stage build">
    <div class="mission">
      <span class=${found >= 3 ? "ok" : ""}>${found >= 3 ? "☑" : "☐"} 3 answers from notes (${Math.min(found, 3)}/3)</span>
      <span class=${refused >= 1 ? "ok" : ""}>${refused >= 1 ? "☑" : "☐"} 1 honest “I can't find that”</span>
    </div>
    <div class="build-grid">
      <div class="build-col">
        <div class="check-label">① Your notes</div>
        <div class="templates">${level.templates.map((t) => html`<button class="tile" onClick=${() => { setNotes(t.text); setTaught(false); setRes(null); }}>${t.name}</button>`)}</div>
        <label class="sr-only" for="notes">Your notes</label>
        <textarea id="notes" rows="8" value=${notes} onInput=${(e) => { setNotes(e.target.value); setTaught(false); }} placeholder="Write a few facts, one per line…"></textarea>
        <button class="pbtn pink" disabled=${pieces.length < 2} onClick=${() => { setTaught(true); sfx("unlock"); }}>✂ Teach Orb (${pieces.length} chunks)</button>
        ${taught && html`<div class="chunks">${pieces.map((p, k) => html`<span class="chunk"><b>${k + 1}</b> ${p}</span>`)}</div>`}
      </div>
      <div class="build-col">
        <div class="check-label">② Ask Orb</div>
        <form class="ask-row" onSubmit=${ask}>
          <label class="sr-only" for="q">Your question</label>
          <input id="q" value=${q} disabled=${!taught} maxlength="200" placeholder=${taught ? "e.g. What does Biscuit eat?" : "Teach Orb your notes first"} onInput=${(e) => setQ(e.target.value)} />
          <button class="pbtn blue" disabled=${!taught || !q.trim() || loading}>${loading ? "…" : "Ask"}</button>
        </form>
        ${err && html`<div class="tip bad">${err}</div>`}
        ${res && html`<div class="pipeline">
          <div class="step"><span class="n">1</span><b>Keywords</b>
            <div>${res.keywords.map((k) => html`<em class="kw">${k}</em>`)} ${res.ignored.length > 0 && html`<span class="muted">(ignored: ${res.ignored.join(", ")})</span>`}</div></div>
          <div class="step"><span class="n">2</span><b>Search your chunks</b>
            ${res.ranked.slice(0, 4).map((r) => html`<div class="score-row mini${res.top[0] && res.top[0].id === r.id ? " top" : ""}">
              <span class="chunk-txt">${res.pieces[Number(r.id)]}</span><div class="bar"><i style=${`width:${(r.score / max) * 100}%`}></i></div><span class="num">${r.score}</span></div>`)}
          </div>
          <div class="step"><span class="n">3</span><b>Answer</b>
            <${Orb} text=${res.answer} tag=${res.found ? (res.mode === "gemini" ? "ORB · GEMINI" : "ORB") : "ORB REFUSES TO GUESS"} tone=${res.found ? "good" : "bad"} /></div>
        </div>`}
      </div>
    </div>
    ${done && html`<div class="feedback good"><div class="fb-title">✔ Your Oracle works!</div>
      <div class="fb-body">It answers from your notes, and refuses when the notes don't say. That's real RAG.</div>
      <button class="pbtn blue" onClick=${() => onFinish(1, 1)}>Finish level</button></div>`}
  </div>`;
}

export const LEVEL_KINDS = { truth: TruthLevel, findbook: FindBookLevel, keywords: KeywordLevel, slice: SliceLevel, fake: FakeLevel, build: BuildLevel };
