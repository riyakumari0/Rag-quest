// Pixel art, drawn from text grids. Each letter is a colour; "." is transparent.
// `mirror: true` means only the left half is written and it is mirrored.
import { html, useMemo } from "../vendor/preact-htm.js";

const PAL = {
  k: "#1b1030", K: "#2d1b4e", w: "#ffffff", W: "#fff1d6",
  y: "#ffd23f", Y: "#e0a800", o: "#ff9f43", O: "#d9771c",
  p: "#ff6fae", P: "#c2407f", r: "#ff4d6d", R: "#b8243f",
  b: "#4d7cff", B: "#2f4fb8", c: "#6ee7ff", C: "#2bb3d9",
  g: "#3ddc84", G: "#1f8a4c", a: "#8cf5b5", n: "#a86b3c", N: "#6b4226",
  s: "#f2c29b", S: "#d99a6c", d: "#c68642", D: "#8d5524",
  h: "#2b1b17", H: "#6b3e26", l: "#c7c7d9", m: "#8a8aa3",
  v: "#9b5de5", V: "#5b2a86", M: "#8c1c3a", e: "#ffe98a", E: "#f2c94c",
  f: "#f3e8ff", F: "#c9b6f2",
};

function frame(w, h) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    let row = "";
    for (let x = 0; x < w; x++) {
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      const inner = x === 1 || y === 1 || x === w - 2 || y === h - 2;
      const inner2 = x === 2 || y === 2 || x === w - 3 || y === h - 3;
      row += edge ? "k" : inner ? ((x + y) % 3 === 0 ? "Y" : "y") : inner2 ? "Y" : "K";
    }
    rows.push(row);
  }
  // a little "?" in the empty frame
  const q = ["..kkk..", ".k...k.", ".....k.", "....k..", "...k...", ".......", "...k..."];
  const ox = Math.floor((w - 7) / 2), oy = Math.floor((h - 7) / 2);
  q.forEach((line, dy) => {
    const r = rows[oy + dy].split("");
    [...line].forEach((ch, dx) => { if (ch === "k") r[ox + dx] = "F"; });
    rows[oy + dy] = r.join("");
  });
  return rows;
}

