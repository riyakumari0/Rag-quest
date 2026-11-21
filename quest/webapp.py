"""WSGI app: JSON API + static files. Runs locally (server.py) and on Vercel (api/index.py).

GET  /api/content                         -> books + levels
GET  /api/status                          -> is Gemini on?
POST /api/search {query, docs?}           -> keyword search over the books (or given docs)
POST /api/ask    {notes, question}        -> full RAG over your own notes
"""
from __future__ import annotations

import json
import mimetypes
import os
from urllib.parse import parse_qs

from . import rag
from .gemini import Gemini

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
with open(os.path.join(os.path.dirname(__file__), "content", "quest.json"), encoding="utf-8") as f:
    CONTENT = json.load(f)
BOOK_DOCS = [(b["id"], b["title"] + ". " + " ".join(b["pages"])) for b in CONTENT["books"]]
_llm = {}


class ApiError(Exception):
    def __init__(self, msg, status=400):
        super().__init__(msg)
        self.status = status


def get_llm():
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key or os.environ.get("AI_MODE", "").lower() == "offline":
        return None
    model = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")
    if (key, model) not in _llm:
        _llm.clear()
        _llm[(key, model)] = Gemini(key, model, None)
    return _llm[(key, model)]


def _json(start_response, status, payload):
    body = json.dumps(payload).encode()
    start_response(f"{status} {'OK' if status == 200 else 'Error'}", [
        ("Content-Type", "application/json; charset=utf-8"), ("Content-Length", str(len(body))), ("Cache-Control", "no-store")])
    return [body]


def _body(environ):
    try:
        n = int(environ.get("CONTENT_LENGTH") or 0)
    except ValueError:
        n = 0
    if n > 200_000:
        raise ApiError("Too much text")
    raw = environ["wsgi.input"].read(n) if n else b""
    try:
        data = json.loads(raw or b"{}")
    except ValueError:
        raise ApiError("Invalid JSON") from None
    if not isinstance(data, dict):
        raise ApiError("Invalid JSON")
    return data


def _text(value, limit):
    return str(value or "").strip()[:limit]


def api(environ, start_response, route, method):
    if route == "content":
        return _json(start_response, 200, CONTENT)
    if route == "status":
        llm = get_llm()
        return _json(start_response, 200, {"ai": "gemini" if llm else "offline", "model": llm.model if llm else None})
    if method != "POST":
        raise ApiError("Use POST", 405)
    data = _body(environ)
    if route == "search":
        query = _text(data.get("query"), 300)
        docs = data.get("docs")
        if docs is None:
            docs = BOOK_DOCS
        else:
            if not isinstance(docs, list) or len(docs) > 60:
                raise ApiError("Bad docs")
            docs = [(_text(d.get("id"), 40), _text(d.get("text"), 2000)) for d in docs if isinstance(d, dict)]
        return _json(start_response, 200, rag.search(query, docs))
    if route == "ask":
        notes, question = _text(data.get("notes"), 6000), _text(data.get("question"), 300)
        if not question:
            raise ApiError("Ask a question first")
        return _json(start_response, 200, rag.ask(notes, question, get_llm()))
    raise ApiError("Not found", 404)


def static(start_response, path):
    rel = "index.html" if path in ("", "/") else path.lstrip("/")
    full = os.path.realpath(os.path.join(PUBLIC, rel))
    if not full.startswith(os.path.realpath(PUBLIC) + os.sep) or not os.path.isfile(full):
        start_response("404 Not Found", [("Content-Type", "text/plain")])
        return [b"Not found"]
    ctype = "text/javascript" if full.endswith(".js") else (mimetypes.guess_type(full)[0] or "application/octet-stream")
    if ctype.startswith("text/"):
        ctype += "; charset=utf-8"
    with open(full, "rb") as f:
        data = f.read()
    start_response("200 OK", [("Content-Type", ctype), ("Content-Length", str(len(data))), ("Cache-Control", "no-cache")])
    return [data]


def app(environ, start_response):
    path = environ.get("PATH_INFO", "/") or "/"
    method = environ.get("REQUEST_METHOD", "GET").upper()
    if path.startswith("/api"):
        route = path[len("/api"):].strip("/")
        if route in ("index", "index.py", ""):  # Vercel entry: route arrives as ?r=
            route = parse_qs(environ.get("QUERY_STRING", "")).get("r", [""])[0]
        try:
            return api(environ, start_response, route, method)
        except ApiError as e:
            return _json(start_response, e.status, {"error": str(e)})
        except Exception as e:
            return _json(start_response, 500, {"error": f"Server error: {type(e).__name__}"})
    return static(start_response, path)
