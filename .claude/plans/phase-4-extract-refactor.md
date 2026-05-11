---
doc_type: phase-plan
phase_id: 4
project: small-giants-wp
parent_spec: .claude/specs/14-CLONING-PIPELINE-CATALOGUE.md
parent_plan: .claude/plans/master-spec14-build-plan.md
title: Phase 4 — extract.py refactor (hero-hardcoded → catalogue-driven) + golden file regression guard
session_date: 2026-05-11
plan_label: PLAN opus
estimated_minutes: 180-240
---

# Phase 4 — extract.py refactor

**USP:** This is the keystone. After P4, the pipeline produces non-empty extracted attributes on EVERY SGS block, not just hero. Phase 8 deploy becomes meaningful.

**Plan label:** `[PLAN: opus]` — architectural refactor with judgement around override boundary. Some sub-steps dispatch to Sonnet.

**Success criteria:**

- [ ] `tests/golden/hero-extraction-baseline.json` captured from CURRENT extract.py BEFORE refactor
- [ ] `tools/recogniser-v2/extract.py` refactored: ≤ 700 LOC (down from 1569)
- [ ] Dispatcher reads Layer 3 + Layer 2 catalogue files
- [ ] Hero override preserved as `extract_hero_override()` function; precedence: override > convention
- [ ] Re-running extract on hero produces bit-identical output to baseline
- [ ] Re-running extract on trust-bar + heritage-strip produces ≥ 30 attrs each (non-empty)
- [ ] Each extracted attribute carries `value` + `confidence` (0.0-1.0) + `extraction_strategy` fields
- [ ] Commit: `feat(p4): extract.py refactored to catalogue-driven dispatch`

**Entry context:**

- Spec 14 FR5
- Current `tools/recogniser-v2/extract.py` (1569 LOC, hero-hardcoded)
- `plugins/sgs-blocks/scripts/fingerprint-builder/output/layer-3-internal-elements.json` (from P3)
- `plugins/sgs-blocks/scripts/fingerprint-builder/output/role-templates.json` (from P3)
- `HERO_FINGERPRINT_SELECTORS` constant (the regression baseline reference)
- Mama's mockup at `sites/mamas-munches/mockups/homepage/index.html`

**Tooling Index:**

| Type | Name | Used in |
|---|---|---|
| inline | Read tool | Step 1-2 |
| inline | Edit tool | Step 4-6 |
| dispatch | Opus subagent (refactor design) | Step 3 |
| cli | python tools/recogniser-v2/extract.py | Step 2, 7 |
| cli | git | Step 8 |

---

## Step 1 — [SESSION-START] Pre-flight + read current extract.py

```
Step 1 — Pre-flight
  Model:       inline
  Action:      Run master pre-flight. Read current `tools/recogniser-v2/extract.py` end-to-end. Identify the boundary between "hero-specific logic" and "generic infrastructure" (Playwright wrapper, computed-style fetcher, viewport iterator, font-load enumeration). Note line ranges.
  Outcome:     Mental model of which 526 LOC of `extract_hero()` becomes the override; which ~500 LOC of infrastructure stays; which ~500 LOC of FINGERPRINTS-related dispatch becomes the new generic dispatcher
  Marker:      SESSION-START
  Time:        15 min
  Cold-Entry:  Read master plan + spec 14 FR5 + current extract.py
```

## Step 2 — Capture golden hero baseline (BEFORE refactor)

