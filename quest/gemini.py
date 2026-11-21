"""Tiny Gemini REST client using only the Python standard library.

Optional: the game runs fully offline without it. Set GEMINI_API_KEY to
let Gemini write the suspects' replies and blend semantic search into RAG.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
import threading
import time
import urllib.error
import urllib.request

BASE = "https://generativelanguage.googleapis.com/v1beta"
EMBED_DIM = 256


class GeminiError(Exception):
    pass


class Gemini:
    def __init__(self, api_key: str, model: str, embed_model: str, timeout: float = 25):
        self.api_key = api_key
        self.model = model
        self.embed_model = embed_model
        self.timeout = timeout
        self.last_error: str | None = None
        self._embed_off_until = 0.0
        self._cache: dict[str, list[float]] = {}  # in-memory only (works on serverless)
        self._lock = threading.Lock()

    # ---------- HTTP ----------
    def _post(self, path: str, body: dict) -> dict:
        req = urllib.request.Request(
            BASE + path,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json", "x-goog-api-key": self.api_key},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace")[:300]
            raise GeminiError(f"HTTP {e.code}: {detail}") from None
        except (urllib.error.URLError, OSError, ValueError) as e:
            raise GeminiError(f"Network error: {e}") from None

    # ---------- text generation ----------
    def generate(self, system: str, prompt: str, json_mode: bool = False, temperature: float = 0.8) -> str:
        body = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": temperature},
        }
        if json_mode:
            body["generationConfig"]["responseMimeType"] = "application/json"
        try:
            data = self._post(f"/models/{self.model}:generateContent", body)
            cands = data.get("candidates") or []
            parts = (cands[0].get("content") or {}).get("parts") or [] if cands else []
            text = "".join(p.get("text", "") for p in parts if not p.get("thought")).strip()
            if not text:
                reason = cands[0].get("finishReason") if cands else data.get("promptFeedback")
                raise GeminiError(f"Empty reply ({reason})")
            self.last_error = None
            return text
        except GeminiError as e:
            self.last_error = str(e)
            raise

    # ---------- embeddings ----------
    def _key(self, text: str, task: str) -> str:
        return hashlib.sha1(f"{self.embed_model}|{task}|{EMBED_DIM}|{text}".encode()).hexdigest()

    def embed(self, texts: list[str], task: str) -> list[list[float]]:
        out: list = [None] * len(texts)
        missing = []
        with self._lock:
            for i, t in enumerate(texts):
                vec = self._cache.get(self._key(t, task))
                if vec is None:
                    missing.append(i)
                else:
                    out[i] = vec
        for start in range(0, len(missing), 100):
            batch = missing[start:start + 100]
            body = {"requests": [{
                "model": f"models/{self.embed_model}",
                "content": {"parts": [{"text": texts[i]}]},
                "taskType": task,
                "outputDimensionality": EMBED_DIM,
            } for i in batch]}
            data = self._post(f"/models/{self.embed_model}:batchEmbedContents", body)
            vectors = [e.get("values") or [] for e in data.get("embeddings", [])]
            if len(vectors) != len(batch):
                raise GeminiError("Embedding count mismatch")
            with self._lock:
                for i, v in zip(batch, vectors):
                    norm = math.sqrt(sum(x * x for x in v)) or 1.0
                    vec = [x / norm for x in v]
                    self._cache[self._key(texts[i], task)] = vec
                    out[i] = vec
        return out

    def similarities(self, query: str, items: list[tuple[str, str]]) -> dict[str, float]:
        if time.time() < self._embed_off_until:
            raise GeminiError("embeddings paused after an error")
        try:
            q = self.embed([query], "RETRIEVAL_QUERY")[0]
            docs = self.embed([t for _, t in items], "RETRIEVAL_DOCUMENT")
        except GeminiError as e:
            self.last_error = f"Embeddings: {e}"
            self._embed_off_until = time.time() + 300  # fall back to BM25 for 5 min
            raise
        return {i: sum(a * b for a, b in zip(q, d)) for (i, _), d in zip(items, docs)}


def parse_json(text: str):
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\s*|\s*```$", "", text)
    try:
        return json.loads(text)
    except ValueError:
        m = re.search(r"\{.*\}", text, re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except ValueError:
                return None
    return None
