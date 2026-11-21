"""Run RAG Quest on your computer:   python3 server.py

Then open http://localhost:8080 (it opens automatically).
No installs needed: only the Python standard library.
Optional: put GEMINI_API_KEY=... in a .env file next to this script.
"""
import argparse
import os
import sys
import threading
import webbrowser
from socketserver import ThreadingMixIn
from wsgiref.simple_server import WSGIRequestHandler, WSGIServer, make_server

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def load_dotenv(path):
    if not os.path.isfile(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


class ThreadingServer(ThreadingMixIn, WSGIServer):
    daemon_threads = True


class QuietHandler(WSGIRequestHandler):
    def log_message(self, fmt, *args):
        if "/api/" in self.path:
            sys.stderr.write("  %s  %s\n" % (self.command, self.path))


def main():
    load_dotenv(os.path.join(HERE, ".env"))
    parser = argparse.ArgumentParser(description="RAG Quest")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", 8080)))
    parser.add_argument("--no-browser", action="store_true", help="don't open the browser")
    args = parser.parse_args()

    from quest.webapp import app, get_llm

    httpd = None
    for port in range(args.port, args.port + 20):  # if a port is busy, use the next free one
        try:
            httpd = make_server("127.0.0.1", port, app, server_class=ThreadingServer, handler_class=QuietHandler)
            break
        except OSError:
            continue
    if httpd is None:
        sys.exit(f"Ports {args.port}-{args.port + 19} are all busy. Close other servers and try again.")
    url = f"http://localhost:{port}"
    llm = get_llm()
    print("\n  RAG QUEST  -  learn RAG one level at a time")
    print(f"  Open {url}")
    print(f"  AI: {'Gemini (' + llm.model + ')' if llm else 'offline mode (add GEMINI_API_KEY to .env for Gemini)'}")
    print("  Press Ctrl+C to stop.\n")
    if not args.no_browser:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  Goodbye from Pixelia!")


if __name__ == "__main__":
    main()
