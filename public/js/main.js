// RAG Quest app: title -> world map -> level (intro, play, results) -> trophy.
import { html, render, useEffect, useState } from "../vendor/preact-htm.js";
import { api, loadSettings, loadStars, saveSettings, saveStars } from "./api.js";
import { Scene, Sprite } from "./sprites.js";
import { Modal, Typewriter } from "./ui.js";
import { sfx, setMusic, setSound } from "./sfx.js";
import { LEVEL_KINDS } from "./levels.js";

function starsFor(correct, total, pass) {
  if (correct < pass) return 0;
  if (correct === total) return 3;
  return correct >= Math.ceil((pass + total) / 2) ? 2 : 1;
}

function Stars({ n, scale = 3 }) {
  return html`<span class="stars" role="img" aria-label=${`${n} of 3 stars`}>
    ${[0, 1, 2].map((k) => html`<${Sprite} name=${k < n ? "star" : "starEmpty"} scale=${scale} />`)}
  </span>`;
}

// ---------------- title ----------------
function Title({ onStart, onMenu, onExit, ai, started }) {
  return html`<main class="center-screen">
    <section class="title-card glass rivets">
      <div class="title-kicker"><span class="coin"></span> A PIXEL ADVENTURE <span class="coin"></span></div>
      <div class="title-row">
        <span class="mug bob"><${Sprite} name="owl" scale=${6} /></span>
        <h1 class="game-title">RAG<br />QUEST</h1>
        <span class="mug bob slow"><${Sprite} name="orb" scale=${7} /></span>
      </div>
      <p class="subtitle">LEARN HOW AI FINDS ANSWERS<br /><span class="muted">6 levels · one idea at a time</span></p>
      <div class="title-buttons">
        <button class="pbtn" onClick=${() => { sfx("click"); onMenu(); }}>Menu</button>
        <button class="pbtn blue lg" onClick=${onStart}>${started ? "Continue" : "Start"}</button>
        <button class="pbtn" onClick=${() => { sfx("click"); onExit(); }}>Exit</button>
      </div>
      <p class="title-font muted blink" style="font-size:8px;margin:18px 0 0">PRESS START</p>
      <div class="title-foot">
        <div class="hearts">${["book_red", "book_blue", "book_green"].map((b) => html`<${Sprite} name=${b} scale=${3} />`)}</div>
        <span class=${"ai-pill" + (ai && ai.ai === "gemini" ? "" : " offline")}><span class="dot"></span>${ai ? (ai.ai === "gemini" ? "GEMINI AI ON" : "OFFLINE MODE") : "CONNECTING…"}</span>
        <div class="hearts">${[0, 1, 2].map(() => html`<${Sprite} name="star" scale=${2} />`)}</div>
      </div>
    </section>
  </main>`;
}

// ---------------- world map ----------------
function WorldMap({ levels, stars, onPlay, onTitle, onMenu, onTrophy }) {
  const total = levels.reduce((n, l) => n + (stars[l.id] || 0), 0);
  const unlocked = (l) => l.id === 1 || (stars[l.id - 1] || 0) > 0;
  const nextLevel = levels.find((l) => unlocked(l) && !stars[l.id]);
  const allDone = levels.every((l) => (stars[l.id] || 0) > 0);
  return html`<main class="map-screen">
    <header class="topbar glass">
      <button class="pbtn ghost sm" onClick=${onTitle}>◂ Title</button>
      <h1 class="title-font">WORLD MAP</h1>
      <span class="chip"><${Sprite} name="star" scale=${2} /> ${total} / ${levels.length * 3}</span>
      <button class="pbtn ghost sm" onClick=${onMenu}>Menu</button>
    </header>
    <div class="owl-tip glass">
      <${Sprite} name="owl" scale=${4} />
      <p>${allDone ? "You finished every level! Claim your trophy, RAG Master!" : nextLevel ? html`Hoo! Next up: <b>Level ${nextLevel.id}: ${nextLevel.title}</b>. Tap it to play.` : "Replay any level to earn 3 stars!"}</p>
      ${allDone && html`<button class="pbtn" onClick=${onTrophy}>🏆 Trophy</button>`}
    </div>
    <ol class="path">
      ${levels.map((l) => {
        const open = unlocked(l);
        const isNext = nextLevel && nextLevel.id === l.id;
        return html`<li class=${"node-wrap" + (l.id % 2 ? "" : " right")}>
          <button class=${"node glass" + (open ? "" : " locked") + (isNext ? " next" : "")} disabled=${!open}
              onClick=${() => { sfx("click"); onPlay(l); }} aria-label=${`Level ${l.id}: ${l.title}${open ? "" : " (locked)"}`}>
            <span class="node-num">${open ? l.id : html`<${Sprite} name="lock" scale=${3} />`}</span>
            <span class="node-text"><b>${l.title}</b><span>${l.short}</span><${Stars} n=${stars[l.id] || 0} scale=${2} /></span>
          </button>
        </li>`;
      })}
    </ol>
  </main>`;
}

