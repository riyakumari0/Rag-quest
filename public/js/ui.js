// Small shared building blocks.
import { html, useEffect, useRef, useState } from "../vendor/preact-htm.js";
import { Sprite } from "./sprites.js";
import { sfx } from "./sfx.js";

export function Modal({ title, onClose, children, wide = false, actions }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    const el = ref.current && ref.current.querySelector("button, input, [tabindex]");
    if (el) el.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); prev && prev.focus && prev.focus(); };
  }, []);
  return html`<div class="modal-back" onClick=${(e) => e.target === e.currentTarget && onClose && onClose()}>
    <div class=${"modal glass rivets" + (wide ? " wide" : "")} role="dialog" aria-modal="true" aria-label=${title} ref=${ref}>
      <div class="modal-head">
        <h2>${title}</h2>
        ${onClose && html`<button class="close-x" onClick=${onClose} aria-label="Close">X</button>`}
      </div>
      ${children}
      ${actions && html`<div class="modal-actions">${actions}</div>`}
    </div>
  </div>`;
}

const SPEED = { normal: [1, 24], fast: [3, 14] };

export function Typewriter({ text, speed = "normal", sound = false, onDone }) {
  const [n, setN] = useState(speed === "instant" ? text.length : 0);
  const timer = useRef(null);
  useEffect(() => {
    if (speed === "instant") { setN(text.length); onDone && onDone(); return undefined; }
    const [step, ms] = SPEED[speed] || SPEED.normal;
    let i = 0;
    setN(0);
    timer.current = setInterval(() => {
      i = Math.min(text.length, i + step);
      setN(i);
      if (sound && i % 4 === 0) sfx("tick");
      if (i >= text.length) { clearInterval(timer.current); onDone && onDone(); }
    }, ms);
    return () => clearInterval(timer.current);
  }, [text, speed]);
  const skip = () => {
    if (n < text.length) { clearInterval(timer.current); setN(text.length); onDone && onDone(); }
  };
  return html`<span onClick=${skip}><span aria-hidden="true">${text.slice(0, n)}</span><span class="sr-only">${text}</span></span>`;
}

export function Hearts({ value, max }) {
  return html`<div class="hearts" role="img" aria-label=${`${value} of ${max} hearts left`}>
    ${Array.from({ length: max }, (_, i) => html`<${Sprite} name=${i < value ? "heart" : "heartEmpty"} scale=${3} />`)}
  </div>`;
}

const MOOD = ["calm", "uneasy", "rattled", "sweating", "cracked"];

export function Stress({ level, max, broken, lawyer }) {
  return html`<div class="stress" role="img" aria-label=${`Stress ${level} of ${max}`}>
    ${Array.from({ length: max }, (_, i) => html`<i class=${(i < level ? "on " : "") + "l" + level}></i>`)}
    <span class="label">${lawyer ? "silent" : broken ? "cracked" : MOOD[Math.min(level, 4)]}</span>
  </div>`;
}

export function Toasts({ items }) {
  return html`<div class="toasts" aria-live="polite">
    ${items.map((t) => html`<div key=${t.id} class=${"toast glass " + (t.tone || "")}>
      ${t.icon && html`<${Sprite} name=${t.icon} scale=${2} />`}<span>${t.text}</span></div>`)}
  </div>`;
}

export function Flash({ flash }) {
  if (!flash) return null;
  return html`<div class="flash" key=${flash.id}><div class=${"stamp " + (flash.color || "")}>
    ${flash.text}${flash.sub && html`<small>${flash.sub}</small>`}</div></div>`;
}

export function PortraitBox({ id, scale = 4 }) {
  return html`<div class="portrait-box"><${Sprite} name=${id} scale=${scale} /></div>`;
}

export const firstName = (name) => (name || "").split(" ")[0];
