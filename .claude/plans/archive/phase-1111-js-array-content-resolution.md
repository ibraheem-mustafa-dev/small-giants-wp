---
plan_id: phase-1111-js-array-content-resolution
phase_name: Implement Spec 31 FR-31-26 (JS-array-sourced repeated content resolution)
project: small-giants-wp
header: Phase 1111 — JS-array content resolution (Stage -1.5)
cost_estimate: ~35k tokens, 8 steps, mostly inline (one Playwright-render subagent step)
docscore_grade: not run (in-flight doc_type has no template — see phase-planner Stage 7 note)
---

# Phase 1111 — JS-array-sourced repeated content resolution (FR-31-26)

**USP:** 12 of the Eye Care Birmingham draft's repeated content groups (ticker, reasons, reviews,
FAQs, brands, products...) exist ONLY in JS, invisible to every extraction signal the pipeline
has today. This closes that gap once, for all 12 and any future draft's arbitrary array, using the
draft's own real runtime instead of a bespoke JS parser — proven this session, not guessed.

**Plan label:** [PLAN: opus] — a new pipeline dependency (local HTTP server + Playwright render as
a build-time stage) with a real corruption risk if the splice-back isn't done exactly right
(D1107's own BeautifulSoup incident is the cautionary precedent). Architectural judgement calls
already made in this session's `/brainstorming` pass; execution still needs care.

**Docscore:** not run — ad-hoc phase, in-flight `plans/phase-N-*.md` docs have no template until
moved to `plans/archive/`.

**Aggregate cost estimate:** ~35k tokens across 8 steps. Mostly inline (main session) given the
tight coupling between steps and the corruption-risk discipline needed; one step (the Node/
Playwright render script) is well-isolated enough to dispatch.

**Phase success criteria (done when):**
- [ ] A `<sc-for>` group with no usable static content, when `--resolve-js-content` is passed, gets
      its real content spliced into the mockup non-destructively (byte-identical outside patched
      spans) — verified on b32 (ticker) AND at least one other of the 12 arrays (REASONS).
- [x] A `<sc-for>` group that ALREADY has usable static content is never touched, verified by an
      explicit negative-control test.
- [x] Correlation is marker-based (`data-sgs-resolve-id`), not document order — verified by a test
      where two eligible groups resolve to DIFFERENT item counts.
- [x] The flag defaults OFF; a run without it is byte-for-byte unchanged from today (verified by
      re-running the existing 41/74 boundary count with the flag OFF).
- [x] Any render/server failure leaves the draft untouched and the pipeline continues — verified by
      a forced-failure test (e.g. point the resolver at a nonexistent draft directory).
- [x] `.claude/decisions.md` carries a new D-number recording the build + live-verification
      evidence.

**Entry context (read before starting):**
- `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` §15 (FR-31-26.1 through .5) — the full approved
  design; this plan implements it, does not re-design it.
- `.claude/decisions.md` D1107 — the `<dc-import>` precedent, both the working mechanism AND the
  BeautifulSoup-corruption mistake this phase must not repeat.
- `plugins/sgs-blocks/scripts/converter/services/dc_import_resolver.py` — the sibling resolver to
  pattern-match: `resolve_dc_imports()` (pure regex splicing), `_load_component()`,
  cycle/depth guard (`_MAX_DEPTH`, `_seen` frozenset).
- `plugins/sgs-blocks/scripts/theme-extractor/measure.js` + `extract.py:81`'s
  `subprocess.run(["node", str(HERE / "measure.js"), "--draft", str(draft)], ...)` — the existing
  Python-invokes-a-Node-Playwright-script convention this phase reuses.
- `sgs-clone-orchestrator.py` lines 3749-3769 (Stage -2 dc-import wiring) — the new Stage -1.5
  block follows this exact shape: read `args.mockup`, resolve, write a new file, reassign
  `args.mockup` only when something changed.
- `sgs-clone-orchestrator.py` lines 3642-3662 (`--classless-match`/`--classless-auto-complete`
  `argparse` definitions) — the exact `action="store_true", default=False` opt-in pattern this
  phase's new flag follows.
- `sites/eye-care-ward-end/design_handoff_ward_end_eye_care/Eye Care Birmingham.dc.html` — the real
  test draft (ticker `<sc-for>` at line ~45, `static TICKER` at line ~1610).
- `sites/eye-care-ward-end/design_handoff_ward_end_eye_care/support.js` — the draft's own DSL
  runtime; read enough to confirm it, never reimplement any part of it.

**References:**
- This session's disposable Playwright probe (not committed) — proved live that serving over real
  HTTP (not `file://`) and letting `support.js` execute resolves `document.body.innerText` to the
  real ticker strings verbatim.
- `.claude/memory/learning/2026-09-18-regression-comparison-must-match-baseline-invocation-flags.md`
  — governs Step 8's verification: compare flag-on vs flag-off using identical invocation
  otherwise.

**Tooling Index:**
| Type | Name | Used in |
|------|------|---------|
| cli | `python sgs-clone-orchestrator.py` | step 7, 8 |
| external | Playwright (Node) | step 3 |
| cli | `python -m pytest` | step 6 QA gate |
| cli | `python -m http.server` (or equivalent) | step 3 |

---

Step 1 — Eligibility check: does this `<sc-for>` already have usable content?
  Model:       inline
  Action:      In a new module `plugins/sgs-blocks/scripts/orchestrator/js_content_resolver.py`,
               write `find_unresolved_sc_fors(html: str) -> list[dict]` — regex-scans the raw
               mockup for `<sc-for list="{{ EXPR }}" ...>...</sc-for>` spans (same span-matching
               shape as `dc_import_resolver.py::_DC_IMPORT_RE`), and for each one checks whether it
               ALREADY has usable static content: a `hint-placeholder-count` attribute is present
               with a nonzero value AND the item template body has non-whitespace literal text
               outside `{{ }}` bindings. Returns only the groups with NEITHER signal — these are
               the only candidates the rest of this module ever touches (FR-31-26.3 #1, scope-
               narrowed by construction).
  Files:       plugins/sgs-blocks/scripts/orchestrator/js_content_resolver.py (new)
  Inputs:      A raw mockup HTML string (already dc-import-resolved, per Spec 31 §15's ordering).
  Outcome:     Given a fixture with 2 `<sc-for>`s (one with literal text, one without),
               `find_unresolved_sc_fors()` returns exactly 1 entry — the one with none.
  Exec:        SEQUENTIAL
  Deps:        none
  Marker:      SESSION-START
  Time:        15 min
  Tooling:     none — direct build
  On-Fail:     n/a (new file, no existing behaviour to break)
  Cold-Entry:  Read `dc_import_resolver.py::_DC_IMPORT_RE`/`_ATTR_RE` for the exact regex-span
               pattern to mirror; read Spec 31 §15 FR-31-26.3 #1 for the scope-narrowing rule.
  Test:
    Happy:       A `<sc-for>` with no `hint-placeholder-count` and only `{{ }}` bindings in its
                 item body → returned as a candidate.
    Edge:        A `<sc-for>` with `hint-placeholder-count="0"` (present but zero) → treated as
                 NOT having usable content, still a candidate (zero is not "has content").
    Fail:        A `<sc-for>` with literal text alongside `{{ }}` bindings (e.g. `<span>Free
                 delivery over {{ t.amount }}</span>`) → NOT returned (has usable static content).
    Integration: Run against the real Eye Care Birmingham mockup; assert the ticker's `<sc-for>`
                 (list contains `ticker`) IS in the returned candidates.

Step 2 — Marker injection into a temporary served copy
  Model:       inline
  Action:      Add `inject_resolve_markers(html: str, candidates: list[dict]) -> tuple[str, dict]`
               to the same module — for each candidate from Step 1, inserts a unique
               `data-sgs-resolve-id="rN"` attribute onto the `<sc-for>`'s item-template element
               (its first direct child element) via string splicing at that element's opening-tag
               span. Returns the modified HTML (written ONLY to a temp file for serving — never
               written back to the pipeline-bound mockup, per FR-31-26.2) plus a `{marker_id:
               candidate_info}` map for Step 4's splice-back to consult.
  Files:       plugins/sgs-blocks/scripts/orchestrator/js_content_resolver.py
  Inputs:      Step 1's candidate list.
  Outcome:     Each candidate's item-template element carries a distinct `data-sgs-resolve-id`;
               every byte outside those insertion points is unchanged.
  Exec:        SEQUENTIAL
  Deps:        step 1 complete
  Marker:      (none)
  Time:        15 min
  Tooling:     none — direct build
  On-Fail:     n/a
  Cold-Entry:  n/a
  Test:
    Happy:       2 candidates → 2 distinct marker IDs injected, each on the correct element.
    Edge:        A candidate whose item-template element already has other attributes (e.g.
                 `style="..."`) → marker is appended, existing attributes untouched.
    Fail:        Zero candidates → returns the input HTML unchanged, empty marker map (no-op,
                 matches FR-31-26.3 #1's "byte-identical when nothing eligible" guarantee).
    Integration: Feed Step 1's real Eye Care Birmingham candidates through; assert the ticker's
                 `<span>` (the item template at line ~46) carries the injected marker.

Step 3 — Render + resolve: serve, execute, read by marker
  Model:       sonnet
  Action:      Build a new Node script `plugins/sgs-blocks/scripts/orchestrator/resolve-js-content.js`,
               following `theme-extractor/measure.js`'s shape (`chromium.launch()`, CLI args parsed
               the same way, JSON to stdout). Unlike `measure.js`, this MUST serve over real HTTP,
               not `file://` — confirmed live this session that the draft's own `fetch()` calls
               (self-load + sibling `dc-import` components) are blocked under `file://` by browser
               security. Steps: (a) start a short-lived static file server (Node's own `http`
               module, serving the candidate-marked temp copy's directory) on an ephemeral port;
               (b) launch Playwright, navigate to it, `waitUntil: 'networkidle'`; (c) for each
               `data-sgs-resolve-id`, query all matching elements and read their resolved
               `textContent` (+ any `<path d>` / `<svg>` attribute the item template declared, if
               present, for icon-shaped items like the ticker); (d) emit `{marker_id:
               [{text, ...fields}, ...]}` as JSON to stdout; (e) always close the server + browser,
               even on error.
  Files:       plugins/sgs-blocks/scripts/orchestrator/resolve-js-content.js (new)
  Inputs:      Step 2's marked temp HTML file path (served directory = its parent, so sibling
               `support.js`/`image-slot.js`/other `.dc.html` files are reachable).
  Outcome:     Given the real marked Eye Care Birmingham copy, running this script prints JSON
               whose ticker marker's array has exactly 4 entries with the real ticker strings.
  Exec:        SEQUENTIAL
  Deps:        step 2 complete
  Marker:      (none)
  Time:        25 min
  Tooling:     Playwright (Node), Node's built-in `http` module
  On-Fail:     Any exception (server bind failure, Playwright launch failure, navigation timeout)
               → print `{"error": "<message>"}` to stdout and exit 1, NEVER throw uncaught — the
               Python caller (Step 4) must be able to detect this cleanly for its fail-soft wrap.
  Cold-Entry:  n/a
  Prompt: |
    Build plugins/sgs-blocks/scripts/orchestrator/resolve-js-content.js, a Node/Playwright script.

    Context: this is Stage -1.5 of the SGS cloning pipeline's render-and-splice mechanism for
    JS-array-sourced <sc-for> content (Spec 31 FR-31-26, .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md §15).
    A sibling Python module (js_content_resolver.py) has already injected unique
    `data-sgs-resolve-id="rN"` marker attributes onto the item-template element of each eligible
    <sc-for>, in a TEMPORARY copy of the draft (never the original). Your job: serve that copy over
    real HTTP (NOT file:// -- confirmed this session that the draft's support.js runtime calls
    fetch() to self-load and load sibling dc-import components, which file:// blocks under browser
    security), render it with a real headless browser so the draft's own JS resolves every <sc-for>
    naturally, then read out the resolved text for each marker.

    Follow plugins/sgs-blocks/scripts/theme-extractor/measure.js's existing shape closely: CLI arg
    parsing (--draft <path> [--out <file>]), chromium.launch(), JSON to stdout. Differences: (1) you
    MUST start a real local static file server (Node's built-in `http` module is fine, no new
    dependency) on an ephemeral port and navigate to http://127.0.0.1:<port>/<filename>, not a
    file:// URL; (2) instead of getComputedStyle, use page.evaluate to
    document.querySelectorAll('[data-sgs-resolve-id]'), group by the marker value, and read
    .textContent.trim() for each (also check for a child <path> element's `d` attribute or an <svg>
    if present, since some items carry an icon alongside text -- the ticker's item shape is
    `<span data-sgs-resolve-id="r1"><svg><path d="..."/></svg>TEXT</span>`, capture both when
    present); (3) emit {marker_id: [{text, iconPath?}, ...]} as JSON to stdout, one entry per
    resolved item in the order the marker's elements appear in the live DOM; (4) ALWAYS close the
    server and browser in a finally block, even on error; (5) on ANY exception, print
    {"error": "<message>"} to stdout and process.exit(1) -- never let an uncaught exception crash
    with a raw stack trace, because the Python caller needs a clean signal to apply its fail-soft
    fallback (Spec 31 FR-31-26.3 #3: any failure here must leave the pipeline's real behaviour
    unchanged).

    Test it against the real draft at
    "sites/eye-care-ward-end/design_handoff_ward_end_eye_care/Eye Care Birmingham.dc.html" (you'll
    need to run Step 1/2's marker-injection first, or hand-inject one marker for a smoke test) and
    confirm the ticker resolves to 4 real text strings (verify against the static TICKER array at
    line ~1610 of that file). Report back: the exact command you ran, its JSON output, and
    confirmation the server+browser cleanly shut down (no orphan process left running).
  Test:
    Happy:       Marked ticker copy served + rendered → JSON output has 4 items for the ticker's
                 marker, text matching the real `static TICKER` array strings verbatim.
    Edge:        A marker whose `<sc-for>` resolves to ZERO items (an empty source array) → JSON
                 output has an empty array for that marker, not an error and not a missing key.
    Fail:        Point `--draft` at a file in a directory with no `support.js` (server serves it,
                 but nothing renders) → script exits 1 with a clean `{"error": ...}` JSON, no raw
                 stack trace, no orphan server process left listening.
    Integration: Confirm the ephemeral port is released after the script exits (a second
                 invocation immediately after must succeed, not hit `EADDRINUSE`).

QA Gate — Render script proven against the real draft
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    step 3 complete
  Check:   node plugins/sgs-blocks/scripts/orchestrator/resolve-js-content.js --draft "sites/eye-care-ward-end/design_handoff_ward_end_eye_care/Eye Care Birmingham.dc.html" (against a Step-2-marked temp copy) 2>&1
  Pass:    JSON printed to stdout, ticker marker resolves to exactly 4 items with real text, exit
           code 0, no orphan Node/Playwright process remains (check via `ps`/Task Manager if unsure).
  Fail:    If it errors, read the error against Step 3's own `{"error": ...}` contract before
           re-attempting — do not proceed to Step 4 until this passes for real, on the real draft.
  Marker:  QA

Step 4 — Splice resolved content back + fail-soft orchestration
  Model:       inline
  Action:      Add `resolve_js_array_content(html: str, mockup_dir: Path) -> tuple[str, int]` to
               `js_content_resolver.py` — the top-level entry point mirroring
               `dc_import_resolver.py::resolve_dc_imports()`'s signature shape. Ties Steps 1-3
               together: find candidates (Step 1) → if none, return `(html, 0)` immediately, no
               subprocess spawned → else inject markers into a temp file (Step 2) → invoke
               `resolve-js-content.js` via `subprocess.run(["node", str(SCRIPT), "--draft",
               str(temp_path)], capture_output=True, timeout=30)` → on ANY failure (non-zero exit,
               a `"error"` key in the parsed JSON, a timeout, a `json.JSONDecodeError`) log a
               warning and return `(html, 0)` UNCHANGED (fail-soft, FR-31-26.3 #3) → on success,
               for each candidate splice its resolved items' text back into the ORIGINAL (unmarked)
               html's `<sc-for>...</sc-for>` body as literal markup replacing the `{{ t.field }}`
               bindings, via pure string/regex replacement at that span only — never re-parse/
               re-serialise the whole document (D1107's own lesson). Always delete the temp marked
               file in a `finally` block.
  Files:       plugins/sgs-blocks/scripts/orchestrator/js_content_resolver.py
  Inputs:      Steps 1-3's functions; the original (unmarked) mockup HTML string.
  Outcome:     Given the real Eye Care Birmingham mockup, `resolve_js_array_content()` returns
               modified HTML where the ticker's `<sc-for>` body now contains 4 literal `<span>`s
               with real text, and the count of resolved groups is ≥1.
  Exec:        SEQUENTIAL
  Deps:        step 3 (+ its QA gate) complete
  Marker:      (none)
  Time:        25 min
  Tooling:     Python `subprocess`
  On-Fail:     n/a — this step's whole job IS the on-fail path; see Test/Fail below.
  Cold-Entry:  n/a
  Test:
    Happy:       Real mockup, ticker + REASONS both unresolved → both groups spliced with real
                 content; a byte-diff of the output against the input shows changes ONLY inside
                 those two `<sc-for>` spans, nothing else differs.
    Edge:        A mockup with zero eligible `<sc-for>`s → `(html, 0)` returned, `html` is the
                 EXACT same string object or byte-identical, no subprocess spawned at all.
    Fail:        Force `resolve-js-content.js` to fail (e.g. patch it to always error, or point at
                 a draft with no `support.js`) → `resolve_js_array_content()` returns `(original_html,
                 0)` unchanged, no exception propagates, a warning is logged/returned to the caller.
    Integration: Run end-to-end against the real draft; assert the ticker's resolved `<span>`s,
                 when the OUTPUT is re-parsed with BeautifulSoup, have `get_text(strip=True)`
                 matching the real `static TICKER` strings.

QA Gate — Module unit suite + negative controls
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    steps 1-4 complete
  Check:   python -m pytest plugins/sgs-blocks/scripts/orchestrator/tests/test_js_content_resolver.py -q
  Pass:    All tests pass, including: (a) a positive case (ticker-shaped fixture resolves), (b) a
           negative control — a `<sc-for>` WITH existing static content is confirmed untouched
           (byte-identical), mirroring `test_dc_import_resolver.py`'s
           `test_no_dc_import_is_a_true_no_op`, (c) a forced-failure case returns the input
           unchanged (mirrors `test_unresolvable_import_is_left_as_is_not_fatal`), (d) a marker-
           collision/reuse case doesn't crash.
  Fail:    Any failure → fix before proceeding; do NOT wire into the orchestrator with a red suite.
  Marker:  QA

Step 5 — Write the test suite (if not already written alongside Steps 1-4)
  Model:       inline
  Action:      Write `plugins/sgs-blocks/scripts/orchestrator/tests/test_js_content_resolver.py`,
               using `test_dc_import_resolver.py`'s 5-test shape as the template: (1) a real
               ticker-shaped fixture resolves and merges correctly (mirrors
               `test_headline_case_resolves_and_merges_call_site_style`); (2) a `<sc-for>` with
               existing static content is a true no-op (mirrors
               `test_no_dc_import_is_a_true_no_op`); (3) a render failure is non-fatal (mirrors
               `test_unresolvable_import_is_left_as_is_not_fatal`); (4) two candidates get distinct
               markers and resolve independently (new — proves FR-31-26.2's marker-based
               correlation, not document order); (5) zero eligible `<sc-for>`s → confirmed no
               subprocess spawned (mock `subprocess.run` and assert it was never called).
  Files:       plugins/sgs-blocks/scripts/orchestrator/tests/test_js_content_resolver.py (new)
  Inputs:      Steps 1-4's implementation.
  Outcome:     5+ tests, all passing, each with a real assertion (not a smoke test).
  Exec:        SEQUENTIAL
  Deps:        step 4 complete
  Marker:      (none)
  Time:        20 min
  Tooling:     pytest, `unittest.mock` (for the subprocess-not-called assertion)
  On-Fail:     n/a
  Cold-Entry:  n/a
  Test:
    Happy:       Test 1 passes against a real ticker-shaped fixture built from the actual draft's
                 markup shape (not invented).
    Edge:        Test 4's two-candidate case uses DIFFERENT item counts (3 vs 5) to prove
                 marker-based correlation would catch a document-order regression.
    Fail:        Test 3 mocks `subprocess.run` to raise/return non-zero and asserts the original
                 html is returned byte-identical.
    Integration: Test 5 confirms `subprocess.run` is never invoked when Step 1 finds zero
                 candidates — proves the mechanism has zero cost on an already-fine draft.

Step 6 — Wire into the orchestrator: Stage -1.5 + new flag
  Model:       inline
  Action:      In `sgs-clone-orchestrator.py`, add the new `--resolve-js-content` flag
               (`action="store_true", default=False`) immediately after the existing
               `--classless-auto-complete` `argparse` block (line ~3659), matching its exact
               help-text style and opt-in convention. Add a new Stage -1.5 block immediately AFTER
               the existing Stage -2 dc-import block (after line 3769's `print(...)`), gated on
               `if getattr(args, "resolve_js_content", False):` — reads `args.mockup` (now possibly
               the dc-import-resolved path), calls `resolve_js_array_content()`, and if the
               returned count is nonzero, writes `run_dir / "js-content-resolved.html"` and
               reassigns `args.mockup` to it — identical shape to the Stage -2 block.
  Files:       plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py
  Inputs:      Step 4's `resolve_js_array_content()`.
  Outcome:     `--resolve-js-content` is a real, documented CLI flag; omitting it leaves the
               pipeline byte-for-byte unchanged (the block is skipped entirely, not merely a no-op
               inside it).
  Exec:        SEQUENTIAL
  Deps:        step 5 (+ its QA gate) complete
  Marker:      HANDOFF
  Time:        15 min
  Tooling:     none — direct edit
  On-Fail:     Revert the two edits; both are additive (new flag, new gated block) so a revert
               cannot affect any existing flag's behaviour.
  Cold-Entry:  n/a
  Test:
    Happy:       Run WITH `--resolve-js-content` against Eye Care Birmingham → `js-content-
                 resolved.html` is written, `args.mockup` points to it, downstream stages see real
                 ticker/REASONS content.
    Edge:        Run WITH the flag against a draft with zero JS-array-sourced groups → block runs
                 (finds zero candidates), no file written, `args.mockup` unchanged — same as
                 omitting the flag entirely for that draft.
    Fail:        Run WITHOUT the flag → the whole Stage -1.5 block is skipped (never imports
                 `js_content_resolver`, never spawns Node) — verify via a debug print or by timing
                 the run (should show zero added wall-clock vs a pre-phase baseline run).
    Integration: The flag composes correctly with `--classless-match`/`--classless-auto-complete`
                 — a boundary whose content Stage -1.5 resolved should now be visible to Stage 4's
                 classless-match gate exactly like any other DOM text.

Step 7 — Live verification, flag ON
  Model:       inline
  Action:      Re-run the real orchestrator against Eye Care Birmingham with
               `--resolve-js-content` added to the EXACT invocation that produced the current
               41/74 baseline (`--sc-var-min-confidence 0.0 --dom-shape-min-confidence 0.0
               --classless-match --classless-auto-complete` + the standard `--client`/`--page`/
               `--auto-section`/`--mode draft`/`--skip-freshness-gate`/`--skip-register`/
               `--no-scaffold-new-blocks`/`--sc-var-cache` flags — per this session's own captured
               lesson, grep this plan's own Entry Context / prior session commands rather than
               reconstructing from memory).
  Files:       (none edited — pipeline run only)
  Inputs:      Step 6's wired flag.
  Outcome:     A new `pipeline-state/` run directory whose `js-content-resolved.html` shows the
               ticker and REASONS groups with real text; `stage-4.json`'s `per_section_results`
               shows b32 (or its post-fix-numbering equivalent) no longer `failed` with
               `ContentConservationError` for lack of content (it may still fail/gap for OTHER
               reasons — e.g. it now needs its OWN block-match, which is a separate, not-yet-solved
               question — but the CONTENT itself must now be present in the mockup).
  Exec:        SEQUENTIAL
  Deps:        step 6 complete
  Marker:      (none)
  Time:        10 min
  Tooling:     `python sgs-clone-orchestrator.py`
  On-Fail:     If the live run shows the ticker STILL has no content, re-check Step 3's render
               script output directly against the marked temp file before assuming Step 4's splice
               is at fault — isolate which layer failed.
  Cold-Entry:  n/a
  Test:
    Happy:       `js-content-resolved.html`'s ticker `<sc-for>` body contains the real 4 strings;
                 grep confirms "100% genuine, supplied direct by the brands" is present in the
                 file.
    Edge:        The REASONS array (a second, differently-shaped array — check whether its items
                 are `[title, body]` pairs or a different shape before assuming the ticker's
                 icon+text shape generalises) also resolves — read `static REASONS` in the draft
                 file directly to confirm the assumption before declaring success.
    Fail:        If REASONS's shape breaks Step 3's icon+text assumption, that's a real finding —
                 report it rather than silently declaring success on the ticker alone.
    Integration: Confirm the rest of the pipeline (Stage 0 BEM lint onward) runs unaffected —
                 same warning/error counts on non-JS-array boundaries as the pre-phase baseline.

Step 8 — Live verification flag OFF (no-regression) + record the decision
  Model:       inline
  Action:      Re-run the IDENTICAL invocation WITHOUT `--resolve-js-content` and confirm the
               boundary-status counts match the pre-phase baseline exactly (41 complete / 1 failed
               / 15 unmatched-classless-review / 14 unmatched-non-bem-compliant / 3 chrome-skipped,
               from this session's D1109 verification). Then add a new D-number entry to
               `.claude/decisions.md` (next after the current ceiling) recording: what was built,
               the render-not-parse mechanism, the marker-based correlation, the 3 regression-
               safety guarantees, and both live-verification results (flag-on content resolution +
               flag-off exact parity). Add a `.claude/mistakes.md` entry if this session's build
               surfaces a new reusable pattern (e.g. a `file://` vs real-HTTP gotcha for any future
               Playwright-render work against this DSL).
  Files:       .claude/decisions.md, .claude/mistakes.md (if warranted)
  Inputs:      Step 7's live-verification results.
  Outcome:     Decision recorded with real evidence; D-ceiling advanced by exactly one.
  Exec:        SEQUENTIAL
  Deps:        step 7 complete
  Marker:      HANDOFF
  Time:        15 min
  Tooling:     none — direct edit
  On-Fail:     If flag-off counts DON'T match the baseline exactly, STOP — this means Stage -1.5's
               gating is wrong (it's doing something even when the flag is off) — do not record a
               decision until this is fixed and re-verified.
  Cold-Entry:  n/a
  Test:
    Happy:       `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
                 returns the new ceiling.
    Edge:        If flag-off shows even ONE boundary's status changed, treat as a hard fail, not a
                 rounding difference — this pipeline's own rule is exact parity, not "close enough."
    Fail:        A mismatch here is a real regression in a flag meant to be inert — revert Step 6's
                 wiring and re-diagnose before shipping.
    Integration: `python .claude/hooks/handoff-preflight.py --check` still passes (quick sanity
                 check, not a full `/handoff`).

---

## Key Judgement Calls

### Primary decisions (already made this session's `/brainstorming` pass, recorded here for the phase record)

- **Decision:** Render via a real browser + real HTTP server, vs. writing a bespoke JS
  array-literal + `.map()`-expression parser.
  - **Options:** [A] Custom parser / [B] Real render, read the DOM
  - **Recommendation:** [B]
  - **Why:** [A] duplicates, unreliably, what the draft's own runtime already does correctly, and
    risks scope creep into a general-purpose JS interpreter (against R-31-1/R-31-9). [B] is proven
    live this session and reuses the exact pattern Spec 33's `measure.js` already established.
  - **Cost of wrong choice:** [A] would need constant maintenance as draft authors use different
    JS shapes; [B]'s only real cost is the render being slower per-run, acceptable since it's
    opt-in and scope-narrowed to genuinely-broken groups only.
  - **Who decides:** Bean (already decided)

- **Decision:** `file://` vs a real local HTTP server for the Playwright render.
  - **Options:** [A] `file://` (matches `measure.js`'s existing convention) / [B] real HTTP server
  - **Recommendation:** [B]
  - **Why:** proven live this session — `file://` blocks the draft runtime's own `fetch()` calls
    (self-load + sibling `dc-import` components), so nothing renders. `measure.js` never hit this
    because it likely never needed the DCLogic component tree to actually mount.
  - **Cost of wrong choice:** [A] silently fails to render anything, discovered only via a live
    probe rather than a design review — already discovered, now corrected before building.
  - **Who decides:** Bean (already decided)

### Pre-emptive decisions (reasoned inline this session — no separate parallel cold-review
dispatch, given this phase's size; flag if you want that pass run before executing)

- **Decision:** What if a resolved item's field shape differs from the ticker's `text`+`icon`
  pair (e.g. REASONS might be `[title, body]`, no icon at all)?
  - **Recommendation:** Step 3's render script reads generic `textContent` per marker rather than
    assuming a fixed field shape — it captures whatever text is inside the resolved element,
    plus an icon path IF a `<path>`/`<svg>` is present. Step 7 explicitly checks REASONS's real
    shape before assuming success, rather than generalising from the ticker alone.
  - **Why:** avoids hardcoding a 2-field assumption that would silently mis-handle a differently-
    shaped array — matches this project's "verify every claim, don't assume the pattern
    generalises" discipline.

- **Decision:** What happens if two eligible `<sc-for>`s in the same draft resolve to overlapping
  or colliding marker IDs (e.g. a bug in Step 2's ID generation)?
  - **Recommendation:** Step 2 generates marker IDs as `f"r{idx}"` from a single incrementing
    counter across the WHOLE candidate list (never per-sc-for-local), guaranteeing uniqueness by
    construction — Step 5's test suite includes an explicit collision-shaped negative control.
  - **Why:** a silent ID collision would misattribute resolved content to the wrong `<sc-for>` on
    splice-back — exactly the class of bug FR-31-26.2 exists to prevent.

- **Decision:** Timeout / hung-server handling if Playwright never returns.
  - **Recommendation:** Step 4's `subprocess.run(..., timeout=30)` — a hard ceiling. A render that
    takes longer than 30s on a real draft is itself a signal something's wrong (an infinite
    `sc-for`/`dc-import` cycle, a hung network wait) — fail-soft applies identically to a timeout
    as to any other failure mode.
  - **Why:** without a timeout, a hung render would hang the WHOLE pipeline run, which is a much
    worse failure mode than the mechanism simply not resolving that draft's content this run.

---

## Offer

Ready to execute. Options:
(a) start Step 1 now, inline, in this session
(b) dispatch Step 3 (the Node/Playwright script) as a subagent per its pre-written prompt above,
    while continuing Steps 1-2 inline in parallel — RECOMMENDED, since Step 3 is well-isolated and
    the longest single step
(c) refine any step first
(d) hand off to a fresh session via `/handoff`

## Closure (2026-09-19, archived)

**Status: PARTIALLY MET. Read D1111 AND D1112 (the correction) together.**

- Criterion 1 is NOT met: it required verification on the ticker AND REASONS. REASONS (number +
  title + body, three separate fields) was excluded from the mechanism by design, and the ticker's
  resolver output was only correct AFTER the D1112 fix (the orchestrator passed the wrong
  directory, so D1111's "ticker converts" claim was false when made). Even now the ticker text does
  not reach the emitted blocks: its container is not a detected boundary (D1112).
- Criteria 2-6 are met (negative control, marker correlation, flag-OFF parity, forced-failure,
  D-number), with criterion 5's mocked test unable to see the wrong-directory bug, hence D1112's
  added wiring pin.
- Open scope this plan did NOT deliver: multi-field arrays (REASONS, REVIEWS, FAQS, ...) and
  bare self-reference items (`featured` products), plus making the spliced ticker an actual
  boundary. Tracked in `LEDGER.md`, not here.
