// Talks to the Python server, and remembers your stars in this browser.
async function call(route, body) {
  let res;
  try {
    res = await fetch(`/api/${route}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Can't reach the game server. Is server.py still running?");
  }
  let data = null;
  try { data = await res.json(); } catch { /* not JSON */ }
  if (!res.ok || !data) throw new Error((data && data.error) || `Server error (${res.status})`);
  return data;
}

export const api = {
  content: () => call("content"),
  status: () => call("status"),
  search: (query, docs) => call("search", docs ? { query, docs } : { query }),
  ask: (notes, question) => call("ask", { notes, question }),
};

const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked: progress just won't persist */ } };

export function loadStars() { try { return JSON.parse(get("ragQuest.stars") || "{}"); } catch { return {}; } }
export const saveStars = (s) => set("ragQuest.stars", JSON.stringify(s));
export function loadSettings() {
  try { return { sound: true, music: false, speed: "normal", ...JSON.parse(get("ragQuest.settings") || "{}") }; }
  catch { return { sound: true, music: false, speed: "normal" }; }
}
export const saveSettings = (s) => set("ragQuest.settings", JSON.stringify(s));