```
Step 2 — Hero golden file
  Model:       inline
  Action:      Run current extract.py against Mama's hero section. Capture full output JSON. Save as `tests/golden/hero-extraction-baseline.json`. This is the regression baseline — must match bit-exactly after refactor.

  **Pre-flight (resolves Adversarial QC concern about Playwright source):** Before invoking extract.py, verify the mockup file at `sites/mamas-munches/mockups/homepage/index.html` exists AND captures the same computed-style values regardless of whether served via local HTTP server or read as static file. If extract.py's Playwright wrapper uses `file://` URL, computed styles for external resources (Google Fonts, @import CSS) may differ from a live server. Workaround: spin up a local server for the capture (`cd sites/mamas-munches/mockups/homepage && python -m http.server 8765` in background; invoke extract.py against `http://localhost:8765/index.html`; kill server after). This matches what P10's acceptance harness will compare against later.

  Files:       tests/golden/hero-extraction-baseline.json (new)
  Outcome:     Baseline captured; ~50 attrs filled (matches current PoC parity); captured via live local server (not file://)
  Exec:        SEQUENTIAL
  Time:        15 min (added 5 min for local server pre-flight)
  Tooling:     python extract.py + Read tool + python -m http.server
  On-Fail:     Current extract.py fails on Mama's hero → halt; investigate (P1 should have left it working)
  Test:
    Happy:       JSON parses; attribute count ≥ 48 (target was 50/50); served via http://localhost:8765
    Edge:        Some attrs return null (defaulted) — acceptable; bit-exact diff is what matters
    Fail:        Extract errors → halt; restore from main if needed
    Integration: Step 7 diffs against this file
```

Inline execution:

```bash
python tools/recogniser-v2/extract.py \
  --mockup sites/mamas-munches/mockups/homepage/index.html \
  --section "section.hero" \
  --block sgs/hero \
  --media-map sites/mamas-munches/research/sandybrown-media-map.json \
  --out tests/golden/hero-extraction-baseline.json
# Verify
python -c "import json; b=json.load(open('tests/golden/hero-extraction-baseline.json')); print(f'{len(b.get(\"attributes\", {}))} attrs captured')"
```

## Step 3 — Design the dispatcher architecture

```
Step 3 — Dispatcher design
  Model:       inline (Opus)
  Action:      Design the new dispatcher function shape. Sketch:

  def extract_block(block_name, mockup_path, section_selector, viewport_set, media_map):
      # Read Layer 3 entry for block_name → slot list + per-slot role tag
      slot_list = load_layer3(block_name)
      # Read Layer 2 role-templates → per-role extraction recipe
      roles = load_role_templates()
      # Check for per-block override (hero is one)
      override = get_block_override(block_name)
      out = {}
      for slot in slot_list:
          if override and slot.attribute_name in override.handled_attrs:
              # Override path
              value, confidence = override.extract(slot, mockup, viewports)
              strategy = 'override'
          else:
              # Convention path: dispatch by role
              role = roles[slot.role]
              value, confidence = role.value_extractor(slot, mockup, viewports)
              strategy = role.value_extractor.__name__
          out[slot.attribute_name] = { 'value': value, 'confidence': confidence, 'strategy': strategy }
      return out

  Document this architecture in a comment block at the top of refactored extract.py. Identify the 4 generic extraction strategies needed (text_content, attr_href, attr_src/image-object, computed_color, computed_px_int, enum_class_probe, query_descriptor).

  Outcome:     Design committed to a comment block + sketch document; Step 4 implements
  Time:        25 min
  Tooling:     inline reasoning
  On-Fail:     N/A — design step
  Test:        Bean (or self) reviews the design before Step 4 implementation begins
```

## Step 4 — Implement generic extraction strategies (per role)

```
Step 4 — Generic strategy implementations
  Model:       inline (Opus) for design; can dispatch Sonnet for individual strategy code
  Action:      Implement the 7 generic extraction strategies as standalone functions in extract.py:

  - text_content(selector, viewports) → reads `.textContent` of selector at desktop viewport
  - attr_href(selector) → reads `<a href>` inside the selector
  - attr_src_image(selector, media_map) → reads <img> src + alt + width + height; resolves via media_map for WP attachment ID
  - computed_color(selector, prop) → reads computed CSS color from cascade
  - computed_px_int(selector, prop) → reads computed CSS prop value, parses to int
  - enum_class_probe(selector, enum_list) → checks for `.is-variant-X` or `.variant--X` classes; returns matching enum
  - query_descriptor(selector, modifier_value) → for FR25 dynamic-link modifiers; returns query descriptor object

  Each function returns (value, confidence) tuple. Confidence assigned: 1.0 on exact match, 0.9 on computed-style, 0.7 on fuzzy probe, 0.3 on fallback default.

  Files:       tools/recogniser-v2/extract.py (modified)
  Outcome:     7 functions exist; each has a docstring + 1-2 inline test cases
  Exec:        SEQUENTIAL after Step 3
  Time:        60 min
  Tooling:     Edit tool
  On-Fail:     A strategy returns wrong value for a known test case → fix the function
  Test:
    Happy:       Inline test cases pass for each strategy
    Edge:        Selector returns no DOM element → strategy returns (None, 0.0)
    Fail:        Strategy raises an unhandled exception → wrap in try/except; return (None, 0.0) with logged error
    Integration: Step 6 dispatcher calls these functions per role
```

## Step 5 — Implement hero override (preserves regression)

```
Step 5 — Hero override
  Model:       inline (Opus)
  Action:      Move the current `extract_hero()` function (526 LOC, lines 737-1262 of old extract.py) into a new `extract_hero_override.py` module at `tools/recogniser-v2/overrides/`. Expose as: `hero_override = BlockOverride(block_name='sgs/hero', handled_attrs={...all hero attribute names...}, extract_fn=extract_hero_legacy)`. Register in `overrides/__init__.py`.
  Files:       tools/recogniser-v2/overrides/__init__.py (new)
              tools/recogniser-v2/overrides/hero.py (new — contains the moved function)
  Outcome:     Override module exists; hero override registered
  Exec:        SEQUENTIAL after Step 4
  Time:        20 min
  Tooling:     Edit tool; Read tool (copy 526 LOC verbatim)
  On-Fail:     Function dependencies missing → also move helper functions (`_get`, `_normalise_var`, etc.)
  Test:
    Happy:       `from overrides import hero_override` succeeds
    Edge:        Helper functions used by hero but also by generic dispatcher → keep generic copies; hero override imports its own
    Fail:        Import circular → restructure
    Integration: Dispatcher (Step 6) checks override registry before convention path
```

## Step 6 — Implement dispatcher in extract.py + remove dead code

```
Step 6 — Dispatcher + cleanup
  Model:       inline (Opus)
  Action:      Replace the `FINGERPRINTS = {'sgs/hero': ...}` constant + the giant `extract_hero()` body with the new `extract_block()` dispatcher (per Step 3 design). Wire up: load Layer 3 from JSON, load Layer 2 role-templates, check override registry, fall through to generic strategy dispatch. Update `main()` to call `extract_block(args.block, ...)` instead of hardcoded hero-only path. Remove dead code paths that no longer execute. Add `--verify-against <baseline.json>` flag that diffs output against a baseline file (for regression testing).
  Files:       tools/recogniser-v2/extract.py (heavily modified — target ≤ 700 LOC)
  Outcome:     extract.py ≤ 700 LOC; dispatcher complete; main() handles any block name
  Exec:        SEQUENTIAL after Step 5
  Time:        45 min
  Tooling:     Edit tool
  On-Fail:     Refactor leaves a regression hole → identify via Step 7 verification
  Test:
    Happy:       `python extract.py --help` shows new flags; LOC count ≤ 700
    Edge:        Dispatcher handles a block with no Layer 3 entry → return error with helpful message
    Fail:        Hero verification fails (Step 7) → halt; investigate
    Integration: Step 7 verifies; P5 + P6 + P8 consume
```

## Step 7 — Verify: hero bit-exact + trust-bar + heritage-strip non-empty

```
Step 7 — Regression + smoke
  Model:       inline
  Action:      Run extract.py against hero with `--verify-against tests/golden/hero-extraction-baseline.json`. Confirm bit-exact diff (zero deltas, considering JSON key ordering normalisation). Then run against trust-bar (`sgs/trust-bar`) and heritage-strip (`sgs/heritage-strip`); confirm ≥ 30 attrs filled per section.
  Files:       (read only)
  Outcome:     Hero diff = 0; trust-bar attrs ≥ 30; heritage-strip attrs ≥ 30
  Exec:        SEQUENTIAL after Step 6
  Time:        15 min
  Tooling:     python extract.py + Python json
  On-Fail:     Hero diff > 0 → halt; debug. Trust-bar/heritage-strip attrs < 30 → check Layer 3 entry coverage for those blocks
  Test:
    Happy:       Hero bit-exact; trust-bar + heritage-strip non-empty
    Edge:        Trust-bar has a few null values from `defaulted` strategy (acceptable if confidence < 0.5)
    Fail:        Hero diff non-zero → identify which attrs drifted; fix dispatcher or override scope
    Integration: P6 staged scaffolding relies on this; P10 acceptance harness checks regression
```

## QA Gate — P4 acceptance

```
QA Gate — P4 integrity
  Model:       inline
  Check:       Step 7 verification PASS + LOC count ≤ 700 + override module loads cleanly
  Pass:        All three conditions met
  Fail:        Return to failing step
  Marker:      QA
```

## Step 8 — [HANDOFF] Commit P4 + push

```
Step 8 — Commit
  Model:       inline
  Action:      Stage `tools/recogniser-v2/` + `tests/golden/hero-extraction-baseline.json`. Commit: `feat(p4): extract.py refactored to catalogue-driven dispatch + hero override preserved`. Push.
  Outcome:     Commit on origin/main
  Marker:      HANDOFF
  Time:        3 min
  Test:
    Happy:       Commit visible
    Integration: P5 + P6 unblocked
```
