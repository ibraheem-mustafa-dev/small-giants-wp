# Tool discovery mechanism — measured, built, tested

**Date:** 2026-09-03
**Scope:** `plugins/sgs-blocks/scripts/toolindex/` (new directory, this task's exclusive write area)
**Task:** build a mechanism that makes an existing script findable by INTENT, not filename.

## 1. Corrected numbers

The brief's numbers were a rough upper bound. Measured directly:

| Metric | Brief's figure | Measured | Method |
|---|---|---|---|
| Script files under `plugins/sgs-blocks/scripts/` | 774 | **823** | `.py`/`.js`/`.mjs`/`.sh`/`.ps1`, excluding `__pycache__`, `node_modules`, `.git`, `pytest_cache`, `mypy_cache` (no `.ps1` files exist in this tree; breakdown: 487 `.py`, 287 `.js`, 47 `.mjs`, 2 `.sh`) |
| Filenames appearing as a substring anywhere in `dev-setup.md` | ~468 | **670** | Exact filename string search, e.g. `"fix.js" in devsetup_text`. This is a looser/higher measure than the brief's, not a stricter one — a generic filename (`fix.js`, `index.js`) can match unrelated context. Treat both as upper bounds, not exact counts. |
| `dev-setup.md` size | 179KB / 2,238 lines | **178,912 bytes / 2,238 lines** | `wc -c` / `wc -l` |

Total scripts once `plugins/sgs-blocks/scripts/toolindex/` (this task's own two files) is excluded from the corpus: **823**. That exclusion is deliberate — see §4.

## 2. Discoverability gap, measured directly

Ran `build_index.py` against all 823 scripts and attempted to extract each file's own header docblock/comment (Python module docstring, JS `/** */` block or leading `//` run, shell leading `#` run — see §3 for the extraction rule and why it's a bounded line-walk, not a single regex).

- **With an extractable header doc: 714 (86.8%)**
- **Without any extractable header doc: 109 (13.2%)** — listed at `toolindex/undocumented.txt`

Read the undocumented list. It is **not** 109 undiscoverable real tools — the overwhelming majority are test fixtures and package markers that were never meant to carry a purpose docblock:
- `scripts/*/tests/__init__.py` (empty package markers)
- `scripts/inspector-scan/fixtures/**/edit.js` — dozens of tiny synthetic React fixture files used by that gate's own test suite (e.g. `04-colour-alpha/colorpalette-no-alpha/edit.js`)

So the real gap is smaller than 109: it is the count of files with no header AND no obvious fixture/test role, which this run did not further sub-classify (would need a second pass reading each file's actual role — out of scope for this task; flagged honestly rather than guessed at).

**Conclusion on the diagnosis:** confirmed. The write side (rich prose docblocks on the tools that matter, e.g. `fix.js`, `check-colour-editor-roundtrip.js`) is real and already good — 86.8% of scripts carry one. The read side had no mechanism except grepping a 179KB hand-curated markdown file or already knowing the filename. That is the gap this task closes.

## 3. What was built

`plugins/sgs-blocks/scripts/toolindex/`:

- **`build_index.py`** — walks `scripts/` (excluding its own `toolindex/` directory — see §4), extracts each script's header doc via a **bounded line-by-line scan of the first 80 lines** (not a single greedy regex over the whole file — an earlier version used `re.DOTALL` with `.*?` and caused catastrophic backtracking that hung indefinitely on non-matching files; rewritten as a manual scan with no backtracking). Writes `index.json` (path, filename, extracted doc text, first-sentence summary, char count) and `undocumented.txt`.
- **`query.py`** — free-text search over `index.json` using plain TF-IDF cosine similarity (pure Python stdlib, no dependencies to install). Includes a deliberately crude suffix-stripping stemmer (`correct`/`correctly`, `emit`/`emitted`, `check`/`checks` fold to one token) so a query and a docblock using different inflections of the same word still match — this mattered in testing (see §4). Also supports `--coverage` (prints the §2 numbers) and `--path-substring` (plain filename fallback, unranked).

### Exact commands to run it

```bash
cd plugins/sgs-blocks/scripts/toolindex
python build_index.py                 # rebuild index.json (~2-3s)
python query.py --coverage             # print coverage stats
python query.py "your intent in plain words"
python query.py --top 15 "your intent in plain words"
python query.py --path-substring roundtrip   # fallback filename search
```

## 4. Positive and negative control — verbatim

**Design note first:** `toolindex/` itself is **excluded** from the indexed corpus (`SKIP_DIR_NAMES` in `build_index.py`). This was not cosmetic — the first version of this docstring literally quoted the failing session's intent sentence ("check whether the CSS I emit is actually correct on the live site"), so `build_index.py` scored as the #1 result for its own test query. That is a worthless self-referential match, not proof the mechanism works. Excluding the indexer's own directory from its own corpus removes that contamination structurally, not by rewording around it.

### Positive control

Query worded from the failing session's actual intent. **It contains none of the target file's path tokens** — no "editor", no "roundtrip", no "colour-editor", no "qa/check-colour". This is the load-bearing check: a filename match would be worthless as proof.

```
$ python query.py --top 8 "check whether the CSS colours I emit are actually correct after deploying to the live site"

[0.291] scripts/build-deploy.py
[0.222] scripts/check-colour-preview-resolver.js
[0.200] scripts/surveys/survey-colour-coverage.py
[0.190] scripts/qa/capture-native-colour-ui.js
[0.189] scripts/qa/check-colour-editor-roundtrip.js
        QA Gate C — the EDITOR half.
        matched terms: actual, check, colour, correct, css, live
[0.170] scripts/check-editor-render-parity.js
[0.169] scripts/motion-qa/run-live-probes.mjs
[0.161] scripts/orchestrator/wp_integration.py
```

**Result: `check-colour-editor-roundtrip.js` appears at rank 5 of 8 (score 0.189), matched on `actual`, `check`, `colour`, `correct`, `css`, `live` — none of which are filename substrings of the query.** It is not the #1 hit — `build-deploy.py` and `check-colour-preview-resolver.js` outrank it, and both are legitimately relevant to the same intent (deploy verification; editor/server colour-resolution parity is a genuine sibling concern to editor/live roundtrip). A searcher reading the top 5-8 results, which is a normal amount to scan, finds the tool. It would not be found by a "read only the #1 result" workflow — noted honestly in §5.

### Negative control

Unrelated intent — WooCommerce gallery/carousel work, nothing to do with colour QA.

```
$ python query.py --top 30 "convert a WooCommerce product image gallery into carousel slides for the mobile menu"

[0.178] scripts/motion-qa/probe-carousel-loop.mjs
[0.172] scripts/migrate-product-card-image-id.py
[0.163] scripts/migrate-gallery-object-model.js
[0.160] scripts/surveys/check-image-controls-support.py
[0.160] scripts/converter/services/styling_helpers.py
[0.141] scripts/fixtures/destructive-only-controls/positive/edit.js
[0.128] scripts/converter/services/lift_helpers.py
[0.124] scripts/motion-qa/probe-first-paint.mjs
```

`check-colour-editor-roundtrip.js` does **not** appear anywhere in the top 30 (score 0 — the search only returns scripts with a positive cosine score, and it isn't one of them). Confirmed by `grep -c "check-colour-editor-roundtrip" <output>` returning no match.

## 5. Honest assessment — what this does and does not solve

**What it solves:** a session that can describe its intent in a sentence, and is willing to scan ~5-10 ranked results rather than trust only the #1 hit, will now find the right tool from 823 candidates without knowing its filename. That's a real, tested capability that did not exist before (previously: grep a 179KB markdown file you'd have to know to open, or already know the name).

**What it does not solve:**

1. **It is not a #1-hit oracle.** In the positive control the target ranked 5th, not 1st. TF-IDF has no concept of "this is the CANONICAL tool for X" vs. "this is A tool that happens to share vocabulary with X" — `build-deploy.py` outscored it because both docblocks talk about "live", "deploy", "check". A session that reads only the top result and stops will sometimes get a plausible-but-wrong answer, not the best one. Mitigation would be a curated "canonical tool per task category" table layered on top — not built here; flagged as a real gap, not silently patched over.
2. **It requires the session to actually run the query tool.** This is the same failure mode as `dev-setup.md`: a mechanism nobody is told to consult doesn't get consulted. This task built the retrieval mechanism; it did not wire it into a hook, CLAUDE.md pointer, or handoff-prompt template that would make an agent actually invoke it. That wiring is explicitly out of this task's scope (no edits to `CLAUDE.md`, `dev-setup.md`, or `LEDGER.md` were permitted), but without it the tool can recur unused exactly like `dev-setup.md` did.
3. **TF-IDF has no semantic understanding.** It matches shared vocabulary, not meaning. A query phrased with none of the domain words the docblock uses (e.g. describing "colour" as "brand tint" throughout) would score near zero even against a perfect match. The stemmer folds simple inflections (`correct`/`correctly`) but does not handle synonyms.
4. **The 109 undocumented scripts are still unfindable by intent** — only by `--path-substring` filename search, which is exactly the capability that already existed and already failed the original session. Most of the 109 are test fixtures, not real tools (see §2), but this run did not fully confirm that for every one of the 109 — stated as an open question, not resolved.
5. **No caching/staleness handling.** `index.json` is a snapshot; a script added or edited after the last `build_index.py` run won't be reflected until it's rerun. No hook triggers a rebuild automatically.

**Bottom line:** the retrieval half of the problem is demonstrably solved for a describable-intent query against a documented script (proven by a filename-free positive control and a clean negative control). The "gets consulted in practice" half is not solved by this task and would recur the exact failure mode described in the brief unless a future session wires a pointer to `toolindex/query.py` into whatever a session actually reads at start (CLAUDE.md, a hook, or a handoff template) — deliberately not done here since those files were out of scope.

## Files

- `plugins/sgs-blocks/scripts/toolindex/build_index.py` — indexer
- `plugins/sgs-blocks/scripts/toolindex/query.py` — search tool
- `plugins/sgs-blocks/scripts/toolindex/index.json` — generated index (823 entries)
- `plugins/sgs-blocks/scripts/toolindex/undocumented.txt` — the 109 scripts with no extractable header doc
- This report: `.claude/reports/2026-09-03-T1-tool-discovery.md`
