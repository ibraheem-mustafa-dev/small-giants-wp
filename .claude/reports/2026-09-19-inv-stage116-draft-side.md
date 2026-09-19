# Stage 11.6 draft side: investigation (2026-09-19)

Scope: read-only. Nothing in the repo was edited except this file. Scratch work lives in `pipeline-state/_inv-stage116/` (probes, reports, the prototype). The local server on port 8771 was stopped before finishing.

Labels: PROVEN = I ran it and read the output. ASSUMED = inferred, not run.

## 1. Problem, Effect, Solution (plain English)

**Problem.** Stage 11.6 is the step that scores "how faithful is the clone to the draft". For the Eye Care Birmingham draft it is not looking at the draft at all. It is looking at a half-built copy of the draft (`dc-import-resolved.html`) that the pipeline wrote into the run folder. That copy still contains the draft's template instructions (`{{ ... }}` placeholders, `<sc-for>` and `<sc-if>` tags) and points at a `support.js` that only exists in the original folder, so the draft's own program never runs and never turns those instructions into real content.

**Effect.** The reported "content 37% / css 4%" is a number about the wrong thing. It counts 9 pages of raw template (1,346 elements, 176 unfilled `{{ }}` strings, 9 `<h1>`s) instead of the one rendered home page (about 880 elements, 0 unfilled strings, 1 `<h1>`). Worse, it is inflated: the clone itself contains leaked `{{ }}` text, and a placeholder in the draft "matches" the same placeholder in the clone. Bean cannot trust the number in either direction.

**Solution.** For a Claude Design (`.dc.html`) draft, Stage 11.6 should serve the original draft folder over a temporary local HTTP address, so the draft's runtime runs and shows the real home page, and give that address to `computed-parity.js` as `--draft`. Detect these drafts by what is inside the file (`<x-dc>`, `data-dc-script`, `<sc-for>`/`<sc-if>`), not by the filename. Plain static drafts (Mama's Munches) stay exactly as they are. Exact diff in section 6.

**What the corrected number says (important, and less flattering).** Scored properly, the current live clone gets content 12% and css 0% (not 37% / 4%). That is a real, low score: the clone has the hero but is missing Best sellers, Why buy, shapes, and Google reviews, and it carries text from other routed pages (Help, Checkout) with raw `{{ }}` leaked into it. The fix makes the measurement honest; it will not make the score go up.

## 2. How Stage 11.6 chooses and passes the draft (PROVEN by reading the code)

All in `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py`, one function (`main`), so locals are shared between the stages.

1. Stage -2 (dc-import resolution): `_draft_dir = args.mockup.parent` is captured, then `resolve_dc_imports(...)` runs. If it resolved at least one `<dc-import>` (`_dc_count` truthy), it writes `run_dir / "dc-import-resolved.html"` and **reassigns `args.mockup`** to that file.
2. Stage -1.5 (opt-in `--resolve-js-content`): same pattern, may reassign `args.mockup` again to `run_dir / "js-content-resolved.html"`.
3. Stage 11.6 (block starting `# Stage 11.6 — computed-parity`, variable `cp_proc`): runs
   `node computed-parity.js --draft str(args.mockup.resolve()) --clone <link= URL from Stage 10> --viewports 375,768,1440 --out run_dir/computed-parity.json`.
4. In `plugins/sgs-blocks/scripts/parity/computed-parity.js`, the helper `toURL` leaves `http(s)://` values alone and turns anything else into a `file://` URL via `pathToFileURL(path.resolve(s))`.

So the draft side is always `args.mockup` as it stands at Stage 11.6, opened as `file://`.

