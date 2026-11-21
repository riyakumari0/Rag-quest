"""The RAG engine behind RAG Quest, in plain Python (standard library only).

R - Retrieve: split text into small pieces ("chunks"), score each piece
    against the question with BM25 (a classic keyword-search formula).
A - Augment:  hand the best pieces to the answer step.
G - Generate: Gemini writes an answer from ONLY those pieces (if a key is
    set). Without a key we answer with the best piece itself. Either way,
    if nothing matches we refuse instead of guessing.
"""
from __future__ import annotations

import math
import re
from collections import Counter

STOPWORDS = set("""
a an the is are was were be been am do does did to of in on at for with by from and or but so if
it its this that these those i me my you your we our they them their he him his she her what which
who whom when where why how can could should would will shall may might must has have had there here
about into than then too very just also not no yes any some all much many more most please tell
""".split())

# tiny word families so "eat" finds "eats", "dragon" finds "dragons"
def stem(word: str) -> str:
    for suffix in ("ing", "ed", "es", "s"):
        if len(word) > len(suffix) + 2 and word.endswith(suffix):
            return word[: -len(suffix)]
    return word


def words(text: str) -> list[str]:
    return re.findall(r"[a-z0-9']+", text.lower().replace("’", "'"))


def keywords(text: str) -> tuple[list[str], list[str]]:
    """Return (keywords kept, small words ignored)."""
    kept, ignored = [], []
    for w in words(text):
        w = w.strip("'")
        if not w:
            continue
        (ignored if w in STOPWORDS else kept).append(w)
    return kept, ignored


class BM25:
    def __init__(self, docs: list[tuple[str, str]], k1: float = 1.4, b: float = 0.6):
        self.k1, self.b = k1, b
        self.ids = [d for d, _ in docs]
        self.tf = {d: Counter(stem(w) for w in keywords(t)[0]) for d, t in docs}
        self.length = {d: sum(c.values()) or 1 for d, c in self.tf.items()}
        self.avg = sum(self.length.values()) / max(1, len(docs))
        df = Counter()
        for c in self.tf.values():
            df.update(c.keys())
        n = len(docs)
        self.idf = {t: math.log(1 + (n - f + 0.5) / (f + 0.5)) for t, f in df.items()}

    def rank(self, query: str) -> list[dict]:
        kept, _ = keywords(query)
        terms = list(dict.fromkeys(stem(w) for w in kept))
        out = []
        for d in self.ids:
            tf, score, matched = self.tf[d], 0.0, []
            for t in terms:
                f = tf.get(t, 0)
                if not f:
                    continue
                matched.append(t)
                score += self.idf.get(t, 0) * f * (self.k1 + 1) / (f + self.k1 * (1 - self.b + self.b * self.length[d] / self.avg))
            out.append({"id": d, "score": round(score, 2), "matched": matched})
        out.sort(key=lambda h: -h["score"])
        return out


def search(query: str, docs: list[tuple[str, str]]) -> dict:
    kept, ignored = keywords(query)
    return {"keywords": kept, "ignored": ignored, "results": BM25(docs).rank(query) if docs else []}


def chunk(notes: str, limit: int = 60) -> list[str]:
    """Cut notes into small pieces: one sentence (or line) each."""
    pieces = []
    for line in notes.replace("\r", "").split("\n"):
        for s in re.split(r"(?<=[.!?])\s+", line.strip()):
            s = s.strip()
            if len(s) >= 3:
                pieces.append(s[:300])
    return pieces[:limit]


ANSWER_PROMPT = """You are Orb, a friendly crystal-ball helper in a pixel game that teaches RAG.
Answer the question using ONLY the numbered note pieces. Cite the pieces you used like [1].
Use 1 or 2 short, simple sentences. If the pieces do not contain the answer, reply with exactly: CANNOT"""


def ask(notes: str, question: str, llm=None) -> dict:
    pieces = chunk(notes)
    if not pieces:
        return {"pieces": [], "ranked": [], "top": [], "answer": "Teach me some notes first!", "found": False, "mode": "none"}
    ranked = BM25([(str(i), p) for i, p in enumerate(pieces)]).rank(question)
    top = [h for h in ranked if h["score"] > 0][:3]
    kept, ignored = keywords(question)
    result = {"pieces": pieces, "ranked": ranked, "top": top, "keywords": kept, "ignored": ignored}
    if not top:
        return dict(result, answer="I can't find that in your notes, so I won't guess!", found=False, mode="refuse")
    if llm is not None:
        numbered = "\n".join(f"[{n + 1}] {pieces[int(h['id'])]}" for n, h in enumerate(top))
        try:
            text = llm.generate(ANSWER_PROMPT, f"NOTE PIECES:\n{numbered}\n\nQUESTION: {question}", temperature=0.3).strip()
            if text.upper().startswith("CANNOT"):
                return dict(result, answer="Those pieces don't really answer that, so I won't guess!", found=False, mode="gemini")
            return dict(result, answer=text[:600], found=True, mode="gemini")
        except Exception as e:  # fall back to the offline answer
            result["error"] = str(e)[:160]
    best = pieces[int(top[0]["id"])]
    return dict(result, answer=f"From your notes: {best} [1]", found=True, mode="offline")