// ---------------- one level ----------------
function LevelScreen({ level, books, settings, onDone, onMap, hasNext, onNext }) {
  const [phase, setPhase] = useState("intro");
  const [line, setLine] = useState(0);
  const [typed, setTyped] = useState(false);
  const [result, setResult] = useState(null);
  const [run, setRun] = useState(0);
  const Game = LEVEL_KINDS[level.kind];
  const introDone = line >= level.intro.length - 1 && typed;

  const finish = (correct, total) => {
    const n = starsFor(correct, total, level.pass);
    setResult({ correct, total, stars: n });
    setPhase("done");
    sfx(n > 0 ? "win" : "lose");
    onDone(level.id, n);
  };
  const retry = () => { setResult(null); setRun(run + 1); setPhase("play"); };

  return html`<main class="level-screen">
    <header class="topbar glass">
      <button class="pbtn ghost sm" onClick=${onMap}>◂ Map</button>
      <h1 class="title-font">LEVEL ${level.id} · ${level.title.toUpperCase()}</h1>
      <span class="chip">${level.short}</span>
    </header>

    ${phase === "intro" && html`<section class="panel-solid intro">
      <div class="owl-big bob"><${Sprite} name="owl" scale=${8} title="Pip the owl" /></div>
      <div class="dialog">
        <span class="say-tag">PIP THE OWL</span>
        ${level.intro.slice(0, line + 1).map((t, k) => html`<p key=${k}>${k === line && !typed
          ? html`<${Typewriter} text=${t} speed=${settings.speed} sound=${settings.sound} onDone=${() => setTyped(true)} />` : t}</p>`)}
        ${introDone && html`<div class="goal"><b>YOUR GOAL</b>${level.goal}</div>`}
        <div class="dialog-actions">
          ${!introDone && html`<button class="pbtn sm ghost" onClick=${() => { setLine(level.intro.length - 1); setTyped(true); }}>Skip</button>`}
          ${!introDone
            ? html`<button class="pbtn blue" disabled=${!typed} onClick=${() => { sfx("click"); setLine(line + 1); setTyped(false); }}>Next ▸</button>`
            : html`<button class="pbtn blue lg" onClick=${() => { sfx("unlock"); setPhase("play"); }}>Let's go!</button>`}
        </div>
      </div>
    </section>`}

    ${phase === "play" && html`<section class="panel-solid play">
      <div class="goal-strip">🎯 ${level.goal}</div>
      <${Game} key=${run} level=${level} books=${books} onFinish=${finish} />
    </section>`}

    ${phase === "done" && result && html`<section class="panel-solid done">
      <div class="done-head">
        <${Stars} n=${result.stars} scale=${6} />
        <h2 class="title-font">${result.stars > 0 ? "LEVEL CLEAR!" : "ALMOST!"}</h2>
        <p>${level.kind === "build" ? "You built a working RAG helper!" : `You got ${result.correct} of ${result.total} right.`}
          ${result.stars === 0 ? ` You need ${level.pass} to pass. Try again!` : ""}</p>
      </div>
      <div class="lesson">
        <div class="lesson-head"><${Sprite} name="owl" scale=${3} /> WHAT YOU LEARNED</div>
        <p>${level.lesson}</p>
      </div>
      <div class="choices">
        <button class="pbtn ghost" onClick=${onMap}>Map</button>
        <button class="pbtn" onClick=${retry}>Retry</button>
        ${result.stars > 0 && hasNext && html`<button class="pbtn blue lg" onClick=${onNext}>Next level ▸</button>`}
        ${result.stars > 0 && !hasNext && html`<button class="pbtn blue lg" onClick=${onMap}>🏆 Finish</button>`}
      </div>
    </section>`}
  </main>`;
}

// ---------------- menu / goodbye / trophy ----------------
function Menu({ onClose, settings, setSettings, ai, onReset }) {
  const set = (k, v) => { sfx("click"); setSettings({ ...settings, [k]: v }); };
  const [sure, setSure] = useState(false);
  return html`<${Modal} title="MENU" onClose=${onClose}>
    <div class="howto-step glass-soft" style="margin-bottom:12px"><span class="num">?</span><div>
      <b>What is RAG?</b><br /><span class="muted">Retrieval-Augmented Generation: before an AI answers, it <b>finds</b> the right text, then answers <b>only</b> from it. Each level teaches one part.</span></div></div>
    <div class="setting"><span>Sound effects</span><button class="toggle" aria-pressed=${settings.sound} onClick=${() => set("sound", !settings.sound)}>${settings.sound ? "ON" : "OFF"}</button></div>
    <div class="setting"><span>Music</span><button class="toggle" aria-pressed=${settings.music} onClick=${() => set("music", !settings.music)}>${settings.music ? "ON" : "OFF"}</button></div>
    <div class="setting"><span>Text speed</span><div class="seg">${["normal", "fast", "instant"].map((s) => html`<button aria-pressed=${settings.speed === s} onClick=${() => set("speed", s)}>${s.toUpperCase()}</button>`)}</div></div>
    <div class="setting"><span>AI for Level 6</span><span class="muted">${ai && ai.ai === "gemini" ? `Gemini (${ai.model})` : "Offline (answers with your best note)"}</span></div>
    <div class="setting"><span>Start over</span>${sure
      ? html`<button class="pbtn red sm" onClick=${() => { onReset(); setSure(false); }}>Yes, erase stars</button>`
      : html`<button class="pbtn ghost sm" onClick=${() => setSure(true)}>Reset progress</button>`}</div>
  <//>`;
}