const S = {
  moon: { rows: [
    "....eeee....", "..eeeeeeee..", ".eeeeeeEeee.", ".eeEEeeeeee.", "eeeEEeeeeeee", "eeeeeeeeEeee",
    "eeeeeeeeEEee", "eeEeeeeeeeee", ".eeeeeeeeee.", ".eeeeEEeeee.", "..eeeeeeee..", "....eeee....",
  ] },
  cloud: { rows: [
    ".....ffff.......", "...ffffffff.ff..", ".fffffffffffffff", "ffffffffffffffff", "FFffffffffffffFF", ".FFFFFFFFFFFFFF.",
  ] },
  crystal: { rows: ["CcccccC", "CccwccC", ".Ccwcc.", ".Ccwcc.", "..Cwc..", "..Ccc..", "...c...", "...c..."] },
  heart: { rows: [".rr.rr.", "rwrrrrr", "rrrrrrr", ".rrrrR.", "..rRR..", "...R..."] },
  heartEmpty: { rows: [".kk.kk.", "kmmkmmk", "kmmmmmk", ".kmmmk.", "..kmk..", "...k..."] },
  sweat: { rows: [".c.", "ccc", "cwc", ".c."] },
  sparkle: { rows: ["..w..", "..w..", "wwyww", "..w..", "..w.."] },
  cat: { mirror: true, rows: [
    "..k.....", ".kok....", ".kpok...", ".koookkk", "kooooooo", "koOooooo", "kookkooo", "kookwooo",
    "kooooooo", "koooooop", ".koooook", "..kooorr", ".kWWoooo", "kWWWoooo", "kWWWoooo", ".kkkkkkk",
  ] },
  catSleep: { mirror: true, rows: [
    "..k.....", ".kok....", ".kpok...", ".koookkk", "kooooooo", "koOooooo", "kooooooo", "kookkooo",
    "kooooooo", "koooooop", ".koooook", "..kooorr", ".kWWoooo", "kWWWoooo", "kWWWoooo", ".kkkkkkk",
  ] },
  meera: { mirror: true, rows: [
    "......hh", ".....hhh", "...hhhhh", "..hhlhhh", ".hhsssss", ".hssssss", ".hsyyyyy", ".hsykwys",
    ".hsyyyys", ".hssssss", "..ssssss", "..sssspp", "...sssss", "......ss", "..MMMwMw", ".MMMMMMM",
  ] },
  kabir: { mirror: true, rows: [
    "..h.h.hh", ".hhhhhhh", "hhhhhhhh", "hhhhhhhh", "hhdhdddd", "hddddddd", "hdkkkddd", "hddkwddd",
    ".ddddddd", ".dDDdddd", ".dDDDDDk", "..DDDDDD", "...DDDDD", "......dd", "..VVVVVV", ".VVVVVVV",
  ], patch: [[3, 15, "y"], [12, 14, "p"], [10, 15, "c"], [5, 14, "r"], [13, 15, "y"]] },
  rohan: { mirror: true, rows: [
    "........", "....yyyy", "..yyyyyy", ".yyywyyy", "YYYYYYYY", ".hdddddd", ".hdkkddd", ".hdkwddd",
    ".ddddddd", ".ddddhhh", "..dddddk", "...ddddd", "....dddd", "......dd", "..bbybbb", ".bbbybbb",
  ] },
  anya: { mirror: true, rows: [
    "....hhhh", "..hhhhhh", ".hhoooOo", ".hoooooo", "hhssssss", "hsssssss", "hsshhsss", "hsskwsss",
    "hsssssss", "hspsssss", "..ssskss", "..sssskk", "...sssss", "......ss", "..owwwww", ".oowwwww",
  ], patch: [[7, 5, "r"], [8, 5, "r"], [9, 15, "y"], [10, 14, "y"], [10, 15, "Y"]] },
  paper: { rows: ["kkkkkk..", "kwwwwkk.", "kwkkwwkk", "kwwwwwwk", "kwkkkkwk", "kwwwwwwk", "kwkkkwwk", "kwwwwwwk", "kkkkkkkk"] },
  clipboard: { rows: ["..kyyk..", "knnkknnk", "knwwwwnk", "knwkkwnk", "knwwwwnk", "knwkkwnk", "knwwwwnk", "knnnnnnk", "kkkkkkkk"] },
  map: { rows: ["kkkkkkkk", "kgcgcggk", "kgcgrgck", "kcgcgcgk", "kgcrcgck", "kcgcgcgk", "kgcgcgck", "kkkkkkkk"] },
  speech: { rows: [".kkkkkk.", "kwwwwwwk", "kwkkkkwk", "kwwwwwwk", "kwkkkwwk", ".kkwkkk.", "..kwk...", "..kk...."] },
  envelope: { rows: ["kkkkkkkk", "kkwwwwkk", "kwkwwkwk", "kwwkkwwk", "kwwwwwwk", "kkkkkkkk"] },
  phone: { rows: ["kkkkkk", "kcccck", "kcwcck", "kcccck", "kcccck", "kCcccK", "kkkkkk", "kmkkmk", "kkkkkk"] },
  van: { rows: ["kkkkkkk...", "kwwwwwwkk.", "kwoooowkck", "kwwwwwwkkk", "kkkkkkkkkk", ".kmk..kmk.", "..k....k.."] },
  flask: { rows: ["..kkk..", "..kwk..", "..kwk..", ".kwwwk.", "kwwwwwk", "kgggggk", "kgwgggk", "kgggggk", ".kkkkk."] },
  key: { rows: [".kkk.....", "kyyykkkkk", "ky.yyyyyk", "kyyykkyk.", ".kkk..k.."] },
  plate: { rows: ["..kkkkk..", ".kwwwwwk.", "kwwoyowwk", "kwwyoywwk", ".kwwwwwk.", "..kkkkk.."] },
  lock: { rows: [".kkkkk.", "kk...kk", "k.....k", "kkkkkkk", "kyyyyyk", "kyykyyk", "kyykyyk", "kkkkkkk"] },
  magnifier: { rows: ["..kkkk...", ".kccwck..", "kccccwck.", "kcccccck.", "kcccccck.", ".kcccck..", "..kkkkkk.", "......kNk", ".......kN"] },
  pin: { rows: [".rrrr..", "rwrrrr.", "rrrrrrR", ".rrrrR.", "..RRR..", "...m...", "...m...", "...m...", "...m..."] },
  clock: { rows: ["..kkkk..", ".kwwwwk.", "kwwkwwwk", "kwwkwwwk", "kwwkkkwk", "kwwwwwwk", ".kwwwwk.", "..kkkk.."] },
  gavel: { rows: ["..kkkk...", ".knnnnk..", ".knNNnk..", "..kkkkk..", "....kNk..", ".....kNk.", "......kNk", ".kkkkk.kk", "kyyyyyk.."] },
  tree: { mirror: true, rows: [
    "......GG", "....GGgg", "...Ggagg", "..Gggggg", ".GgagggG", ".Gggggga", "GggGgggg", "Gggggagg",
    "GgaggggG", ".GgggGgg", ".GGggggg", "..GGGggG", "....GGGG", "......nN", "......nN", "......nN", "....nnnN",
  ] },
  bush: { mirror: true, rows: ["...GGg", ".GGggg", "Gggagg", "Gggggg", "GGgggg", ".GGGGG"] },
  sunflower: { rows: [".yyy.", "yyNyy", "yNNNy", "yyNyy", ".yyy.", "..g..", ".gg..", "..gg.", "..g.."] },
  tulip: { rows: ["p.p.p", "ppppp", "pPppp", ".ppp.", "..g..", "g.g..", "ggg.g", "..gg.", "..g.."] },
  lamp: { rows: [".kkk.", "kyyyk", "kyeyk", "kyyyk", ".kkk.", ...Array(16).fill("..k.."), ".kkk.", "kkkkk"] },
  owl: { mirror: true, rows: [
    "..kk....", ".kHHk...", ".kHHHkkk", "kHHHHHHH", "kHwwwwHH", "kwwkkwwH", "kwwkwwwH", "kHwwwwHo",
    "kHHHHHoo", "kHWHWHHH", "kHHWHWHH", ".kHWHWHH", "..kHHHHH", "...kkyky",
  ] },
  orb: { mirror: true, rows: [
    "....kk", "..kkcc", ".kccwc", ".kcwcc", "kcckcc", "kcckcv", "kccvvv", ".kcvvv", ".kkvvv", "..kkkk", ".kyyyy", "kYYYYY",
  ] },
  book: { rows: [
    "kkkkkkk.", "kxxxxxkW", "kxWWWxkW", "kxxxxxkW", "kxxxxxkW", "kxxyxxkW", "kxxxxxkW", "kxxxxxkW", "kXXXXXkW", "kkkkkkkk",
  ] },
  scroll: { rows: [
    ".kkkkkkkkkk.", "kWWWWWWWWWWk", "kWmmmmmmmmWk", "kWWWWWWWWWWk", "kWmmmmmmWWWk", "kWWWWWWWWWWk", "kWmmmmmmmmWk", "kWWWWWWWWWWk", ".kkkkkkkkkk.",
  ] },
  scissors: { rows: ["kk.....kk", "kwk...kwk", ".kwk.kwk.", "..kwkwk..", "...kmk...", "..kmkmk..", ".krk.krk.", ".kk...kk."] },
  star: { rows: ["....y....", "...yyy...", "yyyyyyyyy", ".yyyyyyy.", "..yyyyy..", ".yyy.yyy.", "yy.....yy"] },
  starEmpty: { rows: ["....K....", "...KKK...", "KKKKKKKKK", ".KKKKKKK.", "..KKKKK..", ".KKK.KKK.", "KK.....KK"] },
  trophy: { mirror: true, rows: ["kkkkkk", "kyyyyy", "yyyywy", "kyyyyy", ".kyyyy", "..kyyy", "...kyy", "....ky", "...kYY", "..kYYY", "..kkkk"] },
  frame: { rows: frame(22, 16) },
};