| Draft type | What `args.mockup` is at Stage 11.6 | Loaded as | Result |
|---|---|---|---|
| Plain static (Mama's Munches `mockups/homepage/index.html`) | The original file (no `<dc-import>`, no reassign) | `file://` in the real draft folder | Fine. PROVEN: `computed-parity.json` `draft` field in `mamas-munches-3448-2026-09-09-035047` ends `.../sites/mamas-munches/mockups/homepage/index.html`. Draft has no `<x-dc>` (prototype printed `mamas dsl detected: False`). |
| `.dc.html` with `<dc-import>` (Eye Care) | `run_dir/dc-import-resolved.html` | `file://` in the RUN folder | Wrong. PROVEN below. |
| `.dc.html` with `<dc-import>` plus `--resolve-js-content` | `run_dir/js-content-resolved.html` | `file://` in the run folder | Same wrong class (ASSUMED for the score; PROVEN that the file is written there: `eye-care-...-2026-09-19-020813/js-content-resolved.html` exists). |
| `.dc.html` with NO `<dc-import>` | The original file | `file://` in the real folder | Runtime loads but is degraded (see 4.3). ASSUMED for a draft without imports; the mechanism is PROVEN on the Eye Care original. |

Evidence for the wrong-directory class. The resolved file carries `<script src="./support.js">` and `<script src="./image-slot.js">` (`grep -o "<script[^>]*>" dc-import-resolved.html`). Those are relative to the file's folder. In the run folder neither exists (`ls` of the run dir shows no `support.js`), so the runtime never loads. Result of opening it (`probe.js`, Playwright):

| Target | Elements | `{{` in visible text | `<sc-for>` | `<sc-if>` | `<h1>`s |
|---|---|---|---|---|---|
| `dc-import-resolved.html` in run dir, `file://` (what Stage 11.6 scores) | 1346 | 176 | 43 | 127 | 9 (`{{ shopTitle }}`, `{{ cur.name }}`, Checkout, Thank you...) |
| Original draft, served over HTTP (1440) | 883 | 0 | 0 | 0 | 1 |
| Live clone | 394 | 93 | 0 | 0 | 3 |

(Same 1346/176/43/127/9 at 375 and 768; HTTP gives 893 / 869 / 883 at 375 / 768 / 1440.) Hence "un-rendered template" is PROVEN, not assumed.

## 3. Numbers (PROVEN; commands in section 7)

All runs use `computed-parity.js` standalone, viewports 375/768/1440, clone = `https://darkcyan-grouse-898606.hostingersite.com/eye-care-birmingham/`.

| Run | Draft side | content % (375 / 768 / 1440) | css % | overall_css_pct | tag % |
|---|---|---|---|---|---|
| Current Stage 11.6 (reproduced, `F-current-repro.json`) | resolved file, `file://`, run dir | 37 / 37 / 37 (125 of 337) | 4 | **4** | 8 |
| Proposed fix (`A-served-vs-clone.json`, `E-proto-served.json`) | original folder over HTTP | 12 / 11 / 12 (19 of 159) | 0 | **0** | 1 |
| Positive control 1 (`B-served-vs-self.json`) | served draft vs served draft | 100 / 100 / 100 (159 of 159) | 100 | **100** | 100 |
| Positive control 2 (`C-clone-vs-self.json`) | live clone vs live clone | 100 / 100 / 100 (96 of 96) | 100 | **100** | 100 |

The tool is sound: it scores a page against itself at 100% (7,327 of 7,338 props for the draft, 1,050 of 1,050 for the clone; the 11 not counted are the tool's own non-comparable cases). The A run and the E run (which used the exact server code I propose) match to the digit.

The 37% is inflated. Proxy check (line sets from `innerText`, `python` in section 7; the tool keys by element text so this is approximate): of the 49 lines the resolved draft shares with the clone, 35 are `{{ ... }}` placeholders and only 14 are real text. For the rendered draft, 5 lines match and 0 are placeholders. The clone has 59 of 96 text lines containing `{{`.

## 4. Does the draft render fully over HTTP, and what fraction is not homepage?

### 4.1 One routed view only (PROVEN)
Over HTTP at 375, 768 and 1440 the draft always shows exactly one `<h1>` ("The same designer shades. A good deal less.") and no `<sc-for>`/`<sc-if>` tags survive. The pages are switched by internal state (`isPage('home')` ... `isPage('done')`, 9 pages: home, shop, product, lenses, about, help, contact, checkout, done), not by the URL hash: loading `#home`, `#shop`, `#help`, `#checkout` gave identical output (893 / 869 / 883 elements, same `<h1>`). The default page is **home**, and it is the only one drawn. So the served draft is a fair "homepage" baseline and is a stable, deterministic one.

### 4.2 What the ~880 draft elements are (PROVEN, `tree.js`, 1440)
Visible elements under the draft root: 874. Breakdown:

| Region | Elements | Share | In scope for the homepage clone? |
|---|---|---|---|
| `header` (nav) | 27 | 3% | Chrome. Converter skips top-level header/footer by design (R-31-3); WP theme supplies its own. Legitimately absent. |
| `footer` | 52 | 6% | Same. |
| Announcement bar and root wrappers | about 19 (874 - 27 - 776 - 52) | 2% | Chrome. |
| `main` | 776 | 89% | Yes, this is the homepage content. |
| of which: hero about 45 (776 - 731), brand strip 66, Best sellers 264, Why buy from me 36, Start with a shape 57, Google reviews 308 | | | |

So only about 11% (about 98 elements) is legitimately not part of the homepage clone. The report lists 681-688 unmatched draft elements out of about 874; removing the 98 chrome elements still leaves about 583 unmatched elements inside `main`. **The low score is therefore mostly a true signal**, not a scoring artefact of the 2%/12%.

Reading "2%": the STRUCTURE/tag figure was 1% in my runs (`overall_tag_pct`), content 12%, css 0%. Whatever it is called, it means almost none of the homepage `main` content is in the clone.

Why: the clone text (`clone-text.txt`) contains the hero, then Help ("Delivery, returns and the usual questions"), Checkout ("Your bag", "Card number") and "Thank you" text, i.e. sections from the other 8 routed pages, with unfilled `{{ q.q }}`, `{{ it.brand }}` and so on. It has none of "Best sellers", "Why buy from me", "Start with a shape", "What people say". This is a converter/content question (the content lives in `<sc-for>` over JS arrays, the FR-31-26 area), not a Stage 11.6 question. I flag it because it explains the number; I did not investigate it (ASSUMED that it is the sc-for/route-blindness class).

### 4.3 Why it must be HTTP, not `file://` on the original (PROVEN, `filecheck.js`)
Even the ORIGINAL file over `file://` is not enough:

| Load | Elements at 1440 | Product cards ("Aviator Classic", "SAVE £" x 8) |
|---|---|---|
| `file://` original | 650 | absent (0) |
| HTTP original | 883 | present (8) |

Under `file://` the browser blocks the fetch of the sibling `Frame Card.dc.html` component, so the 8 product cards (233 elements) never render. HTTP is required.

Residual, not a blocker: both loads log 404s for `{{ b.logo }}` / `{{ cur.brandLogo }}` image sources and SVG `{{ logoW }}` attributes (attribute bindings the runtime leaves unresolved on some hidden or template nodes). They are in the draft itself and appear identically in both, so they cost nothing in the comparison.

## 5. Root cause statement (PROVEN)
`args.mockup` is a moving variable. Stages -2 and -1.5 legitimately reassign it to a rewritten file in `run_dir` so the converter can read plain markup, and Stage 11.6 then reuses the same variable as "the draft" for a stage that needs the draft's RUNTIME. The run folder has neither `support.js` nor the sibling components. This is the same class as D1112 (a resolver reading a folder that is not the draft's folder). The unmatched-draft-element count in the current report (794) also includes 8 of 9 routed pages that a real browser would never show at once.

Not the cause (ruled out, no upgrade of any other suspect): the scoring tool (both self-controls 100%), the HTTP loading itself (A and E agree), network/cert issues (both runs completed with the certifi bundle).

## 6. Smallest correct fix (NOT applied). Exact diff

Two parts: a tiny helper module (keeps the 4,000-line orchestrator from growing, per the file-length rule) and the call-site change.

### 6a. New file `plugins/sgs-blocks/scripts/orchestrator/draft_server.py`
```python
"""Serve an original Claude Design draft folder over HTTP for Stage 11.6.

A `.dc.html` draft only renders through its own runtime (`support.js`, sibling
`<name>.dc.html` components fetched by <dc-import>). `file://` blocks that fetch and the
run directory copy has no runtime at all, so computed-parity must be given an http:// URL
on the ORIGINAL draft folder.
"""
from __future__ import annotations

import contextlib
import functools
import http.server
import re
import threading
from pathlib import Path
from typing import Iterator

# Content signal, not a filename: the DSL's root element, its editor data attribute, or its
# control-flow tags. Plain static drafts contain none of these.
_DSL_DRAFT_RE = re.compile(r"<x-dc\b|\bdata-dc-script\b|<sc-(?:for|if)\b", re.IGNORECASE)


def is_dsl_draft(raw_html: str) -> bool:
    return bool(_DSL_DRAFT_RE.search(raw_html))


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:  # noqa: A002
        return


@contextlib.contextmanager
def serve_dir(directory: Path) -> Iterator[str]:
    """Serve `directory` on 127.0.0.1 (ephemeral port); yield the base URL; always shut down."""
    handler = functools.partial(_QuietHandler, directory=str(directory))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}"
    finally:
        server.shutdown()
        server.server_close()
```

### 6b. `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py`

Stage -2 (symbol: `_dc_raw = args.mockup.read_text(...)`), capture the ORIGINAL path and the DSL flag before any reassignment:
```diff
     _draft_dir = args.mockup.parent
+    _draft_path = args.mockup   # ORIGINAL draft, before Stage -2 / -1.5 reassign args.mockup
     _dc_raw = args.mockup.read_text(encoding="utf-8")
+    _draft_server = _load_module_from_path(
+        "sgs_draft_server", ORCHESTRATOR_DIR / "draft_server.py"
+    )
+    _is_dsl_draft = _draft_server.is_dsl_draft(_dc_raw)
     _dc_resolved, _dc_count = _resolve_dc_imports(_dc_raw, args.mockup.parent)
```

Stage 11.6 (symbol: `cp_proc = subprocess.run(`), pick the draft argument:
```diff
-                    cp_proc = subprocess.run(
-                        ["node", str(cp_tool),
-                         "--draft", str(args.mockup.resolve()),
-                         "--clone", cp_url,
-                         "--viewports", "375,768,1440",
-                         "--out", str(cp_out)],
-                        capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=420,
-                    )
+                    # A Claude Design (.dc.html) draft renders only through its own runtime, so
+                    # score the ORIGINAL draft folder over a temporary HTTP server. The run-dir
+                    # copy (args.mockup) has no support.js and is unrendered template. Static
+                    # drafts keep the file path unchanged.
+                    import contextlib as _ctx3
+                    import urllib.parse as _up3
+                    with _ctx3.ExitStack() as _cp_stack:
+                        _cp_draft_arg = str(args.mockup.resolve())
+                        if _is_dsl_draft:
+                            _cp_base = _cp_stack.enter_context(_draft_server.serve_dir(_draft_dir))
+                            _cp_draft_arg = f"{_cp_base}/{_up3.quote(_draft_path.name)}"
+                        cp_proc = subprocess.run(
+                            ["node", str(cp_tool),
+                             "--draft", _cp_draft_arg,
+                             "--clone", cp_url,
+                             "--viewports", "375,768,1440",
+                             "--out", str(cp_out)],
+                            capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=420,
+                        )
```
and the report line and trace, so the operator can see what was scored:
```diff
-                        print(f"[stage-11.6] computed-parity (draft={args.mockup.name} vs live clone) — "
+                        print(f"[stage-11.6] computed-parity (draft={_draft_path.name}"
+                              f"{' [served over http]' if _is_dsl_draft else ''} vs live clone) — "
```
```diff
                               report_path=str(cp_out), passed=True)
+                              , draft_served_over_http=_is_dsl_draft)
```
(The trace `_emit` keyword goes inside the existing call; shown as a separate hunk for clarity.)

### 6c. What I validated about this diff (PROVEN, not applied)
- `fix_proto.py` (scratch) runs the same `serve_dir` and `is_dsl_draft` logic against the real Eye Care draft: detected `True`; served on an ephemeral port; `computed-parity.js` returned rc 0 and numbers identical to the manual-server run (content 12/11/12, css 0).
- The Mama's draft is detected `False` -> its Stage 11.6 path is byte-for-byte unchanged.
- The server is a daemon thread and is shut down in `finally`; port 0 avoids collisions with other agents.

### 6d. Consequences and follow-ups (ASSUMED unless stated)
- Stage 11.6 will report LOWER numbers for this draft (about 0 to 12 instead of 4 to 37). That is the honest number; the auto-promotion gate needs exactly 100, so no gate behaviour changes.
- If a DSL draft has no `<dc-import>` the original file is already what `args.mockup` points to; the new path still helps (HTTP fixes the sibling-fetch problem in 4.3) and is harmless.
- Optional tripwire, not part of the minimal fix: after capture, warn if the draft side's visible text still contains `{{`. That would have flagged this bug on day one. Not applied.
- I did not audit other consumers of `args.mockup` after the Stage -2 reassign for the D1112 class (ASSUMED there may be more; Stage -1.5 `_draft_dir` was already fixed in D1112).
- The clone itself leaking `{{ }}` and other routes' sections is a separate finding for the converter/theme work (another agent is on the theme comment leak); it is the reason the corrected score is low.

## 7. Commands (reproducible)

Run from `pipeline-state/_inv-stage116/` with `NODE_EXTRA_CA_CERTS` and `SSL_CERT_FILE` set to the certifi bundle.

```
# server (stopped afterwards): folder = sites/eye-care-ward-end/design_handoff_ward_end_eye_care
python -m http.server 8771 --bind 127.0.0.1

T=../../plugins/sgs-blocks/scripts/parity/computed-parity.js
D='http://127.0.0.1:8771/Eye%20Care%20Birmingham.dc.html'
C='https://darkcyan-grouse-898606.hostingersite.com/eye-care-birmingham/'
node $T --draft "$D" --clone "$C" --out A-served-vs-clone.json          # fix: 12% / 0%
node $T --draft "$D" --clone "$D" --out B-served-vs-self.json            # positive control: 100%
node $T --draft "$C" --clone "$C" --out C-clone-vs-self.json             # positive control: 100%
node $T --draft ../eye-care-ward-end-eye-care-birmingham-2026-09-19-140958/dc-import-resolved.html \
        --clone "$C" --out F-current-repro.json                          # current: 37% / 4%
python fix_proto.py                                                       # E-proto-served.json (same as A)
python summ.py <report.json> ...                                          # prints the tables above
node probe.js | node regions.js | node tree.js | node filecheck.js       # rendering, routing, region, file:// vs http
```
(Note for the harness: `computed-parity.js` `--draft` takes a plain path or an http URL; a `file:///` string is treated as a path and resolves wrongly. My first D run used one and was discarded; F is the valid reproduction.)

Scratch artefacts left in `pipeline-state/_inv-stage116/`: `probe.js`, `probe-out.json`, `regions.js`, `tree.js`, `filecheck.js`, `dump.js`, `rtext.js`, `fix_proto.py`, `summ.py`, the `*.json` reports, `draft-text.txt`, `clone-text.txt`, `resolved-text.txt`, `server.log`.