function Goodbye({ onBack }) {
  return html`<main class="center-screen"><section class="title-card glass rivets">
    <div class="zzz" style="font-size:16px;margin-bottom:10px">z z Z</div>
    <div style="display:grid;place-items:center"><${Sprite} name="catSleep" scale=${8} /></div>
    <h1 class="game-title" style="font-size:32px;margin-top:20px">SEE YOU<br />SOON!</h1>
    <p class="subtitle">Your stars are saved in this browser.</p>
    <button class="pbtn blue" onClick=${onBack}>Back to title</button>
  </section></main>`;
}

function Trophy({ onClose }) {
  useEffect(() => { sfx("win"); }, []);
  return html`<${Modal} title="RAG MASTER!" onClose=${onClose}>
    <div class="trophy"><${Sprite} name="trophy" scale=${8} /></div>
    <p style="text-align:center">You learned how AI finds answers:</p>
    <div class="howto">
      <div class="howto-step glass-soft"><span class="num">R</span><div><b>Retrieve</b>: search the chunks for the best pieces.</div></div>
      <div class="howto-step glass-soft"><span class="num">A</span><div><b>Augment</b>: give those pieces to the AI.</div></div>
      <div class="howto-step glass-soft"><span class="num">G</span><div><b>Generate</b>: answer only from them. Never guess!</div></div>
    </div>
  <//>`;
}

// ---------------- app ----------------
function App() {
  const [screen, setScreen] = useState("title");
  const [content, setContent] = useState(null);
  const [error, setError] = useState("");
  const [ai, setAi] = useState(null);
  const [stars, setStars] = useState(loadStars);
  const [level, setLevel] = useState(null);
  const [menu, setMenu] = useState(false);
  const [trophy, setTrophy] = useState(false);
  const [settings, setSettingsState] = useState(loadSettings);
  const setSettings = (s) => { setSettingsState(s); saveSettings(s); };

  useEffect(() => {
    api.content().then(setContent).catch((e) => setError(e.message));
    api.status().then(setAi).catch(() => setAi({ ai: "offline" }));
  }, []);
  useEffect(() => { setSound(settings.sound); setMusic(settings.music && settings.sound && screen !== "title"); }, [settings, screen]);

  const books = content ? Object.fromEntries(content.books.map((b) => [b.id, b])) : {};
  const levels = content ? content.levels : [];
  const record = (id, n) => {
    const s = { ...stars, [id]: Math.max(stars[id] || 0, n) };
    setStars(s); saveStars(s);
  };
  const play = (l) => { setLevel(l); setScreen("level"); };

  let body;
  if (error) {
    body = html`<main class="center-screen"><section class="title-card glass"><h2 class="title-font">Oops</h2><p>${error}</p>
      <button class="pbtn" onClick=${() => location.reload()}>Try again</button></section></main>`;
  } else if (screen === "map" && content) {
    body = html`<${WorldMap} levels=${levels} stars=${stars} onPlay=${play} onTitle=${() => setScreen("title")}
      onMenu=${() => setMenu(true)} onTrophy=${() => setTrophy(true)} />`;
  } else if (screen === "level" && level) {
    const idx = levels.findIndex((l) => l.id === level.id);
    body = html`<${LevelScreen} key=${level.id} level=${level} books=${books} settings=${settings} onDone=${record}
      onMap=${() => setScreen("map")} hasNext=${idx < levels.length - 1}
      onNext=${() => play(levels[idx + 1])} />`;
  } else if (screen === "goodbye") {
    body = html`<${Goodbye} onBack=${() => setScreen("title")} />`;
  } else {
    body = html`<${Title} ai=${ai} started=${Object.keys(stars).length > 0} onStart=${() => { sfx("click"); setScreen("map"); }}
      onMenu=${() => setMenu(true)} onExit=${() => setScreen("goodbye")} />`;
  }

  return html`<${Scene} dim=${screen === "level"} />
    <div class="app">${body}</div>
    ${menu && html`<${Menu} onClose=${() => setMenu(false)} settings=${settings} setSettings=${setSettings} ai=${ai}
      onReset=${() => { setStars({}); saveStars({}); setMenu(false); }} />`}
    ${trophy && html`<${Trophy} onClose=${() => setTrophy(false)} />`}`;
}

render(html`<${App} />`, document.getElementById("root"));