const BOOK_COLORS = { red: ["r", "R"], purple: ["v", "V"], orange: ["o", "O"], green: ["g", "G"], blue: ["b", "B"], pink: ["p", "P"], yellow: ["y", "Y"], cyan: ["c", "C"] };
for (const [name, [a, b]] of Object.entries(BOOK_COLORS)) {
  S["book_" + name] = { rows: S.book.rows.map((r) => r.replace(/x/g, a).replace(/X/g, b).replace(/y/g, name === "yellow" ? "w" : "y")) };
}

const cache = {};
function build(name) {
  if (cache[name]) return cache[name];
  const sp = S[name];
  if (!sp) return null;
  let rows = sp.mirror ? sp.rows.map((r) => r + [...r].reverse().join("")) : sp.rows.slice();
  rows = rows.map((r) => r.split(""));
  for (const [x, y, c] of sp.patch || []) if (rows[y]) rows[y][x] = c;
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const rects = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (c === "." || c === " " || !PAL[c]) { x++; continue; }
      let run = 1;
      while (row[x + run] === c) run++;
      rects.push([x, y, run, PAL[c]]);
      x += run;
    }
  });
  return (cache[name] = { w, h, rects });
}

export function Sprite({ name, scale = 4, className = "", title, style }) {
  const sp = build(name);
  if (!sp) return null;
  return html`<svg class=${"pixel " + className} width=${sp.w * scale} height=${sp.h * scale}
      viewBox=${`0 0 ${sp.w} ${sp.h}`} shape-rendering="crispEdges" style=${style}
      role=${title ? "img" : "presentation"} aria-hidden=${title ? undefined : "true"}>
    ${title && html`<title>${title}</title>`}
    ${sp.rects.map(([x, y, w, c]) => html`<rect x=${x} y=${y} width=${w} height="1" fill=${c} />`)}
  </svg>`;
}

