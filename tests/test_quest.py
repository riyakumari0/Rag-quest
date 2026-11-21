"""Run with:  python3 -m unittest discover tests -v"""
import io
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from quest import rag, webapp  # noqa: E402

BOOKS = {b["id"]: b for b in webapp.CONTENT["books"]}
LEVELS = {l["id"]: l for l in webapp.CONTENT["levels"]}


class Content(unittest.TestCase):
    def test_level_references(self):
        for l in webapp.CONTENT["levels"]:
            for r in l.get("rounds", []):
                if "book" in r:
                    self.assertIn(r["book"], BOOKS)
                for c in r.get("choices", []):
                    self.assertIn(c, BOOKS)
                if "page" in r:
                    self.assertLess(r["page"], len(BOOKS[r["book"]]["pages"]))
                if "fake" in r:
                    self.assertLess(r["fake"], len(r["answer"]))
            self.assertTrue(l["lesson"] and l["goal"] and l["intro"])

    def test_keyword_rounds_are_winnable(self):
        for r in LEVELS[3]["rounds"]:
            kept, _ = rag.keywords(r["q"])
            top = rag.search(" ".join(kept), webapp.BOOK_DOCS)["results"][0]
            self.assertEqual(top["id"], r["book"], r["q"])

    def test_slice_rounds_find_clean_piece(self):
        for r in LEVELS[4]["rounds"]:
            pieces, cur = [], []
            for k, line in enumerate(r["lines"]):
                cur.append(line)
                if k in r["cuts"] or k == len(r["lines"]) - 1:
                    pieces.append(" ".join(cur)); cur = []
            res = rag.search(r["test"], [(str(i), p) for i, p in enumerate(pieces)])
            self.assertGreater(res["results"][0]["score"], 0, r["test"])


class Rag(unittest.TestCase):
    NOTES = LEVELS[6]["templates"][0]["text"]

    def test_answers_from_notes(self):
        r = rag.ask(self.NOTES, "What does Biscuit like eating?")
        self.assertTrue(r["found"])
        self.assertIn("fish", r["answer"])

    def test_refuses_when_missing(self):
        r = rag.ask(self.NOTES, "What colour is the car?")
        self.assertFalse(r["found"])

    def test_gemini_path_and_fallback(self):
        class Fake:
            def __init__(self, out=None, fail=False): self.out, self.fail = out, fail
            def generate(self, system, prompt, temperature=0.3):
                if self.fail: raise RuntimeError("down")
                return self.out
        self.assertEqual(rag.ask(self.NOTES, "How old is Biscuit?", Fake("Biscuit is 3 [1]"))["mode"], "gemini")
        self.assertFalse(rag.ask(self.NOTES, "How old is Biscuit?", Fake("CANNOT"))["found"])
        self.assertEqual(rag.ask(self.NOTES, "How old is Biscuit?", Fake(fail=True))["mode"], "offline")


class Api(unittest.TestCase):
    def call(self, method, path, body=None, query=""):
        raw = json.dumps(body).encode() if body is not None else b""
        env = {"REQUEST_METHOD": method, "PATH_INFO": path, "QUERY_STRING": query,
               "CONTENT_LENGTH": str(len(raw)), "wsgi.input": io.BytesIO(raw)}
        out = {}
        data = b"".join(webapp.app(env, lambda s, h: out.update(code=int(s.split()[0]))))
        return out["code"], data

    def test_routes(self):
        self.assertEqual(self.call("GET", "/api/content")[0], 200)
        code, data = self.call("POST", "/api/search", {"query": "castle built"})
        self.assertEqual(json.loads(data)["results"][0]["id"], "castle")
        code, data = self.call("POST", "/api/index", {"notes": "Sky is blue.", "question": "What colour is the sky?"}, "r=ask")
        self.assertEqual(code, 200)
        self.assertEqual(self.call("POST", "/api/ask", {"notes": "x"})[0], 400)
        self.assertEqual(self.call("GET", "/")[0], 200)
        self.assertEqual(self.call("GET", "/../quest/rag.py")[0], 404)


if __name__ == "__main__":
    unittest.main()
