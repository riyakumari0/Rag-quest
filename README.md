# RAG Quest 🦉🔮

## https://rag-quest-theta.vercel.app/

*A pixel adventure that teaches how AI finds answers, one level at a time.*

In the kingdom of Pixelia, Orb the magic answer ball keeps making things up. With Pip the library owl, you fix it level by level, and learn **RAG (Retrieval-Augmented Generation)** along the way: the trick real AI apps use to answer from real sources instead of guessing.

## Play

You only need Python 3.9 or newer. Nothing to install.

```bash
cd rag-quest
python3 server.py
```

The game opens at **http://localhost:8080**. Your stars are saved in your browser.

## The levels

| Level | Mini-game | You learn |
|---|---|---|
| 1. The Oracle Makes Things Up | Check Orb's answers against the real book: true or made up? | AI can guess wrong ("hallucination") |
| 2. Find the Right Book | Pick the book that holds the answer before time runs out | **R**etrieve first |
| 3. Magic Keywords | Tap the important words, then watch real search score every book | How search works |
| 4. Slice the Scroll | Cut a long scroll wherever the topic changes | Chunking |
| 5. Catch the Fake | Find the one sentence that isn't on the page | Answer only from sources |
| 6. Build Your Own Oracle | Write notes, ask questions, and watch the whole RAG pipeline run | Everything together |

Each level starts with a short explanation from Pip, gives you 1–3 stars, and unlocks the next one. Finish all six to earn the **RAG Master** trophy.

## How the RAG works (the Python part)

Everything lives in [quest/rag.py](quest/rag.py), using only the Python standard library:

1. **Chunk:** your notes are cut into small pieces (one sentence each).
2. **Retrieve:** the question becomes keywords, small words like "the" are dropped, and every piece gets a **BM25** score, the classic search-engine formula.
3. **Generate:** the best pieces become the answer. With a Gemini key, Gemini writes it using only those pieces. If nothing matches, Orb says *"I can't find that"* instead of guessing.

Optional: copy `.env.example` to `.env` and add `GEMINI_API_KEY=...` for AI-written answers in Level 6.

## Project map

```
rag-quest/
├── server.py              run locally
├── api/index.py           Vercel entry point
├── vercel.json
├── quest/
│   ├── rag.py             chunking, BM25 search, answers
│   ├── gemini.py          tiny Gemini client (optional)
│   ├── webapp.py          JSON API + static files
│   └── content/quest.json books, levels, lessons
├── public/                game screens (HTML/CSS/JS, pixel art drawn in code)
└── tests/test_quest.py    python3 -m unittest discover tests
```