export const DOC_ICON = {
  report: "paper", plan: "map", log: "clipboard", sheet: "clipboard", statement: "speech", testimony: "speech",
  letter: "envelope", menu: "plate", phone: "phone", gps: "van", forensics: "flask", rental: "key",
};

export function DocIcon({ kind, locked, scale = 3 }) {
  return html`<${Sprite} name=${locked ? "lock" : DOC_ICON[kind] || "paper"} scale=${scale} />`;
}

// deterministic pseudo-random so the skyline doesn't jump between renders
function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

function Skyline() {
  const shapes = useMemo(() => {
    const r = rng(42);
    const out = [];
    let x = 0;
    while (x < 400) {
      const w = 14 + Math.floor(r() * 22);
      const h = 24 + Math.floor(r() * 70);
      out.push({ x, w, h });
      x += w + 2;
    }
    return out.map((b) => {
      const wins = [];
      for (let wy = 120 - b.h + 6; wy < 116; wy += 7)
        for (let wx = b.x + 3; wx < b.x + b.w - 3; wx += 5)
          if (r() > 0.55) wins.push({ x: wx, y: wy, c: r() > 0.8 ? "#ff6fae" : r() > 0.6 ? "#6ee7ff" : "#ffd23f" });
      return { ...b, wins };
    });
  }, []);
  return html`<svg class="skyline pixel" viewBox="0 0 400 120" preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges" aria-hidden="true">
    ${shapes.map((b) => html`<rect x=${b.x} y=${120 - b.h} width=${b.w} height=${b.h} fill="#1e0b40" />
      <rect x=${b.x} y=${120 - b.h} width=${b.w} height="2" fill="#3b1a72" />
      ${b.wins.map((w) => html`<rect x=${w.x} y=${w.y} width="2" height="3" fill=${w.c} opacity="0.8" />`)}`)}
    <rect x="186" y="34" width="46" height="86" fill="#2a0f55" />
    <rect x="182" y="30" width="54" height="6" fill="#4a1f86" />
    <rect x="200" y="44" width="18" height="13" fill="#e0a800" /><rect x="202" y="46" width="14" height="9" fill="#120626" />
    <rect x="190" y="64" width="6" height="8" fill="#ffd23f" /><rect x="222" y="64" width="6" height="8" fill="#ffd23f" class="flicker" />
    <rect x="204" y="96" width="10" height="24" fill="#120626" />
  </svg>`;
}

export function Scene({ dim = false }) {
  const stars = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: 70 }, (_, i) => ({
      top: r() * 55, left: r() * 100, big: r() > 0.88, delay: (r() * 3).toFixed(2), i,
    }));
  }, []);
  return html`<div class=${"scene" + (dim ? " dimmed" : "")} aria-hidden="true">
    <div class="sky"></div>
    ${stars.map((s) => html`<span class=${"star" + (s.big ? " big" : "")} style=${`top:${s.top}%;left:${s.left}%;animation-delay:${s.delay}s`}></span>`)}
    <div class="moon"><${Sprite} name="moon" scale=${7} /></div>
    <div class="cloud" style="top:12%;animation-duration:70s;animation-delay:-20s"><${Sprite} name="cloud" scale=${6} /></div>
    <div class="cloud" style="top:24%;animation-duration:95s;animation-delay:-60s"><${Sprite} name="cloud" scale=${4} /></div>
    <div class="cloud" style="top:6%;animation-duration:120s;animation-delay:-5s"><${Sprite} name="cloud" scale=${3} /></div>
    <div class="crystals left">${[5, 4, 6].map((s, i) => html`<div style=${`animation-delay:${i * 0.7}s`}><${Sprite} name="crystal" scale=${s} /></div>`)}</div>
    <div class="crystals right">${[4, 6, 5].map((s, i) => html`<div style=${`animation-delay:${i * 0.5}s`}><${Sprite} name="crystal" scale=${s} /></div>`)}</div>
    <${Skyline} />
    <div class="horizon"></div>
    <div class="floor"><div class="grid"></div></div>
    <div class="tree"><${Sprite} name="tree" scale=${7} /></div>
    <div class="tree two"><${Sprite} name="bush" scale=${7} /></div>
    <div class="lamp"><${Sprite} name="lamp" scale=${5} /></div>
    <div class="flowers">${Array.from({ length: 9 }, (_, i) => html`<${Sprite} name=${i % 2 ? "tulip" : "sunflower"} scale=${4} />`)}</div>
    <div class="walker"><div><${Sprite} name="cat" scale=${3} /></div></div>
    <div class="dim"></div>
  </div>`;
}
